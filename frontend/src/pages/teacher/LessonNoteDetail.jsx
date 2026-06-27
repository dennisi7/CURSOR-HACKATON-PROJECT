import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  Spinner,
  Alert,
  StatusBadge,
} from '../../components/ui.jsx';
import { totalAllocated } from '../../components/TimeAllocationChecker.jsx';
import QuestionThread from '../../components/QuestionThread.jsx';

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

export default function LessonNoteDetail() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');

  function load() {
    api
      .get(`/lesson-notes/${id}`)
      .then((res) => {
        setNote(res.data);
        setSummary(res.data.student_summary || '');
      })
      .catch((err) => setError(apiError(err)));
  }

  useEffect(load, [id]);

  async function submitForReview() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/lesson-notes/${id}/submit`);
      setNotice('Submitted to headteacher for review.');
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/lesson-notes/${id}/publish`, { student_summary: summary });
      setNotice('Lesson summary published to students.');
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

  return (
    <div>
      <PageHeader
        title={note.topic}
        subtitle={`${note.class_name}${note.week ? ` · ${note.week}` : ''}${
          note.subject ? ` · ${note.subject}` : ''
        }`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={note.status} />
            <Link to={`/teacher/lesson-notes/${id}/edit`} className="btn-secondary">
              Edit
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

      {note.review_comment && (
        <div className="mb-4">
          <Alert type={note.status === 'APPROVED' ? 'success' : 'warning'}>
            <span className="font-semibold">Headteacher comment: </span>
            {note.review_comment}
          </Alert>
        </div>
      )}

      {/* Meta */}
      <div className="card mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="font-medium">{note.duration_minutes} min</p>
        </div>
        <div>
          <p className="text-gray-500">Allocated</p>
          <p className="font-medium">{allocated} min</p>
        </div>
        <div>
          <p className="text-gray-500">Sub-topic</p>
          <p className="font-medium">{note.sub_topic || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500">Date</p>
          <p className="font-medium">
            {note.date ? note.date.slice(0, 10) : '-'}
          </p>
        </div>
      </div>

      {/* Time allocations */}
      {note.time_allocations?.length > 0 && (
        <div className="card mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Time allocation
          </p>
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

      {/* Sections */}
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

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['DRAFT', 'NEEDS_CORRECTION'].includes(note.status) && (
          <button className="btn-primary" disabled={busy} onClick={submitForReview}>
            Submit for Review
          </button>
        )}
      </div>

      {/* Publish student summary */}
      <div className="card mb-4">
        <p className="mb-1 text-sm font-semibold text-gray-700">
          Student-facing lesson summary
        </p>
        <p className="mb-2 text-xs text-gray-500">
          Publish a simple summary that your students can read.
          {note.published ? ' This lesson is currently published.' : ''}
        </p>
        <textarea
          className="input min-h-[90px]"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Write a short summary for your students..."
        />
        <div className="mt-2">
          <button className="btn-primary" disabled={busy} onClick={publish}>
            {note.published ? 'Update Published Summary' : 'Publish to Students'}
          </button>
        </div>
      </div>

      {/* Questions */}
      {note.published && (
        <div className="card">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Student questions
          </p>
          <QuestionThread lessonId={id} canAsk={false} />
        </div>
      )}
    </div>
  );
}
