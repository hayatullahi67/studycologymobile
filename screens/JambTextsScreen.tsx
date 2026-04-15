import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import * as localDB from '../services/localDatabase';
import { Screen, Header } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { AdCarousel } from '../components/AdCarousel';
import { useAppStore } from '../store/useAppStore';

export function JambTextsScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const [texts, setTexts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTexts();
    }, []);

    const loadTexts = async () => {
        setLoading(true);
        try {
            const lit = await localDB.getLocalJambTexts('literature');
            const eng = await localDB.getLocalJambTexts('english');
            setTexts([...lit, ...eng]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const categories = Array.from(new Set(texts.map(t => t.category || (t.type === 'literature' ? 'Jamb prose' : 'English texts'))));

    const renderBookCard = (text: any) => (
        <TouchableOpacity
            key={text.id}
            activeOpacity={0.8}
            style={styles.bookCard}
            onPress={() => navigation.navigate('JambTextContent', { textId: text.id })}
        >
            <View style={styles.bookCoverContainer}>
                {text.thumbnail_url ? (
                    <Image source={{ uri: text.thumbnail_url }} style={styles.bookCover} resizeMode="cover" />
                ) : (
                    <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
                        <Ionicons name="book" size={40} color="rgba(230, 81, 0, 0.3)" />
                    </View>
                )}
                {text.quiz && text.quiz.length > 0 && (
                    <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>QUIZ</Text>
                    </View>
                )}
            </View>
            <Text style={styles.bookTitle} numberOfLines={2}>{text.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{text.author || 'JAMB Mandatory'}</Text>
        </TouchableOpacity>
    );

    return (
        <Screen scrollable={false} style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="JAMB Texts"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <AdCarousel placement="texts" style={{ marginTop: 16 }} />

            {loading ? (
                <View style={[styles.center, { backgroundColor: '#0b141a' }]}>
                    <ActivityIndicator size="large" color={COLORS.primary[600]} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {texts.length > 0 ? (
                        categories.map((cat, catIdx) => {
                            const categoryTexts = texts.filter(t => (t.category || (t.type === 'literature' ? 'Jamb prose' : 'English texts')) === cat);
                            return (
                                <View key={cat} style={styles.section}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={styles.sectionTitle}>{cat}</Text>
                                        <View style={styles.countBadge}>
                                            <Text style={styles.countBadgeText}>{categoryTexts.length} Novel{categoryTexts.length !== 1 ? 's' : ''}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.booksGrid}>
                                        {categoryTexts.map(text => renderBookCard(text))}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.empty}>
                            <Ionicons name="documents-outline" size={48} color="#1E293B" style={{ marginBottom: 16 }} />
                            <Text style={[styles.emptyText, { color: '#94A3B8' }]}>No texts found.</Text>
                            <Text style={styles.emptySub}>Please sync your data from the Home screen to download JAMB texts.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    tabContentContainer: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        backgroundColor: '#EFEBE9',
        borderColor: '#D7CCC8'
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#E65100' },
    tabText: { fontSize: 13, fontWeight: '800', color: '#94A3B8' },
    activeTabText: { color: '#FFF' },
    listContent: { paddingHorizontal: 16, paddingBottom: 30 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#3E2723', textTransform: 'capitalize' },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    countBadge: { backgroundColor: 'rgba(230, 81, 0, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    countBadgeText: { color: '#E65100', fontSize: 10, fontWeight: '800' },
    booksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    bookCard: { width: (Dimensions.get('window').width - 32 - 24) / 3, marginBottom: 16 },
    bookCoverContainer: {
        width: '100%',
        aspectRatio: 0.7,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 8,
        position: 'relative'
    },
    bookCover: { width: '100%', height: '100%' },
    bookCoverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEBE9' },
    bookTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
    bookAuthor: { fontSize: 10, fontWeight: '600', color: '#E65100' },
    miniBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#E65100',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4
    },
    miniBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, fontWeight: '600' }
});
