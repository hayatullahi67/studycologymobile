import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface JambTextViewProps {
    onAdd: (type: 'literature' | 'english') => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onBack?: () => void;
}

export function JambTextView({ onAdd, onEdit, onDelete, onBack }: JambTextViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency

    const [activeType, setActiveType] = useState<'literature' | 'english'>('literature');
    const [texts, setTexts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadTexts();
        }, [activeType])
    );

    const loadTexts = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getJambTexts(activeType);
            setTexts(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load JAMB texts");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Text",
            "Are you sure you want to delete this? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await supabaseDB.deleteJambText(id);
                            loadTexts();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete");
                        }
                    }
                }
            ]
        );
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
                    <Text style={[styles.headerTitle, { color: '#000000' }]}>JAMB Texts</Text>
                    <Text style={[styles.headerSub, { color: '#64748B' }]}>Reading materials for exams</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: '#4E342E' }]}
                    onPress={() => onAdd(activeType)}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Tabs - Segmented Style */}
            <View style={styles.tabContainer}>
                <View style={[styles.tabBar, { backgroundColor: '#F1F5F9' }]}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeType === 'literature' && [styles.activeTab, { backgroundColor: '#FFFFFF' }]
                        ]}
                        onPress={() => setActiveType('literature')}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: '#64748B' },
                            activeType === 'literature' && { color: '#4E342E', fontWeight: '800' }
                        ]}>Literature</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeType === 'english' && [styles.activeTab, { backgroundColor: '#FFFFFF' }]
                        ]}
                        onPress={() => setActiveType('english')}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: '#64748B' },
                            activeType === 'english' && { color: '#4E342E', fontWeight: '800' }
                        ]}>English</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#4E342E" />
                    </View>
                ) : texts.length > 0 ? (
                    texts.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => onEdit(item.id)}
                            activeOpacity={0.7}
                        >
                            {item.thumbnail_url ? (
                                <Image
                                    source={{ uri: item.thumbnail_url }}
                                    style={styles.thumbnailImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[
                                    styles.iconBox,
                                    { backgroundColor: activeType === 'literature' ? '#F5F3FF' : '#FDF4FF' }
                                ]}>
                                    <Ionicons
                                        name={activeType === 'literature' ? "book" : "document-text"}
                                        size={24}
                                        color={activeType === 'literature' ? "#7C3AED" : "#C026D3"}
                                    />
                                </View>
                            )}
                            <View style={styles.cardInfo}>
                                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                                <View style={styles.metaRow}>
                                    {item.author ? (
                                        <Text style={[styles.authorText, { color: colors.textSecondary }]}>by {item.author}</Text>
                                    ) : (
                                        <Text style={[styles.typeText, { color: colors.textSecondary }]}>{activeType === 'english' ? 'English Comprehension' : 'Reading Material'}</Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                                    onPress={() => handleDelete(item.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="documents-outline" size={80} color="#E2E8F0" />
                        </View>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No materials yet</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Tap '+' to add your first {activeType} material.</Text>
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
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
        width: '100%',
        backgroundColor: '#FFFFFF'
    },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, marginTop: 2, fontWeight: '600' },
    backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    tabContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    tabBar: { flexDirection: 'row', borderRadius: 16, padding: 6 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    activeTab: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    tabText: { fontSize: 14, fontWeight: '700' },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    loaderContainer: { marginTop: 80, alignItems: 'center' },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 2,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    thumbnailImage: { width: 56, height: 56, borderRadius: 16, marginRight: 16, borderWidth: 1, borderColor: '#D7CCC8' },
    cardInfo: { flex: 1 },
    title: { fontSize: 17, fontWeight: '900', marginBottom: 4, lineHeight: 22 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    authorText: { fontSize: 13, fontWeight: '600' },
    typeText: { fontSize: 12, fontWeight: '600' },
    actions: { marginLeft: 12 },
    actionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyIconContainer: { marginBottom: 24 },
    emptyText: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
    emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22, fontWeight: '600' }
});
