import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';
import { Conversation, User } from '../types';
import { getAvatarColor, getInitials, getAuthorMeta } from '../utils/helpers';
import { AuthorBadges } from './AuthorBadges';
import { Eye, MessageSquare, ThumbsDown, ThumbsUp, Bookmark, BookmarkCheck, Image as ImageIcon } from 'lucide-react';
import React from 'react';
interface ThreadCardProps {
  thread: Conversation;
  onOpen: (id: number) => void;
  onVote: (id: number, type: 'up' | 'down') => void;
  onSavePost?: (id: number) => void;
  isSaved?: boolean;
  votedState?: 'up' | 'down' | null;
  users?: Record<string, User>;
}
export function ThreadCard({
  thread,
  onOpen,
  onVote,
  onSavePost,
  isSaved,
  votedState,
  users = {},
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
      className={`tc w-full bg-white border border-neutral-200/90 rounded-3xl p-5 hover:shadow-md hover:border-neutral-300 active:scale-99 transition-all cursor-pointer flex gap-4 md:gap-5 text-left relative overflow-hidden group ${
        thread.isPinned ? 'bg-[#FFFAF7]' : ''
      }`}
    >
      {}
      {thread.isPinned && (
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-tuco-orange pointer-events-none"></div>
      )}
      {thread.isHot && !thread.isPinned && (
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-tuco-cyan pointer-events-none"></div>
      )}
      {}
      <div className="votes flex flex-col items-center justify-start gap-1 p-1 bg-neutral-50 border border-neutral-200/60 rounded-2xl shrink-0 h-fit self-start min-w-[40px]">
        <button
          onClick={e => {
            e.stopPropagation();
            onVote(thread.id, 'up');
          }}
          className={`vote-btn p-1.5 rounded-xl active:scale-95 transition-all text-neutral-500 cursor-pointer ${
            votedState === 'up'
              ? 'bg-[#EAF7F0] text-[#1D6F42]'
              : 'hover:bg-tuco-cyan/10 hover:text-tuco-cyan'
          }`}
          title="Upvote"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <span className="vcount font-display font-black text-xs text-neutral-700 select-none">
          {thread.votes}
        </span>
        <button
          onClick={e => {
            e.stopPropagation();
            onVote(thread.id, 'down');
          }}
          className={`vote-btn p-1.5 rounded-xl active:scale-95 transition-all text-neutral-500 cursor-pointer ${
            votedState === 'down'
              ? 'bg-[#FDF2F2] text-[#9B1C1C]'
              : 'hover:bg-neutral-200 hover:text-tuco-orange'
          }`}
          title="Downvote"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
      {}
      <div className="tbody flex-1 min-w-0">
        <div className="tmeta flex flex-wrap items-center gap-2 mb-2 sm:mb-2 text-xs">
          <span
            className="cbadge font-display font-black text-[10px] tracking-wide uppercase py-1 px-3 rounded-full border"
            style={{
              backgroundColor: catColor.bg,
              color: catColor.text,
              borderColor: catColor.border,
            }}
          >
            {category.icon} {category.label}
          </span>
          {thread.isPinned && (
            <span className="pin-badge font-display font-black text-[9px] bg-tuco-orange text-white py-0.5 px-2 rounded-full">
              📌 pinned
            </span>
          )}
          {thread.isHot && (
            <span className="hot-badge font-display font-black text-[9px] bg-tuco-yellow text-tuco-dark py-0.5 px-2 rounded-full border border-neutral-200/65">
              🔥 hot discussion
            </span>
          )}
          {thread.isFeatured && (
            <span className="font-display font-black text-[9px] bg-purple-100 text-purple-700 py-0.5 px-2 rounded-full border border-purple-200">
              ⭐ {thread.featuredLabel || 'Featured'}
            </span>
          )}
          <span className="font-mono text-[10px] font-bold text-neutral-400 ml-auto hidden sm:inline-block">
            {thread.op.time}
          </span>
        </div>
        {}
        <h3 className="ttitle font-display font-black text-[15px] md:text-base text-neutral-850 leading-snug tracking-tight mb-1.5 group-hover:text-tuco-cyan transition-colors">
          {thread.title}
        </h3>
        {}
        <p className="tpreview font-sans text-xs md:text-sm text-neutral-500 leading-relaxed font-medium line-clamp-1 pr-2">
          {thread.op.text}
        </p>
        {}
        <div className="tstats flex flex-wrap items-center gap-x-4 gap-y-2 mt-3.5 pt-3 border-t border-neutral-100 text-xs text-neutral-400 font-bold font-sans">
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center font-display font-extrabold text-[9px] text-white border border-white shrink-0"
              style={{ backgroundColor: getAvatarColor(thread.op.author) }}
            >
              {getInitials(thread.op.author)}
            </div>
            <span className="flex items-center gap-1">
              by <span className="text-tuco-orange font-black">{thread.op.author}</span>
              <AuthorBadges badges={opBadges} role={opRole} />
            </span>
            <span className="bg-[#FFF5F0] font-display text-[9px] text-tuco-orange font-black uppercase border border-tuco-orange/15 px-1.5 rounded-sm scale-90">
              {thread.op.city}
            </span>
          </div>
          <div className="flex items-center gap-2.5 ml-auto text-[11px] font-bold">
            <button
              className="save-btn flex items-center gap-1 hover:text-tuco-orange transition-colors p-1 rounded"
              onClick={e => {
                e.stopPropagation();
                onSavePost?.(thread.id);
              }}
              title={isSaved ? 'Unsave thread' : 'Save thread'}
            >
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-tuco-orange" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-neutral-400" />
              )}
            </button>
            <div className="flex items-center gap-1 hover:text-tuco-cyan transition-colors">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
              <span>{thread.replies.length} replies</span>
            </div>
            {thread.op.image && (
              <div className="flex items-center gap-1 text-tuco-cyan">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>{thread.views} views</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
