import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
} from '../../components/ui.jsx';

export default function ParticipationOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/participation/summary/headteacher')
      .then((res) => setData(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (data === null) return <Spinner />;

  const rows = data.per_class || [];

  return (
    <div>
      <PageHeader
        title="Participation Overview"
        subtitle="Classroom participation and concerns across the school."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Classes logged</p>
          <p className="mt-1 text-3xl font-bold text-brand-600">{rows.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Concern classes</p>
          <p className="mt-1 text-3xl font-bold text-red-600">
            {data.concern_count}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Needs support (total)</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">
            {rows.reduce((s, r) => s + (r.needs_support || 0), 0)}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No participation data yet"
          message="Records will appear once teachers log lesson participation."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.class_id}
              className={`card ${r.concern ? 'border-red-200 bg-red-50' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{r.class_name}</p>
                  <p className="text-sm text-gray-500">{r.teacher_name}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="text-gray-600">Records: {r.total_records}</span>
                  <span className="text-red-700">Absent: {r.absent}</span>
                  <span className="text-amber-700">
                    Needs support: {r.needs_support}
                  </span>
                  <span className="text-gray-600">
                    Absent rate: {r.absent_rate_percent}%
                  </span>
                </div>
              </div>
              {r.concern && (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  ⚠ This class needs attention.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
