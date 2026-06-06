import type { FormEvent, ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Guardar',
  loading = false,
  size = 'md',
}: ModalProps) {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-surface rounded-xl shadow-xl border border-border w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
          >
            ✕
          </button>
        </div>

        {onSubmit ? (
          <form onSubmit={onSubmit}>
            <div className="p-4 space-y-4">{children}</div>
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors"
              >
                {loading ? 'Guardando...' : submitLabel}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4">{children}</div>
        )}
      </div>
    </div>
  );
}
