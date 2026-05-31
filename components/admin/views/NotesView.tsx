import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { ThemeColors } from '../../../theme/colors';

interface NotesViewProps {
    onSelectNote?: (noteId: string, noteIds?: string[]) => void;
    onAddNote?: () => void;
    onBack?: () => void;
}

export function NotesView({ onSelectNote, onAddNote, onBack }: NotesViewProps) {
    const colors = ThemeColors.light;
    const [notes, setNotes] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadNotes();
        }, [])
    );

    const loadNotes = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getNotes();
            setNotes(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
    const getNoteSubject = (note: any) => note.subject || note.subjectId || note.subject_id || 'General';
    const getSubjectKey = (note: any) => `subject-${normalizeLabel(getNoteSubject(note))}`;
    const getTopicKey = (note: any) => note.topic_id || `legacy-topic-${getSubjectKey(note)}-${(note.topic || 'General').toLowerCase()}`;
    const getSubtopicKey = (note: any) => note.subtopic_id || `legacy-subtopic-${getTopicKey(note)}-${(note.subtopic || note.title).toLowerCase()}`;

    const makeGroups = (
        items: any[],
        getKey: (note: any) => string,
        getTitle: (note: any) => string,
        getSubtitle: (groupNotes: any[]) => string
    ) => {
        const groups = new Map<string, any>();
        items.forEach((note) => {
            const key = getKey(note);
            if (!groups.has(key)) {
                groups.set(key, { id: key, title: getTitle(note), notes: [] });
            }
            groups.get(key).notes.push(note);
        });

        return Array.from(groups.values()).map((group) => ({
            ...group,
            subtitle: getSubtitle(group.notes),
        }));
    };

    const countGroups = (items: any[], getKey: (note: any) => string) => new Set(items.map(getKey)).size;

    const subjectGroups = makeGroups(
        notes,
        getSubjectKey,
        (note) => getNoteSubject(note),
        (groupNotes) => {
            const topicCount = countGroups(groupNotes, getTopicKey);
            return `${topicCount} topic${topicCount === 1 ? '' : 's'}`;
        }
    );

    const topicGroups = selectedSubject ? makeGroups(
        selectedSubject.notes,
        getTopicKey,
        (note) => note.topic || 'General',
        (groupNotes) => {
            const subtopicCount = countGroups(groupNotes, getSubtopicKey);
            return `${subtopicCount} subtopic${subtopicCount === 1 ? '' : 's'}`;
        }
    ) : [];

    const visibleGroups = selectedSubject ? topicGroups : subjectGroups;
    const groupLabel = selectedSubject ? 'TOPIC' : 'SUBJECT';
    const iconName = selectedSubject ? 'albums-outline' : 'folder-open-outline';

    const openGroup = (group: any) => {
        if (!selectedSubject) {
            setSelectedSubject(group);
            return;
        }
        onSelectNote?.(group.notes[0].id, group.notes.map((note: any) => note.id));
    };

    const handleBackLevel = () => {
        if (selectedSubject) {
            setSelectedSubject(null);
        }
    };

    const getHeaderTitle = () => {
        if (selectedSubject) return `${selectedSubject.title} Topics`;
        return 'Study Notes';
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    {!selectedSubject && onBack && (
                        <TouchableOpacity style={styles.levelBackBtn} onPress={onBack}>
                            <Ionicons name="arrow-back" size={18} color="#3E2723" />
                        </TouchableOpacity>
                    )}
                    {selectedSubject && (
                        <TouchableOpacity style={styles.levelBackBtn} onPress={handleBackLevel}>
                            <Ionicons name="arrow-back" size={18} color="#3E2723" />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{getHeaderTitle()}</Text>
                </View>

                {!selectedSubject && (
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#4E342E' }]} onPress={onAddNote}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>New Note</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.placeholder}>
                    <ActivityIndicator size="small" color="#4E342E" />
                    <Text style={[styles.placeholderText, { color: '#64748B' }]}>Loading notes...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {visibleGroups.length > 0 ? (
                        visibleGroups.map((group) => (
                            <TouchableOpacity
                                key={group.id}
                                style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                                onPress={() => openGroup(group)}
                            >
                                <View style={[styles.iconBox, { backgroundColor: '#FFF8F6' }]}>
                                    <Ionicons name={iconName as any} size={24} color="#864b03" />
                                </View>
                                <View style={styles.cardInfo}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{groupLabel}</Text>
                                    </View>
                                    <Text style={[styles.title, { color: '#3E2723' }]}>{group.title}</Text>
                                    <Text style={[styles.subtitle, { color: '#64748B' }]}>{group.subtitle}</Text>
                                </View>
                                <View style={styles.actionBtn}>
                                    <Ionicons name="chevron-forward" size={20} color="#D7CCC8" />
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="document-text-outline" size={48} color="#D7CCC8" />
                            <Text style={[styles.placeholderText, { color: '#64748B' }]}>No notes found here.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FFF8F6'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    levelBackBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFEBE9',
        borderWidth: 1,
        borderColor: '#D7CCC8'
    },
    headerTitle: { fontSize: 14, fontWeight: '900' },
    addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, gap: 8, elevation: 2 },
    addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    listContent: {
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, elevation: 2 },
    iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#D7CCC8' },
    cardInfo: { flex: 1 },
    badge: { alignSelf: 'flex-start', backgroundColor: '#FFF8F6', borderColor: '#D7CCC8', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
    badgeText: { color: '#864b03', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    title: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    subtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    actionBtn: { padding: 4 },
    placeholder: { paddingVertical: 60, alignItems: 'center', gap: 12 },
    placeholderText: { fontSize: 14, fontWeight: '600' }
});
