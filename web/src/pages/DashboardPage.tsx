import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, FileText, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

const COLORS = ['#00796B', '#D32F2F', '#ED6C02'];

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ABIERTO: 'success', CERRADO: 'default', CANCELADO: 'danger',
};

export default function DashboardPage() {
  const { user } = useAuth();
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
        experiencesByStatus: [
          { status: 'Aprobadas', count: (experiences.data as any[]).filter((e: any) => e.status === 'APROBADO').length },
          { status: 'Rechazadas', count: (experiences.data as any[]).filter((e: any) => e.status === 'RECHAZADO').length },
          { status: 'Pendientes', count: pendingExperiences },
        ],
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
                    </tr>
                  </thead>
                  <tbody>
                    {myShifts.map((s: any) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-background/50">
                        <td className="px-4 py-3 text-text-primary">
                          {new Date(s.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-text-primary">{s.timeSlot?.name}</td>
                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{s.location?.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge[s.status] || 'default'}>{s.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Experiencias por estado</h3>
              {stats?.experiencesByStatus?.some((e: any) => e.count > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={stats.experiencesByStatus.filter((e: any) => e.count > 0)} cx="50%" cy="50%" outerRadius={100}
                      dataKey="count" nameKey="status" label={({ status, count }: any) => `${status}: ${count}`}>
                      {stats.experiencesByStatus.filter((e: any) => e.count > 0).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-text-muted text-center py-8">Sin datos de experiencias</p>
              )}
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Resumen de actividad</h3>
              <div className="space-y-4">
                {[
                  { label: 'Publicadores activos', value: stats?.totalPublishers ?? 0, color: 'text-primary' },
                  { label: 'Turnos abiertos', value: stats?.activeShifts ?? 0, color: 'text-success' },
                  { label: 'Experiencias por revisar', value: stats?.pendingExperiences ?? 0, color: 'text-warning' },
                  { label: 'Puntos de predicación', value: stats?.totalLocations ?? 0, color: 'text-info' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-background">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className={`font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
