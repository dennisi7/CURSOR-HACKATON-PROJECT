import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, Spinner, Alert, EmptyState } from '../../components/ui.jsx';

export default function ClassDetail() {
  const { id } = useParams();
  const [klass, setKlass] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/classes/${id}`)
      .then((res) => setKlass(res.data))
      .catch((err) => setError(apiError(err)));
  }, [id]);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!klass) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={klass.name}
        subtitle={`${klass.subject} · ${klass.level} · ${klass.term}`}
      />

      <div className="card mb-5">
        <p className="text-sm text-gray-500">Class code (share with students)</p>
        <p className="font-mono text-xl font-bold text-brand-700">
          {klass.class_code}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          to={`/teacher/lesson-notes/new?class=${klass.id}`}
          className="btn-primary"
        >
          New Lesson Note
        </Link>
        <Link
          to={`/teacher/assignments/new?class=${klass.id}`}
          className="btn-secondary"
        >
          New Assignment
        </Link>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Students ({klass.students.length})
      </h2>
      {klass.students.length === 0 ? (
        <EmptyState
          title="No students yet"
          message="Share the class code so students can join this class."
        />
      ) : (
        <div className="space-y-2">
          {klass.students.map((s) => (
            <div key={s.id} className="card flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-800">{s.name}</p>
                <p className="text-sm text-gray-500">{s.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
