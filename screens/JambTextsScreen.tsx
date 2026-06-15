// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
// import { AppNavigationProp } from '../navigation/types';
// import * as localDB from '../services/localDatabase';
// import { Screen, Header } from '../components/Layout';
// import { COLORS } from '../theme/colors';
// import { AdCarousel } from '../components/AdCarousel';
// import { useAppStore } from '../store/useAppStore';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const H_PADDING = 32; // 16 left + 16 right
// const COL_GAP = 8;    // gap between columns
// const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING - COL_GAP * 2) / 3;

// // Helper to split an array into chunks of given size for manual grid layout
// function chunkArray<T>(arr: T[], size: number): T[][] {
//   const chunks: T[][] = [];
//   for (let i = 0; i < arr.length; i += size) {
//     chunks.push(arr.slice(i, i + size));
//   }
//   return chunks;
// }

// export function JambTextsScreen() {
//     const navigation = useNavigation<AppNavigationProp>();
//     const { theme } = useAppStore();
//     const isDark = theme === 'dark';
//     const [texts, setTexts] = useState<any[]>([]);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         loadTexts();
//     }, []);

//     const loadTexts = async () => {
//         setLoading(true);
//         try {
//             const lit = await localDB.getLocalJambTexts('literature');
//             const eng = await localDB.getLocalJambTexts('english');
//             setTexts([...lit, ...eng]);
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const categories = Array.from(new Set(texts.map(t => t.category || (t.type === 'literature' ? 'Jamb prose' : 'English texts'))));

//     const renderBookCard = (text: any) => (
//         <TouchableOpacity
//             key={text.id}
//             activeOpacity={0.8}
//             style={styles.bookCard}
//             onPress={() => navigation.navigate('JambTextContent', { textId: text.id })}
//         >
//             <View style={styles.bookCoverContainer}>
//                 {text.thumbnail_url ? (
//                     <Image source={{ uri: text.thumbnail_url }} style={styles.bookCover} resizeMode="cover" />
//                 ) : (
//                     <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
//                         <Ionicons name="book" size={32} color="rgba(230, 81, 0, 0.3)" />
//                     </View>
//                 )}
//                 {text.quiz && text.quiz.length > 0 && (
//                     <View style={styles.miniBadge}>
//                         <Text style={styles.miniBadgeText}>QUIZ</Text>
//                     </View>
//                 )}
//             </View>
//             <Text style={styles.bookTitle} numberOfLines={2}>{text.title}</Text>
//             <Text style={styles.bookAuthor} numberOfLines={1}>{text.author || 'JAMB Mandatory'}</Text>
//         </TouchableOpacity>
//     );

//     return (
//         <Screen scrollable={false} style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
//             <Header
//                 title="JAMB Texts"
//                 onBack={() => navigation.goBack()}
//                 style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
//                 titleStyle={{ color: '#000000' }}
//                                           {row.map((text, colIdx) => (
//                                             <View key={text.id} style={colIdx === row.length - 1 ? styles.bookCardLast : styles.bookCardWrapper}>
//                                               {renderBookCard(text)}
//                                             </View>
//                                           ))}
//                                           {/* Fill empty slots so last row aligns left */}
//                                           {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, emptyIdx) => (
//                                             <View key={`empty-${emptyIdx}`} style={styles.bookCardWrapper} />
//                                           ))}
//                                         </View>
//                                       ));
//                                     })()}
//                                 </View>
//                             );
//                         })
//                     ) : (
//                         <View style={styles.empty}>
//                             <Ionicons name="documents-outline" size={48} color="#1E293B" style={{ marginBottom: 16 }} />
//                             <Text style={[styles.emptyText, { color: '#94A3B8' }]}>No texts found.</Text>
//                             <Text style={styles.emptySub}>Please sync your data from the Home screen to download JAMB texts.</Text>
//                         </View>
//                     )}
//                 </ScrollView>
//             )}
//         </Screen>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#FFF8F6' },
//     listContent: { paddingHorizontal: 16, paddingBottom: 30 },
//     center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//     section: { marginBottom: 24 },
//     sectionTitle: { fontSize: 16, fontWeight: '900', color: '#3E2723', textTransform: 'capitalize' },
//     sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
//     countBadge: { backgroundColor: 'rgba(230, 81, 0, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
//     countBadgeText: { color: '#E65100', fontSize: 10, fontWeight: '800' },

//     // gridRow: {
//     //     flexDirection: 'row',
//     //     justifyContent: 'flex-start',
//     //     marginBottom: 12,
//     // },
//     gridRow: {
//     flexDirection: 'row',
//     gap: COL_GAP,
//     marginBottom: 12,
// },
// bookCard: {
//     width: CARD_WIDTH,
//     marginBottom: 12,
// },
//     bookCardWrapper: {
//         width: CARD_WIDTH,
//         marginRight: COL_GAP,
//     },
//     bookCardLast: {
//         width: CARD_WIDTH,
//     },
//     // bookCard: {
//     //     width: CARD_WIDTH,
//     //     marginBottom: 12,
//     // },
//     bookCoverContainer: {
//         width: '100%',
//         aspectRatio: 0.7,
//         borderRadius: 8,
//         backgroundColor: '#EFEBE9',
//         overflow: 'hidden',
//         borderWidth: 1,
//         borderColor: '#D7CCC8',
//         marginBottom: 6,
//         position: 'relative',
//     },
//     bookCover: { width: '100%', height: '100%' },
//     bookCoverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEBE9' },
//     bookTitle: { fontSize: 11, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
//     bookAuthor: { fontSize: 9, fontWeight: '600', color: '#E65100' },
//     miniBadge: {
//         position: 'absolute',
//         top: 6,
//         right: 6,
//         backgroundColor: '#E65100',
//         paddingHorizontal: 4,
//         paddingVertical: 2,
//         borderRadius: 4,
//     },
//     miniBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
//     empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
//     emptyText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
//     emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, fontWeight: '600' },
// });


// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
// import { AppNavigationProp } from '../navigation/types';
// import * as localDB from '../services/localDatabase';
// import { Screen, Header } from '../components/Layout';
// import { COLORS } from '../theme/colors';
// import { AdCarousel } from '../components/AdCarousel';
// import { useAppStore } from '../store/useAppStore';

// const SCREEN_WIDTH = Dimensions.get('window').width;
// const H_PADDING = 32; // 16 left + 16 right
// const COL_GAP = 15;    // gap between columns
// const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING - COL_GAP * 2) / 3;

// export function JambTextsScreen() {
//     const navigation = useNavigation<AppNavigationProp>();
//     const { theme } = useAppStore();
//     const isDark = theme === 'dark';
//     const [texts, setTexts] = useState<any[]>([]);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         loadTexts();
//     }, []);

//     const loadTexts = async () => {
//         setLoading(true);
//         try {
//             const lit = await localDB.getLocalJambTexts('literature');
//             const eng = await localDB.getLocalJambTexts('english');
//             setTexts([...lit, ...eng]);
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const categories = Array.from(new Set(texts.map(t => t.category || (t.type === 'literature' ? 'Jamb prose' : 'English texts'))));

//     const renderBookCard = ({ item: text }: { item: any }) => (
//         <TouchableOpacity
//             activeOpacity={0.8}
//             style={styles.bookCard}
//             onPress={() => navigation.navigate('JambTextContent', { textId: text.id })}
//         >
//             <View style={styles.bookCoverContainer}>
//                 {text.thumbnail_url ? (
//                     <Image source={{ uri: text.thumbnail_url }} style={styles.bookCover} resizeMode="cover" />
//                 ) : (
//                     <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
//                         <Ionicons name="book" size={32} color="rgba(230, 81, 0, 0.3)" />
//                     </View>
//                 )}
//                 {text.quiz && text.quiz.length > 0 && (
//                     <View style={styles.miniBadge}>
//                         <Text style={styles.miniBadgeText}>QUIZ</Text>
//                     </View>
//                 )}
//             </View>
//             <Text style={styles.bookTitle} numberOfLines={2}>{text.title}</Text>
//             <Text style={styles.bookAuthor} numberOfLines={1}>{text.author || 'JAMB Mandatory'}</Text>
//         </TouchableOpacity>
//     );

//     return (
//         <Screen scrollable={false} style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
//             <Header
//                 title="JAMB Texts"
//                 onBack={() => navigation.goBack()}
//                 style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
//                 titleStyle={{ color: '#000000' }}
//                 iconColor="#000000"
//             />

//             <AdCarousel placement="texts" style={{ marginTop: 16 }} />

//             {loading ? (
//                 <View style={[styles.center, { backgroundColor: '#0b141a' }]}>
//                     <ActivityIndicator size="large" color={COLORS.primary[600]} />
//                 </View>
//             ) : (
//                 <View style={styles.listContent}>
//                     {texts.length > 0 ? (
//                         <FlatList
//                             data={texts}
//                             keyExtractor={(item) => item.id.toString()}
//                             numColumns={3}
//                             scrollEnabled={false}
//                             columnWrapperStyle={styles.gridRow}
//                             renderItem={renderBookCard}
//                         />
//                     ) : (
//                         <View style={styles.empty}>
//                             <Ionicons name="documents-outline" size={48} color="#1E293B" style={{ marginBottom: 16 }} />
//                             <Text style={[styles.emptyText, { color: '#94A3B8' }]}>No texts found.</Text>
//                             <Text style={styles.emptySub}>Please sync your data from the Home screen to download JAMB texts.</Text>
//                         </View>
//                     )}
//                 </View>
//             )}
//         </Screen>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#FFF8F6' },
//     listContent: { paddingHorizontal: 16, paddingBottom: 30 },
//     center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//     section: { marginBottom: 24 },
//     sectionTitle: { fontSize: 16, fontWeight: '900', color: '#3E2723', textTransform: 'capitalize' },
//     sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
//     countBadge: { backgroundColor: 'rgba(230, 81, 0, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
//     countBadgeText: { color: '#E65100', fontSize: 10, fontWeight: '800' },
//     gridRow: {
//         justifyContent: 'flex-start',
//         gap: COL_GAP,
//         marginBottom: 12,
//     },
//     bookCard: {
//         width: CARD_WIDTH,
//     },
//     bookCoverContainer: {
//         width: '100%',
//         aspectRatio: 0.7,
//         borderRadius: 8,
//         backgroundColor: '#EFEBE9',
//         overflow: 'hidden',
//         borderWidth: 1,
//         borderColor: '#D7CCC8',
//         marginBottom: 6,
//         position: 'relative',
//     },
//     bookCover: { width: '100%', height: '100%' },
//     bookCoverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEBE9' },
//     bookTitle: { fontSize: 11, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
//     bookAuthor: { fontSize: 9, fontWeight: '600', color: '#E65100' },
//     miniBadge: {
//         position: 'absolute',
//         top: 6,
//         right: 6,
//         backgroundColor: '#E65100',
//         paddingHorizontal: 4,
//         paddingVertical: 2,
//         borderRadius: 4,
//     },
//     miniBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
//     empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
//     emptyText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
//     emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, fontWeight: '600' },
// });



import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Image, Dimensions, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import * as localDB from '../services/localDatabase';
import { Screen, Header } from '../components/Layout';
import { COLORS } from '../theme/colors';
import { AdCarousel } from '../components/AdCarousel';
import { useAppStore } from '../store/useAppStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = 32;
const COL_GAP = 15;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING - COL_GAP * 2) / 3;

export function JambTextsScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const { theme } = useAppStore();

    const [texts, setTexts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState<string>('');

    // useFocusEffect ensures list reloads every time you visit this screen
    useFocusEffect(
        useCallback(() => {
            loadTexts();
        }, [])
    );

    const loadTexts = async () => {
        setLoading(true);
        setDebugInfo('');
        try {
            // Step 1: Init the DB (safe to call multiple times)
            const database = await localDB.initLocalDatabase();

            // Step 2: Raw count to know if sync has populated the table at all
            const rawCount = await (database as any).getFirstAsync(
                'SELECT COUNT(*) as count FROM jamb_texts'
            );
            const totalRows = rawCount?.count ?? 0;
            console.log('[JambTextsScreen] Total jamb_texts rows in DB:', totalRows);

            // Step 3: Fetch deduplicated books
            const lit = await localDB.getLocalJambTexts('literature');
            const eng = await localDB.getLocalJambTexts('english');

            console.log('[JambTextsScreen] Literature books:', lit.length);
            console.log('[JambTextsScreen] English books:', eng.length);

            setTexts([...lit, ...eng]);
            setDebugInfo(`DB rows: ${totalRows} | Lit: ${lit.length} | Eng: ${eng.length}`);

            if (totalRows === 0) {
                console.warn('[JambTextsScreen] jamb_texts table is EMPTY — sync has not run yet.');
            }
        } catch (error) {
            console.error('[JambTextsScreen] Failed to load texts:', error);
            setDebugInfo(`Error: ${String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    // Group books by category for section headers
    const grouped = React.useMemo(() => {
        const map = new Map<string, any[]>();
        for (const t of texts) {
            const cat = t.category?.trim() || (t.type === 'literature' ? 'Jamb Prose' : 'English Texts');
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(t);
        }
        return Array.from(map.entries()).map(([category, books]) => ({ category, books }));
    }, [texts]);

    const renderBookCard = (text: any) => (
        <TouchableOpacity
            key={text.id}
            activeOpacity={0.8}
            style={styles.bookCard}
            onPress={() => navigation.navigate('JambTextContent', { textId: text.id })}
        >
            <View style={styles.bookCoverContainer}>
                {text.thumbnail_url ? (
                    <Image
                        source={{ uri: text.thumbnail_url }}
                        style={styles.bookCover}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
                        <Ionicons name="book" size={32} color="rgba(230, 81, 0, 0.3)" />
                    </View>
                )}
                {Array.isArray(text.quiz) && text.quiz.length > 0 && (
                    <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>QUIZ</Text>
                    </View>
                )}
            </View>
            <Text style={styles.bookTitle} numberOfLines={2}>{text.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>
                {text.author || 'JAMB Mandatory'}
            </Text>
        </TouchableOpacity>
    );

    const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
        return chunks;
    };

    const renderSection = ({ item }: { item: { category: string; books: any[] } }) => {
        const rows = chunkArray(item.books, 3);
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{item.category}</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                            {item.books.length} BOOK{item.books.length !== 1 ? 'S' : ''}
                        </Text>
                    </View>
                </View>
                {rows.map((row, rowIdx) => (
                    <View key={rowIdx} style={styles.gridRow}>
                        {row.map((book) => renderBookCard(book))}
                        {row.length < 3 &&
                            Array.from({ length: 3 - row.length }).map((_, i) => (
                                <View key={`pad-${i}`} style={styles.bookCard} />
                            ))}
                    </View>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <Screen scrollable={false} style={styles.container}>
                <Header
                    title="JAMB Texts"
                    onBack={() => navigation.goBack()}
                    style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                    titleStyle={{ color: '#000000' }}
                    iconColor="#000000"
                />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary[600]} />
                    <Text style={styles.loadingText}>Loading texts...</Text>
                </View>
            </Screen>
        );
    }

    return (
        <Screen scrollable={false} style={styles.container}>
            <Header
                title="JAMB Texts"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            {texts.length === 0 ? (
                <ScrollView contentContainerStyle={styles.emptyScroll}>
                    <AdCarousel placement="texts" style={{ marginBottom: 24 }} />
                    <View style={styles.empty}>
                        <Ionicons
                            name="documents-outline"
                            size={48}
                            color="#1E293B"
                            style={{ marginBottom: 16 }}
                        />
                        <Text style={[styles.emptyText, { color: '#94A3B8' }]}>No texts found.</Text>
                        <Text style={styles.emptySub}>
                            Please sync your data from the Home screen to download JAMB texts.
                        </Text>
                        {/* DEBUG BOX — remove after confirming data loads */}
                        {debugInfo ? (
                            <View style={styles.debugBox}>
                                <Text style={styles.debugText}>🔍 {debugInfo}</Text>
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    data={grouped}
                    keyExtractor={(item) => item.category}
                    renderItem={renderSection}
                    ListHeaderComponent={
                        <AdCarousel placement="texts" style={{ marginTop: 16, marginBottom: 8 }} />
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F6' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#94A3B8', fontWeight: '600' },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#3E2723', textTransform: 'capitalize' },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginTop: 8,
    },
    countBadge: {
        backgroundColor: 'rgba(230, 81, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countBadgeText: { color: '#E65100', fontSize: 10, fontWeight: '800' },
    gridRow: { flexDirection: 'row', gap: COL_GAP, marginBottom: 16 },
    bookCard: { width: CARD_WIDTH },
    bookCoverContainer: {
        width: '100%',
        aspectRatio: 0.7,
        borderRadius: 8,
        backgroundColor: '#EFEBE9',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#D7CCC8',
        marginBottom: 6,
        position: 'relative',
    },
    bookCover: { width: '100%', height: '100%' },
    bookCoverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEBE9' },
    bookTitle: { fontSize: 11, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
    bookAuthor: { fontSize: 9, fontWeight: '600', color: '#E65100' },
    miniBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#E65100',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
    emptyScroll: { flexGrow: 1, paddingHorizontal: 16 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    emptySub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
        fontWeight: '600',
    },
    debugBox: {
        marginTop: 24,
        backgroundColor: '#FFF3CD',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FFC107',
    },
    debugText: { fontSize: 12, color: '#856404', fontWeight: '600', textAlign: 'center' },
});