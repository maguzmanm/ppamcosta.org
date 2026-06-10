import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Filter } from 'lucide-react';
import api from '../services/api';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface AvailabilityRow {
  id: string;
  publisherId: string;
  publisherName: string;
  gender: string;
  congregation: string;
  locationName: string;
  locationId: string;
  dayOfWeek: number;
  dayName: string;
  timeSlotId: string;
  timeSlotName: string;
  timeSlotRange: string;
}

export default function ReportsPage() {
  const [searchName, setSearchName] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterTimeSlot, setFilterTimeSlot] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['availabilityReport', searchName, filterLocation, filterDay, filterTimeSlot],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchName) params.append('publisherName', searchName);
      if (filterLocation) params.append('locationId', filterLocation);
      if (filterDay !== '') params.append('dayOfWeek', filterDay);
      if (filterTimeSlot) params.append('timeSlotId', filterTimeSlot);
      const { data } = await api.get(`/reports/availability?${params.toString()}`);
      return data as { data: AvailabilityRow[]; total: number };
    },
    staleTime: 30000,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => { const { data } = await api.get('/locations'); return data as any[]; },
  });
  const { data: timeslots } = useQuery({
    queryKey: ['timeslots'],
    queryFn: async () => { const { data } = await api.get('/timeslots'); return data as any[]; },
  });

  const rows = data?.data || [];
  const total = data?.total || 0;

  async function handleDownload() {
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('publisherName', searchName);
      if (filterLocation) params.append('locationId', filterLocation);
      if (filterDay !== '') params.append('dayOfWeek', filterDay);
      if (filterTimeSlot) params.append('timeSlotId', filterTimeSlot);
      params.append('format', 'excel');
      const response = await api.get(`/reports/availability?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'disponibilidad_publicadores.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Error al descargar el reporte'); }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Disponibilidad de Publicadores</h2>
          <p className="text-text-secondary text-sm mt-1">{total} {total === 1 ? 'registro' : 'registros'} encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showFilters ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-hover'}`}>
            <Filter size={16} /> Filtros
            {(filterLocation || filterDay !== '' || filterTimeSlot) && <span className="w-2 h-2 rounded-full bg-warning" />}
          </button>
          <button onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium">
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)}
          placeholder="Buscar publicador..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 bg-surface rounded-lg border border-border">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Punto</label>
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Todos los puntos</option>
              {(locations || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Día</label>
            <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Todos los días</option>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Horario</label>
            <select value={filterTimeSlot} onChange={(e) => setFilterTimeSlot(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="">Todos los horarios</option>
              {(timeslots || []).map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.startTime?.substring(0,5)} - {t.endTime?.substring(0,5)})</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No se encontraron registros de disponibilidad</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-hover">
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Publicador</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Punto</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Día</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Horario</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary hidden md:table-cell">Congregación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{row.publisherName}</span>
                        {row.gender && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            row.gender === 'M' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'}`}>
                            {row.gender === 'M' ? 'M' : 'F'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{row.locationName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${row.dayOfWeek === 0 ? 'text-info' : 'text-text-primary'}`}>
                        {row.dayName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      <span className="bg-surface-hover px-2 py-1 rounded text-xs">{row.timeSlotRange}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted hidden md:table-cell">{row.congregation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
