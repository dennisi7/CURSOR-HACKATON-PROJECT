import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const AUDIENCES = ['ALL', 'TEACHERS', 'STUDENTS', 'CLASS'];

async function teacherOwnsClass(teacherId, classId) {
  const r = await query(
    'SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2',
    [classId, teacherId]
  );
  return r.rows.length > 0;
}

async function studentInClass(studentId, classId) {
  const r = await query(
    'SELECT 1 FROM class_students WHERE student_id = $1 AND class_id = $2',
    [studentId, classId]
  );
  return r.rows.length > 0;
}

// GET /api/notices - role-filtered, pinned first, expired hidden
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const notExpired = `(n.expires_at IS NULL OR n.expires_at >= CURRENT_DATE)`;
    let result;

    if (role === 'TEACHER') {
      result = await query(
        `SELECT n.*, u.name AS posted_by_name, c.name AS class_name
         FROM notices n
         JOIN users u ON u.id = n.posted_by
         LEFT JOIN classes c ON c.id = n.class_id
         WHERE ${notExpired}
           AND (
             n.audience IN ('ALL', 'TEACHERS')
             OR (n.audience = 'CLASS' AND n.class_id IN (
               SELECT id FROM classes WHERE teacher_id = $1
             ))
           )
         ORDER BY n.is_pinned DESC, n.created_at DESC`,
        [id]
      );
    } else if (role === 'STUDENT') {
      result = await query(
        `SELECT n.*, u.name AS posted_by_name, c.name AS class_name
         FROM notices n
         JOIN users u ON u.id = n.posted_by
         LEFT JOIN classes c ON c.id = n.class_id
         WHERE ${notExpired}
           AND (
             n.audience IN ('ALL', 'STUDENTS')
             OR (n.audience = 'CLASS' AND n.class_id IN (
               SELECT class_id FROM class_students WHERE student_id = $1
             ))
           )
         ORDER BY n.is_pinned DESC, n.created_at DESC`,
        [id]
      );
    } else {
      // HEADTEACHER / ADMIN: everything (single-school demo)
      result = await query(
        `SELECT n.*, u.name AS posted_by_name, c.name AS class_name
         FROM notices n
         JOIN users u ON u.id = n.posted_by
         LEFT JOIN classes c ON c.id = n.class_id
         ORDER BY n.is_pinned DESC, n.created_at DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/notices/:id
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT n.*, u.name AS posted_by_name, c.name AS class_name
       FROM notices n
       JOIN users u ON u.id = n.posted_by
       LEFT JOIN classes c ON c.id = n.class_id
       WHERE n.id = $1`,
      [req.params.id]
    );
    const notice = result.rows[0];
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    res.json(notice);
  } catch (err) {
    next(err);
  }
});

// POST /api/notices
// Headteacher/Admin: any audience. Teacher: CLASS only, for their own classes.
router.post('/', authRequired, async (req, res, next) => {
  try {
    const { role, id: userId, school_id } = req.user;
    if (!['TEACHER', 'HEADTEACHER', 'ADMIN'].includes(role)) {
      return res.status(403).json({ message: 'You cannot post notices.' });
    }

    const { title, body, audience, class_id, is_pinned, expires_at } = req.body;
    if (!title || !body || !audience) {
      return res
        .status(400)
        .json({ message: 'Title, body and audience are required.' });
    }
    if (!AUDIENCES.includes(audience)) {
      return res.status(400).json({ message: 'Invalid audience.' });
    }

    if (role === 'TEACHER') {
      if (audience !== 'CLASS') {
        return res
          .status(403)
          .json({ message: 'Teachers can only post class notices.' });
      }
      if (!class_id || !(await teacherOwnsClass(userId, class_id))) {
        return res
          .status(403)
          .json({ message: 'You can only post to your own classes.' });
      }
    }

    if (audience === 'CLASS' && !class_id) {
      return res
        .status(400)
        .json({ message: 'A class is required for class notices.' });
    }

    const result = await query(
      `INSERT INTO notices
        (school_id, class_id, title, body, audience, posted_by, is_pinned, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        school_id || null,
        audience === 'CLASS' ? class_id : null,
        title,
        body,
        audience,
        userId,
        Boolean(is_pinned),
        expires_at || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notices/:id - author or headteacher/admin
router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM notices WHERE id = $1', [
      req.params.id,
    ]);
    const notice = existing.rows[0];
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });

    const isOwner = notice.posted_by === req.user.id;
    const isHead = ['HEADTEACHER', 'ADMIN'].includes(req.user.role);
    if (!isOwner && !isHead) {
      return res.status(403).json({ message: 'You cannot edit this notice.' });
    }

    const { title, body, audience, class_id, is_pinned, expires_at } = req.body;
    const nextAudience = audience || notice.audience;
    if (!AUDIENCES.includes(nextAudience)) {
      return res.status(400).json({ message: 'Invalid audience.' });
    }
    // Teachers editing their own notice stay class-scoped.
    if (req.user.role === 'TEACHER' && nextAudience !== 'CLASS') {
      return res
        .status(403)
        .json({ message: 'Teachers can only manage class notices.' });
    }

    const result = await query(
      `UPDATE notices
       SET title = $1, body = $2, audience = $3, class_id = $4,
           is_pinned = $5, expires_at = $6, updated_at = now()
       WHERE id = $7 RETURNING *`,
      [
        title ?? notice.title,
        body ?? notice.body,
        nextAudience,
        nextAudience === 'CLASS'
          ? class_id ?? notice.class_id
          : null,
        is_pinned !== undefined ? Boolean(is_pinned) : notice.is_pinned,
        expires_at !== undefined ? expires_at || null : notice.expires_at,
        req.params.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notices/:id - author or headteacher/admin
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM notices WHERE id = $1', [
      req.params.id,
    ]);
    const notice = existing.rows[0];
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });

    const isOwner = notice.posted_by === req.user.id;
    const isHead = ['HEADTEACHER', 'ADMIN'].includes(req.user.role);
    if (!isOwner && !isHead) {
      return res.status(403).json({ message: 'You cannot delete this notice.' });
    }

    await query('DELETE FROM notices WHERE id = $1', [req.params.id]);
    res.json({ message: 'Notice deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
