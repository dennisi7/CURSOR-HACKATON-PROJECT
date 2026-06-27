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

    // ============================================================
    // Phase 2 seed data: notices, syllabus, participation, 2nd class
    // ============================================================
    const headteacherId = headteacher.rows[0].id;
    const student2Id = student2.rows[0].id;

    // Make the approved Photosynthesis lesson count as "reviewed this week"
    await client.query(
      `UPDATE lesson_notes SET reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
      [headteacherId, lessonId]
    );

    // Second class: Basic 5 Mathematics (same teacher), only student2 enrolled
    const mathsClass = await client.query(
      `INSERT INTO classes (school_id, teacher_id, name, subject, level, term, class_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        schoolId,
        teacherId,
        'Basic 5 Mathematics',
        'Mathematics',
        'Basic 5',
        'Term 1',
        'B5-MATH-3027',
      ]
    );
    const mathsClassId = mathsClass.rows[0].id;
    await client.query(
      `INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)`,
      [mathsClassId, student2Id]
    );
    // Also enroll the second student in the science class for participation demo
    await client.query(
      `INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)
       ON CONFLICT (class_id, student_id) DO NOTHING`,
      [classId, student2Id]
    );

    // --- Notices ---
    const notices = [
      [schoolId, null, 'PTA Meeting this Saturday', 'All parents and staff should attend the PTA meeting on Saturday at 8:00am in the school hall.', 'ALL', headteacherId, true, null],
      [schoolId, null, 'Staff briefing on lesson note standards', 'Teachers, please submit all lesson notes for review by Friday. We will discuss the new GES lesson note format at Monday briefing.', 'TEACHERS', headteacherId, true, null],
      [schoolId, null, 'End of Term 1 examinations timetable', 'Students, the end of term examinations begin in Week 12. Check the notice board for the full timetable.', 'STUDENTS', headteacherId, false, null],
      [schoolId, classId, 'Bring your lab materials', 'JHS 2 Science class: please bring a green leaf and an empty bottle for our practical lesson next week.', 'CLASS', teacherId, false, null],
      [schoolId, classId, 'Science quiz next week', 'There will be a short quiz on Photosynthesis next Tuesday. Revise the word equation.', 'CLASS', teacherId, false, null],
      // Expired notice (should not appear in listings)
      [schoolId, null, 'Old sports day notice', 'Sports day has ended. This notice has expired.', 'ALL', headteacherId, false, '2026-01-10'],
    ];
    for (const n of notices) {
      await client.query(
        `INSERT INTO notices (school_id, class_id, title, body, audience, posted_by, is_pinned, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        n
      );
    }

    // --- Syllabus topics: JHS 2 Integrated Science, Term 1 (coverage ~40%) ---
    const scienceTopics = [
      [1, 'Living and Non-living Things', 'COMPLETED'],
      [2, 'Cells and Organisation', 'COMPLETED'],
      [3, 'Ecology', 'COMPLETED'],
      [4, 'Photosynthesis', 'COMPLETED'],
      [5, 'Respiration', 'IN_PROGRESS'],
      [6, 'Reproduction in Plants', 'NOT_STARTED'],
      [7, 'Human Reproduction', 'BEHIND'],
      [8, 'Food and Nutrition', 'NOT_STARTED'],
      [9, 'The Water Cycle', 'NOT_STARTED'],
      [10, 'Our Environment', 'NOT_STARTED'],
    ];
    for (const [week, topic, status] of scienceTopics) {
      await client.query(
        `INSERT INTO syllabus_topics (class_id, teacher_id, subject, term, week_number, topic, status)
         VALUES ($1, $2, 'Integrated Science', 'Term 1', $3, $4, $5)`,
        [classId, teacherId, week, topic, status]
      );
    }

    // Maths topics (coverage ~67%)
    const mathsTopics = [
      [1, 'Numbers and Numerals', 'COMPLETED'],
      [2, 'Addition and Subtraction', 'COMPLETED'],
      [3, 'Fractions', 'COMPLETED'],
      [4, 'Decimals', 'IN_PROGRESS'],
      [5, 'Shapes and Space', 'NOT_STARTED'],
      [6, 'Measurement', 'NOT_STARTED'],
    ];
    for (const [week, topic, status] of mathsTopics) {
      await client.query(
        `INSERT INTO syllabus_topics (class_id, teacher_id, subject, term, week_number, topic, status)
         VALUES ($1, $2, 'Mathematics', 'Term 1', $3, $4, $5)`,
        [mathsClassId, teacherId, week, topic, status]
      );
    }

    // --- Participation records ---
    // Photosynthesis lesson session (today)
    await client.query(
      `INSERT INTO class_participation
        (class_id, lesson_note_id, student_id, teacher_id, participation_date, status, comment)
       VALUES
        ($1, $2, $3, $4, CURRENT_DATE, 'PRESENT_ACTIVE', 'Answered questions confidently.'),
        ($1, $2, $5, $4, CURRENT_DATE, 'PRESENT_QUIET', NULL)`,
      [classId, lessonId, studentId, teacherId, student2Id]
    );
    // An earlier session showing a student needing support
    await client.query(
      `INSERT INTO class_participation
        (class_id, lesson_note_id, student_id, teacher_id, participation_date, status, comment)
       VALUES ($1, NULL, $2, $3, CURRENT_DATE - INTERVAL '3 days', 'NEEDS_SUPPORT', 'Struggled with the word equation; needs extra help.')`,
      [classId, student2Id, teacherId]
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
