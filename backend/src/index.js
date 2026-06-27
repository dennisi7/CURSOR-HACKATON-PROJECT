import express from 'express';
import cors from 'cors';
import { config } from './config.js';

import authRoutes from './routes/auth.js';
import classRoutes from './routes/classes.js';
import lessonNoteRoutes from './routes/lessonNotes.js';
import assignmentRoutes from './routes/assignments.js';
import submissionRoutes from './routes/submissions.js';
import questionRoutes from './routes/questions.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ClassBridge Ghana API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/lesson-notes', lessonNoteRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', questionRoutes); // /api/lessons/:id/questions, /api/questions/:id/reply
app.use('/api/dashboard', dashboardRoutes);

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on the server.',
  });
});

app.listen(config.port, () => {
  console.log(`ClassBridge API running on http://localhost:${config.port}`);
});
