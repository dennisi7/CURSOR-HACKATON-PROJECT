import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
  StatusBadge,
  ProgressBar,
} from '../../components/ui.jsx';

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BEHIND'];

export default function SyllabusCoverage() {
  const [classes, setClasses] = useState([]);
  const [topics, setTopics] = useState(null);
  const [coverage, setCoverage] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    class_id: '',
    subject: '',
    term: 'Term 1',
    week_number: 1,
    topic: '',
    status: 'NOT_STARTED',
  });

  function loadAll() {
    Promise.all([
      api.get('/syllabus'),
      api.get('/syllabus/coverage/teacher'),
    ])
      .then(([t, c]) => {
        setTopics(t.data);
        setCoverage(c.data);
      })
      .catch((err) => setError(apiError(err)));
  }

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data)).catch(() => {});
    loadAll();
  }, []);

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Auto-fill subject from the selected class
      if (field === 'class_id') {
        const cls = classes.find((c) => String(c.id) === String(value));
        if (cls) next.subject = cls.subject;
      }
      return next;
    });
  }

  async function addTopic(e) {
    e.preventDefault();
    setError('');
    if (!form.class_id || !form.topic) {
      setError('Class and topic are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/syllabus', form);
      setForm((f) => ({ ...f, topic: '', week_number: Number(f.week_number) + 1 }));
      setShowForm(false);
      loadAll();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(topic, status) {
    setError('');
    try {
      await api.put(`/syllabus/${topic.id}`, { status });
      loadAll();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function remove(id) {
    setError('');
    try {
      await api.delete(`/syllabus/${id}`);
      loadAll();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Syllabus Coverage"
        subtitle="Track planned topics and how far you have covered them."
        action={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : '+ Add Topic'}
          </button>
        }
      />

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {showForm && (
        <form onSubmit={addTopic} className="card mb-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Class</label>
              <select
                className="input"
                value={form.class_id}
                onChange={(e) => update('class_id', e.target.value)}
                required
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Term</label>
              <select
                className="input"
                value={form.term}
                onChange={(e) => update('term', e.target.value)}
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </div>
            <div>
              <label className="label">Week number</label>
              <input
                className="input"
                type="number"
                min="1"
                value={form.week_number}
                onChange={(e) => update('week_number', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Topic</label>
              <input
                className="input"
                value={form.topic}
                onChange={(e) => update('topic', e.target.value)}
                placeholder="e.g. Photosynthesis"
                required
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Adding...' : 'Add topic'}
          </button>
        </form>
      )}

      {/* Coverage summary cards */}
      {coverage.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {coverage.map((c) => (
            <div key={`${c.class_id}-${c.subject}-${c.term}`} className="card">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-gray-900">{c.class_name}</p>
                <span className="text-xs text-gray-500">{c.term}</span>
              </div>
              <p className="mb-2 text-sm text-gray-500">{c.subject}</p>
              <ProgressBar percent={c.coverage_percent} />
              <p className="mt-1 text-xs text-gray-500">
                {c.completed_topics}/{c.total_topics} completed
                {c.behind_topics > 0 && (
                  <span className="ml-1 text-red-600">
                    · {c.behind_topics} behind
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Topic table */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Planned topics
      </h2>
      {topics === null ? (
        <Spinner />
      ) : topics.length === 0 ? (
        <EmptyState
          title="No topics planned yet"
          message="Add your scheme of work topics to start tracking coverage."
        />
      ) : (
        <div className="space-y-2">
          {topics.map((t) => (
            <div key={t.id} className="card flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">
                  <span className="text-gray-400">Wk {t.week_number}</span> ·{' '}
                  {t.topic}
                </p>
                <p className="text-xs text-gray-500">
                  {t.class_name} · {t.subject}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  className="input w-40 py-1.5 text-sm"
                  value={t.status}
                  onChange={(e) => changeStatus(t, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(t.id)}
                  className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
