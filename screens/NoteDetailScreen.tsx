import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList, AppNavigationProp } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../services/localDatabase';
import { useAppStore } from '../store/useAppStore';
import * as Speech from 'expo-speech';

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
    bg: '#FFF8F6',
    bgDark: '#101920',
    primary: '#E65100',
    primaryDeep: '#3E2723',
    primaryLight: '#FEF3E8',
    primaryBorder: '#E7D5CB',
    cream: '#EFEBE9',
    creamBorder: '#D7CCC8',
    brown: '#864b03',
    brownMid: '#5D4037',
    text: '#1E293B',
    textMuted: '#475569',
    textFaint: '#94A3B8',
    white: '#FFFFFF',
    divider: '#F1F5F9',
};

function stripHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, ' ') // Strip HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
}

type NoteDetailRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;
type SpeechStatus = 'idle' | 'playing' | 'paused';

const SPEECH_RATES = [0.75, 1, 1.5, 2];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function NoteDetailScreen() {
    const route = useRoute<NoteDetailRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { noteId, noteIds } = route.params;
    const { fontSize } = useAppStore();

    const bodySize = fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : fontSize === 'large' ? 19 : 22;

    const [topicNotes, setTopicNotes] = useState<any[]>([]);
    const [topicTitle, setTopicTitle] = useState('');
    const [loading, setLoading] = useState(true);

    // 'list' = subtopic list, 'note' = reading a subtopic
    const [viewMode, setViewMode] = useState<'list' | 'note'>('list');
    const [activeNote, setActiveNote] = useState<any>(null);
    const [webViewHeight, setWebViewHeight] = useState(260);
    const [score, setScore] = useState<{ score: number; total: number } | null>(null);

    const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
    const [speechProgress, setSpeechProgress] = useState(0);
    const [speechRate, setSpeechRate] = useState(1);
    const speechTextRef = useRef('');
    const speechCharIndexRef = useRef(0);
    const speechStartIndexRef = useRef(0);
    const isPausingRef = useRef(false);

    const noteIdsKey = `${noteId}|${(noteIds && noteIds.length > 0 ? noteIds : [noteId]).join('|')}`;

    useEffect(() => {
        loadNotes();
        return () => {
            Speech.stop();
            resetSpeechState();
        };
    }, [noteIdsKey]);

    useEffect(() => {
        return () => {
            Speech.stop();
            resetSpeechState();
        };
    }, [activeNote]);

    const resetSpeechState = () => {
        isPausingRef.current = false;
        speechTextRef.current = '';
        speechCharIndexRef.current = 0;
        speechStartIndexRef.current = 0;
        setSpeechStatus('idle');
        setSpeechProgress(0);
    };

    const updateSpeechPosition = (charIndex: number) => {
        const textLength = speechTextRef.current.length;
        if (!textLength) return;
        const boundedIndex = Math.min(Math.max(charIndex, 0), textLength);
        speechCharIndexRef.current = boundedIndex;
        setSpeechProgress(boundedIndex / textLength);
    };

    const stopSpeaking = (resetProgress = true) => {
        isPausingRef.current = false;
        Speech.stop();
        setSpeechStatus('idle');
        if (resetProgress) {
            speechCharIndexRef.current = 0;
            speechStartIndexRef.current = 0;
            setSpeechProgress(0);
        }
    };

    const speakFromPosition = (fullText: string, startIndex = 0, rate = speechRate) => {
        const trimmedText = fullText.trim();
        if (!trimmedText) {
            resetSpeechState();
            return;
        }

        const boundedStart = Math.min(Math.max(startIndex, 0), trimmedText.length);
        speechTextRef.current = trimmedText;
        speechStartIndexRef.current = boundedStart;
        speechCharIndexRef.current = boundedStart;
        setSpeechProgress(boundedStart / trimmedText.length);
        isPausingRef.current = false;
        Speech.stop();

        Speech.speak(trimmedText.slice(boundedStart), {
            rate,
            onStart: () => setSpeechStatus('playing'),
            onBoundary: (event: any) => {
                updateSpeechPosition(speechStartIndexRef.current + event.charIndex + event.charLength);
            },
            onDone: () => {
                speechCharIndexRef.current = 0;
                speechStartIndexRef.current = 0;
                setSpeechProgress(1);
                setSpeechStatus('idle');
            },
            onStopped: () => {
                if (isPausingRef.current) {
                    isPausingRef.current = false;
                    setSpeechStatus('paused');
                } else {
                    setSpeechStatus('idle');
                }
            },
            onError: () => setSpeechStatus('idle'),
        });
    };

    const getSpeechText = (note: any) => stripHtml(note?.content || '');

    const speakNote = (note: any, rate = speechRate) => {
        if (!note) return;
        const bodyText = getSpeechText(note);
        const startIndex = speechProgress >= 1 ? 0 : speechCharIndexRef.current;
        speakFromPosition(bodyText, startIndex, rate);
    };

    const pauseSpeech = async () => {
        isPausingRef.current = true;
        setSpeechStatus('paused');
        await Speech.stop();
    };

    const resumeSpeech = () => {
        speakFromPosition(speechTextRef.current || getSpeechText(activeNote), speechCharIndexRef.current, speechRate);
    };

    const toggleSpeech = () => {
        if (speechStatus === 'playing') {
            pauseSpeech();
        } else if (speechStatus === 'paused') {
            resumeSpeech();
        } else {
            speakNote(activeNote);
        }
    };

    const cycleSpeechRate = () => {
        const nextRate = SPEECH_RATES[(SPEECH_RATES.indexOf(speechRate) + 1) % SPEECH_RATES.length];
        setSpeechRate(nextRate);
        if (speechStatus === 'playing') {
            speakFromPosition(speechTextRef.current || getSpeechText(activeNote), speechCharIndexRef.current, nextRate);
        }
    };

    const loadNotes = async () => {
        try {
            setLoading(true);
            const idsToLoad = noteIds && noteIds.length > 0 ? noteIds : [noteId];
            const [selectedNote, loadedNotes] = await Promise.all([
                localDB.getNoteByIdLocal(noteId),
                Promise.all(idsToLoad.map((id) => localDB.getNoteByIdLocal(id))),
            ]);

            const sorted = loadedNotes
                .filter(Boolean)
                .sort((a: any, b: any) => {
                    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                });

            const rootNote = sorted.find((n: any) => n.is_default) || selectedNote || sorted[0];
            const title = rootNote?.topic || rootNote?.title || 'Study Note';

            setTopicNotes(sorted.length > 0 ? sorted : rootNote ? [rootNote] : []);
            setTopicTitle(title);
        } catch (err) {
            console.error('Error loading notes:', err);
        } finally {
            setLoading(false);
        }
    };

    const openNote = async (item: any) => {
        setActiveNote(item);
        setWebViewHeight(260);
        setViewMode('note');

        // Load highest score for THIS subtopic's quiz (filtered by note id)
        if (item.quiz && item.quiz.length > 0) {
            const scoreData = await localDB.getNoteHighestScore(item.id);
            setScore(scoreData);
        } else {
            setScore(null);
        }
    };

    const goBack = () => {
        if (viewMode === 'note') {
            stopSpeaking();
            setViewMode('list');
            setActiveNote(null);
            setScore(null);
        } else {
            navigation.goBack();
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Screen style={[styles.center, { backgroundColor: C.bgDark }]}>
                <ActivityIndicator color={C.primary} size="large" />
            </Screen>
        );
    }

    // ── Subtopics List View ───────────────────────────────────────────────────
    if (viewMode === 'list') {
        return (
            <Screen scrollable={false} style={{ backgroundColor: C.bg, flex: 1 }}>
                <Header
                    title={topicTitle}
                    onBack={goBack}
                    style={{ backgroundColor: C.bg, borderBottomColor: C.bg }}
                    titleStyle={{ color: C.text }}
                    iconColor={C.text}
                />

                <FlatList
                    data={topicNotes}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <View style={styles.subjectBadge}>
                                <Text style={styles.subjectText}>
                                    {topicNotes[0]?.subject || 'GENERAL'}
                                </Text>
                            </View>
                            <Text style={styles.listTitle}>{topicTitle}</Text>
                            <Text style={styles.countLabel}>
                                {topicNotes.length} subtopic{topicNotes.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <SubtopicRow
                            item={item}
                            onPress={() => openNote(item)}
                        />
                    )}
                />
            </Screen>
        );
    }

    // ── Note Content View ─────────────────────────────────────────────────────
    if (!activeNote) return null;

    const noteSubtitle = activeNote.subtopic || activeNote.title || 'Note';
    const noteBody = activeNote.content || '';
    // Quiz is tied to this specific subtopic's note id — no cross-contamination
    const quiz = Array.isArray(activeNote.quiz) ? activeNote.quiz : [];

    // const contentHtml = `
    //     <html>
    //     <head>
    //         <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    //         <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    //         <style>
    //             @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    //             html, body {
    //                 font-family: 'Inter', -apple-system, system-ui;
    //                 font-size: ${bodySize}px;
    //                 line-height: 1.7;
    //                 color: ${C.primaryDeep};
    //                 background: transparent;
    //                 margin: 0; padding: 0;
    //             }
    //             h1,h2,h3,h4 { color: ${C.primary}; margin-top:1em; margin-bottom:0.4em; font-weight:800; }
    //             .ql-editor { padding: 0 !important; }
    //             .ql-editor p { margin: 0 0 0.85em; }
    //             .ql-editor p:last-child { margin-bottom: 0; }
    //             .ql-editor blockquote {
    //                 border-left: 4px solid ${C.primary};
    //                 padding-left: 16px;
    //                 color: ${C.brownMid};
    //                 font-style: italic;
    //             }
    //             img { max-width:100%; height:auto; border-radius:8px; }
    //         </style>
    //     </head>
    //     <body class="ql-snow">
    //         <div class="ql-editor" id="content">${noteBody}</div>
    //         <script>
    //             function sendHeight() {
    //                 const h = document.getElementById('content').offsetHeight;
    //                 window.ReactNativeWebView.postMessage(h);
    //             }
    //             window.onload = sendHeight;
    //             window.addEventListener('resize', sendHeight);
    //         </script>
    //     </body>
    //     </html>
    // `;


    const contentHtml = `
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
        <div class="ql-editor" id="content">${noteBody || ''}</div>
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
        <Screen scrollable={false} style={{ backgroundColor: C.bg, flex: 1 }}>
            <Header
                title={noteSubtitle}
                onBack={goBack}
                style={{ backgroundColor: C.bg, borderBottomColor: C.bg }}
                titleStyle={{ color: C.text }}
                iconColor={C.text}

            />

            <ScrollView
                contentContainerStyle={styles.noteContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Note heading */}
                <View style={styles.noteHeaderBlock}>
                    <View style={styles.subjectBadge}>
                        <Text style={styles.subjectText}>
                            {activeNote.subject || 'GENERAL'}
                        </Text>
                    </View>
                    <Text style={styles.noteMainTitle}>{noteSubtitle}</Text>

                    {activeNote.reference && (
                        <View style={styles.refRow}>
                            <Ionicons name="book-outline" size={13} color={C.textMuted} />
                            <Text style={styles.refText}>{activeNote.reference}</Text>
                        </View>
                    )}

                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
                        <Text style={styles.dateText}>
                            {new Date(activeNote.created_at).toLocaleDateString(undefined, {
                                day: 'numeric', month: 'short', year: 'numeric',
                            })}
                        </Text>
                    </View>
                </View>

                <SpeechPlayer
                    status={speechStatus}
                    progress={speechProgress}
                    rate={speechRate}
                    onToggle={toggleSpeech}
                    onCycleRate={cycleSpeechRate}
                />

                {/* Rich note content */}
                <View style={styles.noteCard}>
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: contentHtml }}
                        onMessage={(e) => {
                            const h = parseInt(e.nativeEvent.data);
                            if (h > 0) setWebViewHeight(h + 32);
                        }}
                        style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                        scrollEnabled={false}
                        javaScriptEnabled
                    />
                </View>

                {/* Quiz CTA — outside noteCard, below it, only if THIS subtopic has a quiz */}
                {quiz.length > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.quizBtn}
                        onPress={() => navigation.navigate('NoteQuiz', { noteId: activeNote.id })}
                    >
                        <View style={styles.quizBtnIcon}>
                            <Ionicons name="school" size={22} color={C.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.quizBtnTitle}>Test Your Knowledge</Text>
                            <Text style={styles.quizBtnSub}>
                                {score
                                    ? `Best: ${score.score}/${score.total}`
                                    : `${quiz.length} question quiz`}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={C.white} />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </Screen>
    );
}

// ─── Subtopic Row ─────────────────────────────────────────────────────────────
function SpeechPlayer({
    status,
    progress,
    rate,
    onToggle,
    onCycleRate,
}: {
    status: SpeechStatus;
    progress: number;
    rate: number;
    onToggle: () => void;
    onCycleRate: () => void;
}) {
    const progressPercent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
    const isPlaying = status === 'playing';

    return (
        <View style={styles.speechPlayer}>
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.speechPlayBtn}
                onPress={onToggle}
            >
                <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={22}
                    color={C.white}
                />
            </TouchableOpacity>

            <View style={styles.speechTrackWrap}>
                <View style={styles.speechTrack}>
                    <View style={[styles.speechProgress, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.speechMeta}>
                    {status === 'paused' ? 'Paused' : isPlaying ? 'Reading' : 'Ready'} - {progressPercent}%
                </Text>
            </View>

            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.speedBtn}
                onPress={onCycleRate}
            >
                <Text style={styles.speedText}>{rate}x</Text>
            </TouchableOpacity>
        </View>
    );
}

function SubtopicRow({ item, onPress }: { item: any; onPress: () => void }) {
    const label = item.subtopic || item.title || 'Subtopic';
    const hasQuiz = Array.isArray(item.quiz) && item.quiz.length > 0;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={styles.subtopicRow}
            onPress={onPress}
        >
            <View style={styles.subtopicDot} />
            <View style={styles.subtopicTextWrap}>
                <Text style={styles.subtopicLabel} numberOfLines={2}>{label}</Text>
                {hasQuiz && (
                    <Text style={styles.quizTag}>Quiz available</Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
        </TouchableOpacity>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // List view
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    listHeader: { paddingTop: 4, paddingBottom: 18 },
    listTitle: {
        fontSize: 22, fontWeight: '900', color: C.text,
        marginTop: 10, marginBottom: 4, lineHeight: 28,
    },
    countLabel: { fontSize: 12, fontWeight: '800', color: C.brown },

    separator: { height: 1, backgroundColor: C.divider, marginLeft: 44 },

    subtopicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 4,
        backgroundColor: C.white,
    },
    subtopicDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: C.primary, marginRight: 14,
    },
    subtopicTextWrap: { flex: 1 },
    subtopicLabel: { fontSize: 15, fontWeight: '700', color: C.text, lineHeight: 21 },
    quizTag: {
        fontSize: 10, fontWeight: '800', color: C.brown,
        marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4,
    },

    // Shared
    subjectBadge: {
        alignSelf: 'flex-start',
        backgroundColor: C.cream,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: C.creamBorder,
    },
    subjectText: {
        color: C.primaryDeep, fontSize: 10,
        fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase',
    },

    // Note view
    noteContent: { padding: 16, paddingBottom: 40 },
    noteHeaderBlock: { marginBottom: 16 },
    noteMainTitle: {
        fontSize: 22, fontWeight: '900', color: C.text,
        marginTop: 10, marginBottom: 8, lineHeight: 28,
    },
    refRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    refText: { fontSize: 13, fontWeight: '700', color: C.textMuted },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 12, fontWeight: '700', color: C.textMuted },

    speechPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: C.primaryDeep,
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
    },
    speechPlayBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.primary,
    },
    speechTrackWrap: { flex: 1 },
    speechTrack: {
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    speechProgress: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: C.white,
    },
    speechMeta: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 11,
        fontWeight: '800',
        marginTop: 7,
    },
    speedBtn: {
        minWidth: 52,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    speedText: { color: C.white, fontSize: 12, fontWeight: '900' },

    noteCard: {
        backgroundColor: C.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.primaryBorder,
        marginBottom: 16,
    },

    quizBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.primaryDeep,
        borderRadius: 16, padding: 14, marginTop: 4,
    },
    quizBtnIcon: {
        width: 42, height: 42, borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
    },
    quizBtnTitle: { color: C.white, fontSize: 15, fontWeight: '900' },
    quizBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', marginTop: 2 },
});
