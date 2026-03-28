import { View, Platform, useWindowDimensions } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  padding?: number;
}

export default function ResponsiveContainer({ 
  children, 
  maxWidth = 1024, 
  padding = 16 
}: ResponsiveContainerProps) {
  const { width } = useWindowDimensions();
  
  if (Platform.OS !== 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  
  // Remove horizontal padding to eliminate gray areas on sides
  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
}

