import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList, AppNavigationProp } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../services/localDatabase';
import { useAppStore } from '../store/useAppStore';

type CourseDetailRouteProp = RouteProp<RootStackParamList, 'CourseDetail'>;

export function CourseDetailScreen() {
    const route = useRoute<CourseDetailRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { courseId } = route.params;
    const { theme, fontSize } = useAppStore();
    const isDark = theme === 'dark';

    const bodySize = fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : fontSize === 'large' ? 19 : 22;

    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [webViewHeight, setWebViewHeight] = useState(400);

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const loadCourse = async () => {
        try {
            setLoading(true);
            const data = await localDB.getCareerCourseById(courseId);
            setCourse(data);
        } catch (error) {
            console.error('Error loading course:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Screen style={[styles.center, { backgroundColor: '#050505' }]}>
                <ActivityIndicator color="#E65100" size="large" />
            </Screen>
        );
    }

    if (!course) {
        return (
            <Screen style={[styles.center, { backgroundColor: '#050505' }]}>
                <Text style={[styles.errorText, { color: '#94A3B8' }]}>Course details not found</Text>
            </Screen>
        );
    }

    return (
        <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="Guidance"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.courseHeader}>
                    <Text style={styles.title}>{course.name}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.deptBadge}>
                            <Text style={styles.deptText}>UNIVERSITY GUIDANCE</Text>
                        </View>
                        <View style={styles.dateRow}>
                            <Ionicons name="time-outline" size={14} color="#64748B" />
                            <Text style={styles.dateText}>
                                {course.created_at ? new Date(course.created_at).toLocaleDateString() : 'Updated recently'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bodyContainer}>
                    <WebView
                        originWhitelist={['*']}
                        source={{
                            html: `
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                    <style>
                                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                                        body {
                                            font-family: 'Inter', -apple-system, system-ui;
                                            font-size: ${bodySize}px;
                                            line-height: 1.8;
                                            color: #334155; /* Forced Dark Grey/Blue for readability */
                                            background-color: transparent;
                                            margin: 0;
                                            padding: 4px;
                                        }
                                        h1, h2, h3, h4 { color: #864b03; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 800; letter-spacing: -0.02em; }
                                        p { margin-bottom: 1.25em; }
                                        blockquote {
                                            border-left: 4px solid #864b03;
                                            padding: 12px 16px;
                                            background-color: rgba(134, 75, 3, 0.05);
                                            border-radius: 4px 12px 12px 4px;
                                            color: #5D4037;
                                            font-style: italic;
                                            margin: 20px 0;
                                        }
                                        img { max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                                        ul, ol { padding-left: 20px; }
                                        li { margin-bottom: 0.8em; }
                                        hr { border: none; border-top: 1px solid #EFEBE9; margin: 24px 0; }
                                    </style>
                                </head>
                                <body>
                                    <div id="content">
                                        ${course.content}
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
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 24, paddingBottom: 60 },
    courseHeader: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '900', color: '#3E2723', lineHeight: 40, marginBottom: 16, letterSpacing: -0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    deptBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2' },
    deptText: { color: '#E65100', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 12, color: '#8D6E63', fontWeight: '600' },
    bodyContainer: { padding: 2, borderRadius: 20 },
    errorText: { fontWeight: '800' }
});
