import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiError } from '../api/client.js';
import { Spinner, Alert } from '../components/ui.jsx';
import { LESSON_NOTE_SECTIONS } from '../constants/lessonNoteSections.js';

export default function LessonNotePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/lesson-notes/${id}`)
      .then((res) => setNote(res.data))
      .catch((err) => setError(apiError(err)));
  }, [id]);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!note) return <Spinner />;

  const allocated = (note.time_allocations || []).reduce(
    (sum, a) => sum + (Number(a.minutes) || 0),
    0
  );

  const meta = [
    ['School', note.school_name],
    ['Teacher', note.teacher_name],
    ['Class', note.class_name],
    ['Subject', note.subject],
    ['Week', note.week],
    ['Date', note.date ? note.date.slice(0, 10) : ''],
    ['Topic', note.topic],
    ['Sub-topic', note.sub_topic],
    ['Duration', `${note.duration_minutes} minutes`],
    ['Status', (note.status || '').replace(/_/g, ' ')],
  ];

  return (
    <div className="mx-auto max-w-3xl p-6 print-page">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print mb-4 flex gap-2">
        <button className="btn-primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      {/* Header */}
      <div className="mb-4 border-b-2 border-gray-800 pb-3 text-center">
        <h1 className="text-xl font-bold">
          {note.school_name || 'ClassBridge Ghana'}
        </h1>
        <p className="text-sm font-semibold uppercase tracking-wide">
          Lesson Note
        </p>
      </div>

      {/* Meta grid */}
      <table className="mb-4 w-full border-collapse text-sm">
        <tbody>
          {meta.map(([label, value]) => (
            <tr key={label}>
              <td className="w-1/3 border border-gray-300 bg-gray-50 px-2 py-1 font-semibold">
                {label}
              </td>
              <td className="border border-gray-300 px-2 py-1">{value || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sections */}
      <div className="space-y-3">
        {LESSON_NOTE_SECTIONS.map(([field, label]) =>
          note[field] ? (
            <div key={field}>
              <p className="font-semibold underline">{label}</p>
              <p className="whitespace-pre-wrap text-sm">{note[field]}</p>
            </div>
          ) : null
        )}
      </div>

      {/* Time allocation table */}
      {note.time_allocations?.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 font-semibold underline">Time Allocation</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-left">
                  Stage
                </th>
                <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-right">
                  Minutes
                </th>
              </tr>
            </thead>
            <tbody>
              {note.time_allocations.map((a) => (
                <tr key={a.id}>
                  <td className="border border-gray-300 px-2 py-1">{a.stage}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {a.minutes}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-semibold">
                  Total
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                  {allocated} / {note.duration_minutes}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Review comment */}
      {note.review_comment && (
        <div className="mt-4">
          <p className="font-semibold underline">Headteacher's Review Comment</p>
          <p className="text-sm">{note.review_comment}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div className="border-t border-gray-800 pt-1">
            Teacher's Signature / Date
          </div>
        </div>
        <div>
          <div className="border-t border-gray-800 pt-1">
            Headteacher's Signature / Date
          </div>
        </div>
      </div>
    </div>
  );
}
