import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

function generateClassCode(level, subject) {
  const lvl = (level || 'CLS').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
  const subj = (subject || 'GEN').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${lvl}-${subj}-${num}`;
}

// GET /api/classes
// Teacher: classes they own. Student: classes they joined.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    let result;
    if (role === 'STUDENT') {
      result = await query(
        `SELECT c.*, u.name AS teacher_name,
                (SELECT COUNT(*) FROM class_students cs2 WHERE cs2.class_id = c.id) AS student_count
         FROM classes c
         JOIN class_students cs ON cs.class_id = c.id
         JOIN users u ON u.id = c.teacher_id
         WHERE cs.student_id = $1
         ORDER BY c.created_at DESC`,
        [id]
      );
    } else if (role === 'TEACHER') {
      result = await query(
        `SELECT c.*, u.name AS teacher_name,
                (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS student_count
         FROM classes c
         JOIN users u ON u.id = c.teacher_id
         WHERE c.teacher_id = $1
         ORDER BY c.created_at DESC`,
        [id]
      );
    } else {
      // HEADTEACHER / ADMIN: all classes
      result = await query(
        `SELECT c.*, u.name AS teacher_name,
                (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS student_count
         FROM classes c
         JOIN users u ON u.id = c.teacher_id
         ORDER BY c.created_at DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/classes  (teacher only)
router.post('/', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { name, subject, level, term } = req.body;
    let { class_code } = req.body;
    if (!name || !subject || !level || !term) {
      return res
        .status(400)
        .json({ message: 'Name, subject, level and term are required.' });
    }
    if (!class_code) class_code = generateClassCode(level, subject);

    // Ensure code is unique (retry a few times)
    for (let i = 0; i < 5; i++) {
      const exists = await query('SELECT id FROM classes WHERE class_code = $1', [
        class_code,
      ]);
      if (!exists.rows.length) break;
      class_code = generateClassCode(level, subject);
    }

    const result = await query(
      `INSERT INTO classes (school_id, teacher_id, name, subject, level, term, class_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.school_id || null, req.user.id, name, subject, level, term, class_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/classes/:id
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.name AS teacher_name
       FROM classes c JOIN users u ON u.id = c.teacher_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    const klass = result.rows[0];
    if (!klass) return res.status(404).json({ message: 'Class not found.' });

    const students = await query(
      `SELECT u.id, u.name, u.email, cs.joined_at
       FROM class_students cs JOIN users u ON u.id = cs.student_id
       WHERE cs.class_id = $1 ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ ...klass, students: students.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/classes/join  (student only)
router.post('/join', authRequired, requireRole('STUDENT'), async (req, res, next) => {
  try {
    const { class_code } = req.body;
    if (!class_code) {
      return res.status(400).json({ message: 'Class code is required.' });
    }
    const klass = await query('SELECT * FROM classes WHERE class_code = $1', [
      class_code.trim(),
    ]);
    if (!klass.rows.length) {
      return res.status(404).json({ message: 'No class found with that code.' });
    }
    const classId = klass.rows[0].id;

    const already = await query(
      'SELECT id FROM class_students WHERE class_id = $1 AND student_id = $2',
      [classId, req.user.id]
    );
    if (already.rows.length) {
      return res.status(409).json({ message: 'You already joined this class.' });
    }

    await query(
      'INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)',
      [classId, req.user.id]
    );
    res.status(201).json({ message: 'Joined class successfully.', class: klass.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
