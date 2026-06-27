import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
  ProgressBar,
} from '../../components/ui.jsx';

export default function CoverageOverview() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/syllabus/coverage/headteacher')
      .then((res) => setRows(res.data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (rows === null) return <Spinner />;

  const lowCount = rows.filter((r) => r.coverage_percent < 50).length;
  const behindCount = rows.reduce((sum, r) => sum + (r.behind_topics || 0), 0);

  return (
    <div>
      <PageHeader
        title="Coverage Overview"
        subtitle="Syllabus coverage across teachers and classes."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No syllabus data yet"
          message="Coverage will appear once teachers add their scheme of work topics."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="card">
              <p className="text-sm text-gray-500">Classes tracked</p>
              <p className="mt-1 text-3xl font-bold text-brand-600">{rows.length}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Below 50%</p>
              <p className="mt-1 text-3xl font-bold text-red-600">{lowCount}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Behind topics</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{behindCount}</p>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r) => {
              const low = r.coverage_percent < 50;
              return (
                <div
                  key={`${r.class_id}-${r.subject}-${r.term}`}
                  className={`card ${low ? 'border-red-200 bg-red-50' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{r.class_name}</p>
                      <p className="text-sm text-gray-500">
                        {r.subject} · {r.term} · {r.teacher_name}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {r.completed_topics}/{r.total_topics} done
                      {r.behind_topics > 0 && (
                        <span className="ml-1 text-red-600">
                          · {r.behind_topics} behind
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <ProgressBar percent={r.coverage_percent} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
