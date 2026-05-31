import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../store/useAppStore';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { ThemeColors } from '../../../theme/colors';

interface AdminUserItem {
  id: string;
  email: string;
  name?: string;
  assigned_view?: string | null;
  created_at: string;
}

interface AdminRegistrationViewProps {
  onBack?: () => void;
}

export function AdminRegistrationView({ onBack }: AdminRegistrationViewProps) {
  const { userProfile } = useAppStore();
  const colors = ThemeColors.light;
  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperAdmin = userProfile?.role === 'admin';

  const loadAdmins = async () => {
    setRefreshing(true);
    try {
      const adminList = await supabaseDB.getAdminUsers();
      setAdmins(adminList);
    } catch (error) {
      console.error('Error loading admins:', error);
      Alert.alert('Error', 'Unable to load admin list.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreateAdmin = async () => {
    if (!email.trim() || !name.trim() || !password || !confirmPassword) {
      return Alert.alert('Validation', 'All fields are required.');
    }

    if (password !== confirmPassword) {
      return Alert.alert('Validation', 'Passwords do not match.');
    }

    setLoading(true);
    try {
      await supabaseDB.signUpAdminUser(email.trim(), password, name.trim());
      Alert.alert('Success', 'Admin account created successfully.');
      setEmail('');
      setName('');
      setPassword('');
      setConfirmPassword('');
      await loadAdmins();
    } catch (error: any) {
      console.error('Admin signup failed:', error);
      Alert.alert('Error', error?.message || 'Could not create admin user.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <View style={[styles.accessDenied, { backgroundColor: colors.background }]}> 
        <Ionicons name="lock-closed" size={64} color="#E65100" />
        <Text style={styles.accessDeniedTitle}>Restricted Access</Text>
        <Text style={styles.accessDeniedText}>
          Only the parent admin can access the admin registration panel.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#FFF8F6' }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: '#000000' }]}>Admin Registration</Text>
          <Text style={[styles.subtitle, { color: '#64748B' }]}>Create a new admin account with admin role.</Text>
        </View>
      </View>

      <View style={[styles.formCard, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}> 
        <Text style={[styles.sectionTitle, { color: '#3E2723' }]}>New Admin Details</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="admin@example.com"
            placeholderTextColor="#A8A29E"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Admin Name"
            placeholderTextColor="#A8A29E"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter password"
            placeholderTextColor="#A8A29E"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm password"
            placeholderTextColor="#A8A29E"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleCreateAdmin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitLabel}>Create Admin</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionHeader, { marginTop: 24 }]}> 
        <Text style={[styles.sectionTitle, { color: '#64748B' }]}>Registered Admins</Text>
        <Text style={[styles.sectionSubtitle, { color: '#64748B' }]}>Parent admin and assigned admin accounts.</Text>
      </View>

      <View style={[styles.tableCard, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}> 
        {refreshing ? (
          <ActivityIndicator size="small" color="#864b03" style={{ marginVertical: 24 }} />
        ) : admins.length === 0 ? (
          <Text style={styles.emptyText}>No registered admins yet.</Text>
        ) : (
          admins.map((admin) => (
            <View key={admin.id} style={styles.adminRow}>
              <View style={styles.adminRowText}>
                <Text style={styles.adminName}>{admin.name || 'Unnamed Admin'}</Text>
                <Text style={styles.adminMeta}>{admin.email}</Text>
              </View>
              <View style={styles.adminStatus}>
                <Text style={styles.adminStatusText}>
                  {admin.assigned_view ? admin.assigned_view.replace('_', ' ').toUpperCase() : 'Admin'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F6' },
  content: { padding: 24, paddingBottom: 40, maxWidth: 900, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  formCard: { borderRadius: 24, padding: 20, borderWidth: 1, elevation: 1 },
  backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  field: { marginTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#3E2723' },
  input: { backgroundColor: '#F8F6F2', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', color: '#1F2937' },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: { backgroundColor: '#F5F5F4', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', minWidth: '47%', marginBottom: 10 },
  optionButtonSelected: { backgroundColor: '#864b03', borderColor: '#864b03' },
  optionLabel: { color: '#1F2937', fontSize: 13, fontWeight: '700' },
  optionLabelSelected: { color: '#FFFFFF' },
  submitButton: { backgroundColor: '#864b03', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  disabledButton: { opacity: 0.6 },
  submitLabel: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 0.5 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, fontWeight: '600' },
  tableCard: { borderRadius: 24, padding: 20, borderWidth: 1, elevation: 1 },
  adminRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomColor: '#E5E7EB', borderBottomWidth: 1 },
  adminRowText: { flex: 1, marginRight: 12 },
  adminName: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  adminMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  adminStatus: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FEF3C7' },
  adminStatusText: { color: '#92400E', fontSize: 11, fontWeight: '900' },
  emptyText: { color: '#64748B', textAlign: 'center', marginVertical: 24 },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  accessDeniedTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginTop: 16, textAlign: 'center' },
  accessDeniedText: { fontSize: 13, color: '#64748B', marginTop: 12, textAlign: 'center', lineHeight: 20 },
});
