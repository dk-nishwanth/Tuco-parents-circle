import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';
import { Conversation, User } from '../types';
import { getAvatarColor, getInitials, getAuthorMeta } from '../utils/helpers';
import { AuthorBadges } from './AuthorBadges';
import {
  Eye,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Bookmark,
  BookmarkCheck,
  Image as ImageIcon,
} from 'lucide-react';
import React from 'react';

interface ThreadCardProps {
  thread: Conversation;
  onOpen: (id: number) => void;
  onVote: (id: number, type: 'up' | 'down') => void;
  onSavePost?: (id: number) => void;
  isSaved?: boolean;
  votedState?: 'up' | 'down' | null;
  users?: Record<string, User>;
  onJoinClick?: () => void;
  isLoggedIn?: boolean;
}

export function ThreadCard({
  thread,
  onOpen,
  onVote,
  onSavePost,
  isSaved,
  votedState,
  users = {},
  onJoinClick,
  isLoggedIn = false,
}: ThreadCardProps) {
  const category = CATEGORIES[thread.category] || { icon: '💬', label: 'General', id: 'general' };
  const catColor = CATEGORY_COLORS[thread.category] || {
    bg: '#FFF0E8',
    text: '#D84315',
    border: '#FFD8C2',
  };

  const authorMeta = getAuthorMeta(thread.op.author, thread.authorId, users);
  const opRole = thread.op.authorRole ?? authorMeta.role;
  const opBadges = thread.op.authorBadges ?? authorMeta.badges;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.vote-btn') || target.closest('.save-btn')) {
      return;
    }
    onOpen(thread.id);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`tc w-full bg-white border border-neutral-200 rounded-[2rem] p-5 md:p-7 hover:shadow-md transition-all cursor-pointer flex gap-4 md:gap-6 text-left relative overflow-hidden group`}
    >
      {/* Branded Left Edge */}
      <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#FFE259] pointer-events-none"></div>

      {/* Vote Box (Left) */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center justify-center bg-[#F8F9FA] rounded-2xl px-2.5 py-4 h-fit min-w-[48px] border border-neutral-200"
      >
        <button
          onClick={() => onVote(thread.id, 'up')}
          className={`vote-btn p-1.5 rounded-xl transition-all ${
            votedState === 'up' ? 'text-tuco-orange' : 'text-[#4D4747] hover:text-tuco-orange'
          }`}
        >
          <ThumbsUp className="w-4 h-4" strokeWidth={2} />
        </button>
        <span className={`font-display font-bold text-[15px] my-2 ${
          votedState === 'up' ? 'text-tuco-orange' : votedState === 'down' ? 'text-blue-500' : 'text-[#4D4747]'
        }`}>
          {thread.votes}
        </span>
        <button
          onClick={() => onVote(thread.id, 'down')}
          className={`p-1 rounded-full transition-colors ${
            votedState === 'down' ? 'text-blue-500' : 'text-[#4D4747] hover:text-blue-500'
          }`}
        >
          <ThumbsDown className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

        {/* Right Side: Content */}
        <div className="flex-1 min-w-0">
          {/* Category Tag (Top) */}
          <div className="flex justify-start mb-2.5">
            <div className="flex items-center gap-2 px-4 py-1 rounded-full shadow-sm" style={{ backgroundColor: catColor.bg, color: catColor.text, borderColor: catColor.border }}>
              <span className="text-[12px]">{category.icon}</span>
              <span className="text-[11px] font-sans font-medium tracking-tight">
                {category.label}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="ttitle font-display font-bold text-[17px] text-[#4D4747] leading-tight mb-1.5 group-hover:text-tuco-cyan transition-colors">
            {thread.title}
          </h3>

          {/* Snippet */}
          <p className="tpreview font-sans text-[13px] text-neutral-500 font-medium line-clamp-2 mb-5 leading-relaxed">
            {thread.op.text}
          </p>

          {/* User Info Row */}
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-display font-bold text-[10px] shadow-sm"
              style={{ backgroundColor: getAvatarColor(thread.op.author), color: '#4D4747' }}
            >
              {getInitials(thread.op.author)}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-sans font-medium text-[#4D4747]">By {thread.op.author}</span>
              <AuthorBadges badges={opBadges} role={opRole} />
              {!isLoggedIn && (
                <span
                  onClick={e => { e.stopPropagation(); onJoinClick?.(); }}
                  className="bg-[#E7F9FF] text-[10px] text-[#4D4747] font-sans font-medium uppercase px-2.5 py-0.5 rounded-md border border-[#E7F9FF]/10 shadow-sm cursor-pointer hover:bg-[#35B5EC] hover:text-white transition-colors"
                >
                  Join now
                </span>
              )}
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-4">
            <button
              className="save-btn flex items-center gap-1 transition-colors p-1"
              onClick={e => {
                e.stopPropagation();
                onSavePost?.(thread.id);
              }}
            >
              {isSaved ? (
                <Bookmark className="w-4 h-4 text-tuco-orange fill-current" />
              ) : (
                <Bookmark className="w-4 h-4 text-[#4D4747]" />
              )}
            </button>
            <div className="flex items-center gap-1.5 text-[#4D4747]">
              <MessageSquare className="w-4 h-4 text-[#4D4747]" strokeWidth={2} />
              <span className="text-[11px] font-sans font-medium text-neutral-500">{thread.replies.length} Replies</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#4D4747]">
              <Eye className="w-4 h-4 text-[#4D4747]" strokeWidth={2} />
              <span className="text-[11px] font-sans font-medium text-neutral-500">{thread.views || 691} Views</span>
            </div>
          </div>
        </div>
    </article>
  );
}
