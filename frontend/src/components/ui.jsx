// Small shared UI building blocks.

export function StatusBadge({ status }) {
  const map = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    NEEDS_CORRECTION: 'bg-red-100 text-red-800',
    PUBLISHED: 'bg-blue-100 text-blue-800',
    MARKED: 'bg-green-100 text-green-800',
    // Syllabus statuses
    NOT_STARTED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    BEHIND: 'bg-red-100 text-red-800',
    // Participation statuses
    PRESENT_ACTIVE: 'bg-green-100 text-green-800',
    PRESENT_QUIET: 'bg-blue-100 text-blue-800',
    ABSENT: 'bg-red-100 text-red-800',
    NEEDS_SUPPORT: 'bg-amber-100 text-amber-800',
  };
  const label = (status || '').replace(/_/g, ' ');
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        map[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {label || 'UNKNOWN'}
    </span>
  );
}

export function AudienceBadge({ audience }) {
  const map = {
    ALL: 'bg-purple-100 text-purple-800',
    TEACHERS: 'bg-blue-100 text-blue-800',
    STUDENTS: 'bg-green-100 text-green-800',
    CLASS: 'bg-amber-100 text-amber-800',
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        map[audience] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {audience || 'ALL'}
    </span>
  );
}

export function ProgressBar({ percent, showLabel = true }) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const color =
    value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-xs font-medium text-gray-500">
          {value}%
        </p>
      )}
    </div>
  );
}

export function StatCard({ label, value, accent = 'brand' }) {
  const accents = {
    brand: 'text-brand-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    gray: 'text-gray-700',
  };
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accents[accent] || accents.brand}`}>
        {value}
      </p>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="card flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-2 text-4xl">📭</div>
      <p className="font-semibold text-gray-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  if (!children) return null;
  const styles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading...' }) {
  return <div className="py-10 text-center text-gray-500">{label}</div>;
}
