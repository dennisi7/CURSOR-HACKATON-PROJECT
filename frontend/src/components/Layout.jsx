import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = {
  TEACHER: [
    { to: '/teacher', label: 'Dashboard', end: true },
    { to: '/teacher/classes', label: 'Classes' },
    { to: '/teacher/lesson-notes', label: 'Lesson Notes' },
    { to: '/teacher/assignments', label: 'Assignments' },
  ],
  STUDENT: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/student/classes', label: 'My Classes' },
    { to: '/student/lessons', label: 'Lessons' },
    { to: '/student/assignments', label: 'Assignments' },
  ],
  HEADTEACHER: [
    { to: '/headteacher', label: 'Dashboard', end: true },
    { to: '/headteacher/reviews', label: 'Lesson Reviews' },
  ],
  ADMIN: [
    { to: '/headteacher', label: 'Dashboard', end: true },
    { to: '/headteacher/reviews', label: 'Lesson Reviews' },
  ],
};

const ROLE_LABEL = {
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  HEADTEACHER: 'Headteacher',
  ADMIN: 'Admin',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = NAV[user?.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navLinkClass = ({ isActive }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <span className="text-xl">☰</span>
            </button>
            <span className="text-lg font-bold text-brand-700">
              ClassBridge <span className="text-gray-400">GH</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABEL[user?.role]}</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary py-1.5">
              Logout
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        {open && (
          <nav className="space-y-1 border-t border-gray-100 px-3 py-2 md:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <div className="mx-auto flex max-w-5xl gap-6 px-4 py-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
