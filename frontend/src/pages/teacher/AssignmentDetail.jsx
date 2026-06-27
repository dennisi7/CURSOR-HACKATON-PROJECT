import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  Spinner,
  Alert,
  StatusBadge,
  EmptyState,
} from '../../components/ui.jsx';

export default function AssignmentDetail() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([
      api.get(`/assignments/${id}`),
      api.get(`/assignments/${id}/submissions`),
    ])
      .then(([a, s]) => {
        setAssignment(a.data);
        setSubmissions(s.data);
        const initial = {};
        s.data.forEach((sub) => {
          initial[sub.id] = {
            score: sub.score ?? '',
            feedback: sub.feedback ?? '',
          };
        });
        setDrafts(initial);
      })
      .catch((err) => setError(apiError(err)));
  }

  useEffect(load, [id]);

  function updateDraft(subId, field, value) {
    setDrafts((d) => ({ ...d, [subId]: { ...d[subId], [field]: value } }));
  }

  async function mark(subId) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post(`/submissions/${subId}/mark`, drafts[subId]);
      setNotice('Submission marked.');
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !assignment) return <Alert type="error">{error}</Alert>;
  if (!assignment) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={assignment.title}
        subtitle={`${assignment.class_name} · ${assignment.total_marks} marks`}
        action={<StatusBadge status={assignment.status} />}
      />

      {assignment.description && (
        <div className="card mb-4">
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {assignment.description}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-3">
          <Alert type="success">{notice}</Alert>
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Submissions ({submissions.length})
      </h2>

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          message="Student submissions will appear here for marking."
        />
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="card">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{s.student_name}</p>
                  <p className="text-xs text-gray-500">{s.student_email}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                <p className="whitespace-pre-wrap">{s.answer_text}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end">
                <div>
                  <label className="label">Score</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max={assignment.total_marks}
                    value={drafts[s.id]?.score ?? ''}
                    onChange={(e) => updateDraft(s.id, 'score', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Feedback</label>
                  <input
                    className="input"
                    value={drafts[s.id]?.feedback ?? ''}
                    onChange={(e) => updateDraft(s.id, 'feedback', e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => mark(s.id)}
                >
                  Save mark
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
