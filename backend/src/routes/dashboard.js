import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { getWeekBounds } from '../utils/week.js';

const router = Router();

// GET /api/dashboard - role-aware summary stats
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { id, role } = req.user;

    if (role === 'TEACHER') {
      const [
        classes,
        pending,
        assignments,
        submissions,
        notices,
        coverage,
        participationGap,
      ] = await Promise.all([
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
        // Recent notices visible to this teacher
        query(
          `SELECT n.id, n.title, n.audience, n.is_pinned, n.created_at
           FROM notices n
           WHERE (n.expires_at IS NULL OR n.expires_at >= CURRENT_DATE)
             AND (
               n.audience IN ('ALL','TEACHERS')
               OR (n.audience = 'CLASS' AND n.class_id IN (
                 SELECT id FROM classes WHERE teacher_id = $1
               ))
             )
           ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 3`,
          [id]
        ),
        // Lowest coverage class for this teacher
        query(
          `SELECT c.name AS class_name,
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE st.status = 'COMPLETED')::int AS completed
           FROM syllabus_topics st
           JOIN classes c ON c.id = st.class_id
           WHERE st.teacher_id = $1
           GROUP BY c.id, c.name
           ORDER BY (COUNT(*) FILTER (WHERE st.status = 'COMPLETED'))::float
                    / NULLIF(COUNT(*),0) ASC
           LIMIT 1`,
          [id]
        ),
        // Classes with no participation logged in the last 7 days
        query(
          `SELECT c.name AS class_name FROM classes c
           WHERE c.teacher_id = $1
             AND NOT EXISTS (
               SELECT 1 FROM class_participation p
               WHERE p.class_id = c.id
                 AND p.participation_date >= CURRENT_DATE - INTERVAL '7 days'
             )
           ORDER BY c.name LIMIT 3`,
          [id]
        ),
      ]);

      let coverageSummary = null;
      if (coverage.rows[0]) {
        const r = coverage.rows[0];
        coverageSummary = {
          class_name: r.class_name,
          coverage_percent:
            r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0,
        };
      }

      return res.json({
        role,
        total_classes: Number(classes.rows[0].count),
        pending_lesson_notes: Number(pending.rows[0].count),
        total_assignments: Number(assignments.rows[0].count),
        recent_submissions: submissions.rows,
        recent_notices: notices.rows,
        coverage_summary: coverageSummary,
        participation_reminders: participationGap.rows.map((r) => r.class_name),
      });
    }

    if (role === 'STUDENT') {
      const [classes, assignments, lessons, marked, notices, pendingList, feedback, latestLesson] =
        await Promise.all([
          query('SELECT COUNT(*) FROM class_students WHERE student_id = $1', [id]),
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
          query(
            `SELECT n.id, n.title, n.audience, n.is_pinned, n.created_at
             FROM notices n
             WHERE (n.expires_at IS NULL OR n.expires_at >= CURRENT_DATE)
               AND (
                 n.audience IN ('ALL','STUDENTS')
                 OR (n.audience = 'CLASS' AND n.class_id IN (
                   SELECT class_id FROM class_students WHERE student_id = $1
                 ))
               )
             ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 3`,
            [id]
          ),
          // Pending assignments (published, not yet submitted)
          query(
            `SELECT a.id, a.title, a.due_date, c.name AS class_name
             FROM assignments a
             JOIN class_students cs ON cs.class_id = a.class_id
             JOIN classes c ON c.id = a.class_id
             LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
             WHERE cs.student_id = $1 AND a.status = 'PUBLISHED' AND s.id IS NULL
             ORDER BY a.due_date NULLS LAST LIMIT 5`,
            [id]
          ),
          // Recent feedback (marked work)
          query(
            `SELECT s.id, s.score, s.feedback, a.title AS assignment_title, a.total_marks
             FROM submissions s
             JOIN assignments a ON a.id = s.assignment_id
             WHERE s.student_id = $1 AND s.status = 'MARKED'
             ORDER BY s.marked_at DESC NULLS LAST LIMIT 3`,
            [id]
          ),
          query(
            `SELECT l.id, l.topic, c.name AS class_name
             FROM lesson_notes l
             JOIN class_students cs ON cs.class_id = l.class_id
             JOIN classes c ON c.id = l.class_id
             WHERE cs.student_id = $1 AND l.published = TRUE
             ORDER BY l.updated_at DESC LIMIT 1`,
            [id]
          ),
        ]);
      return res.json({
        role,
        total_classes: Number(classes.rows[0].count),
        available_assignments: Number(assignments.rows[0].count),
        published_lessons: Number(lessons.rows[0].count),
        marked_submissions: Number(marked.rows[0].count),
        recent_notices: notices.rows,
        pending_assignments: pendingList.rows,
        recent_feedback: feedback.rows,
        latest_lesson: latestLesson.rows[0] || null,
      });
    }

    // HEADTEACHER / ADMIN
    const { start } = getWeekBounds();
    const weekStartTs = start.toISOString();
    const [
      submitted,
      approved,
      teachers,
      classes,
      submittedThisWeek,
      submissionsThisWeek,
      lowCoverage,
      participationConcerns,
      notices,
    ] = await Promise.all([
      query("SELECT COUNT(*) FROM lesson_notes WHERE status = 'SUBMITTED'"),
      query("SELECT COUNT(*) FROM lesson_notes WHERE status = 'APPROVED'"),
      query("SELECT COUNT(*) FROM users WHERE role = 'TEACHER'"),
      query('SELECT COUNT(*) FROM classes'),
      query(
        `SELECT COUNT(*)::int AS c FROM lesson_notes
         WHERE status <> 'DRAFT' AND updated_at >= $1`,
        [weekStartTs]
      ),
      query(
        `SELECT COUNT(*)::int AS c FROM submissions WHERE submitted_at >= $1`,
        [weekStartTs]
      ),
      // Low coverage classes (< 50%)
      query(
        `SELECT COUNT(*)::int AS c FROM (
           SELECT class_id,
                  COUNT(*) FILTER (WHERE status='COMPLETED')::float / NULLIF(COUNT(*),0) AS ratio
           FROM syllabus_topics GROUP BY class_id
         ) t WHERE ratio < 0.5`
      ),
      // Participation concern classes
      query(
        `SELECT COUNT(*)::int AS c FROM (
           SELECT class_id,
                  COUNT(*) FILTER (WHERE status='ABSENT')::float / NULLIF(COUNT(*),0) AS absent_ratio,
                  COUNT(*) FILTER (WHERE status='NEEDS_SUPPORT')::int AS needs_support
           FROM class_participation GROUP BY class_id
         ) t WHERE absent_ratio > 0.3 OR needs_support >= 3`
      ),
      query(
        `SELECT n.id, n.title, n.audience, n.is_pinned, n.created_at
         FROM notices n
         WHERE (n.expires_at IS NULL OR n.expires_at >= CURRENT_DATE)
         ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 3`
      ),
    ]);
    return res.json({
      role,
      pending_reviews: Number(submitted.rows[0].count),
      approved_lessons: Number(approved.rows[0].count),
      total_teachers: Number(teachers.rows[0].count),
      total_classes: Number(classes.rows[0].count),
      weekly_brief_preview: {
        lesson_notes_submitted: submittedThisWeek.rows[0].c,
        student_submissions: submissionsThisWeek.rows[0].c,
        pending_reviews: Number(submitted.rows[0].count),
      },
      low_coverage_classes: lowCoverage.rows[0].c,
      participation_concerns: participationConcerns.rows[0].c,
      recent_notices: notices.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
