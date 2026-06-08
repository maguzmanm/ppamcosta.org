import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Map, ExternalLink } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import type { Location } from '../types';

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({
    name: '', address: '', latitude: '', longitude: '', notes: '', isActive: true,
    encargadoId: '', auxiliarIds: [] as string[],
  });

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => { const { data } = await api.get('/locations'); return data as Location[]; },
  });

  // Publicadores con rol ENCARGADO_PUNTO
  const { data: encargados } = useQuery({
    queryKey: ['publishers-encargados'],
    queryFn: async () => {
      const { data } = await api.get('/publishers', { params: { role: 'ENCARGADO_PUNTO' } });
      return data as any[];
    },
  });

  // Publicadores con rol AUXILIAR_PUNTO
  const { data: auxiliares } = useQuery({
    queryKey: ['publishers-auxiliares'],
    queryFn: async () => {
      const { data } = await api.get('/publishers', { params: { role: 'AUXILIAR_PUNTO' } });
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      const body = { ...payload };
      delete body.id;
      body.latitude = parseFloat(payload.latitude) || null;
      body.longitude = parseFloat(payload.longitude) || null;
      if (editing?.id) return api.put(`/locations/${editing.id}`, body);
      return api.post('/locations', body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); setModalOpen(false); resetForm(); },
    onError: (err: any) => { alert(err?.response?.data?.error || 'Error al guardar el punto'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  });

  function resetForm() { setEditing(null); setForm({ name: '', address: '', latitude: '', longitude: '', notes: '', isActive: true, encargadoId: '', auxiliarIds: [] }); }

  function openCreate() { resetForm(); setModalOpen(true); }
  function openEdit(l: Location) {
    setEditing(l);
    const assignments = (l as any).locationAssignments || [];
    const encargado = assignments.find((a: any) => a.roleAtLocation === 'ENCARGADO');
    const auxs = assignments.filter((a: any) => a.roleAtLocation === 'AUXILIAR').map((a: any) => a.userId);
    setForm({
      name: l.name, address: l.address,
      latitude: l.latitude?.toString() || '', longitude: l.longitude?.toString() || '',
      notes: l.notes || '', isActive: l.isActive,
      encargadoId: encargado?.userId || '',
      auxiliarIds: auxs,
    });
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Puntos</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium">
          <Plus size={18} /> Nuevo punto
        </button>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Nombre', render: (l) => (
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-secondary" />
              <span>{l.name}</span>
            </div>
          )},
          { key: 'address', header: 'Dirección', hideOnMobile: true, render: (l) => (
            <div className="flex items-center gap-1.5">
              <span className="text-text-secondary">{l.address}</span>
              <a href={mapsUrl(l)} target="_blank" rel="noopener noreferrer"
                 className="text-text-muted hover:text-primary transition-colors inline-flex"
                 title="Ver en Google Maps">
                <ExternalLink size={14} />
              </a>
            </div>
          )},
          { key: 'status', header: 'Estado', render: (l) => l.isActive ? <span className="text-success text-xs font-medium">Activo</span> : <span className="text-text-muted text-xs">Inactivo</span> },
          { key: 'actions', header: '', className: 'w-24',
            render: (l) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(l); }} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-primary"><Pencil size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar este punto?')) deleteMutation.mutate(l.id); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger"><Trash2 size={16} /></button>
              </div>
            ),
          },
        ]}
        data={locations || []} keyExtractor={(l) => l.id} loading={isLoading}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar punto' : 'Nuevo punto'}
        onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }}
        submitLabel={editing ? 'Guardar' : 'Crear'} loading={saveMutation.isPending}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Nombre</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Dirección</label>
            <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Latitud</label>
            <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Longitud</label>
            <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Notas</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Encargado de punto</label>
            <select value={form.encargadoId} onChange={(e) => setForm({ ...form, encargadoId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Seleccionar</option>
              {(encargados || []).map((p: any) => (
                <option key={p.id} value={p.user?.id || ''}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Auxiliares de punto</label>
            <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
              {(auxiliares || []).map((p: any) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auxiliarIds.includes(p.user?.id || '')}
                    onChange={(e) => {
                      const uid = p.user?.id || '';
                      setForm({
                        ...form,
                        auxiliarIds: e.target.checked
                          ? [...form.auxiliarIds, uid]
                          : form.auxiliarIds.filter((id) => id !== uid),
                      });
                    }}
                    className="rounded border-border"
                  />
                  {p.firstName} {p.lastName}
                </label>
              ))}
              {(!auxiliares || auxiliares.length === 0) && (
                <p className="text-xs text-text-muted py-1">No hay auxiliares disponibles</p>
              )}
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-border" />
          Punto activo
        </label>
      </Modal>
    </div>
  );
}

function MapPin(props: any) { return <Map {...props} />; }

function mapsUrl(l: Location): string {
  if (l.latitude && l.longitude) return `https://www.google.com/maps?q=${l.latitude},${l.longitude}`;
  if (l.address) return `https://www.google.com/maps?q=${encodeURIComponent(l.address)}`;
  return '#';
}
