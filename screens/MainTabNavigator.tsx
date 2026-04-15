import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { MainTabParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';

import { ThemeColors } from '../theme/colors';
import { HomeScreen } from './HomeScreen';
import { PastQuestionsScreen } from './PastQuestionsScreen';
import { NotesScreen } from './NotesScreen';
import { JambTextsScreen } from './JambTextsScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
    const { theme, userProfile } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const isPaid = (userProfile?.is_paid === true || userProfile?.is_paid === 1)
        && !!userProfile?.expiry_date
        && new Date(userProfile.expiry_date) > new Date();

    const handleLockedTab = (e: any, label: string) => {
        if (!isPaid) {
            e.preventDefault();
            Alert.alert(
                'Activation Required',
                `The ${label} feature is available only for activated users. Please activate your account to continue.`,
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#864b03',
                tabBarInactiveTintColor: '#64748B',
                tabBarStyle: [
                    styles.tabBar,
                    {
                        backgroundColor: colors.background,
                        borderTopColor: isDark ? '#2a3942' : '#e2e8f0'
                    }
                ],
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarIcon: ({ focused, color }) => {
                    let iconName: any;

                    if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'PastQuestionsTab') iconName = focused ? 'library' : 'library-outline';
                    else if (route.name === 'NotesTab') iconName = focused ? 'document-text' : 'document-text-outline';
                    else if (route.name === 'JambTextsTab') iconName = focused ? 'book' : 'book-outline';
                    else if (route.name === 'HistoryTab') iconName = focused ? 'time' : 'time-outline';
                    else if (route.name === 'SettingsTab') iconName = focused ? 'settings' : 'settings-outline';

                    return (
                        <View style={[
                            styles.iconWrapper,
                            focused && { backgroundColor: isDark ? '#162127' : '#f8fafc', borderWidth: 1, borderColor: '#ff8c0020' }
                        ]}>
                            <Ionicons name={iconName} size={22} color={color} />
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="PastQuestionsTab"
                component={PastQuestionsScreen}
                options={{ tabBarLabel: 'PQ' }}
                listeners={{
                    tabPress: (e) => handleLockedTab(e, 'Past Questions'),
                }}
            />
            <Tab.Screen
                name="NotesTab"
                component={NotesScreen}
                options={{ tabBarLabel: 'Notes' }}
                listeners={{
                    tabPress: (e) => handleLockedTab(e, 'Study Notes'),
                }}
            />
            <Tab.Screen
                name="JambTextsTab"
                component={JambTextsScreen}
                options={{ tabBarLabel: 'Jamb Texts' }}
                listeners={{
                    tabPress: (e) => handleLockedTab(e, 'Jamb Texts'),
                }}
            />
            <Tab.Screen
                name="HistoryTab"
                component={HistoryScreen}
                options={{ tabBarLabel: 'History' }}
            />
            <Tab.Screen
                name="SettingsTab"
                component={SettingsScreen}
                options={{ tabBarLabel: 'Settings' }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: Platform.OS === 'ios' ? 95 : 75,
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 35 : 15,
        paddingTop: 12,
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    tabBarLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    iconWrapper: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    }
});
