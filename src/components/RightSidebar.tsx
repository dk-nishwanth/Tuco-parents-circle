import { TRENDING } from '../data/products';
import { Conversation } from '../types';
import { Flame, Instagram, TrendingUp, Heart, Users, Sparkles } from 'lucide-react';

interface RightSidebarProps {
  onTrendingClick: (id: number) => void;
  featuredThreads?: Conversation[];
  onFeaturedClick?: (id: number) => void;
  variant?: 'sidebar' | 'carousel';
}

export function RightSidebar({
  onTrendingClick,
  featuredThreads = [],
  onFeaturedClick,
  variant = 'sidebar',
}: RightSidebarProps) {
  const isCarousel = variant === 'carousel';

  const containerClasses = isCarousel
    ? "flex overflow-x-auto pb-6 pt-2 gap-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 items-stretch"
    : "flex flex-col gap-6 md:gap-8 mb-6 lg:mb-0";

  const itemClasses = isCarousel
    ? "min-w-[240px] max-w-[280px] shrink-0 snap-center flex flex-col"
    : "flex flex-col";

  return (
    <aside className={isCarousel ? "relative w-full" : "rsidebar"}>
      <div className={containerClasses}>
        {/* Card 1: Welcome */}
        <div className={`${itemClasses} bg-white border border-neutral-200 rounded-[2.5rem] p-6 shadow-sm relative group`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">👋</span>
            <h4 className="font-display font-bold text-lg text-neutral-800 tracking-tight">
              HELLO!
            </h4>
          </div>
          <p className="font-sans text-[13px] text-neutral-600 leading-relaxed font-bold mb-6">
            Tuco Circle is your safe, judgment-free space to share and support.
          </p>
          <div className="mt-auto">
            <p className="font-sans text-[12px] text-neutral-400 font-bold">
              Hindi & English Welcome
            </p>
          </div>
        </div>

        {/* Card 2: Member Spotlight (Mom of Month style) */}
        <div className={`${itemClasses} bg-[#FAF5FF] border border-purple-200 rounded-[2.5rem] p-6 shadow-sm relative group`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <Instagram className="w-5 h-5 text-purple-600" strokeWidth={2} />
            </div>
            <h4 className="font-display font-bold text-sm text-neutral-800 tracking-wide uppercase">
              MEMBER SPOTLIGHT
            </h4>
          </div>
          
          <p className="text-[11px] text-purple-400 font-bold mb-4 ml-11">
            Featured community voices
          </p>
          
          <div className="flex flex-col gap-3">
            {[
              { author: "Sneha V.", title: "Dry flaky patches on 5yo?", replies: "3 replies" },
              { author: "Deepika S.", title: "Best summer spots in India?", replies: "2 replies" }
            ].map((mom, i) => (
              <button key={i} className="bg-white p-4 rounded-2xl shadow-xs text-left group/item border border-white hover:border-purple-200 transition-all">
                <p className="font-display font-extrabold text-[12px] text-neutral-800 line-clamp-2 leading-tight mb-1.5">
                  {mom.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 font-bold italic">By {mom.author}</span>
                  <span className="text-[10px] text-purple-500 font-bold">Featured 🌟</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Card 3: Live Stats (Community Stats style) */}
        <div className={`${itemClasses} bg-white border border-neutral-200 rounded-[2.5rem] p-6 shadow-sm relative group`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-tuco-cyan" strokeWidth={2} />
            </div>
            <h4 className="font-display font-bold text-sm text-neutral-800 tracking-wide uppercase">
              LIVE STATS
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-neutral-50/50 p-4 rounded-2xl border border-neutral-50 text-center">
              <div className="font-display font-bold text-xl text-tuco-orange leading-tight">14.2k</div>
              <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight mt-1">Active Parents</div>
            </div>
            <div className="bg-neutral-50/50 p-4 rounded-2xl border border-neutral-50 text-center">
              <div className="font-display font-bold text-xl text-tuco-cyan leading-tight">3.8k</div>
              <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight mt-1">Safe Answers</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <div className="flex -space-x-1.5">
              {[1,2,3].map(i => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-neutral-200" />
              ))}
            </div>
            <p className="text-[10px] text-neutral-400 font-bold italic">+24 Today</p>
          </div>
        </div>

        {/* Card 4: Trending Now */}
        <div className={`${itemClasses} bg-white border border-neutral-200 rounded-[2.5rem] p-6 shadow-sm relative group`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center">
              <Flame className="w-5 h-5 text-tuco-orange" strokeWidth={2} />
            </div>
            <h4 className="font-display font-bold text-sm text-neutral-800 tracking-wide uppercase">
              TRENDING NOW
            </h4>
          </div>
          
          <div className="space-y-4">
            {[
              { id: 1, title: "Best sunscreen for outdoor cricket this summer?" },
              { id: 2, title: "Toddler refuses all vegetables — help!" },
              { id: 3, title: "4-year-old won't sleep before 11 PM" }
            ].map((trend, idx) => (
              <div
                key={trend.id}
                className="flex items-start gap-3 cursor-pointer group/item"
                onClick={() => onTrendingClick(trend.id)}
              >
                <span className="font-display font-bold text-sm text-tuco-cyan leading-none pt-0.5">
                  #{idx + 1}
                </span>
                <p className="font-display font-bold text-[12px] text-neutral-700 group-hover:text-tuco-cyan line-clamp-2 transition-colors leading-snug">
                  {trend.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
