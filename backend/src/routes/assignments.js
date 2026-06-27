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

// GET /api/assignments
// Teacher: own assignments. Student: published assignments in their classes.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { class_id } = req.query;
    let result;

    if (role === 'TEACHER') {
      const params = [id];
      let sql = `SELECT a.*, c.name AS class_name,
                   (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
                 FROM assignments a JOIN classes c ON c.id = a.class_id
                 WHERE a.teacher_id = $1`;
      if (class_id) {
        params.push(class_id);
        sql += ` AND a.class_id = $${params.length}`;
      }
      sql += ' ORDER BY a.created_at DESC';
      result = await query(sql, params);
    } else if (role === 'STUDENT') {
      result = await query(
        `SELECT a.*, c.name AS class_name,
                s.id AS submission_id, s.status AS submission_status,
                s.score, s.feedback
         FROM assignments a
         JOIN classes c ON c.id = a.class_id
         JOIN class_students cs ON cs.class_id = c.id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
         WHERE cs.student_id = $1 AND a.status = 'PUBLISHED'
         ORDER BY a.created_at DESC`,
        [id]
      );
    } else {
      result = await query(
        `SELECT a.*, c.name AS class_name FROM assignments a
         JOIN classes c ON c.id = a.class_id ORDER BY a.created_at DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments  (teacher)
router.post('/', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { class_id, title, description, due_date, total_marks, status } = req.body;
    if (!class_id || !title) {
      return res.status(400).json({ message: 'Class and title are required.' });
    }
    const owns = await query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [class_id, req.user.id]
    );
    if (!owns.rows.length) {
      return res.status(403).json({ message: 'You do not own this class.' });
    }

    const result = await query(
      `INSERT INTO assignments (class_id, teacher_id, title, description, due_date, total_marks, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        class_id,
        req.user.id,
        title,
        description || null,
        due_date || null,
        Number(total_marks) || 100,
        status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/assignments/:id
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, c.name AS class_name FROM assignments a
       JOIN classes c ON c.id = a.class_id WHERE a.id = $1`,
      [req.params.id]
    );
    const assignment = result.rows[0];
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    if (req.user.role === 'STUDENT') {
      const allowed =
        assignment.status === 'PUBLISHED' &&
        (await studentInClass(req.user.id, assignment.class_id));
      if (!allowed) return res.status(403).json({ message: 'Not available.' });

      const sub = await query(
        'SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2',
        [req.params.id, req.user.id]
      );
      assignment.my_submission = sub.rows[0] || null;
    }
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

// PUT /api/assignments/:id  (teacher) - edit / publish
router.put('/:id', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT * FROM assignments WHERE id = $1 AND teacher_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }
    const a = existing.rows[0];
    const { title, description, due_date, total_marks, status } = req.body;
    const result = await query(
      `UPDATE assignments
       SET title = $1, description = $2, due_date = $3, total_marks = $4, status = $5
       WHERE id = $6 RETURNING *`,
      [
        title ?? a.title,
        description ?? a.description,
        due_date ?? a.due_date,
        total_marks ?? a.total_marks,
        status === 'PUBLISHED' || status === 'DRAFT' ? status : a.status,
        req.params.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments/:id/submit  (student)
router.post('/:id/submit', authRequired, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const { answer_text } = req.body;
    if (!answer_text || !answer_text.trim()) {
      return res.status(400).json({ message: 'Answer cannot be empty.' });
    }
    const a = await query(
      "SELECT * FROM assignments WHERE id = $1 AND status = 'PUBLISHED'",
      [req.params.id]
    );
    if (!a.rows.length) {
      return res.status(404).json({ message: 'Assignment not available.' });
    }
    if (!(await studentInClass(req.user.id, a.rows[0].class_id))) {
      return res.status(403).json({ message: 'You are not in this class.' });
    }

    const result = await query(
      `INSERT INTO submissions (assignment_id, student_id, answer_text, status)
       VALUES ($1, $2, $3, 'SUBMITTED')
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET answer_text = EXCLUDED.answer_text, status = 'SUBMITTED',
                     submitted_at = now(), score = NULL, feedback = NULL, marked_at = NULL
       RETURNING *`,
      [req.params.id, req.user.id, answer_text.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/assignments/:id/submissions  (teacher)
router.get(
  '/:id/submissions',
  authRequired,
  requireRole('TEACHER'),
  async (req, res, next) => {
    try {
      const owns = await query(
        'SELECT id FROM assignments WHERE id = $1 AND teacher_id = $2',
        [req.params.id, req.user.id]
      );
      if (!owns.rows.length) {
        return res.status(403).json({ message: 'Not your assignment.' });
      }
      const result = await query(
        `SELECT s.*, u.name AS student_name, u.email AS student_email
         FROM submissions s JOIN users u ON u.id = s.student_id
         WHERE s.assignment_id = $1 ORDER BY s.submitted_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
