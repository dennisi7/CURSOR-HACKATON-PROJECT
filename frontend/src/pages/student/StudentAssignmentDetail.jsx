import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  Spinner,
  Alert,
  StatusBadge,
} from '../../components/ui.jsx';

export default function StudentAssignmentDetail() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get(`/assignments/${id}`)
      .then((res) => {
        setAssignment(res.data);
        setAnswer(res.data.my_submission?.answer_text || '');
      })
      .catch((err) => setError(apiError(err)));
  }

  useEffect(load, [id]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!answer.trim()) {
      setError('Please write your answer first.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/assignments/${id}/submit`, { answer_text: answer });
      setNotice('Your answer has been submitted.');
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !assignment) return <Alert type="error">{error}</Alert>;
  if (!assignment) return <Spinner />;

  const sub = assignment.my_submission;
  const marked = sub?.status === 'MARKED';

  return (
    <div>
      <PageHeader
        title={assignment.title}
        subtitle={`${assignment.class_name} · ${assignment.total_marks} marks${
          assignment.due_date ? ` · Due ${assignment.due_date.slice(0, 10)}` : ''
        }`}
        action={sub && <StatusBadge status={sub.status} />}
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

      {/* Result if marked */}
      {marked && (
        <div className="card mb-4 border-green-200 bg-green-50">
          <p className="text-sm text-gray-600">Your score</p>
          <p className="text-3xl font-bold text-green-700">
            {sub.score ?? '-'} / {assignment.total_marks}
          </p>
          {sub.feedback && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold">Feedback: </span>
              {sub.feedback}
            </p>
          )}
        </div>
      )}

      {/* Answer box */}
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label">Your answer</label>
          <textarea
            className="input min-h-[140px]"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={marked}
            placeholder="Type your answer here..."
          />
        </div>
        {!marked && (
          <button className="btn-primary" disabled={busy}>
            {sub ? 'Update submission' : 'Submit answer'}
          </button>
        )}
        {sub && !marked && (
          <p className="text-xs text-gray-500">
            You have submitted. You can update your answer until it is marked.
          </p>
        )}
      </form>
    </div>
  );
}
