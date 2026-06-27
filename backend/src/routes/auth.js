import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken } from '../utils/jwt.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const ROLES = ['TEACHER', 'STUDENT', 'HEADTEACHER', 'ADMIN'];

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    school_id: u.school_id,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: 'Name, email, password and role are required.' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (existing.rows.length) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email.toLowerCase(), passwordHash, role]
    );
    const user = result.rows[0];
    const token = signToken(publicUser(user));
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(publicUser(user));
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [
      req.user.id,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
