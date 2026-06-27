import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, StatCard, Spinner, Alert } from '../../components/ui.jsx';

export default function StudentDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setStats(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!stats) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Dashboard" subtitle="Your classes and work at a glance." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="My Classes" value={stats.total_classes} />
        <StatCard label="Assignments" value={stats.available_assignments} accent="blue" />
        <StatCard label="Lessons" value={stats.published_lessons} accent="gray" />
        <StatCard label="Marked" value={stats.marked_submissions} accent="amber" />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/student/classes" className="btn-primary">
            Join a Class
          </Link>
          <Link to="/student/lessons" className="btn-secondary">
            View Lessons
          </Link>
          <Link to="/student/assignments" className="btn-secondary">
            View Assignments
          </Link>
        </div>
      </div>

      {/* Recent notices */}
      {stats.recent_notices?.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent notices
          </h2>
          <div className="space-y-2">
            {stats.recent_notices.map((n) => (
              <Link
                key={n.id}
                to="/student/notices"
                className="card flex items-center justify-between py-3 transition hover:shadow-md"
              >
                <span className="font-medium text-gray-800">
                  {n.is_pinned ? '📌 ' : ''}
                  {n.title}
                </span>
                <span className="text-xs text-gray-400">{n.audience}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending assignments */}
      {stats.pending_assignments?.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pending assignments
          </h2>
          <div className="space-y-2">
            {stats.pending_assignments.map((a) => (
              <Link
                key={a.id}
                to={`/student/assignments/${a.id}`}
                className="card flex items-center justify-between py-3 transition hover:shadow-md"
              >
                <div>
                  <p className="font-medium text-gray-800">{a.title}</p>
                  <p className="text-sm text-gray-500">{a.class_name}</p>
                </div>
                {a.due_date && (
                  <span className="text-xs text-gray-400">
                    Due {a.due_date.slice(0, 10)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent feedback */}
      {stats.recent_feedback?.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent feedback
          </h2>
          <div className="space-y-2">
            {stats.recent_feedback.map((f) => (
              <div key={f.id} className="card flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{f.assignment_title}</p>
                  {f.feedback && (
                    <p className="truncate text-sm text-gray-500">{f.feedback}</p>
                  )}
                </div>
                <span className="shrink-0 font-bold text-green-700">
                  {f.score ?? '-'} / {f.total_marks}
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/student/feedback"
            className="mt-2 inline-block text-sm font-semibold text-brand-700"
          >
            View all feedback →
          </Link>
        </div>
      )}
    </div>
  );
}
