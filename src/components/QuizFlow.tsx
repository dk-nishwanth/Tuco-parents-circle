import { useState } from 'react';
import quizMascot from '../assets/quiz-mascot.png';
import quizMascotThanks from '../assets/quiz-mascot-thanks.png';

interface QuizOption {
  label: string;
  subtitle?: string;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    question: "what's your child's main concern?",
    options: [
      { label: 'skincare' },
      { label: 'haircare' },
      { label: 'makeup' },
      { label: 'suncare' },
    ],
  },
  {
    question: "what best describes your child's hair?",
    options: [
      { label: 'frizzy & tangled', subtitle: 'hard to comb, flyaway' },
      { label: 'weak or thinning', subtitle: 'falling more than usual' },
      { label: 'dry & rough', subtitle: 'feels rough to the touch' },
      { label: 'just want a full routine', subtitle: 'no specific issue yet' },
    ],
  },
  {
    question: 'how often do you currently champi/oil their hair?',
    options: [
      { label: 'never / just starting' },
      { label: 'occasionally' },
      { label: 'regularly, want to upgrade' },
    ],
  },
  {
    question: 'how old is your child?',
    options: [
      { label: '3-5 years' },
      { label: '6-9 years' },
      { label: '10-12 years' },
      { label: '13-15 years' },
    ],
  },
];

export function QuizFlow() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const total = QUESTIONS.length;
  const current = QUESTIONS[step];
  const selected = answers[step];

  const selectOption = (label: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[step] = label;
      return next;
    });
  };

  const goNext = () => {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      setFinished(true);
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <img src={quizMascotThanks} alt="" className="w-24 h-24 md:w-28 md:h-28 object-contain" />
        <p
          className="font-display font-medium text-[#4D4747] mt-6 max-w-sm"
          style={{ fontSize: 20, lineHeight: '20px', letterSpacing: '-0.05em', textAlign: 'center' }}
        >
          thank you for your response!
          <br />
          we&rsquo;ll keep this in mind while formulating our products!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {step > 0 && (
        <button
          onClick={goBack}
          className="font-display text-sm text-neutral-500 hover:text-neutral-700 mb-2"
        >
          ‹ back
        </button>
      )}
      <div className="flex justify-center mb-4">
        <img src={quizMascot} alt="" className="w-20 h-20 md:w-32 md:h-32 object-contain" />
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="font-display font-semibold text-sm text-[#00B9F1] bg-[#E6F8FE] rounded-full px-4 py-1.5">
          question
        </span>
        <span className="font-display text-sm text-[#4D4747]">
          {step + 1} of {total}
        </span>
      </div>
      <h3 className="font-display font-semibold text-[#4D4747] text-[22px] md:text-[26px] leading-snug mt-2 mb-5 text-center">
        {current.question}
      </h3>
      <div className="flex flex-col gap-3">
        {current.options.map(option => {
          const isSelected = selected === option.label;
          return (
            <button
              key={option.label}
              onClick={() => selectOption(option.label)}
              className={`text-left px-5 py-4 rounded-2xl border transition-colors flex items-center justify-between ${
                isSelected
                  ? 'border-[#00B9F1] bg-[#E6F8FE]'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <span>
                <span
                  className="font-display font-medium text-[#4D4747] block"
                  style={{ fontSize: 16, lineHeight: '16px', letterSpacing: '-0.05em' }}
                >
                  {option.label}
                </span>
                {option.subtitle && (
                  <span className="font-display text-sm text-neutral-500 block mt-2">{option.subtitle}</span>
                )}
              </span>
              {isSelected && <span className="text-[#00B9F1] font-bold">✓</span>}
            </button>
          );
        })}
      </div>
      <button
        onClick={goNext}
        disabled={!selected}
        className={`w-full mt-6 py-3 rounded-full font-display font-semibold text-white transition-all ${
          selected ? 'bg-[#00B9F1] hover:brightness-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
        }`}
      >
        {step < total - 1 ? 'next question →' : 'see results →'}
      </button>
    </div>
  );
}
