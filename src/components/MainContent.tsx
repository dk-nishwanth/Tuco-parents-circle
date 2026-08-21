import { Fragment, useState, useMemo, useEffect } from 'react';
import { Conversation, User } from '../types';
import { ThreadCard } from './ThreadCard';
import { filterThreads, sortThreads } from '../utils/helpers';
import { findTucoVideoReply, parseYouTubeId } from './TucoVideo';
import { BlogsSection } from './BlogsSection';
import { QuizSection } from './QuizSection';
import { FounderFocusSection } from './FounderFocusSection';
import { QuizFlowSection } from './QuizFlowSection';

// A thread "has video" when a tuco-team reply embeds a YouTube link, and
// "has image" when the OP attached any picture. Used for both the highlights
// picker and the feed ordering — media-rich threads sit at the top.
function threadHasVideo(c: Conversation): boolean {
  const r = findTucoVideoReply(c);
  return !!(r && parseYouTubeId(r.text));
}
function threadHasImage(c: Conversation): boolean {
  return (c.op.images?.length ?? 0) > 0 || !!c.op.image;
}

interface MainContentProps {
  activeCategory: string;
  searchTerm: string;
  conversations: Conversation[];
  onThreadOpen: (id: number) => void;
  onVote: (id: number, type: 'up' | 'down') => void;
  onSavePost?: (id: number) => void;
  savedPosts?: number[];
  votedThreads: Record<number, 'up' | 'down' | null>;
  onResetToDefault: () => void;
  onStartDiscussion?: () => void;
  users?: Record<string, User>;
  featuredThreads?: Conversation[];
  onCategoryChange?: (categoryId: string) => void;
  onOpenRightSidebar?: () => void;
  isLoggedIn?: boolean;
  onJoinClick?: () => void;
  currentUser?: User | null;
}

export function MainContent({
  activeCategory,
  searchTerm,
  conversations,
  onThreadOpen,
  onVote,
  onSavePost,
  savedPosts = [],
  votedThreads,
  users = {},
  isLoggedIn = false,
  onJoinClick,
  currentUser,
}: MainContentProps) {
  // Personalise the default feed order for signed-in users: if we know their
  // child's age (or they picked interests during onboarding), we rank threads
  // by relevance instead of pure recency. Guests and users who skipped the
  // welcome flow still get plain "new".
  const hasPersonalSignal = Boolean(currentUser?.childAge) || (currentUser?.interests?.length ?? 0) > 0;
  const [sortType] = useState<string>(hasPersonalSignal ? 'for-you' : 'new');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const THREADS_PER_PAGE = 10;

  // Reset to the first page whenever the visible set changes (switching
  // category or running a search). Without this, being on page 3 and opening
  // a category with fewer pages leaves paginatedThreads empty and wrongly
  // shows the "No discussions found" empty state.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm, sortType]);

  // "Thread of the week" — a stable weekly pick, not recomputed on every
  // vote/view. A cron job (or a moderator) sets isWeeklyHighlight on exactly
  // one thread; we just display whichever one that is. Only fall back to
  // the old auto-scored pick if nothing has been rotated in yet (e.g. before
  // the cron's first run), so the section never goes empty.
  const threadOfWeek = useMemo(() => {
    const approved = conversations.filter(c => c.moderationStatus === 'approved');
    const pool = approved.length > 0 ? approved : conversations;
    if (pool.length === 0) return null;

    const pinned = pool.find(c => c.isWeeklyHighlight);
    if (pinned) return pinned;

    // Fallback: prefer a thread with a tuco-team video reply, then image,
    // then plain text, tie-broken by votes + replies + views + recency.
    const score = (c: Conversation) => {
      const ageHours = c.createdAt
        ? (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60)
        : 999;
      const recencyBoost = Math.max(0, 1 - ageHours / 168);
      const trending = (c.votes || 0) * 2 + (c.replies?.length || 0) * 3 + (c.views || 0) * 0.1 + recencyBoost * 20;
      const mediaTier = threadHasVideo(c) ? 10_000 : threadHasImage(c) ? 5_000 : 0;
      return mediaTier + trending;
    };
    return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
  }, [conversations]);

  // The highlight only shows on the default "all" feed (no search).
  const showHighlight = activeCategory === 'all' && !searchTerm && !!threadOfWeek;

  const processedThreads = useMemo(() => {
    let filtered: Conversation[];
    if (activeCategory === 'saved') {
      filtered = conversations.filter(c => savedPosts.includes(c.id));
    } else {
      filtered = filterThreads(conversations, searchTerm, activeCategory);
    }
    // Avoid showing the "thread of the week" twice — pull it out of the list
    // when it's featured at the top of the "all" feed.
    if (showHighlight && threadOfWeek) {
      filtered = filtered.filter(c => c.id !== threadOfWeek.id);
    }
    const sorted = sortThreads(filtered, sortType, currentUser?.childAge, currentUser?.interests);
    // Media-first, but MIX video and image threads instead of grouping all
    // videos then all images. Within each media type: pinned-first, then the
    // base sort order. Then interleave (video, image, video, image, …) so the
    // feed alternates media types — starting with a video. Text-only threads
    // come last. Applied in every category.
    const byPinned = (arr: Conversation[]): Conversation[] =>
      [...arr.filter(c => c.isPinned), ...arr.filter(c => !c.isPinned)];
    const videos = byPinned(sorted.filter(c => threadHasVideo(c)));
    const images = byPinned(sorted.filter(c => !threadHasVideo(c) && threadHasImage(c)));
    const textOnly = sorted.filter(c => !threadHasVideo(c) && !threadHasImage(c));
    const mixed: Conversation[] = [];
    for (let vi = 0, ii = 0; vi < videos.length || ii < images.length; ) {
      if (vi < videos.length) mixed.push(videos[vi++]);
      if (ii < images.length) mixed.push(images[ii++]);
    }
    return [...mixed, ...textOnly];
  }, [conversations, searchTerm, activeCategory, sortType, savedPosts, currentUser?.childAge, currentUser?.interests, showHighlight, threadOfWeek]);

  const totalPages = Math.ceil(processedThreads.length / THREADS_PER_PAGE);
  const startIndex = (currentPage - 1) * THREADS_PER_PAGE;
  const endIndex = startIndex + THREADS_PER_PAGE;
  const paginatedThreads = processedThreads.slice(startIndex, endIndex);

  return (
    <main className="main min-w-0 flex flex-col gap-4 md:gap-6">
      {/* Highlights of the week — single auto-picked top thread */}
      {showHighlight && threadOfWeek && currentPage === 1 && (
        // Negative margins on mobile break out of the parent `px-3 sm:px-4`
        // gutter so the yellow bleeds to the viewport edges (as in the mockup);
        // desktop stays inside the column.
        <div className="-mx-3 sm:-mx-4 md:mx-0 rounded-none md:rounded-2xl bg-[#FFE259] px-3 md:px-3 pt-2 md:pt-2 pb-3 md:pb-3 shadow-sm md:border md:border-[#7EC7E8]">
          <h2 className="font-brand font-normal text-[32px] md:text-[42px] text-[#4D4747] tracking-[-0.04em] leading-[1.05] text-center pt-2 pb-4 md:pt-3 md:pb-5">
            highlights of the week
          </h2>
          <ThreadCard
            thread={threadOfWeek}
            onOpen={onThreadOpen}
            onVote={onVote}
            onSavePost={onSavePost}
            isSaved={savedPosts.includes(threadOfWeek.id)}
            votedState={votedThreads[threadOfWeek.id] || null}
            users={users}
            isLoggedIn={isLoggedIn}
            onJoinClick={onJoinClick}
            variant="highlighted"
          />
        </div>
      )}

      {/* Feed */}
      <div className="thread-list flex flex-col gap-4">
        {paginatedThreads.length > 0 ? (
          paginatedThreads.map((thread, index) => (
            <Fragment key={thread.id}>
              <ThreadCard
                thread={thread}
                onOpen={onThreadOpen}
                onVote={onVote}
                onSavePost={onSavePost}
                isSaved={savedPosts.includes(thread.id)}
                votedState={votedThreads[thread.id] || null}
                users={users}
                isLoggedIn={isLoggedIn}
                onJoinClick={onJoinClick}
              />
              {/* Blogs — shown after the first thread on the default feed's first page */}
              {index === 0 && currentPage === 1 && activeCategory === 'all' && !searchTerm && (
                <BlogsSection />
              )}
              {/* Quiz teaser — shown after the second thread, right after Blogs */}
              {index === 1 && currentPage === 1 && activeCategory === 'all' && !searchTerm && (
                <QuizSection />
              )}
              {/* Quiz flow — shown after the third thread, right above Founder Focus */}
              {index === 2 && currentPage === 1 && activeCategory === 'all' && !searchTerm && (
                <QuizFlowSection />
              )}
              {/* Founder Focus — shown after the third thread, links out to Instagram */}
              {index === 2 && currentPage === 1 && activeCategory === 'all' && !searchTerm && (
                <FounderFocusSection />
              )}
            </Fragment>
          ))
        ) : (
          <div className="no-results bg-white border border-neutral-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
            <p className="font-display font-bold text-neutral-800">No discussions found!</p>
          </div>
        )}
      </div>

      {totalPages > 1 && paginatedThreads.length > 0 && (
        <div className="pagination-wrapper mt-6 md:mt-8 flex items-center justify-center gap-1 md:gap-2 flex-wrap">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="pagination-btn px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-neutral-200 hover:border-tuco-cyan hover:bg-tuco-cyan/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-neutral-600"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
              className={`pagination-btn w-8 md:w-10 h-8 md:h-10 rounded-lg border transition-all text-xs md:text-sm font-medium ${
                currentPage === page
                  ? 'bg-tuco-cyan border-tuco-cyan text-white shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-tuco-cyan hover:bg-tuco-cyan/5'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="pagination-btn px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-neutral-200 hover:border-tuco-cyan hover:bg-tuco-cyan/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-neutral-600"
          >
            →
          </button>
        </div>
      )}
    </main>
  );
}
