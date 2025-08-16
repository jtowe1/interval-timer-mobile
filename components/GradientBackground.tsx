import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: any;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
}) => {
  const colorScheme = useColorScheme();

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

  return (
    <LinearGradient
      colors={colors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});