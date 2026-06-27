import { Router } from 'express';
import { pool, query } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

const LESSON_FIELDS = [
  'week',
  'date',
  'subject',
  'topic',
  'sub_topic',
  'duration_minutes',
  'learning_objectives',
  'previous_knowledge',
  'materials',
  'introduction',
  'teacher_activities',
  'learner_activities',
  'assessment',
  'closure',
  'remarks',
];

// Coerce empty strings to safe values per column type so Postgres does not
// reject empty DATE / INTEGER inputs from the form.
function normalizeField(field, value) {
  if (field === 'date') {
    return value === '' || value === undefined || value === null ? null : value;
  }
  if (field === 'duration_minutes') {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 60;
  }
  return value === undefined ? null : value;
}

async function attachAllocations(lesson) {
  const allocations = await query(
    `SELECT id, stage, minutes, position FROM lesson_time_allocations
     WHERE lesson_note_id = $1 ORDER BY position, id`,
    [lesson.id]
  );
  return { ...lesson, time_allocations: allocations.rows };
}

async function studentInClass(studentId, classId) {
  const r = await query(
    'SELECT 1 FROM class_students WHERE student_id = $1 AND class_id = $2',
    [studentId, classId]
  );
  return r.rows.length > 0;
}

// GET /api/lesson-notes
// Teacher: own notes. Student: published notes from their classes. Head: submitted/all.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { class_id, status } = req.query;
    let result;

    if (role === 'TEACHER') {
      const params = [id];
      let sql = `SELECT l.*, c.name AS class_name FROM lesson_notes l
                 JOIN classes c ON c.id = l.class_id WHERE l.teacher_id = $1`;
      if (class_id) {
        params.push(class_id);
        sql += ` AND l.class_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        sql += ` AND l.status = $${params.length}`;
      }
      sql += ' ORDER BY l.updated_at DESC';
      result = await query(sql, params);
    } else if (role === 'STUDENT') {
      result = await query(
        `SELECT l.*, c.name AS class_name FROM lesson_notes l
         JOIN classes c ON c.id = l.class_id
         JOIN class_students cs ON cs.class_id = c.id
         WHERE cs.student_id = $1 AND l.published = TRUE
         ORDER BY l.updated_at DESC`,
        [id]
      );
    } else {
      // HEADTEACHER / ADMIN
      const params = [];
      let sql = `SELECT l.*, c.name AS class_name, u.name AS teacher_name
                 FROM lesson_notes l
                 JOIN classes c ON c.id = l.class_id
                 JOIN users u ON u.id = l.teacher_id`;
      if (status) {
        params.push(status);
        sql += ` WHERE l.status = $${params.length}`;
      }
      sql += ' ORDER BY l.updated_at DESC';
      result = await query(sql, params);
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/lesson-notes  (teacher)
router.post('/', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { class_id, time_allocations } = req.body;
    if (!class_id || !req.body.topic) {
      return res.status(400).json({ message: 'Class and topic are required.' });
    }

    const owns = await client.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [class_id, req.user.id]
    );
    if (!owns.rows.length) {
      return res.status(403).json({ message: 'You do not own this class.' });
    }

    await client.query('BEGIN');
    const values = LESSON_FIELDS.map((f) => normalizeField(f, req.body[f]));
    const cols = ['class_id', 'teacher_id', ...LESSON_FIELDS];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const insert = await client.query(
      `INSERT INTO lesson_notes (${cols.join(', ')})
       VALUES (${placeholders}) RETURNING *`,
      [class_id, req.user.id, ...values]
    );
    const lesson = insert.rows[0];

    await insertAllocations(client, lesson.id, time_allocations);
    await client.query('COMMIT');

    res.status(201).json(await attachAllocations(lesson));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

async function insertAllocations(client, lessonId, allocations) {
  if (!Array.isArray(allocations)) return;
  for (let i = 0; i < allocations.length; i++) {
    const a = allocations[i];
    if (!a || !a.stage) continue;
    await client.query(
      `INSERT INTO lesson_time_allocations (lesson_note_id, stage, minutes, position)
       VALUES ($1, $2, $3, $4)`,
      [lessonId, a.stage, Number(a.minutes) || 0, i]
    );
  }
}

// GET /api/lesson-notes/:id
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT l.*, c.name AS class_name, c.teacher_id, u.name AS teacher_name,
              sch.name AS school_name
       FROM lesson_notes l
       JOIN classes c ON c.id = l.class_id
       JOIN users u ON u.id = l.teacher_id
       LEFT JOIN schools sch ON sch.id = c.school_id
       WHERE l.id = $1`,
      [req.params.id]
    );
    const lesson = result.rows[0];
    if (!lesson) return res.status(404).json({ message: 'Lesson note not found.' });

    // Access control
    if (req.user.role === 'TEACHER' && lesson.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Not your lesson note.' });
    }
    if (req.user.role === 'STUDENT') {
      const allowed =
        lesson.published && (await studentInClass(req.user.id, lesson.class_id));
      if (!allowed) {
        return res.status(403).json({ message: 'This lesson is not available.' });
      }
    }

    res.json(await attachAllocations(lesson));
  } catch (err) {
    next(err);
  }
});

// PUT /api/lesson-notes/:id  (teacher, draft/needs-correction editing)
router.put('/:id', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      'SELECT * FROM lesson_notes WHERE id = $1',
      [req.params.id]
    );
    const lesson = existing.rows[0];
    if (!lesson) return res.status(404).json({ message: 'Lesson note not found.' });
    if (lesson.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Not your lesson note.' });
    }

    await client.query('BEGIN');
    const sets = LESSON_FIELDS.map((f, i) => `${f} = $${i + 1}`);
    const values = LESSON_FIELDS.map((f) =>
      req.body[f] !== undefined ? normalizeField(f, req.body[f]) : lesson[f]
    );
    values.push(req.params.id);
    await client.query(
      `UPDATE lesson_notes SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${values.length}`,
      values
    );

    if (Array.isArray(req.body.time_allocations)) {
      await client.query(
        'DELETE FROM lesson_time_allocations WHERE lesson_note_id = $1',
        [req.params.id]
      );
      await insertAllocations(client, req.params.id, req.body.time_allocations);
    }

    await client.query('COMMIT');
    const updated = await query('SELECT * FROM lesson_notes WHERE id = $1', [
      req.params.id,
    ]);
    res.json(await attachAllocations(updated.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/lesson-notes/:id/submit  (teacher)
router.post('/:id/submit', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE lesson_notes SET status = 'SUBMITTED', updated_at = now()
       WHERE id = $1 AND teacher_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Lesson note not found.' });
    }
    res.json(await attachAllocations(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// POST /api/lesson-notes/:id/review  (headteacher / admin)
router.post(
  '/:id/review',
  authRequired,
  requireRole('HEADTEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { decision, comment } = req.body; // decision: 'APPROVE' | 'NEEDS_CORRECTION'
      const status =
        decision === 'APPROVE'
          ? 'APPROVED'
          : decision === 'NEEDS_CORRECTION'
          ? 'NEEDS_CORRECTION'
          : null;
      if (!status) {
        return res
          .status(400)
          .json({ message: 'Decision must be APPROVE or NEEDS_CORRECTION.' });
      }
      const result = await query(
        `UPDATE lesson_notes
         SET status = $1, review_comment = $2, reviewed_by = $3, reviewed_at = now(),
             updated_at = now()
         WHERE id = $4 RETURNING *`,
        [status, comment || null, req.user.id, req.params.id]
      );
      if (!result.rows.length) {
        return res.status(404).json({ message: 'Lesson note not found.' });
      }
      res.json(await attachAllocations(result.rows[0]));
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/lesson-notes/:id/publish  (teacher) - publish a student-facing summary
router.post('/:id/publish', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { student_summary } = req.body;
    const result = await query(
      `UPDATE lesson_notes
       SET published = TRUE, student_summary = COALESCE($1, student_summary),
           updated_at = now()
       WHERE id = $2 AND teacher_id = $3 RETURNING *`,
      [student_summary || null, req.params.id, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Lesson note not found.' });
    }
    res.json(await attachAllocations(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

export default router;
