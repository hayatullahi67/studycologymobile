import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TimerBadgeProps {
  seconds: number;
  isPractice?: boolean;
}

export function TimerBadge({ seconds, isPractice }: TimerBadgeProps) {
  if (isPractice) {
    return (
      <View style={styles.practiceContainer}>
        <Text style={styles.practiceText}>PRACTICE</Text>
      </View>
    );
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
  const isWarning = seconds < 60;

  return (
    <View style={[styles.container, isWarning && styles.warningContainer]}>
      <Text style={styles.timeText}>{timeStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#0F172A',
  },
  warningContainer: {
    backgroundColor: '#EF4444',
  },
  practiceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#0F172A',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  practiceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  }
});