import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/submissions/:id/mark  (teacher)
router.post('/:id/mark', authRequired, requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { score, feedback } = req.body;

    // Ensure the submission belongs to an assignment owned by this teacher
    const owns = await query(
      `SELECT s.id, a.total_marks FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.id = $1 AND a.teacher_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!owns.rows.length) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const totalMarks = owns.rows[0].total_marks;
    const numericScore = score === '' || score === undefined ? null : Number(score);
    if (numericScore !== null) {
      if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > totalMarks) {
        return res
          .status(400)
          .json({ message: `Score must be between 0 and ${totalMarks}.` });
      }
    }

    const result = await query(
      `UPDATE submissions
       SET score = $1, feedback = $2, status = 'MARKED', marked_at = now()
       WHERE id = $3 RETURNING *`,
      [numericScore, feedback || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
