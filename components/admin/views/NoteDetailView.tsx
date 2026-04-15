import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface NoteDetailViewProps {
    noteId: string;
    onBack: () => void;
    onEdit?: (noteId: string) => void;
    onDelete?: (noteId: string) => void;
}

export function NoteDetailView({ noteId, onBack, onEdit, onDelete }: NoteDetailViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency
    const [note, setNote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [webViewHeight, setWebViewHeight] = useState(500);
    const { height: windowHeight } = useWindowDimensions();

    useEffect(() => {
        loadNote();
    }, [noteId]);

    const loadNote = async () => {
        setLoading(true);
        const data = await supabaseDB.getNoteById(noteId);
        setNote(data);
        setLoading(false);
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Note",
            "Are you sure you want to delete this note? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await supabaseDB.deleteNote(noteId);
                        onDelete?.(noteId);
                    }
                }
            ]
        );
    };

    if (loading) return <View style={[styles.center, { backgroundColor: '#FFF8F6' }]}><ActivityIndicator color="#4E342E" /></View>;

    if (!note) {
        return (
            <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtnHeader}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                    <Text style={[styles.backText, { color: '#000000' }]}>Back</Text>
                </TouchableOpacity>
                <View style={styles.center}>
                    <Text style={{ color: colors.textSecondary }}>Note not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: '#000000' }]} numberOfLines={1}>{note.title}</Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.badge, { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' }]}>
                            <Text style={[styles.badgeText, { color: '#864b03' }]}>{note.subject || 'General'}</Text>
                        </View>
                        {note.topic && (
                            <Text style={[styles.topicText, { color: colors.textSecondary }]}>{note.topic}</Text>
                        )}
                    </View>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF8F6' }]} onPress={() => onEdit?.(note.id)}>
                        <Ionicons name="create-outline" size={20} color="#4E342E" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]} onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            Created on {new Date(note.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </Text>
                    </View>
                    <WebView
                        originWhitelist={['*']}
                        source={{
                            html: `
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
                                    <style>
                                        body {
                                            font-family: -apple-system, system-ui;
                                            font-size: 16px;
                                            line-height: 1.6;
                                            color: '#3E2723';
                                            background-color: transparent;
                                            margin: 0;
                                            padding: 0;
                                        }
                                        h1, h2, h3, h4 { color: #864b03; font-weight: 800; }
                                        .ql-editor { padding: 0 !important; }
                                        .ql-editor p { margin-bottom: 1em; }
                                    </style>
                                </head>
                                <body class="ql-snow">
                                    <div class="ql-editor" id="content">
                                        ${note.content}
                                    </div>
                                    <script>
                                        function sendHeight() {
                                            const height = document.getElementById('content').offsetHeight;
                                            window.ReactNativeWebView.postMessage(height);
                                        }
                                        window.onload = sendHeight;
                                        window.addEventListener('resize', sendHeight);
                                    </script>
                                </body>
                                </html>
                            `
                        }}
                        onMessage={(event) => {
                            const newHeight = parseInt(event.nativeEvent.data);
                            if (newHeight > 0) setWebViewHeight(newHeight + 40);
                        }}
                        style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                        scrollEnabled={false}
                    />
                </View>

                {note.quiz && note.quiz.length > 0 && (
                    <View style={styles.quizSection}>
                        <Text style={[styles.sectionTitle, { color: '#000000' }]}>Quiz Questions ({note.quiz.length})</Text>
                        {note.quiz.map((q: any, idx: number) => (
                            <View key={idx} style={[styles.qCard, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                                <Text style={[styles.qText, { color: '#3E2723' }]}>{idx + 1}. {q.question}</Text>
                                <View style={styles.optionsList}>
                                    {['A', 'B', 'C', 'D'].map((opt, oIdx) => (
                                        <View key={opt} style={styles.optionItem}>
                                            <View style={[
                                                styles.optCircle,
                                                { backgroundColor: '#F1F5F9' },
                                                q.correctAnswer === opt && { backgroundColor: '#4E342E' }
                                            ]}>
                                                <Text style={[styles.optChar, q.correctAnswer === opt && { color: '#FFFFFF' }]}>{opt}</Text>
                                            </View>
                                            <Text style={[styles.optionLabel, { color: '#3E2723' }]}>{q.options[oIdx]}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={[styles.explBox, { backgroundColor: '#FFF8F6' }]}>
                                    <Text style={[styles.explLabel, { color: '#864b03' }]}>EXPLANATION</Text>
                                    <Text style={[styles.explText, { color: '#3E2723' }]}>{q.explanation}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    backBtnHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 8 },
    backText: { fontSize: 16, fontWeight: '600' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 16,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
        backgroundColor: '#FFFFFF'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    topicText: { fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 8, borderRadius: 10 },
    content: {
        padding: 16,
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    noteCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        minHeight: 500,
        elevation: 1,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, opacity: 0.8 },
    dateText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    bodyText: { fontSize: 16, lineHeight: 26, fontWeight: '500' },
    quizSection: { marginTop: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20 },
    qCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
    qText: { fontSize: 15, fontWeight: '800', lineHeight: 22, marginBottom: 16 },
    optionsList: { gap: 10 },
    optionItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    optCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    optChar: { fontSize: 13, fontWeight: '900' },
    optionLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
    explBox: { marginTop: 16, padding: 12, borderRadius: 12 },
    explLabel: { fontSize: 10, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    explText: { fontSize: 13, fontWeight: '500', lineHeight: 18 }
});
