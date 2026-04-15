
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet, ViewStyle, Platform, StyleProp, ImageBackground, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { ThemeColors } from '../theme/colors';

const DOODLE_PATTERN = require('../assets/doodle_pattern.png');

interface ScreenProps {
  children?: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardOffset?: number;
}

export function Screen({ children, scrollable = true, style = {}, contentContainerStyle = {}, keyboardOffset = 0 }: ScreenProps) {
  const { theme } = useAppStore();
  const ContentWrapper = scrollable ? ScrollView : View;

  const isDark = theme === 'dark';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }, style]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
      >
        <ContentWrapper
          style={styles.contentWrapper}
          contentContainerStyle={scrollable ? [styles.scrollContent, contentContainerStyle] : undefined}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ContentWrapper>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface HeaderProps {
  title: string;
  onBack?: () => void;
  hideBack?: boolean;
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<any>; // Using any to avoid complex TextStyle imports if not already imported
  iconColor?: string;
}

export function Header({ title, onBack, hideBack, rightElement, style, titleStyle, iconColor }: HeaderProps) {
  const { theme, fontSize } = useAppStore();
  const isDark = theme === 'dark';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const titleSize = fontSize === 'small' ? 16 : fontSize === 'medium' ? 18 : fontSize === 'large' ? 20 : 22;

  // determine icon color: prop > black by default
  const finalIconColor = iconColor || '#000000';

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, style]}>
      <View style={styles.headerLeft}>
        {onBack && !hideBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={finalIconColor} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: '#000000', fontSize: titleSize }, titleStyle]}>{title}</Text>
      </View>
      {rightElement && <View style={styles.headerRight}>{rightElement}</View>}
    </View>
  );
}

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Added key to satisfy TypeScript when rendering in a list */
  key?: string | number;
}

export function Card({ children, style = {}, onPress }: CardProps) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#162127' : '#ffffff',
          borderColor: isDark ? '#2a3942' : '#e2e8f0'
        },
        style
      ]}
    >
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 30, // Global top padding as requested
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3942',
    backgroundColor: '#0b141a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  backArrow: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  backdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
