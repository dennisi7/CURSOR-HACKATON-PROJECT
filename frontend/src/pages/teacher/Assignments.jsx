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

export default function Assignments() {
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
      <PageHeader
        title="Assignments"
        subtitle="Create assignments and mark student submissions."
        action={
          <Link to="/teacher/assignments/new" className="btn-primary">
            + New Assignment
          </Link>
        }
      />

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
          message="Create an assignment for one of your classes."
          action={
            <Link to="/teacher/assignments/new" className="btn-primary">
              Create Assignment
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Link
              key={a.id}
              to={`/teacher/assignments/${a.id}`}
              className="card flex items-center justify-between transition hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-gray-900">{a.title}</p>
                <p className="text-sm text-gray-500">
                  {a.class_name} · {a.total_marks} marks ·{' '}
                  {a.submission_count} submission
                  {Number(a.submission_count) === 1 ? '' : 's'}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
