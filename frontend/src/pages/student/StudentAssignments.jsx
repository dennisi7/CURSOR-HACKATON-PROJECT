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

export default function StudentAssignments() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/assignments')
      .then((res) => setItems(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  return (
    <div>
      <PageHeader title="Assignments" subtitle="Submit your work and view your marks." />

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          message="Assignments from your classes will appear here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const submitted = Boolean(a.submission_id);
            const marked = a.submission_status === 'MARKED';
            return (
              <Link
                key={a.id}
                to={`/student/assignments/${a.id}`}
                className="card flex items-center justify-between transition hover:shadow-md"
              >
                <div>
                  <p className="font-semibold text-gray-900">{a.title}</p>
                  <p className="text-sm text-gray-500">
                    {a.class_name} · {a.total_marks} marks
                    {a.due_date ? ` · Due ${a.due_date.slice(0, 10)}` : ''}
                  </p>
                </div>
                {marked ? (
                  <span className="text-sm font-semibold text-green-700">
                    {a.score ?? '-'} / {a.total_marks}
                  </span>
                ) : (
                  <StatusBadge status={submitted ? 'SUBMITTED' : 'PUBLISHED'} />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
