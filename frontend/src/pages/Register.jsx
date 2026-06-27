import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, dashboardPath } from '../context/AuthContext.jsx';
import { apiError } from '../api/client.js';
import { Alert } from '../components/ui.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      navigate(dashboardPath(user.role), { replace: true });
    } catch (err) {
      setError(apiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-brand-700">
            ClassBridge <span className="text-gray-400">Ghana</span>
          </h1>
        </div>
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Create account
          </h2>
          {error && (
            <div className="mb-3">
              <Alert type="error">{error}</Alert>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label">I am a</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="HEADTEACHER">Headteacher</option>
              </select>
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
