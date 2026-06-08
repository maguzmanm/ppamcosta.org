import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PublishersPage from './pages/PublishersPage';
import CircuitsPage from './pages/CircuitsPage';
import CongregationsPage from './pages/CongregationsPage';
import LocationsPage from './pages/LocationsPage';
import ShiftsPage from './pages/ShiftsPage';
import ExperiencesPage from './pages/ExperiencesPage';
import AvailabilityPage from './pages/AvailabilityPage';
import ProfilePage from './pages/ProfilePage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import type { UserRole } from './types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { token, role } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && role && !roles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold text-text-primary mb-2">Acceso denegado</h2>
          <p className="text-text-secondary">No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/circuitos"
          element={
            <ProtectedRoute roles={['COORDINADOR', 'AUXILIAR']}>
              <CircuitsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/congregaciones"
          element={
            <ProtectedRoute roles={['COORDINADOR', 'AUXILIAR']}>
              <CongregationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/publicadores"
          element={
            <ProtectedRoute roles={['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO']}>
              <PublishersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/puntos"
          element={
            <ProtectedRoute roles={['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO']}>
              <LocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/turnos"
          element={
            <ProtectedRoute roles={['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO']}>
              <ShiftsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/experiencias" element={<ExperiencesPage />} />
        <Route
          path="/disponibilidad"
          element={<AvailabilityPage />}
        />
        <Route path="/anuncios" element={<AnnouncementsPage />} />
        <Route path="/notificaciones" element={<NotificationsPage />} />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute roles={['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/perfil" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
