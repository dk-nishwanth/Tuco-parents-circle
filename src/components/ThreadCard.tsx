import { Link } from 'react-router-dom';
import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';
import { Conversation, User } from '../types';
import { getAvatarColor, getInitials, getAuthorMeta, countAllReplies } from '../utils/helpers';
import { AuthorBadges } from './AuthorBadges';
import { TucoVideoCard, findTucoVideoReply, parseYouTubeId } from './TucoVideo';
import {
  Eye,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Bookmark,
  Pin,
  Play,
  Share2,
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

  // Subtitle under the author's name: role label for staff, city otherwise.
  const roleLabel =
    opRole === 'tuco_team' ? 'tuco team' : opRole === 'moderator' ? 'Moderator' : null;
  const authorSubtitle = roleLabel || thread.op.city;

  const tucoVideoReply = findTucoVideoReply(thread);
  const tucoVideoId = tucoVideoReply ? parseYouTubeId(tucoVideoReply.text) : null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.vote-btn') || target.closest('.save-btn') || target.closest('.share-btn') || target.closest('.tuco-video-card')) {
      return;
    }
    onOpen(thread.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // #post-<id> scrolls to the card in the feed (not the modal, which keys off #thread-<id>).
    const url = `${window.location.origin}/${thread.category}#post-${thread.id}`;
    if (navigator.share) {
      navigator.share({ title: thread.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  };

  return (
    <article
      id={`post-${thread.id}`}
      onClick={handleCardClick}
      className="tc w-full bg-white border border-neutral-200 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 hover:shadow-md transition-all cursor-pointer flex gap-2.5 md:gap-4 text-left relative overflow-hidden group scroll-mt-24"
    >
      {/* Category-coloured left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-[6px] pointer-events-none" style={{ backgroundColor: catColor.bg }}></div>

      {/* Vote Box (Left) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-0.5 h-fit bg-[#F8F9FA] rounded-2xl px-1.5 py-2 border border-neutral-200/70"
      >
        <button
          onClick={() => onVote(thread.id, 'up')}
          aria-label="Upvote"
          aria-pressed={votedState === 'up'}
          className={`vote-btn p-1 rounded-lg transition-all ${
            votedState === 'up' ? 'text-tuco-orange' : 'text-[#4D4747] hover:text-tuco-orange'
          }`}
        >
          <ThumbsUp className="w-4 h-4" strokeWidth={2} />
        </button>
        <span className={`font-display font-bold text-[14px] ${
          votedState === 'up' ? 'text-tuco-orange' : votedState === 'down' ? 'text-blue-500' : 'text-[#4D4747]'
        }`}>
          {thread.votes}
        </span>
        <button
          onClick={() => onVote(thread.id, 'down')}
          aria-label="Downvote"
          aria-pressed={votedState === 'down'}
          className={`p-1 rounded-lg transition-colors ${
            votedState === 'down' ? 'text-blue-500' : 'text-[#4D4747] hover:text-blue-500'
          }`}
        >
          <ThumbsDown className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Right Side: Content */}
      <div className="flex-1 min-w-0">
        {/* Category Tag + status badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-2 px-4 py-1 rounded-full" style={{ backgroundColor: catColor.bg, color: catColor.text }}>
            <span className="text-[12px]">{category.icon}</span>
            <span className="text-[11px] font-sans font-medium tracking-tight">
              {category.label}
            </span>
          </div>
          {thread.isPinned && (
            <span className="flex items-center gap-1 bg-[#E7F9FF] text-[#0C447C] text-[10px] font-medium px-2.5 py-1 rounded-full">
              <Pin className="w-3 h-3" strokeWidth={2.5} />
              Pinned
            </span>
          )}
          {tucoVideoId && (
            <span className="flex items-center gap-1 bg-[#FEF1CC] text-[#7A5A00] text-[10px] font-medium px-2.5 py-1 rounded-full">
              <Play className="w-3 h-3 fill-current" strokeWidth={0} />
              Video answer
            </span>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[11px] shadow-sm shrink-0"
            style={{ backgroundColor: getAvatarColor(thread.op.author), color: '#4D4747' }}
          >
            {getInitials(thread.op.author)}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/u/${encodeURIComponent(thread.op.author)}`}
                onClick={e => e.stopPropagation()}
                className="font-display font-bold text-[13px] text-[#4D4747] hover:text-[#35B5EC] hover:underline truncate"
              >
                {thread.op.author}
              </Link>
              <AuthorBadges badges={opBadges} role={opRole} />
            </div>
            {authorSubtitle && (
              <span className="text-[11px] text-neutral-400 font-sans font-medium truncate">
                {authorSubtitle}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="ttitle font-display font-bold text-[17px] text-[#4D4747] leading-tight mb-1.5 group-hover:text-tuco-cyan transition-colors">
          {thread.title}
        </h3>

        {/* Snippet + read more */}
        <p className="tpreview font-sans text-[13px] text-neutral-500 font-medium line-clamp-2 leading-relaxed">
          {thread.op.text}
        </p>
        <button
          onClick={() => onOpen(thread.id)}
          className="block text-[13px] font-sans font-bold text-[#35B5EC] hover:underline mt-1 mb-4 text-left"
        >
          read more
        </button>

        {/* Media — tuco video answer or a single image */}
        {tucoVideoId ? (
          <div className="mb-4 w-full max-w-[300px]">
            <TucoVideoCard
              videoId={tucoVideoId}
              variant="feed-inline"
              caption="Video answer from tuco team"
            />
          </div>
        ) : thread.op.image ? (
          <div className="mb-4">
            <img
              src={thread.op.image}
              alt=""
              loading="lazy"
              className="w-full max-w-[520px] rounded-2xl object-cover max-h-[400px]"
            />
          </div>
        ) : null}

        {/* Footer: time + share / save / replies / views */}
        <div className="pt-3 md:pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
          <span className="text-[10px] md:text-[11px] text-neutral-400 font-sans font-medium shrink-0">{thread.op.time}</span>
          <div className="flex items-center gap-2.5 md:gap-4">
            <button
              className="share-btn hover:text-[#35B5EC] transition-colors"
              aria-label="Share"
              onClick={handleShare}
            >
              <Share2 className="w-[15px] h-[15px] md:w-4 md:h-4 text-[#4D4747]" strokeWidth={2} />
            </button>
            <button
              className="save-btn transition-colors"
              aria-label={isSaved ? 'Remove from saved' : 'Save post'}
              aria-pressed={isSaved}
              onClick={e => {
                e.stopPropagation();
                onSavePost?.(thread.id);
              }}
            >
              {isSaved ? (
                <Bookmark className="w-[15px] h-[15px] md:w-4 md:h-4 text-tuco-orange fill-current" />
              ) : (
                <Bookmark className="w-[15px] h-[15px] md:w-4 md:h-4 text-[#4D4747]" />
              )}
            </button>
            <div className="flex items-center gap-1 md:gap-1.5">
              <MessageSquare className="w-[15px] h-[15px] md:w-4 md:h-4 text-[#4D4747]" strokeWidth={2} />
              <span className="text-[10px] md:text-[11px] font-sans font-medium text-neutral-500 whitespace-nowrap">{countAllReplies(thread.replies)} replies</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5">
              <Eye className="w-[15px] h-[15px] md:w-4 md:h-4 text-[#4D4747]" strokeWidth={2} />
              <span className="text-[10px] md:text-[11px] font-sans font-medium text-neutral-500 whitespace-nowrap">{thread.views || 0} views</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
