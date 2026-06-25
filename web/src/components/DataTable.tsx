import { useState, type ReactNode } from 'react';

interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
  sortKey?: string; // clave para ordenar si es distinta de 'key'
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No se encontraron registros',
  loading = false,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(col: DataTableColumn<T>) {
    if (!col.sortable && !col.sortKey) return;
    const key = col.sortKey || col.key;
    if (sortCol === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); }
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  }

  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }

  const sortedData = sortCol
    ? [...data].sort((a, b) => {
        const aVal = getNestedValue(a, sortCol);
        const bVal = getNestedValue(b, sortCol);
        const aStr = aVal != null ? String(aVal).toLowerCase() : '';
        const bStr = bVal != null ? String(bVal).toLowerCase() : '';
        const cmp = aStr.localeCompare(bStr, 'es', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-8 text-center text-text-muted">Cargando...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-8 text-center text-text-muted">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              {columns.map((col) => {
                const sortKey = col.sortKey || col.key;
                const isSortable = col.sortable || !!col.sortKey;
                const isActive = sortCol === sortKey;
                return (
                  <th
                    key={col.key}
                    onClick={() => isSortable && handleSort(col)}
                    className={`px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider ${
                      col.hideOnMobile ? 'hidden md:table-cell' : ''
                    } ${col.className || ''} ${isSortable ? 'cursor-pointer select-none hover:text-text-primary transition-colors' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {isSortable && (
                        <span className="text-text-muted text-[10px] leading-none">
                          {isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`${
                  onRowClick ? 'cursor-pointer hover:bg-surface-hover' : ''
                } transition-colors`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-text-primary ${
                      col.hideOnMobile ? 'hidden md:table-cell' : ''
                    } ${col.className || ''}`}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
