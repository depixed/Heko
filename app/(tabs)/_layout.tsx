import { Tabs } from "expo-router";
import { Home, Grid3x3, ShoppingBag, User } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic tab bar height and padding
  // Base height: 65px for Android, 85px for iOS, 70px for web
  // Add bottom inset for devices with system navigation bar
  const baseHeight = Platform.OS === 'ios' ? 85 : Platform.OS === 'web' ? 70 : 65;
  const basePaddingBottom = Platform.OS === 'ios' ? 20 : Platform.OS === 'web' ? 10 : 5;
  
  // Use bottom inset if it's greater than base padding (indicates system nav bar)
  // On gesture navigation devices, bottom inset is typically 0 or very small
  const paddingBottom = Math.max(basePaddingBottom, insets.bottom);
  const tabBarHeight = baseHeight + Math.max(0, insets.bottom - basePaddingBottom);
  
  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBar, { height: tabBarHeight, paddingBottom }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? Colors.tab.active : Colors.tab.inactive;

          if (index === 2) {
            return (
              <React.Fragment key={route.key}>
                <View style={styles.centerPlaceholder} />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={onPress}
                  style={styles.tabItem}
                >
                  {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
                  <Text style={[styles.tabLabel, { color }]}>
                    {typeof label === 'string' ? label : 'Tab'}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabItem}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
              <Text style={[styles.tabLabel, { color }]}>
                {typeof label === 'string' ? label : 'Tab'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <View style={styles.centerBrandContainer}>
        <View style={styles.brandCircle}>
          <Text style={styles.brandText}>HEKO</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'relative',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    // height and paddingBottom are now set dynamically in the component
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  centerPlaceholder: {
    flex: 1,
  },
  centerBrandContainer: {
    position: 'absolute',
    top: -35,
    left: '50%',
    marginLeft: -35,
    width: 70,
    height: 70,
    zIndex: 10,
  },
  brandCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      } as any,
    }),
  },
  brandText: {
    color: Colors.text.inverse,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => <Grid3x3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
