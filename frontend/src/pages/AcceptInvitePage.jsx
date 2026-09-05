import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * AcceptInvitePage — FR-2.2
 * Handles ?token=<raw_token> from invitation email link.
 * - New users: must enter full_name + password
 * - Existing users: must verify password
 */
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ password: '', full_name: '', phone_number: '' });
  const [isExistingUser, setIsExistingUser] = useState(null);  // null = loading, true/false
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('loading'); // loading | form | done

  // Peek at the token to find the email (optional UX enhancement)
  useEffect(() => {
    if (!rawToken) {
      setStep('invalid');
      return;
    }
    setStep('form');
    // Decode the email from token by calling a lightweight validation endpoint
    // For now we just show the form without pre-filling
  }, [rawToken]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        token: rawToken,
        password: form.password,
        ...(form.full_name ? { full_name: form.full_name } : {}),
        ...(form.phone_number ? { phone_number: form.phone_number } : {}),
      };

      const res = await apiClient.post('/auth/invitations/accept', payload);

      // Store tokens in auth context
      const { access_token, refresh_token, user } = res;
      // Use apiClient to persist tokens
      localStorage.setItem('token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      setStep('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'invalid' || !rawToken) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-800 rounded-xl p-8 max-w-md w-full text-center">
          <p className="text-red-400 font-semibold text-lg">Invalid or missing invitation link.</p>
          <p className="text-gray-500 text-sm mt-2">Please request a new invitation from your administrator.</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-emerald-700 rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-emerald-400 font-semibold text-lg">Invitation accepted!</p>
          <p className="text-gray-400 text-sm mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600/20 mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Accept Invitation</h1>
          <p className="text-gray-400 text-sm mt-1">
            Set up your account to join the portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name — for new users */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name <span className="text-gray-500">(if new user)</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Jane Doe"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password <span className="text-red-400">*</span></label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-gray-500 text-xs mt-1">
              Existing users: enter your current DealFlow360 password to link your account.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Processing...' : 'Accept & Join'}
          </button>
        </form>
      </div>
    </div>
  );
}
