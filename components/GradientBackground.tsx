import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: any;
  useSafeArea?: boolean;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
  useSafeArea = false,
  safeAreaEdges = ['top', 'bottom', 'left', 'right'],
}) => {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  // Color schemes to match the web app's meditation gradient
  const gradientColors = {
    light: [
      '#0f0f23', // Deep purple-blue
      '#1a1a3e', // Medium purple-blue
      '#2d2d5f', // Lighter purple-blue
    ],
    dark: [
      '#0a0a1a', // Very dark purple
      '#151530', // Dark purple-blue
      '#1f1f45', // Medium purple-blue
    ]
  };

  const colors = gradientColors[colorScheme ?? 'dark'];

  const safeAreaStyle = useSafeArea ? {
    paddingTop: safeAreaEdges.includes('top') ? insets.top : 0,
    paddingBottom: safeAreaEdges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: safeAreaEdges.includes('left') ? insets.left : 0,
    paddingRight: safeAreaEdges.includes('right') ? insets.right : 0,
  } : {};

  return (
    <LinearGradient
      colors={colors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      <View style={[styles.safeAreaContainer, safeAreaStyle]}>
        {children}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
});