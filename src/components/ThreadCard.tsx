import { Link } from 'react-router-dom';
import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';
import { Conversation, User } from '../types';
import { getAvatarColor, getInitials, getAuthorMeta, countAllReplies, formatTimeAgo } from '../utils/helpers';
import { AuthorBadges } from './AuthorBadges';
import { TucoVideoCard, findTucoVideoReply, parseYouTubeId } from './TucoVideo';
import {
  Eye,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Bookmark,
  Heart,
  Send,
  Pin,
  Play,
  MoreHorizontal,
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

  const tucoVideoReply = findTucoVideoReply(thread);
  const tucoVideoId = tucoVideoReply ? parseYouTubeId(tucoVideoReply.text) : null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.vote-btn') || target.closest('.save-btn') || target.closest('.tuco-video-card')) {
      return;
    }
    onOpen(thread.id);
  };

  if (tucoVideoId) {
    return (
      <article
        onClick={handleCardClick}
        className="tc tc-video w-full bg-white border border-neutral-200 rounded-[2rem] hover:shadow-md transition-all cursor-pointer text-left relative overflow-hidden group"
      >
        {/* Header: badges + author + more */}
        <div className="px-5 md:px-6 pt-5 pb-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full shadow-sm"
              style={{ backgroundColor: catColor.bg, color: catColor.text, borderColor: catColor.border }}
            >
              <span className="text-[12px]">{category.icon}</span>
              <span className="text-[11px] font-sans font-medium tracking-tight">{category.label}</span>
            </div>
            {thread.isPinned ? (
              <span className="flex items-center gap-1 bg-[#E7F9FF] text-[#0C447C] text-[10px] font-medium px-2.5 py-1 rounded-full">
                <Pin className="w-3 h-3" strokeWidth={2.5} />
                Pinned
              </span>
            ) : null}
            <span className="flex items-center gap-1 bg-[#FEF1CC] text-[#7A5A00] text-[10px] font-medium px-2.5 py-1 rounded-full">
              <Play className="w-3 h-3 fill-current" strokeWidth={0} />
              Video answer
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-[12px] shadow-sm"
              style={{ backgroundColor: getAvatarColor(thread.op.author), color: '#4D4747' }}
            >
              {getInitials(thread.op.author)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[13px]">
                <Link
                  to={`/u/${encodeURIComponent(thread.op.author)}`}
                  onClick={e => e.stopPropagation()}
                  className="font-sans font-medium text-[#4D4747] hover:text-[#35B5EC] hover:underline"
                >
                  {thread.op.author}
                </Link>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500 text-[12px]">{thread.op.city}</span>
                <AuthorBadges badges={opBadges} role={opRole} />
              </div>
              <div className="text-[11px] text-neutral-400">{formatTimeAgo(thread.op.time)}</div>
            </div>
            <button
              type="button"
              aria-label="More"
              onClick={e => e.stopPropagation()}
              className="text-neutral-400 hover:text-neutral-600 p-1"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Title + OP snippet */}
        <div className="px-5 md:px-6 pb-3">
          <h3 className="ttitle font-display font-bold text-[16px] text-[#4D4747] leading-snug mb-1 group-hover:text-tuco-cyan transition-colors">
            {thread.title}
          </h3>
          <p className="tpreview font-sans text-[13px] text-neutral-500 font-medium line-clamp-2 leading-relaxed">
            {thread.op.text}
          </p>
        </div>

        {/* Full-bleed video */}
        <TucoVideoCard
          videoId={tucoVideoId}
          variant="feed-fullbleed"
          caption="Video answer from tuco team"
        />

        {/* Instagram-style action row */}
        <div className="px-5 md:px-6 pt-3">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => onVote(thread.id, 'up')}
              aria-label="Upvote"
              aria-pressed={votedState === 'up'}
              className="vote-btn hover:scale-110 transition-transform"
            >
              <Heart
                className={`w-6 h-6 ${votedState === 'up' ? 'text-red-500 fill-red-500' : 'text-[#4D4747]'}`}
                strokeWidth={1.75}
              />
            </button>
            <button
              onClick={() => onOpen(thread.id)}
              aria-label="Comments"
              className="hover:scale-110 transition-transform"
            >
              <MessageSquare className="w-6 h-6 text-[#4D4747]" strokeWidth={1.75} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                const url = `${window.location.origin}/${thread.category}#thread-${thread.id}`;
                if (navigator.share) {
                  navigator.share({ title: thread.title, url }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(url).catch(() => {});
                }
              }}
              aria-label="Share"
              className="hover:scale-110 transition-transform"
            >
              <Send className="w-6 h-6 text-[#4D4747]" strokeWidth={1.75} />
            </button>
            <div className="flex-1" />
            <button
              className="save-btn hover:scale-110 transition-transform"
              aria-label={isSaved ? 'Remove from saved' : 'Save post'}
              aria-pressed={isSaved}
              onClick={e => {
                e.stopPropagation();
                onSavePost?.(thread.id);
              }}
            >
              <Bookmark
                className={`w-6 h-6 ${isSaved ? 'text-tuco-orange fill-tuco-orange' : 'text-[#4D4747]'}`}
                strokeWidth={1.75}
              />
            </button>
          </div>

          <div className="text-[12px] font-sans text-[#4D4747] mb-2">
            <span className="font-bold">{thread.votes} helpful</span>
            <span className="text-neutral-400"> · </span>
            <span className="font-bold">{countAllReplies(thread.replies)} replies</span>
            <span className="text-neutral-400"> · </span>
            <span className="text-neutral-500">{thread.views || 0} views</span>
          </div>

          <div className="pb-4">
            <button
              onClick={() => onOpen(thread.id)}
              className="text-[12px] font-sans font-medium text-[#35B5EC] hover:underline"
            >
              Open thread to read all replies →
            </button>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onJoinClick?.(); }}
                className="ml-3 bg-[#E7F9FF] text-[10px] text-[#4D4747] font-sans font-medium uppercase px-2.5 py-0.5 rounded-md border border-[#E7F9FF]/10 shadow-sm cursor-pointer hover:bg-[#35B5EC] hover:text-white transition-colors"
              >
                Join now
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

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
          aria-label="Upvote"
          aria-pressed={votedState === 'up'}
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
          aria-label="Downvote"
          aria-pressed={votedState === 'down'}
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
              <span className="text-[12px] font-sans font-medium text-[#4D4747]">
                By{' '}
                <Link
                  to={`/u/${encodeURIComponent(thread.op.author)}`}
                  onClick={e => e.stopPropagation()}
                  className="hover:text-[#35B5EC] hover:underline"
                >
                  {thread.op.author}
                </Link>
              </span>
              <AuthorBadges badges={opBadges} role={opRole} />
              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onJoinClick?.(); }}
                  className="bg-[#E7F9FF] text-[10px] text-[#4D4747] font-sans font-medium uppercase px-2.5 py-0.5 rounded-md border border-[#E7F9FF]/10 shadow-sm cursor-pointer hover:bg-[#35B5EC] hover:text-white transition-colors"
                >
                  Join now
                </button>
              )}
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-4">
            <button
              className="save-btn flex items-center gap-1 transition-colors p-1"
              aria-label={isSaved ? 'Remove from saved' : 'Save post'}
              aria-pressed={isSaved}
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
              <span className="text-[11px] font-sans font-medium text-neutral-500">{countAllReplies(thread.replies)} Replies</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#4D4747]">
              <Eye className="w-4 h-4 text-[#4D4747]" strokeWidth={2} />
              <span className="text-[11px] font-sans font-medium text-neutral-500">{thread.views || 0} Views</span>
            </div>
          </div>
        </div>
    </article>
  );
}
