import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  StatCard,
  Spinner,
  Alert,
  EmptyState,
} from '../../components/ui.jsx';

export default function WeeklyBrief() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/reports/headteacher/weekly-brief')
      .then((res) => setData(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <Spinner />;

  const s = data.summary;

  return (
    <div>
      <PageHeader
        title="Weekly Brief"
        subtitle={`School activity for ${data.week_start} to ${data.week_end}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Lesson Notes Submitted" value={s.lesson_notes_submitted} />
        <StatCard label="Approved" value={s.lesson_notes_approved} />
        <StatCard
          label="Needs Correction"
          value={s.lesson_notes_needs_correction}
          accent="amber"
        />
        <StatCard label="Assignments Posted" value={s.assignments_posted} accent="blue" />
        <StatCard label="Student Submissions" value={s.student_submissions} accent="blue" />
        <StatCard label="Submission Rate" value={`${s.submission_rate_percent}%`} />
        <StatCard label="Active Teachers" value={s.active_teachers} accent="gray" />
        <StatCard label="Pending Reviews" value={s.pending_reviews} accent="amber" />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Classes Needing Attention
        </h2>
        {data.classes_needing_attention.length === 0 ? (
          <EmptyState
            title="All classes look healthy"
            message="No classes flagged for low activity this week."
          />
        ) : (
          <div className="space-y-2">
            {data.classes_needing_attention.map((c) => (
              <div key={c.class_id} className="card border-amber-200 bg-amber-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{c.class_name}</p>
                    <p className="text-sm text-gray-500">{c.teacher_name}</p>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    {c.submission_rate_percent !== null && (
                      <span>Submission rate: {c.submission_rate_percent}%</span>
                    )}
                    {c.syllabus_coverage_percent !== null && (
                      <span className="ml-2">
                        Coverage: {c.syllabus_coverage_percent}%
                      </span>
                    )}
                  </div>
                </div>
                <ul className="mt-2 list-inside list-disc text-sm text-amber-800">
                  {c.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
