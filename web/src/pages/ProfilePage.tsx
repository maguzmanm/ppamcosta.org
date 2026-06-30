import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor, Lock } from 'lucide-react';
import api from '../services/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage('');
    if (newPassword !== confirmPassword) {
      setPwMessage('❌ Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 4) {
      setPwMessage('❌ La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setPwMessage('✅ Contraseña actualizada correctamente');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setPwMessage('❌ ' + (err.response?.data?.error || 'Error al cambiar contraseña'));
    } finally {
      setPwLoading(false);
    }
  }

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

        <div className="bg-surface rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Lock size={18} /> Cambiar contraseña
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Contraseña actual</label>
              <input
                type="password" required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nueva contraseña</label>
              <input
                type="password" required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Confirmar nueva contraseña</label>
              <input
                type="password" required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {pwMessage && (
              <p className={`text-sm ${pwMessage.startsWith('✅') ? 'text-success' : 'text-danger'}`}>{pwMessage}</p>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {pwLoading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
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
