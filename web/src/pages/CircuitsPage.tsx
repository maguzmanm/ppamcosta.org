import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import type { Circuit } from '../types';

export default function CircuitsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Circuit | null>(null);
  const [name, setName] = useState('');

  const { data: circuits, isLoading } = useQuery({
    queryKey: ['circuits'],
    queryFn: async () => {
      const { data } = await api.get('/circuits');
      return data as Circuit[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; id?: string }) => {
      if (payload.id) return api.put(`/circuits/${payload.id}`, payload);
      return api.post('/circuits', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuits'] });
      setModalOpen(false);
      setName('');
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/circuits/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['circuits'] }),
  });

  function openCreate() {
    setEditing(null);
    setName('');
    setModalOpen(true);
  }

  function openEdit(c: Circuit) {
    setEditing(c);
    setName(c.name);
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Circuitos</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium">
          <Plus size={18} /> Nuevo circuito
        </button>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Nombre' },
          { key: 'congregations', header: 'Congregaciones', render: (c) => c.congregations?.length ?? 0 },
          {
            key: 'actions', header: '', className: 'w-24',
            render: (c) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-primary"><Pencil size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar este circuito?')) deleteMutation.mutate(c.id); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
              </div>
            ),
          },
        ]}
        data={circuits || []}
        keyExtractor={(c) => c.id}
        loading={isLoading}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar circuito' : 'Nuevo circuito'}
        onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ name, id: editing?.id }); }}
        submitLabel={editing ? 'Guardar' : 'Crear'} loading={saveMutation.isPending}>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nombre del circuito</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
      </Modal>
    </div>
  );
}
