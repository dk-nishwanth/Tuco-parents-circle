import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { MessageSquarePlus, Search, LogOut, User, X } from 'lucide-react';
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
  onSuggestionSelect?: (threadId: number) => void;
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
    searchTerm.trim().length >= 2
      ? searchThreadsWithRanking(conversations, searchTerm, 6)
      : [];

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
        <Search className={`text-neutral-400 mr-2 shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
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
          {suggestions.map((thread) => (
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
  onSuggestionSelect,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

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
