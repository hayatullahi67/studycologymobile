// import React, { useEffect, useRef, useState } from 'react';
// import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
// import { WebView } from 'react-native-webview';
// import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
// import { RootStackParamList, AppNavigationProp } from '../navigation/types';
// import { Screen, Header } from '../components/Layout';
// import { COLORS } from '../theme/colors';
// import { Ionicons } from '@expo/vector-icons';
// import * as localDB from '../services/localDatabase';
// import { useAppStore } from '../store/useAppStore';

// type NoteDetailRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;

// export function NoteDetailScreen() {
//     const route = useRoute<NoteDetailRouteProp>();
//     const navigation = useNavigation<AppNavigationProp>();
//     const { noteId } = route.params;
//     const { theme, fontSize } = useAppStore();
//     const isDark = theme === 'dark';
//     const { height: windowHeight } = useWindowDimensions();

//     const bodySize = fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : fontSize === 'large' ? 19 : 22;
//     const textColor = isDark ? '#3E2723' : '#3E2723';
//     const accentColor = isDark ? '#FFB74D' : '#E65100';
//     const blockquoteBg = isDark ? 'rgba(255, 183, 77, 0.1)' : 'rgba(230, 81, 0, 0.05)';
//     const blockquoteText = isDark ? '#CBD5E1' : '#5D4037';

//     const [note, setNote] = useState<any>(null);
//     const [score, setScore] = useState<{ score: number, total: number } | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [readingProgress, setReadingProgress] = useState(0);
//     const webViewHeight = Math.min(520, windowHeight * 0.55);
//     const lastSavedProgressRef = useRef(0);
//     const pendingProgressRef = useRef(0);

//     useEffect(() => {
//         loadNote();
//     }, [noteId]);

//     const loadNote = async () => {
//         try {
//             setLoading(true);
//             const [noteData, scoreData] = await Promise.all([
//                 localDB.getNoteByIdLocal(noteId),
//                 localDB.getNoteHighestScore(noteId)
//             ]);
//             const progressData = await localDB.getNoteReadProgress(noteId);
//             setNote(noteData);
//             setScore(scoreData);
//             const initialProgress = Number(progressData?.progress || 0);
//             setReadingProgress(initialProgress);
//             lastSavedProgressRef.current = initialProgress;
//         } catch (error) {
//             console.error('Error loading note:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const persistProgress = async (progress: number) => {
//         const rounded = Math.max(0, Math.min(100, Math.round(progress)));
//         if (rounded <= lastSavedProgressRef.current) return;
//         try {
//             await localDB.saveNoteReadProgress(noteId, rounded);
//             lastSavedProgressRef.current = rounded;
//         } catch (error) {
//             console.error('Error saving note progress:', error);
//         }
//     };

//     const updateProgressState = (progress: number) => {
//         const safeProgress = Math.max(0, Math.min(100, progress));
//         setReadingProgress(safeProgress);
//         pendingProgressRef.current = safeProgress;

//         // Save in meaningful steps to avoid excessive writes.
//         if (Math.round(safeProgress) - lastSavedProgressRef.current >= 5 || Math.round(safeProgress) >= 100) {
//             persistProgress(safeProgress);
//         }
//     };

//     const handleScroll = (event: any) => {
//         const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
//         const totalHeight = contentSize.height;
//         const viewportHeight = layoutMeasurement.height;
//         const currentPos = contentOffset.y;

//         const progress = totalHeight <= viewportHeight + 50 ? 100 : (currentPos / (totalHeight - viewportHeight)) * 100;
//         updateProgressState(progress);
//     };

//     useEffect(() => {
//         return () => {
//             if (pendingProgressRef.current > 0) {
//                 persistProgress(pendingProgressRef.current);
//             }
//         };
//     }, []);

//     if (loading) {
//         return (
//             <Screen style={[styles.center, { backgroundColor: '#101920' }]}>
//                 <ActivityIndicator color={COLORS.primary[600]} size="large" />
//             </Screen>
//         );
//     }

//     if (!note) {
//         return (
//             <Screen style={[styles.center, { backgroundColor: '#101920' }]}>
//                 <Text style={[styles.errorText, { color: '#94A3B8' }]}>Note not found</Text>
//             </Screen>
//         );
//     }

//     return (
//         <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
//             <Header
//                 title="Study Note"
//                 onBack={async () => {
//                     await persistProgress(readingProgress);
//                     navigation.goBack();
//                 }}
//                 style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
//                 titleStyle={{ color: '#000000' }}
//                 iconColor="#000000"
//             />

//             <ScrollView
//                 contentContainerStyle={styles.content}
//                 showsVerticalScrollIndicator={false}
//                 onScroll={handleScroll}
//                 scrollEventThrottle={32}
//             >
//                 <View style={styles.noteHeader}>
//                     <View style={styles.badgeRow}>
//                         <View style={styles.subjectBadge}>
//                             <Text style={styles.subjectText}>{note.subject || 'GENERAL'}</Text>
//                         </View>
//                         {note.topic && (
//                             <Text style={[styles.topicLabel, { color: '#94A3B8' }]}>{note.topic}</Text>
//                         )}
//                     </View>
//                     <Text style={styles.title}>{note.title}</Text>
//                     <View style={styles.dateRow}>
//                         <Ionicons name="calendar-outline" size={14} color="#475569" />
//                         <Text style={styles.dateText}>
//                             {new Date(note.created_at).toLocaleDateString(undefined, {
//                                 day: 'numeric',
//                                 month: 'short',
//                                 year: 'numeric'
//                             })}
//                         </Text>
//                     </View>
//                     <View style={styles.progressWrap}>
//                         <View style={styles.progressMetaRow}>
//                             <Text style={styles.progressLabel}>Reading Progress</Text>
//                             <Text style={styles.progressPercent}>{Math.round(readingProgress)}%</Text>
//                         </View>
//                         <View style={styles.progressTrack}>
//                             <View style={[styles.progressFill, { width: `${Math.max(3, Math.round(readingProgress))}%` }]} />
//                         </View>
//                     </View>
//                 </View>

//                  <View style={[styles.bodyContainer, { backgroundColor: '#FFFFFF' }]}>
//                     <WebView
//                         originWhitelist={['*']}
//                         source={{
//                             html: `
//                                 <html>
//                                 <head>
//                                     <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
//                                     <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
//                                     <style>
//                                         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//                                         body {
//                                             font-family: 'Inter', -apple-system, system-ui;
//                                             font-size: ${bodySize}px;
//                                             line-height: 1.7;
//                             color: ${textColor};
//                             min-height: auto;
//                             overflow: visible;
//                             margin: 0;
//                             padding: 0;
//                         }
//                         h1, h2, h3, h4 { color: ${accentColor}; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 800; }
//                         .ql-editor { padding: 0 !important; }
//                         .ql-editor p { margin-bottom: 1.2em; }
//                         .ql-editor blockquote {
//                             border-left: 4px solid ${accentColor};
//                             padding-left: 16px;
//                             background-color: ${blockquoteBg};
//                             color: ${blockquoteText};
//                             font-style: italic;
//                         }
//                         img { max-width: 100%; height: auto; border-radius: 8px; }
//                     </style>
//                 </head>
//                 <body class="ql-snow">
//                     <div class="ql-editor" id="content">
//                         ${note.content}
//                     </div>
//                     <script>
//                         function sendHeight() {
//                             const height = document.getElementById('content').offsetHeight;
//                             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height }));
//                         }
//                         window.addEventListener('load', function() {
//                             setTimeout(sendHeight, 300);
//                         });
//                         window.addEventListener('resize', sendHeight);
//                     </script>
//                 </body>
//                 </html>
//             `
//         }}
//         style={{ height: webViewHeight, backgroundColor: 'transparent' }}
//         scrollEnabled={true}
//         nestedScrollEnabled={true}
//         javaScriptEnabled={true}
//         domStorageEnabled={true}
//     />
// </View>


//                 {note.quiz && note.quiz.length > 0 && (
//                     <TouchableOpacity
//                         activeOpacity={0.8}
//                         style={[styles.quizBtn, { backgroundColor: '#3E2723' }]}
//                         onPress={() => navigation.navigate('NoteQuiz', { noteId })}
//                     >
//                         <View style={styles.quizBtnIcon}>
//                             <Ionicons name="school" size={24} color="#FFF" />
//                         </View>
//                         <View>
//                             <Text style={styles.quizBtnTitle}>Test Your Knowledge</Text>
//                             <Text style={styles.quizBtnSubtitle}>
//                                 {score ? `Best: ${score.score}/${score.total}` : `Quick ${note.quiz.length} question quiz`}
//                             </Text>
//                         </View>
//                         <Ionicons name="chevron-forward" size={20} color="#FFF" style={{ marginLeft: 'auto' }} />
//                     </TouchableOpacity>
//                 )}
//             </ScrollView>
//         </Screen>
//     );
// }

// const styles = StyleSheet.create({
//     bg: { flex: 1 },
//     center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//     content: { padding: 16, paddingBottom: 40 },
//     noteHeader: { marginBottom: 20 },
//     badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
//     subjectBadge: { backgroundColor: '#EFEBE9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#D7CCC8' },
//     subjectText: { color: '#3E2723', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
//     topicLabel: { fontSize: 12, fontWeight: '700', color: '#5D4037' },
//     title: { fontSize: 24, fontWeight: '900', lineHeight: 32, marginBottom: 10, color: '#1E293B' },
//     dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//     dateText: { fontSize: 12, fontWeight: '700', color: '#475569' },
//     progressWrap: { marginTop: 12 },
//     progressMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
//     progressLabel: { fontSize: 11, fontWeight: '800', color: '#5D4037', textTransform: 'uppercase', letterSpacing: 0.5 },
//     progressPercent: { fontSize: 12, fontWeight: '900', color: '#864b03' },
//     progressTrack: { height: 8, borderRadius: 6, backgroundColor: '#EFEBE9', overflow: 'hidden' },
//     progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#864b03' },
//     bodyContainer: { padding: 16, borderRadius: 20, marginBottom: 20 },
//     errorText: { fontWeight: '800' },
//     quizBtn: { marginTop: 20, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
//     quizBtnIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
//     quizBtnTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
//     quizBtnSubtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, fontWeight: '700' }
// });





import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList, AppNavigationProp } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../services/localDatabase';
import { useAppStore } from '../store/useAppStore';

type NoteDetailRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;

export function NoteDetailScreen() {
    const route = useRoute<NoteDetailRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { noteId } = route.params;
    const { theme, fontSize } = useAppStore();
    const isDark = theme === 'dark';
    const { height: windowHeight } = useWindowDimensions();

    const bodySize = fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : fontSize === 'large' ? 19 : 22;
    const textColor = isDark ? '#3E2723' : '#3E2723';
    const accentColor = isDark ? '#FFB74D' : '#E65100';
    const blockquoteBg = isDark ? 'rgba(255, 183, 77, 0.1)' : 'rgba(230, 81, 0, 0.05)';
    const blockquoteText = isDark ? '#CBD5E1' : '#5D4037';

    const [note, setNote] = useState<any>(null);
    const [score, setScore] = useState<{ score: number, total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [webViewHeight, setWebViewHeight] = useState(600);

    useEffect(() => {
        loadNote();
    }, [noteId]);

    const loadNote = async () => {
        try {
            setLoading(true);
            const [noteData, scoreData] = await Promise.all([
                localDB.getNoteByIdLocal(noteId),
                localDB.getNoteHighestScore(noteId)
            ]);
            setNote(noteData);
            setScore(scoreData);
        } catch (error) {
            console.error('Error loading note:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Screen style={[styles.center, { backgroundColor: '#101920' }]}>
                <ActivityIndicator color={COLORS.primary[600]} size="large" />
            </Screen>
        );
    }

    if (!note) {
        return (
            <Screen style={[styles.center, { backgroundColor: '#101920' }]}>
                <Text style={[styles.errorText, { color: '#94A3B8' }]}>Note not found</Text>
            </Screen>
        );
    }

    return (
        <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="Study Note"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            {/* Outer ScrollView — no longer tracks progress */}
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.noteHeader}>
                    <View style={styles.badgeRow}>
                        <View style={styles.subjectBadge}>
                            <Text style={styles.subjectText}>{note.subject || 'GENERAL'}</Text>
                        </View>
                        {note.topic && (
                            <Text style={[styles.topicLabel, { color: '#94A3B8' }]}>{note.topic}</Text>
                        )}
                    </View>
                    <Text style={styles.title}>{note.title}</Text>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#475569" />
                        <Text style={styles.dateText}>
                            {new Date(note.created_at).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                </View>

                <View style={[styles.richContentContainer, { backgroundColor: 'rgba(0,0,0,0.01)' }]}>
                    <WebView
                        originWhitelist={['*']}
                        source={{
                            html: `
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
                                    <style>
                                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                                        body {
                                            font-family: 'Inter', -apple-system, system-ui;
                                            font-size: ${bodySize}px;
                                            line-height: 1.7;
                                            color: #3E2723;
                                            background-color: transparent;
                                            margin: 0;
                                            padding: 4px;
                                        }
                                        h1, h2, h3, h4 { color: #E65100; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 800; }
                                        .ql-editor { padding: 0 !important; }
                                        .ql-editor p { margin-bottom: 1.2em; }
                                        .ql-editor blockquote {
                                            border-left: 4px solid #E65100;
                                            padding-left: 16px;
                                            color: #5D4037;
                                            font-style: italic;
                                        }
                                        img { max-width: 100%; height: auto; border-radius: 8px; }
                                    </style>
                                </head>
                                <body class="ql-snow">
                                    <div class="ql-editor" id="content">
                                        ${note.content}
                                    </div>
                                    <script>
                                        // Communicate height to parent to avoid nested scroll
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
                            if (newHeight > 0) setWebViewHeight(newHeight);
                        }}
                        style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                        javaScriptEnabled={true}
                        // domStorageEnabled={true
                    />
                </View>

                {note.quiz && note.quiz.length > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.quizBtn, { backgroundColor: '#3E2723' }]}
                        onPress={() => navigation.navigate('NoteQuiz', { noteId })}
                    >
                        <View style={styles.quizBtnIcon}>
                            <Ionicons name="school" size={24} color="#FFF" />
                        </View>
                        <View>
                            <Text style={styles.quizBtnTitle}>Test Your Knowledge</Text>
                            <Text style={styles.quizBtnSubtitle}>
                                {score ? `Best: ${score.score}/${score.total}` : `Quick ${note.quiz.length} question quiz`}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#FFF" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingBottom: 40 },
    noteHeader: { marginBottom: 20 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    subjectBadge: { backgroundColor: '#EFEBE9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#D7CCC8' },
    subjectText: { color: '#3E2723', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
    topicLabel: { fontSize: 12, fontWeight: '700', color: '#5D4037' },
    title: { fontSize: 24, fontWeight: '900', lineHeight: 32, marginBottom: 10, color: '#1E293B' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 12, fontWeight: '700', color: '#475569' },
    richContentContainer: { flex: 1, padding: 16, borderRadius: 20, marginBottom: 20 },
    errorText: { fontWeight: '800' },
    quizBtn: { marginTop: 20, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    quizBtnIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
    quizBtnTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    quizBtnSubtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, fontWeight: '700' }
});