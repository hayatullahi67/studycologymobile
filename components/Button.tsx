import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useAppStore } from '../store/useAppStore';

interface ButtonProps {
  children?: string | React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  style = {},
  textStyle = {}
}: ButtonProps) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary': return [styles.secondary, isDark && { backgroundColor: '#334155' }];
      case 'outline': return [styles.outline, isDark && { borderColor: '#864b03', backgroundColor: 'transparent' }];
      default: return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline': return styles.textOutline;
      default: return styles.textPrimary;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      style={[
        styles.base,
        getButtonStyle() as any,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.textBase, getTextStyle(), textStyle]}>{children}</Text> // Applied textStyle
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowColor: '#864b03',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: '#864b03',
  },
  secondary: {
    backgroundColor: '#1E293B',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#864b03',
    shadowOpacity: 0,
  },
  textBase: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  textPrimary: {
    // color: '#FFFFFF',
  },
  textOutline: {
    color: '#864b03',
  },
  disabled: {
    opacity: 0.5,
  },
});