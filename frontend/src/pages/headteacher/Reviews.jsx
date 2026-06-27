import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
  StatusBadge,
} from '../../components/ui.jsx';

const FILTERS = [
  { key: 'SUBMITTED', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'NEEDS_CORRECTION', label: 'Needs correction' },
  { key: '', label: 'All' },
];

export default function Reviews() {
  const [notes, setNotes] = useState(null);
  const [filter, setFilter] = useState('SUBMITTED');
  const [error, setError] = useState('');

  function load(status) {
    setNotes(null);
    const url = status ? `/lesson-notes?status=${status}` : '/lesson-notes';
    api
      .get(url)
      .then((res) => setNotes(res.data))
      .catch((err) => setError(apiError(err)));
  }

  useEffect(() => {
    load(filter);
  }, [filter]);

  return (
    <div>
      <PageHeader
        title="Lesson Reviews"
        subtitle="Review, approve or request corrections on lesson notes."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {notes === null ? (
        <Spinner />
      ) : notes.length === 0 ? (
        <EmptyState
          title="Nothing here"
          message="There are no lesson notes for this filter."
        />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Link
              key={n.id}
              to={`/headteacher/reviews/${n.id}`}
              className="card flex items-center justify-between transition hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-gray-900">{n.topic}</p>
                <p className="text-sm text-gray-500">
                  {n.class_name}
                  {n.teacher_name ? ` · ${n.teacher_name}` : ''}
                </p>
              </div>
              <StatusBadge status={n.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
