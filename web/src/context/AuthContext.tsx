import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import type { AuthState, User, UserRole } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isCoordinator: boolean;
  canManageExperiences: boolean;
  canManageLocations: boolean;
  canCreateShifts: boolean;
  canViewShifts: boolean;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_HIERARCHY: Record<UserRole, number> = {
  COORDINADOR: 6,
  AUXILIAR: 5,
  ENCARGADO_EXPERIENCIAS: 4,
  ENCARGADO_PUNTO: 3,
  AUXILIAR_PUNTO: 2,
  PUBLICADOR: 1,
};

function hasMinRole(userRole: UserRole | null, minRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    isLoading: false,
  });

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { token, user } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setState({ token, user, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ token: null, user: null, isLoading: false });
  }, []);

  const role = state.user?.role ?? null;
  const isCoordinator = role === 'COORDINADOR';
  const canManageExperiences = hasMinRole(role, 'ENCARGADO_EXPERIENCIAS');
  const canManageLocations = hasMinRole(role, 'ENCARGADO_PUNTO');
  const canCreateShifts = hasMinRole(role, 'ENCARGADO_PUNTO');
  const canViewShifts = hasMinRole(role, 'AUXILIAR_PUNTO');

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isCoordinator,
        canManageExperiences,
        canManageLocations,
        canCreateShifts,
        canViewShifts,
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
