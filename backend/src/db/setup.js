/**
 * Creates the schema and seeds demo data for the hackathon.
 * Run with: npm run db:setup
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const client = await pool.connect();
  try {
    console.log('Applying schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    console.log('Seeding demo data...');
    const passwordHash = await bcrypt.hash(config.seedPassword, 10);

    // School
    const school = await client.query(
      `INSERT INTO schools (name) VALUES ($1) RETURNING id`,
      ['Accra Community JHS']
    );
    const schoolId = school.rows[0].id;

    // Users
    const [teacher, student, headteacher] = await Promise.all([
      client.query(
        `INSERT INTO users (school_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'TEACHER') RETURNING id`,
        [schoolId, 'Kofi Mensah', 'teacher@classbridge.test', passwordHash]
      ),
      client.query(
        `INSERT INTO users (school_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'STUDENT') RETURNING id`,
        [schoolId, 'Ama Owusu', 'student@classbridge.test', passwordHash]
      ),
      client.query(
        `INSERT INTO users (school_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'HEADTEACHER') RETURNING id`,
        [schoolId, 'Mrs. Adwoa Boateng', 'headteacher@classbridge.test', passwordHash]
      ),
    ]);
    const teacherId = teacher.rows[0].id;
    const studentId = student.rows[0].id;

    // A second student so question/submission demos have variety
    const student2 = await client.query(
      `INSERT INTO users (school_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'STUDENT') RETURNING id`,
      [schoolId, 'Yaw Darko', 'student2@classbridge.test', passwordHash]
    );

    // Class
    const klass = await client.query(
      `INSERT INTO classes (school_id, teacher_id, name, subject, level, term, class_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        schoolId,
        teacherId,
        'JHS 2 Integrated Science',
        'Integrated Science',
        'JHS 2',
        'Term 1',
        'JHS2-SCI-4821',
      ]
    );
    const classId = klass.rows[0].id;

    // Enroll the demo student
    await client.query(
      `INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)`,
      [classId, studentId]
    );

    // Sample lesson note: Photosynthesis (approved + published for a rich demo)
    const lesson = await client.query(
      `INSERT INTO lesson_notes
        (class_id, teacher_id, week, date, subject, topic, sub_topic,
         duration_minutes, learning_objectives, previous_knowledge, materials,
         introduction, teacher_activities, learner_activities, assessment,
         closure, remarks, status, published, student_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        classId,
        teacherId,
        'Week 4',
        '2026-02-10',
        'Integrated Science',
        'Photosynthesis',
        'Process and importance of photosynthesis',
        60,
        'By the end of the lesson, learners will be able to:\n1. Define photosynthesis.\n2. State the raw materials needed.\n3. Explain why photosynthesis is important.',
        'Learners know that plants are living things and need water and sunlight.',
        'Green plant, chart of a leaf, watering can, manila card, markers.',
        'Show learners a healthy green plant and a yellow plant kept in the dark. Ask them why one is healthy.',
        'Explain photosynthesis using the leaf chart. Write the word equation on the board. Guide group discussion.',
        'Observe the two plants. Discuss in groups. Copy the word equation. Answer oral questions.',
        'Oral questions and a short class exercise: list the raw materials of photosynthesis.',
        'Summarise key points and link to food production. Give homework.',
        'Lesson went well; learners participated actively.',
        'APPROVED',
        true,
        'Photosynthesis is how green plants make their own food using sunlight, water, and carbon dioxide. It produces glucose (food) and oxygen. Remember the word equation: Carbon dioxide + Water --(sunlight + chlorophyll)--> Glucose + Oxygen.',
      ]
    );
    const lessonId = lesson.rows[0].id;

    // Time allocations for the lesson (balanced: 60 minutes)
    const allocations = [
      ['Introduction', 5, 0],
      ['Main Activity', 35, 1],
      ['Assessment', 15, 2],
      ['Closure', 5, 3],
    ];
    for (const [stage, minutes, position] of allocations) {
      await client.query(
        `INSERT INTO lesson_time_allocations (lesson_note_id, stage, minutes, position)
         VALUES ($1, $2, $3, $4)`,
        [lessonId, stage, minutes, position]
      );
    }

    // A submitted (pending review) lesson note so the headteacher demo has work to do
    await client.query(
      `INSERT INTO lesson_notes
        (class_id, teacher_id, week, date, subject, topic, sub_topic,
         duration_minutes, learning_objectives, introduction, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'SUBMITTED')`,
      [
        classId,
        teacherId,
        'Week 5',
        '2026-02-17',
        'Integrated Science',
        'The Cell',
        'Plant and animal cells',
        60,
        'Identify the parts of plant and animal cells.',
        'Show learners a diagram of a cell and ask what they notice.',
      ]
    );

    // Sample published assignment
    const assignment = await client.query(
      `INSERT INTO assignments
        (class_id, teacher_id, title, description, due_date, total_marks, status)
       VALUES ($1,$2,$3,$4,$5,$6,'PUBLISHED') RETURNING id`,
      [
        classId,
        teacherId,
        'Photosynthesis Exercise',
        'In your own words, explain the process of photosynthesis and list its raw materials. Write at least five sentences.',
        '2026-02-20',
        20,
      ]
    );

    // Sample question on the lesson
    const question = await client.query(
      `INSERT INTO lesson_questions (lesson_note_id, student_id, question)
       VALUES ($1, $2, $3) RETURNING id`,
      [lessonId, studentId, 'Please sir, does photosynthesis happen at night too?']
    );
    await client.query(
      `INSERT INTO question_replies (question_id, user_id, reply)
       VALUES ($1, $2, $3)`,
      [
        question.rows[0].id,
        teacherId,
        'Good question Ama. No, photosynthesis needs sunlight, so it mainly happens during the day.',
      ]
    );

    console.log('\nDone. Demo accounts (password: ' + config.seedPassword + '):');
    console.log('  TEACHER     -> teacher@classbridge.test');
    console.log('  STUDENT     -> student@classbridge.test');
    console.log('  HEADTEACHER -> headteacher@classbridge.test');
    console.log('  Class code  -> JHS2-SCI-4821');
  } catch (err) {
    console.error('Setup failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
