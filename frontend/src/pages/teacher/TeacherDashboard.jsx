import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, StatCard, Spinner, Alert, StatusBadge } from '../../components/ui.jsx';

export default function TeacherDashboard() {
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
      <PageHeader
        title="Teacher Dashboard"
        subtitle="Welcome back. Here is your class activity."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Classes" value={stats.total_classes} />
        <StatCard
          label="Pending Lesson Notes"
          value={stats.pending_lesson_notes}
          accent="amber"
        />
        <StatCard label="Assignments" value={stats.total_assignments} accent="blue" />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/teacher/classes" className="btn-primary">
            Create Class
          </Link>
          <Link to="/teacher/lesson-notes/new" className="btn-secondary">
            Create Lesson Note
          </Link>
          <Link to="/teacher/assignments/new" className="btn-secondary">
            Create Assignment
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Recent submissions
        </h2>
        {stats.recent_submissions.length === 0 ? (
          <div className="card text-sm text-gray-500">
            No submissions yet. They will appear here once students submit work.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recent_submissions.map((s) => (
              <div
                key={s.id}
                className="card flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium text-gray-800">{s.student_name}</p>
                  <p className="text-sm text-gray-500">{s.assignment_title}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
