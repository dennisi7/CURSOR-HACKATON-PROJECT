# ClassBridge Ghana

A mobile-first, web-based school workflow platform for Ghanaian public schools.
It bridges **teachers**, **students**, and **headteachers** with practical
school operations: classes, structured lesson notes, a lesson time-allocation
checker, headteacher review/approval, assignments, marking, feedback, and a
student question box.

> No AI / ML. No chatbot. No video classes. No payments. No parent accounts.
> Just clean, role-based school workflows.

---

## Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Frontend  | React, Vite, Tailwind CSS, React Router, Axios |
| Backend   | Node.js, Express.js, JWT, bcrypt (bcryptjs) |
| Database  | PostgreSQL                                  |
| Offline   | Browser `localStorage` (lesson note drafts) |

---

## Project Structure

```
hackaton/
├── package.json            # root runner (concurrently, setup scripts)
├── docker-compose.yml      # Postgres 16 for local dev
├── backend/
│   ├── src/
│   │   ├── index.js            # Express app + route mounting
│   │   ├── config.js           # env config
│   │   ├── db.js               # pg pool
│   │   ├── middleware/auth.js  # JWT auth + requireRole
│   │   ├── utils/jwt.js
│   │   ├── routes/             # auth, classes, lessonNotes, assignments,
│   │   │                       # submissions, questions, dashboard
│   │   └── db/
│   │       ├── schema.sql      # all tables
│   │       └── setup.js        # creates schema + seeds demo data
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/client.js       # axios instance + token interceptor
    │   ├── context/AuthContext.jsx
    │   ├── components/         # Layout, ProtectedRoute, ui, TimeAllocationChecker, QuestionThread
    │   ├── pages/              # login/register + teacher/ student/ headteacher/
    │   └── App.jsx             # routes
    └── package.json
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 13+ running locally

---

## Quick Start (recommended, one command each)

This path uses **Docker** for Postgres and runs both apps together. Run from the
project root (`hackaton/`):

```bash
# 1. Set up the backend env (defaults already match Docker Postgres)
copy backend\.env.example backend\.env      # macOS/Linux: cp backend/.env.example backend/.env

# 2. Install everything, start Postgres in Docker, and seed demo data
npm run setup

# 3. Run the API + web app together
npm run dev
```

- API → http://localhost:4000
- Web → **http://localhost:5173**

Other root scripts:

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `npm run install:all`| Install root + backend + frontend dependencies       |
| `npm run db:up`      | Start the Postgres container (`docker compose up -d`) |
| `npm run db:down`    | Stop the Postgres container                          |
| `npm run db:setup`   | Create tables + seed demo data                       |
| `npm run dev`        | Run backend and frontend concurrently               |

> The default `backend/.env.example` already points at the Docker Postgres
> (`postgres://postgres:postgres@localhost:5432/classbridge`), so no editing is
> needed when using Docker. Set a strong `JWT_SECRET` for anything beyond local demos.

---

## Manual Setup (without Docker)

### 1. Create the database

In `psql` (or any Postgres client):

```sql
CREATE DATABASE classbridge;
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to your Postgres connection string, e.g.:

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/classbridge
JWT_SECRET=some_long_random_secret
```

Create tables and seed demo data:

```bash
npm run db:setup
```

Start the API:

```bash
npm run dev          # http://localhost:4000
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so no extra config is needed.

Open **http://localhost:5173**.

---

## Demo Accounts

All demo accounts use the password: **`password123`**

| Role         | Email                          |
| ------------ | ------------------------------ |
| Teacher      | teacher@classbridge.test       |
| Student      | student@classbridge.test       |
| Headteacher  | headteacher@classbridge.test   |

Seeded class code: **`JHS2-SCI-4821`** (JHS 2 Integrated Science)

The login screen has one-tap buttons that fill in each demo account.

---

## Demo Flow (hackathon story)

1. **Teacher** logs in → dashboard shows classes, pending notes, assignments.
2. Create a class (e.g. *JHS 2 Integrated Science*) → get a class code.
3. Create a **Lesson Note** on *Photosynthesis* (all GES-style fields).
4. Add **time allocations** (Introduction/Main/Assessment/Closure).
5. The **Time Allocation Checker** instantly says *balanced / unallocated / exceeded*.
6. **Save Offline Draft** (stored in `localStorage`).
7. **Submit** the lesson note for review.
8. **Headteacher** logs in → sees pending reviews.
9. Headteacher **approves** or marks **needs correction** with a comment.
10. Teacher **publishes** a student-facing lesson summary + creates an **assignment**.
11. **Student** logs in → joins/views the class with the code.
12. Student opens the published lesson and the assignment.
13. Student **submits** a text answer.
14. Teacher **marks** the submission (score + feedback).
15. Student views their **score and feedback**.
16. Student **asks a question** under the lesson.
17. Teacher **replies** in the thread.

A pre-seeded approved lesson, a pending lesson, an assignment, and a Q&A thread
already exist so the demo looks alive immediately.

---

## Key Feature: Lesson Time Allocation Checker

Teachers allocate minutes per lesson stage. The UI compares the total to the
lesson duration **instantly, with no server call**:

- Total **=** duration → "Lesson time is balanced."
- Total **<** duration → "You have X minutes unallocated."
- Total **>** duration → "You exceeded the lesson duration by X minutes."

See `frontend/src/components/TimeAllocationChecker.jsx`.

---

## API Overview

| Method | Route                                   | Role        |
| ------ | --------------------------------------- | ----------- |
| POST   | `/api/auth/register`                    | public      |
| POST   | `/api/auth/login`                       | public      |
| GET    | `/api/auth/me`                          | any         |
| GET    | `/api/classes`                          | any         |
| POST   | `/api/classes`                          | teacher     |
| GET    | `/api/classes/:id`                      | any         |
| POST   | `/api/classes/join`                     | student     |
| GET    | `/api/lesson-notes`                     | any         |
| POST   | `/api/lesson-notes`                     | teacher     |
| GET    | `/api/lesson-notes/:id`                 | any (scoped)|
| PUT    | `/api/lesson-notes/:id`                 | teacher     |
| POST   | `/api/lesson-notes/:id/submit`          | teacher     |
| POST   | `/api/lesson-notes/:id/review`          | headteacher |
| POST   | `/api/lesson-notes/:id/publish`         | teacher     |
| GET    | `/api/assignments`                      | any         |
| POST   | `/api/assignments`                      | teacher     |
| GET    | `/api/assignments/:id`                  | any (scoped)|
| PUT    | `/api/assignments/:id`                  | teacher     |
| POST   | `/api/assignments/:id/submit`           | student     |
| GET    | `/api/assignments/:id/submissions`      | teacher     |
| POST   | `/api/submissions/:id/mark`             | teacher     |
| GET    | `/api/lessons/:id/questions`            | any         |
| POST   | `/api/lessons/:id/questions`            | student     |
| POST   | `/api/questions/:id/reply`              | any         |
| GET    | `/api/dashboard`                        | any (role-aware) |

---

## Notes & Simplifications (MVP)

- Passwords hashed with `bcryptjs` (pure-JS, avoids native build issues on Windows).
- Lesson publishing uses `lesson_notes.published` + `student_summary`
  (the `lesson_materials` table exists in the schema, reserved for future use).
- Questions are attached to lesson notes.
- Offline support is `localStorage` drafts; IndexedDB / service workers are future work.
- Re-running `npm run db:setup` drops and recreates everything (handy for demos).
