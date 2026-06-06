import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  danger: string;
  warning: string;
  success: string;
  info: string;
}

const lightColors: ThemeColors = {
  primary: '#1E3A5F',
  primaryLight: '#2D5F8A',
  primaryDark: '#0F2440',
  secondary: '#00796B',
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceHover: '#F0F2F5',
  textPrimary: '#1A1D23',
  textSecondary: '#5A6070',
  textMuted: '#8B95A1',
  border: '#DDE1E6',
  danger: '#D32F2F',
  warning: '#ED6C02',
  success: '#2E7D32',
  info: '#0288D1',
};

const darkColors: ThemeColors = {
  primary: '#4A90D9',
  primaryLight: '#6BA8E0',
  primaryDark: '#2C5A8A',
  secondary: '#4DB6AC',
  background: '#121820',
  surface: '#1E2933',
  surfaceHover: '#263238',
  textPrimary: '#E8ECF1',
  textSecondary: '#9EA7B3',
  textMuted: '#6B7680',
  border: '#2E3A45',
  danger: '#EF5350',
  warning: '#FFA726',
  success: '#66BB6A',
  info: '#29B6F6',
};

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  setMode: () => {},
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return context;
}
