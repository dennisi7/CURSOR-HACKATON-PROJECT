import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui.jsx';

export default function Classes() {
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    level: 'JHS 2',
    term: 'Term 1',
    class_code: '',
  });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  function load() {
    api
      .get('/classes')
      .then((res) => setClasses(res.data))
      .catch((err) => setError(apiError(err)));
  }

  useEffect(load, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/classes', form);
      setCreated(res.data);
      setShowForm(false);
      setForm({ name: '', subject: '', level: 'JHS 2', term: 'Term 1', class_code: '' });
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Create classes and share the code with your students."
        action={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : '+ Create Class'}
          </button>
        }
      />

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {created && (
        <div className="mb-3">
          <Alert type="success">
            Class created. Share this code with students:{' '}
            <span className="font-bold">{created.class_code}</span>
          </Alert>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Class name</label>
              <input
                className="input"
                placeholder="JHS 2 Integrated Science"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                placeholder="Integrated Science"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Level</label>
              <input
                className="input"
                placeholder="JHS 2"
                value={form.level}
                onChange={(e) => update('level', e.target.value)}
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
            <div className="sm:col-span-2">
              <label className="label">Class code (optional)</label>
              <input
                className="input"
                placeholder="Leave blank to auto-generate"
                value={form.class_code}
                onChange={(e) => update('class_code', e.target.value)}
              />
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create class'}
          </button>
        </form>
      )}

      {classes === null ? (
        <Spinner />
      ) : classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          message="Create your first class to start preparing lessons and assignments."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <Link
              key={c.id}
              to={`/teacher/classes/${c.id}`}
              className="card transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {c.term}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {c.subject} · {c.level}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-mono text-brand-700">{c.class_code}</span>
                <span className="text-gray-500">{c.student_count} students</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
