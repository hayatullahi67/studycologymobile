
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  // Made children optional to satisfy strict TS checks
  children?: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = React.memo(({ 
  children, 
  style = {}, 
  onPress, 
  noPadding = false 
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container 
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card, 
        !noPadding && styles.padding,
        style
      ]}
    >
      {children}
    </Container>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    overflow: 'hidden',
  },
  padding: {
    padding: 24,
  }
});
