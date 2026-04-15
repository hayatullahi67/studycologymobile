import React from 'react';
import { View } from 'react-native';

export const COLORS = {
  primary: '#ff8c00', // Brand Orange
  secondary: '#2196f3', // Brand Blue
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  // Theme foundations (defaults)
  darkBg: '#0b141a',
  lightBg: '#f8fafc',
  darkCard: '#162127',
  lightCard: '#ffffff',
};

// In a real React Native app, we would use react-native-svg.
// For React Native Web preview, standard SVGs work when typed correctly.
export const APP_LOGO = ({ style, ...props }: any) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    {...props}
  >
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </svg>
);

export const STORAGE_KEYS = {
  USER_PROGRESS: 'ace_v3_progress',
  RESULTS: 'ace_v3_results',
  NOTES: 'ace_v3_notes',
  QUESTIONS: 'ace_v3_questions',
  SUBJECTS: 'ace_v3_subjects',
};