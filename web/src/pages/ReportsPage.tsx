import { useState } from 'react';
import { Download } from 'lucide-react';
import api from '../services/api';

const REPORT_TYPES = [
  { value: 'publishers', label: 'Publicadores' },
  { value: 'shifts', label: 'Turnos' },
  { value: 'experiences', label: 'Experiencias' },
  { value: 'locations', label: 'Puntos' },
];

export default function ReportsPage() {
  const [type, setType] = useState('publishers');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function setFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/reports/${type}?${params}`, {
        responseType: 'blob',
      });
      // Verificar que sea un blob válido (no un JSON de error)
      if (response.data.type === 'application/json') {
        throw new Error('El servidor devolvió un error');
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          alert(json.error || 'Error al generar el reporte');
        } catch {
          alert('Error al generar el reporte');
        }
      } else {
        alert('Error al generar el reporte. Asegúrate de que el backend esté activo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Reportes</h2>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de reporte</label>
            <select value={type} onChange={(e) => { setType(e.target.value); setFilters({}); }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* Filtros dinámicos según tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {type === 'publishers' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Rol</label>
                <select value={filters.role || ''} onChange={(e) => setFilter('role', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                  <option value="">Todos</option>
                  <option value="COORDINADOR">Coordinador</option>
                  <option value="AUXILIAR">Auxiliar</option>
                  <option value="ENCARGADO_PUNTO">Encargado de Punto</option>
                  <option value="AUXILIAR_PUNTO">Auxiliar de Punto</option>
                  <option value="ENCARGADO_EXPERIENCIAS">Encargado de Experiencias</option>
                  <option value="PUBLICADOR">Publicador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
                <select value={filters.isActive ?? ''} onChange={(e) => setFilter('isActive', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
            </>
          )}

          {type === 'shifts' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
                <select value={filters.status || ''} onChange={(e) => setFilter('status', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                  <option value="">Todos</option>
                  <option value="ABIERTO">Abiertos</option>
                  <option value="CERRADO">Cerrados</option>
                  <option value="CANCELADO">Cancelados</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Fecha</label>
                <input type="date" value={filters.date || ''} onChange={(e) => setFilter('date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
              </div>
            </>
          )}

          {type === 'experiences' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
              <select value={filters.status || ''} onChange={(e) => setFilter('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="APROBADO">Aprobadas</option>
                <option value="RECHAZADO">Rechazadas</option>
              </select>
            </div>
          )}

          {type === 'locations' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
              <select value={filters.isActive ?? ''} onChange={(e) => setFilter('isActive', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors text-sm font-medium disabled:opacity-50"
        >
          {loading ? (
            <>Generando...</>
          ) : (
            <>
              <Download size={18} /> Descargar Excel
            </>
          )}
        </button>
      </div>
    </div>
  );
}
