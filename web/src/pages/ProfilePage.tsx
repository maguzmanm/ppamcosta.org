import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Perfil</h2>

      <div className="max-w-lg space-y-6">
        <div className="bg-surface rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Información de la cuenta</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Email</span>
              <span className="text-text-primary font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Rol</span>
              <span className="text-text-primary font-medium">{user?.role?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Publicador</span>
              <span className="text-text-primary font-medium">{user?.publisherName}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Apariencia</h3>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === t
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t === 'light' && <Sun size={16} />}
                {t === 'dark' && <Moon size={16} />}
                {t === 'system' && <Monitor size={16} />}
                {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Sistema'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 text-danger rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
