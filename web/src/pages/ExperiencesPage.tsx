import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, FileText } from 'lucide-react';
import api from '../services/api';
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

      {isLoading ? (
        <p className="text-text-muted">Cargando experiencias...</p>
      ) : !experiences?.length ? (
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <FileText size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No hay experiencias registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiences.map((e) => (
            <div key={e.id} className="bg-surface rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-text-primary">{e.title}</h3>
                  <Badge variant={statusBadge[e.status] || 'warning'}>{e.status}</Badge>
                </div>
                {canManageExperiences && e.status === 'PENDIENTE' && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => reviewMutation.mutate({ id: e.id, status: 'APROBADO' })}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-success rounded-md hover:bg-green-700 transition-colors">
                      <Check size={14} /> Aprobar
                    </button>
                    <button onClick={() => { const notes = prompt('Motivo del rechazo:'); if (notes) reviewMutation.mutate({ id: e.id, status: 'RECHAZADO', reviewNotes: notes }); }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-danger rounded-md hover:bg-red-700 transition-colors">
                      <X size={14} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
              <p className="text-text-secondary whitespace-pre-wrap">{e.content}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                <span>{formatName(e.publisher)}</span>
                <span>{new Date(e.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {e.congregation && <span>{e.congregation.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
