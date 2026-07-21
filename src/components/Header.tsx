import { useState, ChangeEvent, useRef, useEffect, KeyboardEvent } from 'react';
import { LogOut, User, Bell, MessageSquare, Award, ThumbsUp, Trash2, Search, ArrowLeft } from 'lucide-react';
import tucoLogo from '../assets/tuco-logo.webp';
import { Conversation, User as UserType, Notification } from '../types';
import { searchThreadsWithRanking } from '../utils/helpers';
interface HeaderProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  conversations: Conversation[];
  onNewPostClick: () => void;
  currentUser: UserType | null;
  onLogout: () => void;
  onLoginClick: () => void;
  onModerationClick?: () => void;
  onAdminClick?: () => void;
  onProfileClick?: () => void;
  onNotificationsClick?: () => void;
  onSuggestionSelect?: (threadId: number) => void;
  onOpenCategories?: () => void;
  notifications?: Notification[];
  onMarkAsRead?: (id: number) => void;
  onClearNotifications?: () => void;
  onThreadOpen?: (id: number) => void;
  // Optional back-arrow button shown before the logo. Rendered inside the
  // thread modal so users can return to the feed; omitted on the dashboard.
  onBack?: () => void;
}

function SearchInput({
  searchTerm,
  onSearch,
  conversations,
  onSuggestionSelect,
  compact = false,
}: {
  searchTerm: string;
  onSearch: (term: string) => void;
  conversations: Conversation[];
  onSuggestionSelect?: (threadId: number) => void;
  compact?: boolean;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const suggestions =
    searchTerm.trim().length >= 1 ? searchThreadsWithRanking(conversations, searchTerm, 6) : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearch(value);
    setShowSuggestions(value.trim().length >= 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={`flex items-center bg-[#F7F7F7] border border-neutral-200 rounded-lg focus-within:bg-white focus-within:border-tuco-cyan/30 transition-all ${
          compact ? 'py-1.5 px-3' : 'py-2 px-3'
        }`}
      >
        <Search className="w-4 h-4 text-[#4D4747] mr-2 shrink-0" strokeWidth={2} />
        <input
          type="text"
          placeholder="search"
          autoFocus
          className={`w-full border-none bg-transparent font-sans outline-none text-[#4D4747] font-medium placeholder-neutral-400 ${
            compact ? 'text-sm' : 'text-sm'
          }`}
          value={searchTerm}
          onChange={handleSearch}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.trim().length >= 1 && setShowSuggestions(true)}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-2">
            {suggestions.map(thread => (
              <button
                key={thread.id}
                type="button"
                onClick={() => {
                  onSuggestionSelect?.(thread.id);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-5 py-4 hover:bg-tuco-cyan/5 flex flex-col gap-1 border-b border-neutral-50 last:border-0 transition-colors"
              >
                <p className="font-display font-bold text-sm text-[#4D4747] line-clamp-2 leading-snug">
                  {thread.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-neutral-500 font-medium">
                    {thread.replies.length} replies
                  </span>
                  <span className="text-[12px] text-neutral-300">•</span>
                  <span className="text-[12px] text-neutral-500 font-medium capitalize">
                    {thread.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Two wavy lines (≈) matching the design's menu glyph.
function WaveIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 9c1.5-2 3-2 4.5 0S10.5 11 12 9s3-2 4.5 0S19.5 11 21 9" />
      <path d="M3 15c1.5-2 3-2 4.5 0S10.5 17 12 15s3-2 4.5 0S19.5 17 21 15" />
    </svg>
  );
}

export function Header({
  searchTerm,
  onSearch,
  conversations,
  onNewPostClick,
  currentUser,
  onLogout,
  onLoginClick,
  onProfileClick,
  onNotificationsClick,
  onSuggestionSelect,
  onOpenCategories,
  notifications = [],
  onMarkAsRead,
  onClearNotifications,
  onThreadOpen,
  onBack,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const iconBtn =
    'p-2 relative hover:bg-neutral-100 rounded-full transition-colors text-[#4D4747]';

  return (
    <header className="header bg-white border-b border-neutral-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-2 flex items-center gap-2 md:gap-3">
        {/* Back button — only when the parent passes onBack (thread modal). */}
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            className="p-1.5 -ml-1 rounded-full hover:bg-neutral-100 text-[#4D4747] transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
        )}
        {/* Left: Logo + parenting circle */}
        <a
          href="https://tucokids.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 shrink-0 cursor-pointer select-none"
          aria-label="Go to tucokids.com"
        >
          <img src={tucoLogo} alt="tuco Kids" className="h-8 md:h-9 w-auto" />
          <span className="font-brand font-light text-[#4D4747] text-[16px] leading-[0.86] tracking-[-0.05em]">
            parenting<br />circle
          </span>
        </a>

        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 md:gap-1.5 shrink-0">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setShowSearch(v => !v)}
              aria-label="Search"
              aria-expanded={showSearch}
              className={iconBtn}
            >
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>
            {showSearch && (
              <div className="fixed md:absolute top-[58px] md:top-full left-3 right-3 md:left-auto md:right-0 md:mt-2 md:w-80 z-[60]">
                <SearchInput
                  searchTerm={searchTerm}
                  onSearch={onSearch}
                  conversations={conversations}
                  onSuggestionSelect={id => {
                    onSuggestionSelect?.(id);
                    setShowSearch(false);
                  }}
                  compact={true}
                />
              </div>
            )}
          </div>

          {/* User */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="Account menu"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors font-display font-bold text-[13px] text-[#35B5EC]"
              >
                {currentUser.username.substring(0, 2).toUpperCase()}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-xs text-neutral-500 font-medium">Logged in as</p>
                    <p className="font-display font-bold text-sm text-[#4D4747] mt-1 truncate">{currentUser.username}</p>
                  </div>
                  <div className="px-2 py-2 space-y-0.5">
                    <button
                      onClick={() => {
                        onProfileClick?.();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#4D4747] hover:bg-neutral-100 rounded"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onLoginClick} aria-label="Sign in" className={iconBtn}>
              <User className="w-5 h-5" strokeWidth={2} />
            </button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              className={iconBtn}
            >
              <Bell className="w-5 h-5" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-tuco-orange rounded-full border-2 border-white shadow-sm"></span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="fixed md:absolute top-[58px] md:top-full left-4 right-4 md:left-auto md:right-0 md:mt-2 md:w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-neutral-50 bg-neutral-50/50 flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm text-[#4D4747]">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="bg-tuco-cyan/10 text-tuco-cyan text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearNotifications?.();
                          setShowNotificationsDropdown(false);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-neutral-50">
                      {notifications.slice(0, 10).map(notification => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            onMarkAsRead?.(notification.id);
                            if (notification.threadId) onThreadOpen?.(notification.threadId);
                            setShowNotificationsDropdown(false);
                          }}
                          className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                            !notification.read ? 'bg-tuco-cyan/[0.02]' : ''
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {notification.type === 'reply' && <MessageSquare className="w-4 h-4 text-tuco-cyan" />}
                            {notification.type === 'like' && <ThumbsUp className="w-4 h-4 text-tuco-orange" />}
                            {notification.type === 'badge' && <Award className="w-4 h-4 text-tuco-yellow" />}
                            {notification.type === 'system' && <Bell className="w-4 h-4 text-neutral-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#4D4747] font-bold leading-snug">
                              {notification.title}
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">
                              {notification.description}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-1 font-medium">
                              {notification.time}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="shrink-0 self-center">
                              <div className="w-1.5 h-1.5 bg-tuco-cyan rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                      <p className="text-xs text-neutral-400 font-bold">No notifications yet</p>
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2 border-t border-neutral-50">
                    <button
                      onClick={() => {
                        onNotificationsClick?.();
                        setShowNotificationsDropdown(false);
                      }}
                      className="w-full py-2 text-[11px] font-display font-bold text-neutral-500 hover:text-tuco-cyan transition-colors"
                    >
                      view all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wave / menu */}
          <button
            onClick={onOpenCategories}
            aria-label="Menu"
            className={iconBtn}
          >
            <WaveIcon className="w-5 h-5" />
          </button>

          {/* Ask */}
          <button
            onClick={onNewPostClick}
            className="ml-1 bg-[#35B5EC] text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-xs md:text-[13px] font-display font-bold transition-all shadow-sm active:scale-95"
          >
            ask
          </button>
        </div>
      </div>
    </header>
  );
}
