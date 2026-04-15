import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, Card } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';
import { COLORS } from '../theme/colors';
import * as supabaseDB from '../services/supabaseDatabase';
import { ThemeColors } from '../theme/colors';

import { UserCompetitionResultView } from '../components/UserCompetitionResultView';

export function UtmeCompetitionScreen() {
    const navigation = useNavigation<any>();
    const { theme, userProfile } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [competition, setCompetition] = useState<any>(null); // Live competition
    const [pastCompetitions, setPastCompetitions] = useState<any[]>([]); // Past competitions
    const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [registration, setRegistration] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [stats, setStats] = useState<any[]>([]);

    // Form states
    const [name, setName] = useState(userProfile?.name || '');
    const [email, setEmail] = useState(userProfile?.email || '');
    const [phone, setPhone] = useState('');
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        loadCompetitionFlow();
    }, [userProfile?.id]);

    useEffect(() => {
        if (!competition) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const start = new Date(competition.start_time).getTime();
            const diff = Math.floor((start - now) / 1000);
            setTimeLeft(diff > 0 ? diff : 0);
        }, 1000);

        return () => clearInterval(interval);
    }, [competition]);

    const loadCompetitionFlow = async () => {
        try {
            setLoading(true);
            const comps = await supabaseDB.getCompetitions();
            const now = new Date();

            // Find live or future
            const liveOrFuture = comps.find(c => new Date(c.end_time) > now);
            setCompetition(liveOrFuture);

            // Find past competitions (all that have ended)
            const past = comps.filter(c => new Date(c.end_time) <= now).sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
            setPastCompetitions(past);

            if (liveOrFuture) {
                // Check if user is registered
                if (userProfile?.id) {
                    const reg = await supabaseDB.checkCompetitionRegistration(liveOrFuture.id, userProfile.id);
                    setRegistration(reg);
                    if (reg) {
                        setName(reg.full_name);
                        setPhone(reg.phone);
                        setEmail(reg.email);
                    }
                }

                // Load leaderboard for this comp
                const results = await supabaseDB.getCompetitionResults(liveOrFuture.id);
                setStats(results.slice(0, 5));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadCompetitionFlow();
        setRefreshing(false);
    };

    const handleRegister = async () => {
        if (!name.trim() || !phone.trim() || !email.trim()) {
            Alert.alert("Hold on", "Please provide all details for the leaderboard.");
            return;
        }

        if (!userProfile?.id) {
            Alert.alert("Error", "You must be logged in to register.");
            return;
        }

        try {
            setRegistering(true);
            const reg = await supabaseDB.registerForCompetition({
                competition_id: competition.id,
                user_id: userProfile.id,
                full_name: name,
                phone: phone,
                email: email
            });
            setRegistration(reg);
            Alert.alert("Success!", "You are now registered for the challenge.");
        } catch (error) {
            Alert.alert("Error", "Failed to register. Please try again.");
        } finally {
            setRegistering(false);
        }
    };

    const handleJoin = () => {
        const now = new Date();
        const start = new Date(competition.start_time);
        const end = new Date(competition.end_time);

        if (now < start) {
            Alert.alert("Not Started", "Please wait for the timer to reach zero.");
            return;
        }

        if (now > end) {
            Alert.alert("Expired", "This competition has ended.");
            return;
        }

        if (!registration) {
            Alert.alert("Wait", "Please register first.");
            return;
        }

        navigation.navigate('UtmeCompetitionExam', {
            competitionId: competition.id,
            registrationId: registration.id
        });
    };

    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const isCompetitionLive = competition
        ? new Date() >= new Date(competition.start_time) && new Date() <= new Date(competition.end_time)
        : false;

    const renderHistory = () => (
        <View style={styles.historyList}>
            {pastCompetitions.length > 0 ? (
                pastCompetitions.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => setSelectedHistoryId(item.id)}
                    >
                        <View style={styles.historyHeader}>
                            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                                {new Date(item.start_time).toLocaleDateString()}
                            </Text>
                            <View style={[styles.historyBadge, { backgroundColor: '#F1F5F9' }]}>
                                <Text style={[styles.historyBadgeText, { color: '#64748B' }]}>FINISHED</Text>
                            </View>
                        </View>
                        <Text style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.historySub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.description}
                        </Text>

                        <View style={[styles.viewResultBtn, { marginTop: 12, flexDirection: 'row', alignItems: 'center' }]}>
                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13, marginRight: 4 }}>View Leaderboard</Text>
                            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                        </View>
                    </TouchableOpacity>
                ))
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={60} color={colors.border} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No past races found</Text>
                </View>
            )}
        </View>
    );

    if (selectedHistoryId) {
        return (
            <Screen scrollable={false} style={{ backgroundColor: colors.background }}>
                <UserCompetitionResultView
                    competitionId={selectedHistoryId}
                    onBack={() => setSelectedHistoryId(null)}
                />
            </Screen>
        );
    }

    return (
        <Screen scrollable={false} style={{ backgroundColor: '#FFF8F6' }}>
            <Header
                title="UTME Competition"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            {/* Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'live' && styles.activeTab, activeTab === 'live' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('live')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'live' ? colors.primary : colors.textSecondary }]}>Live Challenge</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab, activeTab === 'history' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.primary : colors.textSecondary }]}>Past History</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {activeTab === 'history' ? renderHistory() : (
                    !competition ? (
                        <View style={[styles.center, { padding: 40 }]}>
                            <Ionicons name="trophy-outline" size={80} color={colors.textSecondary + '40'} />
                            <Text style={[styles.noCompText, { color: colors.text }]}>No competitions scheduled right now.</Text>
                            <Text style={[styles.noCompSub, { color: colors.textSecondary }]}>Check back later for upcoming national challenges!</Text>
                        </View>
                    ) : (
                        <>
                            {/* Countdown Section */}
                            <View style={styles.countdownContainer}>
                                <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>
                                    {isCompetitionLive ? 'CHALLENGE IS LIVE!' : 'STARTS IN'}
                                </Text>
                                <Text style={[styles.timer, { color: isCompetitionLive ? '#10B981' : COLORS.rose[600] }]}>
                                    {isCompetitionLive ? '00:00:00' : formatTime(timeLeft)}
                                </Text>
                                <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                                    {new Date(competition.start_time).toLocaleString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                    })}
                                </Text>

                                <View style={[styles.compInfo, { backgroundColor: colors.surface }]}>
                                    <Text style={[styles.compTitle, { color: colors.text }]}>{competition.title}</Text>
                                    <Text style={[styles.compDesc, { color: colors.textSecondary }]}>{competition.description}</Text>
                                </View>
                            </View>

                            {/* Registration Form / Status */}
                            {!isCompetitionLive && !registration ? (
                                <View style={[styles.waitingBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Ionicons name="lock-closed-outline" size={40} color={colors.textSecondary} />
                                    <Text style={[styles.waitingTitle, { color: colors.text }]}>Doors Open at {new Date(competition.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    <Text style={[styles.waitingSub, { color: colors.textSecondary }]}>The entry form will unlock automatically when the timer hits zero.</Text>
                                </View>
                            ) : (
                                <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    {!registration ? (
                                        <>
                                            <Text style={[styles.formTitle, { color: colors.text }]}>Entry Registration</Text>
                                            <Text style={[styles.formSub, { color: colors.textSecondary }]}>Join the race for real-world prizes and recognition.</Text>

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                                    placeholder="Enter your full name"
                                                    placeholderTextColor={isDark ? '#485563' : '#94A3B8'}
                                                    value={name}
                                                    onChangeText={setName}
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.label, { color: colors.text }]}>WhatsApp Number</Text>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                                    placeholder="e.g. 08012345678"
                                                    placeholderTextColor={isDark ? '#485563' : '#94A3B8'}
                                                    keyboardType="phone-pad"
                                                    value={phone}
                                                    onChangeText={setPhone}
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                                    placeholder="e.g. nelson@example.com"
                                                    placeholderTextColor={isDark ? '#485563' : '#94A3B8'}
                                                    keyboardType="email-address"
                                                    autoCapitalize="none"
                                                    value={email}
                                                    onChangeText={setEmail}
                                                />
                                            </View>

                                            <TouchableOpacity
                                                style={[styles.registerBtn, { backgroundColor: colors.primary }]}
                                                onPress={handleRegister}
                                                disabled={registering}
                                            >
                                                {registering ? (
                                                    <ActivityIndicator color="#FFF" />
                                                ) : (
                                                    <Text style={styles.btnText}>Start Race</Text>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <View style={styles.regStatus}>
                                            <View style={[styles.checkCircle, { backgroundColor: '#10B98120' }]}>
                                                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                                            </View>
                                            <Text style={[styles.regOkTitle, { color: colors.text }]}>You're In!</Text>
                                            <Text style={[styles.regOkSub, { color: colors.textSecondary }]}>
                                                Good luck, {registration.full_name.split(' ')[0]}! Enter the race venue below to begin.
                                            </Text>

                                            <TouchableOpacity
                                                style={[
                                                    styles.joinBtn,
                                                    { backgroundColor: isCompetitionLive ? COLORS.rose[600] : colors.border },
                                                    !isCompetitionLive && { opacity: 0.5 }
                                                ]}
                                                onPress={handleJoin}
                                                disabled={!isCompetitionLive}
                                            >
                                                <Text style={styles.btnText}>
                                                    {isCompetitionLive ? "Join Race Now" : "Race Concluded"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </Card>
                            )}

                            {/* Leaderboard */}
                            {stats.length > 0 && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Real-time Standings</Text>
                                    </View>

                                    <View style={styles.leaderboard}>
                                        {stats.map((item, index) => (
                                            <View key={item.id} style={[styles.leaderItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={styles.leaderLeft}>
                                                    <Text style={[styles.rankText, { color: colors.textSecondary }]}>#{index + 1}</Text>
                                                    <Text style={[styles.leaderName, { color: colors.text }]}>{item.registration?.full_name}</Text>
                                                </View>
                                                <View style={styles.leaderRight}>
                                                    <Text style={[styles.leaderScore, { color: colors.primary }]}>{item.score}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </>
                    )
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 20 },
    countdownContainer: { alignItems: 'center', marginBottom: 30 },
    countdownLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    timer: { fontSize: 64, fontWeight: '900', marginVertical: 8, letterSpacing: -2 },
    eventTime: { fontSize: 13, fontWeight: '700', marginBottom: 20 },
    compInfo: { padding: 20, borderRadius: 24, width: '100%', alignItems: 'center' },
    compTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
    compDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center', opacity: 0.8 },
    formCard: { padding: 24, borderRadius: 32, borderWidth: 1 },
    formTitle: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
    formSub: { fontSize: 13, fontWeight: '600', marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
    input: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: '600' },
    registerBtn: { height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    joinBtn: { height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 20, width: '100%' },
    btnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    regStatus: { alignItems: 'center', paddingVertical: 10 },
    checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    regOkTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
    regOkSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
    sectionHeader: { marginTop: 30, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
    leaderboard: { gap: 10 },
    leaderItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1 },
    leaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rankText: { fontSize: 14, fontWeight: '900', width: 30 },
    leaderName: { fontSize: 15, fontWeight: '800' },
    leaderRight: { alignItems: 'flex-end' },
    leaderScore: { fontSize: 16, fontWeight: '900' },
    noCompText: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 24 },
    noCompSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 8, opacity: 0.7 },
    waitingBox: { padding: 32, borderRadius: 32, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    waitingTitle: { fontSize: 18, fontWeight: '900', marginTop: 16, textAlign: 'center' },
    waitingSub: { fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center', lineHeight: 20 },
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', marginBottom: 0 },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomWidth: 2 },
    tabText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    historyList: { gap: 16 },
    historyCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 4 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    historyDate: { fontSize: 11, fontWeight: '700' },
    historyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    historyBadgeText: { fontSize: 9, fontWeight: '900' },
    historyTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    historySub: { fontSize: 13, fontWeight: '500' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyText: { marginTop: 16, fontSize: 16, fontWeight: '700' },
    viewResultBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center' }
});
