import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import type { Announcement } from '../types';

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isCoordinator = user?.role === 'COORDINADOR';
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await api.get('/announcements');
      return data as Announcement[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form & { id?: string }) => {
      if (payload.id) return api.put(`/announcements/${payload.id}`, payload);
      return api.post('/announcements', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Error al guardar el anuncio');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  function resetForm() {
    setEditing(null);
    setForm({ title: '', content: '' });
  }

  function openCreate() { resetForm(); setModalOpen(true); }
  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title, content: a.content });
    setModalOpen(true);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Anuncios</h2>
        {isCoordinator && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium">
            <Plus size={18} /> Nuevo anuncio
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-text-muted">Cargando anuncios...</p>
      ) : !announcements?.length ? (
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <Megaphone size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No hay anuncios publicados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-surface rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{a.title}</h3>
                  <p className="text-text-secondary whitespace-pre-wrap">{a.content}</p>
                  <p className="text-text-muted text-xs mt-3">
                    {new Date(a.publishedAt).toLocaleDateString('es-CL', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {isCoordinator && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-primary">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => { if (confirm('¿Eliminar este anuncio?')) deleteMutation.mutate(a.id); }}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted hover:text-danger">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isCoordinator && (
        <Modal
          open={modalOpen}
          onClose={() => { setModalOpen(false); resetForm(); }}
          title={editing ? 'Editar anuncio' : 'Nuevo anuncio'}
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }}
          submitLabel={editing ? 'Guardar' : 'Publicar'}
          loading={saveMutation.isPending}
        >
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Título</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título del anuncio"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Cuerpo</label>
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5}
              placeholder="Contenido del anuncio..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-y" />
          </div>
        </Modal>
      )}
    </div>
  );
}
