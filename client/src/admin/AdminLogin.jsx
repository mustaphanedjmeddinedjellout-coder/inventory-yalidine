import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setAdminAuthed } from './auth';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        setAdminAuthed(true);
        const target = location.state?.from || '/admin';
        navigate(target, { replace: true });
      } else {
        setError(data.error || 'Invalid password.');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-black/10 bg-white/80 p-8">
        <h1 className="text-2xl font-display text-ink">Admin Access</h1>
        <p className="mt-2 text-[12px] text-black/50">Enter your admin password to continue.</p>

        <div className="mt-6 space-y-2">
          <label className="text-[11px] uppercase tracking-[0.3em] text-black/45">Password</label>
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
        </div>

        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
