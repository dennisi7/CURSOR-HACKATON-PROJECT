import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { apiError } from '../../api/client.js';
import { PageHeader, Spinner, Alert } from '../../components/ui.jsx';
import QuestionThread from '../../components/QuestionThread.jsx';

export default function StudentLessonDetail() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/lesson-notes/${id}`)
      .then((res) => setLesson(res.data))
      .catch((err) => setError(apiError(err)));
  }, [id]);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!lesson) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={lesson.topic}
        subtitle={`${lesson.class_name}${lesson.subject ? ` · ${lesson.subject}` : ''}`}
      />

      <div className="card mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Lesson summary
        </p>
        {lesson.student_summary ? (
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {lesson.student_summary}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Your teacher has not added a summary for this lesson yet.
          </p>
        )}
      </div>

      <div className="card">
        <p className="mb-2 text-sm font-semibold text-gray-700">
          Ask a question about this lesson
        </p>
        <QuestionThread lessonId={id} canAsk={true} />
      </div>
    </div>
  );
}
