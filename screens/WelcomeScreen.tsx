import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const PRIMARY_BROWN = '#864b03';
const BG_LIGHT = '#FFF8F6';

export function WelcomeScreen() {
    const navigation = useNavigation<AppNavigationProp>();

    return (
        <SafeAreaView style={styles.container}>
            <Image
                // source={require('../assets/doodle_pattern.png')}
                // style={styles.doodleBG}
                // resizeMode="repeat"
            />
            <View style={styles.content}>
                {/* Top Branding Section */}
                <View style={styles.branding}>
                    <Image
                        source={require('../assets/doodle_pattern.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                        tintColor={PRIMARY_BROWN}
                    />
                    <Text style={styles.brandTitle}>2027</Text>
                    <Text style={styles.tagline}>Learn Differently</Text>
                </View>

                {/* Bottom Actions */}
                <View style={styles.bottomSection}>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary]}
                            onPress={() => navigation.navigate('SignUp')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnTextPrimary}>Create Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnSecondary]}
                            onPress={() => navigation.navigate('Login')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.btnTextSecondary}>Log In</Text>
                        </TouchableOpacity>
                            <Text style={styles.btnTextSecondaryy}>Neltechnological solution Ltd</Text>

                    </View>

                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_LIGHT,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 60,
        alignItems: 'center',
        zIndex: 1,
    },
    doodleBG: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.05,
    },
    branding: {
        alignItems: 'center',
        marginTop: height * 0.05,
    },
    logoImage: {
        width: 220,
        height: 140,
    },
    brandTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: PRIMARY_BROWN,
        marginTop: -10,
        letterSpacing: 2,
    },
    yearText: {
        fontSize: 24,
        fontWeight: '800',
        color: PRIMARY_BROWN,
        marginTop: 5,
        letterSpacing: 4,
        opacity: 0.8,
    },
    tagline: {
        fontSize: 16,
        color: '#5D4037',
        fontStyle: 'italic',
        opacity: 0.7,
        marginTop: 10,
    },
    bottomSection: {
        width: '100%',
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    buttonGroup: {
        width: '100%',
        gap: 16,
        marginBottom: 40,
    },
    btn: {
        height: 58,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnPrimary: {
        backgroundColor: PRIMARY_BROWN,
        shadowColor: PRIMARY_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#EFEBE9',
    },
    btnTextPrimary: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    btnTextSecondary: {
        color: PRIMARY_BROWN,
        fontSize: 16,
        fontWeight: '700',
    },
      btnTextSecondaryy: {
        color: PRIMARY_BROWN,
        fontSize: 16,
        fontWeight: '700',
        textAlign:'center',
    },
    copyright: {
        color: '#8D6E63',
        fontSize: 12,
        opacity: 0.6,
        fontWeight: '600',
    }
});
