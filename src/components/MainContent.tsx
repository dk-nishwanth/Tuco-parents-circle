import { useState, useMemo, useRef, useEffect } from 'react';
import { Conversation, User } from '../types';
import { CATEGORIES } from '../data/categories';
import { ThreadCard } from './ThreadCard';
import { RightSidebar } from './RightSidebar';
import { filterThreads, sortThreads, getAvatarColor } from '../utils/helpers';
import { Award, Flame, Pin, Tv, ChevronDown, Globe, Package, Star, Users } from 'lucide-react';

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
  featuredThreads = [],
  onCategoryChange,
}: MainContentProps) {
  const [sortType, setSortType] = useState<string>('hot');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'about'>('feed');
  
  const mobileSortRef = useRef<HTMLDivElement>(null);
  const desktopSortRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  
  const THREADS_PER_PAGE = 10;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isOutsideMobile = mobileSortRef.current && !mobileSortRef.current.contains(event.target as Node);
      const isOutsideDesktop = desktopSortRef.current && !desktopSortRef.current.contains(event.target as Node);
      const isOutsideCategory = categoryRef.current && !categoryRef.current.contains(event.target as Node);
      
      if (isOutsideMobile && isOutsideDesktop) {
        setIsSortOpen(false);
      }
      if (categoryRef.current && isOutsideCategory) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsSortOpen(false);
  };

  const sortOptions = [
    { key: 'hot', label: 'Hot', icon: '🔥', desc: 'Highest Votes' },
    { key: 'new', label: 'New', icon: '✨', desc: 'Recent Posts' },
    { key: 'top', label: 'Top', icon: '💬', desc: 'Most Replies' },
    { key: 'unanswered', label: 'Unanswered', icon: '❓', desc: 'Needs Support' },
  ];

  const currentSort = sortOptions.find(o => o.key === sortType) || sortOptions[0];

  const categoryItem = CATEGORIES[activeCategory];
  const selectTitle =
    activeCategory === 'saved'
      ? 'Saved Discussions'
      : categoryItem
        ? categoryItem.label
        : 'all discussions';
  const selectIcon = activeCategory === 'saved' ? '📌' : categoryItem ? categoryItem.icon : <Users className="w-4 h-4 text-tuco-cyan" strokeWidth={1.5} />;

  return (
    <main className="main min-w-0 flex flex-col gap-4 md:gap-6">
      {/* Mobile View Specific Header (Based on Image) */}
      <div className="md:hidden flex flex-col gap-4 mb-4">
        {/* Title and Category Row */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h2 className="font-display font-bold text-[20px] text-[#4D4747] tracking-[-0.05em] leading-[100%] lowercase">
              tuco parents circle :)
            </h2>
            <p className="font-sans text-[11px] text-neutral-400 font-medium mt-1">
              {processedThreads.length} discussions found
            </p>
          </div>
          
          {/* Category Dropdown (Mobile) */}
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-[13px] font-display font-bold text-[#4D4747] shadow-sm"
            >
              <Users className="w-4 h-4 text-tuco-cyan" strokeWidth={2} />
              <span className="lowercase">all discussions</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
            </button>
            
            {isCategoryOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onCategoryChange?.('all');
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-display font-bold flex items-center gap-2 transition-colors ${
                      activeCategory === 'all' ? 'bg-tuco-cyan/5 text-tuco-cyan' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Users className="w-4 h-4" strokeWidth={1.5} />
                    <span className="lowercase">all discussions</span>
                  </button>
                  {Object.values(CATEGORIES).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onCategoryChange?.(cat.id);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-display font-bold flex items-center gap-2 transition-colors ${
                        activeCategory === cat.id ? 'bg-tuco-cyan/5 text-tuco-cyan' : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="lowercase">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs and Sort Row */}
        <div className="flex items-center justify-between">
          <div className="flex bg-[#EDEDED] p-1 rounded-full gap-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-5 py-1.5 rounded-full text-[13px] font-display font-bold transition-all ${
                activeTab === 'feed' ? 'bg-[#4D4747] text-white shadow-md' : 'text-[#888888]'
              }`}
            >
              feed
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-5 py-1.5 rounded-full text-[13px] font-display font-bold transition-all ${
                activeTab === 'about' ? 'bg-[#4D4747] text-white shadow-md' : 'text-[#888888]'
              }`}
            >
              about
            </button>
          </div>

          {/* Sort Dropdown (Mobile Tab Row) */}
          <div className="relative" ref={mobileSortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-[13px] font-display font-bold text-[#4D4747] shadow-sm"
            >
              <span className="text-[#FFD700] text-sm">✨</span>
              <span className="lowercase text-neutral-400 font-medium">new</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-neutral-200 rounded-2xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                <div className="py-1">
                  {sortOptions.map(option => (
                    <button
                      key={option.key}
                      onClick={() => handleSortChange(option.key)}
                      className={`w-full text-left px-3 py-2 text-xs font-display font-bold flex flex-col transition-colors ${
                        sortType === option.key ? 'bg-tuco-cyan/5 text-tuco-cyan' : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 lowercase">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View Header */}
      <div className="hidden md:flex main-top flex flex-col gap-3 pb-4 mb-4 border-b border-neutral-100">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="font-display font-bold text-[20px] text-[#4D4747] tracking-[-0.05em] leading-[100%] lowercase flex items-center gap-2">
              <span className="truncate">tuco parents circle :)</span>
            </h2>
            <p className="font-sans text-[11px] text-neutral-400 font-medium">
              {processedThreads.length} discussions found
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative" ref={desktopSortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full text-sm font-display font-bold text-[#4D4747] hover:border-tuco-cyan hover:bg-neutral-50 transition-all shadow-xs"
              >
                <span>✨ <span className="text-neutral-400 font-medium">new</span></span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                  <div className="py-1">
                    {sortOptions.map(option => (
                      <button
                        key={option.key}
                        onClick={() => handleSortChange(option.key)}
                        className={`w-full text-left px-4 py-2.5 text-sm font-display font-bold flex flex-col transition-colors ${
                          sortType === option.key ? 'bg-tuco-cyan/5 text-tuco-cyan' : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'about' ? (
        <div className="flex flex-col gap-4">
          <RightSidebar
            onTrendingClick={onThreadOpen}
            featuredThreads={featuredThreads}
            onFeaturedClick={onThreadOpen}
            variant="sidebar"
          />
        </div>
      ) : (
        <>
          {/* Trending Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
              <Pin className="w-5 h-5 text-[#4D4747] rotate-45" strokeWidth={2} />
              <h3 className="font-display font-bold text-[20px] text-[#4D4747] tracking-[-0.05em] leading-[100%]">Trending</h3>
            </div>
            <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-4 min-w-max">
                {conversations.slice(0, 5).map(thread => (
                  <div 
                    key={thread.id}
                    onClick={() => onThreadOpen(thread.id)}
                    className="w-[280px] bg-white border border-neutral-200 rounded-[1.5rem] p-5 shadow-sm cursor-pointer hover:border-tuco-cyan/30 transition-all"
                  >
                    <h4 className="font-display font-bold text-[15px] text-[#4D4747] leading-snug line-clamp-2 mb-1">
                      {thread.title}
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-medium mb-4">
                      {thread.votes} vote • {thread.replies.length} comments
                    </p>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                        style={{ backgroundColor: getAvatarColor(thread.op.author) }}
                      >
                        {thread.op.author[0].toUpperCase()}
                      </div>
                      <span className="text-[11px] font-sans font-medium text-[#4D4747]">by {thread.op.author}</span>
                      <span className="bg-[#FFF5F0] text-[10px] text-[#EB3200] font-sans font-medium uppercase px-2 py-0.5 rounded-md border border-[#EB3200]/10 shadow-sm">
                        {thread.op.city}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feed Section */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 px-1">
              <Tv className="w-5 h-5 text-[#4D4747]" strokeWidth={2} />
              <h3 className="font-display font-bold text-[20px] text-[#4D4747] tracking-[-0.05em] leading-[100%]">Feed</h3>
            </div>
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
                  />
                ))
              ) : (
                <div className="no-results bg-white border border-neutral-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
                  <p className="font-display font-bold text-neutral-800">No discussions found!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {totalPages > 1 && activeTab === 'feed' && paginatedThreads.length > 0 && (
        <div className="pagination-wrapper mt-6 md:mt-8 flex items-center justify-center gap-1 md:gap-2 flex-wrap">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-neutral-200 hover:border-tuco-cyan hover:bg-tuco-cyan/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-neutral-600"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
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
            className="pagination-btn px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-neutral-200 hover:border-tuco-cyan hover:bg-tuco-cyan/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-medium text-neutral-600"
          >
            →
          </button>
        </div>
      )}
    </main>
  );
}
