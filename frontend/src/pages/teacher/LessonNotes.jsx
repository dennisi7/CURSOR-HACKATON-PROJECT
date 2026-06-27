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

export default function LessonNotes() {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/lesson-notes')
      .then((res) => setNotes(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  return (
    <div>
      <PageHeader
        title="Lesson Notes"
        subtitle="Prepare, submit for review and publish your lessons."
        action={
          <Link to="/teacher/lesson-notes/new" className="btn-primary">
            + New Lesson Note
          </Link>
        }
      />

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {notes === null ? (
        <Spinner />
      ) : notes.length === 0 ? (
        <EmptyState
          title="No lesson notes yet"
          message="Create a structured lesson note and check your time allocation."
          action={
            <Link to="/teacher/lesson-notes/new" className="btn-primary">
              Create Lesson Note
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Link
              key={n.id}
              to={`/teacher/lesson-notes/${n.id}`}
              className="card flex items-center justify-between transition hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-gray-900">{n.topic}</p>
                <p className="text-sm text-gray-500">
                  {n.class_name}
                  {n.week ? ` · ${n.week}` : ''}
                  {n.published ? ' · Published' : ''}
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
