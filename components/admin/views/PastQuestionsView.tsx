import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator, FlatList, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface PastQuestionsViewProps {
    onSelectPaper?: (paperId: string) => void;
}

interface Paper {
    id: string; // subject_id
    name: string; // subject name
    exam: string;
    year: string;
    questionCount: number;
}

interface Question {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string;
}

export function PastQuestionsView({ onSelectPaper }: PastQuestionsViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for consistency
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(false);

    // Viewing/Editing State
    const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    // Refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadPapers();
        }, [])
    );

    const loadPapers = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getAllPapers();
            setPapers(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load question bank');
        } finally {
            setLoading(false);
        }
    };

    const handleViewPaper = async (paper: Paper) => {
        setSelectedPaper(paper);
        setDetailModalVisible(true);
        loadQuestions(paper.id);
    };

    const loadQuestions = async (subjectId: string) => {
        try {
            setLoadingQuestions(true);
            const result = await supabaseDB.getQuestions(subjectId, 1, 150);
            setQuestions(result.questions as any);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load questions');
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleDeletePaper = (paper: Paper) => {
        Alert.alert(
            'Purge Record',
            `Are you sure you want to permanently delete ${paper.exam} ${paper.year} ${paper.name}? This action is irreversible.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Purge',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await supabaseDB.deleteSubject(paper.id);
                            loadPapers();
                            Alert.alert('Success', 'Record purged from database.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={[styles.headerTitle, { color: '#000000' }]}>Question Bank</Text>
                <Text style={[styles.headerSub, { color: '#64748B' }]}>Managed exam repositories</Text>
            </View>
            <TouchableOpacity onPress={loadPapers} style={[styles.refreshBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                <Ionicons name="refresh" size={20} color="#864b03" />
            </TouchableOpacity>
        </View>
    );

    const renderPaperItem = ({ item }: { item: Paper }) => (
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF8F6' }]}>
                <Ionicons name="documents" size={24} color="#864b03" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={[styles.title, { color: '#3E2723' }]}>{item.exam} {item.year}</Text>
                <Text style={[styles.subtitle, { color: '#64748B' }]}>{item.name.toUpperCase()} • {item.questionCount} QUESTIONS</Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.viewBtn, { backgroundColor: '#EFEBE9' }]}
                    onPress={() => handleViewPaper(item)}
                >
                    <Ionicons name="eye-outline" size={20} color="#4E342E" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => handleDeletePaper(item)}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderQuestionItem = ({ item, index }: { item: Question; index: number }) => (
        <View style={[styles.questionCard, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
            <View style={styles.qHeader}>
                <Text style={[styles.qIndex, { color: '#864b03' }]}>QUESTION {index + 1}</Text>
                <View style={[styles.badge, { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' }]}>
                    <Text style={[styles.badgeText, { color: '#64748B' }]}>SYNCED</Text>
                </View>
            </View>

            <Text style={[styles.questionText, { color: '#3E2723' }]}>{item.question}</Text>

            <View style={styles.optionsContainer}>
                {['a', 'b', 'c', 'd'].map((opt) => {
                    const isCorrect = item.correct_answer.toLowerCase() === opt;
                    return (
                        <View key={opt} style={[
                            styles.optionRow,
                            { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' },
                            isCorrect && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }
                        ]}>
                            <View style={[styles.optIndicator, { backgroundColor: '#FFFFFF' }, isCorrect && { backgroundColor: '#10B981' }]}>
                                <Text style={[styles.optLabel, { color: '#64748B' }, isCorrect && { color: '#FFFFFF' }]}>
                                    {opt.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.optText, { color: '#3E2723' }, isCorrect && { color: '#065F46', fontWeight: '700' }]}>
                                {(item as any)[`option_${opt}`]}
                            </Text>
                            {isCorrect && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                        </View>
                    );
                })}
            </View>

            {item.explanation ? (
                <View style={[styles.explanationBox, { backgroundColor: '#FFF8F6', borderLeftColor: '#864b03' }]}>
                    <View style={styles.explanationHeader}>
                        <Ionicons name="bulb-outline" size={14} color="#864b03" />
                        <Text style={[styles.explanationLabel, { color: '#864b03' }]}>EXPLANATION</Text>
                    </View>
                    <Text style={[styles.explanationText, { color: '#3E2723' }]}>{item.explanation}</Text>
                </View>
            ) : null}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {renderHeader()}

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#4E342E" />
                    <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '700' }}>Retrieving data...</Text>
                </View>
            ) : papers.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="file-tray-outline" size={80} color="#E2E8F0" />
                    <Text style={[styles.emptyStateText, { color: colors.text }]}>Repository Empty</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Start by importing questions from the dashboard or manual entry.</Text>
                </View>
            ) : (
                <FlatList
                    data={papers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPaperItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <Modal
                visible={detailModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalSafe, { backgroundColor: '#FFF8F6' }]}>
                    <View style={[styles.modalHeader, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                        <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={[styles.closeBtn, { backgroundColor: '#FFF8F6' }]}>
                            <Ionicons name="close" size={24} color="#000000" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={[styles.modalTitle, { color: '#000000' }]}>{selectedPaper?.exam} {selectedPaper?.year}</Text>
                            <Text style={[styles.modalSubtitle, { color: '#64748B' }]}>{selectedPaper?.name.toUpperCase()}</Text>
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    {loadingQuestions ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#4E342E" />
                            <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '700' }}>Loading questions...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={questions}
                            keyExtractor={(item) => item.id}
                            renderItem={renderQuestionItem}
                            contentContainerStyle={styles.questionsList}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#FFF8F6' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, color: '#000000' },
    headerSub: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    refreshBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    listContent: {
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10
    },
    iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    cardInfo: { flex: 1 },
    title: { fontSize: 17, fontWeight: '900', marginBottom: 2 },
    subtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
    actionButtons: { flexDirection: 'row', gap: 10 },
    viewBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyStateText: { marginTop: 20, fontSize: 20, fontWeight: '900' },
    emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22, fontWeight: '600' },
    modalSafe: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1 },
    closeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '900' },
    modalSubtitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    questionsList: {
        padding: 16,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    questionCard: { borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, elevation: 1 },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    qIndex: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    questionText: { fontSize: 16, fontWeight: '700', lineHeight: 24, marginBottom: 20 },
    optionsContainer: { gap: 10 },
    optionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
    optIndicator: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    optLabel: { fontWeight: '900', fontSize: 12 },
    optText: { flex: 1, fontSize: 14, fontWeight: '500' },
    explanationBox: { marginTop: 20, padding: 16, borderRadius: 16, borderLeftWidth: 4 },
    explanationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    explanationLabel: { fontSize: 10, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },
    explanationText: { fontSize: 13, lineHeight: 20, fontWeight: '500' }
});
