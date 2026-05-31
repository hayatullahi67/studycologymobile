import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    ScrollView,
    Linking,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabaseDatabase';

// ─── Color palette (matches the rest of admin) ───────────────────────────────
const C = {
    primary:      '#864b03',
    primaryLight: '#FFF8F6',
    primaryDeep:  '#3E2723',
    orange:       '#E65100',
    bg:           '#F8FAFC',
    white:        '#FFFFFF',
    border:       '#E2E8F0',
    borderBrown:  '#D7CCC8',
    text:         '#1E293B',
    muted:        '#64748B',
    faint:        '#94A3B8',
    green:        '#166534',
    greenBg:      '#DCFCE7',
    amber:        '#92400E',
    amberBg:      '#FEF3C7',
    red:          '#991B1B',
    redBg:        '#FEE2E2',
};

interface AppUser {
    id: string;
    email: string;
    name?: string;
    role: 'user' | 'admin';
    is_paid: boolean;
    created_at: string;
    referral_balance?: number;
}

interface UserManagementViewProps {
    onBack?: () => void;
    onNavigate?: (tab: string) => void;
}

// ─── Email composer modal ─────────────────────────────────────────────────────
function EmailModal({
    visible,
    onClose,
    recipients,
    isBulk,
}: {
    visible: boolean;
    onClose: () => void;
    recipients: AppUser[];
    isBulk: boolean;
}) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const handleSend = () => {
        if (!subject.trim() || !body.trim()) {
            Alert.alert('Required', 'Please fill in both subject and message body.');
            return;
        }
        const emailList = recipients.map((u) => u.email).join(',');
        const mailto = `mailto:${emailList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        Linking.openURL(mailto).catch(() =>
            Alert.alert('Error', 'Could not open email client.')
        );
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.modalBox}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {isBulk ? `Bulk Email (${recipients.length} users)` : `Email ${recipients[0]?.name || recipients[0]?.email || ''}`}
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                                <Ionicons name="close" size={22} color={C.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.fieldLabel}>Subject</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email subject..."
                            placeholderTextColor={C.faint}
                            value={subject}
                            onChangeText={setSubject}
                        />

                        <Text style={styles.fieldLabel}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Write your message here..."
                            placeholderTextColor={C.faint}
                            value={body}
                            onChangeText={setBody}
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.modalInfo}>
                            <Ionicons name="information-circle-outline" size={14} color={C.muted} />
                            <Text style={styles.modalInfoText}>
                                This opens your default email client to send the message.
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                            <Ionicons name="mail" size={18} color={C.white} />
                            <Text style={styles.sendBtnText}>Open Email Client</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export function UserManagementView({ onBack, onNavigate }: UserManagementViewProps) {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [filtered, setFiltered] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
    const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'free'>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [emailModalVisible, setEmailModalVisible] = useState(false);
    const [emailTargets, setEmailTargets] = useState<AppUser[]>([]);
    const [isBulkEmail, setIsBulkEmail] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('id, email, name, role, is_paid, created_at, referral_balance')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers((data || []) as AppUser[]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // ── Filter logic ──────────────────────────────────────────────────────────
    useEffect(() => {
        let list = [...users];

        if (roleFilter !== 'all') {
            list = list.filter((u) => u.role === roleFilter);
        }
        if (paidFilter === 'paid') {
            list = list.filter((u) => u.is_paid);
        } else if (paidFilter === 'free') {
            list = list.filter((u) => !u.is_paid);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (u) =>
                    u.email.toLowerCase().includes(q) ||
                    (u.name || '').toLowerCase().includes(q)
            );
        }
        setFiltered(list);
    }, [users, search, roleFilter, paidFilter]);

    // ── Toggle role ───────────────────────────────────────────────────────────
    const handleToggleRole = (user: AppUser) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        Alert.alert(
            'Change Role',
            `Set ${user.name || user.email} as ${newRole.toUpperCase()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            setUpdatingId(user.id);
                            const { error } = await supabase
                                .from('users')
                                .update({ role: newRole })
                                .eq('id', user.id);
                            if (error) throw error;
                            setUsers((prev) =>
                                prev.map((u) =>
                                    u.id === user.id ? { ...u, role: newRole } : u
                                )
                            );
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        } finally {
                            setUpdatingId(null);
                        }
                    },
                },
            ]
        );
    };

    // ── Open email modal ──────────────────────────────────────────────────────
    const openEmailForUser = (user: AppUser) => {
        setEmailTargets([user]);
        setIsBulkEmail(false);
        setEmailModalVisible(true);
    };

    const openBulkEmail = () => {
        if (filtered.length === 0) {
            Alert.alert('No Users', 'There are no users matching the current filter.');
            return;
        }
        setEmailTargets(filtered);
        setIsBulkEmail(true);
        setEmailModalVisible(true);
    };

    // ── User row renderer ─────────────────────────────────────────────────────
    const renderUser = ({ item }: { item: AppUser }) => {
        const isAdmin = item.role === 'admin';
        const isUpdating = updatingId === item.id;
        const joined = new Date(item.created_at).toLocaleDateString(undefined, {
            day: 'numeric', month: 'short', year: 'numeric',
        });

        return (
            <View style={styles.userCard}>
                {/* Avatar initial */}
                <View style={[styles.avatar, { backgroundColor: isAdmin ? C.primaryLight : '#EFF6FF' }]}>
                    <Text style={[styles.avatarText, { color: isAdmin ? C.primary : '#3B82F6' }]}>
                        {(item.name || item.email || '?')[0].toUpperCase()}
                    </Text>
                </View>

                {/* Info */}
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {item.name || 'No name'}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                    <View style={styles.userMeta}>
                        {/* Role badge */}
                        <View style={[styles.badge, isAdmin ? styles.badgeAdmin : styles.badgeUser]}>
                            <Text style={[styles.badgeText, isAdmin ? styles.badgeTextAdmin : styles.badgeTextUser]}>
                                {item.role.toUpperCase()}
                            </Text>
                        </View>
                        {/* Premium badge */}
                        <View style={[styles.badge, item.is_paid ? styles.badgePaid : styles.badgeFree]}>
                            <Text style={[styles.badgeText, item.is_paid ? styles.badgeTextPaid : styles.badgeTextFree]}>
                                {item.is_paid ? 'PREMIUM' : 'FREE'}
                            </Text>
                        </View>
                        <Text style={styles.joinDate}>{joined}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {/* Email individual */}
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openEmailForUser(item)}
                    >
                        <Ionicons name="mail-outline" size={18} color={C.primary} />
                    </TouchableOpacity>

                    {/* Toggle role */}
                    <TouchableOpacity
                        style={[styles.actionBtn, isAdmin && styles.actionBtnActive]}
                        onPress={() => handleToggleRole(item)}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <ActivityIndicator size="small" color={C.primary} />
                        ) : (
                            <Ionicons
                                name={isAdmin ? 'shield' : 'shield-outline'}
                                size={18}
                                color={isAdmin ? C.white : C.primary}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ── Stats ─────────────────────────────────────────────────────────────────
    const totalUsers = users.length;
    const totalPaid = users.filter((u) => u.is_paid).length;
    const totalAdmins = users.filter((u) => u.role === 'admin').length;

    const renderHeader = useCallback(() => (
        <View style={styles.header}>
            {onBack && (
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Ionicons name="arrow-back" size={22} color={C.text} />
                    <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
            )}
            <View style={styles.headerRow}>
                <Text style={styles.title}>User Management</Text>
                <TouchableOpacity style={styles.bulkEmailBtn} onPress={openBulkEmail}>
                    <Ionicons name="mail" size={16} color={C.white} />
                    <Text style={styles.bulkEmailBtnText}>
                        Bulk Email ({filtered.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Stats row ─────────────────────────────────────────── */}
            <View style={styles.statsRow}>
                <View style={styles.statPill}>
                    <Text style={styles.statNum}>{totalUsers}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statPill}>
                    <Text style={[styles.statNum, { color: C.green }]}>{totalPaid}</Text>
                    <Text style={styles.statLabel}>Premium</Text>
                </View>
                <View style={styles.statPill}>
                    <Text style={[styles.statNum, { color: C.primary }]}>{totalAdmins}</Text>
                    <Text style={styles.statLabel}>Admins</Text>
                </View>
                <View style={styles.statPill}>
                    <Text style={[styles.statNum, { color: '#3B82F6' }]}>{totalUsers - totalPaid}</Text>
                    <Text style={styles.statLabel}>Free</Text>
                </View>
            </View>

            {/* ── Search ───────────────────────────────────────────── */}
            <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={16} color={C.muted} style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or email..."
                    placeholderTextColor={C.faint}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color={C.faint} />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Filter chips ──────────────────────────────────────── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {/* Role filters */}
                {(['all', 'user', 'admin'] as const).map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.chip, roleFilter === r && styles.chipActive]}
                        onPress={() => setRoleFilter(r)}
                    >
                        <Text style={[styles.chipText, roleFilter === r && styles.chipTextActive]}>
                            {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
                        </Text>
                    </TouchableOpacity>
                ))}

                <View style={styles.chipDivider} />

                {/* Paid filters */}
                {(['all', 'paid', 'free'] as const).map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.chip, paidFilter === p && styles.chipActive]}
                        onPress={() => setPaidFilter(p)}
                    >
                        <Text style={[styles.chipText, paidFilter === p && styles.chipTextActive]}>
                            {p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* ── Results count + refresh ───────────────────────────── */}
            <View style={styles.resultsRow}>
                <Text style={styles.resultsCount}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchUsers}>
                    <Ionicons name="refresh" size={15} color={C.primary} />
                </TouchableOpacity>
            </View>
        </View>
    ), [onBack, filtered.length, totalUsers, totalPaid, totalAdmins, search, roleFilter, paidFilter, fetchUsers]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
            <FlatList
                ListHeaderComponent={renderHeader}
                data={loading ? [] : filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={C.primary} />
                            <Text style={styles.loadingText}>Loading users...</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons name="people-outline" size={48} color={C.faint} />
                            <Text style={styles.emptyText}>No users found.</Text>
                        </View>
                    )
                }
            />

            {/* ── Email modal ─────────────────────────────────────────────────── */}
            <EmailModal
                visible={emailModalVisible}
                onClose={() => setEmailModalVisible(false)}
                recipients={emailTargets}
                isBulk={isBulkEmail}
            />
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    // Header
    header: { backgroundColor: C.white, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    backBtnText: { fontSize: 15, fontWeight: '700', color: C.text },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    title: { fontSize: 15, fontWeight: '900', color: C.text  },

    bulkEmailBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 12,
    },
    bulkEmailBtnText: { color: C.white, fontSize: 13, fontWeight: '800' },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statPill: {
        flex: 1, backgroundColor: C.primaryLight,
        borderRadius: 12, padding: 10, alignItems: 'center',
    },
    statNum: { fontSize: 20, fontWeight: '900', color: C.primaryDeep },
    statLabel: { fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 2 },

    // Search
    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F1F5F9', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 14, color: C.text },

    // Filters
    filterRow: { marginBottom: 12 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, backgroundColor: '#F1F5F9',
        marginRight: 8, borderWidth: 1, borderColor: 'transparent',
    },
    chipActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: C.muted },
    chipTextActive: { color: C.primary },
    chipDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 6, alignSelf: 'center', height: 16 },

    // Results bar
    resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultsCount: { fontSize: 12, fontWeight: '800', color: C.muted },
    refreshBtn: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: C.borderBrown, backgroundColor: C.white,
    },

    // User cards
    listContent: { padding: 12, paddingBottom: 40 },
    separator: { height: 1, backgroundColor: C.border },
    userCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.white, borderRadius: 16,
        padding: 14, marginVertical: 4,
        borderWidth: 1, borderColor: C.border,
    },

    avatar: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    avatarText: { fontSize: 18, fontWeight: '900' },

    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '800', color: C.text },
    userEmail: { fontSize: 12, color: C.muted, marginTop: 1 },
    userMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },

    badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    badgeAdmin:     { backgroundColor: '#FFF8F6' },
    badgeUser:      { backgroundColor: '#EFF6FF' },
    badgePaid:      { backgroundColor: C.greenBg },
    badgeFree:      { backgroundColor: '#F1F5F9' },
    badgeText:      { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    badgeTextAdmin: { color: C.primary },
    badgeTextUser:  { color: '#3B82F6' },
    badgeTextPaid:  { color: C.green },
    badgeTextFree:  { color: C.muted },
    joinDate: { fontSize: 10, color: C.faint, fontWeight: '600' },

    // Action buttons (email + role toggle)
    actions: { flexDirection: 'row', gap: 8, marginLeft: 10 },
    actionBtn: {
        width: 36, height: 36, borderRadius: 10,
        borderWidth: 1, borderColor: C.borderBrown,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.white,
    },
    actionBtnActive: { backgroundColor: C.primary, borderColor: C.primary },

    // Empty / Loading
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontWeight: '700', color: C.muted },
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 14, fontWeight: '700', color: C.faint },

    // Email modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 36,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: '900', color: C.text, flex: 1, marginRight: 12 },
    modalClose: { padding: 4 },
    fieldLabel: { fontSize: 12, fontWeight: '800', color: C.primary, marginBottom: 6, letterSpacing: 0.5 },
    input: {
        borderWidth: 1, borderColor: C.border, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 14, color: C.text, marginBottom: 16, backgroundColor: '#F8FAFC',
    },
    textArea: { minHeight: 120 },
    modalInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
    modalInfoText: { fontSize: 12, color: C.muted, flex: 1 },
    sendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14,
    },
    sendBtnText: { color: C.white, fontSize: 15, fontWeight: '900' },
});
