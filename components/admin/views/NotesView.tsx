import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface NotesViewProps {
    onSelectNote?: (noteId: string) => void;
    onAddNote?: () => void;
}

export function NotesView({ onSelectNote, onAddNote }: NotesViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency
    const [notes, setNotes] = useState<any[]>([]);
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

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: '#000000' }]}>Study Notes</Text>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#4E342E' }]} onPress={onAddNote}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>New Note</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.placeholder}>
                    <ActivityIndicator size="small" color="#4E342E" />
                    <Text style={[styles.placeholderText, { color: '#64748B' }]}>Loading notes...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {notes.length > 0 ? (
                        notes.map((note) => (
                            <TouchableOpacity
                                key={note.id}
                                style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                                onPress={() => onSelectNote?.(note.id)}
                            >
                                <View style={[styles.iconBox, { backgroundColor: '#FFF8F6' }]}>
                                    <Ionicons name="document-text" size={24} color="#864b03" />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={[styles.title, { color: '#3E2723' }]}>{note.title}</Text>
                                    <Text style={[styles.subtitle, { color: '#64748B' }]}>
                                        {note.subject || 'General'}
                                        {note.topic ? ` • ${note.topic}` : ''}
                                        {' • '}{new Date(note.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.actionBtn}>
                                    <Ionicons name="chevron-forward" size={20} color="#D7CCC8" />
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="document-text-outline" size={48} color="#D7CCC8" />
                            <Text style={[styles.placeholderText, { color: '#64748B' }]}>No notes found. Create your first note!</Text>
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
    headerTitle: { fontSize: 20, fontWeight: '900' },
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
    title: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    subtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    actionBtn: { padding: 4 },
    placeholder: { paddingVertical: 60, alignItems: 'center', gap: 12 },
    placeholderText: { fontSize: 14, fontWeight: '600' }
});
