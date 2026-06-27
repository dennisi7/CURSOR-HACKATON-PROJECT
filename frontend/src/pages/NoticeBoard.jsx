import { useEffect, useState } from 'react';
import api, { apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
  AudienceBadge,
} from '../components/ui.jsx';

function isExpired(notice) {
  return notice.expires_at && new Date(notice.expires_at) < new Date();
}

export default function NoticeBoard() {
  const { user } = useAuth();
  const canPost = ['TEACHER', 'HEADTEACHER', 'ADMIN'].includes(user.role);
  const isHead = ['HEADTEACHER', 'ADMIN'].includes(user.role);

  const [notices, setNotices] = useState(null);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: isHead ? 'ALL' : 'CLASS',
    class_id: '',
    is_pinned: false,
    expires_at: '',
  });

  function load() {
    api
      .get('/notices')
      .then((res) => setNotices(res.data))
      .catch((err) => setError(apiError(err)));
  }

  useEffect(() => {
    load();
    if (canPost) {
      api.get('/classes').then((res) => setClasses(res.data)).catch(() => {});
    }
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.audience !== 'CLASS') payload.class_id = null;
      await api.post('/notices', payload);
      setShowForm(false);
      setForm({
        title: '',
        body: '',
        audience: isHead ? 'ALL' : 'CLASS',
        class_id: '',
        is_pinned: false,
        expires_at: '',
      });
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    setError('');
    try {
      await api.delete(`/notices/${id}`);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  const audienceOptions = isHead
    ? ['ALL', 'TEACHERS', 'STUDENTS', 'CLASS']
    : ['CLASS'];

  const pinned = (notices || []).filter((n) => n.is_pinned);
  const regular = (notices || []).filter((n) => !n.is_pinned);

  return (
    <div>
      <PageHeader
        title="Notice Board"
        subtitle="School and class announcements."
        action={
          canPost && (
            <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Close' : '+ New Notice'}
            </button>
          )
        }
      />

      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-5 space-y-3">
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
            <label className="label">Message</label>
            <textarea
              className="input min-h-[90px]"
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Audience</label>
              <select
                className="input"
                value={form.audience}
                onChange={(e) => update('audience', e.target.value)}
              >
                {audienceOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            {form.audience === 'CLASS' && (
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
            )}
            <div>
              <label className="label">Expiry date (optional)</label>
              <input
                className="input"
                type="date"
                value={form.expires_at}
                onChange={(e) => update('expires_at', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={(e) => update('is_pinned', e.target.checked)}
                />
                Pin this notice
              </label>
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Posting...' : 'Post notice'}
          </button>
        </form>
      )}

      {notices === null ? (
        <Spinner />
      ) : notices.length === 0 ? (
        <EmptyState
          title="No notices yet"
          message="Announcements from the school and your classes will appear here."
        />
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                📌 Pinned
              </h2>
              <div className="space-y-2">
                {pinned.map((n) => (
                  <NoticeItem
                    key={n.id}
                    notice={n}
                    user={user}
                    onDelete={remove}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            {pinned.length > 0 && (
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Recent
              </h2>
            )}
            <div className="space-y-2">
              {regular.map((n) => (
                <NoticeItem key={n.id} notice={n} user={user} onDelete={remove} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoticeItem({ notice, user, onDelete }) {
  const canManage =
    notice.posted_by === user.id ||
    ['HEADTEACHER', 'ADMIN'].includes(user.role);
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{notice.title}</h3>
            <AudienceBadge audience={notice.audience} />
            {notice.audience === 'CLASS' && notice.class_name && (
              <span className="text-xs text-gray-500">{notice.class_name}</span>
            )}
            {isExpired(notice) && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                Expired
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
            {notice.body}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            By {notice.posted_by_name}
            {notice.expires_at
              ? ` · Expires ${notice.expires_at.slice(0, 10)}`
              : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => onDelete(notice.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
