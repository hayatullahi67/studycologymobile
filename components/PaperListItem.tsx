import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Linking } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';

import { COLORS, ThemeColors } from '../theme/colors';

interface PaperListItemProps {
    year: number | string;
    name: string;
    pdfUrl?: string;
    questionCount?: number;
    onPress: () => void;
    isLast?: boolean;
    isDownloaded?: boolean;
    isDownloading?: boolean;
    onDownload?: () => void;
}

export function PaperListItem({ year, name, pdfUrl, questionCount, onPress, isLast, isDownloaded, isDownloading, onDownload }: PaperListItemProps) {
    const navigation = useNavigation<AppNavigationProp>();
    const { theme, fontSize } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const hasCbt = (questionCount || 0) > 0;

    const titleSize = fontSize === 'small' ? 13 : fontSize === 'medium' ? 14 : fontSize === 'large' ? 16 : 18;

    const handlePdfView = async () => {
        if (!pdfUrl) return;

        if (isDownloaded && pdfUrl.startsWith('file://')) {
            // Local file: Share/Open with system viewer
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(pdfUrl, { mimeType: 'application/pdf', dialogTitle: `Open ${name}` });
            } else {
                alert('Sharing is not available on this device');
            }
        } else {
            // Remote file: Open in browser/system handling
            Linking.openURL(pdfUrl);
        }
    };

    return (
        <View style={[styles.outerContainer, { backgroundColor: 'transparent' }]}>
            {hasCbt ? (
                <TouchableOpacity
                    style={[styles.container, isLast && styles.lastItem, { flex: 1, backgroundColor: 'transparent', borderTopColor: 'rgba(255, 255, 255, 0.1)' }]}
                    onPress={onPress}
                >
                    <View style={styles.left}>
                        <Ionicons name="laptop-outline" size={18} color="#FFFFFF" style={{ marginRight: 14 }} />
                        <View>
                            <Text style={[styles.title, { color: '#FFFFFF', fontSize: titleSize }]}>Practice {year}</Text>
                            <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.7)' }]}>{name}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
            ) : (
                <View style={[styles.container, isLast && styles.lastItem, { flex: 1, borderBottomWidth: isLast ? 0 : 1, backgroundColor: 'transparent', borderTopColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <View style={styles.left}>
                        <Ionicons name="document-text-outline" size={18} color="#D7CCC8" style={{ marginRight: 14 }} />
                        <View>
                            <Text style={[styles.title, { color: '#D7CCC8', fontSize: titleSize }]}>Paper {year}</Text>
                            <Text style={[styles.subtitle, { color: '#BCAAA4' }]}>{name}</Text>
                        </View>
                    </View>
                    <Text style={[styles.noCbtText, { backgroundColor: '#EFEBE9', color: '#8D6E63' }]}>PDF Only</Text>
                </View>
            )}

            {pdfUrl && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>


                    {/* View Button */}
                    <TouchableOpacity
                        style={[styles.pdfBtn, { backgroundColor: '#FFFFFF' }]}
                        onPress={handlePdfView}
                    >
                        <Ionicons name={isDownloaded ? "phone-portrait-outline" : "cloud-download-outline"} size={20} color="#864b03" />
                        <Text style={[styles.pdfText, { color: '#864b03' }]}>{isDownloaded ? "Open" : "Download"}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pdfBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pdfText: {
        fontSize: 9,
        fontWeight: '900',
    },
    noCbtText: {
        fontSize: 9,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 5,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
    },
    lastItem: {
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 13,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
});
