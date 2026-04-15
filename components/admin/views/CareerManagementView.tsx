import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../../../services/localDatabase';
import * as supabaseDB from '../../../services/supabaseDatabase';

interface Course {
    id: string;
    name: string;
    department_id: string;
    created_at: string;
}

interface CareerManagementViewProps {
    onAddCourse: (deptId: string) => void;
    onEditCourse: (courseId: string) => void;
}

export function CareerManagementView({ onAddCourse, onEditCourse }: CareerManagementViewProps) {
    const [selectedDept, setSelectedDept] = useState('sci');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const departments = [
        { id: 'sci', name: 'Science' },
        { id: 'art', name: 'Art' },
        { id: 'com', name: 'Commercial' },
    ];

    useEffect(() => {
        loadCourses();
    }, [selectedDept]);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const data = await localDB.getCareerCourses(selectedDept);
            setCourses(data);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Course",
            "Are you sure you want to delete this course and all its guidance content?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await supabaseDB.deleteCareerCourse(id);
                            await localDB.deleteCareerCourse(id);
                            loadCourses();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete course.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Career & Inst.</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => onAddCourse(selectedDept)}
                >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Course</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                {departments.map((dept) => (
                    <TouchableOpacity
                        key={dept.id}
                        style={[
                            styles.tab,
                            selectedDept === dept.id && styles.activeTab
                        ]}
                        onPress={() => setSelectedDept(dept.id)}
                    >
                        <Text style={[
                            styles.tabText,
                            selectedDept === dept.id && styles.activeTabText
                        ]}>
                            {dept.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#864b03" size="large" />
                </View>
            ) : courses.length > 0 ? (
                <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                >
                    {courses.map((course) => (
                        <View key={course.id} style={styles.courseCard}>
                            <View style={styles.courseInfo}>
                                <Text style={styles.courseName}>{course.name}</Text>
                                <Text style={styles.courseMeta}>
                                    Last Updated: {new Date(course.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => onEditCourse(course.id)}
                                >
                                    <Ionicons name="pencil" size={18} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.deleteBtn]}
                                    onPress={() => handleDelete(course.id)}
                                >
                                    <Ionicons name="trash" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            ) : (
                <View style={styles.center}>
                    <Ionicons name="school-outline" size={48} color="#864b03" style={{ opacity: 0.1 }} />
                    <Text style={styles.emptyText}>No courses in this department yet.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8F6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        maxWidth: 700,
        alignSelf: 'center',
        width: '100%'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: { fontSize: 22, fontWeight: '900', color: '#000000' },
    addButton: {
        flexDirection: 'row',
        backgroundColor: '#864b03',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        gap: 6
    },
    addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 6,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#D7CCC8'
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12
    },
    activeTab: { backgroundColor: '#864b03' },
    tabText: { color: '#864b03', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
    activeTabText: { color: '#FFFFFF' },
    list: { flex: 1 },
    courseCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D7CCC8'
    },
    courseInfo: { flex: 1 },
    courseName: { fontSize: 15, fontWeight: '800', color: '#3E2723', marginBottom: 2 },
    courseMeta: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#EFEBE9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    deleteBtn: { backgroundColor: '#FFEBEE' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
    emptyText: { color: '#64748B', marginTop: 12, fontSize: 13, fontWeight: '700' }
});
