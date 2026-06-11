import { useState } from 'react';
import { X, Mail, Lock, MapPin, User, AlertCircle, CheckCircle } from 'lucide-react';
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: (email: string, username: string, city: string, childAge: string, password: string) => void;
  onLogin: (email: string, password: string) => void;
}
export function AuthModal({ isOpen, onClose, onSignup, onLogin }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [childAge, setChildAge] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }
    if (!childAge) {
      setError("Please tell us your child's age");
      setLoading(false);
      return;
    }
    await onSignup(email, username, city, childAge, password);
    setLoading(false);
  };
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email || !password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }
    onLogin(email, password);
    setLoading(false);
    onClose();
  };
  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200">
        {}
        <div className="bg-gradient-to-r from-tuco-cyan/10 to-orange-50 px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-display font-black text-lg text-neutral-800">
            {mode === 'login' ? '🔓 Sign In' : '✨ Join the Circle'}
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
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg font-display font-bold text-sm transition-all ${
                mode === 'login'
                  ? 'bg-tuco-cyan text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg font-display font-bold text-sm transition-all ${
                mode === 'signup'
                  ? 'bg-tuco-cyan text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Sign Up
            </button>
          </div>
          {}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm text-red-600 font-medium">{error}</p>
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
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-xs text-neutral-500 text-center">
                Demo: use any email and any password to sign in
              </p>
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
                    onChange={e => setEmail(e.target.value)}
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
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                  />
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
                    onChange={e => setUsername(e.target.value)}
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
                    onChange={e => setCity(e.target.value)}
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
                  onChange={e => setChildAge(e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg outline-none text-sm focus:border-tuco-cyan focus:ring-2 focus:ring-tuco-cyan/10"
                >
                  <option value="">Select age...</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5 years</option>
                  <option value="6">6 years</option>
                  <option value="7">7 years</option>
                  <option value="8">8 years</option>
                  <option value="9">9 years</option>
                  <option value="10">10 years</option>
                  <option value="11">11 years</option>
                  <option value="12">12 years</option>
                  <option value="13">13 years</option>
                  <option value="14">14 years</option>
                  <option value="15">15 years</option>
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
          {}
          <p className="text-xs text-neutral-500 text-center mt-6 pt-6 border-t border-neutral-150">
            By signing up, you agree to our{' '}
            <a href="#" className="text-tuco-cyan font-bold hover:underline">
              Community Guidelines
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
