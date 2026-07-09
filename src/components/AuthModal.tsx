import { useEffect, useRef, useState } from 'react';
import { X, Mail, Lock, MapPin, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { track } from '../utils/analytics';
import { CHILD_AGE_OPTIONS } from '../data/childAgeOptions';
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: (email: string, username: string, city: string, childAge: string, password: string) => void;
  onLogin: (email: string, password: string) => void;
  initialMode?: 'login' | 'signup' | 'forgot' | 'reset';
  initialResetToken?: string;
}
export function AuthModal({ isOpen, onClose, onSignup, onLogin, initialMode, initialResetToken }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [childAge, setChildAge] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState(initialResetToken || '');
  const [newPassword, setNewPassword] = useState('');

  // Signup funnel: fire once per modal-open when the user first types a character.
  const signupStartedRef = useRef(false);
  const markSignupStarted = () => {
    if (signupStartedRef.current) return;
    signupStartedRef.current = true;
    track('signup_form_started');
  };

  // Sync the mode to whatever the caller asked for each time the modal opens,
  // and fire auth_modal_opened. Without this, the mode from a previous open
  // would stick (the component stays mounted between opens) and openAuth('signup')
  // from App would be ignored.
  useEffect(() => {
    if (isOpen) {
      const startMode = initialMode || 'login';
      setMode(startMode);
      setError('');
      setSuccess('');
      // Prefill the reset token from the email link. App strips ?reset_token
      // from the URL and passes it here; without copying it into state the
      // reset form's token field stays empty and password reset is impossible.
      if (initialResetToken) setResetToken(initialResetToken);
      signupStartedRef.current = false;
      track('auth_modal_opened', { initial_mode: startMode });
    }
  }, [isOpen, initialMode, initialResetToken]);

  // Persist the current URL (with hash/search) so we can return the user to
  // the same thread after Google OAuth. Without this, the OAuth reload lands
  // them on the homepage and their draft reply is lost.
  const saveReturnUrl = () => {
    try {
      const returnUrl = window.location.pathname + window.location.search + window.location.hash;
      sessionStorage.setItem('tuco_return_url', returnUrl);
    } catch {
      // ignore — sessionStorage may be blocked in private mode
    }
  };

  if (!isOpen) return null;

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSuccess(data.message + ' Redirecting to login...');
      setTimeout(() => { setMode('login'); setSuccess(''); setResetToken(''); setNewPassword(''); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    track('signup_form_submitted');
    // Trim so stray leading/trailing spaces don't cause confusing rejections
    // (and match what the server stores).
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();
    if (!cleanEmail.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    if (cleanUsername.length < 3) {
      setError('Please pick a pen-name with at least 3 characters');
      setLoading(false);
      return;
    }
    if (!childAge) {
      setError("Please tell us your child's age");
      setLoading(false);
      return;
    }
    await onSignup(cleanEmail, cleanUsername, city.trim(), childAge, password);
    setLoading(false);
  };
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }
    try {
      // Trim so mobile-autofill trailing spaces don't fail the server's
      // z.string().email() check before it normalizes — that surfaces as a
      // confusing "invalid email or password" even when the account exists.
      await onLogin(cleanEmail, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200">
        {}
        <div className="bg-gradient-to-r from-tuco-cyan/10 to-orange-50 px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-display font-black text-lg text-neutral-800">
            {mode === 'login' ? '🔓 Sign In' : mode === 'signup' ? '✨ Join the Circle' : mode === 'forgot' ? '🔑 Reset Password' : '🔑 Set New Password'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        {}
        <div className="p-6">
          {}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg font-display font-bold text-sm transition-all ${
                  mode === 'login' ? 'bg-tuco-cyan text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg font-display font-bold text-sm transition-all ${
                  mode === 'signup' ? 'bg-tuco-cyan text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}
          {/* Google is the highest-converting path — make it the prominent,
              one-tap primary option above the email form. */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="mb-5">
              <a
                href="/api/auth/google"
                onClick={saveReturnUrl}
                className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border-2 border-neutral-200 bg-white hover:border-tuco-cyan hover:bg-neutral-50 transition-all text-sm font-display font-black text-neutral-800 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </a>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-neutral-150" />
                <span className="text-xs text-neutral-400 font-medium">or use email</span>
                <div className="flex-1 h-px bg-neutral-150" />
              </div>
            </div>
          )}
          {}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm text-red-600 font-medium">{error}</p>
                {mode === 'login' && (
                  <>
                    <p className="text-xs text-neutral-600 mt-1.5">
                      Signed up with Google?{' '}
                      <a
                        href="/api/auth/google"
                        onClick={saveReturnUrl}
                        className="text-tuco-cyan font-semibold hover:underline"
                      >
                        Continue with Google
                      </a>{' '}
                      instead.
                    </p>
                    {/* Most failed logins are people who never made an account.
                        Give them a one-tap path into signup, keeping their email. */}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                      className="mt-2 w-full py-2 rounded-lg bg-tuco-cyan text-white text-xs font-display font-black hover:bg-tuco-cyan-hover transition-all"
                    >
                      New here? Create your account →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm text-green-600 font-medium">{success}</p>
            </div>
          )}
          {}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="any@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600">
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                className="w-full text-center text-xs text-tuco-cyan hover:underline mt-1"
              >
                Forgot password?
              </button>
            </form>
          )}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-sm text-neutral-600">Enter your email and we'll send you a reset link.</p>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full py-2.5 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-700"
              >
                ← Back to Sign In
              </button>
            </form>
          )}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <p className="text-sm text-neutral-600">Enter the token from your email and your new password.</p>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Reset Token</label>
                <input
                  type="text"
                  placeholder="Paste token from email"
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600">
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Set New Password'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-700"
              >
                ← Back to Sign In
              </button>
            </form>
          )}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type="email"
                    placeholder="mom@example.com"
                    value={email}
                    onChange={e => { markSignupStarted(); setEmail(e.target.value); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => { markSignupStarted(); setPassword(e.target.value); }}
                    className="w-full pl-10 pr-10 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600">
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Your Pen-Name (Not your real name)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="e.g. PriyasMom, ArjunsDad"
                    value={username}
                    onChange={e => { markSignupStarted(); setUsername(e.target.value); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">Keep it anonymous for sensitive topics</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Your City (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="e.g. Bangalore, Mumbai"
                    value={city}
                    onChange={e => { markSignupStarted(); setCity(e.target.value); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  How old is your child?
                </label>
                <select
                  value={childAge}
                  onChange={e => { markSignupStarted(); setChildAge(e.target.value); }}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                >
                  <option value="">Select age...</option>
                  {CHILD_AGE_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="text-xs text-neutral-500 text-center">
                ✓ No phone number required &nbsp;✓ Anonymous pen-name
              </p>
            </form>
          )}
          {(mode === 'login' || mode === 'signup') && <p className="text-xs text-neutral-500 text-center mt-6 pt-6 border-t border-neutral-150">
            By signing up, you agree to our{' '}
            <a href="#" className="text-tuco-cyan font-bold hover:underline">
              Community Guidelines
            </a>
          </p>}
        </div>
      </div>
    </div>
  );
}
