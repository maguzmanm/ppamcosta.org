import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import api from '../services/api';
import type { Publisher, TimeSlot, Availability } from '../types';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AvailabilityPage() {
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
  });

  const { data: timeSlots } = useQuery({
    queryKey: ['timeslots'],
    queryFn: async () => {
      const { data } = await api.get('/timeslots');
      return data as TimeSlot[];
    },
  });

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
                        const available = isAvailable(dayIdx, slot.id);
                        return (
                          <td key={dayIdx} className="px-2 py-3 text-center">
                            <button
                              onClick={() => toggleAvailability(dayIdx, slot.id)}
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
