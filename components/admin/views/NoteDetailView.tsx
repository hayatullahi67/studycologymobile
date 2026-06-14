import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { ThemeColors } from '../../../theme/colors';

interface NoteDetailViewProps {
    noteId: string;
    noteIds?: string[];
    onBack: () => void;
    onEdit?: (noteId: string) => void;
    onDelete?: (noteId: string) => void;
}

export function NoteDetailView({ noteId, noteIds, onBack, onEdit, onDelete }: NoteDetailViewProps) {
    const colors = ThemeColors.light; // Force light mode for theme consistency
    const [note, setNote] = useState<any>(null);
    const [topicNotes, setTopicNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [audioLoading, setAudioLoading] = useState<string | null>(null);
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    const [playbackStatus, setPlaybackStatus] = useState({ position: 0, duration: 1, isPlaying: false });
    const soundRef = useRef<Audio.Sound | null>(null);
    const [webViewHeights, setWebViewHeights] = useState<Record<string, number>>({});
    const [showSubtopicContent, setShowSubtopicContent] = useState(false);
    const noteIdsKey = `${noteId}|${(noteIds && noteIds.length > 0 ? noteIds : [noteId]).join('|')}`;

    useEffect(() => {
        loadNote();
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, [noteIdsKey]);

    const loadNote = async () => {
        try {
            setLoading(true);
            const idsToLoad = noteIds && noteIds.length > 0 ? noteIds : [noteId];
            const [selectedNote, loadedNotes] = await Promise.all([
                supabaseDB.getNoteById(noteId),
                Promise.all(idsToLoad.map((id) => supabaseDB.getNoteById(id))),
            ]);

            const cleanNotes = loadedNotes
                .filter(Boolean)
                .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            const primaryNote = selectedNote || cleanNotes[0] || null;

            setNote(primaryNote);
            setTopicNotes(cleanNotes.length > 0 ? cleanNotes : primaryNote ? [primaryNote] : []);
        } finally {
            setLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPlaybackStatus({ position: status.positionMillis, duration: status.durationMillis || 1, isPlaying: status.isPlaying });
            if (status.didJustFinish) setActiveAudioId(null);
        }
    };

  const playAudio = async (url: string, id: string) => {
    try {
        if (!url || url === 'null' || !url.trim()) {
            console.warn('[Audio] Attempted to play invalid URL:', url);
            return;
        }

        if (activeAudioId === id && soundRef.current) {
            const status: any = await soundRef.current.getStatusAsync();
            if (status.isLoaded) {
                status.isPlaying 
                    ? await soundRef.current.pauseAsync() 
                    : await soundRef.current.playAsync();
            }
            return;
        }

        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }

        setAudioLoading(id);

        // Resolving URL: Handle both stored absolute URLs and relative Storage paths
        let audioUri = url.trim();
        if (!audioUri.startsWith('http')) {
            const { data } = supabaseDB.supabase.storage
                .from('voice-notes')
                .getPublicUrl(audioUri);
            
            if (data?.publicUrl) {
                audioUri = data.publicUrl;
            }
        }

        // Log resolved URI for debugging if 400 error persists on specific files
        console.log('[Audio] Stream initiated for:', audioUri);

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            {
                shouldPlay: true,
                progressUpdateIntervalMillis: 100,
                positionMillis: 0,
                rate: 1.0,
                shouldCorrectPitch: true,
                volume: 1.0,
                isMuted: false,
            },
            onPlaybackStatusUpdate
        );

        soundRef.current = newSound;
        setActiveAudioId(id);
    } catch (err) {
        console.error('[Audio] Playback failed:', err);
        Alert.alert('Playback Error', 'The voice explanation could not be loaded. Please check your connection or file permissions.');
    } finally {
        setAudioLoading(null);
    }
};

    const handleSelectSubtopic = async (subtopicId: string) => {
        if (note?.id === subtopicId && topicNotes.some((item) => item.id === subtopicId)) {
            setShowSubtopicContent(true);
            return;
        }

        const selected = topicNotes.find((item) => item.id === subtopicId);
        if (selected) {
            setNote(selected);
            setShowSubtopicContent(true);
            return;
        }

        try {
            setLoading(true);
            const freshNote = await supabaseDB.getNoteById(subtopicId);
            if (freshNote) {
                setNote(freshNote);
                setShowSubtopicContent(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackToSubtopics = () => {
        setShowSubtopicContent(false);
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

    const topicTitle = note?.topic || note?.title || 'Topic';
    const subjectTitle = note?.subject || 'General';

    // const renderContentHtml = (content: string) => `
    //     <html>
    //     <head>
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    //         <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    //         <style>
    //             body {
    //                 font-family: -apple-system, system-ui;
    //                 font-size: 15px;
    //                 line-height: 1;
    //                 color: #3E2723;
    //                 background-color: transparent;
    //                 margin: 0;
    //                 padding: 0;
    //             }
    //             h1, h2, h3, h4 {
    //                 color: #864b03;
    //                 font-weight: 800;
    //                 margin: 0 0 0.6em;
    //             }
    //             .ql-editor {
    //                 padding: 0 !important;
    //                 margin: 0 !important;
    //             }
    //             .ql-editor p {
    //                 margin: 0 0 0.75em;
    //                 line-height: 1.5;
    //             }
    //             .ql-editor ul,
    //             .ql-editor ol {
    //                 margin: 0 0 0.8em;
    //                 padding-left: 18px;
    //             }
    //             .ql-editor li {
    //                 margin-bottom: 0.35em;
    //             }
    //             img { max-width: 100%; height: auto; border-radius: 8px; }
    //         </style>
    //     </head>
    //     <body class="ql-snow">
    //         <div class="ql-editor" id="content">
    //             ${content || ''}
    //         </div>
    //         <script>
    //             function sendHeight() {
    //                 const height = document.getElementById('content').offsetHeight;
    //                 window.ReactNativeWebView.postMessage(height);
    //             }
    //             window.onload = sendHeight;
    //             window.addEventListener('resize', sendHeight);
    //         </script>
    //     </body>
    //     </html>
    // `;

    const renderContentHtml = (content: string) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
                font-family: -apple-system, system-ui;
                font-size: 15px;
                line-height: 1.5;
                color: #3E2723;
                background-color: transparent;
                width: 100%;
                height: auto;
                overflow: hidden;
            }
            h1, h2, h3, h4 {
                color: #864b03;
                font-weight: 800;
                margin: 0 0 0.6em;
            }
            .ql-container.ql-snow { border: none !important; }
            .ql-editor {
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                height: auto !important;
                min-height: unset !important;
            }
            .ql-editor p { margin: 0 0 0.75em; line-height: 1.5; }
            .ql-editor p:last-child { margin-bottom: 0; }
            .ql-editor ul, .ql-editor ol { margin: 0 0 0.8em; padding-left: 18px; }
            .ql-editor li { margin-bottom: 0.35em; }
            img { max-width: 100%; height: auto; border-radius: 8px; }
        </style>
    </head>
    <body class="ql-snow">
        <div class="ql-editor" id="content">${content || ''}</div>
        <script>
            var lastH = 0;
            var stableCount = 0;

            function pollUntilStable() {
                var content = document.getElementById('content');
                var h = Math.max(document.body.scrollHeight, content.scrollHeight, content.offsetHeight);
                if (h > 0 && h === lastH) {
                    stableCount++;
                    if (stableCount >= 3) {
                        window.ReactNativeWebView.postMessage(String(h));
                        return;
                    }
                } else {
                    stableCount = 0;
                    lastH = h;
                }
                setTimeout(pollUntilStable, 100);
            }

            document.addEventListener('DOMContentLoaded', function() {
                pollUntilStable();
            });
        </script>
    </body>
    </html>
`;
    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: '#000000' }]} numberOfLines={1}>{topicTitle}</Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.badge, { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' }]}>
                            <Text style={[styles.badgeText, { color: '#864b03' }]}>{subjectTitle}</Text>
                        </View>
                        <Text style={[styles.topicText, { color: colors.textSecondary }]}>
                            {topicNotes.length} subtopic{topicNotes.length === 1 ? '' : 's'}
                        </Text>
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
                <View style={styles.topicIntro}>
                    <Text style={styles.topicIntroTitle}>{topicTitle}</Text>
                    <Text style={styles.topicIntroText}>{subjectTitle} topic content arranged by subtopic.</Text>
                </View>

                {!showSubtopicContent && (
                    <View style={styles.subtopicList}>
                        {topicNotes.map((item: any, index: number) => {
                            const selected = item.id === note?.id;
                            const subtopicTitle = item.subtopic || item.title || `Subtopic ${index + 1}`;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.subtopicItem, selected && styles.subtopicItemSelected]}
                                    onPress={() => handleSelectSubtopic(item.id)}
                                >
                                    <View style={[styles.subtopicIndex, selected && styles.subtopicIndexSelected]}>
                                        <Text style={[styles.subtopicIndexText, selected && styles.subtopicIndexTextSelected]}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.subtopicInfo}>
                                        <Text style={[styles.subtopicTitle, selected && styles.subtopicTitleSelected]} numberOfLines={1}>{subtopicTitle}</Text>
                                        <Text style={styles.subtopicMeta} numberOfLines={1}>
                                            {new Date(item.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {showSubtopicContent ? (
                    <>
                        <TouchableOpacity style={styles.subtopicBackBtn} onPress={handleBackToSubtopics}>
                            <Ionicons name="arrow-back" size={18} color="#4E342E" />
                            <Text style={styles.subtopicBackText}>Back to subtopics</Text>
                        </TouchableOpacity>

                        <View style={[styles.noteContentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                            <Text style={styles.noteContentTitle}>{note?.subtopic || note?.title || 'Selected Subtopic'}</Text>
                            
                            {note?.audio_url && (
                                <View style={[styles.detailAudioContainer, { backgroundColor: '#FFF3E0', borderColor: '#E7E0D7', opacity: audioLoading === note.id ? 0.7 : 1 }]}>
                                    <TouchableOpacity 
                                        style={[styles.detailPlayBtn, { backgroundColor: '#864b03' }]} 
                                        onPress={() => playAudio(note.audio_url, note.id)}
                                        disabled={audioLoading === note.id}
                                    >
                                        {audioLoading === note.id ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Ionicons name={activeAudioId === note.id && playbackStatus.isPlaying ? "pause" : "play"} size={20} color="#FFF" />
                                        )}
                                    </TouchableOpacity>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailAudioText}>Voice Explanation</Text>
                                        <View style={styles.detailProgressBarBg}>
                                            <View style={[styles.detailProgressBarFill, { width: activeAudioId === note.id ? `${(playbackStatus.position / playbackStatus.duration) * 100}%` : '0%' }]} />
                                        </View>
                                        {activeAudioId === note.id && (
                                            <Text style={styles.detailTimeText}>
                                                {Math.floor(playbackStatus.position / 1000)}s / {Math.floor(playbackStatus.duration / 1000)}s
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            <WebView
                                originWhitelist={['*']}
                                source={{ html: renderContentHtml(note?.content || '') }}
                                onMessage={(event) => {
                                    const newHeight = parseInt(event.nativeEvent.data);
                                    if (newHeight > 0 && note?.id) {
                                        setWebViewHeights((heights) => ({ ...heights, [note.id]: newHeight + 36 }));
                                    }
                                }}
                                style={{ height: webViewHeights[note?.id || ''] || 260, backgroundColor: 'transparent' }}
                                scrollEnabled={false}
                            />
                        </View>

                        {Array.isArray(note?.quiz) && note.quiz.length > 0 && (
                            <View style={styles.quizSection}>
                                <Text style={[styles.sectionTitle, { color: '#000000' }]}>
                                    Subtopic Quiz ({note?.quiz?.length || 0} question{(note?.quiz?.length || 0) !== 1 ? 's' : ''})
                                </Text>
                                {(note?.quiz || []).map((q: any, idx: number) => (
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
                    </>
                ) : null}
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
    topicIntro: {
        marginBottom: 16,
        paddingHorizontal: 2
    },
    topicIntroTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#3E2723',
        marginBottom: 4
    },
    topicIntroText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B'
    },
    subtopicList: {
        marginBottom: 20,
        gap: 12
    },
    subtopicItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E7E0D7',
        backgroundColor: '#FFFFFF'
    },
    subtopicItemSelected: {
        borderColor: '#864b03',
        backgroundColor: '#FFF3E0'
    },
    subtopicIndex: {
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8EFE6'
    },
    subtopicIndexSelected: {
        backgroundColor: '#864b03'
    },
    subtopicIndexText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#864b03'
    },
    subtopicIndexTextSelected: {
        color: '#FFFFFF'
    },
    subtopicInfo: {
        flex: 1
    },
    subtopicTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#3E2723',
        marginBottom: 2
    },
    subtopicTitleSelected: {
        color: '#4E342E'
    },
    subtopicMeta: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B'
    },
    noteContentCard: {
        borderWidth: 1,
        borderRadius: 24,
        padding: 14,
        marginBottom: 20,
        borderColor: '#E7E0D7'
    },
    noteContentTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#3E2723',
        marginBottom: 10
    },
    subtopicBackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: '#FFF3E0',
        alignSelf: 'flex-start'
    },
    subtopicBackText: {
        color: '#4E342E',
        fontSize: 13,
        fontWeight: '800'
    },
    detailAudioContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
    detailPlayBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    detailAudioText: { fontSize: 12, fontWeight: '800', color: '#864b03', marginBottom: 4 },
    detailProgressBarBg: { height: 4, backgroundColor: '#E7E0D7', borderRadius: 2, overflow: 'hidden' },
    detailProgressBarFill: { height: '100%', backgroundColor: '#864b03' },
    detailTimeText: { fontSize: 9, fontWeight: '700', color: '#864b03', marginTop: 4, textAlign: 'right' },
    accordionCard: {
        borderWidth: 1,
        borderRadius: 18,
        marginBottom: 12,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    accordionHeader: {
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
    },
    accordionTitleWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    accordionIndex: {
        width: 30,
        height: 30,
        borderRadius: 15,
        overflow: 'hidden',
        textAlign: 'center',
        textAlignVertical: 'center',
        backgroundColor: '#FFF8F6',
        color: '#864b03',
        fontSize: 12,
        fontWeight: '900',
        borderWidth: 1,
        borderColor: '#D7CCC8'
    },
    accordionTitleTextWrap: { flex: 1 },
    accordionTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#3E2723',
        marginBottom: 3
    },
    accordionMeta: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B'
    },
    accordionBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#EFEBE9'
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
