import { TRENDING } from '../data/products';
import { Conversation } from '../types';
import { Flame, Instagram, TrendingUp } from 'lucide-react';
interface RightSidebarProps {
  onTrendingClick: (id: number) => void;
  featuredThreads?: Conversation[];
  onFeaturedClick?: (id: number) => void;
}
export function RightSidebar({
  onTrendingClick,
  featuredThreads = [],
  onFeaturedClick,
}: RightSidebarProps) {
  return (
    <aside className="rsidebar flex flex-col gap-6">
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">👋</span>
          <h4 className="font-display font-black text-base text-neutral-800 leading-tight">
            Welcome, Parents!
          </h4>
        </div>
        <p className="font-sans text-xs text-neutral-600 leading-relaxed font-semibold">
          Tuco Parents Circle is a safe, judgment-free space to ask questions, share experiences and
          support each other. Hindi, Hinglish & regional languages welcome.
        </p>
      </div>
      {featuredThreads.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-3xl p-5 shadow-xs">
          <h4 className="font-display font-black text-neutral-800 text-xs uppercase tracking-wider mb-3 pb-2 border-b border-purple-100 flex items-center gap-1.5">
            <Instagram className="w-4 h-4 text-purple-600" />
            Circle Mom of the Month
          </h4>
          <p className="text-[10px] text-neutral-500 font-medium mb-3">
            Featured on @tucokids Instagram — celebrate community voices
          </p>
          <div className="flex flex-col gap-2">
            {featuredThreads.map(t => (
              <button
                key={t.id}
                onClick={() => onFeaturedClick?.(t.id)}
                className="text-left p-2.5 rounded-xl bg-white/80 border border-purple-100 hover:border-purple-300 transition-all group"
              >
                <p className="font-display font-bold text-xs text-neutral-800 group-hover:text-purple-700 line-clamp-2">
                  {t.title}
                </p>
                <p className="text-[10px] text-neutral-400 font-bold mt-1">
                  by {t.op.author} · {t.replies.length} replies
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
        <h4 className="font-display font-black text-neutral-800 text-xs uppercase tracking-wider mb-3.5 pb-2 border-b border-neutral-100 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-tuco-cyan" />
          Community Stats
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-2.5 text-center">
            <div className="font-display font-black text-lg text-tuco-orange">14.2k</div>
            <div className="font-sans text-[9px] text-neutral-500 font-bold uppercase tracking-wide">
              Active Parents
            </div>
          </div>
          <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-2.5 text-center">
            <div className="font-display font-black text-lg text-emerald-600">3.8k</div>
            <div className="font-sans text-[9px] text-neutral-500 font-bold uppercase tracking-wide">
              Safe Answers
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs text-left">
        <h4 className="font-display font-black text-neutral-800 text-xs uppercase tracking-wider mb-3 pb-2 border-b border-neutral-100 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-tuco-orange" />
          Trending Now
        </h4>
        <div className="flex flex-col">
          {TRENDING.map((trend, idx) => (
            <div
              key={trend.id}
              className={`trend-item flex gap-3 py-2.5 cursor-pointer group leading-tight hover:translate-x-[2px] transition-all ${
                idx === TRENDING.length - 1 ? '' : 'border-b border-neutral-100'
              }`}
              onClick={() => onTrendingClick(trend.id)}
            >
              <span className="font-display font-black text-base text-neutral-300 group-hover:text-tuco-cyan transition-colors select-none">
                {trend.rank}
              </span>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs md:text-sm text-neutral-700 group-hover:text-tuco-cyan truncate transition-colors line-clamp-1">
                  {trend.title}
                </div>
                <div className="font-sans text-[10px] font-bold text-neutral-400 mt-0.5">
                  {trend.meta}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
