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
  
  const horizontal = Math.max(padding, (width - maxWidth) / 2);
  
  return (
    <View style={{ flex: 1, paddingLeft: horizontal, paddingRight: horizontal }}>
      {children}
    </View>
  );
}

