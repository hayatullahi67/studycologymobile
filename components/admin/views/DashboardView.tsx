import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatCard } from '../../admin/StatCard';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface DashboardViewProps {
    onNavigate: (view: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light;
    const [stats, setStats] = useState({ subjects: 0, questions: 0, notes: 0, pdfs: 0 });
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [s, a] = await Promise.all([
                supabaseDB.getDashboardStats(),
                supabaseDB.getRecentActivity()
            ]);
            setStats(s || { subjects: 0, questions: 0, notes: 0, pdfs: 0 });
            setActivities(a || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 84600) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching real-time insights...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: '#FFF8F6' }]} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Overview Stats */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#864b03' }]}>SYSTEM OVERVIEW</Text>
                <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={16} color="#4E342E" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    label="Total Subjects"
                    count={stats.subjects.toString()}
                    icon="book"
                    color={'#864b03'}
                    bgColor={'#FFFBEB'}
                />
                <StatCard
                    label="Exam Questions"
                    count={stats.questions.toString()}
                    icon="documents"
                    color={'#864b03'}
                    bgColor={'#FFFBEB'}
                />
                <StatCard
                    label="PDF Files"
                    count={stats.pdfs.toString()}
                    icon="cloud-upload"
                    color={'#864b03'}
                    bgColor={'#FFFBEB'}
                />
                <StatCard
                    label="Total Notes"
                    count={stats.notes.toString()}
                    icon="create"
                    color={'#864b03'}
                    bgColor={'#FFFBEB'}
                />
            </View>

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { color: '#864b03', marginTop: 24 }]}>CONTENT MANAGEMENT</Text>
            <View style={styles.actionsGrid}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('users')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="people-circle" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>User Management</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('library')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="library" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Question Bank</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('upload_pq')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="cloud-upload" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Upload PDFs</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('import_questions')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="cloud-download" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Online Import</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('notes')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="create" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Study Notes</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('manual_entry')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="create" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Manual Add</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('jamb_text')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="book" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>JAMB Texts</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('ads')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="megaphone" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Manage Ads</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('career_inst')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="school" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Career & Inst</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('competitions')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="trophy" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Competitions</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('referrals')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="people" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Referrals</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('activity')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="pulse" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Activity Log</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                    onPress={() => onNavigate('admin_registration')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF8F6' }]}>
                        <Ionicons name="person-add" size={24} color={'#4E342E'} />
                    </View>
                    <Text style={[styles.actionText, { color: '#3E2723' }]}>Admin Registration</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#D7CCC8'} style={styles.actionArrow} />
                </TouchableOpacity>
            </View>

            {/* Recent Activity */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#864b03' }]}>RECENT ACTIVITY</Text>
                <TouchableOpacity onPress={() => onNavigate('activity')}>
                    <Text style={[styles.viewAllText, { color: '#864b03' }]}>View Detailed Log</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.activityList, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                {activities.length > 0 ? (
                    activities.map((item, index) => (
                        <View key={index} style={[styles.activityItem, { borderBottomColor: '#EFEBE9' }, index === activities.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={[styles.activityLabelIcon, { backgroundColor: '#FFF8F6' }]}>
                                <Ionicons name={item.icon || 'star'} size={14} color={'#64748B'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.activityText, { color: '#3E2723' }]} numberOfLines={1}>{item.text}</Text>
                                <View style={styles.activityMeta}>
                                    <Ionicons name="time-outline" size={10} color={'#64748B'} style={{ marginRight: 4 }} />
                                    <Text style={[styles.activityTime, { color: '#64748B' }]}>{formatTime(item.time)}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                        <Ionicons name="analytics-outline" size={40} color={'#E2E8F0'} />
                        <Text style={{ color: '#64748B', fontWeight: '700', marginTop: 12 }}>System idle.</Text>
                    </View>
                )}
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 40,
        backgroundColor: '#FFF8F6',
        maxWidth: 900,
        alignSelf: 'center',
        width: '100%'
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F6' },
    loadingText: { marginTop: 16, fontWeight: '700', fontSize: 13, color: '#64748B' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
    sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: '#864b03' },
    refreshBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
    viewAllText: { fontSize: 12, fontWeight: '800', color: '#864b03' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 24, marginTop: 16 },
    actionBtn: { width: '31%', minHeight: 110, padding: 14, borderRadius: 18, alignItems: 'flex-start', justifyContent: 'space-between', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, position: 'relative', backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
    actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: '#FFF8F6' },
    actionText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.2, color: '#3E2723' },
    actionArrow: { position: 'absolute', top: 12, right: 12, color: '#D7CCC8' },
    activityList: { borderRadius: 28, padding: 8, borderWidth: 1, elevation: 1, backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
    activityItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: '#EFEBE9' },
    activityLabelIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F6' },
    activityText: { fontSize: 14, fontWeight: '700', marginBottom: 2, color: '#3E2723' },
    activityMeta: { flexDirection: 'row', alignItems: 'center' },
    activityTime: { fontSize: 11, fontWeight: '600', color: '#64748B' }
});
