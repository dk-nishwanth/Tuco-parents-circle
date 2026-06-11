import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { CATEGORIES } from '../data/categories';
import { PRODUCTS } from '../data/products';
import { Conversation, User as UserType, Notification } from '../types';
import { getAvatarColor, getInitials, searchThreadsWithRanking, formatTimeAgo } from '../utils/helpers';
import { Heart, MessageSquare, X, Eye, Bookmark, ChevronDown, Search, Bell, ArrowLeft, Menu, User, LogOut, Users } from 'lucide-react';
import tucoLogo from '../assets/tuco-logo.webp';

interface ModalProps {
  thread: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onAddReply: (
    threadId: number,
    name: string,
    city: string,
    text: string,
    image?: string
  ) => void;
  onLikeReply?: (threadId: number, replyId: number) => void;
  onReportReply?: (threadId: number, replyId: number) => void;
  onEditReply?: (threadId: number, replyId: number, newText: string) => void;
  onDeleteReply?: (threadId: number, replyId: number) => void;
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
}
export function Modal({
  thread,
  isOpen,
  onClose,
  onAddReply,
  onLikeReply,
  onReportReply,
  onEditReply,
  onDeleteReply,
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
}: ModalProps) {
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(propsSearchTerm || '');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  
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

  if (!isOpen || !thread) return null;
  
  const category = CATEGORIES[thread.category] || { icon: '💬', label: 'General' };
  const categoryItem = CATEGORIES[activeCategory];
  
  const gettucoProduct = (recId: string) => {
    return PRODUCTS.find(p => p.id === recId) || null;
  };

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
    setReplyText('');
    setReplyImage(undefined);
    setErrorMessage('');
  };

  return (
    <div
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
            <button onClick={onClose} className="hover:opacity-80 transition-opacity">
              <img src={tucoLogo} alt="tuco" className="h-6 w-auto" />
            </button>

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
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
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
                className="w-8 h-8 md:w-9 md:h-9 bg-white border border-[#35B5EC] rounded-lg flex items-center justify-center text-xs md:text-[13px] font-display font-bold text-[#35B5EC] shadow-sm hover:bg-[#35B5EC]/5 transition-colors"
              >
                LA
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
                  {thread.op.author}
                </h4>
                <p className="text-[12px] text-neutral-400 font-medium leading-none">
                  {thread.op.city}
                </p>
              </div>
            </div>
            <span className="text-[12px] text-neutral-400 font-medium">
              {formatTimeAgo(thread.createdAt)}
            </span>
          </div>

          <h2 className="font-bold text-[21px] text-[#4D4747] leading-[1.25] mb-5 tracking-tight">
            {thread.title}
          </h2>

          <p className="text-[14.5px] text-[#555555] leading-relaxed font-normal mb-8">
            {thread.op.text}
          </p>

          <div className="flex items-center justify-end gap-5 pt-5 border-t border-neutral-100">
            <Bookmark className="w-5 h-5 text-[#4D4747] cursor-pointer hover:text-neutral-500 transition-colors" strokeWidth={1.5} />
            <div className="flex items-center gap-1.5 text-[#4D4747]">
              <Eye className="w-5 h-5 text-[#4D4747]" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">{thread.views || 691} Views</span>
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
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Join the conversation..."
                className="w-full text-[16px] text-neutral-600 placeholder-neutral-300 outline-none resize-none min-h-[45px] font-normal pt-1.5"
              />
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
          <span className="font-bold text-[16px] text-[#4D4747]">{thread.replies.length} Replies</span>
        </div>

        {/* Replies Controls */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-neutral-200 rounded-full text-[14px] font-medium text-neutral-400 hover:border-neutral-300 transition-all"
            >
              <span>New (Default)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
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

        {/* Replies List */}
        <div className="space-y-6">
          {thread.replies.map((reply) => {
            const product = reply.tucoRec ? gettucoProduct(reply.tucoRec) : null;
            return (
              <div key={reply.id} className="bg-white border border-neutral-200 rounded-[24px] p-6 shadow-sm relative overflow-hidden">
                {/* Branded Left Edge */}
                <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#FFE259] pointer-events-none opacity-30"></div>
                
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

                <p className="text-[14.5px] text-[#4D4747] leading-relaxed font-normal mb-6">
                  {reply.text}
                </p>

                <div className="flex items-center justify-end gap-2 mb-6">
                  <button
                    onClick={() => onLikeReply && thread && onLikeReply(thread.id, reply.id)}
                    className="flex items-center gap-2 hover:scale-110 transition-transform"
                  >
                    <Heart
                      className={`w-4 h-4 stroke-[1.5] ${likedReplies[reply.id] ? 'text-red-500 fill-red-500' : 'text-[#4D4747] hover:text-red-500'}`}
                    />
                    <span className={`text-[13px] font-medium ${likedReplies[reply.id] ? 'text-red-500' : 'text-[#4D4747]'}`}>
                      {reply.likes} Helpful
                    </span>
                  </button>
                </div>

                {product && (
                  <div className="bg-white border border-neutral-100 rounded-[20px] overflow-hidden flex items-stretch shadow-sm">
                    <div className="w-36 bg-[#FEF9C3] flex items-center justify-center p-7 shrink-0">
                      <span className="text-6xl">{product.icon}</span>
                    </div>
                    <div className="flex-1 p-7 flex flex-col justify-center">
                      <h5 className="font-bold text-[18px] text-[#4D4747] leading-snug mb-1">
                        {product.name}
                      </h5>
                      <p className="text-[12px] text-neutral-400 font-medium mb-6">
                        {product.tag}
                      </p>
                      <button className="bg-[#FED018] hover:bg-[#fccb0a] text-neutral-800 px-8 py-2 rounded-full text-[14px] font-bold w-fit transition-colors">
                        add to cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
