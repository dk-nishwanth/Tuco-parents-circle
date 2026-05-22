import { useState, useMemo } from 'react';
import { Conversation, User } from '../types';
import { CATEGORIES } from '../data/categories';
import { ThreadCard } from './ThreadCard';
import { filterThreads, sortThreads } from '../utils/helpers';
import { Award, Flame, MessageCircle, Sparkles } from 'lucide-react';
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
  onResetToDefault,
  onStartDiscussion,
  users = {},
}: MainContentProps) {
  const [sortType, setSortType] = useState<string>('hot');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const THREADS_PER_PAGE = 10;
  const processedThreads = useMemo(() => {
    let filtered: Conversation[];
    if (activeCategory === 'saved') {
      filtered = conversations.filter(c => savedPosts.includes(c.id));
    } else {
      filtered = filterThreads(conversations, searchTerm, activeCategory);
    }
    return sortThreads(filtered, sortType);
  }, [conversations, searchTerm, activeCategory, sortType, savedPosts]);
  const totalPages = Math.ceil(processedThreads.length / THREADS_PER_PAGE);
  const startIndex = (currentPage - 1) * THREADS_PER_PAGE;
  const endIndex = startIndex + THREADS_PER_PAGE;
  const paginatedThreads = processedThreads.slice(startIndex, endIndex);
  const handleSortChange = (newSort: string) => {
    setSortType(newSort);
    setCurrentPage(1);
  };
  const categoryItem = CATEGORIES[activeCategory];
  const selectTitle =
    activeCategory === 'saved'
      ? 'Saved Discussions'
      : categoryItem
        ? categoryItem.label
        : 'All Parenting Discussions';
  const selectIcon = activeCategory === 'saved' ? '📌' : categoryItem ? categoryItem.icon : '🏠';
  return (
    <main className="main min-w-0 flex flex-col gap-3 md:gap-5">
      {}
      <div className="main-top flex flex-col gap-2 pb-2 md:pb-3 border-b border-neutral-200">
        <div>
          <h2 className="font-display font-black text-base md:text-lg lg:text-xl text-neutral-800 flex items-center gap-2">
            <span className="truncate md:hidden">Tuco Parents Circle</span>
            <span className="hidden md:flex items-center gap-2 min-w-0">
              <span>{selectIcon}</span>
              <span className="truncate">{selectTitle}</span>
            </span>
          </h2>
          <p className="font-sans text-xs text-neutral-400 font-bold mt-1">
            {processedThreads.length} discussions found.
          </p>
        </div>
      </div>
      {}
      <div className="sort-row flex flex-wrap gap-1.5 md:gap-2">
        {[
          { key: 'hot', label: '🔥 Hot', desc: 'Highest Votes', mobileLabel: 'Hot' },
          { key: 'new', label: '✨ New', desc: 'Recent Posts', mobileLabel: 'New' },
          { key: 'top', label: '💬 Top', desc: 'Most Replies', mobileLabel: 'Top' },
          {
            key: 'unanswered',
            label: '❓ Unanswered',
            desc: 'Needs Support',
            mobileLabel: 'Unanswered',
          },
        ].map(tab => {
          const isSelected = sortType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleSortChange(tab.key)}
              className={`sort-tab px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-display font-black cursor-pointer select-none transition-all ${
                isSelected
                  ? 'bg-tuco-cyan border-tuco-cyan text-white shadow-sm'
                  : 'bg-white border-neutral-200/90 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'
              }`}
              title={tab.desc}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.mobileLabel}</span>
            </button>
          );
        })}
      </div>
      {}
      <div className="thread-list flex flex-col gap-2.5 md:gap-4">
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
            />
          ))
        ) : (
          <div className="no-results bg-white border border-neutral-200 rounded-2xl md:rounded-3xl p-6 md:p-14 text-center flex flex-col items-center justify-center shadow-xs max-w-xl mx-auto w-full mt-2">
            <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-2xl md:text-3xl mb-3 md:mb-4 shadow-sm">
              🔍
            </div>
            <h4 className="font-display font-black text-sm md:text-base text-neutral-800 mb-1">
              No matching advice posts!
            </h4>
            <p className="font-sans text-xs text-neutral-500 font-bold max-w-xs mb-4 md:mb-5 leading-relaxed">
              We couldn't find any discussions in this category. Why not start a brand new topic?
            </p>
            <button
              onClick={() => (onStartDiscussion ? onStartDiscussion() : onResetToDefault())}
              className="text-xs bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black py-2 px-4 md:px-5 rounded-full cursor-pointer select-none shadow-xs transition-all shrink-0"
            >
              {searchTerm.trim() ? 'Start a Discussion' : 'Reset Filter'}
            </button>
          </div>
        )}
      </div>
      {}
      {totalPages > 1 && paginatedThreads.length > 0 && (
        <div className="pagination-wrapper mt-6 md:mt-8 flex items-center justify-center gap-1 md:gap-2 flex-wrap">
          {}
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-neutral-200 hover:border-tuco-cyan hover:bg-tuco-cyan/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-neutral-600"
          >
            ←
          </button>
          {}
          <div className="flex items-center gap-0.5 md:gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              const showPage =
                page === 1 ||
                page === totalPages ||
                page === currentPage ||
                Math.abs(page - currentPage) <= 1;
              if (!showPage && !(page === 2 || page === totalPages - 1)) {
                return null;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`pagination-number w-7 h-7 md:w-9 md:h-9 rounded-lg font-display font-bold text-xs md:text-sm transition-all ${
                    page === currentPage
                      ? 'bg-tuco-cyan text-white shadow-sm'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-tuco-cyan'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          {}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-neutral-200 hover:border-tuco-cyan hover:bg-tuco-cyan/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-neutral-600"
          >
            →
          </button>
        </div>
      )}
    </main>
  );
}
