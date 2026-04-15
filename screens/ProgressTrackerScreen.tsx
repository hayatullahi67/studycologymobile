import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen, Header } from '../components/Layout';
import { useTimeTracker } from '../hooks/useTimeTracker';

export function ProgressTrackerScreen() {
    const navigation = useNavigation();
    const {
        loading,
        stages,
        currentStage,
        nextStage,
        progressPercent,
        totalHours,
        getCurrentStage,
        getNextStage,
        getProgressToNextStage,
        getTotalHours
    } = useTimeTracker();

    if (loading) {
        return (
            <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
                <Header
                    title="Progress Tracker"
                    onBack={() => navigation.goBack()}
                    style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                    titleStyle={{ color: '#000000' }}
                    iconColor="#000000"
                />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#864b03" />
                </View>
            </Screen>
        );
    }

    const currentStageObj = currentStage;
    const nextStageObj = nextStage;
    const progressPercentValue = progressPercent;
    const totalHoursValue = totalHours;

    console.log('[ProgressTrackerScreen] Render with:', { totalHours: totalHoursValue, currentStage: currentStageObj.name, progressPercent: progressPercentValue });

    // Calculate detailed time breakdown
    const totalSeconds = Math.floor(totalHours * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formatTimeSpent = () => {
        if (hours > 0) {
            return `You have spent ${hours}h ${minutes}m ${seconds}s on the app`;
        } else if (minutes > 0) {
            return `You have spent ${minutes}m ${seconds}s on the app`;
        } else {
            return `You have spent ${seconds}s on the app`;
        }
    };

    return (
        <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="Progress Tracker"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Current Stage Hero */}
                <View style={styles.heroSection}>
                    <View style={[styles.stageBadge, { backgroundColor: currentStageObj.color }]}>
                        <Ionicons name="trophy" size={32} color="#FFFFFF" />
                    </View>
                    <Text style={styles.currentStageTitle}>{currentStageObj.name}</Text>
                    <Text style={styles.timeSpentText}>
                        {formatTimeSpent()}
                    </Text>
                    <Text style={styles.totalHours}>
                        {totalHoursValue.toFixed(1)} hours total
                    </Text>
                </View>

                {/* Progress to Next Stage */}
                {nextStageObj && (
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressTitle}>Progress to {nextStageObj.name}</Text>
                            <Text style={styles.progressPercent}>{progressPercentValue.toFixed(0)}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${progressPercentValue}%`, backgroundColor: nextStageObj.color }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {nextStageObj.minHours - totalHoursValue > 0
                                ? `${(nextStageObj.minHours - totalHoursValue).toFixed(1)} hours to go`
                                : 'Level up soon!'
                            }
                        </Text>
                    </View>
                )}

                {/* All Stages Grid */}
                <View style={styles.stagesSection}>
                    <Text style={styles.sectionTitle}>Your Journey</Text>
                    <View style={styles.stagesGrid}>
                        {stages.map((stage, index) => {
                            const isCurrent = stage.name === currentStage.name;
                            const isCompleted = totalHours >= stage.maxHours;
                            const isLocked = totalHours < stage.minHours;

                            return (
                                <View key={stage.name} style={styles.stageCard}>
                                    <View style={[
                                        styles.stageIcon,
                                        {
                                            backgroundColor: isCompleted ? stage.color :
                                                             isCurrent ? stage.color : '#EFEBE9'
                                        }
                                    ]}>
                                        {isCompleted ? (
                                            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                        ) : isCurrent ? (
                                            <Ionicons name="time" size={20} color="#FFFFFF" />
                                        ) : (
                                            <Ionicons name="lock-closed" size={20} color="#8D6E63" />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.stageName,
                                        {
                                            color: isCompleted || isCurrent ? '#3E2723' : '#8D6E63',
                                            fontWeight: isCurrent ? '900' : '700'
                                        }
                                    ]}>
                                        {stage.name}
                                    </Text>
                                    <Text style={styles.stageHours}>
                                        {stage.maxHours === Infinity ? '∞' : `${stage.minHours}-${stage.maxHours}h`}
                                    </Text>
                                    {isCurrent && (
                                        <View style={[styles.currentIndicator, { backgroundColor: stage.color }]} />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Motivational Message */}
                <View style={styles.motivationSection}>
                    <Ionicons name="bulb" size={24} color="#864b03" />
                    <Text style={styles.motivationText}>
                        {nextStage
                            ? `Keep studying! ${nextStage.name} level awaits you.`
                            : "Congratulations! You've reached the highest level!"
                        }
                    </Text>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { padding: 16, paddingBottom: 40 },
    heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
    stageBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    currentStageTitle: { fontSize: 28, fontWeight: '900', color: '#3E2723', marginBottom: 4 },
    timeSpentText: { fontSize: 14, fontWeight: '700', color: '#864b03', textAlign: 'center', marginBottom: 4 },
    totalHours: { fontSize: 16, fontWeight: '700', color: '#8D6E63' },
    progressSection: { marginBottom: 32 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    progressTitle: { fontSize: 18, fontWeight: '800', color: '#3E2723' },
    progressPercent: { fontSize: 16, fontWeight: '900', color: '#864b03' },
    progressTrack: { height: 12, borderRadius: 6, backgroundColor: '#EFEBE9', overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', borderRadius: 6 },
    progressText: { fontSize: 14, fontWeight: '600', color: '#5D4037', textAlign: 'center' },
    stagesSection: { marginBottom: 32 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: '#3E2723', marginBottom: 20 },
    stagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    stageCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEBE9',
        position: 'relative',
    },
    stageIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    stageName: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
    stageHours: { fontSize: 11, color: '#8D6E63', fontWeight: '600' },
    currentIndicator: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    motivationSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    motivationText: { fontSize: 14, fontWeight: '700', color: '#E65100', marginLeft: 12, flex: 1 },
});