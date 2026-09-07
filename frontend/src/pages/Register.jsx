import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form.fullName, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl text-ink">Legal Metrology</p>
          <p className="text-sm text-ink/60">Packaged Commodities Compliance Checker</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h1 className="font-serif text-xl">Create an officer account</h1>
          <p className="text-xs text-ink/50">
            New accounts start as Officer. An admin can promote you to Reviewer or Admin afterward.
          </p>
          {error && <p className="rounded-md bg-noncompliant-bg px-3 py-2 text-sm text-noncompliant">{error}</p>}
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" required className="input" value={form.fullName} onChange={update('fullName')} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={form.email} onChange={update('email')} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={form.password}
              onChange={update('password')}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-center text-sm text-ink/60">
            Already registered? <Link to="/login" className="text-brass hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
