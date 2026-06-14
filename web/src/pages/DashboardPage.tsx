import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Bell, BellOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import { getPermissionState, subscribeToPush, unsubscribeFromPush, isPushSupported } from '../services/push';

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [pushGranted, setPushGranted] = useState(() => { try { return getPermissionState() === 'granted'; } catch { return false; } });
  const [pushSupported] = useState(() => { try { return isPushSupported(); } catch { return false; } });
  const [pushDismissed, setPushDismissed] = useState(false);

  const handleEnablePush = async () => { const ok = await subscribeToPush(); setPushGranted(ok); };
  const handleDisablePush = async () => { await unsubscribeFromPush(); setPushGranted(false); };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const results = await Promise.allSettled([
        api.get('/publishers').catch(() => ({ data: [] })),
        api.get('/shifts').catch(() => ({ data: [] })),
        api.get('/experiences').catch(() => ({ data: [] })),
        api.get('/locations').catch(() => ({ data: [] })),
      ]);
      const getData = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value.data : [];
      const shifts = getData(results[1]);
      const experiences = getData(results[2]);
      return {
        totalPublishers: (Array.isArray(getData(results[0])) ? getData(results[0]) : []).length,
        activeShifts: (Array.isArray(shifts) ? shifts : []).filter((s: any) => s.status === 'ABIERTO').length,
        pendingExperiences: (Array.isArray(experiences) ? experiences : []).filter((e: any) => e.status === 'PENDIENTE').length,
        totalLocations: (Array.isArray(getData(results[3])) ? getData(results[3]) : []).length,
      };
    },
    refetchInterval: 30000,
    retry: false,
  });

  const { data: myShifts, isLoading: myShiftsLoading } = useQuery({
    queryKey: ['myShifts', user?.publisherId],
    queryFn: async () => {
      if (!user?.publisherId) return [];
      const { data } = await api.get('/shifts/my');
      return (data as any[]).map((a: any) => ({ ...a.shift, assignmentStatus: a.status, assignmentId: a.id }));
    },
    enabled: !!user?.publisherId,
    retry: false,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ shiftId, response }: { shiftId: string; response: string }) =>
      api.post(`/shifts/${shiftId}/respond`, { response }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myShifts'] }),
  });

  const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    ABIERTO: 'success', CERRADO: 'default', CANCELADO: 'danger',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Inicio</h2>

      {pushSupported && !pushGranted && !pushDismissed && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Bell size={20} className="text-primary" /><span className="text-sm">Activa notificaciones</span></div>
          <div className="flex items-center gap-2">
            <button onClick={handleEnablePush} className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg">Activar</button>
            <button onClick={() => setPushDismissed(true)} className="p-1.5"><X size={16} /></button>
          </div>
        </div>
      )}
      {pushGranted && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Bell size={20} className="text-success" /><span className="text-sm">Notificaciones activadas</span></div>
          <button onClick={handleDisablePush} className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg"><BellOff size={14} /> Desactivar</button>
        </div>
      )}

      {isLoading ? (
        <p className="text-text-muted">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[{ label: 'Publicadores', value: stats?.totalPublishers ?? '--', color: 'text-primary' },
            { label: 'Turnos activos', value: stats?.activeShifts ?? '--', color: 'text-secondary' },
            { label: 'Exp. pendientes', value: stats?.pendingExperiences ?? '--', color: 'text-warning' },
            { label: 'Puntos', value: stats?.totalLocations ?? '--', color: 'text-info' }].map(c => (
            <div key={c.label} className="bg-surface rounded-xl p-6 border border-border shadow-sm">
              <p className="text-text-muted text-sm">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-semibold text-text-primary mb-4">Mis turnos</h3>
      {myShiftsLoading ? <p className="text-text-muted">Cargando...</p>
      : !myShifts?.length ? <p className="text-text-muted bg-surface rounded-xl p-6 border text-center">No tienes turnos asignados</p>
      : (
        <div className="bg-surface rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-background">
              <th className="text-left px-4 py-3 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 font-medium">Horario</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Punto</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-left px-4 py-3 font-medium">Acción</th>
            </tr></thead>
            <tbody>{myShifts.map((s: any) => {
              const myStatus = s.assignmentStatus || 'PENDIENTE';
              return (
                <tr key={s.id} className="border-b hover:bg-background/50">
                  <td className="px-4 py-3">{new Date(s.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-3">{s.timeSlot?.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{s.location?.name}</td>
                  <td className="px-4 py-3"><Badge variant={statusBadge[s.status] || 'default'}>{s.status}</Badge></td>
                  <td className="px-4 py-3">
                    {myStatus === 'PENDIENTE' ? (
                      <div className="flex gap-1">
                        <button onClick={() => respondMutation.mutate({ shiftId: s.id, response: 'ACEPTADO' })}
                          className="px-2 py-1 text-xs text-white bg-success rounded-md"><Check size={14} /> Aceptar</button>
                        <button onClick={() => respondMutation.mutate({ shiftId: s.id, response: 'RECHAZADO' })}
                          className="px-2 py-1 text-xs text-white bg-danger rounded-md"><X size={14} /> Rechazar</button>
                      </div>
                    ) : <span className="text-xs text-text-muted">—</span>}
                  </td>
                </tr>
              )})}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
