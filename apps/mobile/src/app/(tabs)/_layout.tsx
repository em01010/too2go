import { t } from '@too2go/shared';
import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { colors } from '@/constants/theme';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.descubrir,
          tabBarIcon: ({ color }) => <Icon glyph="🧭" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: t.tabs.pedidos,
          tabBarIcon: ({ color }) => <Icon glyph="🧾" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: t.tabs.perfil,
          tabBarIcon: ({ color }) => <Icon glyph="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
