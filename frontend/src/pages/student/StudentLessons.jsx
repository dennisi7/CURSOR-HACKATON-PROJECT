import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui.jsx';

export default function StudentLessons() {
  const [lessons, setLessons] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/lesson-notes')
      .then((res) => setLessons(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  return (
    <div>
      <PageHeader title="Lessons" subtitle="Lesson summaries published by your teachers." />

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {lessons === null ? (
        <Spinner />
      ) : lessons.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          message="When your teacher publishes a lesson, it will show up here."
        />
      ) : (
        <div className="space-y-2">
          {lessons.map((l) => (
            <Link
              key={l.id}
              to={`/student/lessons/${l.id}`}
              className="card transition hover:shadow-md"
            >
              <p className="font-semibold text-gray-900">{l.topic}</p>
              <p className="text-sm text-gray-500">
                {l.class_name}
                {l.subject ? ` · ${l.subject}` : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
