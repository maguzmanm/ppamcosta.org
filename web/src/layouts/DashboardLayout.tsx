import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, Sun, Moon, LogOut, LayoutDashboard, GitBranch, Building2, Users, MapPin, Calendar, Clock, FileText, Megaphone, BarChart3, Bell, Settings } from 'lucide-react';
import type { UserRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: <LayoutDashboard size={20} />, roles: ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'] },
  { to: '/circuitos', label: 'Circuitos', icon: <GitBranch size={20} />, roles: ['COORDINADOR', 'AUXILIAR'] },
  { to: '/congregaciones', label: 'Congregaciones', icon: <Building2 size={20} />, roles: ['COORDINADOR', 'AUXILIAR'] },
  { to: '/publicadores', label: 'Publicadores', icon: <Users size={20} />, roles: ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'] },
  { to: '/puntos', label: 'Puntos', icon: <MapPin size={20} />, roles: ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'] },
  { to: '/turnos', label: 'Turnos', icon: <Calendar size={20} />, roles: ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO'] },
  { to: '/disponibilidad', label: 'Disponibilidad', icon: <Clock size={20} />, roles: ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'] },
  { to: '/experiencias', label: 'Experiencias', icon: <FileText size={20} />, roles: ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'] },
  { to: '/anuncios', label: 'Anuncios', icon: <Megaphone size={20} />, roles: ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'] },
  { to: '/notificaciones', label: 'Notificaciones', icon: <Bell size={20} />, roles: ['COORDINADOR', 'AUXILIAR'] },
  { to: '/reportes', label: 'Reportes', icon: <BarChart3 size={20} />, roles: ['COORDINADOR'] },
];

export default function DashboardLayout() {
  const { user, logout, role } = useAuth();
  const { resolved, setTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-primary">PPAM Costa</h1>
        <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
          {user?.role?.replace(/_/g, ' ')}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <button
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors"
        >
          {resolved === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {resolved === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <NavLink
          to="/perfil"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`
          }
        >
          <Settings size={20} />
          Perfil
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={20} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-shrink-0 bg-surface border-r border-border">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-surface border-r border-border z-50">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 p-4 border-b border-border bg-surface">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-primary">PPAM Costa</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
