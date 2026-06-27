import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { getWeekBounds } from '../utils/week.js';

const router = Router();

// GET /api/reports/headteacher/weekly-brief
router.get(
  '/headteacher/weekly-brief',
  authRequired,
  requireRole('HEADTEACHER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { startISO, endISO, start } = getWeekBounds();
      // Inclusive lower bound for timestamp comparisons.
      const weekStartTs = start.toISOString();

      const [
        submitted,
        approved,
        needsCorrection,
        assignmentsPosted,
        studentSubmissions,
        pendingReviews,
        activeTeachers,
        expectedRow,
      ] = await Promise.all([
        // Lesson notes that left DRAFT this week
        query(
          `SELECT COUNT(*)::int AS c FROM lesson_notes
           WHERE status <> 'DRAFT' AND updated_at >= $1`,
          [weekStartTs]
        ),
        query(
          `SELECT COUNT(*)::int AS c FROM lesson_notes
           WHERE status = 'APPROVED' AND reviewed_at >= $1`,
          [weekStartTs]
        ),
        query(
          `SELECT COUNT(*)::int AS c FROM lesson_notes
           WHERE status = 'NEEDS_CORRECTION' AND reviewed_at >= $1`,
          [weekStartTs]
        ),
        query(
          `SELECT COUNT(*)::int AS c FROM assignments
           WHERE status = 'PUBLISHED' AND created_at >= $1`,
          [weekStartTs]
        ),
        query(
          `SELECT COUNT(*)::int AS c FROM submissions
           WHERE submitted_at >= $1`,
          [weekStartTs]
        ),
        query(
          `SELECT COUNT(*)::int AS c FROM lesson_notes WHERE status = 'SUBMITTED'`
        ),
        query(
          `SELECT COUNT(DISTINCT t)::int AS c FROM (
             SELECT teacher_id AS t FROM lesson_notes WHERE updated_at >= $1
             UNION
             SELECT teacher_id AS t FROM assignments WHERE created_at >= $1
           ) sub`,
          [weekStartTs]
        ),
        // Expected submissions = sum of enrolled students for assignments posted this week
        query(
          `SELECT COALESCE(SUM(sc.cnt), 0)::int AS expected
           FROM assignments a
           JOIN (
             SELECT class_id, COUNT(*)::int AS cnt
             FROM class_students GROUP BY class_id
           ) sc ON sc.class_id = a.class_id
           WHERE a.status = 'PUBLISHED' AND a.created_at >= $1`,
          [weekStartTs]
        ),
      ]);

      const expected = expectedRow.rows[0].expected;
      const submissionsThisWeek = studentSubmissions.rows[0].c;
      const submissionRate =
        expected > 0
          ? Math.round((submissionsThisWeek / expected) * 100)
          : 0;

      // Classes needing attention
      const classRows = await query(
        `SELECT c.id AS class_id, c.name AS class_name, u.name AS teacher_name,
                (SELECT COUNT(*) FROM lesson_notes l
                   WHERE l.class_id = c.id AND l.status <> 'DRAFT'
                     AND l.updated_at >= $1)::int AS notes_this_week,
                (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id)::int AS student_count,
                (SELECT COUNT(*) FROM assignments a
                   WHERE a.class_id = c.id AND a.status = 'PUBLISHED'
                     AND a.created_at >= $1)::int AS assignments_this_week,
                (SELECT COUNT(*) FROM submissions s
                   JOIN assignments a ON a.id = s.assignment_id
                   WHERE a.class_id = c.id AND a.status = 'PUBLISHED'
                     AND a.created_at >= $1 AND s.submitted_at >= $1)::int AS submissions_this_week
         FROM classes c
         JOIN users u ON u.id = c.teacher_id
         ORDER BY c.name`,
        [weekStartTs]
      );

      // Coverage per class (completed / total)
      const coverage = await query(
        `SELECT class_id,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
         FROM syllabus_topics GROUP BY class_id`
      );
      const coverageMap = {};
      for (const row of coverage.rows) {
        coverageMap[row.class_id] =
          row.total > 0 ? Math.round((row.completed / row.total) * 100) : null;
      }

      const attention = [];
      for (const c of classRows.rows) {
        const reasons = [];
        if (c.notes_this_week === 0) {
          reasons.push('No lesson note submitted this week');
        }
        const expectedForClass = c.assignments_this_week * c.student_count;
        const rate =
          expectedForClass > 0
            ? Math.round((c.submissions_this_week / expectedForClass) * 100)
            : null;
        if (rate !== null && rate < 50) {
          reasons.push(`Submission rate ${rate}%`);
        }
        const cov = coverageMap[c.class_id];
        if (cov !== null && cov !== undefined && cov < 50) {
          reasons.push(`Syllabus coverage ${cov}%`);
        }
        if (reasons.length) {
          attention.push({
            class_id: c.class_id,
            class_name: c.class_name,
            teacher_name: c.teacher_name,
            reasons,
            submission_rate_percent: rate,
            syllabus_coverage_percent: cov ?? null,
          });
        }
      }

      const lowActivityClasses = classRows.rows.filter(
        (c) => c.notes_this_week === 0
      ).length;

      res.json({
        week_start: startISO,
        week_end: endISO,
        summary: {
          lesson_notes_submitted: submitted.rows[0].c,
          lesson_notes_approved: approved.rows[0].c,
          lesson_notes_needs_correction: needsCorrection.rows[0].c,
          assignments_posted: assignmentsPosted.rows[0].c,
          student_submissions: submissionsThisWeek,
          submission_rate_percent: submissionRate,
          active_teachers: activeTeachers.rows[0].c,
          low_activity_classes_count: lowActivityClasses,
          pending_reviews: pendingReviews.rows[0].c,
        },
        classes_needing_attention: attention,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
