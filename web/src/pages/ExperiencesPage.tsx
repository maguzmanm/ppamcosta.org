import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Eye } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import type { Experience } from '../types';

const statusBadge: Record<string, 'success' | 'warning' | 'danger'> = {
  APROBADO: 'success', PENDIENTE: 'warning', RECHAZADO: 'danger',
};

function formatName(p: { firstName: string; lastName: string; marriedLastName?: string }) {
  if (p.marriedLastName) return `${p.firstName} de ${p.marriedLastName}`;
  return `${p.firstName} ${p.lastName}`;
}

export default function ExperiencesPage() {
  const queryClient = useQueryClient();
  const { canManageExperiences } = useAuth();

  const { data: experiences, isLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: async () => { const { data } = await api.get('/experiences'); return data as Experience[]; },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) =>
      api.put(`/experiences/${id}/review`, { status, reviewNotes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['experiences'] }),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Experiencias</h2>

      <DataTable
        columns={[
          { key: 'title', header: 'Título' },
          { key: 'publisher', header: 'Publicador', render: (e) => formatName(e.publisher), hideOnMobile: true },
          { key: 'status', header: 'Estado', render: (e) => <Badge variant={statusBadge[e.status] || 'warning'}>{e.status}</Badge> },
          { key: 'date', header: 'Fecha', render: (e) => new Date(e.createdAt).toLocaleDateString('es-CL'), hideOnMobile: true },
          ...(canManageExperiences ? [{
            key: 'actions' as string, header: '', className: 'w-28' as string,
            render: (e: Experience) => e.status === 'PENDIENTE' ? (
              <div className="flex gap-1">
                <button onClick={() => reviewMutation.mutate({ id: e.id, status: 'APROBADO' })}
                  className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-text-muted hover:text-success" title="Aprobar">
                  <Check size={16} />
                </button>
                <button onClick={() => { const notes = prompt('Motivo del rechazo:'); if (notes) reviewMutation.mutate({ id: e.id, status: 'RECHAZADO', reviewNotes: notes }); }}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger" title="Rechazar">
                  <X size={16} />
                </button>
              </div>
            ) : null,
          }] : []),
        ]}
        data={experiences || []} keyExtractor={(e) => e.id} loading={isLoading}
      />
    </div>
  );
}
