import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, dashboardPath } from '../context/AuthContext.jsx';
import { apiError } from '../api/client.js';
import { Alert } from '../components/ui.jsx';

const DEMO = [
  { label: 'Teacher', email: 'teacher@classbridge.test' },
  { label: 'Student', email: 'student@classbridge.test' },
  { label: 'Headteacher', email: 'headteacher@classbridge.test' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(dashboardPath(user.role), { replace: true });
    } catch (err) {
      setError(apiError(err, 'Login failed.'));
    } finally {
      setLoading(false);
    }
  }

  function quickFill(demoEmail) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-brand-700">
            ClassBridge <span className="text-gray-400">Ghana</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Bridging teachers, students and headteachers.
          </p>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Sign in</h2>
          {error && (
            <div className="mb-3">
              <Alert type="error">{error}</Alert>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@classbridge.test"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Demo accounts (password: password123)
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => quickFill(d.email)}
                  className="btn-secondary py-1.5 text-xs"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
