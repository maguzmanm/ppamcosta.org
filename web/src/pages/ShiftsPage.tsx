import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import type { Shift, Location, TimeSlot, Publisher } from '../types';
import { useAuth } from '../context/AuthContext';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ABIERTO: 'success', CERRADO: 'default', CANCELADO: 'danger',
};

function formatName(p: { firstName: string; lastName: string; marriedLastName?: string }) {
  if (p.marriedLastName) return `${p.firstName} de ${p.marriedLastName}`;
  return `${p.firstName} ${p.lastName}`;
}

function formatLastAssignment(p: any): string {
  const last = p.shiftAssignments?.[0]?.assignedAt;
  if (!last) return 'Sin turnos previos';
  const d = new Date(last);
  return `Último: ${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
}

interface AvailablePublisher extends Publisher {
  shiftAssignments?: { assignedAt: string }[];
}

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const { canCreateShifts } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState({
    locationId: '', date: '', timeSlotId: '', maxPublishers: 2, notes: '',
    publisher1Id: '', publisher2Id: '',
  });

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => { const { data } = await api.get('/shifts'); return data as Shift[]; },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => { const { data } = await api.get('/locations'); return data as Location[]; },
  });

  const { data: timeSlots } = useQuery({
    queryKey: ['timeslots'],
    queryFn: async () => { const { data } = await api.get('/timeslots'); return data as TimeSlot[]; },
  });

  // Cargar publicadores disponibles cuando fecha, horario y punto están seleccionados
  const { data: availablePublishers } = useQuery({
    queryKey: ['availablePublishers', form.date, form.timeSlotId, form.locationId],
    queryFn: async () => {
      const { data } = await api.get('/publishers/available-for-shift', {
        params: { date: form.date, timeSlotId: form.timeSlotId, locationId: form.locationId },
      });
      return data as AvailablePublisher[];
    },
    enabled: !!(form.date && form.timeSlotId && form.locationId),
  });

  const canSeePublishers = !!(form.date && form.timeSlotId && form.locationId);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const body: any = {
        locationId: payload.locationId,
        date: payload.date,
        timeSlotId: payload.timeSlotId,
        maxPublishers: payload.maxPublishers,
        notes: payload.notes,
        publisherIds: [payload.publisher1Id, payload.publisher2Id].filter(Boolean),
      };
      return api.post('/shifts', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Error al crear el turno. Revisa que el backend esté activo.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof form & { id: string }) => {
      const body: any = {
        locationId: payload.locationId,
        date: payload.date,
        timeSlotId: payload.timeSlotId,
        maxPublishers: payload.maxPublishers,
        notes: payload.notes,
        publisherIds: [payload.publisher1Id, payload.publisher2Id].filter(Boolean),
      };
      return api.put(`/shifts/${payload.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Error al actualizar el turno.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });

  function resetForm() {
    setEditing(null);
    setForm({ locationId: '', date: '', timeSlotId: '', maxPublishers: 2, notes: '', publisher1Id: '', publisher2Id: '' });
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(s: Shift) {
    setEditing(s);
    const existingIds = (s.assignments || []).map((a: any) => a.publisherId);
    setForm({
      locationId: s.locationId,
      date: s.date?.split('T')[0] || '',
      timeSlotId: s.timeSlotId,
      maxPublishers: s.maxPublishers,
      notes: s.notes || '',
      publisher1Id: existingIds[0] || '',
      publisher2Id: existingIds[1] || '',
    });
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Turnos</h2>
        {canCreateShifts && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium">
            <Plus size={18} /> Nuevo turno
          </button>
        )}
      </div>

      <DataTable
        columns={[
          { key: 'date', header: 'Fecha', render: (s) => new Date(s.date).toLocaleDateString('es-CL') },
          { key: 'location', header: 'Punto', render: (s) => s.location?.name || '-', hideOnMobile: true },
          { key: 'time', header: 'Horario', render: (s) => s.timeSlot?.name || '-' },
          { key: 'status', header: 'Estado', render: (s) => <Badge variant={statusBadge[s.status] || 'default'}>{s.status}</Badge> },
          { key: 'assignments', header: 'Asignados', render: (s) => (
            <div className="text-sm">
              {(s.assignments || []).length === 0 ? (
                <span className="text-text-muted">Sin asignar</span>
              ) : (
                <ul className="list-disc list-inside">
                  {(s.assignments || []).map((a: any) => (
                    <li key={a.id}>{formatName(a.publisher)}</li>
                  ))}
                </ul>
              )}
            </div>
          )},
          ...(canCreateShifts ? [{
            key: 'actions', header: '', className: 'w-24' as const,
            render: (s: Shift) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-primary">
                  <Pencil size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar este turno?')) deleteMutation.mutate(s.id); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          }] : []),
        ]}
        data={shifts || []} keyExtractor={(s) => s.id} loading={isLoading}
      />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
        title={editing ? 'Editar turno' : 'Nuevo turno'}
        onSubmit={(e) => { e.preventDefault(); editing ? updateMutation.mutate({ ...form, id: editing.id }) : createMutation.mutate(form); }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear turno'}
        loading={createMutation.isPending || updateMutation.isPending}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Punto</label>
            <select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Seleccionar</option>
              {(locations || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Fecha</label>
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Franja horaria</label>
            <select required value={form.timeSlotId} onChange={(e) => setForm({ ...form, timeSlotId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Seleccionar</option>
              {(timeSlots || []).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.startTime} - {t.endTime})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Máx. publicadores</label>
            <input type="number" min={1} max={10} value={form.maxPublishers} onChange={(e) => setForm({ ...form, maxPublishers: parseInt(e.target.value) || 2 })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
        </div>

        {canSeePublishers && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Publicador 1</label>
              <select
                value={form.publisher1Id}
                onChange={(e) => setForm({ ...form, publisher1Id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              >
                <option value="">-- Seleccionar --</option>
                {(availablePublishers || []).map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === form.publisher2Id}>
                    {formatName(p)} — {formatLastAssignment(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Publicador 2</label>
              <select
                value={form.publisher2Id}
                onChange={(e) => setForm({ ...form, publisher2Id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              >
                <option value="">-- Seleccionar --</option>
                {(availablePublishers || []).map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === form.publisher1Id}>
                    {formatName(p)} — {formatLastAssignment(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!canSeePublishers && (form.date || form.timeSlotId || form.locationId) && (
          <p className="text-text-muted text-sm">Selecciona punto, fecha y horario para ver publicadores disponibles.</p>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Notas</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
      </Modal>
    </div>
  );
}
