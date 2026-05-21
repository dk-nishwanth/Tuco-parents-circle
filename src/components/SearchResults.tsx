import { Conversation, DateFilter } from '../types';
import { ThreadCard } from './ThreadCard';
import { CATEGORIES } from '../data/categories';
import { Search } from 'lucide-react';
import { User } from '../types';

interface SearchResultsProps {
  results: Conversation[];
  query: string;
  onThreadOpen: (id: number) => void;
  onVote: (id: number, type: 'up' | 'down') => void;
  votedThreads: Record<number, 'up' | 'down' | null>;
  categoryFilter: string;
  dateFilter: DateFilter;
  onCategoryFilterChange: (cat: string) => void;
  onDateFilterChange: (date: DateFilter) => void;
  onStartDiscussion: () => void;
  users: Record<string, User>;
  isLoading?: boolean;
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

export function SearchResults({
  results,
  query,
  onThreadOpen,
  onVote,
  votedThreads,
  categoryFilter,
  dateFilter,
  onCategoryFilterChange,
  onDateFilterChange,
  onStartDiscussion,
  users,
  isLoading = false,
}: SearchResultsProps) {
  return (
    <div className="w-full">
      <div className="mb-6 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-5 h-5 text-tuco-cyan" />
          <h2 className="font-display font-black text-xl text-neutral-800">Search Results</h2>
        </div>
        <p className="text-sm text-neutral-500 font-medium mb-4">
          {isLoading ? (
            'Searching...'
          ) : results.length === 0 ? (
            <>
              No discussions found for "<strong>{query}</strong>"
            </>
          ) : (
            <>
              Found <strong>{results.length}</strong> discussion
              {results.length !== 1 ? 's' : ''} for "<strong>{query}</strong>"
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="text-xs font-display font-bold border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-700"
          >
            <option value="all">All categories</option>
            {Object.values(CATEGORIES).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
            className="text-xs font-display font-bold border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-700"
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="flex flex-col gap-4">
          {results.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onOpen={onThreadOpen}
              onVote={onVote}
              votedState={votedThreads[thread.id] || null}
              users={users}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-4xl mb-4">
            🔍
          </div>
          <h3 className="font-display font-black text-lg text-neutral-800 mb-2">
            No discussions found yet
          </h3>
          <p className="text-sm text-neutral-500 mb-5">
            Be the first to start this conversation about <strong>"{query}"</strong>
          </p>
          <button
            onClick={onStartDiscussion}
            className="text-xs bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black py-2.5 px-6 rounded-full cursor-pointer shadow-sm transition-all"
          >
            Be the first to start this conversation
          </button>
        </div>
      )}
    </div>
  );
}
