import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen, Header } from '../components/Layout';
import { Button } from '../components/Button';
import { ExamResult, ExamMode } from '../types';
import * as localDB from '../services/localDatabase';
import { AdBanner } from '../components/AdBanner';
import { useAdRotation } from '../hooks/useAdRotation';

export function PastQuestionsPracticeScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'PastQuestionsPractice'>>();
    const { paperId } = route.params;
    const { subjects, addResult, setExamConfig } = useAppStore();
    const scrollRef = useRef<ScrollView>(null);

    const { getAdConfig, getCurrentPriorityFilter } = useAdRotation();

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [sessionStartTime] = useState(Date.now());
    const [lastAdPriority, setLastAdPriority] = useState<number | null>(null);

    useEffect(() => {
        loadQuestions();
    }, [paperId]);

    const loadQuestions = async () => {
        try {
            const data = await localDB.getQuestionsForPaper(paperId);
            setQuestions(data);
            // We don't call setExamConfig here because this screen has its own state management,
            // but we'll navigate to 'Exam' if the user wants full simulation logic.
            // For paper practice, we stay here.
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color="#4F46E5" size="large" /></View>;
    }

    if (questions.length === 0) {
        return (
            <Screen style={styles.center}>
                <Text style={styles.emptyText}>No questions found for this paper.</Text>
                <Button onPress={() => navigation.goBack()}>Go Back</Button>
            </Screen>
        );
    }

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const currentPaperSubject = subjects.find(s => s.id === currentQuestion?.subject_id);

    // Get ad rotation config for current question
    const adConfig = React.useMemo(() => getAdConfig(currentIndex), [currentIndex, getAdConfig]);
    const adPriorities = React.useMemo(() =>
        adConfig.priority !== null ? [adConfig.priority] : [],
        [adConfig.priority]
    );

    // Track when priority changes
    React.useEffect(() => {
        if (adConfig.priority !== null && adConfig.priority !== lastAdPriority) {
            setLastAdPriority(adConfig.priority);
        }
    }, [adConfig.priority, lastAdPriority]);

    const handleSelectOption = (optionId: string) => {
        if (showAnswers[currentQuestion.id]) return;
        setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    };

    const toggleShowAnswer = () => {
        const showing = !showAnswers[currentQuestion.id];
        setShowAnswers(prev => ({ ...prev, [currentQuestion.id]: showing }));

        if (showing) {
            setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const handleNext = async () => {
        if (isLastQuestion) {
            const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);

            const result: ExamResult = {
                id: `pq-${Date.now()}`,
                totalScore: (stats.correct / questions.length) * 100,
                totalQuestions: questions.length,
                totalCorrect: stats.correct,
                totalWrong: stats.wrong,
                subjectResults: [{
                    subjectId: currentQuestion.subject_id,
                    name: currentPaperSubject?.name || 'Subject',
                    score: (stats.correct / questions.length) * 100,
                    totalQuestions: questions.length,
                    correctAnswers: stats.correct,
                    wrongAnswers: stats.wrong,
                }],
                timeSpent,
                date: new Date().toISOString(),
                mode: ExamMode.PAST_QUESTION,
                userAnswers,
                paperId: paperId,
                subjectId: currentQuestion.subject_id,
            };

            await addResult(result);
            setIsCompleted(true);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const stats = questions.reduce((acc, q) => {
        const answer = userAnswers[q.id];
        if (answer) {
            if (answer === q.correct_answer) acc.correct++;
            else acc.wrong++;
        }
        return acc;
    }, { correct: 0, wrong: 0 });

    const options = [
        { id: 'a', text: currentQuestion.option_a },
        { id: 'b', text: currentQuestion.option_b },
        { id: 'c', text: currentQuestion.option_c },
        { id: 'd', text: currentQuestion.option_d },
    ];

    return (
        <Screen scrollable={false} style={styles.bg}>
            <Header
                title={currentPaperSubject?.name || 'Practice'}
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.qHeader}>
                    <Text style={styles.qNumber}>Question {currentIndex + 1} of {questions.length}</Text>
                    <View style={styles.modeBadge}>
                        <Text style={styles.modeText}>PRACTICE MODE</Text>
                    </View>
                </View>

                <Text style={styles.questionText}>{currentQuestion.question}</Text>

                <View style={styles.optionsList}>
                    {options.map((opt) => {
                        const isSelected = userAnswers[currentQuestion.id] === opt.id;
                        const isShowingAnswer = showAnswers[currentQuestion.id];
                        const isCorrect = opt.id === currentQuestion.correct_answer;

                        return (
                            <TouchableOpacity
                                key={opt.id}
                                onPress={() => handleSelectOption(opt.id)}
                                style={[
                                    styles.optionItem,
                                    isSelected && styles.selectedOption,
                                    isShowingAnswer && isCorrect && styles.correctOption,
                                    isShowingAnswer && isSelected && !isCorrect && styles.wrongOption
                                ]}
                                disabled={isShowingAnswer}
                            >
                                <View style={[
                                    styles.optionCircle,
                                    isSelected && styles.selectedCircle,
                                    isShowingAnswer && isCorrect && styles.correctCircle,
                                    isShowingAnswer && isSelected && !isCorrect && styles.wrongCircle
                                ]}>
                                    <Text style={[
                                        styles.optionLetter,
                                        isSelected && styles.selectedLetter,
                                        isShowingAnswer && (isCorrect || isSelected) && styles.selectedLetter
                                    ]}>
                                        {opt.id.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={[
                                    styles.optionText,
                                    isSelected && styles.selectedOptionText
                                ]}>
                                    {opt.text}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Show Ad based on rotation logic - only at specific question intervals */}
                {adConfig.shouldShowAd && (
                    <AdBanner
                        placement="exam"
                        style={{ marginTop: 24 }}
                        priorities={adPriorities}
                        questionIndex={currentIndex}
                        shouldShowAd={true}
                    />
                )}

                {showAnswers[currentQuestion.id] && (
                    <View style={styles.explanationBox}>
                        <Text style={styles.explanationHeader}>EXPLANATION</Text>
                        <Text style={styles.explanationText}>{currentQuestion.explanation || 'No explanation available.'}</Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerRow}>
                    <TouchableOpacity
                        onPress={toggleShowAnswer}
                        style={[styles.showAnswerBtn]}
                    >
                        <Text style={styles.showAnswerText}>
                            {showAnswers[currentQuestion.id] ? 'HIDE ANSWER' : 'SHOW ANSWER'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.navButtons}>
                        <TouchableOpacity
                            onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                            disabled={currentIndex === 0}
                            style={[styles.navBtn, currentIndex === 0 && styles.disabledBtn]}
                        >
                            <Text style={styles.navBtnText}>PREV</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleNext}
                            style={[styles.navBtn, styles.nextBtn]}
                        >
                            <Text style={styles.nextBtnText}>{isLastQuestion ? 'FINISH' : 'NEXT'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <Modal visible={isCompleted} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.summaryCard}>
                        <Ionicons name="trophy" size={64} color="#F59E0B" style={{ marginBottom: 16 }} />
                        <Text style={styles.summaryTitle}>Practice Completed!</Text>
                        <Text style={styles.summarySubtitle}>Great job on finishing the session.</Text>

                        <View style={styles.summaryStats}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>QUESTIONS</Text>
                                <Text style={styles.statValue}>{questions.length}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statLabel, { color: '#10B981' }]}>CORRECT</Text>
                                <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.correct}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statLabel, { color: '#EF4444' }]}>MISSED</Text>
                                <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.wrong}</Text>
                            </View>
                        </View>

                        <Button fullWidth onPress={() => navigation.goBack()}>Return to Library</Button>
                    </View>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { backgroundColor: '#FFFFFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    container: { padding: 24, paddingBottom: 200 },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    qNumber: { fontSize: 13, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5 },
    modeBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    modeText: { color: '#C2410C', fontSize: 10, fontWeight: '900' },
    questionText: { fontSize: 19, fontWeight: '800', color: '#0F172A', lineHeight: 28, marginBottom: 40 },
    optionsList: { gap: 14 },
    optionItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
    selectedOption: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5', borderWidth: 1.5 },
    correctOption: { backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1.5 },
    wrongOption: { backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1.5 },
    optionCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    selectedCircle: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    correctCircle: { backgroundColor: '#10B981', borderColor: '#10B981' },
    wrongCircle: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    optionLetter: { fontSize: 13, fontWeight: '900', color: '#64748B' },
    selectedLetter: { color: '#FFFFFF' },
    optionText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#475569' },
    selectedOptionText: { color: '#1E1B4B' },
    explanationBox: { marginTop: 32, padding: 20, backgroundColor: '#F0F9FF', borderRadius: 20, borderWidth: 1, borderColor: '#E0F2FE' },
    explanationHeader: { fontSize: 11, fontWeight: '900', color: '#0369A1', letterSpacing: 1, marginBottom: 10 },
    explanationText: { fontSize: 14, color: '#334155', lineHeight: 22, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    footerRow: { gap: 16 },
    showAnswerBtn: { height: 50, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    showAnswerText: { fontSize: 13, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
    navButtons: { flexDirection: 'row', gap: 12 },
    navBtn: { flex: 1, height: 56, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    nextBtn: { backgroundColor: '#0F172A' },
    navBtnText: { fontSize: 14, fontWeight: '900', color: '#64748B' },
    nextBtnText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
    disabledBtn: { opacity: 0.5 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    summaryCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 32, padding: 32, alignItems: 'center' },
    summaryTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
    summarySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32, fontWeight: '500' },
    summaryStats: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 32 },
    statBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 20, alignItems: 'center' },
    statLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 6 },
    statValue: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
    emptyText: { color: '#94A3B8', fontWeight: '700', marginBottom: 20 }
});
