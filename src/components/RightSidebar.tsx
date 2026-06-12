import { Conversation } from '../types';
import { Flame, Sparkles } from 'lucide-react';
import mascot from '../assets/mascot.png';

interface RightSidebarProps {
  onTrendingClick: (id: number) => void;
  featuredThreads?: Conversation[];
  onFeaturedClick?: (id: number) => void;
  variant?: 'sidebar' | 'carousel';
  conversations?: Conversation[];
}

export function RightSidebar({
  onTrendingClick,
  featuredThreads = [],
  onFeaturedClick,
  variant = 'sidebar',
  conversations = [],
}: RightSidebarProps) {
  const isCarousel = variant === 'carousel';

  const approvedConvs = conversations.filter(c => c.moderationStatus === 'approved');

  const trendingThreads = [...approvedConvs]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3);

  const spotlightThreads = [...approvedConvs]
    .filter(c => c.isFeatured || c.votes > 50)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 2);

  const containerClasses = isCarousel
    ? "flex overflow-x-auto pb-6 pt-2 gap-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 items-stretch"
    : "flex flex-col gap-6";

  const itemClasses = isCarousel
    ? "min-w-[240px] max-w-[280px] shrink-0 snap-center flex flex-col"
    : "flex flex-col";

  return (
    <aside className={isCarousel ? "relative w-full" : "rsidebar"}>
      <div className={containerClasses}>
        {/* Card 1: Welcome */}
        <div className={`${itemClasses} bg-[#E7F9FF] border border-neutral-200 rounded-2xl p-5 shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <img src={mascot} alt="tuco Mascot" className="w-10 h-10 object-contain" />
            <h4 className="font-display font-bold text-lg text-[#4D4747]">
              Welcome!
            </h4>
          </div>
          <p className="font-sans text-[13px] text-[#4D4747] font-medium leading-relaxed">
            Welcome to the tuco Parents Circle—a community where parents come together to share experiences, ask questions, and learn from one another. Whether you're looking for parenting tips, advice for new moms, or guidance on choosing the right products for your child, you'll find support from parents who understand the journey.
          </p>
        </div>

        {/* Card 2: Member Spotlight */}
        {spotlightThreads.length > 0 && (
          <div className={`${itemClasses} bg-[#E7F9FF] border border-neutral-200 rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#4D4747]" strokeWidth={2} />
              <h4 className="font-display font-bold text-xs text-[#4D4747] uppercase">
                MEMBER SPOTLIGHT
              </h4>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium mb-4">
              Featured community voices
            </p>
            <div className="flex flex-col gap-4">
              {spotlightThreads.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 cursor-pointer"
                  onClick={() => onTrendingClick(item.id)}
                >
                  <p className="font-display font-bold text-[12px] text-[#4D4747] leading-snug line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    By {item.op.author} 🌟
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card 3: Trending Now */}
        {trendingThreads.length > 0 && (
          <div className={`${itemClasses} bg-[#E7F9FF] border border-neutral-200 rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-[#4D4747]" strokeWidth={2} />
              <h4 className="font-display font-bold text-xs text-[#4D4747] uppercase">
                TRENDING NOW
              </h4>
            </div>
            <div className="space-y-4">
              {trendingThreads.map((trend, idx) => (
                <div
                  key={trend.id}
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => onTrendingClick(trend.id)}
                >
                  <span className="font-display font-bold text-sm text-[#4D4747] leading-none pt-0.5">
                    #{idx + 1}
                  </span>
                  <p className="font-display font-bold text-[12px] text-[#4D4747] line-clamp-2 leading-snug">
                    {trend.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
