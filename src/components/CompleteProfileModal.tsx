import { useState } from 'react';
import { User } from '../types';
import { api } from '../utils/api';

interface Props {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const CHILD_AGE_OPTIONS = [
  'Pregnant / Expecting',
  '0–6 months',
  '6–12 months',
  '1–2 years',
  '2–3 years',
  '3–5 years',
  '5–8 years',
  '8–12 years',
  '12+ years',
];

export function CompleteProfileModal({ user, onComplete }: Props) {
  const [username, setUsername] = useState(user.username || '');
  const [city, setCity] = useState(user.city === 'India' ? '' : (user.city || ''));
  const [childAge, setChildAge] = useState(user.childAge || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('Pen name is required'); return; }
    if (!childAge) { setError('Please select your child\'s age'); return; }
    setError('');
    setLoading(true);
    try {
      const updated = await api.updateMe({ username: username.trim(), city: city.trim() || 'India', childAge });
      localStorage.removeItem('tuco_complete_profile');
      onComplete(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-tuco-cyan/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">👋</span>
          </div>
          <h2 className="font-display font-black text-xl text-neutral-800">
            Complete your profile
          </h2>
          <p className="text-xs text-neutral-500 mt-1.5">
            Just a few details so the community knows you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pen name */}
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1.5">
              Pen name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. MumbaiMom2024"
              maxLength={30}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-tuco-cyan transition-colors"
            />
            <p className="text-[10px] text-neutral-400 mt-1">This is how you'll appear in the community — stay anonymous!</p>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1.5">City</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Mumbai, Delhi, Bangalore…"
              maxLength={50}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-tuco-cyan transition-colors"
            />
          </div>

          {/* Child's age */}
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1.5">
              Child's age <span className="text-red-400">*</span>
            </label>
            <select
              value={childAge}
              onChange={e => setChildAge(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-tuco-cyan transition-colors bg-white"
            >
              <option value="">Select age group…</option>
              {CHILD_AGE_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-tuco-cyan text-white font-bold py-3 rounded-xl text-sm hover:bg-tuco-cyan/90 transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? 'Saving…' : 'Save & join the circle'}
          </button>
        </form>
      </div>
    </div>
  );
}
