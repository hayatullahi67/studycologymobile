import React from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { Screen, Header } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';

type PdfViewRouteProp = RouteProp<RootStackParamList, 'PdfView'>;

export function PdfViewScreen() {
    const route = useRoute<PdfViewRouteProp>();
    const navigation = useNavigation();
    const { url, title, isLocal } = route.params;
    const { theme } = useAppStore();
    const [hasError, setHasError] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');
    const isDark = theme === 'dark';

    // Logic: 
    // - Remote (http): Android -> Google/Office Viewer, iOS -> WebView
    // - Local (file): Android -> Sharing (external app), iOS -> WebView

    // Check if it's a local file either by param or scheme
    const isFile = isLocal || url.startsWith('file://');
    const isRemote = !isFile && url.startsWith('http');

    const [viewerType, setViewerType] = React.useState<'google' | 'office'>('google');

    const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

    // For Android Remote: use Google/Office viewer
    // For Android Local: WebView fails, so we show a button/auto-share
    // For iOS: WebView works for both (mostly)
    const pdfUrl = (Platform.OS === 'android' && isRemote)
        ? (viewerType === 'google' ? googleUrl : officeUrl)
        : url;

    // Effect to auto-open external viewer on Android for local files
    React.useEffect(() => {
        if (Platform.OS === 'android' && isFile) {
            openExternalViewer();
        }
    }, [url, isFile]);

    const openExternalViewer = async () => {
        try {
            // Check if file exists, just to be safe (though we shouldn't be here if it doesn't)
            // If it's a file:// url, Sharing can handle it
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(url, { mimeType: 'application/pdf', dialogTitle: 'Open PDF' });
            } else {
                alert('Sharing is not available on this device');
            }
        } catch (e) {
            console.error('Sharing error:', e);
        }
    };

    // Production-ready User Agent to bypass blank page issues on Android standalone
    const USER_AGENT = Platform.OS === 'android'
        ? 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
        : undefined;

    return (
        <Screen scrollable={false} style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title={title}
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#EFEBE9' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
                rightElement={
                    <TouchableOpacity onPress={() => Linking.openURL(url)} style={{ marginRight: 8 }}>
                        <Ionicons name="share-outline" size={22} color="#864b03" />
                    </TouchableOpacity>
                }
            />

            <View style={{ backgroundColor: '#FFFBEB', padding: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FEF3C7' }}>
                <TouchableOpacity onPress={() => Linking.openURL(url)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="open-outline" size={14} color="#864b03" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>Trouble viewing? </Text>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#864b03', textDecorationLine: 'underline' }}>Open in Browser</Text>
                </TouchableOpacity>

                {Platform.OS === 'android' && isFile && (
                    <TouchableOpacity onPress={openExternalViewer} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Ionicons name="share-outline" size={14} color="#864b03" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#864b03', textDecorationLine: 'underline' }}>Open in PDF Viewer App</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.webviewWrapper}>
                {hasError ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                        <Text style={styles.errorTitle}>Failed to load PDF</Text>
                        <Text style={styles.errorSub}>{errorMsg || 'The document viewer could not retrieve the file.'}</Text>

                        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <TouchableOpacity
                                style={[styles.retryBtn, { backgroundColor: '#EFEBE9' }]}
                                onPress={() => {
                                    setHasError(false);
                                    setViewerType(viewerType === 'google' ? 'office' : 'google');
                                }}
                            >
                                <Text style={[styles.retryText, { color: '#864b03' }]}>
                                    Try {viewerType === 'google' ? 'Microsoft' : 'Google'} Viewer
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.retryBtn}
                                onPress={() => Linking.openURL(url)}
                            >
                                <Text style={styles.retryText}>Open in Browser</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <WebView
                        source={{ uri: pdfUrl }}
                        style={styles.webview}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={[styles.loader, { backgroundColor: '#FFF8F6' }]}>
                                <ActivityIndicator size="large" color="#864b03" />
                            </View>
                        )}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView error: ', nativeEvent);
                            setHasError(true);
                            setErrorMsg(nativeEvent.description);
                        }}
                        onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView HTTP error: ', nativeEvent);
                            // Only set error if it's not a successful load (some 200s trigger this erroneously in some versions)
                            if (nativeEvent.statusCode >= 400) {
                                setHasError(true);
                                setErrorMsg(`HTTP Error ${nativeEvent.statusCode}`);
                            }
                        }}
                        originWhitelist={['*']}
                        allowFileAccess={true}
                        allowFileAccessFromFileURLs={true}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        mixedContentMode="always"
                        scalesPageToFit={true}
                        userAgent={USER_AGENT}
                        thirdPartyCookiesEnabled={true}
                        cacheEnabled={true}
                        incognito={false}
                        androidLayerType="software"
                    />
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8F6',
    },
    webviewWrapper: {
        flex: 1,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF8F6',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#3E2723',
        marginTop: 16,
    },
    errorSub: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    retryBtn: {
        backgroundColor: '#864b03',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryText: {
        color: '#FFFFFF',
        fontWeight: '800',
    }
});
