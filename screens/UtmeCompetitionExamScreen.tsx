import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../services/supabaseDatabase';
import { ThemeColors, COLORS } from '../theme/colors';
import { useAdRotation } from '../hooks/useAdRotation';
import { AdBanner } from '../components/AdBanner';

export function UtmeCompetitionExamScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const route = useRoute<any>();
    const { competitionId, registrationId } = route.params;

    const { theme, userProfile } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const [loading, setLoading] = useState(true);
    const [competition, setCompetition] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { getAdConfig } = useAdRotation();

    // Ad Configuration
    const adConfig = useMemo(() => getAdConfig(currentIndex), [currentIndex, getAdConfig]);
    const adPriorities = useMemo(() =>
        adConfig.priority !== null ? [adConfig.priority] : [],
        [adConfig.priority]
    );

    // Randomize placement: 40% Chance Above, 60% Chance Mixed
    const adPosition = useMemo(() => {
        const isMixed = (currentIndex * 7) % 10 < 6;
        return isMixed ? 'mixed' : 'above';
    }, [currentIndex]);

    useEffect(() => {
        loadCompetitionData();
    }, []);

    useEffect(() => {
        if (!competition) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(competition.end_time).getTime();
            const diff = Math.floor((end - now) / 1000);

            if (diff <= 0) {
                clearInterval(interval);
                setTimeLeft(0);
                handleAutoSubmit();
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [competition]);

    const loadCompetitionData = async () => {
        try {
            setLoading(true);
            const comps = await supabaseDB.getCompetitions();
            const comp = comps.find(c => c.id === competitionId);

            if (!comp) {
                Alert.alert("Error", "Competition not found.");
                navigation.goBack();
                return;
            }

            setCompetition(comp);
            setQuestions(comp.quiz || []);

            // Initial time sync
            const now = new Date().getTime();
            const end = new Date(comp.end_time).getTime();
            setTimeLeft(Math.floor((end - now) / 1000));
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load competition questions.");
        } finally {
            setLoading(false);
        }
    };

    const handleAutoSubmit = () => {
        Alert.alert(
            "Time's Up!",
            "The competition has ended. Your answers are being submitted automatically.",
            [{ text: "OK", onPress: () => performSubmit() }]
        );
    };

    const performSubmit = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);

            // Calculate score
            let correct = 0;
            questions.forEach(q => {
                if (answers[q.id] === q.correct_answer) {
                    correct++;
                }
            });

            const score = questions.length > 0 ? (correct / questions.length) * 400 : 0; // Standard UTME scaling to 400

            const now = new Date().getTime();
            const start = new Date(competition.start_time).getTime();
            const timeTaken = Math.floor((now - start) / 1000);

            await supabaseDB.saveCompetitionResult({
                competition_id: competitionId,
                user_id: userProfile?.id,
                registration_id: registrationId,
                score: Math.round(score),
                time_taken: timeTaken,
                answers: answers
            });

            Alert.alert("Race Finished!", "Your results have been submitted to the leaderboard.", [
                { text: "View Standings", onPress: () => navigation.navigate('UtmeCompetition') }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Submission Error", "We couldn't save your results. Please contact support if this persists.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentQuestion = questions[currentIndex];
    const options = currentQuestion ? [
        { id: 'a', text: currentQuestion.option_a },
        { id: 'b', text: currentQuestion.option_b },
        { id: 'c', text: currentQuestion.option_c },
        { id: 'd', text: currentQuestion.option_d },
    ] : [];

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Sychronizing Race Content...</Text>
            </View>
        );
    }

    return (
        <Screen scrollable={false} style={{ backgroundColor: isDark ? '#101920' : colors.background }}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : colors.text} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : colors.text }]}>LIVE RACE</Text>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIconBtn}>
                        <Ionicons name="calculator-outline" size={22} color={isDark ? '#FFFFFF' : colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Info Bar */}
            <View style={[styles.infoBar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                <View style={styles.timerRow}>
                    <View style={[styles.timerBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}>
                        <Ionicons name="time-outline" size={14} color={COLORS.rose[500]} />
                        <Text style={[styles.timerText, { color: COLORS.rose[500] }]}>{formatTime(timeLeft)}</Text>
                    </View>
                    <Text style={[styles.qProgress, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {currentIndex + 1} of {questions.length}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => Alert.alert("Submit Race?", "Are you sure you want to finish the race early?", [
                        { text: "No", style: "cancel" },
                        { text: "Submit", onPress: performSubmit }
                    ])}
                    style={[styles.submitBtn, { backgroundColor: COLORS.primary[600] }]}
                >
                    <Text style={styles.submitBtnText}>Submit</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={[styles.instructionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
                    <Text style={[styles.instructionText, { color: COLORS.primary[600] }]}>COMPETITION QUESTION</Text>
                </View>

                <Text style={[styles.questionText, { color: isDark ? '#F1F5F9' : colors.text }]}>{currentQuestion?.question}</Text>

                {/* Ad Position: Above Options */}
                {adConfig.shouldShowAd && adPosition === 'above' && (
                    <AdBanner
                        placement="exam"
                        style={{ marginBottom: 16 }}
                        priorities={adPriorities}
                        questionIndex={currentIndex}
                        shouldShowAd={true}
                    />
                )}

                <View style={styles.optionsList}>
                    {options.map((opt, index) => {
                        const isSelected = answers[currentQuestion.id] === opt.id;
                        return (
                            <React.Fragment key={opt.id}>
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: opt.id }))}
                                    style={[
                                        styles.optionItem,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' },
                                        isSelected && { borderColor: COLORS.primary[600], backgroundColor: COLORS.primary[600] + '10' }
                                    ]}
                                >
                                    <View style={[
                                        styles.optionLetterBox,
                                        { backgroundColor: isSelected ? COLORS.primary[600] : (isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9') }
                                    ]}>
                                        <Text style={[styles.optionLetter, { color: isSelected ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#0F172A') }]}>
                                            {opt.id.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={[styles.optionText, { color: isDark ? '#F1F5F9' : colors.text }, isSelected && { fontWeight: '700' }]}>
                                        {opt.text}
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary[600]} />}
                                </TouchableOpacity>

                                {/* Ad Position: Mixed (After 2nd option) */}
                                {adConfig.shouldShowAd && adPosition === 'mixed' && index === 1 && (
                                    <AdBanner
                                        placement="competition_option"
                                        size="option"
                                        style={{ marginVertical: 8 }}
                                        priorities={adPriorities}
                                        questionIndex={currentIndex}
                                        shouldShowAd={true}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Footer Navigation */}
            <View style={[styles.footer, { backgroundColor: isDark ? '#101920' : colors.background, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                <View style={styles.navButtons}>
                    <TouchableOpacity
                        onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        style={[styles.navBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }, currentIndex === 0 && { opacity: 0.5 }]}
                    >
                        <Text style={[styles.navBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Prev</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            if (currentIndex < questions.length - 1) {
                                setCurrentIndex(currentIndex + 1);
                            } else {
                                Alert.alert("Race Complete", "You have answered all questions. Submit now?", [
                                    { text: "No", style: "cancel" },
                                    { text: "Submit Now", onPress: performSubmit }
                                ]);
                            }
                        }}
                        style={[styles.navBtn, styles.nextBtn, { backgroundColor: COLORS.primary[600] }]}
                    >
                        <Text style={[styles.navBtnText, { color: '#FFFFFF' }]}>
                            {currentIndex === questions.length - 1 ? "Submit" : "Next"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isSubmitting && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.overlayText}>Calculating Rank...</Text>
                </View>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 16, fontWeight: '700' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    headerRight: { flexDirection: 'row', gap: 12 },
    headerIconBtn: { padding: 4 },
    backBtn: { padding: 4 },
    infoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    timerText: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
    qProgress: { fontSize: 12, fontWeight: '800' },
    submitBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
    submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    scrollContainer: { padding: 16, paddingBottom: 100 },
    instructionCard: { padding: 10, borderRadius: 10, marginBottom: 16 },
    instructionText: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
    questionText: { fontSize: 16, fontWeight: '800', lineHeight: 28, marginBottom: 24 },
    optionsList: { gap: 10 },
    optionItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1.5 },
    optionLetterBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    optionLetter: { fontSize: 14, fontWeight: '900' },
    optionText: { flex: 1, fontSize: 14, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1 },
    navButtons: { flexDirection: 'row', gap: 12 },
    navBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    nextBtn: { flex: 1 },
    navBtnText: { fontSize: 14, fontWeight: '900' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    overlayText: { color: '#FFF', marginTop: 16, fontWeight: '800', fontSize: 16 }
});
