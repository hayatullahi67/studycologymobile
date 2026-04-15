import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubjectsView } from './SubjectsView';
import { PastQuestionsView } from './PastQuestionsView';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors } from '../../../theme/colors';

interface LibraryViewProps {
    onNavigate: (view: string) => void;
    onSelectPaper?: (paperId: string) => void;
}

export function LibraryView({ onNavigate, onSelectPaper }: LibraryViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light;
    const [activeTab, setActiveTab] = useState<'subjects' | 'questions'>('subjects');

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            {/* <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Question Bank</Text>
            </View> */}

            <View style={styles.content}>
                <PastQuestionsView onSelectPaper={onSelectPaper} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: '900' },
    content: {
        flex: 1,
    }
});
