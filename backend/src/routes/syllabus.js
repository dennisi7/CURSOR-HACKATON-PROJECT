import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BEHIND'];

async function teacherOwnsClass(teacherId, classId) {
  const r = await query(
    'SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2',
    [classId, teacherId]
  );
  return r.rows.length > 0;
}

async function teacherOwnsTopic(teacherId, topicId) {
  const r = await query(
    'SELECT * FROM syllabus_topics WHERE id = $1 AND teacher_id = $2',
    [topicId, teacherId]
  );
  return r.rows[0] || null;
}

// GET /api/syllabus - teacher: own topics; headteacher: all. Optional filters.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { class_id, term } = req.query;
    const params = [];
    const conditions = [];

    let sql = `SELECT s.*, c.name AS class_name, u.name AS teacher_name
               FROM syllabus_topics s
               JOIN classes c ON c.id = s.class_id
               JOIN users u ON u.id = s.teacher_id`;

    if (role === 'TEACHER') {
      params.push(id);
      conditions.push(`s.teacher_id = $${params.length}`);
    } else if (role === 'STUDENT') {
      params.push(id);
      conditions.push(
        `s.class_id IN (SELECT class_id FROM class_students WHERE student_id = $${params.length})`
      );
    }
    if (class_id) {
      params.push(class_id);
      conditions.push(`s.class_id = $${params.length}`);
    }
    if (term) {
      params.push(term);
      conditions.push(`s.term = $${params.length}`);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY s.class_id, s.week_number, s.id';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/syllabus (teacher)
router.post('/', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { class_id, subject, term, week_number, topic, status } = req.body;
    if (!class_id || !subject || !term || !topic) {
      return res
        .status(400)
        .json({ message: 'Class, subject, term and topic are required.' });
    }
    if (!(await teacherOwnsClass(req.user.id, class_id))) {
      return res.status(403).json({ message: 'You do not own this class.' });
    }
    const safeStatus = STATUSES.includes(status) ? status : 'NOT_STARTED';

    const result = await query(
      `INSERT INTO syllabus_topics
        (class_id, teacher_id, subject, term, week_number, topic, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        class_id,
        req.user.id,
        subject,
        term,
        Number(week_number) || 1,
        topic,
        safeStatus,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/syllabus/:id (teacher, own topic)
router.put('/:id', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const topic = await teacherOwnsTopic(req.user.id, req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found.' });

    const { subject, term, week_number, topic: topicText, status } = req.body;
    const safeStatus =
      status && STATUSES.includes(status) ? status : topic.status;

    const result = await query(
      `UPDATE syllabus_topics
       SET subject = $1, term = $2, week_number = $3, topic = $4, status = $5,
           updated_at = now()
       WHERE id = $6 RETURNING *`,
      [
        subject ?? topic.subject,
        term ?? topic.term,
        week_number !== undefined ? Number(week_number) || 1 : topic.week_number,
        topicText ?? topic.topic,
        safeStatus,
        req.params.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/syllabus/:id (teacher, own topic)
router.delete('/:id', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const topic = await teacherOwnsTopic(req.user.id, req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found.' });
    await query('DELETE FROM syllabus_topics WHERE id = $1', [req.params.id]);
    res.json({ message: 'Topic deleted.' });
  } catch (err) {
    next(err);
  }
});

// Build coverage rows grouped by class (+ subject + term).
function coverageSql(whereClause) {
  return `
    SELECT s.class_id, c.name AS class_name, s.teacher_id, u.name AS teacher_name,
           s.subject, s.term,
           COUNT(*)::int AS total_topics,
           COUNT(*) FILTER (WHERE s.status = 'COMPLETED')::int AS completed_topics,
           COUNT(*) FILTER (WHERE s.status = 'BEHIND')::int AS behind_topics,
           COUNT(*) FILTER (WHERE s.status = 'IN_PROGRESS')::int AS in_progress_topics
    FROM syllabus_topics s
    JOIN classes c ON c.id = s.class_id
    JOIN users u ON u.id = s.teacher_id
    ${whereClause}
    GROUP BY s.class_id, c.name, s.teacher_id, u.name, s.subject, s.term
    ORDER BY c.name, s.subject, s.term`;
}

function withCoveragePercent(rows) {
  return rows.map((r) => ({
    ...r,
    coverage_percent:
      r.total_topics > 0
        ? Math.round((r.completed_topics / r.total_topics) * 100)
        : 0,
  }));
}

// GET /api/syllabus/coverage/teacher
router.get(
  '/coverage/teacher',
  authRequired,
  requireRole('TEACHER'),
  async (req, res, next) => {
    try {
      const result = await query(coverageSql('WHERE s.teacher_id = $1'), [
        req.user.id,
      ]);
      res.json(withCoveragePercent(result.rows));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/syllabus/coverage/headteacher
router.get(
  '/coverage/headteacher',
  authRequired,
  requireRole('HEADTEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const result = await query(coverageSql(''), []);
      res.json(withCoveragePercent(result.rows));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
