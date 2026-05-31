// import React, { useState, useEffect, useRef } from 'react';
// import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
// import { AdBanner } from './AdBanner';
// import * as supabaseDB from '../services/supabaseDatabase';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');
// const AD_WIDTH = SCREEN_WIDTH - 20; // Account for paddin

// interface AdCarouselProps {
//     placement: string;
//     style?: any;
// }

// export function AdCarousel({ placement, style }: AdCarouselProps) {
//     const [ads, setAds] = useState<any[]>([]);
//     const [currentIndex, setCurrentIndex] = useState(0);
//     const scrollViewRef = useRef<ScrollView>(null);

//     useEffect(() => {
//         loadAds();
//     }, [placement]);

//     // Auto-slide effect
//     useEffect(() => {
//         if (ads.length <= 1) return;

//         const interval = setInterval(() => {
//             setCurrentIndex((prevIndex) => {
//                 const nextIndex = (prevIndex + 1) % ads.length;
//                 scrollViewRef.current?.scrollTo({
//                     x: nextIndex * AD_WIDTH,
//                     animated: true,
//                 });
//                 return nextIndex;
//             });
//         }, 5000); // Auto-slide every 5 seconds

//         return () => clearInterval(interval);
//     }, [ads.length]);

//     const loadAds = async () => {
//         try {
//             // Fetch all active ads with size 'medium'
//             const fetchedAds = await supabaseDB.getActiveAds('all', undefined, 'medium');
//             if (fetchedAds && fetchedAds.length > 0) {
//                 // Limit to 5 ads for performance
//                 setAds(fetchedAds.slice(0, 5));
//             }
//         } catch (error) {
//             console.error('Error loading ads for carousel:', error);
//         }
//     };

//     const handleScroll = (event: any) => {
//         const contentOffsetX = event.nativeEvent.contentOffset.x;
//         const index = Math.round(contentOffsetX / AD_WIDTH);
//         setCurrentIndex(index);
//     };

//     if (ads.length === 0) {
//         return null;
//     }

//     return (
//         <View style={[styles.container, style]}>
//             <ScrollView
//                 ref={scrollViewRef}
//                 horizontal
//                 pagingEnabled
//                 showsHorizontalScrollIndicator={false}
//                 onScroll={handleScroll}
//                 scrollEventThrottle={16}
//                 decelerationRate="fast"
//                 snapToInterval={AD_WIDTH}
//                 snapToAlignment="center"
//                 contentContainerStyle={styles.scrollContent}
//             >
//                 {ads.map((ad, index) => (
//                     <View key={ad.id} style={{ width: AD_WIDTH, }}>
//                         <AdBanner
//                             placement={placement}
//                             mockAd={ad}
//                             style={{ marginHorizontal: 18, marginVertical: 0 }}
//                         />
//                     </View>
//                 ))}
//             </ScrollView>

//             {/* Pagination Dots */}
//             {ads.length > 1 && (
//                 <View style={styles.pagination}>
//                     {ads.map((_, index) => (
//                         <View
//                             key={index}
//                             style={[
//                                 styles.dot,
//                                 index === currentIndex && styles.activeDot
//                             ]}
//                         />
//                     ))}
//                 </View>
//             )}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         marginBottom: 16,
//     },
//     scrollContent: {
//         paddingHorizontal: 20,
        
        
//         // marginRight:20
//     },
//     pagination: {
//         flexDirection: 'row',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginTop: 12,
//         gap: 6,
//     },
//     dot: {
//         width: 6,
//         height: 6,
//         borderRadius: 3,
//         backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     },
//     activeDot: {
//         backgroundColor: '#864b03',
//         width: 20,
//     },
// });


import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { AdBanner } from './AdBanner';
import * as supabaseDB from '../services/supabaseDatabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AD_WIDTH = SCREEN_WIDTH - 20;

interface AdCarouselProps {
    placement: string;
    style?: any;
}

export function AdCarousel({ placement, style }: AdCarouselProps) {
    const [ads, setAds] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        loadAds();
    }, [placement]);

    useEffect(() => {
        if (ads.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % ads.length;
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * AD_WIDTH,
                    animated: true,
                });
                return nextIndex;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [ads.length]);

    const loadAds = async () => {
        try {
            const fetchedAds = await supabaseDB.getActiveAds('all', undefined, 'medium');
            if (fetchedAds && fetchedAds.length > 0) {
                setAds(fetchedAds.slice(0, 5));
            }
        } catch (error) {
            console.error('Error loading ads for carousel:', error);
        }
    };

    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / AD_WIDTH);
        setCurrentIndex(index);
    };

    const handleAdPress = async (ad: any) => {
        const rawLink = ad.link_url || ad.linkUrl;
        if (!rawLink) return;

        // Track click
        if (ad.id) {
            try {
                await supabaseDB.trackAdClick(ad.id);
            } catch (e) {
                console.error('Error tracking click:', e);
            }
        }

        // Ensure URL has a protocol so Linking can open it in the browser
        try {
            const link = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
            await Linking.openURL(link);
        } catch (error) {
            console.error('Error opening link:', error);
        }
    };

    if (ads.length === 0) return null;

    return (
        <View style={[styles.container, style]}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={AD_WIDTH}
                snapToAlignment="center"
                contentContainerStyle={styles.scrollContent}
            >
                {ads.map((ad) => (
                    <TouchableOpacity
                        key={ad.id}
                        style={{ width: AD_WIDTH }}
                        activeOpacity={ad.link_url || ad.linkUrl ? 0.7 : 1}
                        onPress={() => handleAdPress(ad)}
                    >
                        <AdBanner
                            placement={placement}
                            mockAd={ad}
                            style={{ marginHorizontal: 18, marginVertical: 0 }}
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {ads.length > 1 && (
                <View style={styles.pagination}>
                    {ads.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === currentIndex && styles.activeDot
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    activeDot: {
        backgroundColor: '#864b03',
        width: 20,
    },
});