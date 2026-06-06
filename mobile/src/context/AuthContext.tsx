import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../services/api';
import type { AuthState, User, UserRole } from '../types';

// Configurar cómo se muestran las notificaciones en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerPushToken() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.post('/notifications/device', {
      token,
      platform: Platform.OS,
    });
    console.log('[PUSH] Token registrado:', token.substring(0, 20) + '...');
  } catch (err) {
    console.log('[PUSH] No se pudo registrar token:', err);
  }
}

async function unregisterPushToken() {
  try {
    await api.delete('/notifications/device');
  } catch { /* ignore */ }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isCoordinator: boolean;
  canManageExperiences: boolean;
  canManageLocations: boolean;
  canCreateShifts: boolean;
  canViewShifts: boolean;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  // Cargar sesión guardada
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const userStr = await SecureStore.getItemAsync('user');
        if (token && userStr) {
          const user = JSON.parse(userStr) as User;
          setState({ token, user, isLoading: false });
        } else {
          setState({ token: null, user: null, isLoading: false });
        }
      } catch {
        setState({ token: null, user: null, isLoading: false });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('token', data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    setState({ token: data.token, user: data.user, isLoading: false });
    // Registrar para notificaciones push
    registerPushToken();
  }, []);

  const logout = useCallback(async () => {
    await unregisterPushToken();
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setState({ token: null, user: null, isLoading: false });
  }, []);

  const role = state.user?.role || null;

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    role,
    isCoordinator: role === 'COORDINADOR',
    canManageExperiences: role === 'COORDINADOR' || role === 'ENCARGADO_EXPERIENCIAS',
    canManageLocations: role === 'COORDINADOR' || role === 'ENCARGADO_PUNTO' || role === 'AUXILIAR_PUNTO',
    canCreateShifts: role === 'COORDINADOR' || role === 'ENCARGADO_PUNTO' || role === 'AUXILIAR_PUNTO',
    canViewShifts: role === 'COORDINADOR' || role === 'AUXILIAR' || role === 'ENCARGADO_PUNTO' || role === 'AUXILIAR_PUNTO',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
