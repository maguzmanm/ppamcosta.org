import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import type { Publisher, Congregation, UserRole } from '../types';

const DESIGNATIONS = [
  'MISIONERO',
  'PRECURSOR_ESPECIAL',
  'FAMILIA_BETEL',
  'PRECURSOR_REGULAR',
  'PUBLICADOR',
  'ANCIANO',
  'SIERVO_MINISTERIAL',
];

const DESIGNATION_LABELS: Record<string, string> = {
  MISIONERO: 'Misionero que sirve en el campo',
  PRECURSOR_ESPECIAL: 'Precursor especial',
  FAMILIA_BETEL: 'Miembro de la familia Betel',
  PRECURSOR_REGULAR: 'Precursor regular',
  PUBLICADOR: 'Publicador',
  ANCIANO: 'Anciano',
  SIERVO_MINISTERIAL: 'Siervo ministerial',
};

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'AUXILIAR', label: 'Auxiliar' },
  { value: 'ENCARGADO_PUNTO', label: 'Encargado de Punto' },
  { value: 'AUXILIAR_PUNTO', label: 'Auxiliar de Punto' },
  { value: 'ENCARGADO_EXPERIENCIAS', label: 'Encargado de Experiencias' },
  { value: 'PUBLICADOR', label: 'Publicador' },
];

function formatName(p: Publisher) {
  if (p.marriedLastName) return `${p.firstName} de ${p.marriedLastName}`;
  return `${p.firstName} ${p.lastName}`;
}

function formatPhone(phone?: string) {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `+56 9 ${digits.slice(0,4)} ${digits.slice(4)}`;
  if (digits.length === 11 && digits.startsWith('569')) return `+56 9 ${digits.slice(3,7)} ${digits.slice(7)}`;
  return phone;
}

export default function PublishersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Publisher | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    marriedLastName: '',
    email: '',
    phone: '',
    gender: '',
    congregationId: '',
    locationId: '',
    role: 'PUBLICADOR' as UserRole,
    password: '',
    isActive: true,
    notes: '',
    designations: [] as string[],
    otherDesignation: '',
  });

  const { data: publishers, isLoading } = useQuery({
    queryKey: ['publishers', search],
    queryFn: async () => {
      const { data } = await api.get('/publishers', { params: { search: search || undefined } });
      return data as Publisher[];
    },
  });

  const { data: congregations } = useQuery({
    queryKey: ['congregations'],
    queryFn: async () => {
      const { data } = await api.get('/congregations');
      return data as Congregation[];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get('/locations');
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form & { id?: string }) => {
      if (payload.id) {
        return api.put(`/publishers/${payload.id}`, payload);
      }
      return api.post('/publishers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/publishers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['publishers'] }),
  });

  function resetForm() {
    setEditing(null);
    setForm({
      firstName: '',
      lastName: '',
      marriedLastName: '',
      email: '',
      phone: '',
      gender: '',
      congregationId: '',
      locationId: '',
      role: 'PUBLICADOR',
      password: '',
      isActive: true,
      notes: '',
      designations: [],
      otherDesignation: '',
    });
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(p: Publisher) {
    setEditing(p);
    let existingDesignations: string[] = [];
    let otherDes = '';
    try {
      if (p.designations) {
        const parsed = JSON.parse(p.designations);
        existingDesignations = parsed.filter((d: string) => DESIGNATIONS.includes(d));
        otherDes = parsed.find((d: string) => !DESIGNATIONS.includes(d)) || '';
      }
    } catch { /* ignorar */ }
    
    setForm({
      firstName: p.firstName,
      lastName: p.lastName,
      marriedLastName: p.marriedLastName || '',
      email: p.email || '',
      phone: p.phone || '',
      gender: p.gender || '',
      congregationId: p.congregationId,
      locationId: (p as any).locationId || '',
      role: (p.user?.role as UserRole) || 'PUBLICADOR',
      password: '',
      isActive: p.isActive,
      notes: p.notes || '',
      designations: existingDesignations,
      otherDesignation: otherDes,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const allDesignations = [...form.designations];
    if (form.otherDesignation.trim()) {
      allDesignations.push(form.otherDesignation.trim());
    }
    const payload: any = { ...form };
    payload.designations = allDesignations.length > 0 ? JSON.stringify(allDesignations) : null;
    delete payload.otherDesignation;
    saveMutation.mutate({ ...payload, id: editing?.id });
  }

  const roleBadge = (role?: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'default'> = {
      COORDINADOR: 'info',
      AUXILIAR: 'secondary',
      ENCARGADO_PUNTO: 'warning',
      AUXILIAR_PUNTO: 'danger',
      ENCARGADO_EXPERIENCIAS: 'success',
      PUBLICADOR: 'default',
    };
    return <Badge variant={map[role || 'PUBLICADOR'] || 'default'}>{(role || 'PUBLICADOR').replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Publicadores</h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Nuevo publicador
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar publicador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-surface text-text-primary
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Nombre', render: (p) => formatName(p) },
          { key: 'email', header: 'Email', hideOnMobile: true, render: (p) => p.email || '-' },
          { key: 'phone', header: 'Teléfono', hideOnMobile: true, render: (p) => formatPhone(p.phone) },
          { key: 'role', header: 'Rol', render: (p) => roleBadge(p.user?.role) },
          { key: 'congregation', header: 'Congregación', hideOnMobile: true, render: (p) => p.congregation?.name || '-' },
          { key: 'location', header: 'Punto asignado', hideOnMobile: true, render: (p) => (p as any).location?.name || '-' },
          {
            key: 'actions',
            header: '',
            className: 'w-24',
            render: (p) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-primary">
                  <Pencil size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Desactivar este publicador?')) deleteMutation.mutate(p.id); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
        data={publishers || []}
        keyExtractor={(p) => p.id}
        loading={isLoading}
        emptyMessage="No se encontraron publicadores"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar publicador' : 'Nuevo publicador'}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Guardar cambios' : 'Crear publicador'}
        loading={saveMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Nombre</label>
            <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Apellido</label>
            <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Apellido de casada</label>
            <input value={form.marriedLastName} onChange={(e) => setForm({ ...form, marriedLastName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Género</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Seleccionar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Teléfono</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 XXXX XXXX"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Congregación</label>
            <select required value={form.congregationId} onChange={(e) => setForm({ ...form, congregationId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Seleccionar</option>
              {(congregations || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Punto asignado</label>
            <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Ninguno</option>
              {(locations || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Rol</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Contraseña {editing ? '(dejar vacía para no cambiar)' : ''}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Designaciones</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {DESIGNATIONS.map((des) => (
              <label key={des} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.designations.includes(des)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      designations: e.target.checked
                        ? [...form.designations, des]
                        : form.designations.filter((d) => d !== des),
                    });
                  }}
                  className="rounded border-border"
                />
                {DESIGNATION_LABELS[des]}
              </label>
            ))}
          </div>
          <div className="mt-2">
            <input
              value={form.otherDesignation}
              onChange={(e) => setForm({ ...form, otherDesignation: e.target.value })}
              placeholder="Otro (especificar)"
              className="w-full max-w-sm px-3 py-1.5 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Notas</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-border" />
          Publicador activo
        </label>
      </Modal>
    </div>
  );
}
