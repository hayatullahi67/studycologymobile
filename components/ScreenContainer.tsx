
import React from 'react';
import { SafeAreaView, View, ScrollView, StyleSheet, ViewStyle } from 'react-native';

interface ScreenContainerProps {
  // Made children optional to satisfy strict TS checks
  children?: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ 
  children, 
  style = {},
  scrollable = false
}) => {
  const Wrapper = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.container, style]}>
      <Wrapper 
        style={styles.wrapper} 
        contentContainerStyle={scrollable ? styles.scrollContent : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Wrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  }
});
