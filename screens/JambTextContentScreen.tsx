import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../services/localDatabase';
import { Screen, Header } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';

export function JambTextContentScreen() {
    const navigation = useNavigation<any>();
    const { theme, fontSize, jambTextQuizResults } = useAppStore();
    const route = useRoute<RouteProp<RootStackParamList, 'JambTextContent'>>();
    const { textId } = route.params;
    const [text, setText] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [webViewHeight, setWebViewHeight] = useState(600);

    const score = React.useMemo(() => {
        const results = jambTextQuizResults.filter(r => r.text_id === textId);
        if (results.length === 0) return null;
        const maxScore = Math.max(...results.map(r => r.score));
        const total = results[0].total;
        return { score: maxScore, total };
    }, [jambTextQuizResults, textId]);

    const isDark = theme === 'dark';
    const bodySize = fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : fontSize === 'large' ? 19 : 22;

    useEffect(() => {
        loadContent();
    }, [textId]);

    const loadContent = async () => {
        try {
            const database = await localDB.initLocalDatabase();
            const data: any = await database.getFirstAsync('SELECT * FROM jamb_texts WHERE id = ?', textId);
            setText(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Screen style={[styles.center, isDark ? { backgroundColor: '#0b141a' } : null]}>
                <ActivityIndicator size="large" color="#E65100" />
            </Screen>
        );
    }

    if (!text) {
        return (
            <Screen style={[styles.center, isDark ? { backgroundColor: '#0b141a' } : null]}>
                <Text style={styles.errorText}>Content not found</Text>
            </Screen>
        );
    }

    return (
        <Screen style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="Back"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroSection}>
                    {text.thumbnail_url ? (
                        <View style={styles.coverWrapper}>
                            <Image source={{ uri: text.thumbnail_url }} style={styles.bookCover} resizeMode="cover" />
                        </View>
                    ) : (
                        <View style={[styles.coverWrapper, styles.placeholderCover]}>
                            <Ionicons name="book" size={60} color="rgba(230, 81, 0, 0.2)" />
                        </View>
                    )}
                    <View style={styles.heroText}>
                        <Text style={[styles.title, isDark && { color: '#F1F5F9' }]}>{text.title}</Text>
                        {text.author && <Text style={styles.author}>by {text.author}</Text>}
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{text.type === 'literature' ? 'LITERATURE' : 'ENGLISH'}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.divider, isDark && { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

                <View style={[styles.richContentContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }]}>
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
                                        h1, h2, h3, h4 { 
                                            color: #E65100; 
                                            margin-top: 1.5em; 
                                            margin-bottom: 0.5em;
                                            font-weight: 800;
                                        }
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
                                        ${text.content}
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
                            if (newHeight > 0) setWebViewHeight(newHeight + 40);
                        }}
                        style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                        javaScriptEnabled={true}
                        // domStorageEnabled={true
                    />
                </View>
            </ScrollView>

            {text.quiz && text.quiz.length > 0 && (
                <View style={[styles.footer, { backgroundColor: '#FFF8F6', borderTopColor: '#E2E8F0' }]}>
                    <TouchableOpacity
                        style={[styles.quizBtn, { backgroundColor: '#3E2723' }]}
                        onPress={() => navigation.navigate('JambTextQuiz', { textId })}
                    >
                        <View style={styles.quizBtnContent}>
                            <View style={styles.quizIconContainer}>
                                <Ionicons name="school" size={24} color="#FFF" />
                            </View>
                            <View>
                                <Text style={styles.quizBtnText}>Test Your Knowledge</Text>
                                <Text style={styles.quizBtnSubtext}>
                                    {score ? `Best Score: ${score.score}/${score.total}` : `${text.quiz.length} Questions Available`}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 6 },
    author: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 12 },
    heroSection: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    coverWrapper: {
        width: 100,
        aspectRatio: 0.7,
        borderRadius: 12,
        backgroundColor: '#EFEBE9',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        elevation: 4
    },
    bookCover: { width: '100%', height: '100%' },
    placeholderCover: { alignItems: 'center', justifyContent: 'center' },
    heroText: { flex: 1, justifyContent: 'center' },
    typeBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(230, 81, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    typeBadgeText: { color: '#E65100', fontSize: 10, fontWeight: '900' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 24, marginHorizontal: -16 },
    richContentContainer: { flex: 1, padding: 16, borderRadius: 20, marginBottom: 20 },
    errorText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
    footer: { padding: 12, paddingBottom: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    quizBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, elevation: 4, shadowColor: '#E65100', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    quizBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    quizIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
    quizBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    quizBtnSubtext: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: '700', marginTop: 1 }
});
