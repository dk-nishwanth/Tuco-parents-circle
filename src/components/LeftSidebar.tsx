import { Conversation } from '../types';
import { ShieldCheck } from 'lucide-react';

interface LeftSidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  conversations: Conversation[];
  savedPosts?: number[];
}

export function LeftSidebar(_props: LeftSidebarProps) {
  return (
    <aside className="sidebar flex flex-col gap-6">
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
