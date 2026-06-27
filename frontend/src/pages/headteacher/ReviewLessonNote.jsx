import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  Spinner,
  Alert,
  StatusBadge,
} from '../../components/ui.jsx';
import { totalAllocated } from '../../components/TimeAllocationChecker.jsx';

const SECTIONS = [
  ['learning_objectives', 'Learning objectives'],
  ['previous_knowledge', 'Previous knowledge'],
  ['materials', 'Teaching & learning materials'],
  ['introduction', 'Introduction'],
  ['teacher_activities', 'Teacher activities'],
  ['learner_activities', 'Learner activities'],
  ['assessment', 'Assessment'],
  ['closure', 'Closure'],
  ['remarks', 'Remarks'],
];

export default function ReviewLessonNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get(`/lesson-notes/${id}`)
      .then((res) => {
        setNote(res.data);
        setComment(res.data.review_comment || '');
      })
      .catch((err) => setError(apiError(err)));
  }

  useEffect(load, [id]);

  async function review(decision) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post(`/lesson-notes/${id}/review`, { decision, comment });
      setNotice(
        decision === 'APPROVE'
          ? 'Lesson note approved.'
          : 'Sent back to teacher for correction.'
      );
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !note) return <Alert type="error">{error}</Alert>;
  if (!note) return <Spinner />;

  const allocated = totalAllocated(note.time_allocations || []);
  const diff = allocated - note.duration_minutes;
  const timeMsg =
    diff === 0
      ? 'Lesson time is balanced.'
      : diff < 0
      ? `${Math.abs(diff)} minute(s) unallocated.`
      : `Exceeds duration by ${diff} minute(s).`;

  return (
    <div>
      <PageHeader
        title={note.topic}
        subtitle={`${note.class_name} · ${note.teacher_name || ''}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={note.status} />
            <Link to={`/lesson-notes/${id}/print`} className="btn-secondary">
              Print
            </Link>
          </div>
        }
      />

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

      {/* Meta + time check */}
      <div className="card mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-gray-500">Week</p>
          <p className="font-medium">{note.week || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="font-medium">{note.duration_minutes} min</p>
        </div>
        <div>
          <p className="text-gray-500">Allocated</p>
          <p className="font-medium">{allocated} min</p>
        </div>
        <div>
          <p className="text-gray-500">Time check</p>
          <p className="font-medium">{timeMsg}</p>
        </div>
      </div>

      {note.time_allocations?.length > 0 && (
        <div className="card mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">Time allocation</p>
          <div className="space-y-1 text-sm">
            {note.time_allocations.map((a) => (
              <div key={a.id} className="flex justify-between">
                <span className="text-gray-600">{a.stage}</span>
                <span className="font-medium">{a.minutes} min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-4 space-y-3">
        {SECTIONS.map(([field, label]) =>
          note[field] ? (
            <div key={field}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {label}
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {note[field]}
              </p>
            </div>
          ) : null
        )}
      </div>

      {/* Review actions */}
      <div className="card">
        <label className="label">Review comment</label>
        <textarea
          className="input min-h-[80px]"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment for the teacher (optional for approval)..."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => review('APPROVE')}
          >
            Approve
          </button>
          <button
            className="btn-danger"
            disabled={busy}
            onClick={() => review('NEEDS_CORRECTION')}
          >
            Needs Correction
          </button>
          <button className="btn-secondary" onClick={() => navigate('/headteacher/reviews')}>
            Back to list
          </button>
        </div>
      </div>
    </div>
  );
}
