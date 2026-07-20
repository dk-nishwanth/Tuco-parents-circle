import { useState, useMemo, useEffect } from 'react';
import { Conversation, User } from '../types';
import { ThreadCard } from './ThreadCard';
import { filterThreads, sortThreads } from '../utils/helpers';

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
  const [sortType] = useState<string>('new');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const THREADS_PER_PAGE = 10;

  // Reset to the first page whenever the visible set changes (switching
  // category or running a search). Without this, being on page 3 and opening
  // a category with fewer pages leaves paginatedThreads empty and wrongly
  // shows the "No discussions found" empty state.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm, sortType]);

  // "Thread of the week" — the single highest-scoring thread, auto-picked.
  // Score mirrors the old Trending carousel: votes + replies + views with a
  // 7-day recency boost. Only surfaced on the main "all" feed (not category
  // filters, saved, or search). Falls back to all conversations if none are
  // approved, so the highlight never vanishes.
  const threadOfWeek = useMemo(() => {
    const score = (c: Conversation) => {
      const ageHours = c.createdAt
        ? (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60)
        : 999;
      const recencyBoost = Math.max(0, 1 - ageHours / 168);
      return (c.votes || 0) * 2 + (c.replies?.length || 0) * 3 + (c.views || 0) * 0.1 + recencyBoost * 20;
    };
    const approved = conversations.filter(c => c.moderationStatus === 'approved');
    const pool = approved.length > 0 ? approved : conversations;
    if (pool.length === 0) return null;
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
    return sortThreads(filtered, sortType, currentUser?.childAge);
  }, [conversations, searchTerm, activeCategory, sortType, savedPosts, currentUser?.childAge, showHighlight, threadOfWeek]);

  const totalPages = Math.ceil(processedThreads.length / THREADS_PER_PAGE);
  const startIndex = (currentPage - 1) * THREADS_PER_PAGE;
  const endIndex = startIndex + THREADS_PER_PAGE;
  const paginatedThreads = processedThreads.slice(startIndex, endIndex);

  return (
    <main className="main min-w-0 flex flex-col gap-4 md:gap-6">
      {/* Highlights of the week — single auto-picked top thread */}
      {showHighlight && threadOfWeek && currentPage === 1 && (
        <div className="rounded-[1.5rem] md:rounded-[1.75rem] bg-[#FFE259] p-2 md:p-4 shadow-sm">
          <h2 className="font-brand font-normal text-[28px] md:text-[36px] text-[#4D4747] tracking-[-0.05em] leading-[1] text-center py-2">
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
          />
        </div>
      )}

      {/* Feed */}
      <div className="thread-list flex flex-col gap-4">
        {paginatedThreads.length > 0 ? (
          paginatedThreads.map(thread => (
            <ThreadCard
              key={thread.id}
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
