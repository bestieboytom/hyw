export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('cs-CZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function statusBadgeClass(status: string): string {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
  switch (status) {
    case 'success':
      return `${base} bg-emerald-100 text-emerald-800`;
    case 'failed':
      return `${base} bg-rose-100 text-rose-800`;
    case 'partial':
    case 'needs_review':
      return `${base} bg-amber-100 text-amber-800`;
    case 'pending':
    case 'running':
      return `${base} bg-sky-100 text-sky-800`;
    case 'skipped':
      return `${base} bg-slate-200 text-slate-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}
