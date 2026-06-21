import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList, AppNavigationProp } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../services/localDatabase';
import * as supabaseDB from '../services/supabaseDatabase';
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
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

type JambTextContentRouteProp = RouteProp<RootStackParamList, 'JambTextContent'>;
type SpeechStatus = 'idle' | 'playing' | 'paused';

const SPEECH_RATES = [0.75, 1, 1.5, 2];

export function JambTextContentScreen() {
    const route = useRoute<JambTextContentRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { textId } = route.params;
    const { fontSize, jambTextQuizResults } = useAppStore();

    const bodySize = fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : fontSize === 'large' ? 19 : 22;

    const [text, setText] = useState<any>(null);
    const [bookSubheadings, setBookSubheadings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<'list' | 'note'>('list');
    const [activeSubheading, setActiveSubheading] = useState<any>(null);
    const [webViewHeight, setWebViewHeight] = useState(260);
    const [score, setScore] = useState<{ score: number; total: number } | null>(null);

    // ── Admin audio state ─────────────────────────────────────────────────────
    const [audioLoading, setAudioLoading] = useState<string | null>(null);
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    const [playbackStatus, setPlaybackStatus] = useState({ position: 0, duration: 1, isPlaying: false });
    const soundRef = useRef<Audio.Sound | null>(null);

    // ── Speech state ──────────────────────────────────────────────────────────
    const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
    const [speechProgress, setSpeechProgress] = useState(0);
    const [speechRate, setSpeechRate] = useState(0.75);
    const speechTextRef = useRef('');
    const speechCharIndexRef = useRef(0);
    const speechStartIndexRef = useRef(0);
    const isPausingRef = useRef(false);

    useEffect(() => {
        loadBookData();
        return () => {
            if (soundRef.current) soundRef.current.unloadAsync();
            Speech.stop();
            resetSpeechState();
        };
    }, [textId]);

    useEffect(() => {
        return () => {
            Speech.stop();
            resetSpeechState();
        };
    }, [activeSubheading]);

    // ── Speech helpers ────────────────────────────────────────────────────────

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

    // ── Pause admin audio without unloading (position preserved) ─────────────
    const pauseAudioPlayer = async () => {
        if (soundRef.current) {
            try {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded && status.isPlaying) {
                    await soundRef.current.pauseAsync();
                }
            } catch (_) {}
        }
    };

    // ── Pause speech without resetting progress ───────────────────────────────
    const pauseSpeechPlayer = async () => {
        if (speechStatus === 'playing') {
            isPausingRef.current = true;
            setSpeechStatus('paused');
            await Speech.stop();
        }
    };

    // ── Admin audio playback ──────────────────────────────────────────────────

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPlaybackStatus({
                position: status.positionMillis,
                duration: status.durationMillis || 1,
                isPlaying: status.isPlaying,
            });
            if (status.didJustFinish) setActiveAudioId(null);
        }
    };

    const playAudio = async (url: string, id: string) => {
        try {
            if (!url || url === 'null' || !url.trim() || url === 'undefined') return;

            // Pause speech first if it's playing
            if (speechStatus === 'playing') {
                await pauseSpeechPlayer();
            }

            // Toggle: tap same audio that's already loaded
            if (activeAudioId === id && soundRef.current) {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                    status.isPlaying
                        ? await soundRef.current.pauseAsync()
                        : await soundRef.current.playAsync();
                }
                return;
            }

            // New audio: unload previous and load fresh
            if (soundRef.current) await soundRef.current.unloadAsync();

            setAudioLoading(id);

            let audioUri = url.trim();
            if (!audioUri.startsWith('http')) {
                const { data } = supabaseDB.supabase.storage.from('voice-notes').getPublicUrl(audioUri);
                if (data?.publicUrl) audioUri = data.publicUrl;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUri },
                { shouldPlay: true, progressUpdateIntervalMillis: 100 },
                onPlaybackStatusUpdate,
            );
            soundRef.current = newSound;
            setActiveAudioId(id);
        } catch (err) {
            Alert.alert('Audio Error', 'The voice note could not be played. Please check your connection.');
        } finally {
            setAudioLoading(null);
        }
    };

    // ── Speech playback ───────────────────────────────────────────────────────

    const speakFromPosition = async (fullText: string, startIndex = 0, rate = speechRate) => {
        const trimmedText = fullText.trim();
        if (!trimmedText) {
            resetSpeechState();
            return;
        }

        // Pause admin audio first if it's playing
        await pauseAudioPlayer();

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
        speakFromPosition(speechTextRef.current || getSpeechText(activeSubheading), speechCharIndexRef.current, speechRate);
    };

    const toggleSpeech = () => {
        if (speechStatus === 'playing') {
            pauseSpeech();
        } else if (speechStatus === 'paused') {
            resumeSpeech();
        } else {
            speakNote(activeSubheading);
        }
    };

    const cycleSpeechRate = () => {
        const nextRate = SPEECH_RATES[(SPEECH_RATES.indexOf(speechRate) + 1) % SPEECH_RATES.length];
        setSpeechRate(nextRate);
        if (speechStatus === 'playing') {
            speakFromPosition(speechTextRef.current || getSpeechText(activeSubheading), speechCharIndexRef.current, nextRate);
        }
    };

    // ── Data loading ──────────────────────────────────────────────────────────

    const loadBookData = async () => {
        try {
            setLoading(true);
            const database = await localDB.initLocalDatabase();

            const selectedText: any = await database.getFirstAsync('SELECT * FROM jamb_texts WHERE id = ?', textId);
            if (!selectedText) {
                setLoading(false);
                return;
            }

            const rows: any[] = await database.getAllAsync(
                'SELECT * FROM jamb_texts WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) ORDER BY created_at ASC',
                [selectedText.title]
            );

            const sortedSubheadings = rows
                .filter(Boolean)
                .sort((a: any, b: any) => {
                    if (a.is_default && !b.is_default) return -1;
                    if (!a.is_default && b.is_default) return 1;
                    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                })
                .map((item: any) => ({
                    ...item,
                    quiz: item.quiz ? (typeof item.quiz === 'string' ? JSON.parse(item.quiz) : item.quiz) : []
                }));

            setText(selectedText);
            setBookSubheadings(sortedSubheadings);

            const firstRow = sortedSubheadings[0] || selectedText;
            if (sortedSubheadings.length === 1 && (!firstRow.subheading || firstRow.subheading.trim() === '')) {
                setActiveSubheading(firstRow);
                setViewMode('note');
                loadQuizScore(firstRow.id);
            } else {
                setViewMode('list');
            }
        } catch (err) {
            console.error('Error loading JAMB text:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadQuizScore = async (idToQuery: string) => {
        try {
            const scoreData = await localDB.getJambTextHighestScore(idToQuery);
            setScore(scoreData);
        } catch (err) {
            console.error('Error loading quiz score:', err);
            setScore(null);
        }
    };

    const openSubheading = async (item: any) => {
        setActiveSubheading(item);
        setWebViewHeight(260);
        setViewMode('note');
        await loadQuizScore(item.id);
    };

    const goBack = () => {
        if (viewMode === 'note') {
            stopSpeaking();
            if (bookSubheadings.length === 1 && (!bookSubheadings[0].subheading || bookSubheadings[0].subheading.trim() === '')) {
                navigation.goBack();
            } else {
                setViewMode('list');
                setActiveSubheading(null);
                setScore(null);
            }
        } else {
            navigation.goBack();
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <Screen style={[styles.center, { backgroundColor: C.bgDark }]}>
                <ActivityIndicator color={C.primary} size="large" />
            </Screen>
        );
    }

    if (!text) {
        return (
            <Screen style={[styles.center, { backgroundColor: C.bg }]}>
                <Text style={{ color: C.textMuted, fontSize: 16, fontWeight: '700' }}>Book not found</Text>
            </Screen>
        );
    }

    // ── Subheadings List View ─────────────────────────────────────────────────
    if (viewMode === 'list') {
        const totalSubheadings = bookSubheadings.length;

        return (
            <Screen scrollable={false} style={{ backgroundColor: C.bg, flex: 1 }}>
                <Header
                    title="Novel Info"
                    onBack={goBack}
                    style={{ backgroundColor: C.bg, borderBottomColor: C.bg }}
                    titleStyle={{ color: C.text }}
                    iconColor={C.text}
                />

                <FlatList
                    data={bookSubheadings}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <View style={styles.heroSection}>
                                {text.thumbnail_url ? (
                                    <View style={styles.coverWrapper}>
                                        <Image source={{ uri: text.thumbnail_url }} style={styles.bookCover} resizeMode="cover" />
                                    </View>
                                ) : (
                                    <View style={[styles.coverWrapper, styles.placeholderCover]}>
                                        <Ionicons name="book" size={50} color="rgba(230, 81, 0, 0.2)" />
                                    </View>
                                )}
                                <View style={styles.heroText}>
                                    <View style={styles.subjectBadge}>
                                        <Text style={styles.subjectText}>
                                            {text.type === 'literature' ? 'LITERATURE' : 'ENGLISH'}
                                        </Text>
                                    </View>
                                    <Text style={styles.listTitle} numberOfLines={3}>{text.title}</Text>
                                    {text.author && <Text style={styles.author}>by {text.author}</Text>}
                                    <Text style={styles.countLabel}>
                                        {totalSubheadings} {totalSubheadings === 1 ? 'Section' : 'Sections'} Available
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <Text style={styles.chaptersTitle}>Book Outline</Text>
                        </View>
                    }
                    renderItem={({ item, index }) => (
                        <SubheadingRow
                            item={item}
                            index={index}
                            onPress={() => openSubheading(item)}
                        />
                    )}
                />
            </Screen>
        );
    }

    // ── Reading Note View ─────────────────────────────────────────────────────
    if (!activeSubheading) return null;

    const subheadingSubtitle = activeSubheading.subheading || activeSubheading.title || 'Chapter Content';
    const noteBody = activeSubheading.content || '';
    const quiz = Array.isArray(activeSubheading.quiz) ? activeSubheading.quiz : [];

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
                font-size: ${bodySize}px;
                line-height: 1.6;
                color: #3E2723;
                background-color: transparent;
                width: 100%;
                height: auto;
                overflow: hidden;
            }
            h1, h2, h3, h4 {
                color: #E65100;
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
            .ql-editor p { margin: 0 0 0.85em; line-height: 1.6; }
            .ql-editor p:last-child { margin-bottom: 0; }
            .ql-editor ul, .ql-editor ol { margin: 0 0 0.8em; padding-left: 18px; }
            .ql-editor li { margin-bottom: 0.35em; }
            .ql-editor blockquote {
                border-left: 4px solid #E65100;
                padding-left: 16px;
                color: #5D4037;
                font-style: italic;
                margin-bottom: 0.8em;
            }
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
                title={subheadingSubtitle}
                onBack={goBack}
                style={{ backgroundColor: C.bg, borderBottomColor: C.bg }}
                titleStyle={{ color: C.text }}
                iconColor={C.text}
            />

            <ScrollView
                contentContainerStyle={styles.noteContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Book & Section Details */}
                <View style={styles.noteHeaderBlock}>
                    <View style={styles.subjectBadge}>
                        <Text style={styles.subjectText}>
                            {text.type === 'literature' ? 'LITERATURE' : 'ENGLISH'}
                        </Text>
                    </View>

                    <Text style={styles.noteMainTitle}>{subheadingSubtitle}</Text>
                    <Text style={styles.noteBookTitle}>From the novel: "{text.title}"</Text>

                    {/* <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
                        <Text style={styles.dateText}>
                            {new Date(activeSubheading.created_at).toLocaleDateString(undefined, {
                                day: 'numeric', month: 'short', year: 'numeric',
                            })}
                        </Text>
                    </View> */}
                </View>

                {/* Audio section: Speech + Admin voice note */}
                <View style={styles.audioSection}>
                    <SpeechPlayer
                        status={speechStatus}
                        progress={speechProgress}
                        rate={speechRate}
                        onToggle={toggleSpeech}
                        onCycleRate={cycleSpeechRate}
                    />

                    {activeSubheading?.audio_url && (
                        <View style={[
                            styles.detailAudioContainer,
                            { backgroundColor: C.primaryLight, borderColor: C.primaryBorder, opacity: audioLoading === activeSubheading?.id ? 0.7 : 1 }
                        ]}>
                            <TouchableOpacity
                                style={[styles.detailPlayBtn, { backgroundColor: C.brown }]}
                                onPress={() => playAudio(activeSubheading.audio_url, activeSubheading.id)}
                                disabled={!!audioLoading}
                            >
                                {audioLoading === activeSubheading?.id ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons
                                        name={activeAudioId === activeSubheading?.id && playbackStatus.isPlaying ? 'pause' : 'play'}
                                        size={20}
                                        color="#FFF"
                                    />
                                )}
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailAudioText}>Teacher’s Explanation </Text>
                                <View style={styles.detailProgressBarBg}>
                                    <View style={[
                                        styles.detailProgressBarFill,
                                        { width: activeAudioId === activeSubheading.id ? `${(playbackStatus.position / playbackStatus.duration) * 100}%` : '0%' }
                                    ]} />
                                </View>
                                {activeAudioId === activeSubheading?.id && (
                                    <Text style={styles.detailTimeText}>
                                        {Math.floor(playbackStatus.position / 1000)}s / {Math.floor(playbackStatus.duration / 1000)}s
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* WebView content card */}
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

                {/* Quiz CTA */}
                {quiz.length > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.quizBtn}
                        onPress={() => navigation.navigate('JambTextQuiz', { textId: activeSubheading.id })}
                    >
                        <View style={styles.quizBtnIcon}>
                            <Ionicons name="school" size={22} color={C.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.quizBtnTitle}>Test Your Knowledge</Text>
                            <Text style={styles.quizBtnSub}>
                                {score
                                    ? `Best Score: ${score.score}/${score.total}`
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

// ─── Speech Player ────────────────────────────────────────────────────────────
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
                    {status === 'paused' ? 'Paused' : isPlaying ? 'Reading' : 'Ai note reader'} - {progressPercent}%
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

// ─── Subheading Row ───────────────────────────────────────────────────────────
function SubheadingRow({ item, index, onPress }: { item: any; index: number; onPress: () => void }) {
    const label = item.subheading || item.title || `Section ${index + 1}`;
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

    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    listHeader: { paddingTop: 8, paddingBottom: 12 },
    heroSection: { flexDirection: 'row', gap: 16 },
    coverWrapper: {
        width: 100,
        aspectRatio: 0.7,
        borderRadius: 12,
        backgroundColor: '#EFEBE9',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.creamBorder,
        elevation: 4,
    },
    bookCover: { width: '100%', height: '100%' },
    placeholderCover: { alignItems: 'center', justifyContent: 'center' },
    heroText: { flex: 1, justifyContent: 'center' },
    author: { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 8 },
    listTitle: {
        fontSize: 18, fontWeight: '900', color: C.text,
        marginBottom: 2, lineHeight: 24,
    },
    countLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted },
    divider: { height: 1, backgroundColor: C.divider, marginVertical: 20 },
    chaptersTitle: { fontSize: 14, fontWeight: '900', color: C.primaryDeep, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },

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

    subjectBadge: {
        alignSelf: 'flex-start',
        backgroundColor: C.cream,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: C.creamBorder,
        marginBottom: 8,
    },
    subjectText: {
        color: C.primaryDeep, fontSize: 10,
        fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase',
    },

    noteContent: { padding: 16, paddingBottom: 40 },
    noteHeaderBlock: { marginBottom: 16 },
    noteMainTitle: {
        fontSize: 22, fontWeight: '900', color: C.text,
        marginTop: 10, marginBottom: 4, lineHeight: 28,
    },
    noteBookTitle: { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 12 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 12, fontWeight: '700', color: C.textMuted },

    audioSection: { gap: 10, marginBottom: 20 },

    speechPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: C.primaryDeep,
        borderRadius: 16,
        padding: 12,
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

    detailAudioContainer: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 12, borderRadius: 16, borderWidth: 1,
    },
    detailPlayBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    detailAudioText: { fontSize: 12, fontWeight: '800', color: C.brown, marginBottom: 4 },
    detailProgressBarBg: { height: 4, backgroundColor: C.creamBorder, borderRadius: 2, overflow: 'hidden' },
    detailProgressBarFill: { height: '100%', backgroundColor: C.brown },
    detailTimeText: { fontSize: 9, fontWeight: '700', color: C.brown, marginTop: 4, textAlign: 'right' },

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