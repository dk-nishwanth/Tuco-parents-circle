import { useState } from 'react';
import { User } from '../types';
import { api } from '../utils/api';
import { track } from '../utils/analytics';
import { normalizeChildAge } from '../data/childAgeOptions';
import allImg from '../assets/all.png';
import activeKidsImg from '../assets/activekids.png';
import schoolImg from '../assets/school.png';
import skincareImg from '../assets/skincareandhaircare.png';
import parentingImg from '../assets/parenting.png';
import kidsGrowthImg from '../assets/kidsgrowth.png';

interface Props {
  user: User;
  onComplete: (updatedUser: User) => void;
}

// The interest tiles. Order + colour follow the top-nav so the onboarding
// looks like a bigger version of the same navigation the user will land on.
interface Interest {
  id: string;
  label: string;
  img: string;
  bg: string;
}
const INTERESTS: Interest[] = [
  { id: 'all', label: 'all', img: allImg, bg: '#BFEAF7' },
  { id: 'active_kids', label: 'active kids', img: activeKidsImg, bg: '#9FE0B4' },
  { id: 'school', label: 'school & learning', img: schoolImg, bg: '#F6C6A0' },
  { id: 'skincare', label: 'skincare & haircare', img: skincareImg, bg: '#FBE08A' },
  { id: 'parenting_hacks', label: 'parenting hacks', img: parentingImg, bg: '#C9B2E8' },
  { id: 'kids_growth', label: 'kids & growth', img: kidsGrowthImg, bg: '#F2A0A0' },
];

const MIN_AGE = 3;
const MAX_AGE = 15;
const MAX_INTERESTS = 6;

export function CompleteProfileModal({ user, onComplete }: Props) {
  const [step, setStep] = useState<'age' | 'interests'>('age');
  const [ageInput, setAgeInput] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user.interests || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const age = parseInt(ageInput, 10);
    if (Number.isNaN(age) || age < MIN_AGE || age > MAX_AGE) {
      setError(`Please enter an age between ${MIN_AGE} and ${MAX_AGE} years.`);
      return;
    }
    setError('');
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
      const canonicalAge = normalizeChildAge(ageInput) || ageInput;
      const updated = await api.updateMe({
        childAge: canonicalAge,
        interests: selectedInterests,
      });
      track('profile_completed', {
        child_age: canonicalAge,
        interests_count: selectedInterests.length,
      });
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
        {step === 'age' ? (
          <form onSubmit={handleNextStep}>
            <div className="text-center mb-5">
              <p className="font-brand text-[26px] leading-tight text-[#4D4747]">welcome to</p>
              {/* Small stacked wordmark matching the header brand */}
              <div className="flex flex-col items-center mt-2">
                <span className="font-brand text-[54px] leading-[0.9] text-[#4D4747]">
                  tüco<sup className="text-[16px] align-super">®</sup>
                </span>
                <span className="font-brand text-[14px] tracking-[0.15em] text-[#4D4747] -mt-1">
                  K!DS
                </span>
                <span className="font-brand text-[22px] leading-tight text-[#4D4747] mt-2">
                  parenting circle
                </span>
              </div>
            </div>

            <label
              htmlFor="child-age-input"
              className="block font-brand text-[18px] text-[#4D4747] text-center mb-2"
            >
              how old is your child?
            </label>
            <input
              id="child-age-input"
              type="number"
              inputMode="numeric"
              min={MIN_AGE}
              max={MAX_AGE}
              value={ageInput}
              onChange={e => setAgeInput(e.target.value)}
              className="w-full px-4 py-3 border-2 border-tuco-cyan rounded-xl text-center text-lg font-display font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-tuco-cyan/30 transition-all"
              autoFocus
            />
            <p className="text-[11px] text-neutral-400 text-center mt-1.5">
              Enter an age between {MIN_AGE}–{MAX_AGE} yrs of age
            </p>

            {error && (
              <p className="text-xs text-red-500 font-medium text-center mt-3">{error}</p>
            )}

            <div className="flex justify-center mt-6">
              <button
                type="submit"
                className="bg-[#FFE259] hover:bg-[#FFD62E] text-[#4D4747] font-brand text-[18px] px-8 py-3 rounded-full shadow-sm transition-colors"
              >
                next step →
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h2 className="font-brand text-[22px] leading-tight text-[#4D4747] text-center">
              what interests you?
            </h2>
            <p className="font-brand text-[16px] text-[#4D4747] text-center mb-5">
              select upto {MAX_INTERESTS}
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
              onClick={() => setStep('age')}
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
