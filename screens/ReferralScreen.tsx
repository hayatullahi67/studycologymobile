import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen, Header } from '../components/Layout';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../services/supabaseDatabase';

export function ReferralScreen() {
    const navigation = useNavigation();
    const { userProfile } = useAppStore();
    const [referrals, setReferrals] = useState<any[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestingPayout, setRequestingPayout] = useState(false);
    const [bankDetails, setBankDetails] = useState('');
    const [payoutAmount, setPayoutAmount] = useState('');
    const [showPayoutForm, setShowPayoutForm] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([
            fetchReferrals(),
            fetchPayoutRequests()
        ]);
        setLoading(false);
    };

    const fetchReferrals = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, is_paid, created_at')
                .eq('referred_by', userProfile?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReferrals(data || []);
        } catch (error: any) {
            console.error('Error fetching referrals:', error.message);
        }
    };

    const fetchPayoutRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('payout_requests')
                .select('*')
                .eq('user_id', userProfile?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayoutRequests(data || []);
        } catch (error: any) {
            console.error('Error fetching payouts:', error.message);
        }
    };

    const handleRequestPayout = async () => {
        if (!bankDetails || !payoutAmount) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (amount > (userProfile?.referral_balance || 0)) {
            Alert.alert('Error', 'Insufficient balance');
            return;
        }

        try {
            setRequestingPayout(true);
            const { error } = await supabase
                .from('payout_requests')
                .insert([{
                    user_id: userProfile?.id,
                    amount: amount,
                    bank_details: bankDetails,
                    status: 'pending'
                }]);

            if (error) throw error;

            Alert.alert('Success', 'Payout request submitted successfully!');
            setShowPayoutForm(false);
            setBankDetails('');
            setPayoutAmount('');
            fetchPayoutRequests();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setRequestingPayout(false);
        }
    };

    const renderReferralItem = (item: any) => (
        <View key={item.id} style={styles.referralItem}>
            <View style={styles.referralInfo}>
                <Text style={styles.referralName}>{item.name || 'User'}</Text>
                <Text style={styles.referralEmail}>{item.email}</Text>
                <Text style={styles.referralDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.referralStatus}>
                <Text style={[styles.statusTag, item.is_paid ? styles.statusPaid : styles.statusPending]}>
                    {item.is_paid ? 'Activated' : 'Pending'}
                </Text>
                {item.is_paid && <Text style={styles.commissionText}>+₦500</Text>}
            </View>
        </View>
    );

    const renderPayoutItem = (item: any) => (
        <View key={item.id} style={styles.payoutItem}>
            <View>
                <Text style={styles.payoutAmount}>₦{item.amount}</Text>
                <View style={[styles.statusTagSmall, item.status === 'paid' ? styles.statusPaid : (item.status === 'rejected' ? styles.statusRejected : styles.statusPending)]}>
                    <Text style={styles.statusTagText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>
            <Text style={styles.payoutDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
    );

    return (
        <Screen style={styles.bg}>
            <Header title="Referral Program" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.statsCard}>
                    <Text style={styles.statsLabel}>Total Balance</Text>
                    <Text style={styles.statsValue}>₦{userProfile?.referral_balance || 0}</Text>

                    {payoutRequests.some(r => r.status === 'pending') ? (
                        <View style={styles.pendingBadge}>
                            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.pendingText}>Pending Payout Request</Text>
                        </View>
                    ) : (
                        <Button
                            onPress={() => setShowPayoutForm(!showPayoutForm)}
                            style={styles.payoutBtn}
                            textStyle={{ color: '#864b03' }}
                        >
                            Request Payout
                        </Button>
                    )}
                </View>

                {showPayoutForm && (
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Request Payout</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Amount to Withdraw</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 1000"
                                keyboardType="numeric"
                                value={payoutAmount}
                                onChangeText={setPayoutAmount}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bank Details (Bank Name, Acc Number, Name)</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                placeholder="Enter your bank details"
                                multiline
                                value={bankDetails}
                                onChangeText={setBankDetails}
                            />
                        </View>
                        <Button
                            onPress={handleRequestPayout}
                            disabled={requestingPayout}
                        >
                            {requestingPayout ? <ActivityIndicator color="#FFFFFF" /> : 'Submit Request'}
                        </Button>
                    </View>
                )}

                <View style={styles.shareSection}>
                    <Text style={styles.sectionTitle}>Your Referral Email</Text>
                    <View style={styles.copyBox}>
                        <Text style={styles.referralText}>{userProfile?.email}</Text>
                        <TouchableOpacity onPress={() => Alert.alert('Copied', 'Referral email copied to clipboard')}>
                            <Ionicons name="copy-outline" size={20} color="#864b03" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.shareHint}>Ask your friends to enter this email when they sign up.</Text>
                </View>

                <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Your Referrals</Text>
                    {loading ? (
                        <ActivityIndicator color="#864b03" style={{ marginTop: 20 }} />
                    ) : referrals.length > 0 ? (
                        referrals.map(renderReferralItem)
                    ) : (
                        <Text style={styles.emptyText}>No referrals yet. Start inviting friends!</Text>
                    )}
                </View>

                <View style={[styles.listSection, { marginBottom: 40 }]}>
                    <Text style={styles.sectionTitle}>Payout History</Text>
                    {loading ? (
                        <ActivityIndicator color="#864b03" style={{ marginTop: 20 }} />
                    ) : payoutRequests.length > 0 ? (
                        payoutRequests.map(renderPayoutItem)
                    ) : (
                        <Text style={styles.emptyText}>No payout history.</Text>
                    )}
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { backgroundColor: '#F8FAFC' },
    container: { padding: 20 },
    statsCard: {
        backgroundColor: '#864b03',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    statsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    statsValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginBottom: 16 },
    payoutBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 24, height: 44, borderRadius: 12 },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
    },
    pendingText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    formCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    formTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC' },
    shareSection: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
    copyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    referralText: { fontSize: 15, fontWeight: '700', color: '#864b03' },
    shareHint: { fontSize: 12, color: '#64748B', marginTop: 8, textAlign: 'center' },
    listSection: { marginTop: 10 },
    referralItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    referralInfo: { flex: 1 },
    referralName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    referralEmail: { fontSize: 13, color: '#64748B' },
    referralDate: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
    referralStatus: { alignItems: 'flex-end' },
    statusTag: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
    statusPaid: { backgroundColor: '#DCFCE7', color: '#166534' },
    statusPending: { backgroundColor: '#FEF3C7', color: '#92400E' },
    commissionText: { fontSize: 13, fontWeight: '900', color: '#166534', marginTop: 4 },
    emptyText: { textAlign: 'center', color: '#64748B', marginTop: 10, fontSize: 14 },
    payoutItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    payoutAmount: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
    payoutDate: { fontSize: 12, color: '#94A3B8' },
    statusTagSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' },
    statusTagText: { fontSize: 10, fontWeight: '900' },
    statusRejected: { backgroundColor: '#FEE2E2', color: '#991B1B' },
});
