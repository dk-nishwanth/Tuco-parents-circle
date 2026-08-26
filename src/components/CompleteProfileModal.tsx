import { useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../utils/api';
import { track } from '../utils/analytics';
import { CHILD_AGE_OPTIONS } from '../data/childAgeOptions';
import activeKidsImg from '../assets/activekids.png';
import schoolImg from '../assets/school.png';
import skincareImg from '../assets/skincareandhaircare.png';
import parentingImg from '../assets/parenting.png';
import kidsGrowthImg from '../assets/kidsgrowth.png';

interface Props {
  user: User;
  onComplete: (updatedUser: User) => void;
  // Lets the user dismiss this for the current session (e.g. the save
  // fails, or they just don't want to fill it in right now) instead of
  // being trapped with no way out. They'll be prompted again next login
  // since childAge stays unset server-side.
  onSkip: () => void;
}

// The interest tiles. Order + colour follow the top-nav so the onboarding
// looks like a bigger version of the same navigation the user will land on.
interface Interest {
  id: string;
  label: string;
  img: string;
  bg: string;
}
// Real categories only — "all" is a nav shortcut, not a topic anyone can
// have an interest in, so it's excluded from the picker.
const INTERESTS: Interest[] = [
  { id: 'active_kids', label: 'active kids', img: activeKidsImg, bg: '#9FE0B4' },
  { id: 'school', label: 'school & learning', img: schoolImg, bg: '#F6C6A0' },
  { id: 'skincare', label: 'skincare & haircare', img: skincareImg, bg: '#FBE08A' },
  { id: 'parenting_hacks', label: 'parenting hacks', img: parentingImg, bg: '#C9B2E8' },
  { id: 'kids_growth', label: 'kids & growth', img: kidsGrowthImg, bg: '#F2A0A0' },
];

// One selection allowed per real category (5). The Figma mockup shows six
// tiles because it duplicates "active kids" as a placeholder, so 5 matches
// what the app can actually filter on.
const MAX_INTERESTS = 5;

export function CompleteProfileModal({ user, onComplete, onSkip }: Props) {
  const [step, setStep] = useState<'age' | 'phone' | 'interests'>('age');
  const [childAge, setChildAge] = useState<string>(user.childAge || '');
  const [phone, setPhone] = useState<string>(user.phone || '');
  const [phoneError, setPhoneError] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user.interests || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childAge) {
      setError('Please choose your child\'s age.');
      return;
    }
    setError('');
    setStep('phone');
  };

  const handlePhoneNext = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (trimmed && !/^[0-9+\-\s]{7,20}$/.test(trimmed)) {
      setPhoneError('Enter a valid phone number, or skip this step.');
      return;
    }
    setPhoneError('');
    setStep('interests');
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, id];
    });
  };

  const handleFinish = async () => {
    setError('');
    setLoading(true);
    try {
      const trimmedPhone = phone.trim();
      const updated = await api.updateMe({
        childAge,
        interests: selectedInterests,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      });
      track('profile_completed', {
        child_age: childAge,
        interests_count: selectedInterests.length,
        added_phone: !!trimmedPhone,
      });
      onComplete(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80]"
      onClick={e => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip for now"
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors text-lg"
        >
          ×
        </button>
        {step === 'age' ? (
          <form onSubmit={handleNextStep}>
            <div className="text-center mb-6">
              {/* Poppins per Figma */}
              <p className="font-sans font-medium text-[22px] text-[#4D4747] leading-tight">
                welcome to
              </p>
              {/* tuco K!DS wordmark — More Sugar brand font, same stack as header */}
              <div className="flex flex-col items-center mt-3">
                <span className="font-brand text-[64px] leading-[0.9] text-[#4D4747]">
                  tüco<sup className="text-[18px] align-super">®</sup>
                </span>
                <span className="font-brand text-[15px] tracking-[0.18em] text-[#4D4747] -mt-1">
                  K!DS
                </span>
                {/* Figma spec: More Sugar Thin, 24px, line-height 86%, letter-spacing -5% */}
                <span
                  className="font-brand font-thin text-[#4D4747] mt-3"
                  style={{ fontSize: '24px', lineHeight: '0.86', letterSpacing: '-0.05em' }}
                >
                  parenting circle
                </span>
              </div>
            </div>

            {/* Question left-aligned per mockup */}
            <label
              htmlFor="child-age-input"
              className="block font-sans font-medium text-[16px] text-[#4D4747] mb-1.5"
            >
              how old is your child?
            </label>
            <select
              id="child-age-input"
              value={childAge}
              onChange={e => setChildAge(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-tuco-cyan rounded-xl text-sm font-sans text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-tuco-cyan/30 transition-all"
              autoFocus
            >
              <option value="">Select age group…</option>
              {CHILD_AGE_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {/* Figma spec: Poppins Medium, 12px, letter-spacing -5% */}
            <p
              className="font-sans font-medium text-neutral-400 text-center mt-1.5"
              style={{ fontSize: '12px', lineHeight: '1', letterSpacing: '-0.05em' }}
            >
              Enter an age between 3-15 yrs of age
            </p>

            {error && (
              <p className="text-xs text-red-500 font-medium text-center mt-3">{error}</p>
            )}

            <div className="flex justify-center mt-6">
              {/* Figma spec: 140x35, radius 28, Poppins Medium 16px */}
              <button
                type="submit"
                className="bg-[#FFE259] hover:bg-[#FFD62E] text-[#4D4747] font-sans font-medium flex items-center justify-center transition-colors"
                style={{
                  width: '140px',
                  height: '35px',
                  borderRadius: '28px',
                  fontSize: '16px',
                  lineHeight: '1',
                  letterSpacing: '-0.05em',
                }}
              >
                next step →
              </button>
            </div>
          </form>
        ) : step === 'phone' ? (
          <form onSubmit={handlePhoneNext}>
            <div className="text-center mb-5">
              <h2 className="font-brand text-[22px] leading-tight text-[#4D4747]">
                earn tuco Points ⭐
              </h2>
              <p className="font-sans text-sm text-neutral-500 mt-2">
                Add your phone number so points you earn here sync with your
                tucokids.com account, redeemable at checkout.
              </p>
            </div>
            <label
              htmlFor="phone-input"
              className="block font-sans font-medium text-[16px] text-[#4D4747] mb-1.5"
            >
              phone number (optional)
            </label>
            <input
              id="phone-input"
              type="tel"
              autoComplete="tel"
              placeholder="e.g. 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-tuco-cyan rounded-xl text-sm font-sans text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-tuco-cyan/30 transition-all"
              autoFocus
            />
            {phoneError && (
              <p className="text-xs text-red-500 font-medium text-center mt-3">{phoneError}</p>
            )}
            <div className="flex flex-col items-center gap-2 mt-6">
              <button
                type="submit"
                className="bg-[#FFE259] hover:bg-[#FFD62E] text-[#4D4747] font-sans font-medium flex items-center justify-center transition-colors"
                style={{
                  width: '140px',
                  height: '35px',
                  borderRadius: '28px',
                  fontSize: '16px',
                  lineHeight: '1',
                  letterSpacing: '-0.05em',
                }}
              >
                next step →
              </button>
              <button
                type="button"
                onClick={() => { setPhone(''); setPhoneError(''); setStep('interests'); }}
                className="text-[11px] text-neutral-400 hover:text-neutral-600"
              >
                Skip for now
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h2 className="font-brand text-[22px] leading-tight text-[#4D4747] text-center">
              what interests you?
            </h2>
            <p className="font-brand text-[16px] text-[#4D4747] text-center mb-5">
              select upto 5
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {INTERESTS.map(item => {
                const active = selectedInterests.includes(item.id);
                const disabled = !active && selectedInterests.length >= MAX_INTERESTS;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    disabled={disabled}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 focus:outline-none group ${
                      disabled ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center rounded-full w-[74px] h-[74px] transition-all ${
                        active
                          ? 'ring-[3px] ring-[#35B5EC] ring-offset-2 ring-offset-white scale-105'
                          : 'ring-0 group-hover:scale-105'
                      }`}
                      style={{ backgroundColor: item.bg }}
                    >
                      <img
                        src={item.img}
                        alt=""
                        aria-hidden="true"
                        className="w-[70%] h-[70%] object-contain"
                        loading="lazy"
                      />
                    </span>
                    <span className={`font-display font-bold text-[11px] leading-tight text-center ${
                      active ? 'text-[#35B5EC]' : 'text-[#4D4747]'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium text-center mb-2">{error}</p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                className="bg-[#FFE259] hover:bg-[#FFD62E] text-[#4D4747] font-brand text-[18px] px-10 py-3 rounded-full shadow-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'saving…' : 'finish'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="block mx-auto mt-3 text-[11px] text-neutral-400 hover:text-neutral-600"
            >
              ← back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
