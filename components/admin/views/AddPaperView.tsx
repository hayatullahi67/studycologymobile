import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface AddPaperViewProps {
    onBack?: () => void;
}

export function AddPaperView({ onBack }: AddPaperViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const [subject, setSubject] = useState('');
    const [year, setYear] = useState('');
    const [paperType, setPaperType] = useState('UTME - JAMB');
    const [timeLimit, setTimeLimit] = useState('120');

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Create CBT Paper</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.1)' : '#EEF2FF', borderColor: colors.primary }]}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                        Initialize a new Paper (Exam Session) to add questions to later.
                    </Text>
                </View>

                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {/* Subject */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>SUBJECT</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. Mathematics"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            value={subject}
                            onChangeText={setSubject}
                        />
                        <Text style={[styles.subText, { color: isDark ? colors.border : '#94A3B8' }]}>Entering a new subject name implies creating a new subject.</Text>
                    </View>

                    {/* Year */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>YEAR</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. 2024"
                            keyboardType="numeric"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            value={year}
                            onChangeText={setYear}
                        />
                    </View>

                    {/* Paper Type */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>PAPER TYPE / CATEGORY</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. UTME - JAMB"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            value={paperType}
                            onChangeText={setPaperType}
                        />
                    </View>

                    {/* Time Limit */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>TIME LIMIT (MINUTES)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="120"
                            keyboardType="numeric"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            value={timeLimit}
                            onChangeText={setTimeLimit}
                        />
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.saveBtnText}>Initialize Session</Text>
                        <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    form: { padding: 20, paddingBottom: 40 },
    infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, gap: 12 },
    helperText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    formCard: { borderRadius: 24, padding: 20, borderWidth: 1, elevation: 2 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '600' },
    subText: { fontSize: 11, fontWeight: '700', marginTop: 8, fontStyle: 'italic' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, marginTop: 12, gap: 10, elevation: 2 },
    saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }
});
