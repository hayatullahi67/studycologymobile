import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const DEPARTMENTS = [
    {
        id: 'sci',
        name: 'Science',
        icon: 'flask-outline',
        color: '#3B82F6'
    },
    {
        id: 'art',
        name: 'Art',
        icon: 'brush-outline',
        color: '#D946EF'
    },
    {
        id: 'com',
        name: 'Commercial',
        icon: 'briefcase-outline',
        color: '#10B981'
    }
];

export function CareerGuidanceScreen() {
    const navigation = useNavigation<AppNavigationProp>();

    return (
        <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="Career & Institutions"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Choose Your Path</Text>
                    <Text style={styles.heroSubtitle}>Select a department to explore university courses and career requirements.</Text>
                </View>

                <View style={styles.grid}>
                    {DEPARTMENTS.map((dept) => (
                        <TouchableOpacity
                            key={dept.id}
                            style={styles.card}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('CourseList', {
                                departmentId: dept.id,
                                departmentName: dept.name
                            })}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(230,81,0,0.1)' }]}>
                                <Ionicons name={dept.icon as any} size={22} color="#E65100" />
                            </View>

                            <View style={styles.cardContent}>
                                <Text style={styles.deptName}>{dept.name}</Text>
                            </View>

                            <View style={styles.arrowContainer}>
                                <Ionicons name="chevron-forward" size={20} color="#64748B" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#E65100" />
                    <Text style={styles.infoText}>
                        Our guidance is based on current Jamb/University requirements in Nigeria.
                    </Text>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    heroSection: {
        marginBottom: 32,
        marginTop: 10
    },
    heroTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: '#3E2723', // Dark Brown
        letterSpacing: -0.5,
        marginBottom: 8
    },
    heroSubtitle: {
        fontSize: 15,
        color: '#5D4037', // Medium Brown
        lineHeight: 22,
        fontWeight: '500'
    },
    grid: {
        gap: 12
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEBE9',
        shadowColor: '#864b03',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14
    },
    cardContent: {
        flex: 1
    },
    deptName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#3E2723', // Dark Brown
        letterSpacing: 0.2
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center'
    },
    infoBox: {
        marginTop: 40,
        flexDirection: 'row',
        backgroundColor: '#FFF3E0', // Light Orange/Brown tint
        padding: 18,
        borderRadius: 20,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#FFE0B2'
    },
    infoText: {
        flex: 1,
        color: '#864b03',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600'
    }
});
