import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Calendar, Trash2, Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Publisher, TimeSlot, Availability } from '../types';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// Mapeo visual → dayOfWeek: Lun=1, Mar=2, Mié=3, Jue=4, Vie=5, Sáb=6, Dom=0
const DAY_TO_INDEX = [1, 2, 3, 4, 5, 6, 0];

export default function AvailabilityPage() {
  const { user, role } = useAuth();
  const isCoordinator = role === 'COORDINADOR';
  const queryClient = useQueryClient();
  const [selectedPublisher, setSelectedPublisher] = useState<string>('');
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [message, setMessage] = useState('');

  const { data: publishers } = useQuery({
    queryKey: ['publishers'],
    queryFn: async () => {
      const { data } = await api.get('/publishers');
      return data as Publisher[];
    },
    enabled: isCoordinator,
  });

  const { data: timeSlots } = useQuery({
    queryKey: ['timeslots'],
    queryFn: async () => {
      const { data } = await api.get('/timeslots');
      return data as TimeSlot[];
    },
  });

  // Si no es coordinador, cargar automáticamente su propia disponibilidad
  useEffect(() => {
    if (!isCoordinator && user?.publisherId) {
      setSelectedPublisher(user.publisherId);
    }
  }, [isCoordinator, user?.publisherId]);

  const loadAvailability = useCallback(async (publisherId: string) => {
    if (!publisherId) { setAvailabilities([]); return; }
    try {
      const { data } = await api.get(`/publishers/${publisherId}/availability`);
      setAvailabilities(data);
    } catch {
      setAvailabilities([]);
    }
  }, []);

  useEffect(() => {
    loadAvailability(selectedPublisher);
  }, [selectedPublisher, loadAvailability]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = availabilities.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        timeSlotId: a.timeSlotId,
      }));
      await api.put(`/publishers/${selectedPublisher}/availability`, { availabilities: payload });
    },
    onSuccess: () => {
      setMessage('✅ Disponibilidad guardada');
      setTimeout(() => setMessage(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
    },
    onError: (err: any) => {
      setMessage('❌ ' + (err.response?.data?.error || 'Error al guardar'));
    },
  });

  // ---- ausencias / vacaciones ----
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absenceStart, setAbsenceStart] = useState('');
  const [absenceEnd, setAbsenceEnd] = useState('');
  const [absenceReason, setAbsenceReason] = useState('Vacaciones');
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [absenceError, setAbsenceError] = useState('');

  const { data: absences } = useQuery({
    queryKey: ['absences', selectedPublisher],
    queryFn: async () => {
      const { data } = await api.get(`/publishers/${selectedPublisher}/absences`);
      return data as { id: string; startDate: string; endDate: string; reason?: string; notes?: string }[];
    },
    enabled: !!selectedPublisher,
  });

  const createAbsenceMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/publishers/${selectedPublisher}/absences`, {
        startDate: absenceStart,
        endDate: absenceEnd,
        reason: absenceReason,
        notes: absenceNotes || undefined,
      });
    },
    onSuccess: () => {
      setShowAbsenceForm(false);
      setAbsenceStart('');
      setAbsenceEnd('');
      setAbsenceReason('Vacaciones');
      setAbsenceNotes('');
      setAbsenceError('');
      queryClient.invalidateQueries({ queryKey: ['absences', selectedPublisher] });
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
    },
    onError: (err: any) => {
      setAbsenceError(err.response?.data?.error || 'Error al guardar ausencia');
    },
  });

  const deleteAbsenceMutation = useMutation({
    mutationFn: async (absenceId: string) => {
      await api.delete(`/publishers/${selectedPublisher}/absences/${absenceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences', selectedPublisher] });
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
    },
  });

  const isAvailable = (day: number, slotId: string) =>
    availabilities.some((a) => a.dayOfWeek === day && a.timeSlotId === slotId);

  const toggleAvailability = (day: number, slotId: string) => {
    setAvailabilities((prev) => {
      const exists = prev.find((a) => a.dayOfWeek === day && a.timeSlotId === slotId);
      if (exists) return prev.filter((a) => !(a.dayOfWeek === day && a.timeSlotId === slotId));
      return [
        ...prev,
        {
          id: '',
          publisherId: selectedPublisher,
          dayOfWeek: day,
          timeSlotId: slotId,
          timeSlot: timeSlots?.find((s) => s.id === slotId)!,
        },
      ];
    });
  };

  const formatName = (p: Publisher) => {
    if (p.marriedLastName) return `${p.firstName} de ${p.marriedLastName}`;
    return `${p.firstName} ${p.lastName}`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Disponibilidad</h2>

      <div className="bg-surface rounded-xl border border-border p-6 mb-6">
        {isCoordinator ? (
          <>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Seleccionar publicador
            </label>
            <select
              value={selectedPublisher}
              onChange={(e) => setSelectedPublisher(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {(publishers || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {formatName(p)}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="text-text-secondary text-sm">
            Mi disponibilidad
          </p>
        )}
      </div>

      {selectedPublisher && timeSlots && timeSlots.length > 0 && (
        <>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Franja</th>
                    {DAY_NAMES.map((day, i) => (
                      <th key={i} className="px-2 py-3 text-center text-xs font-semibold text-text-secondary uppercase">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timeSlots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium whitespace-nowrap">
                        {slot.name}
                        <span className="text-text-muted text-xs ml-2">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </td>
                      {DAY_NAMES.map((_, dayIdx) => {
                        const realDay = DAY_TO_INDEX[dayIdx];
                        const available = isAvailable(realDay, slot.id);
                        return (
                          <td key={dayIdx} className="px-2 py-3 text-center">
                            <button
                              onClick={() => toggleAvailability(realDay, slot.id)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                available
                                  ? 'bg-green-100 dark:bg-green-900/30 text-success hover:bg-green-200'
                                  : 'bg-gray-100 dark:bg-gray-800 text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              {available ? '✓' : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Save size={18} />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar disponibilidad'}
            </button>
            {message && (
              <span className={`text-sm ${message.startsWith('✅') ? 'text-success' : 'text-danger'}`}>
                {message}
              </span>
            )}
          </div>

          {/* ---- AUSENCIAS / VACACIONES ---- */}
          <div className="bg-surface rounded-xl border border-border p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Ausencias y vacaciones
              </h3>
              {!showAbsenceForm && (
                <button
                  onClick={() => { setShowAbsenceForm(true); setAbsenceError(''); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Añadir
                </button>
              )}
            </div>

            {/* Formulario */}
            {showAbsenceForm && (
              <div className="bg-background rounded-lg border border-border p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Fecha inicio</label>
                    <input
                      type="date"
                      value={absenceStart}
                      onChange={(e) => setAbsenceStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Fecha fin</label>
                    <input
                      type="date"
                      value={absenceEnd}
                      onChange={(e) => setAbsenceEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Motivo</label>
                    <select
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="Vacaciones">Vacaciones</option>
                      <option value="Enfermedad">Enfermedad</option>
                      <option value="Personal">Personal</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Notas (opcional)</label>
                    <input
                      type="text"
                      value={absenceNotes}
                      onChange={(e) => setAbsenceNotes(e.target.value)}
                      placeholder="Ej: viaje, familiar..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                {absenceError && (
                  <p className="text-danger text-sm mb-3">{absenceError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => createAbsenceMutation.mutate()}
                    disabled={!absenceStart || !absenceEnd || createAbsenceMutation.isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {createAbsenceMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => { setShowAbsenceForm(false); setAbsenceError(''); }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-secondary rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de ausencias */}
            {absences && absences.length > 0 ? (
              <div className="space-y-2">
                {absences
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((abs) => {
                    const start = new Date(abs.startDate);
                    const end = new Date(abs.endDate);
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    const activa = end >= hoy;
                    const fmt = (d: Date) =>
                      d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                    return (
                      <div
                        key={abs.id}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm ${
                          activa
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-border bg-surface opacity-60'
                        }`}
                      >
                        <div>
                          <span className="font-medium text-text-primary">
                            {fmt(start)} → {fmt(end)}
                          </span>
                          {abs.reason && (
                            <span className="ml-2 text-text-muted">— {abs.reason}</span>
                          )}
                          {abs.notes && (
                            <span className="ml-2 text-text-muted italic">({abs.notes})</span>
                          )}
                          {!activa && (
                            <span className="ml-2 text-xs text-text-muted">(pasada)</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar esta ausencia?')) deleteAbsenceMutation.mutate(abs.id);
                          }}
                          disabled={deleteAbsenceMutation.isPending}
                          className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                          title="Eliminar ausencia"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            ) : (
              !showAbsenceForm && (
                <p className="text-text-muted text-sm text-center py-4">
                  No hay periodos de ausencia registrados.
                </p>
              )
            )}
          </div>
        </>
      )}

      {selectedPublisher && (!timeSlots || timeSlots.length === 0) && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center text-text-muted">
          No hay franjas horarias configuradas.
        </div>
      )}
    </div>
  );
}
