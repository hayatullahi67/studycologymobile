import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Vibration, Dimensions } from 'react-native';
import { AdBanner } from '../components/AdBanner';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ThemeColors } from '../theme/colors';
import { getRandomQuestionsBySubject, getSubjectById } from '../services/localDatabase';
import { ExamMode } from '../types';

const { width, height } = Dimensions.get('window');

type EduGameRouteProp = RouteProp<RootStackParamList, 'EduGame'>;

export function EduGameScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const route = useRoute<EduGameRouteProp>();
    const { initialSubjectId } = route.params;
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(30);
    const [subject, setSubject] = useState<any>(null);
    const [lifelines, setLifelines] = useState({
        fiftyFifty: 3,
        hint: 3,
        skip: 1, // Keeping skip at 1 for now or as per preference
    });
    const [removedOptions, setRemovedOptions] = useState<string[]>([]);
    const [advanceTimeout, setAdvanceTimeout] = useState<any>(null);

    useEffect(() => {
        loadQuestions();
    }, [initialSubjectId]);

    useEffect(() => {
        if (questions.length > 0 && !isLocked && timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (timer === 0 && !isLocked) {
            handleOptionSelect('TIMEOUT');
        }
    }, [timer, questions, isLocked]);

    const loadQuestions = async () => {
        try {
            if (!initialSubjectId) throw new Error('No subject selected');
            const sub = await getSubjectById(initialSubjectId);
            setSubject(sub);
            const data = await getRandomQuestionsBySubject(initialSubjectId, 15); // Millionaire standard: 15 questions
            setQuestions(data);
        } catch (e) {
            Alert.alert('Error', 'Failed to load questions.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (opt: string) => {
        if (isLocked) return;
        setSelectedOption(opt);
        setIsLocked(true);

        const question = questions[currentIndex];
        const isCorrect = opt.toLowerCase() === question.correct_answer.toLowerCase();

        if (isCorrect) {
            setScore((prev) => prev + 1);
        }

        // Auto-advance after 2 seconds (slightly longer to allow manual skip)
        const timeout = setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                nextQuestion();
            } else {
                finishGame();
            }
        }, 2000);
        setAdvanceTimeout(timeout);
    };

    const handleNext = () => {
        if (advanceTimeout) clearTimeout(advanceTimeout);
        setAdvanceTimeout(null);
        if (currentIndex < questions.length - 1) {
            nextQuestion();
        } else {
            finishGame();
        }
    };

    const nextQuestion = () => {
        if (currentIndex >= questions.length - 1) {
            finishGame();
            return;
        }
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsLocked(false);
        setTimer(30);
        setRemovedOptions([]);
    };

    const finishGame = () => {
        navigation.replace('EduGameResult', {
            result: {
                score,
                totalQuestions: questions.length,
                subjectName: subject?.name || 'General',
                date: new Date().toISOString(),
                mode: ExamMode.EDU_GAME,
            },
        });
    };

    const useLifeline = (type: 'fiftyFifty' | 'hint' | 'skip') => {
        if (isLocked) return;
        if (type !== 'skip' && lifelines[type] <= 0) return;

        if (type !== 'skip') {
            setLifelines((prev) => ({ ...prev, [type]: prev[type] - 1 }));
        }

        if (type === 'fiftyFifty') {
            const q = questions[currentIndex];
            const correct = q.correct_answer.toLowerCase();
            const options = ['a', 'b', 'c', 'd'].filter(o => o !== correct);
            // Randomly pick 2 to remove
            const toRemove = options.sort(() => 0.5 - Math.random()).slice(0, 2);
            setRemovedOptions(toRemove);
        } else if (type === 'hint') {
            Alert.alert('Hint', questions[currentIndex].explanation || "Try your best!");
        } else if (type === 'skip') {
            nextQuestion();
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: '#FFF8F6' }]}>
                <ActivityIndicator color="#864b03" size="large" />
            </View>
        );
    }

    const currentQuestion = questions[currentIndex];

    // Safety check: Avoid crash if index is out of bounds during transition
    if (!currentQuestion) {
        return (
            <View style={[styles.center, { backgroundColor: '#FFF8F6' }]}>
                <ActivityIndicator color="#864b03" size="large" />
            </View>
        );
    }

    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <Screen scrollable={false} style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            {/* SECTION 1: Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitBtn}>
                    <Ionicons name="close" size={24} color="#3E2723" />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Text style={styles.progressText}>Question {currentIndex + 1} / {questions.length}</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                </View>

                <View style={[styles.timerCircle, { borderColor: timer < 10 ? '#EF4444' : '#864b03' }]}>
                    <Text style={[styles.timerText, { color: timer < 10 ? '#EF4444' : '#3E2723' }]}>{timer}</Text>
                </View>
            </View>

            {/* SECTION 2: Question Card */}
            <View style={styles.questionSection}>
                <View style={styles.questionCard}>
                    <Text style={styles.questionText}>{currentQuestion.question}</Text>
                </View>
            </View>

            {/* SECTION 3: Answer Options */}
            <View style={styles.optionsSection}>
                {['a', 'b', 'c', 'd'].map((key, index) => {
                    const optionText = currentQuestion[`option_${key}`];
                    const isSelected = selectedOption === key;
                    const isCorrect = currentQuestion.correct_answer.toLowerCase() === key;
                    const isWrong = isSelected && !isCorrect;
                    const isRemoved = removedOptions.includes(key);

                    if (isRemoved) return <View key={key} style={styles.optionPlaceholder} />;

                    let cardStyle: any = styles.optionCard;
                    let textStyle: any = styles.optionText;
                    let labelBg = '#F5F5F5';
                    let labelTextColor = '#5D4037';

                    if (isLocked) {
                        if (isCorrect) {
                            cardStyle = [styles.optionCard, styles.optionCorrect];
                            labelBg = 'rgba(255,255,255,0.6)';
                        } else if (isWrong) {
                            cardStyle = [styles.optionCard, styles.optionWrong];
                            labelBg = 'rgba(255,255,255,0.6)';
                        }
                    } else if (isSelected) {
                        cardStyle = [styles.optionCard, styles.optionSelected];
                        textStyle = [styles.optionText, styles.optionTextSelected];
                        labelBg = 'rgba(255,255,255,0.2)';
                        labelTextColor = '#FFFFFF';
                    }

                    return (
                        <View key={key}>
                            <TouchableOpacity
                                disabled={isLocked}
                                style={cardStyle}
                                onPress={() => handleOptionSelect(key)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.optionLabel, { backgroundColor: labelBg }]}>
                                    <Text style={[styles.optionLabelText, { color: labelTextColor }]}>{key.toUpperCase()}</Text>
                                </View>
                                <Text style={textStyle}>{optionText}</Text>
                                {isLocked && isCorrect && <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />}
                                {isLocked && isWrong && <Ionicons name="close-circle" size={24} color="#C62828" />}
                            </TouchableOpacity>

                            {/* Inject Ad after 2nd option (index 1) */}
                            {index === 1 && (
                                <AdBanner
                                    placement="game_option"
                                    size="option"
                                />
                            )}
                        </View>
                    );
                })}
            </View>

            {/* SECTION 4: Lifelines */}
            <View style={styles.lifelineWrapper}>
                <Text style={styles.lifelineHeader}>TACTICAL LIFELINES</Text>
                <View style={styles.lifelineSection}>
                    <View style={styles.lifelineItem}>
                        <TouchableOpacity
                            style={[styles.lifelineBtn, lifelines.fiftyFifty <= 0 && styles.lifelineDisabled]}
                            onPress={() => useLifeline('fiftyFifty')}
                            disabled={lifelines.fiftyFifty <= 0 || isLocked}
                        >
                            <Text style={styles.lifelineIconText}>½</Text>
                        </TouchableOpacity>
                        <Text style={[styles.lifelineLabel, lifelines.fiftyFifty <= 0 && { color: '#BCAAA4' }]}>
                            50:50 {lifelines.fiftyFifty > 0 ? `(${lifelines.fiftyFifty})` : ''}
                        </Text>
                    </View>

                    <View style={styles.lifelineItem}>
                        <TouchableOpacity
                            style={[styles.lifelineBtn, lifelines.hint <= 0 && styles.lifelineDisabled]}
                            onPress={() => useLifeline('hint')}
                            disabled={lifelines.hint <= 0 || isLocked}
                        >
                            <Ionicons name="bulb-outline" size={24} color="#3E2723" />
                        </TouchableOpacity>
                        <Text style={[styles.lifelineLabel, lifelines.hint <= 0 && { color: '#BCAAA4' }]}>
                            Hint {lifelines.hint > 0 ? `(${lifelines.hint})` : ''}
                        </Text>
                    </View>

                    <View style={styles.lifelineItem}>
                        <TouchableOpacity
                            style={styles.lifelineBtn}
                            onPress={() => useLifeline('skip')}
                            disabled={isLocked}
                        >
                            <Ionicons name="play-skip-forward-outline" size={24} color="#3E2723" />
                        </TouchableOpacity>
                        <Text style={styles.lifelineLabel}>Skip</Text>
                    </View>
                </View>
            </View>

            {/* SECTION 5: Action Area */}
            {/* <View style={styles.actionArea}>
                {isLocked ? (
                    <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={handleNext}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextBtnText}>
                            {currentIndex < questions.length - 1 ? "CONTINUE" : "CHECK RESULTS"}
                        </Text>
                        <Ionicons
                            name={currentIndex < questions.length - 1 ? "arrow-forward" : "stats-chart"}
                            size={18}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.feedbackPlaceholder}>Select an answer to proceed</Text>
                )}
            </View> */}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: '#FDFAF9',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 16,
        gap: 12,
    },
    exitBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEBE9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerInfo: { flex: 1 },
    progressText: {
        color: '#8D6E63',
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 6,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#EFEBE9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#5D4037',
        borderRadius: 3,
    },
    timerCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    timerText: { fontSize: 16, fontWeight: '900' },

    questionSection: {
        paddingVertical: 8,
        marginBottom: 16,
    },
    questionCard: {
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        shadowColor: '#3E2723',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#FAFAFA',
        minHeight: 100,
        justifyContent: 'center',
    },
    questionText: {
        color: '#3E2723',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 26,
        letterSpacing: -0.2,
    },

    optionsSection: {
        flex: 1,
        gap: 10,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#EFEBE9',
        minHeight: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    optionSelected: {
        borderColor: '#5D4037',
        backgroundColor: '#3E2723',
        transform: [{ scale: 1.01 }],
    },
    optionCorrect: {
        backgroundColor: '#E8F5E9',
        borderColor: '#2E7D32',
        borderWidth: 1.5,
    },
    optionWrong: {
        backgroundColor: '#FFEBEE',
        borderColor: '#C62828',
        borderWidth: 1.5,
    },
    optionPlaceholder: { height: 52 },
    optionLabel: {
        width: 30,
        height: 30,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        backgroundColor: '#F5F5F5',
    },
    optionLabelText: { color: '#5D4037', fontWeight: '800', fontSize: 13 },

    optionText: { color: '#4E342E', fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 20 },
    optionTextSelected: { color: '#FFFFFF' },

    lifelineWrapper: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    lifelineHeader: {
        fontSize: 9,
        fontWeight: '800',
        color: '#A1887F',
        letterSpacing: 2,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    lifelineSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    lifelineItem: {
        alignItems: 'center',
        gap: 6,
    },
    lifelineBtn: {
        width: 48,
        height: 48,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#EFEBE9',
    },
    lifelineDisabled: {
        backgroundColor: '#FAFAFA',
        opacity: 0.5,
        elevation: 0,
    },
    lifelineLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8D6E63',
    },
    lifelineIconText: { color: '#3E2723', fontWeight: '900', fontSize: 16 },

    actionArea: { height: 10 },
});
