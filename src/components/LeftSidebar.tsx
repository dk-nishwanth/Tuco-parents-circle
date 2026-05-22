import { CATEGORIES } from '../data/categories';
import { Conversation } from '../types';
import { Home, ShieldCheck, Bookmark } from 'lucide-react';

interface LeftSidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  conversations: Conversation[];
  savedPosts?: number[];
}

export function LeftSidebar({ activeCategory, onCategoryChange, conversations, savedPosts = [] }: LeftSidebarProps) {
  // Compute thread count dynamically for each category
  const getThreadCount = (catId: string) => {
    return conversations.filter((c) => c.category === catId).length;
  };

  return (
    <aside className="sidebar flex flex-col gap-6">
      {/* Category Selection Panel */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="bg-neutral-50 px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
          <span className="font-display font-black text-tuco-dark text-xs uppercase tracking-wider">
            🌿 Categories
          </span>
          <span className="font-mono text-[10px] bg-tuco-cyan/10 border border-tuco-cyan/30 text-tuco-cyan py-0.5 px-2.5 rounded-full font-black">
            {conversations.length} topics
          </span>
        </div>

        <div className="flex flex-col">
          {/* All topics */}
          <button
            onClick={() => onCategoryChange('all')}
            className={`cat-row flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-neutral-50 transition-all cursor-pointer font-display font-black text-sm border-b border-neutral-100 ${
              activeCategory === 'all'
                ? 'bg-tuco-cyan text-white hover:bg-tuco-cyan-hover'
                : 'text-tuco-cyan'
            }`}
          >
            <Home className="w-4 h-4 shrink-0 font-bold" />
            <span className="flex-1">All Discussions</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                activeCategory === 'all' ? 'bg-white border-white text-tuco-cyan' : 'bg-neutral-100 border-neutral-200 text-neutral-500'
              }`}
            >
              {conversations.length}
            </span>
          </button>

          {/* Saved posts */}
          <button
            onClick={() => onCategoryChange('saved')}
            className={`cat-row flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-neutral-50 transition-all cursor-pointer font-display font-black text-sm border-b border-neutral-100 ${
              activeCategory === 'saved'
                ? 'bg-tuco-cyan text-white hover:bg-tuco-cyan-hover'
                : 'text-tuco-cyan'
            }`}
          >
            <Bookmark className="w-4 h-4 shrink-0 font-bold" />
            <span className="flex-1">Saved</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                activeCategory === 'saved' ? 'bg-white border-white text-tuco-cyan' : 'bg-neutral-100 border-neutral-200 text-neutral-500'
              }`}
            >
              {savedPosts.length}
            </span>
          </button>

          {/* Individual categories */}
          {Object.values(CATEGORIES).map((cat, idx, arr) => {
            const isLast = idx === arr.length - 1;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`cat-row flex items-center gap-3.5 w-full text-left px-5 py-2.5 hover:bg-neutral-50/70 transition-all cursor-pointer font-sans font-bold text-xs md:text-sm ${
                  isLast ? '' : 'border-b border-neutral-100'
                } ${
                  isSelected
                    ? 'bg-[#EBF7FD] text-tuco-cyan font-black border-l-4 border-l-tuco-cyan'
                    : 'text-neutral-600'
                }`}
              >
                <span className="text-lg shrink-0 leading-none">{cat.icon}</span>
                <span className="flex-1 truncate">{cat.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black font-mono border ${
                  isSelected ? 'bg-tuco-cyan text-white border-tuco-cyan' : 'bg-neutral-50 text-neutral-400 border-neutral-200/50'
                }`}>
                  {getThreadCount(cat.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules Box Panel */}
      <div className="bg-[#FFFDF9] border border-[#F0EAE1] rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <h4 className="font-display font-black text-sm text-tuco-dark text-left">
            Community Rules
          </h4>
        </div>
        <ul className="text-left font-sans text-xs text-neutral-600 space-y-2.5 leading-relaxed">
          <li className="flex items-start gap-1.5">
            <span className="text-[#3DAA73] font-black">✓</span>
            <span>Be kind, supportive & helpful.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#3DAA73] font-black">✓</span>
            <span>Share real daily parenting tips.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#3DAA73] font-black">✓</span>
            <span>No toxic chemicals — clean only.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#3DAA73] font-black">✓</span>
            <span>Respect skincare preferences.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#3DAA73] font-black">✓</span>
            <span>Avoid spam or unsolicited selling.</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
