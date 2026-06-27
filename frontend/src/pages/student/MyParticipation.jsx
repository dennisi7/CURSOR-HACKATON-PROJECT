import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
  StatusBadge,
} from '../../components/ui.jsx';

export default function MyParticipation() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/participation')
      .then((res) => setRecords(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (records === null) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Participation"
        subtitle="How your teachers recorded your participation in lessons."
      />

      {records.length === 0 ? (
        <EmptyState
          title="No participation records yet"
          message="Your participation feedback will appear here after lessons."
        />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="card flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">
                  {r.class_name}
                  {r.lesson_topic ? ` · ${r.lesson_topic}` : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {r.participation_date
                    ? r.participation_date.slice(0, 10)
                    : ''}
                </p>
                {r.comment && (
                  <p className="mt-1 text-sm text-gray-600">{r.comment}</p>
                )}
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
