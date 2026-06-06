import type { ReactNode } from 'react';

interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
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
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider ${
                    col.hideOnMobile ? 'hidden md:table-cell' : ''
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
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
