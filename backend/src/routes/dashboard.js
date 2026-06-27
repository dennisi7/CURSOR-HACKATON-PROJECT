import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard - role-aware summary stats
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;

    if (role === 'TEACHER') {
      const [classes, pending, assignments, submissions] = await Promise.all([
        query('SELECT COUNT(*) FROM classes WHERE teacher_id = $1', [id]),
        query(
          "SELECT COUNT(*) FROM lesson_notes WHERE teacher_id = $1 AND status IN ('DRAFT','SUBMITTED','NEEDS_CORRECTION')",
          [id]
        ),
        query('SELECT COUNT(*) FROM assignments WHERE teacher_id = $1', [id]),
        query(
          `SELECT s.id, s.submitted_at, s.status, u.name AS student_name, a.title AS assignment_title
           FROM submissions s
           JOIN assignments a ON a.id = s.assignment_id
           JOIN users u ON u.id = s.student_id
           WHERE a.teacher_id = $1
           ORDER BY s.submitted_at DESC LIMIT 5`,
          [id]
        ),
      ]);
      return res.json({
        role,
        total_classes: Number(classes.rows[0].count),
        pending_lesson_notes: Number(pending.rows[0].count),
        total_assignments: Number(assignments.rows[0].count),
        recent_submissions: submissions.rows,
      });
    }

    if (role === 'STUDENT') {
      const [classes, assignments, lessons, marked] = await Promise.all([
        query(
          'SELECT COUNT(*) FROM class_students WHERE student_id = $1',
          [id]
        ),
        query(
          `SELECT COUNT(*) FROM assignments a
           JOIN class_students cs ON cs.class_id = a.class_id
           WHERE cs.student_id = $1 AND a.status = 'PUBLISHED'`,
          [id]
        ),
        query(
          `SELECT COUNT(*) FROM lesson_notes l
           JOIN class_students cs ON cs.class_id = l.class_id
           WHERE cs.student_id = $1 AND l.published = TRUE`,
          [id]
        ),
        query(
          "SELECT COUNT(*) FROM submissions WHERE student_id = $1 AND status = 'MARKED'",
          [id]
        ),
      ]);
      return res.json({
        role,
        total_classes: Number(classes.rows[0].count),
        available_assignments: Number(assignments.rows[0].count),
        published_lessons: Number(lessons.rows[0].count),
        marked_submissions: Number(marked.rows[0].count),
      });
    }

    // HEADTEACHER / ADMIN
    const [submitted, approved, teachers, classes] = await Promise.all([
      query("SELECT COUNT(*) FROM lesson_notes WHERE status = 'SUBMITTED'"),
      query("SELECT COUNT(*) FROM lesson_notes WHERE status = 'APPROVED'"),
      query("SELECT COUNT(*) FROM users WHERE role = 'TEACHER'"),
      query('SELECT COUNT(*) FROM classes'),
    ]);
    return res.json({
      role,
      pending_reviews: Number(submitted.rows[0].count),
      approved_lessons: Number(approved.rows[0].count),
      total_teachers: Number(teachers.rows[0].count),
      total_classes: Number(classes.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
