import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Layout';
import { AdBanner } from '../components/AdBanner';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { saveExamResult } from '../services/localDatabase';
import { useAppStore } from '../store/useAppStore';

type EduGameResultRouteProp = RouteProp<RootStackParamList, 'EduGameResult'>;

export function EduGameResultScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const route = useRoute<EduGameResultRouteProp>();
    const { result } = route.params;
    const { theme } = useAppStore();
    const isDark = theme === 'dark';

    useEffect(() => {
        saveResult();
    }, []);

    const saveResult = async () => {
        try {
            const resultData = {
                id: `edu-${Date.now()}`,
                ...result,
                totalScore: (result.score / result.totalQuestions) * 100,
                totalCorrect: result.score,
                totalWrong: result.totalQuestions - result.score,
                timeSpent: 0,
                subjectResults: [],
                userAnswers: {},
            };
            await saveExamResult(resultData);
        } catch (e) {
            console.error('Failed to save game result:', e);
        }
    };

    const shareScore = async () => {
        try {
            await Share.share({
                message: `🎯 I just scored ${result.score}/${result.totalQuestions} on ${result.subjectName} in the Edu Game! \n\nCan you beat my score? 🚀`,
            });
        } catch (e) { }
    };

    return (
        <Screen style={styles.container}>
            <View style={styles.card}>
                <View style={styles.decorationCircle} />

                <View style={styles.trophyContainer}>
                    <View style={styles.trophyGlow} />
                    <View style={[styles.trophyBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                        <Ionicons name="trophy" size={56} color="#FFD700" />
                    </View>
                </View>

                <View style={styles.headerInfo}>
                    <Text style={styles.congratsText}>Congratulations!</Text>
                    <Text style={styles.completedText}>Quest Completed Successfully</Text>
                </View>

                <View style={styles.scoreHero}>
                    <Text style={styles.heroLabel}>FINAL SCORE</Text>
                    <View style={styles.scoreRow}>
                        <Text style={styles.scoreMain}>{result.score}</Text>
                        <Text style={styles.scoreDivider}>/</Text>
                        <Text style={styles.scoreTotal}>{result.totalQuestions}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Ionicons name="book-outline" size={16} color="#864b03" style={{ marginBottom: 4 }} />
                        <Text style={styles.statVal} numberOfLines={1}>{result.subjectName}</Text>
                        <Text style={styles.statLabel}>SUBJECT</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Ionicons name="analytics-outline" size={16} color="#10b981" style={{ marginBottom: 4 }} />
                        <Text style={[styles.statVal, { color: '#10b981' }]}>{Math.round((result.score / result.totalQuestions) * 100)}%</Text>
                        <Text style={styles.statLabel}>ACCURACY</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.challengeBtn}
                    onPress={shareScore}
                    activeOpacity={0.7}
                >
                    <Ionicons name="share-social-outline" size={20} color="#5D4037" />
                    <Text style={styles.challengeBtnText}>Challenge Friends</Text>
                </TouchableOpacity>

                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionBtnSecondary}
                        onPress={() => navigation.navigate('MainTabs')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="home-outline" size={18} color="#8D6E63" />
                        <Text style={styles.actionBtnTextSecondary}>Home</Text>
                    </TouchableOpacity>
                </View>

                {/* Square Result Ad */}
                <View style={{ width: '100%', alignItems: 'center', marginVertical: 16 }}>
                    <AdBanner
                        placement="edugame_result_square"
                        size="square"
                        style={{ width: '100%' }}
                    />
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8F6', // Light Brown
    },
    card: {
        flex: 1,
        width: '100%',
        backgroundColor: '#FFFFFF', // White
        borderRadius: 0,
        padding: 24,
        paddingTop: 60,
        alignItems: 'center',
    },
    decorationCircle: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(134, 75, 3, 0.05)', // Brown tint
    },
    trophyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    trophyGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
    },
    trophyBox: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    headerInfo: {
        alignItems: 'center',
        marginBottom: 24,
    },
    congratsText: {
        fontSize: 26,
        fontWeight: '900',
        color: '#000000', // Black
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    completedText: {
        fontSize: 14,
        color: '#000000', // Black
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreHero: {
        width: '100%',
        backgroundColor: '#EFEBE9', // Light Brown
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#D7CCC8',
    },
    heroLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#8D6E63',
        letterSpacing: 3,
        marginBottom: 10,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    scoreMain: {
        fontSize: 56,
        fontWeight: '900',
        color: '#000000', // Black
    },
    scoreDivider: {
        fontSize: 24,
        fontWeight: '700',
        color: '#864b03',
        marginHorizontal: 12,
        opacity: 0.8,
    },
    scoreTotal: {
        fontSize: 32,
        fontWeight: '900',
        color: '#A1887F',
    },
    statsGrid: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 32,
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: '#E0E0E0',
        alignSelf: 'center',
    },
    statVal: {
        fontSize: 16,
        fontWeight: '800',
        color: '#5D4037', // Medium Brown
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8D6E63',
        letterSpacing: 1,
    },
    challengeBtn: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        width: '100%',
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EFEBE9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    challengeBtnText: {
        color: '#5D4037',
        fontSize: 16,
        fontWeight: '700',
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionBtnPrimary: {
        flex: 1.5,
        flexDirection: 'row',
        height: 58,
        borderRadius: 16,
        backgroundColor: '#864b03',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#864b03',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    actionBtnTextPrimary: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
    },
    actionBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        height: 58,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#EFEBE9',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    actionBtnTextSecondary: {
        color: '#8D6E63',
        fontSize: 16,
        fontWeight: '700',
    },
});
