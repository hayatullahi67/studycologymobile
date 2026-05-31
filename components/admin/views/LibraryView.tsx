import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PastQuestionsView } from './PastQuestionsView';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors } from '../../../theme/colors';

interface LibraryViewProps {
    onNavigate: (view: string) => void;
    onSelectPaper?: (paperId: string) => void;
    onBack?: () => void;
}

export function LibraryView({ onNavigate, onSelectPaper, onBack }: LibraryViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
                {onBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 44 }} />
                )}
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Question Bank</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Library & past papers</Text>
                </View>
            </View>

            <View style={styles.content}>
                <PastQuestionsView onSelectPaper={onSelectPaper} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: '900' },
    headerSubtitle: { fontSize: 14, marginTop: 4 },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    content: {
        flex: 1,
    }
});
