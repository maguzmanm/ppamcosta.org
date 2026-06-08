import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Calendar, FileText, MapPin, Check, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ABIERTO: 'success', CERRADO: 'default', CANCELADO: 'danger',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [publishers, shifts, experiences, locations] = await Promise.all([
        api.get('/publishers'),
        api.get('/shifts'),
        api.get('/experiences'),
        api.get('/locations'),
      ]);

      const activeShifts = (shifts.data as any[]).filter((s: any) => s.status === 'ABIERTO').length;
      const pendingExperiences = (experiences.data as any[]).filter((e: any) => e.status === 'PENDIENTE').length;

      return {
        totalPublishers: (publishers.data as any[]).length,
        activeShifts,
        pendingExperiences,
        totalLocations: (locations.data as any[]).length,
      };
    },
    refetchInterval: 30000,
  });

  // Turnos asignados al publicador actual
  const { data: myShifts, isLoading: myShiftsLoading } = useQuery({
    queryKey: ['myShifts', user?.publisherId],
    queryFn: async () => {
      if (!user?.publisherId) return [];
      const { data } = await api.get('/shifts', { params: { publisherId: user.publisherId } });
      return data as any[];
    },
    enabled: !!user?.publisherId,
    refetchInterval: 30000,
  });

  // Responder a una asignación (aceptar/rechazar)
  const respondMutation = useMutation({
    mutationFn: async ({ shiftId, response }: { shiftId: string; response: string }) => {
      return api.post(`/shifts/${shiftId}/respond`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myShifts'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Error al responder al turno';
      const contacts = err?.response?.data?.details;
      if (contacts && Array.isArray(contacts)) {
        const contactStr = contacts.map((c: any) =>
          `• ${c.name} (${c.role}): ${c.phone}`
        ).join('\n');
        alert(`${msg}\n\nContactos:\n${contactStr}`);
      } else {
        alert(msg);
      }
    },
  });

  // Obtener estado de asignación para el publicador actual
  function myAssignmentStatus(shift: any): string {
    if (!user?.publisherId) return 'PENDIENTE';
    const myAssignment = shift.assignments?.find((a: any) => a.publisherId === user.publisherId);
    return myAssignment?.status || 'PENDIENTE';
  }

  const cards = [
    { label: 'Publicadores', value: stats?.totalPublishers ?? '--', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Turnos activos', value: stats?.activeShifts ?? '--', icon: Calendar, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Exp. pendientes', value: stats?.pendingExperiences ?? '--', icon: FileText, color: 'text-warning', bg: 'bg-orange-100 dark:bg-orange-900/20' },
    { label: 'Puntos', value: stats?.totalLocations ?? '--', icon: MapPin, color: 'text-info', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Inicio</h2>
      {isLoading ? (
        <div className="text-text-muted">Cargando estadísticas...</div>
      ) : (
        <>
          {user?.role !== 'PUBLICADOR' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {cards.map((card) => (
              <div key={card.label} className="bg-surface rounded-xl p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-text-muted text-sm">{card.label}</p>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon size={20} className={card.color} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
          )}

          {/* Mis turnos asignados */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Mis turnos</h3>
            {myShiftsLoading ? (
              <p className="text-text-muted">Cargando turnos...</p>
            ) : !myShifts?.length ? (
              <p className="text-text-muted bg-surface rounded-xl p-6 border border-border text-center">
                No tienes turnos asignados
              </p>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      <th className="text-left px-4 py-3 text-text-muted font-medium">Fecha</th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium">Horario</th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium hidden sm:table-cell">Punto</th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium">Estado</th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myShifts.map((s: any) => {
                      const myStatus = myAssignmentStatus(s);
                      const isPending = myStatus === 'PENDIENTE';
                      return (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-background/50">
                        <td className="px-4 py-3 text-text-primary">
                          {new Date(s.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-text-primary">{s.timeSlot?.name}</td>
                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{s.location?.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge[s.status] || 'default'}>{s.status}</Badge>
                          {myStatus !== 'PENDIENTE' && (
                            <span className={`ml-1.5 text-xs ${myStatus === 'ACEPTADO' ? 'text-success' : 'text-danger'}`}>
                              · {myStatus === 'ACEPTADO' ? 'Aceptado' : 'Rechazado'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => respondMutation.mutate({ shiftId: s.id, response: 'ACEPTADO' })}
                                disabled={respondMutation.isPending}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-success rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                <Check size={14} /> Aceptar
                              </button>
                              <button
                                onClick={() => respondMutation.mutate({ shiftId: s.id, response: 'RECHAZADO' })}
                                disabled={respondMutation.isPending}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-danger rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                <X size={14} /> Rechazar
                              </button>
                            </div>
                          ) : myStatus === 'ACEPTADO' ? (
                            <button
                              onClick={() => respondMutation.mutate({ shiftId: s.id, response: 'RECHAZADO' })}
                              disabled={respondMutation.isPending}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-danger border border-danger rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                              <X size={14} /> Rechazar
                            </button>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
}
