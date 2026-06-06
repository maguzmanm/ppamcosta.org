import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import type { Congregation, Circuit } from '../types';

export default function CongregationsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Congregation | null>(null);
  const [form, setForm] = useState({ name: '', circuitId: '' });

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
    mutationFn: (id: string) => api.delete(`/congregations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['congregations'] }),
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
          { key: 'name', header: 'Nombre' },
          { key: 'circuit', header: 'Circuito', render: (c) => c.circuit?.name || '-', hideOnMobile: true },
          { key: 'publishers', header: 'Publicadores', render: (c) => c._count?.publishers ?? 0 },
          {
            key: 'actions', header: '', className: 'w-24',
            render: (c) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-primary"><Pencil size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar esta congregación?')) deleteMutation.mutate(c.id); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
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
    </div>
  );
}
