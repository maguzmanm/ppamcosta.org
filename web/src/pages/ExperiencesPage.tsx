import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, FileText, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import api from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import type { Experience } from '../types';

const statusBadge: Record<string, 'success' | 'warning' | 'danger'> = {
  APROBADO: 'success', PENDIENTE: 'warning', RECHAZADO: 'danger',
};

export default function ExperiencesPage() {
  const queryClient = useQueryClient();
  const { canManageExperiences, isCoordinator } = useAuth();

  // ─── Editar experiencia ───
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // ─── Crear experiencia ───
  const [createModal, setCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createMessage, setCreateMessage] = useState('');

  const { data: experiences, isLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: async () => { const { data } = await api.get('/experiences'); return data as Experience[]; },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title, content }: { id: string; title: string; content: string }) =>
      api.put(`/experiences/${id}`, { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      closeEditModal();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, title, content, reviewNotes }: { id: string; status: string; title?: string; content?: string; reviewNotes?: string }) =>
      api.put(`/experiences/${id}/review`, { status, title, content, reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      closeEditModal();
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      api.post('/experiences', { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      setCreateModal(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateMessage('');
    },
    onError: (err: any) => {
      setCreateMessage('❌ ' + (err.response?.data?.error || 'Error al crear'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/experiences/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['experiences'] }),
  });

  function openEditModal(e: Experience) {
    setEditingId(e.id);
    setEditTitle(e.title);
    setEditContent(e.content);
    setRejectNotes('');
    setShowRejectInput(false);
    setEditModal(true);
  }

  function closeEditModal() {
    setEditModal(false);
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setRejectNotes('');
    setShowRejectInput(false);
  }

  function handleApprove() {
    if (!editingId) return;
    reviewMutation.mutate({ id: editingId, status: 'APROBADO', title: editTitle, content: editContent });
  }

  function handleReject() {
    if (!editingId) return;
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    reviewMutation.mutate({ id: editingId, status: 'RECHAZADO', title: editTitle, content: editContent, reviewNotes: rejectNotes });
  }

  function handleSave() {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, title: editTitle, content: editContent });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Experiencias</h2>

      {/* Botón crear */}
      <div className="mb-6">
        <button
          onClick={() => { setCreateModal(true); setCreateMessage(''); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Nueva experiencia
        </button>
      </div>

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
                    <button onClick={() => openEditModal(e)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary-light transition-colors">
                      <Pencil size={14} /> Editar
                    </button>
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
                {canManageExperiences && (e.status === 'APROBADO' || e.status === 'RECHAZADO') && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { if (confirm('¿Revertir esta experiencia a pendiente?')) reviewMutation.mutate({ id: e.id, status: 'PENDIENTE' }); }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors">
                      <RotateCcw size={14} /> Revertir
                    </button>
                    {isCoordinator && (
                      <button onClick={() => { if (confirm('¿Eliminar esta experiencia definitivamente?')) deleteMutation.mutate(e.id); }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-danger rounded-md hover:bg-red-700 transition-colors">
                        <Trash2 size={14} /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-text-secondary whitespace-pre-wrap">{e.content}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                <span>{new Date(e.status === 'PENDIENTE' ? e.createdAt : e.updatedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      <Modal
        open={editModal}
        onClose={closeEditModal}
        title="Editar experiencia"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Título</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Contenido</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>

          {showRejectInput && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Motivo del rechazo</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-danger/30"
                placeholder="Explica por qué se rechaza..."
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || reviewMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={handleApprove}
              disabled={updateMutation.isPending || reviewMutation.isPending}
              className="inline-flex items-center gap-1 px-4 py-2 bg-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Check size={16} />
              {reviewMutation.isPending ? 'Aprobando...' : 'Aprobar'}
            </button>
            <button
              onClick={handleReject}
              disabled={updateMutation.isPending || reviewMutation.isPending}
              className="inline-flex items-center gap-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <X size={16} />
              {reviewMutation.isPending ? 'Rechazando...' : showRejectInput ? 'Confirmar rechazo' : 'Rechazar'}
            </button>
            <button
              onClick={closeEditModal}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-secondary rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm ml-auto"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de creación */}
      <Modal
        open={createModal}
        onClose={() => { setCreateModal(false); setCreateMessage(''); }}
        title="Nueva experiencia"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Título</label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Ej: Una experiencia en la predicación..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Contenido</label>
            <textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              rows={8}
              placeholder="Describe tu experiencia aquí..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>

          {createMessage && (
            <p className={`text-sm ${createMessage.startsWith('✅') ? 'text-success' : 'text-danger'}`}>
              {createMessage}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={() => {
                if (!createTitle.trim() || !createContent.trim()) {
                  setCreateMessage('❌ Título y contenido son requeridos');
                  return;
                }
                createMutation.mutate({ title: createTitle.trim(), content: createContent.trim() });
              }}
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              {createMutation.isPending ? 'Creando...' : 'Crear experiencia'}
            </button>
            <button
              onClick={() => { setCreateModal(false); setCreateMessage(''); }}
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
