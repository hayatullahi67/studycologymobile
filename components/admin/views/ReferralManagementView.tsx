import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabaseDatabase';

interface ReferralManagementViewProps {
    onNavigate?: (tab: string) => void;
}

export function ReferralManagementView({ onNavigate }: ReferralManagementViewProps) {
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'payouts' | 'referred_users'>('overview');
    const [loading, setLoading] = useState(true);
    const [referrers, setReferrers] = useState<any[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
    const [referredUsers, setReferredUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [userReferrals, setUserReferrals] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        if (activeSubTab === 'overview') {
            fetchReferrers();
        } else if (activeSubTab === 'payouts') {
            fetchPayoutRequests();
        } else {
            fetchReferralList();
        }
    }, [activeSubTab]);

    const fetchReferrers = async () => {
        try {
            setLoading(true);
            // 1. Get unique referrer IDs from users table (referred_by field)
            const { data: usersWithReferrer, error: relError } = await supabase
                .from('users')
                .select('referred_by')
                .not('referred_by', 'is', null);

            if (relError) throw relError;

            const uniqueReferrerIds = [...new Set(usersWithReferrer?.map(r => r.referred_by) || [])];

            if (uniqueReferrerIds.length === 0) {
                setReferrers([]);
                return;
            }

            // 2. Fetch user details for those IDs
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, name, email, referral_balance')
                .in('id', uniqueReferrerIds)
                .order('referral_balance', { ascending: false });

            if (userError) throw userError;
            setReferrers(users || []);
        } catch (error: any) {
            console.error('Error fetching referrers:', error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayoutRequests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('payout_requests')
                .select(`
                    *,
                    user:users!user_id(name, email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayoutRequests(data || []);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchReferralList = async () => {
        try {
            setLoading(true);
            // Query users table, find referred_by (UUID), and fetch the referrer's details
            const { data, error } = await supabase
                .from('users')
                .select(`
                    id, 
                    name, 
                    email, 
                    created_at,
                    is_paid,
                    referred_by,
                    referrer:users!referred_by(id, name, email)
                `)
                .not('referred_by', 'is', null) // Only show users who were actually referred
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReferredUsers(data || []);
        } catch (error: any) {
            console.error('Error fetching referred users:', error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserReferrals = async (userId: string) => {
        try {
            setLoadingDetails(true);
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, is_paid, created_at')
                .eq('referred_by', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUserReferrals(data || []);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleMarkAsPaid = async (requestId: string, userId: string, amount: number) => {
        Alert.alert(
            "Confirm Payout",
            `Are you sure you want to mark this ₦${amount} payout as paid? This will deduct the amount from the user's balance.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Mark as Paid",
                    onPress: async () => {
                        try {
                            setLoading(true);

                            // 1. Fetch current balance to ensure valid transaction
                            const { data: userData, error: fetchError } = await supabase
                                .from('users')
                                .select('referral_balance')
                                .eq('id', userId)
                                .single();

                            if (fetchError) throw fetchError;

                            if ((userData.referral_balance || 0) < amount) {
                                throw new Error('User balance is now less than the payout amount.');
                            }

                            // 2. Deduct from user balance
                            const { error: balanceError } = await supabase
                                .from('users')
                                .update({ referral_balance: (userData.referral_balance || 0) - amount })
                                .eq('id', userId);

                            if (balanceError) throw balanceError;

                            // 3. Update request status
                            const { error: requestError } = await supabase
                                .from('payout_requests')
                                .update({ status: 'paid' })
                                .eq('id', requestId);

                            if (requestError) throw requestError;

                            Alert.alert('Success', 'Payout marked as paid and balance updated.');
                            fetchPayoutRequests();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderReferrerItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                setSelectedUser(item);
                fetchUserReferrals(item.id);
            }}
        >
            <View style={styles.cardInfo}>
                <Text style={styles.userName}>{item.name || 'User'}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={styles.cardBalance}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.balanceValue}>₦{item.referral_balance}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderPayoutItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.userName}>{item.user?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{item.user?.email}</Text>
                <Text style={styles.bankDetails}>{item.bank_details}</Text>
                <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            <View style={styles.cardAction}>
                <Text style={styles.amountText}>₦{item.amount}</Text>
                <View style={[styles.statusBadge, item.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
                {item.status === 'pending' && (
                    <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handleMarkAsPaid(item.id, item.user_id, item.amount)}
                    >
                        <Text style={styles.payBtnText}>Mark Paid</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (selectedUser) {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedUser(null)}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                    <Text style={styles.backBtnText}>Back to Referrers</Text>
                </TouchableOpacity>

                <View style={styles.userDetailHeader}>
                    <Text style={styles.detailName}>{selectedUser.name}</Text>
                    <Text style={styles.detailEmail}>{selectedUser.email}</Text>
                    <Text style={styles.detailBalance}>Total Balance: ₦{selectedUser.referral_balance}</Text>
                </View>

                <Text style={styles.sectionTitle}>Referrals Breakdown</Text>
                {loadingDetails ? (
                    <ActivityIndicator color="#864b03" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={userReferrals}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.referralCard}>
                                <View>
                                    <Text style={styles.refereeName}>{item.name || 'User'}</Text>
                                    <Text style={styles.refereeEmail}>{item.email}</Text>
                                    <Text style={styles.refereeDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.statusTag, item.is_paid ? styles.statusPaid : styles.statusPending]}>
                                        {item.is_paid ? 'ACTIVATED' : 'PENDING'}
                                    </Text>
                                    {item.is_paid && <Text style={styles.earnedText}>+₦500</Text>}
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyText}>No referrals found for this user.</Text>}
                    />
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Referral Management</Text>
                <View style={styles.subTabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeSubTab === 'overview' && styles.activeTab]}
                        onPress={() => setActiveSubTab('overview')}
                    >
                        <Text style={[styles.tabText, activeSubTab === 'overview' && styles.activeTabText]}>Referrers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeSubTab === 'payouts' && styles.activeTab]}
                        onPress={() => setActiveSubTab('payouts')}
                    >
                        <Text style={[styles.tabText, activeSubTab === 'payouts' && styles.activeTabText]}>Payouts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeSubTab === 'referred_users' && styles.activeTab]}
                        onPress={() => setActiveSubTab('referred_users')}
                    >
                        <Text style={[styles.tabText, activeSubTab === 'referred_users' && styles.activeTabText]}>Referred Users</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator color="#864b03" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={
                        activeSubTab === 'overview' ? referrers :
                            activeSubTab === 'payouts' ? payoutRequests :
                                referredUsers
                    }
                    keyExtractor={(item) => item.id}
                    renderItem={
                        activeSubTab === 'overview' ? renderReferrerItem :
                            activeSubTab === 'payouts' ? renderPayoutItem :
                                renderReferralItem
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No data found.</Text>}
                />
            )}
        </View>
    );
}

const renderReferralItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
        <View style={styles.cardInfo}>
            <Text style={styles.userName}>{item.name || 'User'}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.dateText}>Joined: {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.cardAction}>
            <Text style={styles.balanceLabel}>Referred By:</Text>
            {item.referrer ? (
                <View>
                    <Text style={[styles.userName, { fontSize: 13 }]}>{item.referrer.name || 'User'}</Text>
                    <Text style={[styles.userEmail, { fontSize: 11 }]}>{item.referrer.email}</Text>
                </View>
            ) : (
                <Text style={styles.dateText}>Direct Signup</Text>
            )}
            <View style={[styles.statusBadge, item.is_paid ? styles.statusPaid : styles.statusPending, { marginTop: 4 }]}>
                <Text style={styles.statusText}>{item.is_paid ? 'ACTIVATED' : 'PENDING'}</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
    header: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 16 },
    subTabs: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#FFFFFF', elevation: 2 },
    tabText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    activeTabText: { color: '#864b03' },
    card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    cardInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    userEmail: { fontSize: 13, color: '#64748B' },
    cardBalance: { alignItems: 'flex-end' },
    balanceLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
    balanceValue: { fontSize: 18, fontWeight: '900', color: '#864b03' },
    cardAction: { alignItems: 'flex-end', gap: 8 },
    amountText: { fontSize: 18, fontWeight: '900', color: '#166534' },
    bankDetails: { fontSize: 13, color: '#334155', marginTop: 4, fontWeight: '600' },
    dateText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusPaid: { backgroundColor: '#DCFCE7', color: '#166534' },
    statusPending: { backgroundColor: '#FEF3C7', color: '#92400E' },
    statusText: { fontSize: 10, fontWeight: '900' },
    payBtn: { backgroundColor: '#864b03', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    payBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
    backBtnText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    userDetailHeader: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    detailName: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
    detailEmail: { fontSize: 14, color: '#64748B' },
    detailBalance: { fontSize: 16, fontWeight: '800', color: '#864b03', marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
    referralCard: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    refereeName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    refereeEmail: { fontSize: 13, color: '#64748B' },
    refereeDate: { fontSize: 11, color: '#94A3B8' },
    statusTag: { fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    earnedText: { fontSize: 13, fontWeight: '900', color: '#166534', marginTop: 4 },
    emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
});
