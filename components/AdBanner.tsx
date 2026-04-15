import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../services/supabaseDatabase';
import { useAppStore } from '../store/useAppStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AdBannerProps {
    placement: string;
    style?: any;
    priorities?: number[];
    onAdLoad?: (ad: any) => void;
    questionIndex?: number;  // Current question number (0-indexed)
    shouldShowAd?: boolean;  // Explicitly control ad display
    mockAd?: any;            // For preview
    carousel?: boolean;      // Enable carousel mode
    size?: 'small' | 'medium' | 'large' | 'option' | 'square'; // Ad size variant
}

export function AdBanner(props: AdBannerProps) {
    const { placement, style, priorities, onAdLoad, questionIndex, shouldShowAd } = props;
    const { theme } = useAppStore();
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [impressionTracked, setImpressionTracked] = useState(false);

    const isDark = theme === 'dark';

    // Determine if ad should show based on rotation logic
    const shouldDisplay = shouldShowAd !== undefined ? shouldShowAd : true;

    useEffect(() => {
        if (shouldDisplay) {
            loadAd();
        } else {
            setAd(null);
            setLoading(false);
        }
    }, [placement, priorities, shouldDisplay, props.size, questionIndex]);

    useEffect(() => {
        // Track impression when ad is visible
        if (ad && !impressionTracked) {
            supabaseDB.trackAdImpression(ad.id);
            setImpressionTracked(true);
        }
    }, [ad, impressionTracked]);

    const loadAd = async () => {
        // If mockAd is provided, use it (for preview)
        if (props.mockAd) {
            setAd(props.mockAd);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const ads = await supabaseDB.getActiveAds(placement, priorities, props.size);

            if (ads && ads.length > 0) {
                // Shuffle the pool for true randomness
                const shuffled = [...ads].sort(() => Math.random() - 0.5);
                const selectedAd = shuffled[0];

                setAd(selectedAd);
                onAdLoad?.(selectedAd);
            } else {
                setAd(null);
            }
        } catch (error) {
            console.error('Error loading ad:', error);
            setAd(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAdClick = async () => {
        // Use mockAd directly if provided (instant render for preview)
        const currentAd = props.mockAd || ad;

        if (!currentAd) return;

        // Track click
        if (!props.mockAd) {
            await supabaseDB.trackAdClick(currentAd.id);
        }

        // Open link if provided
        if (currentAd.link_url) {
            try {
                await Linking.openURL(currentAd.link_url);
            } catch (error) {
                console.error('Error opening link:', error);
            }
        }
    };

    // Use mockAd directly if provided (instant render for preview)
    const adToDisplay = props.mockAd || ad;
    const isLoading = props.mockAd ? false : loading;

    // Don't render anything if loading or no ad
    if (isLoading) {
        return null;
    }

    if (!adToDisplay) {
        return null; // No ad = no space taken
    }

    // Use derived ad object
    const currentAd = adToDisplay;

    // Style modifiers based on size
    const isSmall = currentAd.size === 'small';
    const isLarge = currentAd.size === 'large';
    const isOption = currentAd.size === 'option';
    const isSquare = currentAd.size === 'square';

    // Determine image height based on size
    const uniqueImageHeight = isSmall ? 60 : (isLarge ? 200 : (isSquare ? 180 : 140));

    // Fixed container heights based on size
    const containerHeight = isSmall ? 100 : (isLarge ? 380 : (isSquare ? 200 : (isOption ? 60 : 150)));

    // Option Style specific overrides
    if (isOption) {
        return (
            <TouchableOpacity
                style={[
                    styles.optionContainer,
                    {
                        backgroundColor: isDark ? '#162127' : '#ffffff',
                        borderColor: isDark ? '#2a3942' : '#e2e8f0',
                    },
                    style
                ]}
                onPress={handleAdClick}
                activeOpacity={0.8}
            >
                <View style={styles.optionContent}>
                    {/* Tiny "Ad" indicator to be compliant but subtle */}
                    {/* <View style={styles.optionAdBadge}>
                        <Text style={styles.optionAdText}>Ad</Text>
                    </View> */}

                    {currentAd.image_url && (
                        <Image
                            source={{ uri: currentAd.image_url }}
                            style={styles.optionImage}
                            resizeMode="cover"
                        />
                    )}

                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.optionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>
                            {currentAd.title}
                        </Text>
                        <Text style={[styles.optionDesc, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                            {currentAd.description}
                        </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? '#162127' : '#ffffff',
                    borderColor: isDark ? '#2a3942' : '#e2e8f0',
                    marginHorizontal: isLarge || isSquare ? 0 : 4,
                    // Reduce vertical margin for small ads to be less intrusive
                    marginVertical: isSmall ? 8 : 12,
                    height: containerHeight, // Fixed height based on size (strictly enforced)
                },
                style
            ]}
            onPress={handleAdClick}
            activeOpacity={0.8}
        >
            {/* Content Displayed Below */}

            {/* Optional Image */}
            {currentAd.image_url && (
                <Image
                    source={{ uri: currentAd.image_url }}
                    style={[
                        styles.image,
                        {
                            backgroundColor: isDark ? '#0b141a' : '#f1f5f9',
                            height: uniqueImageHeight
                        }
                    ]}
                    resizeMode="cover"
                />
            )}

            {/* Content */}
            <View style={[styles.content, isSmall && { padding: 8, paddingVertical: 10 }]}>
                <Text
                    style={[
                        styles.title,
                        { color: isDark ? '#F1F5F9' : '#0F172A' },
                        isSmall && { fontSize: 14, marginBottom: 4 }
                    ]}
                    numberOfLines={isSmall ? 1 : 2}
                >
                    {currentAd.title}
                </Text>

                {!isSmall && (
                    <Text
                        style={[styles.description, { color: isDark ? '#94A3B8' : '#64748B' }]}
                        numberOfLines={isLarge ? 4 : 2}
                    >
                        {currentAd.description}
                    </Text>
                )}

                {/* Call to Action */}
                {currentAd.link_url && (
                    <View style={[styles.ctaButton, isSmall && { paddingVertical: 6, paddingHorizontal: 10, marginTop: 4 }]}>
                        <Text style={[styles.ctaText, isSmall && { fontSize: 12 }]}>
                            {currentAd.button_text || 'Learn More'}
                        </Text>
                        <Ionicons
                            name="arrow-forward"
                            size={isSmall ? 12 : 16}
                            color="#ff8c00"
                        />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        marginVertical: 12,
        marginHorizontal: 4,
        borderWidth: 1,
        elevation: 2,
    },
    image: {
        width: '100%',
        height: 140,
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 6,
    },
    description: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 20,
        marginBottom: 12,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ff8c0020',
        borderRadius: 10,
        gap: 6,
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#ff8c00',
    },
    // Option Ad Styles
    optionContainer: {
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 0,
        marginTop: 12,
        overflow: 'hidden',
        height: 54, // Match typical option height
        justifyContent: 'center',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    optionImage: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    optionDesc: {
        fontSize: 12,
    },
    optionAdBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    optionAdText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#64748B',
    }
});
