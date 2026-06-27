import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, StatCard, Spinner, Alert } from '../../components/ui.jsx';

export default function HeadteacherDashboard() {
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
        title="Headteacher Dashboard"
        subtitle="Monitor lesson preparation and school activity."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pending Reviews" value={stats.pending_reviews} accent="amber" />
        <StatCard label="Approved Lessons" value={stats.approved_lessons} />
        <StatCard label="Teachers" value={stats.total_teachers} accent="blue" />
        <StatCard label="Classes" value={stats.total_classes} accent="gray" />
      </div>

      {/* Weekly brief preview */}
      {stats.weekly_brief_preview && (
        <div className="mt-6 card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              This week at a glance
            </h2>
            <Link
              to="/headteacher/weekly-brief"
              className="text-sm font-semibold text-brand-700"
            >
              Full brief →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-600">
                {stats.weekly_brief_preview.lesson_notes_submitted}
              </p>
              <p className="text-xs text-gray-500">Notes submitted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {stats.weekly_brief_preview.student_submissions}
              </p>
              <p className="text-xs text-gray-500">Submissions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {stats.weekly_brief_preview.pending_reviews}
              </p>
              <p className="text-xs text-gray-500">Pending reviews</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts row */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/headteacher/coverage"
          className={`card transition hover:shadow-md ${
            stats.low_coverage_classes > 0 ? 'border-red-200 bg-red-50' : ''
          }`}
        >
          <p className="text-sm text-gray-500">Low coverage classes</p>
          <p className="mt-1 text-3xl font-bold text-red-600">
            {stats.low_coverage_classes ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">below 50% coverage →</p>
        </Link>
        <Link
          to="/headteacher/participation"
          className={`card transition hover:shadow-md ${
            stats.participation_concerns > 0 ? 'border-amber-200 bg-amber-50' : ''
          }`}
        >
          <p className="text-sm text-gray-500">Participation concerns</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">
            {stats.participation_concerns ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">classes need attention →</p>
        </Link>
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
                to="/headteacher/notices"
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

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/headteacher/reviews" className="btn-primary">
          Review Lesson Notes
        </Link>
        <Link to="/headteacher/weekly-brief" className="btn-secondary">
          Weekly Brief
        </Link>
      </div>
    </div>
  );
}
