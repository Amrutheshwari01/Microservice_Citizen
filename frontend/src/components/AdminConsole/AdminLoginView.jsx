import React, { useState } from 'react';
import { ShieldCheck, Lock, Loader2, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';

export default function AdminLoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('admin@agrilink.in');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await adminService.login(identifier.trim(), password);
      onLoginSuccess(result.admin || { username: identifier.trim(), full_name: 'AgriLink Compliance Admin' });
    } catch (err) {
      setError(err.message || 'Admin sign-in failed. Check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '48px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#ecfdf5',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Admin & Compliance Sign In</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Sign in to review and approve citizen role requests
            </p>
          </div>
        </div>

        {error && (
          <div className="alert-callout error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-identifier">Admin Email or Username</label>
            <input
              id="admin-identifier"
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@agrilink.in"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>

          <div
            style={{
              background: 'var(--slate-50)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              color: 'var(--slate-600)',
              marginBottom: '16px'
            }}
          >
            Default Admin: <code className="font-mono">admin@agrilink.in</code> / <code className="font-mono">Admin@123</code>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
            <span>{isSubmitting ? 'Signing in...' : 'Sign In to Admin Console'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
