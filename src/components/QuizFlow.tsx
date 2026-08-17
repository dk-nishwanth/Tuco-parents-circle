import { useState } from 'react';
import quizMascot from '../assets/quiz-mascot.png';
import quizMascotThanks from '../assets/quiz-mascot-thanks.png';

const ICON_SKIN = 'https://cdn.shopify.com/s/files/1/0619/9990/7032/files/Mask_group_33dbd242-d9c4-48fa-b56b-a6f2a06fcdc8.png?v=1786616265';
const ICON_HAIR = 'https://cdn.shopify.com/s/files/1/0619/9990/7032/files/Mask_group_1.png?v=1786616265';
const ICON_MAKEUP = 'https://cdn.shopify.com/s/files/1/0619/9990/7032/files/Mask_group_2_f5d16d7b-01f8-45a7-8be4-1ab263b7eab6.png?v=1786616265';
const ICON_SUN = 'https://cdn.shopify.com/s/files/1/0619/9990/7032/files/Mask_group_3_5729bb2c-d939-4885-bcb1-746be46970d7.png?v=1786616264';

type Category = 'skin' | 'hair' | 'makeup' | 'sun';

interface QuizOption {
  value: string;
  title: string;
  hint?: string;
}

interface QuizQuestion {
  title: string;
  multi?: boolean;
  options: QuizOption[];
}

const CATEGORY_OPTIONS: { value: Category; title: string; icon: string }[] = [
  { value: 'skin', title: 'skincare', icon: ICON_SKIN },
  { value: 'hair', title: 'haircare', icon: ICON_HAIR },
  { value: 'makeup', title: 'makeup', icon: ICON_MAKEUP },
  { value: 'sun', title: 'suncare', icon: ICON_SUN },
];

const QUESTIONS: Record<Category, QuizQuestion[]> = {
  skin: [
    {
      title: "what's your child's main skin concern?",
      options: [
        { value: 'tan', title: 'dull or tanned skin', hint: 'uneven, tired-looking tone' },
        { value: 'patchy', title: 'patchy or uneven skin', hint: 'dark spots, discolouration' },
        { value: 'dry', title: 'dry, rough patches', hint: 'flaky or tight-feeling skin' },
        { value: 'new', title: 'just starting a routine', hint: 'no specific concern yet' },
      ],
    },
    {
      title: 'how much do you want to treat?',
      options: [
        { value: 'face', title: 'face only', hint: 'a focused face routine' },
        { value: 'body', title: 'full body', hint: 'face and body together' },
        { value: 'full', title: 'complete routine', hint: 'day and night care' },
      ],
    },
    {
      title: 'how old is your child?',
      options: [
        { value: '3_5', title: '3–5 years' },
        { value: '6_9', title: '6–9 years' },
        { value: '10_12', title: '10–12 years' },
        { value: '13_15', title: '13–15 years' },
      ],
    },
    {
      title: 'does your child have sensitive or reactive skin?',
      options: [
        { value: 'very_sensitive', title: 'very sensitive', hint: 'reacts easily to new products' },
        { value: 'somewhat_sensitive', title: 'somewhat sensitive', hint: 'occasionally reacts' },
        { value: 'not_sensitive', title: 'not sensitive', hint: 'handles most products fine' },
        { value: 'not_sure', title: 'not sure yet' },
      ],
    },
  ],
  hair: [
    {
      title: "what best describes your child's hair?",
      options: [
        { value: 'frizzy', title: 'frizzy & tangled', hint: 'hard to comb, flyaway' },
        { value: 'weak', title: 'weak or thinning', hint: 'falling more than usual' },
        { value: 'dry', title: 'dry & rough', hint: 'feels rough to the touch' },
        { value: 'new', title: 'just want a full routine', hint: 'no specific issue yet' },
      ],
    },
    {
      title: 'how often do you currently champi/oil their hair?',
      options: [
        { value: 'never', title: 'never / just starting' },
        { value: 'some', title: 'occasionally' },
        { value: 'often', title: 'regularly, want to upgrade' },
      ],
    },
    {
      title: 'how old is your child?',
      options: [
        { value: '3_5', title: '3–5 years' },
        { value: '6_9', title: '6–9 years' },
        { value: '10_12', title: '10–12 years' },
        { value: '13_15', title: '13–15 years' },
      ],
    },
    {
      title: "how long is your child's hair?",
      options: [
        { value: 'short', title: 'short', hint: 'above shoulder length' },
        { value: 'medium', title: 'medium', hint: 'shoulder to mid-back' },
        { value: 'long', title: 'long', hint: 'past mid-back' },
      ],
    },
  ],
  makeup: [
    {
      title: 'what does your child currently use?',
      multi: true,
      options: [
        { value: 'nailpaint', title: 'nail paint', hint: 'salon or drugstore polish' },
        { value: 'kajal', title: 'kajal / eyeliner', hint: 'kohl or pencil liner' },
        { value: 'lips', title: 'lip products', hint: 'balm, gloss or tint' },
        { value: 'unsure', title: 'a mix of everything' },
      ],
    },
    {
      title: 'noticed anything like this lately?',
      multi: true,
      options: [
        { value: 'chapped', title: 'chapped or sore lips' },
        { value: 'eyes', title: 'watery or itchy eyes' },
        { value: 'stain', title: 'nail paint peeling or staining' },
        { value: 'none', title: 'nothing yet, just checking' },
      ],
    },
    {
      title: 'how old is your child?',
      options: [
        { value: '3_5', title: '3–5 years' },
        { value: '6_9', title: '6–9 years' },
        { value: '10_12', title: '10–12 years' },
        { value: '13_15', title: '13–15 years' },
      ],
    },
    {
      title: 'how often does your child wear makeup?',
      options: [
        { value: 'everyday', title: 'everyday play', hint: 'part of their daily routine' },
        { value: 'occasions', title: 'special occasions only', hint: 'parties, festivals, events' },
        { value: 'just_started', title: 'just started', hint: 'new to makeup' },
        { value: 'curious', title: 'not yet, just curious' },
      ],
    },
  ],
  sun: [
    {
      title: 'what are you protecting against today?',
      options: [
        { value: 'daily', title: 'daily school & outdoor time', hint: 'everyday sun exposure' },
        { value: 'swim', title: 'swimming or sports', hint: 'water & sweat-heavy days' },
        { value: 'beach', title: 'beach or vacation', hint: 'long hours in direct sun' },
        { value: 'full', title: 'a full sun + skin routine', hint: 'building daily habits' },
      ],
    },
    {
      title: 'how much coverage do you want?',
      options: [
        { value: 'light', title: 'just sunscreen', hint: 'quick, everyday layer' },
        { value: 'duo', title: 'sunscreen + lotion', hint: 'a bit more hydration too' },
        { value: 'kit', title: 'a complete kit', hint: 'cleansing + sun protection' },
      ],
    },
    {
      title: 'how old is your child?',
      options: [
        { value: '3_5', title: '3–5 years' },
        { value: '6_9', title: '6–9 years' },
        { value: '10_12', title: '10–12 years' },
        { value: '13_15', title: '13–15 years' },
      ],
    },
    {
      title: "how does your child's skin react to sun?",
      options: [
        { value: 'burns_easily', title: 'burns easily', hint: 'turns red or irritated fast' },
        { value: 'tans_quickly', title: 'tans quickly', hint: 'darkens with little sun exposure' },
        { value: 'rarely_reacts', title: 'rarely reacts', hint: "doesn't burn or tan much" },
        { value: 'not_sure', title: 'not sure' },
      ],
    },
  ],
};

const TOTAL_STEPS = 5; // category + 4 questions

export function QuizFlow() {
  const [category, setCategory] = useState<Category | null>(null);
  const [step, setStep] = useState(0); // 0 = category select, 1-4 = questions
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [finished, setFinished] = useState(false);

  const questions = category ? QUESTIONS[category] : null;
  const currentQuestion = questions ? questions[step - 1] : null;
  const currentAnswer = answers[step];

  const selectCategory = (value: Category) => {
    setCategory(value);
    setAnswers({});
    setStep(1);
  };

  const selectOption = (value: string) => {
    if (!currentQuestion) return;
    if (currentQuestion.multi) {
      setAnswers(prev => {
        const existing = Array.isArray(prev[step]) ? (prev[step] as string[]) : [];
        const next = existing.includes(value) ? existing.filter(v => v !== value) : [...existing, value];
        return { ...prev, [step]: next };
      });
    } else {
      setAnswers(prev => ({ ...prev, [step]: value }));
    }
  };

  const isAnswered = Array.isArray(currentAnswer) ? currentAnswer.length > 0 : !!currentAnswer;

  const goNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      setFinished(true);
    }
  };

  const goBack = () => {
    if (step === 1) {
      setCategory(null);
      setStep(0);
    } else {
      setStep(step - 1);
    }
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

  if (step === 0 || !category || !currentQuestion) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="font-display font-semibold text-sm text-[#00B9F1] bg-[#E6F8FE] rounded-full px-4 py-1.5">
            question
          </span>
          <span className="font-display text-sm text-[#4D4747]">1 of {TOTAL_STEPS}</span>
        </div>
        <h3 className="font-display font-semibold text-[#4D4747] text-[22px] md:text-[26px] leading-snug mb-5 text-center">
          what&rsquo;s your child&rsquo;s main concern?
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => selectCategory(opt.value)}
              className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl bg-white hover:border-[#00B9F1] border border-transparent transition-colors"
            >
              <span className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-neutral-200 hover:border-[#00B9F1]">
                <img src={opt.icon} alt="" className="w-full h-full object-cover" />
              </span>
              <span className="font-display font-semibold text-[#4D4747] text-sm">{opt.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <button onClick={goBack} className="font-display text-sm text-neutral-500 hover:text-neutral-700 mb-2">
        ‹ back
      </button>
      <div className="flex justify-center mb-4">
        <img src={quizMascot} alt="" className="w-20 h-20 md:w-32 md:h-32 object-contain" />
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="font-display font-semibold text-sm text-[#00B9F1] bg-[#E6F8FE] rounded-full px-4 py-1.5">
          question
        </span>
        <span className="font-display text-sm text-[#4D4747]">
          {step + 1} of {TOTAL_STEPS}
        </span>
      </div>
      <h3 className="font-display font-semibold text-[#4D4747] text-[22px] md:text-[26px] leading-snug mt-2 mb-5 text-center">
        {currentQuestion.title}
      </h3>
      <div className="flex flex-col gap-3">
        {currentQuestion.options.map(option => {
          const isSelected = Array.isArray(currentAnswer)
            ? currentAnswer.includes(option.value)
            : currentAnswer === option.value;
          return (
            <button
              key={option.value}
              onClick={() => selectOption(option.value)}
              className={`text-left px-5 py-4 rounded-2xl border transition-colors flex items-center justify-between ${
                isSelected ? 'border-[#00B9F1] bg-[#E6F8FE]' : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <span>
                <span
                  className="font-display font-medium text-[#4D4747] block"
                  style={{ fontSize: 16, lineHeight: '16px', letterSpacing: '-0.05em' }}
                >
                  {option.title}
                </span>
                {option.hint && (
                  <span className="font-display text-sm text-neutral-500 block mt-2">{option.hint}</span>
                )}
              </span>
              {isSelected && <span className="text-[#00B9F1] font-bold">✓</span>}
            </button>
          );
        })}
      </div>
      <button
        onClick={goNext}
        disabled={!isAnswered}
        className={`w-full mt-6 py-3 rounded-full font-display font-semibold text-white transition-all ${
          isAnswered ? 'bg-[#00B9F1] hover:brightness-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
        }`}
      >
        {step < 4 ? 'next question →' : 'see results →'}
      </button>
    </div>
  );
}
