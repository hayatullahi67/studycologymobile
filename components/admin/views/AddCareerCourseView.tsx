import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RichTextEditor } from '../../RichTextEditor';
import { useAppStore } from '../../../store/useAppStore';
import * as localDB from '../../../services/localDatabase';
import * as supabaseDB from '../../../services/supabaseDatabase';

interface AddCareerCourseViewProps {
    departmentId: string;
    courseId: string | null;
    onBack: () => void;
    onSave: () => void;
}

export function AddCareerCourseView({ departmentId, courseId, onBack, onSave }: AddCareerCourseViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [selectedDept, setSelectedDept] = useState(departmentId);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const departments = [
        { id: 'sci', name: 'Science' },
        { id: 'art', name: 'Art' },
        { id: 'com', name: 'Commercial' },
    ];

    useEffect(() => {
        if (courseId) {
            loadCourseData();
        }
    }, [courseId]);

    const loadCourseData = async () => {
        try {
            setFetching(true);
            const data = await localDB.getCareerCourseById(courseId!);
            if (data) {
                setName(data.name);
                setContent(data.content);
                setSelectedDept(data.department_id);
            }
        } catch (error) {
            console.error('Error fetching course:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !content.trim()) {
            Alert.alert("Error", "Please fill name and content");
            return;
        }

        try {
            setLoading(true);
            const courseData = {
                ...(courseId && { id: courseId }),
                department_id: selectedDept,
                name: name.trim(),
                content: content,
                created_at: new Date().toISOString()
            };

            const saved = await supabaseDB.saveCareerCourse(courseData);
            if (saved) {
                await localDB.saveCareerCourse(saved);
                onSave();
            }
        } catch (error) {
            console.error('Error saving course:', error);
            Alert.alert("Error", "Failed to save course.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#864b03" size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <Text style={styles.title}>{courseId ? 'Edit Guidance' : 'New Guidance'}</Text>
                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.disabledBtn]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.saveBtnText}>Publish</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView
                    style={styles.form}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.label}>COURSE NAME</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Medicine & Surgery"
                        placeholderTextColor="#475569"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>DEPARTMENT</Text>
                    <View style={styles.deptRow}>
                        {departments.map(dept => (
                            <TouchableOpacity
                                key={dept.id}
                                style={[
                                    styles.deptChip,
                                    selectedDept === dept.id && styles.activeChip
                                ]}
                                onPress={() => setSelectedDept(dept.id)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedDept === dept.id && styles.activeChipText
                                ]}>
                                    {dept.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>GUIDANCE CONTENT (WRITE-UP)</Text>
                    <View style={styles.editorContainer}>
                        <RichTextEditor
                            initialValue={content}
                            onChange={setContent}
                            placeholder="Write requirements, subject combinations, cut-off marks, and career prospects..."
                            isDark={false}
                        />
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6', },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EFEBE9'
    },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: '900', color: '#000000' },
    saveBtn: {
        backgroundColor: '#864b03',
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 12
    },
    saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    disabledBtn: { opacity: 0.5 },
    form: {
        padding: 20,
        maxWidth: 650,
        alignSelf: 'center',
        width: '100%'
    },
    label: {
        color: '#864b03',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 10,
        marginTop: 10
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        color: '#3E2723',
        fontSize: 16,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#D7CCC8',
        marginBottom: 24
    },
    deptRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    deptChip: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D7CCC8'
    },
    activeChip: { backgroundColor: '#864b03', borderColor: '#864b03' },
    chipText: { color: '#864b03', fontWeight: '800', fontSize: 12 },
    activeChipText: { color: '#FFFFFF' },
    editorContainer: {
        minHeight: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#D7CCC8'
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 }
});
