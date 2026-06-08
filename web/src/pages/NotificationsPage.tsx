import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Smartphone, Mail, RefreshCw, CheckCheck, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const isCoordinator = user?.role === 'COORDINADOR';
  const isAdmin = user?.role === 'COORDINADOR' || user?.role === 'AUXILIAR';
  const queryClient = useQueryClient();

  // Suscripciones push activas
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: async () => {
      const { data } = await api.get('/push/subscriptions');
      return data as any[];
    },
    refetchInterval: 15000,
  });

  // Historial de notificaciones
  const { data: notifications } = useQuery({
    queryKey: ['notifications-admin'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=50');
      return data as any[];
    },
    refetchInterval: 15000,
  });

  // Preferencias de notificación
  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/preferences');
      return data as any;
    },
  });

  // Actualizar preferencias
  const prefMutation = useMutation({
    mutationFn: async (prefs: { pushEnabled?: boolean; emailEnabled?: boolean }) => {
      return api.put('/notifications/preferences', prefs);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  // Marcar una como leída
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-admin'] }),
  });

  // Marcar todas como leídas
  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-admin'] }),
  });

  const unreadCount = notifications?.filter((n: any) => !n.readAt).length || 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Notificaciones</h2>

      {/* Mis preferencias */}
      <div className="mb-8 bg-surface rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Bell size={20} className="text-primary" /> Mis preferencias
          {!isCoordinator && (
            <span className="text-xs text-text-muted font-normal">(solo lectura)</span>
          )}
        </h3>
        <div className="flex flex-wrap gap-6">
          <label className={`flex items-center gap-2 ${isCoordinator ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
            <input
              type="checkbox"
              checked={preferences?.pushEnabled ?? true}
              onChange={(e) => prefMutation.mutate({ pushEnabled: e.target.checked })}
              disabled={!isCoordinator}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
            />
            <Smartphone size={18} className="text-text-secondary" />
            <span className="text-sm text-text-primary">Push</span>
          </label>
          <label className={`flex items-center gap-2 ${isCoordinator ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
            <input
              type="checkbox"
              checked={preferences?.emailEnabled ?? true}
              onChange={(e) => prefMutation.mutate({ emailEnabled: e.target.checked })}
              disabled={!isCoordinator}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
            />
            <Mail size={18} className="text-text-secondary" />
            <span className="text-sm text-text-primary">Email</span>
          </label>
        </div>
      </div>

      {/* Suscripciones Push activas (solo admin) */}
      {isAdmin && (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Smartphone size={20} className="text-success" />
            Suscripciones Push activas
            <span className="text-sm font-normal text-text-muted">
              ({subscriptions?.length || 0})
            </span>
          </h3>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] })}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {isLoading ? (
          <p className="text-text-muted">Cargando...</p>
        ) : !subscriptions?.length ? (
          <p className="text-text-muted bg-surface rounded-xl p-6 border border-border text-center text-sm">
            Ningún dispositivo tiene notificaciones push activadas
          </p>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Rol</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium hidden sm:table-cell">Navegador</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium hidden md:table-cell">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub: any) => (
                  <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-background/50">
                    <td className="px-4 py-3 text-text-primary">
                      {sub.user?.publisher?.firstName} {sub.user?.publisher?.lastName}
                      <div className="text-xs text-text-muted">{sub.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {sub.user?.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden sm:table-cell text-xs max-w-[200px] truncate">
                      {sub.userAgent || '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden md:table-cell text-xs">
                      {new Date(sub.createdAt).toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Historial reciente */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Bell size={20} className="text-warning" />
            Historial reciente
            <span className="text-sm font-normal text-text-muted">
              ({notifications?.length || 0})
            </span>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                {unreadCount} sin leer
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <CheckCheck size={14} /> Marcar todas leídas
              </button>
            )}
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications-admin'] })}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        {!notifications?.length ? (
          <p className="text-text-muted bg-surface rounded-xl p-6 border border-border text-center text-sm">
            Sin notificaciones
          </p>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Título</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium hidden md:table-cell">Fecha</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium w-24">Acción</th>
                </tr>
              </thead>
              <tbody>
                {notifications.slice(0, 30).map((n: any) => (
                  <tr key={n.id} className="border-b border-border last:border-0 hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div className="text-text-primary text-sm font-medium">{n.title}</div>
                      <div className="text-text-muted text-xs">{n.body}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <code className="text-xs bg-background px-1.5 py-0.5 rounded">{n.type}</code>
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden md:table-cell text-xs">
                      {new Date(n.createdAt).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3">
                      {n.readAt ? (
                        <span className="text-xs text-success flex items-center gap-1">
                          <Check size={12} /> {new Date(n.readAt).toLocaleDateString('es-CL')}
                        </span>
                      ) : (
                        <button
                          onClick={() => markReadMutation.mutate(n.id)}
                          disabled={markReadMutation.isPending}
                          className="text-xs text-warning hover:text-primary font-medium transition-colors disabled:opacity-50"
                        >
                          ● Marcar leída
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
