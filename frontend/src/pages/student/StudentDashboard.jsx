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
    </div>
  );
}
