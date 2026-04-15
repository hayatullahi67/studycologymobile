import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList, AppNavigationProp } from '../navigation/types';
import { Header, Screen } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import * as localDB from '../services/localDatabase';
import { useAppStore } from '../store/useAppStore';
import { AdBanner } from '../components/AdBanner';

type JambTextQuizRouteProp = RouteProp<RootStackParamList, 'JambTextQuiz'>;

export function JambTextQuizScreen() {
    const route = useRoute<JambTextQuizRouteProp>();
    const navigation = useNavigation<AppNavigationProp>();
    const { textId } = route.params;
    const { theme, addJambTextQuizResult } = useAppStore();
    const isDark = theme === 'dark';

    const [text, setText] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    useEffect(() => {
        loadData();
    }, [textId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const database = await localDB.initLocalDatabase();
            const data: any = await database.getFirstAsync('SELECT * FROM jamb_texts WHERE id = ?', textId);

            if (data && data.quiz) {
                const parsedQuiz = typeof data.quiz === 'string' ? JSON.parse(data.quiz) : data.quiz;
                if (parsedQuiz && parsedQuiz.length > 0) {
                    setText({ ...data, quiz: parsedQuiz });
                } else {
                    Alert.alert("Error", "No quiz available for this text.");
                    navigation.goBack();
                }
            } else {
                Alert.alert("Error", "No quiz available for this text.");
                navigation.goBack();
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
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

    if (!text) return null;

    const currentQuestion = text.quiz[currentQuestionIndex];

    const handleAnswer = (option: string) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(option);
        if (option === currentQuestion.correctAnswer) {
            setScore(score + 1);
        }
        setShowExplanation(true);
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < text.quiz.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setShowExplanation(false);
        } else {
            setQuizFinished(true);
            addJambTextQuizResult(textId, score, text.quiz.length, text.title);
        }
    };

    if (quizFinished) {
        return (
            <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
                <Header
                    title="Quiz Result"
                    onBack={() => navigation.goBack()}
                    style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                    titleStyle={{ color: '#000000' }}
                    iconColor="#000000"
                />
                <View style={styles.resultContainer}>
                    <View style={[styles.resultCircle, { borderColor: '#3E2723', backgroundColor: 'rgba(62, 39, 35, 0.05)' }]}>
                        <Ionicons name="trophy" size={56} color="#3E2723" />
                        <Text style={[styles.scoreText, { color: '#3E2723' }]}>{score} / {text.quiz.length}</Text>
                        <Text style={[styles.scoreLabel, { color: '#5D4037' }]}>CORRECT ANSWERS</Text>
                    </View>

                    <Text style={[styles.congratsText, { color: '#1E293B' }]}>
                        {score === text.quiz.length ? "Perfect Score!" : score > text.quiz.length / 2 ? "Well Done!" : "Keep Studying!"}
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.finishBtn, { backgroundColor: '#3E2723' }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.finishBtnText}>Go Back to Text</Text>
                    </TouchableOpacity>
                </View>
            </Screen>
        );
    }

    return (
        <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="Text Quiz"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${((currentQuestionIndex + 1) / text.quiz.length) * 100}%`,
                                backgroundColor: COLORS.primary[600]
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    QUESTION {currentQuestionIndex + 1} OF {text.quiz.length}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.instrCard, { backgroundColor: '#EFEBE9', borderColor: '#D7CCC8' }]}>
                    <View style={styles.instrHeader}>
                        <Ionicons name="information-circle" size={16} color="#3E2723" />
                        <Text style={[styles.instrTitle, { color: '#3E2723' }]}>INSTRUCTION</Text>
                    </View>
                    <Text style={[styles.instrText, { color: '#5D4037' }]}>Answer the following question based on your reading of "{text.title}".</Text>
                </View>

                <Text style={[styles.questionText, { color: '#1E293B' }]}>{currentQuestion.question}</Text>

                <View style={styles.optionsContainer}>
                    {['A', 'B', 'C', 'D'].map((opt, idx) => {
                        const isSelected = selectedAnswer === opt;
                        const isCorrect = opt === currentQuestion.correctAnswer;
                        const showCorrect = selectedAnswer !== null && isCorrect;
                        const showWrong = isSelected && !isCorrect;

                        return (
                            <View key={opt}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => handleAnswer(opt)}
                                    style={[
                                        styles.optionBtn,
                                        { backgroundColor: '#864b03', borderColor: '#864b03' }, // Default Brown
                                        isSelected && { borderColor: '#3E2723', backgroundColor: '#3E2723' },
                                        showCorrect && { borderColor: '#166534', backgroundColor: '#DCFCE7' },
                                        showWrong && { borderColor: '#991B1B', backgroundColor: '#FEE2E2' }
                                    ]}
                                >
                                    <View style={[
                                        styles.optLabel,
                                        { backgroundColor: 'rgba(255,255,255,0.2)' },
                                        isSelected && { backgroundColor: '#FFFFFF' },
                                        showCorrect && { backgroundColor: '#166534' },
                                        showWrong && { backgroundColor: '#991B1B' }
                                    ]}>
                                        <Text style={[styles.optLabelText, (isSelected || showCorrect || showWrong) ? { color: '#FFFFFF' } : { color: '#FFFFFF' }]}>{opt}</Text>
                                    </View>
                                    <Text style={[
                                        styles.optionText,
                                        { color: '#FFFFFF' },
                                        showCorrect && { color: '#166534' },
                                        showWrong && { color: '#991B1B' }
                                    ]}>
                                        {currentQuestion.options[idx]}
                                    </Text>
                                </TouchableOpacity>

                                {/* Inject Ad after 2nd option (index 1) */}
                                {idx === 1 && (
                                    <AdBanner
                                        placement="quiz_option"
                                        size="option"
                                        questionIndex={currentQuestionIndex}
                                    />
                                )}
                            </View>
                        );
                    })}
                </View>

                {showExplanation && (
                    <View style={styles.explanationBox}>
                        <View style={styles.explHeader}>
                            <Ionicons name="bulb" size={16} color={COLORS.primary[600]} />
                            <Text style={styles.explTitle}>EXPLANATION</Text>
                        </View>
                        <Text style={styles.explText}>
                            {currentQuestion.explanation}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: '#FFF8F6', borderTopColor: '#E2E8F0' }]}>
                <TouchableOpacity
                    disabled={selectedAnswer === null}
                    style={[styles.nextBtn, { backgroundColor: selectedAnswer ? '#3E2723' : '#EFEBE9' }]}
                    onPress={nextQuestion}
                >
                    <Text style={[styles.nextBtnText, { color: selectedAnswer ? '#FFF' : '#A1887F' }]}>
                        {currentQuestionIndex < text.quiz.length - 1 ? "NEXT QUESTION" : "FINISH QUIZ"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={selectedAnswer ? '#FFF' : '#A1887F'} />
                </TouchableOpacity>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingBottom: 100 },
    progressContainer: { paddingHorizontal: 16, paddingTop: 10, marginBottom: 16 },
    progressBar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    progressFill: { height: '100%' },
    progressText: { fontSize: 9, fontWeight: '900', marginTop: 6, color: '#475569', letterSpacing: 1 },
    instrCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    instrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    instrTitle: { fontSize: 10, fontWeight: '900', color: COLORS.primary[600], letterSpacing: 1 },
    instrText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    questionText: { fontSize: 18, fontWeight: '800', lineHeight: 26, marginBottom: 24 },
    optionsContainer: { gap: 10 },
    optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', gap: 12 },
    optLabel: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
    optLabelText: { fontWeight: '900', fontSize: 14 },
    optionText: { flex: 1, fontSize: 14, fontWeight: '700' },
    explanationBox: { marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,140,0,0.05)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.1)' },
    explHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    explTitle: { fontSize: 10, fontWeight: '900', color: COLORS.primary[600], letterSpacing: 1 },
    explText: { fontSize: 13, lineHeight: 20, color: '#CBD5E1', fontWeight: '500' },
    footer: { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', backgroundColor: '#101920' },
    nextBtn: { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    nextBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    resultCircle: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
    scoreText: { fontSize: 32, fontWeight: '900', marginTop: 12 },
    scoreLabel: { fontSize: 10, fontWeight: '900', color: '#475569', letterSpacing: 1, marginTop: 4 },
    congratsText: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 32 },
    finishBtn: { height: 50, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    finishBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});
