import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

async function studentInClass(studentId, classId) {
  const r = await query(
    'SELECT 1 FROM class_students WHERE student_id = $1 AND class_id = $2',
    [studentId, classId]
  );
  return r.rows.length > 0;
}

// GET /api/lessons/:id/questions
router.get('/lessons/:id/questions', authRequired, async (req, res, next) => {
  try {
    const questions = await query(
      `SELECT q.*, u.name AS student_name
       FROM lesson_questions q JOIN users u ON u.id = q.student_id
       WHERE q.lesson_note_id = $1 ORDER BY q.created_at ASC`,
      [req.params.id]
    );

    const ids = questions.rows.map((q) => q.id);
    let repliesByQuestion = {};
    if (ids.length) {
      const replies = await query(
        `SELECT r.*, u.name AS author_name, u.role AS author_role
         FROM question_replies r JOIN users u ON u.id = r.user_id
         WHERE r.question_id = ANY($1::int[]) ORDER BY r.created_at ASC`,
        [ids]
      );
      repliesByQuestion = replies.rows.reduce((acc, r) => {
        (acc[r.question_id] = acc[r.question_id] || []).push(r);
        return acc;
      }, {});
    }

    res.json(
      questions.rows.map((q) => ({ ...q, replies: repliesByQuestion[q.id] || [] }))
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/lessons/:id/questions  (student)
router.post(
  '/lessons/:id/questions',
  authRequired,
  requireRole('STUDENT'),
  async (req, res, next) => {
    try {
      const { question } = req.body;
      if (!question || !question.trim()) {
        return res.status(400).json({ message: 'Question cannot be empty.' });
      }
      const lesson = await query(
        'SELECT class_id, published FROM lesson_notes WHERE id = $1',
        [req.params.id]
      );
      if (!lesson.rows.length || !lesson.rows[0].published) {
        return res.status(404).json({ message: 'Lesson not available.' });
      }
      if (!(await studentInClass(req.user.id, lesson.rows[0].class_id))) {
        return res.status(403).json({ message: 'You are not in this class.' });
      }

      const result = await query(
        `INSERT INTO lesson_questions (lesson_note_id, student_id, question)
         VALUES ($1, $2, $3) RETURNING *`,
        [req.params.id, req.user.id, question.trim()]
      );
      res.status(201).json({ ...result.rows[0], student_name: req.user.name, replies: [] });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/questions/:id/reply  (teacher or student in the thread)
router.post('/questions/:id/reply', authRequired, async (req, res, next) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply cannot be empty.' });
    }
    const q = await query('SELECT id FROM lesson_questions WHERE id = $1', [
      req.params.id,
    ]);
    if (!q.rows.length) {
      return res.status(404).json({ message: 'Question not found.' });
    }
    const result = await query(
      `INSERT INTO question_replies (question_id, user_id, reply)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, reply.trim()]
    );
    res.status(201).json({
      ...result.rows[0],
      author_name: req.user.name,
      author_role: req.user.role,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
