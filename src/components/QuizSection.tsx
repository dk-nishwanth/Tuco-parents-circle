import quizGirlImage from '../assets/quiz-hair-girl.png';

const QUIZ_URL = 'https://tucokids.com/pages/standalone-quiz';

export function QuizSection() {
  return (
    <div className="rounded-3xl bg-white border border-neutral-200 shadow-sm px-4 md:px-10 py-8 md:py-10">
      <div className="flex flex-col md:flex-row items-center md:gap-12">
        <img
          src={quizGirlImage}
          alt="Know your child's skin"
          className="w-56 h-56 md:w-64 md:h-64 object-contain flex-shrink-0"
        />
        <div className="flex flex-col items-center md:items-start mt-6 md:mt-0">
          <h2 className="font-brand font-normal text-[#4D4747] text-[36px] md:text-[40px] leading-none tracking-[-0.05em] text-center md:text-center">
            know your
            <br />
            child&rsquo;s skin
          </h2>
          <p className="font-display font-normal text-neutral-700 text-[16px] md:text-[24px] leading-none tracking-[-0.05em] text-center md:text-center mt-4 max-w-xs md:max-w-sm">
            take our quiz to find out what products will suit your child&rsquo;s skin concern
          </p>
          <a
            href={QUIZ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 px-8 py-3 rounded-full text-white font-display font-normal text-[16px] md:text-[24px] leading-none tracking-[-0.05em] text-center md:text-right hover:brightness-95 transition-all"
            style={{ backgroundColor: '#00B9F1' }}
          >
            take the quiz
          </a>
        </div>
      </div>
    </div>
  );
}
