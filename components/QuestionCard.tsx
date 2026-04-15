import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QuestionCardProps {
  text: string;
  index: number;
}

export function QuestionCard({ text, index }: QuestionCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  text: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 32,
    letterSpacing: -0.4,
  }
});