import { Router } from 'express';
import { pool, query } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

const STATUSES = ['PRESENT_ACTIVE', 'PRESENT_QUIET', 'ABSENT', 'NEEDS_SUPPORT'];

async function teacherOwnsClass(teacherId, classId) {
  const r = await query(
    'SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2',
    [classId, teacherId]
  );
  return r.rows.length > 0;
}

// GET /api/participation - filtered by role + optional class_id, date, student_id
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { class_id, date, student_id } = req.query;
    const params = [];
    const conditions = [];

    let sql = `SELECT p.*, s.name AS student_name, c.name AS class_name,
                      l.topic AS lesson_topic
               FROM class_participation p
               JOIN users s ON s.id = p.student_id
               JOIN classes c ON c.id = p.class_id
               LEFT JOIN lesson_notes l ON l.id = p.lesson_note_id`;

    if (role === 'TEACHER') {
      params.push(id);
      conditions.push(`p.teacher_id = $${params.length}`);
    } else if (role === 'STUDENT') {
      params.push(id);
      conditions.push(`p.student_id = $${params.length}`);
    }
    if (class_id) {
      params.push(class_id);
      conditions.push(`p.class_id = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`p.participation_date = $${params.length}`);
    }
    if (student_id && role !== 'STUDENT') {
      params.push(student_id);
      conditions.push(`p.student_id = $${params.length}`);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY p.participation_date DESC, s.name';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/participation (teacher) - single record or { records: [...] }
router.post('/', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    const records = Array.isArray(body.records) ? body.records : [body];
    if (!records.length) {
      return res.status(400).json({ message: 'No records provided.' });
    }

    // Validate all records share an owned class and have valid status.
    for (const rec of records) {
      if (!rec.class_id || !rec.student_id || !rec.status) {
        return res
          .status(400)
          .json({ message: 'class_id, student_id and status are required.' });
      }
      if (!STATUSES.includes(rec.status)) {
        return res.status(400).json({ message: `Invalid status: ${rec.status}` });
      }
      if (!(await teacherOwnsClass(req.user.id, rec.class_id))) {
        return res
          .status(403)
          .json({ message: 'You can only log participation for your classes.' });
      }
    }

    await client.query('BEGIN');
    const saved = [];
    for (const rec of records) {
      const date = rec.participation_date || new Date().toISOString().slice(0, 10);
      // Upsert on (class_id, student_id, participation_date)
      const result = await client.query(
        `INSERT INTO class_participation
          (class_id, lesson_note_id, student_id, teacher_id, participation_date, status, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (class_id, student_id, participation_date)
         DO UPDATE SET status = EXCLUDED.status, comment = EXCLUDED.comment,
                       lesson_note_id = EXCLUDED.lesson_note_id, updated_at = now()
         RETURNING *`,
        [
          rec.class_id,
          rec.lesson_note_id || null,
          rec.student_id,
          req.user.id,
          date,
          rec.status,
          rec.comment || null,
        ]
      );
      saved.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(saved);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/participation/:id (teacher, own record)
router.put('/:id', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT * FROM class_participation WHERE id = $1 AND teacher_id = $2',
      [req.params.id, req.user.id]
    );
    const rec = existing.rows[0];
    if (!rec) return res.status(404).json({ message: 'Record not found.' });

    const { status, comment } = req.body;
    const safeStatus = status && STATUSES.includes(status) ? status : rec.status;

    const result = await query(
      `UPDATE class_participation
       SET status = $1, comment = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [safeStatus, comment !== undefined ? comment : rec.comment, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/participation/:id (teacher, own record)
router.delete('/:id', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT 1 FROM class_participation WHERE id = $1 AND teacher_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Record not found.' });
    }
    await query('DELETE FROM class_participation WHERE id = $1', [req.params.id]);
    res.json({ message: 'Record deleted.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/participation/summary/teacher - per class status counts + students needing support
router.get(
  '/summary/teacher',
  authRequired,
  requireRole('TEACHER'),
  async (req, res, next) => {
    try {
      const perClass = await query(
        `SELECT p.class_id, c.name AS class_name,
                COUNT(*)::int AS total_records,
                COUNT(*) FILTER (WHERE p.status = 'PRESENT_ACTIVE')::int AS present_active,
                COUNT(*) FILTER (WHERE p.status = 'PRESENT_QUIET')::int AS present_quiet,
                COUNT(*) FILTER (WHERE p.status = 'ABSENT')::int AS absent,
                COUNT(*) FILTER (WHERE p.status = 'NEEDS_SUPPORT')::int AS needs_support
         FROM class_participation p
         JOIN classes c ON c.id = p.class_id
         WHERE p.teacher_id = $1
         GROUP BY p.class_id, c.name
         ORDER BY c.name`,
        [req.user.id]
      );

      const needsSupport = await query(
        `SELECT p.student_id, s.name AS student_name, c.name AS class_name,
                COUNT(*)::int AS support_count
         FROM class_participation p
         JOIN users s ON s.id = p.student_id
         JOIN classes c ON c.id = p.class_id
         WHERE p.teacher_id = $1 AND p.status = 'NEEDS_SUPPORT'
           AND p.participation_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY p.student_id, s.name, c.name
         HAVING COUNT(*) >= 1
         ORDER BY support_count DESC`,
        [req.user.id]
      );

      res.json({
        per_class: perClass.rows,
        students_needing_support: needsSupport.rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/participation/summary/headteacher - school-wide class concerns
router.get(
  '/summary/headteacher',
  authRequired,
  requireRole('HEADTEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const perClass = await query(
        `SELECT p.class_id, c.name AS class_name, u.name AS teacher_name,
                COUNT(*)::int AS total_records,
                COUNT(*) FILTER (WHERE p.status = 'ABSENT')::int AS absent,
                COUNT(*) FILTER (WHERE p.status = 'NEEDS_SUPPORT')::int AS needs_support
         FROM class_participation p
         JOIN classes c ON c.id = p.class_id
         JOIN users u ON u.id = p.teacher_id
         GROUP BY p.class_id, c.name, u.name
         ORDER BY c.name`
      );

      const rows = perClass.rows.map((r) => {
        const absentRate =
          r.total_records > 0
            ? Math.round((r.absent / r.total_records) * 100)
            : 0;
        const concern = absentRate > 30 || r.needs_support >= 3;
        return { ...r, absent_rate_percent: absentRate, concern };
      });

      res.json({
        per_class: rows,
        concern_count: rows.filter((r) => r.concern).length,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
