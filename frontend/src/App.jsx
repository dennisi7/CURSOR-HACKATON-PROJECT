import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, dashboardPath } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import TeacherClasses from './pages/teacher/Classes.jsx';
import ClassDetail from './pages/teacher/ClassDetail.jsx';
import LessonNotes from './pages/teacher/LessonNotes.jsx';
import LessonNoteEditor from './pages/teacher/LessonNoteEditor.jsx';
import LessonNoteDetail from './pages/teacher/LessonNoteDetail.jsx';
import Assignments from './pages/teacher/Assignments.jsx';
import AssignmentEditor from './pages/teacher/AssignmentEditor.jsx';
import AssignmentDetail from './pages/teacher/AssignmentDetail.jsx';

import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentClasses from './pages/student/StudentClasses.jsx';
import StudentLessons from './pages/student/StudentLessons.jsx';
import StudentLessonDetail from './pages/student/StudentLessonDetail.jsx';
import StudentAssignments from './pages/student/StudentAssignments.jsx';
import StudentAssignmentDetail from './pages/student/StudentAssignmentDetail.jsx';

import HeadteacherDashboard from './pages/headteacher/HeadteacherDashboard.jsx';
import Reviews from './pages/headteacher/Reviews.jsx';
import ReviewLessonNote from './pages/headteacher/ReviewLessonNote.jsx';
import WeeklyBrief from './pages/headteacher/WeeklyBrief.jsx';
import CoverageOverview from './pages/headteacher/CoverageOverview.jsx';
import ParticipationOverview from './pages/headteacher/ParticipationOverview.jsx';

import SyllabusCoverage from './pages/teacher/SyllabusCoverage.jsx';
import ParticipationLog from './pages/teacher/ParticipationLog.jsx';
import StudentMyParticipation from './pages/student/MyParticipation.jsx';
import StudentMyFeedback from './pages/student/MyFeedback.jsx';
import NoticeBoard from './pages/NoticeBoard.jsx';
import LessonNotePrint from './pages/LessonNotePrint.jsx';

function RoleLayout({ roles, children }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? dashboardPath(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Teacher */}
      <Route
        path="/teacher"
        element={
          <RoleLayout roles={['TEACHER']}>
            <TeacherDashboard />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/classes"
        element={
          <RoleLayout roles={['TEACHER']}>
            <TeacherClasses />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/classes/:id"
        element={
          <RoleLayout roles={['TEACHER']}>
            <ClassDetail />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/lesson-notes"
        element={
          <RoleLayout roles={['TEACHER']}>
            <LessonNotes />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/lesson-notes/new"
        element={
          <RoleLayout roles={['TEACHER']}>
            <LessonNoteEditor />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/lesson-notes/:id/edit"
        element={
          <RoleLayout roles={['TEACHER']}>
            <LessonNoteEditor />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/lesson-notes/:id"
        element={
          <RoleLayout roles={['TEACHER']}>
            <LessonNoteDetail />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/assignments"
        element={
          <RoleLayout roles={['TEACHER']}>
            <Assignments />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/assignments/new"
        element={
          <RoleLayout roles={['TEACHER']}>
            <AssignmentEditor />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/assignments/:id"
        element={
          <RoleLayout roles={['TEACHER']}>
            <AssignmentDetail />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/syllabus"
        element={
          <RoleLayout roles={['TEACHER']}>
            <SyllabusCoverage />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/participation"
        element={
          <RoleLayout roles={['TEACHER']}>
            <ParticipationLog />
          </RoleLayout>
        }
      />
      <Route
        path="/teacher/notices"
        element={
          <RoleLayout roles={['TEACHER']}>
            <NoticeBoard />
          </RoleLayout>
        }
      />

      {/* Student */}
      <Route
        path="/student"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentDashboard />
          </RoleLayout>
        }
      />
      <Route
        path="/student/classes"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentClasses />
          </RoleLayout>
        }
      />
      <Route
        path="/student/lessons"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentLessons />
          </RoleLayout>
        }
      />
      <Route
        path="/student/lessons/:id"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentLessonDetail />
          </RoleLayout>
        }
      />
      <Route
        path="/student/assignments"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentAssignments />
          </RoleLayout>
        }
      />
      <Route
        path="/student/assignments/:id"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentAssignmentDetail />
          </RoleLayout>
        }
      />
      <Route
        path="/student/notices"
        element={
          <RoleLayout roles={['STUDENT']}>
            <NoticeBoard />
          </RoleLayout>
        }
      />
      <Route
        path="/student/feedback"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentMyFeedback />
          </RoleLayout>
        }
      />
      <Route
        path="/student/participation"
        element={
          <RoleLayout roles={['STUDENT']}>
            <StudentMyParticipation />
          </RoleLayout>
        }
      />

      {/* Headteacher / Admin */}
      <Route
        path="/headteacher"
        element={
          <RoleLayout roles={['HEADTEACHER', 'ADMIN']}>
            <HeadteacherDashboard />
          </RoleLayout>
        }
      />
      <Route
        path="/headteacher/reviews"
        element={
          <RoleLayout roles={['HEADTEACHER', 'ADMIN']}>
            <Reviews />
          </RoleLayout>
        }
      />
      <Route
        path="/headteacher/reviews/:id"
        element={
          <RoleLayout roles={['HEADTEACHER', 'ADMIN']}>
            <ReviewLessonNote />
          </RoleLayout>
        }
      />
      <Route
        path="/headteacher/weekly-brief"
        element={
          <RoleLayout roles={['HEADTEACHER', 'ADMIN']}>
            <WeeklyBrief />
          </RoleLayout>
        }
      />
      <Route
        path="/headteacher/coverage"
        element={
          <RoleLayout roles={['HEADTEACHER', 'ADMIN']}>
            <CoverageOverview />
          </RoleLayout>
        }
      />
      <Route
        path="/headteacher/participation"
        element={
          <RoleLayout roles={['HEADTEACHER', 'ADMIN']}>
            <ParticipationOverview />
          </RoleLayout>
        }
      />
      <Route
        path="/headteacher/notices"
        element={
          <RoleLayout roles={['HEADTEACHER', 'ADMIN']}>
            <NoticeBoard />
          </RoleLayout>
        }
      />

      {/* Shared printable lesson note (no main layout/sidebar) */}
      <Route
        path="/lesson-notes/:id/print"
        element={
          <ProtectedRoute roles={['TEACHER', 'HEADTEACHER', 'ADMIN']}>
            <LessonNotePrint />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
