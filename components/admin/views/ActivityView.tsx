import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface ActivityViewProps {
    onBack?: () => void;
}

interface Activity {
    id: string;
    text: string;
    time: string;
    user: string;
    icon: string;
    color: string;
    type: 'content' | 'admin' | 'user' | 'system';
    details?: string;
    rawTime: string; // Used for sorting
}

export function ActivityView({ onBack }: ActivityViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadActivities();
        }, [])
    );

    const loadActivities = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getRecentActivity(50);

            // Map to Activity interface if needed, although service already returns compatible structure
            const formatted: Activity[] = data.map((item: any) => ({
                id: item.id || Math.random().toString(),
                text: item.text,
                time: getTimeAgo(item.time),
                rawTime: item.time,
                user: item.user || 'Admin',
                icon: item.icon,
                color: item.color || '#3B82F6',
                type: item.type as any,
                details: item.details
            }));

            setActivities(formatted);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load activities');
        } finally {
            setLoading(false);
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };



    const handleActivityPress = (activity: Activity) => {
        setSelectedActivity(activity);
    };

    const handleCloseDetail = () => {
        setSelectedActivity(null);
    };

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                {onBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#4E342E" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 44 }} />
                )}
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.headerTitle, { color: '#000000' }]}>Audit Log</Text>
                    <Text style={[styles.headerSub, { color: '#64748B' }]}>Historical record of changes</Text>
                </View>
                <TouchableOpacity onPress={loadActivities} style={[styles.refreshBtn, { backgroundColor: '#FFF8F6' }]}>
                    <Ionicons name="refresh" size={22} color="#4E342E" />
                </TouchableOpacity>
            </View>



            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#4E342E" />
                    <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Syncing logs...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {activities.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={80} color="#E2E8F0" />
                            <Text style={[styles.emptyText, { color: colors.text }]}>No activities found</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Recent actions will appear here once they occur.</Text>
                        </View>
                    ) : (
                        activities.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.activityItem, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}
                                onPress={() => handleActivityPress(item)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.activityIcon, { backgroundColor: '#FFF8F6' }]}>
                                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={[styles.activityText, { color: '#3E2723' }]} numberOfLines={2}>{item.text}</Text>
                                    <View style={styles.metaRow}>
                                        <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                                        <Text style={[styles.activityTime, { color: '#64748B' }]}>{item.time}</Text>
                                        <Text style={[styles.dot, { color: '#64748B' }]}>•</Text>
                                        <Text style={[styles.activityUser, { color: '#864b03' }]}>{item.user}</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#D7CCC8" />
                            </TouchableOpacity>
                        ))
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* Activity Detail Modal */}
            <Modal
                visible={selectedActivity !== null}
                transparent
                animationType="slide"
                onRequestClose={handleCloseDetail}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={handleCloseDetail} style={[styles.modalBackBtn, { backgroundColor: colors.background }]}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Activity Trace</Text>
                            <View style={{ width: 44 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
                            {selectedActivity && (
                                <>
                                    <View style={[styles.detailHero, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <View style={[styles.detailIconBox, { backgroundColor: colors.surface, shadowColor: selectedActivity.color, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 }]}>
                                            <Ionicons
                                                name={selectedActivity.icon as any}
                                                size={36}
                                                color={selectedActivity.color}
                                            />
                                        </View>
                                        <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedActivity.text}</Text>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>IDENTIFICATION</Text>
                                        <View style={[styles.detailRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Triggered By</Text>
                                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedActivity.user}</Text>
                                        </View>
                                        <View style={[styles.detailRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Occurrence</Text>
                                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedActivity.time}</Text>
                                        </View>
                                        <View style={[styles.detailRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
                                            <View style={[styles.detailBadge, { backgroundColor: `${selectedActivity.color}15`, borderColor: `${selectedActivity.color}30` }]}>
                                                <Text style={[styles.detailBadgeText, { color: selectedActivity.color }]}>
                                                    {selectedActivity.type.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>METADATA / CONTENT</Text>
                                        <View style={[styles.detailDescription, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <Text style={[styles.detailDescriptionText, { color: colors.text }]}>
                                                {selectedActivity.details || 'No extended metadata available for this trace.'}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={handleCloseDetail}>
                            <Text style={styles.closeBtnText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, marginTop: 2, fontWeight: '600' },
    refreshBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    filterContainer: { paddingHorizontal: 20, paddingVertical: 16 },
    filterBar: { flexDirection: 'row', borderRadius: 16, padding: 6 },
    filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    activeFilterTab: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    filterTabText: { fontSize: 13, fontWeight: '700' },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10
    },
    activityIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    activityContent: { flex: 1, marginLeft: 16 },
    activityText: { fontSize: 15, fontWeight: '800', marginBottom: 4, lineHeight: 20 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    activityTime: { fontSize: 12, fontWeight: '600' },
    dot: { fontSize: 12, marginHorizontal: 6 },
    activityUser: { fontSize: 12, fontWeight: '800' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { fontSize: 20, fontWeight: '900', marginTop: 20 },
    emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
    modalContent: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        maxHeight: '90%',
        paddingBottom: 20,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%'
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24, borderBottomWidth: 1, justifyContent: 'space-between' },
    modalBackBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    detailContent: { paddingHorizontal: 20, paddingVertical: 24 },
    detailHero: { alignItems: 'center', marginBottom: 32, paddingVertical: 32, paddingHorizontal: 20, borderRadius: 32, borderWidth: 1 },
    detailIconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    detailTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', lineHeight: 26 },
    detailSection: { marginBottom: 28 },
    detailSectionTitle: { fontSize: 11, fontWeight: '900', marginBottom: 14, letterSpacing: 1.5 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 20, marginBottom: 10, borderWidth: 1 },
    detailLabel: { fontSize: 14, fontWeight: '700' },
    detailValue: { fontSize: 14, fontWeight: '900' },
    detailBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
    detailBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    detailDescription: { paddingHorizontal: 20, paddingVertical: 20, borderRadius: 24, borderWidth: 1 },
    detailDescriptionText: { fontSize: 14, lineHeight: 24, fontWeight: '600' },
    closeBtn: { marginHorizontal: 20, marginVertical: 10, paddingVertical: 16, borderRadius: 20, alignItems: 'center', elevation: 4, backgroundColor: '#4E342E' },
    closeBtnText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' }
});
