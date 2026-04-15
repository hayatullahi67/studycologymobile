
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface OptionItemProps {
  id: string;
  text: string;
  isSelected: boolean;
  onClick: () => void;
  /** Added key to satisfy TypeScript when rendering in a list */
  key?: string | number;
}

export function OptionItem({
  id,
  text,
  isSelected,
  onClick
}: OptionItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onClick}
      style={[
        styles.container,
        isSelected ? styles.selectedContainer : styles.unselectedContainer
      ]}
    >
      <View style={[
        styles.badge,
        isSelected ? styles.selectedBadge : styles.unselectedBadge
      ]}>
        <Text style={[
          styles.badgeText,
          isSelected ? styles.selectedBadgeText : styles.unselectedBadgeText
        ]}>
          {id.toUpperCase()}
        </Text>
      </View>
      <Text style={[
        styles.optionText,
        isSelected ? styles.selectedOptionText : styles.unselectedOptionText
      ]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: 12,
  },
  unselectedContainer: {
    borderColor: '#F8FAFC',
    backgroundColor: '#F8FAFC',
  },
  selectedContainer: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  unselectedBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  selectedBadge: {
    backgroundColor: '#4F46E5',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '900',
  },
  unselectedBadgeText: {
    color: '#94A3B8',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  unselectedOptionText: {
    color: '#64748B',
  },
  selectedOptionText: {
    color: '#1E1B4B',
  }
});
