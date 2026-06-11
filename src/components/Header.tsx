import { useState, ChangeEvent, useRef, useEffect, KeyboardEvent } from 'react';
import { MessageSquarePlus, Search, LogOut, User, X, Menu, Bell, ChevronDown, MessageSquare, Award, ThumbsUp, Trash2 } from 'lucide-react';
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
  onThreadOpen?: (id: number) => void;
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
    if (e.key === 'Enter' && suggestions.length > 0) {
      onSuggestionSelect?.(suggestions[0].id);
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${compact ? 'flex-1' : 'flex-1 max-w-sm'}`}>
      <div
        className={`flex items-center bg-[#F7F7F7] border border-neutral-200 rounded-lg focus-within:bg-white focus-within:border-tuco-cyan/30 transition-all ${
          compact ? 'py-1 px-3' : 'py-2 px-3'
        }`}
      >
        <Search className="w-4 h-4 text-[#4D4747] mr-2 shrink-0" strokeWidth={2} />
        <input
          type="text"
          placeholder="search"
          className={`w-full border-none bg-transparent font-sans outline-none text-[#4D4747] font-medium placeholder-neutral-400 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
          value={searchTerm}
          onChange={handleSearch}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.trim().length >= 1 && setShowSuggestions(true)}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            {suggestions.map(thread => (
              <button
                key={thread.id}
                type="button"
                onClick={() => {
                  onSuggestionSelect?.(thread.id);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-tuco-cyan/5 flex flex-col gap-0.5 border-b border-neutral-50 last:border-0 transition-colors"
              >
                <p className="font-display font-bold text-xs text-[#4D4747] line-clamp-1">
                  {thread.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {thread.replies.length} replies
                  </span>
                  <span className="text-[10px] text-neutral-300">•</span>
                  <span className="text-[10px] text-neutral-400 font-medium">
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
  notifications = [],
  onMarkAsRead,
  onThreadOpen,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearSearch = () => onSearch('');

  return (
    <header className="header bg-white border-b border-neutral-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-1.5 flex items-center gap-2 md:gap-3">
        {/* Left: Logo (Desktop) / Menu + Logo (Mobile) */}
        <div className="flex items-center gap-2 shrink-0 w-32 md:w-auto justify-start">
          <button 
            onClick={onOpenCategories}
            className="p-1 md:hidden"
          >
            <Menu className="w-6 h-6 text-[#4D4747]" strokeWidth={2} />
          </button>
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={clearSearch}
          >
            <img src={tucoLogo} alt="tuco" className="h-8 w-auto" />
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 min-w-0 flex justify-center">
          <div className="max-w-sm w-full">
            <SearchInput
              searchTerm={searchTerm}
              onSearch={onSearch}
              conversations={conversations}
              onSuggestionSelect={onSuggestionSelect}
              compact={true}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0 w-32 md:w-auto justify-end">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="p-1 relative hover:bg-neutral-50 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5 text-[#4D4747]" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-tuco-orange rounded-full border-2 border-white shadow-sm"></span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="fixed md:absolute top-[64px] md:top-full left-4 right-4 md:left-auto md:right-0 md:mt-2 md:w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-neutral-50 bg-neutral-50/50 flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm text-[#4D4747]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-tuco-cyan/10 text-tuco-cyan text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
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
          
          <button
            onClick={onNewPostClick}
            className="bg-[#35B5EC] text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-xs md:text-[13px] font-display font-bold transition-all shadow-sm active:scale-95"
          >
            ask
          </button>

          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 md:w-9 md:h-9 bg-white border border-[#35B5EC] rounded-lg flex items-center justify-center text-xs md:text-[13px] font-display font-bold text-[#35B5EC] shadow-sm hover:bg-[#35B5EC]/5 transition-colors"
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
            <button
              onClick={onLoginClick}
              className="w-8 h-8 md:w-9 md:h-9 bg-white border border-[#35B5EC] rounded-lg flex items-center justify-center text-xs md:text-[13px] font-display font-bold text-[#35B5EC] shadow-sm hover:bg-[#35B5EC]/5 transition-colors"
            >
              LA
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
  onAdminClick,
  onProfileClick,
  showUserMenu,
  setShowUserMenu,
  compact = false,
}: {
  currentUser: UserType;
  onLogout: () => void;
  onModerationClick?: () => void;
  onAdminClick?: () => void;
  onProfileClick?: () => void;
  showUserMenu: boolean;
  setShowUserMenu: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={`relative ${compact ? '' : 'ml-2'}`}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className={`rounded-lg bg-tuco-cyan/10 border border-tuco-cyan text-tuco-cyan font-display font-bold flex items-center justify-center hover:bg-tuco-cyan/20 transition-all ${
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
            <p className="font-display font-bold text-sm text-neutral-900 mt-1 truncate">
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
            {(currentUser.role === 'moderator' || currentUser.role === 'tuco_team') && (
              <button
                onClick={() => {
                  onAdminClick?.();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-purple-700 hover:bg-purple-50 rounded"
              >
                ⚙️ Admin
              </button>
            )}
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
