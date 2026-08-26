import { Link } from 'react-router-dom';
import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';
import { Conversation, User } from '../types';
import { getAvatarColor, getInitials, getAuthorMeta, countAllReplies } from '../utils/helpers';
import { threadShareUrl } from '../utils/slug';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import React, { useRef, useState } from 'react';

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
  variant?: 'default' | 'highlighted';
}

export function ThreadCard({
  thread,
  onOpen,
  onVote,
  onSavePost,
  isSaved,
  votedState,
  users = {},
  variant = 'default',
}: ThreadCardProps) {
  const isHighlighted = variant === 'highlighted';
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
    // /thread/:id-slug, not the #post-<id> feed-scroll anchor — a hash
    // fragment never reaches the server, so link previews (WhatsApp/etc.)
    // would only ever see the generic category page's tags. This route
    // server-renders the real question as Open Graph tags for crawlers,
    // and sends a real visitor straight into the thread modal.
    const url = threadShareUrl(thread.id, thread.title, countAllReplies(thread.replies));
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
      className={`tc w-full bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 hover:shadow-md transition-all cursor-pointer flex gap-2.5 md:gap-4 text-left relative overflow-hidden group scroll-mt-24 ${
        isHighlighted ? 'border-0 shadow-sm' : 'border border-neutral-200'
      }`}
    >
      {/* Category-coloured left edge — kept even in the highlighted variant
          so the inner white card still carries the thin category-colour strip
          visible in the design mockup. */}
      <div className="absolute left-0 top-0 bottom-0 w-[6px] pointer-events-none" style={{ backgroundColor: catColor.bg }}></div>

      {/* Vote Box (Left) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col items-center gap-0.5 h-fit rounded-2xl px-1.5 py-2 border ${
          isHighlighted ? 'bg-white border-neutral-200' : 'bg-[#F8F9FA] border-neutral-200/70'
        }`}
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

        {/* Media — tuco video answer, an image carousel, or a single image.
            Wrapped in a flex-centered container so posts with different image
            aspect ratios (portrait / landscape / square) always sit centered
            in the card as in the mockup. */}
        {tucoVideoId ? (
          <div className="mb-4 flex justify-center">
            <div className="w-full max-w-[300px]">
              <TucoVideoCard
                videoId={tucoVideoId}
                variant="feed-inline"
                caption="Video answer from tuco team"
                // Use the OP's attached image as the video thumbnail when the
                // thread has both — lets a curated /thumbnails/*.jpg override
                // YouTube's auto-poster.
                posterUrl={thread.op.images?.[0] || thread.op.image}
              />
            </div>
          </div>
        ) : (() => {
          const imgs = (thread.op.images && thread.op.images.length > 0)
            ? thread.op.images
            : (thread.op.image ? [thread.op.image] : []);
          if (imgs.length === 0) return null;
          if (imgs.length === 1) {
            return (
              <div className="mb-4 flex justify-center">
                <img
                  src={imgs[0]}
                  alt=""
                  loading="lazy"
                  className="w-full max-w-[520px] rounded-2xl object-cover max-h-[400px]"
                />
              </div>
            );
          }
          return (
            <div className="mb-4 flex justify-center">
              <ImageCarousel images={imgs} />
            </div>
          );
        })()}

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

// Swipeable image carousel for posts with multiple images.
// - Native horizontal scroll-snap on mobile (finger-swipe).
// - Left/right chevron buttons on hover for desktop (hidden on touch).
// - Dot indicator underneath. All clicks stopPropagation so opening a card
//   isn't triggered by using the carousel.
function ImageCarousel({ images }: { images: string[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setIndex(clamped);
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <div
      className="mb-4 w-full max-w-[520px] relative group/carousel"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="w-full flex-shrink-0 snap-center object-cover max-h-[400px] rounded-2xl"
          />
        ))}
      </div>

      {/* Always-visible chevrons on desktop (mockup pattern). Hidden when at
          the edge so users get a clear affordance for where they can go. */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => scrollTo(index - 1)}
          aria-label="Previous image"
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#4D4747] shadow-md items-center justify-center text-white hover:bg-black transition-colors"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          type="button"
          onClick={() => scrollTo(index + 1)}
          aria-label="Next image"
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#4D4747] shadow-md items-center justify-center text-white hover:bg-black transition-colors"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Go to image ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-4 bg-[#4D4747]' : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
