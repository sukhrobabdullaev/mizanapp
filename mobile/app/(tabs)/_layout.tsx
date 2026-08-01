import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '../../src/theme';
import { useTheme } from '../../src/theme/useTheme';

export default function TabsLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gradientStart,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="bugun"
        options={{
          title: 'Bugun',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="maqsadlar"
        options={{
          title: 'Maqsadlar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-button-on-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="moliya"
        options={{
          title: 'Moliya',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mizan"
        options={{
          title: 'Mizan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
