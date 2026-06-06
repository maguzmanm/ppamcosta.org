import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ShiftsScreen from '../screens/ShiftsScreen';
import ExperiencesScreen from '../screens/ExperiencesScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Inicio: '🏠',
    'Mis Turnos': '📋',
    Experiencias: '✍️',
    Anuncios: '📢',
    Notificaciones: '🔔',
    Perfil: '👤',
  };
  return (
    <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || '📌'}
    </Text>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: -2 },
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 4,
          height: 65 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarScrollEnabled: true,
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Mis Turnos" component={ShiftsScreen} />
      <Tab.Screen name="Experiencias" component={ExperiencesScreen} />
      <Tab.Screen name="Anuncios" component={AnnouncementsScreen} />
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ fontSize: 18, color: colors.textPrimary }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
