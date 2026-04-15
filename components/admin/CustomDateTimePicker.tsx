import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { ThemeColors, COLORS } from '../../theme/colors';

interface CustomDateTimePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    initialDate?: Date;
    mode: 'date' | 'time';
}

export function CustomDateTimePicker({ visible, onClose, onSelect, initialDate, mode }: CustomDateTimePickerProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const periods = ['AM', 'PM'];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    const [tempHour, setTempHour] = useState(initialDate ? (initialDate.getHours() % 12 || 12) : 12);
    const [tempMinute, setTempMinute] = useState(initialDate ? initialDate.getMinutes() : 0);
    const [tempPeriod, setTempPeriod] = useState(initialDate ? (initialDate.getHours() >= 12 ? 'PM' : 'AM') : 'PM');

    const [tempDay, setTempDay] = useState(initialDate ? initialDate.getDate() : new Date().getDate());
    const [tempMonth, setTempMonth] = useState(initialDate ? initialDate.getMonth() : new Date().getMonth());
    const [tempYear, setTempYear] = useState(initialDate ? initialDate.getFullYear() : new Date().getFullYear());

    const handleConfirm = () => {
        let finalDate = initialDate ? new Date(initialDate) : new Date();

        if (mode === 'time') {
            let h = tempHour;
            if (tempPeriod === 'PM' && h < 12) h += 12;
            if (tempPeriod === 'AM' && h === 12) h = 0;
            finalDate.setHours(h, tempMinute, 0, 0);
        } else {
            finalDate.setFullYear(tempYear, tempMonth, tempDay);
        }

        onSelect(new Date(finalDate));
        onClose();
    };

    const SelectionGrid = ({ items, current, onSelect: onValueSelect, columns = 4 }: any) => (
        <View style={styles.grid}>
            {items.map((item: any, idx: number) => {
                const isSelected = current === item;
                const itemLabel = typeof item === 'string' ? (item.length > 3 ? item.substring(0, 3) : item) : item;

                return (
                    <TouchableOpacity
                        key={idx}
                        style={[
                            styles.gridItem,
                            {
                                width: `${100 / columns - 2.5}%`,
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                                borderColor: isDark ? '#2a3942' : '#e2e8f0'
                            }
                        ]}
                        onPress={() => onValueSelect(item)}
                    >
                        <Text style={[
                            styles.gridItemText,
                            { color: isSelected ? '#FFFFFF' : colors.text }
                        ]}>
                            {itemLabel}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Select {mode === 'date' ? 'Date' : 'Time'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {mode === 'date' ? (
                            <>
                                <Text style={styles.label}>YEAR</Text>
                                <SelectionGrid items={years} current={tempYear} onSelect={setTempYear} columns={3} />

                                <Text style={styles.label}>MONTH</Text>
                                <SelectionGrid items={months} current={months[tempMonth]} onSelect={(val: string) => setTempMonth(months.indexOf(val))} columns={4} />

                                <Text style={styles.label}>DAY</Text>
                                <SelectionGrid items={days} current={tempDay} onSelect={setTempDay} columns={6} />
                            </>
                        ) : (
                            <>
                                <Text style={styles.label}>HOUR</Text>
                                <SelectionGrid items={hours} current={tempHour} onSelect={setTempHour} columns={4} />

                                <Text style={styles.label}>MINUTE (15m Intervals)</Text>
                                <SelectionGrid items={[0, 15, 30, 45]} current={tempMinute} onSelect={setTempMinute} columns={4} />

                                <Text style={styles.label}>PERIOD</Text>
                                <View style={styles.periodRow}>
                                    {periods.map(p => (
                                        <TouchableOpacity
                                            key={p}
                                            style={[
                                                styles.periodBtn,
                                                {
                                                    backgroundColor: tempPeriod === p ? colors.primary : 'transparent',
                                                    borderColor: colors.border
                                                }
                                            ]}
                                            onPress={() => setTempPeriod(p)}
                                        >
                                            <Text style={[styles.periodText, { color: tempPeriod === p ? '#FFFFFF' : colors.text }]}>{p}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modal: { width: '100%', maxHeight: '80%', borderRadius: 32, overflow: 'hidden', elevation: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1 },
    title: { fontSize: 20, fontWeight: '900' },
    content: { paddingHorizontal: 20 },
    label: { fontSize: 11, fontWeight: '900', color: '#94A3B8', marginTop: 24, marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gridItem: { height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    gridItemText: { fontSize: 13, fontWeight: '800' },
    periodRow: { flexDirection: 'row', gap: 12 },
    periodBtn: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    periodText: { fontSize: 16, fontWeight: '900' },
    footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, gap: 12 },
    cancelBtn: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 16, fontWeight: '800' },
    confirmBtn: { flex: 2, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    confirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }
});
