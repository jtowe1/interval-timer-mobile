import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/useThemeColor';

export type SafeAreaThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function SafeAreaThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  edges = ['top', 'bottom', 'left', 'right'],
  ...otherProps 
}: SafeAreaThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const insets = useSafeAreaInsets();

  const safeAreaStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return <View style={[{ backgroundColor }, safeAreaStyle, style]} {...otherProps} />;
}