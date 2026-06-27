import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, Alert, Spinner } from '../../components/ui.jsx';
import TimeAllocationChecker from '../../components/TimeAllocationChecker.jsx';

const DRAFT_KEY = 'cb_lesson_draft';

const EMPTY = {
  class_id: '',
  week: '',
  date: '',
  subject: '',
  topic: '',
  sub_topic: '',
  duration_minutes: 60,
  learning_objectives: '',
  previous_knowledge: '',
  materials: '',
  introduction: '',
  teacher_activities: '',
  learner_activities: '',
  assessment: '',
  closure: '',
  remarks: '',
};

const TEXT_AREAS = [
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

export default function LessonNoteEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [allocations, setAllocations] = useState([
    { stage: 'Introduction', minutes: 5 },
    { stage: 'Main Activity', minutes: 35 },
    { stage: 'Assessment', minutes: 15 },
    { stage: 'Closure', minutes: 5 },
  ]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data);
      const preset = searchParams.get('class');
      if (!isEdit && preset) {
        setForm((f) => ({ ...f, class_id: preset }));
      }
    });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/lesson-notes/${id}`)
      .then((res) => {
        const n = res.data;
        setForm({
          class_id: String(n.class_id),
          week: n.week || '',
          date: n.date ? n.date.slice(0, 10) : '',
          subject: n.subject || '',
          topic: n.topic || '',
          sub_topic: n.sub_topic || '',
          duration_minutes: n.duration_minutes || 60,
          learning_objectives: n.learning_objectives || '',
          previous_knowledge: n.previous_knowledge || '',
          materials: n.materials || '',
          introduction: n.introduction || '',
          teacher_activities: n.teacher_activities || '',
          learner_activities: n.learner_activities || '',
          assessment: n.assessment || '',
          closure: n.closure || '',
          remarks: n.remarks || '',
        });
        if (n.time_allocations?.length) {
          setAllocations(
            n.time_allocations.map((a) => ({ stage: a.stage, minutes: a.minutes }))
          );
        }
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function buildPayload() {
    return { ...form, time_allocations: allocations };
  }

  async function save({ submitAfter = false } = {}) {
    setError('');
    setNotice('');
    if (!form.class_id || !form.topic) {
      setError('Please choose a class and enter a topic.');
      return;
    }
    setSaving(true);
    try {
      let lessonId = id;
      if (isEdit) {
        await api.put(`/lesson-notes/${id}`, buildPayload());
      } else {
        const res = await api.post('/lesson-notes', buildPayload());
        lessonId = res.data.id;
      }
      if (submitAfter) {
        await api.post(`/lesson-notes/${lessonId}/submit`);
      }
      clearDraft(true);
      navigate(`/teacher/lesson-notes/${lessonId}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  // --- Offline drafts (localStorage) ---
  function saveDraft() {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ form, allocations, savedAt: new Date().toISOString() })
    );
    setNotice('Draft saved offline on this device.');
  }

  function loadDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      setError('No offline draft found on this device.');
      return;
    }
    try {
      const data = JSON.parse(raw);
      setForm({ ...EMPTY, ...data.form });
      if (Array.isArray(data.allocations)) setAllocations(data.allocations);
      setNotice('Offline draft loaded.');
      setError('');
    } catch {
      setError('Could not read the offline draft.');
    }
  }

  function clearDraft(silent = false) {
    localStorage.removeItem(DRAFT_KEY);
    if (!silent) setNotice('Offline draft cleared.');
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Lesson Note' : 'New Lesson Note'}
        subtitle="Fill the lesson plan and check that your time is balanced."
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

      {/* Offline draft controls */}
      <div className="card mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Offline drafts (for low-connectivity)
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={saveDraft}>
            Save Offline Draft
          </button>
          <button type="button" className="btn-secondary" onClick={loadDraft}>
            Load Offline Draft
          </button>
          <button type="button" className="btn-secondary" onClick={() => clearDraft()}>
            Clear Draft
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card grid gap-3 sm:grid-cols-2">
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
            <label className="label">Week</label>
            <input
              className="input"
              placeholder="Week 4"
              value={form.week}
              onChange={(e) => update('week', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Subject</label>
            <input
              className="input"
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Topic</label>
            <input
              className="input"
              placeholder="Photosynthesis"
              value={form.topic}
              onChange={(e) => update('topic', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Sub-topic</label>
            <input
              className="input"
              value={form.sub_topic}
              onChange={(e) => update('sub_topic', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.duration_minutes}
              onChange={(e) => update('duration_minutes', e.target.value)}
            />
          </div>
        </div>

        {/* Time allocation checker */}
        <div className="card">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Lesson Time Allocation Checker
          </p>
          <TimeAllocationChecker
            allocations={allocations}
            duration={form.duration_minutes}
            onChange={setAllocations}
          />
        </div>

        {/* Long text fields */}
        <div className="card grid gap-3">
          {TEXT_AREAS.map(([field, label]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <textarea
                className="input min-h-[80px]"
                value={form[field]}
                onChange={(e) => update(field, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            disabled={saving}
            onClick={() => save()}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="btn-primary"
            disabled={saving}
            onClick={() => save({ submitAfter: true })}
          >
            Save & Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
}
