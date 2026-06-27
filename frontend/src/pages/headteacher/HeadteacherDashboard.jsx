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

      <div className="mt-6">
        <Link to="/headteacher/reviews" className="btn-primary">
          Review Lesson Notes
        </Link>
      </div>
    </div>
  );
}
