import { useEffect, useState } from 'react';
import api, { apiError } from '../api/client.js';
import { Alert } from './ui.jsx';

export default function QuestionThread({ lessonId, canAsk }) {
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get(`/lessons/${lessonId}/questions`)
      .then((res) => setQuestions(res.data))
      .catch((err) => setError(apiError(err)));
  }

  useEffect(load, [lessonId]);

  async function ask(e) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/lessons/${lessonId}/questions`, { question: newQuestion });
      setNewQuestion('');
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function reply(questionId) {
    const text = replyDrafts[questionId];
    if (!text || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/questions/${questionId}/reply`, { reply: text });
      setReplyDrafts((d) => ({ ...d, [questionId]: '' }));
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert type="error">{error}</Alert>}

      {canAsk && (
        <form onSubmit={ask} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Ask your teacher a question..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
          <button className="btn-primary" disabled={busy}>
            Ask
          </button>
        </form>
      )}

      {questions.length === 0 ? (
        <p className="text-sm text-gray-500">No questions yet.</p>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-800">{q.question}</p>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">— {q.student_name}</p>

            {q.replies.length > 0 && (
              <div className="mt-2 space-y-2 border-l-2 border-brand-100 pl-3">
                {q.replies.map((r) => (
                  <div key={r.id}>
                    <p className="text-sm text-gray-700">{r.reply}</p>
                    <p className="text-xs text-gray-400">
                      — {r.author_name}{' '}
                      <span className="uppercase">({r.author_role})</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <input
                className="input flex-1 py-1.5 text-sm"
                placeholder="Write a reply..."
                value={replyDrafts[q.id] || ''}
                onChange={(e) =>
                  setReplyDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                }
              />
              <button
                className="btn-secondary py-1.5"
                disabled={busy}
                onClick={() => reply(q.id)}
              >
                Reply
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
