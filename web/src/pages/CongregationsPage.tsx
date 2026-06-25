import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import type { Congregation, Circuit } from '../types';

export default function CongregationsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Congregation | null>(null);
  const [form, setForm] = useState({ name: '', circuitId: '' });

  // Estado para eliminación con reasignación
  const [deleteTarget, setDeleteTarget] = useState<Congregation | null>(null);
  const [reassignToId, setReassignToId] = useState('');

  const { data: congregations, isLoading } = useQuery({
    queryKey: ['congregations'],
    queryFn: async () => {
      const { data } = await api.get('/congregations');
      return data as Congregation[];
    },
  });

  const { data: circuits } = useQuery({
    queryKey: ['circuits'],
    queryFn: async () => {
      const { data } = await api.get('/circuits');
      return data as Circuit[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form & { id?: string }) => {
      if (payload.id) return api.put(`/congregations/${payload.id}`, payload);
      return api.post('/congregations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      setModalOpen(false);
      setForm({ name: '', circuitId: '' });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reassignTo }: { id: string; reassignTo?: string }) => {
      const params = reassignTo ? { reassignTo } : {};
      return api.delete(`/congregations/${id}`, { params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      setDeleteTarget(null);
      setReassignToId('');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Error al eliminar');
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: '', circuitId: '' });
    setModalOpen(true);
  }

  function openEdit(c: Congregation) {
    setEditing(c);
    setForm({ name: c.name, circuitId: c.circuitId });
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Congregaciones</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium">
          <Plus size={18} /> Nueva congregación
        </button>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Nombre', sortable: true },
          { key: 'circuit', header: 'Circuito', sortable: true, sortKey: 'circuit.name', render: (c) => c.circuit?.name || '-', hideOnMobile: true },
          { key: 'publishers', header: 'Publicadores', sortable: true, sortKey: '_count.publishers', render: (c) => (c as any)._count?.publishers ?? 0 },
          {
            key: 'actions', header: '', className: 'w-24',
            render: (c) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-primary"><Pencil size={16} /></button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  const count = (c as any)._count?.publishers ?? 0;
                  if (count > 0) {
                    setDeleteTarget(c);
                    setReassignToId('');
                  } else if (confirm('¿Eliminar esta congregación?')) {
                    deleteMutation.mutate({ id: c.id });
                  }
                }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
              </div>
            ),
          },
        ]}
        data={congregations || []}
        keyExtractor={(c) => c.id}
        loading={isLoading}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar congregación' : 'Nueva congregación'}
        onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }}
        submitLabel={editing ? 'Guardar' : 'Crear'} loading={saveMutation.isPending}>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nombre</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Circuito</label>
          <select required value={form.circuitId} onChange={(e) => setForm({ ...form, circuitId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
            <option value="">Seleccionar</option>
            {(circuits || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </Modal>

      {/* Modal de reasignación antes de eliminar */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setReassignToId(''); }}
        title="Reasignar publicadores"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">La congregación <strong>{deleteTarget?.name}</strong> tiene {
                (deleteTarget as any)?._count?.publishers ?? 0
              } publicador(es).</p>
              <p>Selecciona otra congregación para reasignarlos antes de eliminar.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Congregación destino</label>
            <select
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {(congregations || []).filter(c => c.id !== deleteTarget?.id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={() => {
                if (deleteTarget && reassignToId) {
                  deleteMutation.mutate({ id: deleteTarget.id, reassignTo: reassignToId });
                }
              }}
              disabled={!reassignToId || deleteMutation.isPending}
              className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Reasignar y eliminar'}
            </button>
            <button
              onClick={() => { setDeleteTarget(null); setReassignToId(''); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-secondary rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm ml-auto"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
