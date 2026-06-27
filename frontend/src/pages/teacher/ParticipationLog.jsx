import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import {
  PageHeader,
  EmptyState,
  Spinner,
  Alert,
} from '../../components/ui.jsx';

const STATUSES = ['PRESENT_ACTIVE', 'PRESENT_QUIET', 'ABSENT', 'NEEDS_SUPPORT'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ParticipationLog() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({}); // studentId -> { status, comment }
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data)).catch(() => {});
    loadSummary();
  }, []);

  function loadSummary() {
    api
      .get('/participation/summary/teacher')
      .then((res) => setSummary(res.data))
      .catch(() => {});
  }

  // When class or date changes, load students + any existing records for that day.
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    Promise.all([
      api.get(`/classes/${classId}`),
      api.get(`/participation?class_id=${classId}&date=${date}`),
    ])
      .then(([cls, part]) => {
        const list = cls.data.students || [];
        setStudents(list);
        const existing = {};
        part.data.forEach((p) => {
          existing[p.student_id] = { status: p.status, comment: p.comment || '' };
        });
        const initial = {};
        list.forEach((s) => {
          initial[s.id] = existing[s.id] || { status: 'PRESENT_ACTIVE', comment: '' };
        });
        setRecords(initial);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoadingStudents(false));
  }, [classId, date]);

  function updateRecord(studentId, field, value) {
    setRecords((r) => ({
      ...r,
      [studentId]: { ...r[studentId], [field]: value },
    }));
  }

  async function save() {
    setError('');
    setNotice('');
    if (!classId || students.length === 0) {
      setError('Select a class with students first.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        records: students.map((s) => ({
          class_id: Number(classId),
          student_id: s.id,
          participation_date: date,
          status: records[s.id]?.status || 'PRESENT_ACTIVE',
          comment: records[s.id]?.comment || null,
        })),
      };
      await api.post('/participation', payload);
      setNotice('Participation saved.');
      loadSummary();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Participation Log"
        subtitle="Record how learners participated in a lesson."
      />

      {/* Summary cards */}
      {summary && summary.per_class.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.per_class.map((c) => (
            <div key={c.class_id} className="card">
              <p className="font-semibold text-gray-900">{c.class_name}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="text-green-700">Active: {c.present_active}</span>
                <span className="text-blue-700">Quiet: {c.present_quiet}</span>
                <span className="text-red-700">Absent: {c.absent}</span>
                <span className="text-amber-700">Support: {c.needs_support}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {summary && summary.students_needing_support.length > 0 && (
        <div className="mb-5">
          <Alert type="warning">
            <span className="font-semibold">Students who often need support: </span>
            {summary.students_needing_support
              .map((s) => `${s.student_name} (${s.support_count})`)
              .join(', ')}
          </Alert>
        </div>
      )}

      {/* Controls */}
      <div className="card mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Class</label>
          <select
            className="input"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
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
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

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

      {!classId ? (
        <EmptyState
          title="Select a class"
          message="Choose a class and date to record participation."
        />
      ) : loadingStudents ? (
        <Spinner />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students in this class"
          message="Students need to join before you can log participation."
        />
      ) : (
        <>
          <div className="space-y-2">
            {students.map((s) => (
              <div key={s.id} className="card py-3">
                <p className="mb-2 font-medium text-gray-800">{s.name}</p>
                <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                  <select
                    className="input py-1.5 text-sm"
                    value={records[s.id]?.status || 'PRESENT_ACTIVE'}
                    onChange={(e) => updateRecord(s.id, 'status', e.target.value)}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input py-1.5 text-sm"
                    placeholder="Comment (optional)"
                    value={records[s.id]?.comment || ''}
                    onChange={(e) => updateRecord(s.id, 'comment', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button className="btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Saving...' : 'Save participation'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
