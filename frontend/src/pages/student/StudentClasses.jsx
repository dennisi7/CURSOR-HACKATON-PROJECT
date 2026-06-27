import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui.jsx';

export default function StudentClasses() {
  const [classes, setClasses] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get('/classes')
      .then((res) => setClasses(res.data))
      .catch((err) => setError(apiError(err)));
  }

  useEffect(load, []);

  async function join(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await api.post('/classes/join', { class_code: code.trim() });
      setNotice(`Joined ${res.data.class.name}.`);
      setCode('');
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="My Classes" subtitle="Join a class using the code from your teacher." />

      <form onSubmit={join} className="card mb-5 flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="label">Class code</label>
          <input
            className="input"
            placeholder="JHS2-SCI-4821"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Joining...' : 'Join class'}
        </button>
      </form>

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

      {classes === null ? (
        <Spinner />
      ) : classes.length === 0 ? (
        <EmptyState
          title="You have not joined any class"
          message="Ask your teacher for the class code and enter it above."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <div key={c.id} className="card">
              <h3 className="font-semibold text-gray-900">{c.name}</h3>
              <p className="text-sm text-gray-500">
                {c.subject} · {c.level} · {c.term}
              </p>
              <p className="mt-2 text-sm text-gray-500">Teacher: {c.teacher_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
