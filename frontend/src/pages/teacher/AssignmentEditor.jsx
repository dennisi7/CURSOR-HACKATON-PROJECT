import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, Alert } from '../../components/ui.jsx';

export default function AssignmentEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    class_id: '',
    title: '',
    description: '',
    due_date: '',
    total_marks: 20,
    status: 'PUBLISHED',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data);
      const preset = searchParams.get('class');
      if (preset) setForm((f) => ({ ...f, class_id: preset }));
    });
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.class_id || !form.title) {
      setError('Class and title are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/assignments', form);
      navigate(`/teacher/assignments/${res.data.id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Assignment" />
      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="card space-y-3">
        <div>
          <label className="label">Class</label>
          <select
            className="input"
            value={form.class_id}
            onChange={(e) => update('class_id', e.target.value)}
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
          <label className="label">Title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Description / instructions</label>
          <textarea
            className="input min-h-[100px]"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Due date</label>
            <input
              className="input"
              type="date"
              value={form.due_date}
              onChange={(e) => update('due_date', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Total marks</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.total_marks}
              onChange={(e) => update('total_marks', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="PUBLISHED">Published (students can see it)</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
        <button className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Create assignment'}
        </button>
      </form>
    </div>
  );
}
