-- ClassBridge Ghana - database schema
-- Safe to re-run: drops and recreates everything.

DROP TABLE IF EXISTS question_replies CASCADE;
DROP TABLE IF EXISTS lesson_questions CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS lesson_materials CASCADE;
DROP TABLE IF EXISTS lesson_time_allocations CASCADE;
DROP TABLE IF EXISTS lesson_notes CASCADE;
DROP TABLE IF EXISTS class_students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('TEACHER', 'STUDENT', 'HEADTEACHER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  term TEXT NOT NULL,
  class_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE class_students (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

CREATE TABLE lesson_notes (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week TEXT,
  date DATE,
  subject TEXT,
  topic TEXT NOT NULL,
  sub_topic TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  learning_objectives TEXT,
  previous_knowledge TEXT,
  materials TEXT,
  introduction TEXT,
  teacher_activities TEXT,
  learner_activities TEXT,
  assessment TEXT,
  closure TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_CORRECTION')),
  review_comment TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  student_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_time_allocations (
  id SERIAL PRIMARY KEY,
  lesson_note_id INTEGER NOT NULL REFERENCES lesson_notes(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

-- Reserved for future richer materials; MVP publishes via lesson_notes.student_summary.
CREATE TABLE lesson_materials (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lesson_note_id INTEGER REFERENCES lesson_notes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  total_marks INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text TEXT,
  score INTEGER,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'MARKED')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE lesson_questions (
  id SERIAL PRIMARY KEY,
  lesson_note_id INTEGER NOT NULL REFERENCES lesson_notes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE question_replies (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_class_students_student ON class_students(student_id);
CREATE INDEX idx_lesson_notes_class ON lesson_notes(class_id);
CREATE INDEX idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_questions_lesson ON lesson_questions(lesson_note_id);
