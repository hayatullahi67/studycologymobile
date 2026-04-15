import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';

interface ResultSummaryCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function ResultSummaryCard({ label, value, color = '#1E293B' }: ResultSummaryCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 0,
    elevation: 0,
    margin: 4,
    padding: 0, // Reset default padding since we manage it in container
  },
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
  }
});