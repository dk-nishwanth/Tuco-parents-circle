import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { CATEGORIES } from '../data/categories';
import { Conversation, User as UserType, Notification, Reply } from '../types';
import { getAvatarColor, getInitials, searchThreadsWithRanking, formatTimeAgo, countAllReplies } from '../utils/helpers';
import { Heart, MessageSquare, X, Eye, Bookmark, ChevronDown, Search, Bell, ArrowLeft, Menu, User, LogOut, Users, Share2, Trash2 } from 'lucide-react';
import { track } from '../utils/analytics';
import tucoLogo from '../assets/tuco-logo.webp';
import { FollowButton } from './FollowButton';
import { TucoVideoCard, parseYouTubeId, stripYouTubeUrl } from './TucoVideo';

interface ModalProps {
  thread: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onAddReply: (
    threadId: number,
    name: string,
    city: string,
    text: string,
    image?: string,
    parentId?: number
  ) => void;
  onLikeReply?: (threadId: number, replyId: number) => void;
  onReportReply?: (threadId: number, replyId: number) => void;
  onEditReply?: (threadId: number, replyId: number, newText: string) => void;
  onDeleteReply?: (threadId: number, replyId: number) => void;
  onDeleteThread?: (threadId: number) => void;
  currentUser?: UserType | null;
  likedReplies?: Record<number, boolean>;
  users?: Record<string, UserType>;
  searchTerm?: string;
  onSearch?: (term: string) => void;
  conversations?: Conversation[];
  onNewPostClick?: () => void;
  onLogout?: () => void;
  onLoginClick?: () => void;
  onModerationClick?: () => void;
  onAdminClick?: () => void;
  onProfileClick?: () => void;
  onNotificationsClick?: () => void;
  onSuggestionSelect?: (threadId: number) => void;
  onOpenCategories?: () => void;
  notifications?: Notification[];
  onMarkAsRead?: (id: number) => void;
  onThreadOpen?: (id: number) => void;
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  activeReplyTo?: { threadId: number; replyId: number } | null;
  setActiveReplyTo?: (val: { threadId: number; replyId: number } | null) => void;
  onSavePostClick?: (threadId: number) => void;
  savedPosts?: number[];
}

// Recursive Reply Component
const ReplyComponent = ({
  reply,
  threadId,
  onAddReply,
  onLikeReply,
  onReportReply,
  onEditReply,
  onDeleteReply,
  currentUser,
  likedReplies,
  activeReplyTo,
  setActiveReplyTo,
}: {
  reply: Reply;
  threadId: number;
  onAddReply: (
    threadId: number,
    name: string,
    city: string,
    text: string,
    image?: string,
    parentId?: number
  ) => void;
  onLikeReply?: (threadId: number, replyId: number) => void;
  onReportReply?: (threadId: number, replyId: number) => void;
  onEditReply?: (threadId: number, replyId: number, newText: string) => void;
  onDeleteReply?: (threadId: number, replyId: number) => void;
  currentUser?: UserType | null;
  likedReplies?: Record<number, boolean>;
  activeReplyTo?: { threadId: number; replyId: number } | null;
  setActiveReplyTo?: (val: { threadId: number; replyId: number } | null) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(reply.text);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isReplying && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [isReplying]);

  const handleSubmitNestedReply = (e: FormEvent) => {
    e.preventDefault();
    if (replyText.trim() && currentUser) {
      onAddReply(threadId, currentUser.username, currentUser.city, replyText, undefined, reply.id);
      setReplyText('');
      setIsReplying(false);
      if (setActiveReplyTo) setActiveReplyTo(null);
    }
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editText.trim() && onEditReply) {
      onEditReply(threadId, reply.id, editText);
      setIsEditing(false);
    }
  };

  // Match ownership by stable authorId (usernames aren't unique and can be
  // changed). Fall back to author name only for legacy replies with no id.
  const isOwnReply = !!currentUser && (
    reply.authorId ? reply.authorId === currentUser.id : currentUser.username === reply.author
  );
  const isMod = currentUser && (currentUser.role === 'moderator' || currentUser.role === 'tuco_team');

  return (
    <div key={reply.id} id={`reply-${reply.id}`} className="bg-white border border-neutral-200 rounded-[24px] p-6 shadow-sm relative overflow-hidden scroll-mt-24">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px]"
            style={{ backgroundColor: getAvatarColor(reply.author), color: '#4D4747' }}
          >
            {getInitials(reply.author)}
          </div>
          <div>
            <h4 className="font-bold text-[15px] text-[#4D4747] leading-none mb-1">
              {reply.author}
            </h4>
            <p className="text-[12px] text-neutral-400 font-medium leading-none">
              {reply.city}
            </p>
          </div>
        </div>
        <span className="text-[12px] text-neutral-400 font-medium">
          {formatTimeAgo(reply.createdAt)}
        </span>
      </div>

      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="mb-6">
          <textarea
            value={editText}
            onChange={(e) => { setEditText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#FED018] focus:ring-2 focus:ring-[#FED018]/20 transition-all resize-none overflow-hidden"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="bg-[#FED018] hover:bg-[#fccb0a] text-neutral-800 px-4 py-2 rounded-full text-sm font-bold transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditText(reply.text);
              }}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-4 py-2 rounded-full text-sm font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (() => {
        const videoId = reply.authorRole === 'tuco_team' ? parseYouTubeId(reply.text) : null;
        const bodyText = videoId ? stripYouTubeUrl(reply.text) : reply.text;
        return (
          <div className="mb-6">
            {bodyText ? (
              <p className="text-[14.5px] text-[#4D4747] leading-relaxed font-normal">
                {bodyText}
              </p>
            ) : null}
            {videoId ? <TucoVideoCard videoId={videoId} variant="thread" /> : null}
          </div>
        );
      })()}

      <div className="flex items-center justify-end gap-4 mb-4">
        {!isEditing && (
          <>
            <button
              onClick={() => onLikeReply && threadId && onLikeReply(threadId, reply.id)}
              className="flex items-center gap-2 hover:scale-110 transition-transform"
            >
              <Heart
                className={`w-4 h-4 stroke-[1.5] ${likedReplies && likedReplies[reply.id] ? 'text-red-500 fill-red-500' : 'text-[#4D4747] hover:text-red-500'}`}
              />
              <span className={`text-[13px] font-medium ${likedReplies && likedReplies[reply.id] ? 'text-red-500' : 'text-[#4D4747]'}`}>
                {reply.likes} Helpful
              </span>
            </button>
            <button
              onClick={() => {
                if (setActiveReplyTo) {
                  setActiveReplyTo({ threadId, replyId: reply.id });
                  setIsReplying(true);
                } else {
                  setIsReplying(!isReplying);
                }
              }}
              className="flex items-center gap-2 hover:scale-110 transition-transform text-[#4D4747]"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[13px] font-medium">Reply</span>
            </button>
            {isOwnReply && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 hover:scale-110 transition-transform text-[#4D4747]"
              >
                <span className="text-[13px] font-medium">Edit</span>
              </button>
            )}
            {(isOwnReply || isMod) && onDeleteReply && (
              <button
                onClick={() => {
                  if (window.confirm('Delete this reply? This cannot be undone.')) {
                    onDeleteReply(threadId, reply.id);
                  }
                }}
                className="flex items-center gap-2 hover:scale-110 transition-transform text-red-500"
              >
                <span className="text-[13px] font-medium">Delete</span>
              </button>
            )}
            <button
              type="button"
              aria-label="Share this reply"
              title="Share reply"
              onClick={async () => {
                // Deep-link format mirrors thread sharing. AppContent's hash
                // handler recognizes #reply-<id>, opens the parent thread, and
                // scrolls the reply into view.
                const url = `${window.location.origin}/#reply-${reply.id}`;
                const shareData = {
                  title: `Reply by ${reply.author} — tuco Parents Circle`,
                  text: reply.text.length > 140 ? reply.text.slice(0, 137) + '…' : reply.text,
                  url,
                };
                try {
                  if (navigator.share && navigator.canShare?.(shareData)) {
                    await navigator.share(shareData);
                    track('share_reply', { reply_id: reply.id, thread_id: threadId, method: 'native' });
                  } else {
                    await navigator.clipboard.writeText(url);
                    track('share_reply', { reply_id: reply.id, thread_id: threadId, method: 'clipboard' });
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }
                } catch {
                  // user cancelled — no-op
                }
              }}
              className="flex items-center gap-2 hover:scale-110 transition-transform text-[#4D4747]"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">
                {shareCopied ? 'Copied!' : 'Share'}
              </span>
            </button>
          </>
        )}
      </div>

      {isReplying && (
        <form onSubmit={handleSubmitNestedReply} className="mb-4">
          <textarea
            ref={replyInputRef}
            value={replyText}
            onChange={(e) => { setReplyText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            placeholder={`Reply to ${reply.author}...`}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#FED018] focus:ring-2 focus:ring-[#FED018]/20 transition-all resize-none overflow-hidden"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="bg-[#FED018] hover:bg-[#fccb0a] disabled:opacity-50 disabled:cursor-not-allowed text-neutral-800 px-4 py-2 rounded-full text-sm font-bold transition-colors"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => {
                setIsReplying(false);
                setReplyText('');
                if (setActiveReplyTo) setActiveReplyTo(null);
              }}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-4 py-2 rounded-full text-sm font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Render Nested Replies */}
      {reply.replies && reply.replies.length > 0 && (
        <div className="ml-8 mt-4 space-y-4">
          {reply.replies.map((nestedReply) => (
            <ReplyComponent
              key={nestedReply.id}
              reply={nestedReply}
              threadId={threadId}
              onAddReply={onAddReply}
              onLikeReply={onLikeReply}
              onReportReply={onReportReply}
              onEditReply={onEditReply}
              onDeleteReply={onDeleteReply}
              currentUser={currentUser}
              likedReplies={likedReplies}
              activeReplyTo={activeReplyTo}
              setActiveReplyTo={setActiveReplyTo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function Modal({
  thread,
  isOpen,
  onClose,
  onAddReply,
  onLikeReply,
  activeReplyTo,
  setActiveReplyTo,
  onReportReply,
  onEditReply,
  onDeleteReply,
  onDeleteThread,
  currentUser,
  likedReplies = {},
  users = {},
  searchTerm: propsSearchTerm,
  onSearch,
  conversations = [],
  onNewPostClick,
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
  activeCategory = 'all',
  onCategoryChange,
  onSavePostClick,
  savedPosts = [],
}: ModalProps) {
  // Auto-restore any draft this user started on this thread — including drafts
  // preserved across a Google OAuth reload that would otherwise wipe React state.
  const draftKey = thread ? `tuco_draft_reply_${thread.id}` : '';
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [replySort, setReplySort] = useState<'new' | 'top' | 'old'>('new');
  const [shareCopied, setShareCopied] = useState(false);

  // Load this thread's saved draft whenever the thread becomes available.
  // This can't be done in the useState initializer above because on a fresh
  // page load (e.g. after the Google OAuth reload) the component first mounts
  // while `thread` is still null — so draftKey is empty and there is nothing to
  // read. Once conversations load and the thread appears, we pull the draft in.
  const justLoadedDraftRef = useRef(false);
  useEffect(() => {
    if (!draftKey) return;
    try { setReplyText(sessionStorage.getItem(draftKey) || ''); }
    catch { setReplyText(''); }
    justLoadedDraftRef.current = true;
  }, [draftKey]);

  // Persist the current draft on every keystroke so a full-page reload
  // (Google OAuth, accidental refresh, network hiccup) doesn't lose it.
  // Skip the pass that immediately follows a load so we never overwrite the
  // freshly-restored draft with the empty value it briefly held before.
  useEffect(() => {
    if (!draftKey) return;
    if (justLoadedDraftRef.current) { justLoadedDraftRef.current = false; return; }
    try {
      if (replyText) sessionStorage.setItem(draftKey, replyText);
      else sessionStorage.removeItem(draftKey);
    } catch { /* ignore */ }
  }, [draftKey, replyText]);
  const [searchTerm, setSearchTerm] = useState(propsSearchTerm || '');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  
  const replySortOptions = [
    { key: 'new' as const, label: 'New (Default)', icon: '✨', desc: 'Most recent first' },
    { key: 'top' as const, label: 'Top', icon: '🔥', desc: 'Most liked first' },
    { key: 'old' as const, label: 'Oldest', icon: '🕐', desc: 'Oldest first' },
  ];
  const currentReplySort = replySortOptions.find(o => o.key === replySort)!;

  const sortedReplies = [...(thread?.replies || [])].sort((a, b) => {
    if (replySort === 'top') return (b.likes || 0) - (a.likes || 0);
    if (replySort === 'old') return (a.id || 0) - (b.id || 0);
    // new: most recent first by id
    return (b.id || 0) - (a.id || 0);
  }).filter(r => !searchTerm.trim() || r.text?.toLowerCase().includes(searchTerm.toLowerCase()) || r.author?.toLowerCase().includes(searchTerm.toLowerCase()));

  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestions =
    searchTerm.trim().length >= 1 ? searchThreadsWithRanking(conversations, searchTerm, 6) : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsDropdown(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close the thread view on Escape, matching the X button / back gesture.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !thread) return null;
  
  const category = CATEGORIES[thread.category] || { icon: '💬', label: 'General' };
  const categoryItem = CATEGORIES[activeCategory];
  
  const handleReplySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !replyImage) {
      setErrorMessage('Please write some thoughts or upload an image.');
      return;
    }
    onAddReply(
      thread.id,
      currentUser?.username || 'Guest',
      currentUser?.city || 'India',
      replyText.trim(),
      replyImage
    );
    // Only clear if user is logged in — if not, auth modal opens and we want to preserve the text
    if (currentUser) {
      setReplyText('');
      setReplyImage(undefined);
      setErrorMessage('');
      try { if (draftKey) sessionStorage.removeItem(draftKey); } catch { /* ignore */ }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={thread.title}
      className="fixed inset-0 bg-[#F9FAFB] z-[60] overflow-y-auto flex flex-col font-sans"
    >
      {/* App Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-1.5 flex items-center gap-2 md:gap-3">
          {/* Mobile Left: Back, Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-neutral-50 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[#4D4747]" strokeWidth={2} />
            </button>
            <a
              href="https://tucokids.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Go to tucokids.com"
            >
              <img src={tucoLogo} alt="tuco Kids" className="h-6 w-auto" />
            </a>

            {/* Category Dropdown (Desktop only) */}
            <div className="hidden md:block relative" ref={categoryRef}>
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-[13px] font-display font-bold text-[#4D4747] shadow-sm"
              >
                {activeCategory === 'saved' ? (
                  <span className="text-sm">📌</span>
                ) : categoryItem ? (
                  <span className="text-sm">{categoryItem.icon}</span>
                ) : (
                  <Users className="w-4 h-4 text-tuco-cyan" strokeWidth={2} />
                )}
                <span className="hidden lg:inline">{activeCategory === 'saved' ? 'Saved Discussions' : categoryItem ? categoryItem.label : 'All Discussions'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>
              
              {isCategoryOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-lg z-[80] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                      <span>All Discussions</span>
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
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 min-w-[80px] max-w-sm" ref={suggestionsRef}>
            <div className="relative">
              <div
                className="flex items-center bg-[#F3F4F6] border border-neutral-200 rounded-lg focus-within:bg-white focus-within:border-[#35B5EC]/30 transition-all py-1 px-3"
              >
                <Search className="w-4 h-4 text-[#4D4747] mr-2 shrink-0" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="search"
                  className="w-full border-none bg-transparent font-sans outline-none text-[#4D4747] font-medium placeholder-neutral-400 text-xs"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (onSearch) onSearch(e.target.value);
                    if (e.target.value.trim().length >= 1) setShowSuggestions(true);
                  }}
                  onFocus={() => searchTerm.trim().length >= 1 && setShowSuggestions(true)}
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="py-1">
                    {suggestions.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          onSuggestionSelect?.(thread.id);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#35B5EC]/5 flex flex-col gap-0.5 border-b border-neutral-50 last:border-0 transition-colors"
                      >
                        <p className="font-display font-bold text-xs text-[#4D4747] line-clamp-1">
                          {thread.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400 font-medium">
                            {countAllReplies(thread.replies)} replies
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
          </div>

          {/* Right: Actions — ml-auto keeps this pinned to the right edge on
              desktop so the header stays visually balanced when the search
              box is capped at max-w-sm and doesn't fill remaining space. */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-auto">
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                className="p-1 relative hover:bg-neutral-50 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5 text-[#4D4747]" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#EB3200] rounded-full border-2 border-white shadow-sm"></span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="fixed md:absolute top-[64px] md:top-full left-4 right-4 md:left-auto md:right-0 md:mt-2 md:w-80 bg-white border border-neutral-200 rounded-2xl shadow-xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-neutral-50 bg-neutral-50/50 flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-[#4D4747]">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="bg-[#35B5EC]/10 text-[#35B5EC] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-neutral-50">
                        {notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => {
                              onMarkAsRead?.(notification.id);
                              if (notification.threadId) onThreadOpen?.(notification.threadId);
                              setShowNotificationsDropdown(false);
                            }}
                            className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                              !notification.read ? 'bg-[#35B5EC]/[0.02]' : ''
                            }`}
                          >
                            <div className="shrink-0 mt-0.5">
                              {notification.type === 'reply' && <MessageSquare className="w-4 h-4 text-[#35B5EC]" />}
                              {notification.type === 'like' && <Heart className="w-4 h-4 text-[#EB3200]" />}
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
                                <div className="w-1.5 h-1.5 bg-[#35B5EC] rounded-full"></div>
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
                        className="w-full py-2 text-[11px] font-display font-bold text-neutral-500 hover:text-[#35B5EC] transition-colors"
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
              Ask
            </button>

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 md:w-9 md:h-9 bg-white border border-[#35B5EC] rounded-lg flex items-center justify-center text-xs md:text-[13px] font-display font-bold text-[#35B5EC] shadow-sm hover:bg-[#35B5EC]/5 transition-colors"
                >
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                          onLogout?.();
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
            ) : (
              <button
                onClick={onLoginClick}
                aria-label="Sign in"
                className="w-8 h-8 md:w-9 md:h-9 bg-white border border-[#35B5EC] rounded-lg flex items-center justify-center text-[#35B5EC] shadow-sm hover:bg-[#35B5EC]/5 transition-colors"
              >
                <User className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[680px] mx-auto w-full px-4 py-6">
        {/* Main Post Card */}
        <div className="bg-white border border-neutral-200 rounded-[24px] p-6 mb-4 shadow-sm relative overflow-hidden">
          {/* Branded Left Edge */}
          <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#FFE259] pointer-events-none"></div>
          
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px]"
                style={{ backgroundColor: getAvatarColor(thread.op.author), color: '#4D4747' }}
              >
                {getInitials(thread.op.author)}
              </div>
              <div>
                <h4 className="font-bold text-[15px] text-[#4D4747] leading-none mb-1">
                  <a
                    href={`/u/${encodeURIComponent(thread.op.author)}`}
                    onClick={e => {
                      e.preventDefault();
                      onClose();
                      setTimeout(() => { window.location.href = `/u/${encodeURIComponent(thread.op.author)}`; }, 150);
                    }}
                    className="hover:text-[#35B5EC] hover:underline"
                  >
                    {thread.op.author}
                  </a>
                </h4>
                <p className="text-[12px] text-neutral-400 font-medium leading-none">
                  {thread.op.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {thread.authorId && (!currentUser || currentUser.id !== thread.authorId) && (
                <FollowButton
                  targetType="user"
                  targetId={thread.authorId}
                  isLoggedIn={!!currentUser}
                  onRequireLogin={onLoginClick || (() => {})}
                  labelWhenNot="Follow"
                  labelWhenFollowing="Following"
                />
              )}
              {onDeleteThread && currentUser && thread.authorId && currentUser.id === thread.authorId && (
                <button
                  onClick={() => onDeleteThread(thread.id)}
                  aria-label="Delete thread"
                  className="flex items-center gap-1 text-[12px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-full transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Delete
                </button>
              )}
              <span className="text-[12px] text-neutral-400 font-medium">
                {formatTimeAgo(thread.createdAt)}
              </span>
            </div>
          </div>

          <h2 className="font-bold text-[21px] text-[#4D4747] leading-[1.25] mb-5 tracking-tight">
            {thread.title}
          </h2>

          <p className="text-[14.5px] text-[#555555] leading-relaxed font-normal mb-8">
            {thread.op.text}
          </p>

          <div className="flex items-center justify-end gap-5 pt-5 border-t border-neutral-100">
            <FollowButton
              targetType="thread"
              targetId={thread.id}
              isLoggedIn={!!currentUser}
              onRequireLogin={onLoginClick || (() => {})}
              labelWhenNot="Follow thread"
              labelWhenFollowing="Following thread"
            />
            <button
              type="button"
              aria-label="Share this thread"
              title="Share"
              onClick={async () => {
                // Deep-link scheme is a URL hash (#thread-<id>) that AppContent
                // reads on load; the previous /thread/<id> path had no matching
                // route and silently 404'd on the recipient's device.
                const url = `${window.location.origin}/#thread-${thread.id}`;
                const shareData = {
                  title: thread.title,
                  text: `${thread.title} — tuco Parents Circle`,
                  url,
                };
                try {
                  if (navigator.share && navigator.canShare?.(shareData)) {
                    await navigator.share(shareData);
                    track('share_post', { thread_id: thread.id, method: 'native' });
                  } else {
                    await navigator.clipboard.writeText(url);
                    track('share_post', { thread_id: thread.id, method: 'clipboard' });
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }
                } catch {
                  // user cancelled — no-op
                }
              }}
              className="text-[#4D4747] hover:text-[#35B5EC] transition-colors"
            >
              <Share2 className="w-5 h-5" strokeWidth={1.5} />
            </button>
            {shareCopied && (
              <span className="text-xs text-[#35B5EC] font-medium">Link copied!</span>
            )}
            <button
              type="button"
              aria-label={savedPosts.includes(thread.id) ? 'Remove from saved' : 'Save post'}
              aria-pressed={savedPosts.includes(thread.id)}
              className="text-[#4D4747] hover:text-neutral-500 transition-colors"
              onClick={() => {
                if (!currentUser) {
                  onLoginClick?.();
                } else {
                  onSavePostClick?.(thread.id);
                }
              }}
            >
              <Bookmark
                className={`w-5 h-5 transition-colors ${savedPosts.includes(thread.id) ? 'text-[#EB3200] fill-current' : ''}`}
                strokeWidth={1.5}
              />
            </button>
            <div className="flex items-center gap-1.5 text-[#4D4747]">
              <Eye className="w-5 h-5 text-[#4D4747]" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">{thread.views || 0} Views</span>
            </div>
          </div>
        </div>

        {/* Join conversation Box */}
        <div className="bg-white border border-neutral-200 rounded-[24px] p-6 mb-8 shadow-sm">
          <div className="flex gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0"
              style={{ backgroundColor: getAvatarColor(currentUser?.username || 'Guest'), color: '#4D4747' }}
            >
              {getInitials(currentUser?.username || 'Guest')}
            </div>
            <div className="flex-1 relative">
              <textarea
                value={replyText}
                onChange={(e) => { setReplyText(e.target.value); if (errorMessage) setErrorMessage(''); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                placeholder="Join the conversation..."
                className="w-full text-[16px] text-neutral-600 placeholder-neutral-300 outline-none resize-none overflow-hidden min-h-[45px] font-normal pt-1.5"
              />
              {errorMessage && (
                <p className="text-[13px] text-red-500 font-medium mt-1" role="alert">{errorMessage}</p>
              )}
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  onClick={handleReplySubmit}
                  className="bg-[#35B5EC] hover:bg-[#2da3d6] text-white px-9 py-2.5 rounded-full text-[14px] font-bold transition-all shadow-sm active:scale-95"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Replies Header */}
        <div className="flex items-center gap-2.5 mb-5 px-1">
          <MessageSquare className="w-5 h-5 text-[#4D4747]" strokeWidth={2} />
          <span className="font-bold text-[16px] text-[#4D4747]">{countAllReplies(thread.replies)} Replies</span>
        </div>

        {/* Replies Controls */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 rounded-full text-[14px] font-medium text-neutral-600 hover:border-tuco-cyan hover:bg-neutral-50 transition-all"
            >
              <span>{currentReplySort.icon}</span>
              <span>{currentReplySort.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSortOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-1">
                  {replySortOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setReplySort(opt.key); setIsSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-display font-bold flex items-center gap-2 transition-colors ${replySort === opt.key ? 'bg-tuco-cyan/5 text-tuco-cyan' : 'text-neutral-600 hover:bg-neutral-50'}`}
                    >
                      <span>{opt.icon}</span>
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10px] font-normal text-neutral-400">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Comments"
              className="w-full pl-12 pr-6 py-2.5 bg-white border border-neutral-200 rounded-full text-[14px] font-normal outline-none focus:border-neutral-300 placeholder-neutral-300 transition-all"
            />
          </div>
        </div>

        {/* Replies List — guests see the first 2 clearly, rest is blurred
            behind a signup CTA. Big conversion lever: makes the value of
            joining tangible instead of abstract. */}
        <div className="space-y-6">
          {sortedReplies.length === 0 && searchTerm.trim() && (
            <p className="text-center text-sm text-neutral-400 py-8">No replies match "{searchTerm}"</p>
          )}
          {(() => {
            const GUEST_VISIBLE = 2;
            const isGuest = !currentUser;
            const hiddenCount = isGuest ? Math.max(0, sortedReplies.length - GUEST_VISIBLE) : 0;
            const visibleReplies = isGuest ? sortedReplies.slice(0, GUEST_VISIBLE) : sortedReplies;
            const blurredReplies = isGuest ? sortedReplies.slice(GUEST_VISIBLE) : [];
            return (
              <>
                {visibleReplies.map((reply) => (
                  <ReplyComponent
                    key={reply.id}
                    reply={reply}
                    threadId={thread.id}
                    onAddReply={onAddReply}
                    onLikeReply={onLikeReply}
                    onReportReply={onReportReply}
                    onEditReply={onEditReply}
                    onDeleteReply={onDeleteReply}
                    currentUser={currentUser}
                    likedReplies={likedReplies}
                    activeReplyTo={activeReplyTo}
                    setActiveReplyTo={setActiveReplyTo}
                  />
                ))}
                {hiddenCount > 0 && (
                  <div className="relative">
                    <div className="pointer-events-none select-none blur-sm space-y-6 max-h-[520px] overflow-hidden opacity-70">
                      {blurredReplies.slice(0, 3).map((reply) => (
                        <ReplyComponent
                          key={`blur-${reply.id}`}
                          reply={reply}
                          threadId={thread.id}
                          onAddReply={onAddReply}
                          onLikeReply={onLikeReply}
                          onReportReply={onReportReply}
                          onEditReply={onEditReply}
                          onDeleteReply={onDeleteReply}
                          currentUser={currentUser}
                          likedReplies={likedReplies}
                          activeReplyTo={activeReplyTo}
                          setActiveReplyTo={setActiveReplyTo}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                      <div className="pointer-events-auto bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-3xl px-6 py-6 mx-4 mb-4 shadow-xl max-w-md text-center">
                        <h3 className="font-display font-bold text-lg text-[#4D4747] mb-1">
                          {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'} from real parents
                        </h3>
                        <p className="text-sm text-neutral-500 mb-4">
                          Sign up free to see every answer, reply yourself, and get notified when this thread gets new replies.
                        </p>
                        <button
                          type="button"
                          onClick={onLoginClick}
                          className="bg-[#FED018] hover:bg-[#fccb0a] text-neutral-800 px-6 py-2.5 rounded-full font-bold text-sm transition-colors"
                        >
                          Sign up free — takes 10 seconds
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
