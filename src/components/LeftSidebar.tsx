import { Conversation } from '../types';
import { ShieldCheck, Bookmark } from 'lucide-react';

interface LeftSidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  conversations: Conversation[];
  savedPosts?: number[];
}

export function LeftSidebar({ activeCategory, onCategoryChange, savedPosts = [] }: LeftSidebarProps) {
  return (
    <aside className="sidebar flex flex-col gap-6">
      {/* Saved Posts — the filter/state for this already existed
          (activeCategory === 'saved' in MainContent/App), but nothing in the
          UI ever set it; the bookmark button on a thread had nowhere to send
          you back to. */}
      <button
        type="button"
        onClick={() => onCategoryChange('saved')}
        aria-pressed={activeCategory === 'saved'}
        className={`flex items-center gap-2.5 rounded-3xl p-5 shadow-xs border text-left transition-colors ${
          activeCategory === 'saved'
            ? 'bg-tuco-cyan/10 border-tuco-cyan'
            : 'bg-[#FFFDF9] border-[#F0EAE1] hover:border-tuco-cyan/50'
        }`}
      >
        <Bookmark
          className={`w-5 h-5 shrink-0 ${activeCategory === 'saved' ? 'text-tuco-cyan fill-tuco-cyan' : 'text-neutral-500'}`}
        />
        <span className="font-display font-bold text-sm text-tuco-dark">
          My Saved Posts{savedPosts.length > 0 ? ` (${savedPosts.length})` : ''}
        </span>
      </button>

      {/* Community Guidelines */}
      <div className="bg-[#FFFDF9] border border-[#F0EAE1] rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <h4 className="font-display font-bold text-sm text-tuco-dark text-left">
            Community Guidelines
          </h4>
        </div>
        <ul className="space-y-2.5">
          <li className="flex items-start gap-2.5 text-[11px] text-neutral-600 font-sans font-medium leading-tight">
            <span className="text-[#3DAA73] font-bold">✓</span>
            <span>Keep it kind & helpful</span>
          </li>
          <li className="flex items-start gap-2.5 text-[11px] text-neutral-600 font-sans font-medium leading-tight">
            <span className="text-[#3DAA73] font-bold">✓</span>
            <span>No medical advice</span>
          </li>
          <li className="flex items-start gap-2.5 text-[11px] text-neutral-600 font-sans font-medium leading-tight">
            <span className="text-[#3DAA73] font-bold">✓</span>
            <span>Respect privacy</span>
          </li>
          <li className="flex items-start gap-2.5 text-[11px] text-neutral-600 font-sans font-medium leading-tight">
            <span className="text-[#3DAA73] font-bold">✓</span>
            <span>No spam or promos</span>
          </li>
          <li className="flex items-start gap-2.5 text-[11px] text-neutral-600 font-sans font-medium leading-tight">
            <span className="text-[#3DAA73] font-bold">✓</span>
            <span>Safe for parents & kids</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
