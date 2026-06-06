export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">{title}</h2>
      <div className="bg-surface rounded-xl p-12 border border-border text-center">
        <p className="text-text-muted">Esta sección está en desarrollo.</p>
      </div>
    </div>
  );
}
