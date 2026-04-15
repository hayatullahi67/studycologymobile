import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList, AppNavigationProp } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../services/localDatabase';

type CourseListRouteProp = RouteProp<RootStackParamList, 'CourseList'>;

interface Course {
    id: string;
    name: string;
    department_id: string;
    content: string;
    created_at: string;
}

export function CourseListScreen() {
    const route = useRoute<CourseListRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { departmentId, departmentName } = route.params;

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadCourses();
    }, [departmentId]);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const data = await localDB.getCareerCourses(departmentId);
            setCourses(data);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderCourseItem = ({ item }: { item: Course }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(230,81,0,0.1)' }]}>
                    <Ionicons name="book-outline" size={24} color="#E65100" />
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.courseName}>{item.name}</Text>
                    <Text style={styles.courseSubtitle}>View detailed career guidance</Text>
                </View>
                <View style={styles.arrowBox}>
                    <Ionicons name="chevron-forward" size={18} color="#475569" />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title={departmentName}
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <View style={styles.container}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search courses..."
                        placeholderTextColor="#475569"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color="#E65100" size="large" />
                    </View>
                ) : filteredCourses.length > 0 ? (
                    <FlatList
                        data={filteredCourses}
                        renderItem={renderCourseItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.center}>
                        <Ionicons name="file-tray-outline" size={48} color="#1E293B" />
                        <Text style={styles.emptyText}>No courses found in this department.</Text>
                    </View>
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    container: { flex: 1, padding: 20 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 52,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#EFEBE9',
        shadowColor: '#864b03',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    searchIcon: { marginRight: 12 },
    searchInput: {
        flex: 1,
        color: '#3E2723',
        fontSize: 15,
        fontWeight: '600'
    },
    list: { paddingBottom: 40 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EFEBE9',
        shadowColor: '#864b03',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    cardText: { flex: 1 },
    courseName: {
        fontSize: 17,
        fontWeight: '800',
        color: '#3E2723',
        marginBottom: 2
    },
    courseSubtitle: {
        fontSize: 12,
        color: '#8D6E63',
        fontWeight: '600'
    },
    arrowBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyText: {
        color: '#8D6E63',
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600'
    }
});
