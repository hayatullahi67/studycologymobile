import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { COLORS, ThemeColors } from '../theme/colors';
import { Screen, Header } from '../components/Layout';
import { SubjectCard } from '../components/SubjectCard';
import { PaperListItem } from '../components/PaperListItem';
import { AdBanner } from '../components/AdBanner';
import * as localDB from '../services/localDatabase';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

const normalizeExamName = (exam: string): string => {
    const normalized = exam?.toUpperCase().trim() || '';
    if (normalized.includes('WAEC')) return 'WAEC';
    if (normalized.includes('JAMB')) return 'JAMB';
    if (normalized.includes('POST') || normalized.includes('UTME')) return 'POST UTME';
    return normalized;
};

export function PastQuestionsScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const [search, setSearch] = useState('');
    const [papers, setPapers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
    const [selectedExam, setSelectedExam] = useState('WAEC');

    useEffect(() => {
        loadPapers();
        checkDownloads();
    }, []);

    const checkDownloads = async () => {
        try {
            const dir = (FileSystem as any).documentDirectory + 'past_questions/';
            const dirInfo = await FileSystem.getInfoAsync(dir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                return;
            }
            const files = await FileSystem.readDirectoryAsync(dir);
            // Files are named by ID (e.g. "123.pdf")
            const ids = new Set(files.map(f => f.replace('.pdf', '')));
            setDownloadedIds(ids);
        } catch (e) {
            console.log('Error checking downloads:', e);
        }
    };

    const downloadPdf = async (paper: any) => {
        if (downloadingIds.has(paper.id)) return;

        try {
            setDownloadingIds(prev => new Set(prev).add(paper.id));
            const dir = (FileSystem as any).documentDirectory + 'past_questions/';
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

            const fileUri = dir + paper.id + '.pdf';
            const downloadRes = await FileSystem.downloadAsync(paper.pdfUrl, fileUri);

            if (downloadRes.status === 200) {
                setDownloadedIds(prev => new Set(prev).add(paper.id));
                // Optional: Alert.alert('Success', 'PDF Downloaded for offline use');
            } else {
                alert('Failed to download PDF');
            }
        } catch (e) {
            console.error('Download error:', e);
            alert('Could not download PDF');
        } finally {
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(paper.id);
                return next;
            });
        }
    };

    const loadPapers = async () => {
        try {
            const localPdfs = await localDB.getLocalPdfResources();
            const unifiedList = (localPdfs as any[]).map(pdf => ({
                id: pdf.id.toString(), // Ensure string ID for filename compatibility
                subject_id: pdf.subject_id,
                name: pdf.subject,
                exam_name: normalizeExamName(pdf.exam),
                exam_year: pdf.year,
                pdfUrl: pdf.file_url,
                question_count: pdf.question_count || 0
            }));
            setPapers(unifiedList);
        } catch (error) {
            console.error('Error loading PDF library:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPapers = papers.filter(p => p.exam_name === selectedExam);
    const uniqueSubjectNames = Array.from(new Set(filteredPapers.map(p => p.name)))
        .filter((name): name is string => !!name)
        .filter(name => name.toLowerCase().includes(search.toLowerCase()))
        .sort();

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: '#FFF8F6' }]}>
                <ActivityIndicator color="#864b03" size="large" />
            </View>
        );
    }

    return (
        <Screen scrollable={false} style={styles.bg}>
            <Header
                title="Past Questions"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <View style={styles.container}>
                <View style={[styles.searchBox, { backgroundColor: '#FFFFFF', borderColor: '#EFEBE9' }]}>
                    <Ionicons name="search-outline" size={18} color="#8D6E63" style={{ marginRight: 10 }} />
                    <TextInput
                        placeholder="Search subjects..."
                        placeholderTextColor="#BCAAA4"
                        style={[styles.searchInput, { color: '#3E2723' }]}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <View style={styles.tabContainer}>
                    {['WAEC', 'JAMB', 'POST UTME'].map((exam) => (
                        <TouchableOpacity
                            key={exam}
                            style={[styles.tabBtn, selectedExam === exam && styles.activeTab]}
                            onPress={() => setSelectedExam(exam)}
                        >
                            <Text style={[styles.tabText, selectedExam === exam && styles.activeTabText]}>{exam}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionLabel}>PQ LIBRARY</Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                    {uniqueSubjectNames.map((subjectName, index) => {
                        const subjectPdfs = filteredPapers.filter(p => p.name === subjectName);
                        return (
                            <React.Fragment key={subjectName}>
                                <SubjectCard
                                    name={subjectName}
                                    icon="book"
                                    paperCount={subjectPdfs.length}
                                >
                                    {subjectPdfs.map((pdf, idx) => {
                                        const isDownloaded = downloadedIds.has(pdf.id);
                                        const isDownloading = downloadingIds.has(pdf.id);

                                        return (
                                            <PaperListItem
                                                key={pdf.id}
                                                year={pdf.exam_year}
                                                name={`${pdf.exam_name} ${pdf.exam_year} `}
                                                pdfUrl={isDownloaded ? ((FileSystem as any).documentDirectory + 'past_questions/' + pdf.id + '.pdf') : pdf.pdfUrl}
                                                questionCount={pdf.question_count}
                                                isLast={idx === subjectPdfs.length - 1}
                                                isDownloaded={isDownloaded}
                                                isDownloading={isDownloading}
                                                onDownload={() => downloadPdf(pdf)}
                                                onPress={() => {
                                                    if (pdf.question_count > 0) {
                                                        navigation.navigate('PastQuestionsPractice', { paperId: pdf.subject_id });
                                                    }
                                                }}
                                            />
                                        );
                                    })}
                                </SubjectCard>
                                {index === 0 && <AdBanner placement="past_questions" />}
                            </React.Fragment>
                        );
                    })}

                    {uniqueSubjectNames.length === 0 && (
                        <View style={styles.empty}>
                            <Ionicons name="search-outline" size={48} color="#EFEBE9" />
                            <Text style={styles.emptyText}>No papers found matching your search.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#FFF8F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, paddingTop: 10 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
        borderColor: '#EFEBE9'
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '700' },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: '#8D6E63', letterSpacing: 1, marginHorizontal: 16, marginBottom: 12 },
    listContent: { paddingHorizontal: 16, paddingBottom: 30 },
    empty: { marginTop: 40, alignItems: 'center', gap: 12 },
    emptyText: { color: '#8D6E63', fontWeight: '700' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, marginHorizontal: 2 },
    activeTab: { backgroundColor: '#864b03' },
    tabText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
    activeTabText: { color: '#FFFFFF' }
});
