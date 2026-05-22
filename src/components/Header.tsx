import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { MessageSquarePlus, Search, LogOut, User, X, Menu, Bell } from 'lucide-react';
import tucoLogo from '../assets/tuco-logo.webp';
import { Conversation, User as UserType } from '../types';
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
    searchTerm.trim().length >= 2 ? searchThreadsWithRanking(conversations, searchTerm, 6) : [];
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
    setShowSuggestions(value.trim().length >= 2);
  };
  return (
    <div ref={wrapperRef} className={`relative ${compact ? 'flex-1' : 'flex-1 max-w-sm'}`}>
      <div
        className={`flex items-center bg-neutral-100 border border-neutral-200 rounded-lg focus-within:bg-white focus-within:border-tuco-cyan focus-within:ring-2 focus-within:ring-tuco-cyan/10 transition-all ${
          compact ? 'py-1.5 px-2.5' : 'py-2 px-3'
        }`}
      >
        <Search
          className={`text-neutral-400 mr-2 shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
        />
        <input
          type="text"
          placeholder={compact ? 'Search' : 'Search discussions...'}
          className={`w-full border-none bg-transparent font-sans outline-none text-neutral-700 font-medium placeholder-neutral-400 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
          value={searchTerm}
          onChange={handleSearch}
          onFocus={() => searchTerm.trim().length >= 2 && setShowSuggestions(true)}
        />
        {searchTerm && (
          <button
            onClick={() => {
              onSearch('');
              setShowSuggestions(false);
            }}
            className="text-neutral-400 hover:text-neutral-600 cursor-pointer ml-2 p-1"
            title="Clear search"
          >
            <X className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-[60] overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map(thread => (
            <button
              key={thread.id}
              type="button"
              onClick={() => {
                onSuggestionSelect?.(thread.id);
                setShowSuggestions(false);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-tuco-cyan/5 border-b border-neutral-50 last:border-0 transition-colors"
            >
              <p className="font-display font-bold text-xs text-neutral-800 line-clamp-1">
                {thread.title}
              </p>
              <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                {thread.replies.length} replies
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
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
  onModerationClick,
  onAdminClick,
  onProfileClick,
  onNotificationsClick,
  onSuggestionSelect,
  onOpenCategories,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications] = useState([
    {
      id: 1,
      user: 'Priya S.',
      avatar: 'PS',
      message: 'Replied to your thread: "Best sunscreen for 3yo?"',
      time: '2h ago',
      read: false,
    },
    {
      id: 2,
      user: 'Community',
      avatar: '🌱',
      message: 'You earned the "Community Insider" badge!',
      time: '5h ago',
      read: false,
    },
    {
      id: 3,
      user: 'Rahul K.',
      avatar: 'RK',
      message: 'Liked your reply about hair oil',
      time: '1d ago',
      read: true,
    },
  ]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const clearSearch = () => onSearch('');
  return (
    <header className="header bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-3 md:py-4">
        <div className="hidden md:flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-3 cursor-pointer select-none shrink-0 group"
            onClick={clearSearch}
          >
            <img src={tucoLogo} alt="Tuco" className="h-9 w-auto" />
            <div className="border-l border-neutral-300 pl-3">
              <h1 className="font-display font-black text-sm text-neutral-900 leading-tight">
                Tuco Parents Circle
              </h1>
              <p className="text-xs text-neutral-500 font-semibold group-hover:text-tuco-cyan transition-colors">
                tucokids.com/community
              </p>
            </div>
          </div>
          <SearchInput
            searchTerm={searchTerm}
            onSearch={onSearch}
            conversations={conversations}
            onSuggestionSelect={onSuggestionSelect}
          />
          <div className="flex items-center justify-end gap-2 shrink-0">
            {currentUser && (
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className="relative p-2 rounded-xl hover:bg-neutral-50 active:scale-95 transition-all duration-200 group"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-neutral-600 group-hover:text-neutral-800 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotificationsDropdown && (
                  <div className="absolute right-2 top-full mt-2 w-[90vw] max-w-[360px] bg-white border border-neutral-200 rounded-2xl shadow-xl z-[100] animate-in fade-in-0 zoom-in-95 duration-200">
                    <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-tuco-cyan" />
                        <h4 className="font-display font-black text-sm text-neutral-800">
                          Notifications
                        </h4>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowNotificationsDropdown(false);
                          onNotificationsClick();
                        }}
                        className="text-xs text-tuco-cyan font-bold hover:underline"
                      >
                        View all
                      </button>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-neutral-100">
                          {notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                              onClick={e => {
                                e.stopPropagation();
                                setShowNotificationsDropdown(false);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center text-sm font-black text-neutral-700 shrink-0 border border-neutral-200">
                                  {n.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-800 leading-snug">
                                    <span className="font-black">{n.user}</span> {n.message}
                                  </p>
                                  <p className="text-[11px] text-neutral-400 mt-1 font-medium">
                                    {n.time}
                                  </p>
                                </div>
                                {!n.read && (
                                  <div className="w-2 h-2 rounded-full bg-tuco-cyan shrink-0 mt-2" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                          <h4 className="font-display font-black text-sm text-neutral-600 mb-1">
                            No new notifications
                          </h4>
                          <p className="text-xs text-neutral-400 font-medium">
                            You're all caught up!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {(currentUser?.role === 'moderator' || currentUser?.role === 'tuco_team') && (
              <button
                onClick={onAdminClick}
                className="hidden lg:flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-display font-black text-sm py-2 px-4 rounded-lg transition-all"
              >
                <span>⚙️</span>
                <span>Admin</span>
              </button>
            )}
            {currentUser?.role === 'moderator' && (
              <button
                onClick={onModerationClick}
                className="hidden lg:flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-display font-black text-sm py-2 px-4 rounded-lg transition-all"
              >
                <span>⚖️</span>
                <span>Moderation</span>
              </button>
            )}
            <button
              onClick={onNewPostClick}
              className="flex items-center gap-2 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm py-2 px-4 rounded-lg transition-all"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Ask</span>
            </button>
            {currentUser ? (
              <UserMenu
                currentUser={currentUser}
                onLogout={onLogout}
                onModerationClick={onModerationClick}
                onProfileClick={onProfileClick}
                showUserMenu={showUserMenu}
                setShowUserMenu={setShowUserMenu}
              />
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-display font-black text-sm py-2 px-4 rounded-lg transition-all ml-2"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
        <div className="md:hidden flex items-center justify-between gap-2">
          <button
            onClick={onOpenCategories}
            className="p-1.5 hover:bg-neutral-100 rounded shrink-0 flex items-center justify-center"
            title="Categories"
          >
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
          <div className="flex items-center gap-1 cursor-pointer select-none" onClick={clearSearch}>
            <img src={tucoLogo} alt="Tuco" className="h-6 w-auto" />
          </div>
          <SearchInput
            searchTerm={searchTerm}
            onSearch={onSearch}
            conversations={conversations}
            onSuggestionSelect={onSuggestionSelect}
            compact
          />
          {currentUser && (
            <div ref={notificationsRef} className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative p-1.5 rounded-xl hover:bg-neutral-50 active:scale-95 transition-all duration-200 group"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-neutral-600 group-hover:text-neutral-800 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotificationsDropdown && (
                <div className="absolute right-1 top-full mt-1 w-[88vw] max-w-[300px] bg-white border border-neutral-200 rounded-2xl shadow-xl z-[100] animate-in fade-in-0 zoom-in-95 duration-200 md:right-2 md:w-[360px] md:max-w-[360px]">
                  <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-tuco-cyan" />
                      <h4 className="font-display font-black text-sm text-neutral-800">
                        Notifications
                      </h4>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowNotificationsDropdown(false);
                        onNotificationsClick();
                      }}
                      className="text-xs text-tuco-cyan font-bold hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-neutral-100">
                        {notifications.map(n => (
                          <div
                            key={n.id}
                            className={`p-3 hover:bg-neutral-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              setShowNotificationsDropdown(false);
                            }}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center text-xs font-black text-neutral-700 shrink-0 border border-neutral-200">
                                {n.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-neutral-800 leading-snug">
                                  <span className="font-black">{n.user}</span> {n.message}
                                </p>
                                <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">
                                  {n.time}
                                </p>
                              </div>
                              {!n.read && (
                                <div className="w-1.5 h-1.5 rounded-full bg-tuco-cyan shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <Bell className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
                        <h4 className="font-display font-black text-sm text-neutral-600 mb-1">
                          No new notifications
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium">
                          You're all caught up!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onNewPostClick}
            className="bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-xs py-1.5 px-2.5 rounded transition-all shrink-0"
          >
            Ask
          </button>
          {currentUser ? (
            <UserMenu
              currentUser={currentUser}
              onLogout={onLogout}
              onModerationClick={onModerationClick}
              onProfileClick={onProfileClick}
              showUserMenu={showUserMenu}
              setShowUserMenu={setShowUserMenu}
              compact
            />
          ) : (
            <button onClick={onLoginClick} className="p-1.5 hover:bg-neutral-100 rounded shrink-0">
              <User className="w-4 h-4 text-neutral-700" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
function UserMenu({
  currentUser,
  onLogout,
  onModerationClick,
  onProfileClick,
  showUserMenu,
  setShowUserMenu,
  compact = false,
}: {
  currentUser: UserType;
  onLogout: () => void;
  onModerationClick?: () => void;
  onProfileClick?: () => void;
  showUserMenu: boolean;
  setShowUserMenu: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={`relative ${compact ? '' : 'ml-2'}`}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className={`rounded-lg bg-tuco-cyan/10 border border-tuco-cyan text-tuco-cyan font-display font-black flex items-center justify-center hover:bg-tuco-cyan/20 transition-all ${
          compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-xs'
        }`}
      >
        {currentUser.username.slice(0, 2).toUpperCase()}
      </button>
      {showUserMenu && (
        <div
          className={`absolute right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 ${
            compact ? 'w-40' : 'w-56'
          }`}
        >
          <div className={`border-b border-neutral-100 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
            <p className="text-xs text-neutral-500 font-medium">Logged in as</p>
            <p className="font-display font-black text-sm text-neutral-900 mt-1 truncate">
              {currentUser.username}
            </p>
          </div>
          <div className="px-2 py-2 space-y-0.5">
            <button
              onClick={() => {
                onProfileClick?.();
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-100 rounded"
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
            {currentUser.role === 'moderator' && (
              <button
                onClick={() => {
                  onModerationClick?.();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-orange-700 hover:bg-orange-50 rounded"
              >
                ⚖️ Moderation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
