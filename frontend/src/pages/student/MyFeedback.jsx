import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
} from '../../components/ui.jsx';

export default function MyFeedback() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/assignments')
      .then((res) =>
        setItems(res.data.filter((a) => a.submission_status === 'MARKED'))
      )
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (items === null) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Feedback"
        subtitle="Scores and feedback from your marked work."
      />

      {items.length === 0 ? (
        <EmptyState
          title="No feedback yet"
          message="Once your teacher marks your work, your scores and feedback appear here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Link
              key={a.id}
              to={`/student/assignments/${a.id}`}
              className="card transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{a.title}</p>
                  <p className="text-sm text-gray-500">{a.class_name}</p>
                </div>
                <span className="text-lg font-bold text-green-700">
                  {a.score ?? '-'} / {a.total_marks}
                </span>
              </div>
              {a.feedback && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold">Feedback: </span>
                  {a.feedback}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
