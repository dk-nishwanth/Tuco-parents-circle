import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { MainContent } from './components/MainContent';
import { RightSidebar } from './components/RightSidebar';
import { Modal } from './components/Modal';
import { NewPostModal } from './components/NewPostModal';
import { AuthModal } from './components/AuthModal';
import { ModerationDashboard } from './components/ModerationDashboard';
import { SearchResults } from './components/SearchResults';
import { GuestPromptBanner } from './components/GuestPromptBanner';
import { ThreadReviewConfirmation } from './components/ThreadReviewConfirmation';
import { AdminToolsPanel } from './components/AdminToolsPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { ProfileModal } from './components/ProfileModal';
import { WarningModal } from './components/WarningModal';
import { ReportModal } from './components/ReportModal';
import { INITIAL_CONVERSATIONS } from './data/conversations';
import { CATEGORIES } from './data/categories';
import {
  Conversation,
  Reply,
  User,
  ModerationStatus,
  DateFilter,
  PendingReviewSession,
  Notification,
} from './types';
import {
  analyzeContent,
  cantucoTeamPost,
  getReviewPriority,
  shouldTriggerHumanReview,
} from './utils/moderation';
import { checkEligibleBadges, generateDiscountCode, BADGE_DISPLAY } from './utils/badgeSystem';
import {
  filterThreads,
  searchThreadsWithRanking,
  getRelatedThreads,
  getFeaturedThreads,
} from './utils/helpers';
import {
  sendThreadApprovalEmail,
  shouldSendWeeklyEmail,
  sendWeeklyEngagementToAllUsers,
} from './utils/emailService';
import { mergeSeedWithExisting } from './utils/seedContent';
import { api, tokenStore } from './utils/api';
import { ChatBot } from './components/ChatBot';
import tucoLogo from './assets/tuco-logo.webp';
function enrichConversations(threads: Conversation[]): Conversation[] {
  return threads.map((c, i) => ({
    ...c,
    createdAt: c.createdAt || new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    moderationStatus: c.moderationStatus || 'approved',
    isFeatured: c.isFeatured ?? c.id === 2,
    featuredLabel: c.featuredLabel ?? (c.id === 2 ? 'Circle Mom of the Month' : undefined),
  }));
}
const DEMO_MODERATOR: User = {
  id: 'mod_demo',
  username: 'CircleMod',
  email: 'moderator@tucokids.com',
  city: 'Mumbai',
  role: 'moderator',
  badges: [],
  createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
  isVerified: true,
  postCount: 0,
  replyCount: 0,
  totalUpvotes: 0,
  trustScore: 1,
  emailNotifications: true,
  savedPosts: [],
};
function AppContent() {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSavedActive, setIsSavedActive] = useState(false);
  const activeCategory = isSavedActive ? 'saved' : (category || 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCategoryFilter, setSearchCategoryFilter] = useState<string>('all');
  const [searchDateFilter, setSearchDateFilter] = useState<DateFilter>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isModerationOpen, setIsModerationOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'thread' | 'reply'; id: number } | null>(
    null
  );
  const [pendingReview, setPendingReview] = useState<PendingReviewSession | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [votedThreads, setVotedThreads] = useState<Record<number, 'up' | 'down' | null>>({});
  const [likedReplies, setLikedReplies] = useState<Record<number, boolean>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [savedPosts, setSavedPosts] = useState<number[]>([]);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [sessionCredentials, setSessionCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    type?: 'warning' | 'success' | 'info' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(false);
  const [isMobileLeftSidebarOpen, setIsMobileLeftSidebarOpen] = useState<boolean>(false);
  const [activeReplyTo, setActiveReplyTo] = useState<{ threadId: number; replyId: number } | null>(null);

  // Prevent body scroll when any modal/overlay is open
  useEffect(() => {
    const anyModalOpen = isModalOpen || isNewPostOpen || isAuthOpen || isModerationOpen || isAdminOpen || isReportOpen || isProfileOpen || isMobileLeftSidebarOpen || isRightSidebarOpen;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen, isNewPostOpen, isAuthOpen, isModerationOpen, isAdminOpen, isReportOpen, isProfileOpen, isMobileLeftSidebarOpen, isRightSidebarOpen]);
  useEffect(() => {
    async function initData() {
      try {
        // Check if user has an existing session
        const existingToken = tokenStore.get();
        if (existingToken) {
          try {
            const user = await api.getMe();
            setCurrentUser(user);
            if (user.savedPosts) {
              setSavedPosts(user.savedPosts);
            }

            // Load user's votes from API
            try {
              const apiVotes = await api.getMyVotes();
              const voteMap: Record<number, 'up' | 'down' | null> = {};
              const replyLikesMap: Record<number, boolean> = {};
              apiVotes.forEach((vote: any) => {
                if (vote.conversationId) {
                  voteMap[vote.conversationId] = vote.type === 'UP' ? 'up' : 'down';
                }
                if (vote.replyId && vote.type === 'UP') {
                  replyLikesMap[vote.replyId] = true;
                }
              });
              setVotedThreads(voteMap);
              setLikedReplies(replyLikesMap);
            } catch (error) {
              console.error('Failed to load votes:', error);
            }

            // Load user's notifications from API
            try {
              const apiNotifications = await api.getNotifications();
              setNotifications(apiNotifications);
            } catch (error) {
              console.error('Failed to load notifications:', error);
            }
          } catch (error) {
            console.error('Failed to restore session:', error);
            tokenStore.clear();
          }
        }

        // Fetch conversations from API
        const apiConversations = await api.getConversations();
        const apiUsers = await api.getUsers();

        // Just use existing conversations instead of trying to seed new ones (which requires auth)
        setConversations(apiConversations);

        if (Object.keys(apiUsers).length === 0) {
          // Seed users if empty
          await api.updateMe(DEMO_MODERATOR);
          setUsers({ [DEMO_MODERATOR.id]: DEMO_MODERATOR });
        } else {
          setUsers(apiUsers);
        }
      } catch (error) {
        console.error('Failed to initialize data from API:', error);
        // Fallback to local seed if API fails
        setConversations(enrichConversations(INITIAL_CONVERSATIONS));
        setUsers({ [DEMO_MODERATOR.id]: DEMO_MODERATOR });
      }

      const minDisplayMs = 1200;
      setTimeout(() => setIsAppReady(true), minDisplayMs);
    }

    initData();
  }, []);

  // Handle initial hash
  useEffect(() => {
    if (conversations.length > 0) {
      const hashMatch = window.location.hash.match(/^#thread-(\d+)$/);
      if (hashMatch) {
        const threadId = parseInt(hashMatch[1], 10);
        const threadExists = conversations.some(c => c.id === threadId);
        if (threadExists) {
          setSelectedThreadId(threadId);
          setIsModalOpen(true);
        }
      }
    }
  }, [conversations]);

  const saveConversations = async (updated: Conversation[]) => {
    // Ensure no duplicate IDs in the threads and their replies
    const uniqueThreads = updated
      .filter((thread, index, self) =>
        index === self.findIndex((t) => t.id === thread.id)
      )
      .map(thread => ({
        ...thread,
        replies: thread.replies.filter((reply, index, self) =>
          index === self.findIndex((r) => r.id === reply.id)
        )
      }));
    
    setConversations(uniqueThreads);
    try {
      // For each conversation that has changed, update it via API
      // This is a simplified approach - in a real app you'd track which specific fields changed
      for (const conv of uniqueThreads) {
        const existingConv = conversations.find(c => c.id === conv.id);
        if (!existingConv) {
          // New conversation - create it
          await api.createConversation({
            title: conv.title,
            category: conv.category,
            city: conv.op.city,
            text: conv.op.text,
            image: conv.op.image,
            moderationStatus: conv.moderationStatus,
            greyAreaFlags: conv.greyAreaFlags,
            reviewPriority: conv.reviewPriority,
          });
        } else {
          // Existing conversation - update fields that may have changed
          if (
            existingConv.votes !== conv.votes ||
            existingConv.views !== conv.views ||
            existingConv.isPinned !== conv.isPinned ||
            existingConv.isFeatured !== conv.isFeatured ||
            existingConv.moderationStatus !== conv.moderationStatus
          ) {
            await api.updateConversation(conv.id, {
              votes: conv.votes,
              views: conv.views,
              isPinned: conv.isPinned,
              isFeatured: conv.isFeatured,
              moderationStatus: conv.moderationStatus,
              moderationReason: conv.moderationReason,
              moderatedBy: conv.moderatedBy,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync with the server:', error);
      // Don't show connection error modal to user; log to console only
    }
  };

  const saveVotes = (updated: Record<number, 'up' | 'down' | null>) => {
    setVotedThreads(updated);
    localStorage.setItem('tuco_votes_v1', JSON.stringify(updated));
  };

  const saveReplyLikes = (updated: Record<number, boolean>) => {
    setLikedReplies(updated);
    localStorage.setItem('tuco_reply_likes_v1', JSON.stringify(updated));
  };

  const saveNotifications = (updated: Notification[]) => {
    setNotifications(updated);
    localStorage.setItem('tuco_notifications_v1', JSON.stringify(updated));
  };

  const toggleSavedPost = (threadId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    let newSaved: number[];
    if (savedPosts.includes(threadId)) {
      newSaved = savedPosts.filter(id => id !== threadId);
    } else {
      newSaved = [...savedPosts, threadId];
    }
    setSavedPosts(newSaved);
    
    // Update current user's saved posts via API
    const updatedUser = { ...currentUser, savedPosts: newSaved };
    setCurrentUser(updatedUser);
    api.updateMe({ savedPosts: newSaved }).catch(error => {
      console.error('Failed to update saved posts:', error);
    });
    
    if (savedPosts.includes(threadId)) {
      setWarningModal({
        isOpen: true,
        type: 'info',
        title: 'Removed from Saved',
        message: 'Thread removed from your saved posts.',
      });
    } else {
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Saved!',
        message: 'Thread added to your saved posts.',
      });
    }
  };

  const saveUser = async (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      // Update user via API
      try {
        const updated = await api.updateMe(user);
        setCurrentUser(updated);
        const updatedUsers = { ...users, [user.id]: updated };
        setUsers(updatedUsers);

        // Check for promotion to trusted member
        if (user.trustScore >= 0.85 && user.role === 'member') {
          const promoted = { ...updated, role: 'trusted' as const };
          await api.updateMe(promoted);
          setCurrentUser(promoted);
          setUsers({ ...updatedUsers, [user.id]: promoted });
        }
      } catch (error) {
        console.error('Failed to save user to API:', error);
      }
    } else {
      api.logout();
    }
  };
  const checkAndAwardBadges = (user: User) => {
    const eligibleBadges = checkEligibleBadges(user);
    if (eligibleBadges.length > 0) {
      const newBadges = eligibleBadges.map(badgeType => ({
        type: badgeType,
        earnedAt: new Date().toISOString(),
        discountCode: generateDiscountCode(user.id, badgeType),
        discountExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const updatedUser = { ...user, badges: [...user.badges, ...newBadges] };
      saveUser(updatedUser);
      
      const newNotifications: Notification[] = eligibleBadges.map((badgeType, idx) => ({
        id: Date.now() + idx,
        type: 'badge',
        title: 'Badge Earned!',
        description: `Congratulations! You've earned the ${BADGE_DISPLAY[badgeType].name} badge.`,
        time: 'Just now',
        read: false,
      }));
      saveNotifications([...newNotifications, ...notifications]);

      const badgeNames = eligibleBadges
        .map(b => `${BADGE_DISPLAY[b].icon} ${BADGE_DISPLAY[b].name}`)
        .join(', ');
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Congratulations!',
        message: `You've earned: ${badgeNames}`,
      });
    }
  };
  const handleSignup = async (email: string, username: string, city: string, childAge: string, password: string) => {
    try {
      const { user, token } = await api.signup(email, password, username, city, childAge);
      
      // User is already logged in and token is stored by api.signup()
      const updatedUsers = { ...users, [user.id]: user };
      setUsers(updatedUsers);
      setCurrentUser(user);
      setSessionCredentials({ email: user.email, password });
      
      setIsAuthOpen(false);
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Welcome!',
        message: `Welcome to the circle, ${user.username}! 👋`,
      });
    } catch (error) {
      console.error('Signup failed:', error);
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Signup Failed',
        message: error instanceof Error ? error.message : 'Failed to create account. Please try again.',
      });
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const { user, token } = await api.login(email, password);
      
      // User is already logged in and token is stored by api.login()
      const updatedUsers = { ...users, [user.id]: user };
      setUsers(updatedUsers);
      setCurrentUser(user);
      setSessionCredentials({ email, password });
      
      // Load user's saved posts
      if (user.savedPosts) {
        setSavedPosts(user.savedPosts);
      }
      
      setIsAuthOpen(false);
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Welcome Back!',
        message: `Welcome back, ${user.username}! 👋`,
      });
    } catch (error) {
      console.error('Login failed:', error);
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Login Failed',
        message: error instanceof Error ? error.message : 'Invalid email or password. Please try again.',
      });
    }
  };
  const handleLogout = () => {
    setSessionCredentials(null);
    api.logout();
    setCurrentUser(null);
    setSavedPosts([]);
  };
  const selectedThread = conversations.find(c => c.id === selectedThreadId) || null;
  const isSearchMode = searchTerm.trim().length > 0;
  const searchResults = useMemo(() => {
    const ranked = searchThreadsWithRanking(conversations, searchTerm, 50);
    return filterThreads(ranked, '', searchCategoryFilter, searchDateFilter);
  }, [conversations, searchTerm, searchCategoryFilter, searchDateFilter]);
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (activeCategory === 'saved') {
      filtered = conversations.filter(c => savedPosts.includes(c.id));
    } else if (activeCategory !== 'all' && activeCategory !== 'sidebar-open') {
      filtered = conversations.filter(c => c.category === activeCategory);
    }

    // Always show approved posts, or pending posts if user is a moderator
    return filtered.filter(c => 
      c.moderationStatus === 'approved' || 
      (currentUser?.role === 'moderator' && c.moderationStatus === 'pending')
    );
  }, [conversations, activeCategory, savedPosts, currentUser]);
  const featuredThreads = useMemo(() => getFeaturedThreads(conversations), [conversations]);
  const pendingThreads = useMemo(
    () =>
      [...conversations.filter(c => c.moderationStatus === 'pending')].sort(
        (a, b) => (a.reviewPriority ?? 50) - (b.reviewPriority ?? 50)
      ),
    [conversations]
  );
  const handleThreadOpen = async (threadId: number) => {
    const updatedThread = conversations.find(c => c.id === threadId);
    const newViews = (updatedThread?.views || 0) + 1;
    
    setConversations(prev => {
      return prev.map(c => (c.id === threadId ? { ...c, views: newViews } : c));
    });
    
    setSelectedThreadId(threadId);
    setIsModalOpen(true);
    
    // Save to backend
    try {
      await api.updateConversation(threadId, { views: newViews });
    } catch (error) {
      console.error('Failed to update view count:', error);
    }
    
    // Push to browser history so back button closes modal
    window.history.pushState({ threadId }, '', `#thread-${threadId}`);
  };

  // Listen for back button/history change to close modal
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isModalOpen) {
        setIsModalOpen(false);
        setActiveReplyTo(null);
        setTimeout(() => {
          setSelectedThreadId(null);
        }, 300);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isModalOpen]);
  const handleVote = async (threadId: number, type: 'up' | 'down') => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    
    // Update local state first, then try API (optimistic UI)
    const previousState = votedThreads[threadId] || null;
    let voteDiff = 0;
    let upvoteDiff = 0;
    
    if (previousState === type) {
      voteDiff = type === 'up' ? -1 : 1;
      upvoteDiff = type === 'up' ? -1 : 0;
      const nextVotes = { ...votedThreads };
      delete nextVotes[threadId];
      saveVotes(nextVotes);
    } else {
      if (previousState === null) {
        voteDiff = type === 'up' ? 1 : -1;
        upvoteDiff = type === 'up' ? 1 : 0;
      } else {
        voteDiff = type === 'up' ? 2 : -2;
        upvoteDiff = type === 'up' ? 1 : -1;
      }
      saveVotes({ ...votedThreads, [threadId]: type });
    }
    
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === threadId ? { ...c, votes: c.votes + voteDiff } : c
      );
      // Don't call saveConversations to avoid connection error modal; we already call api.vote
      return updated;
    });

    if (upvoteDiff !== 0 && currentUser) {
      const updatedUser = { ...currentUser, totalUpvotes: currentUser.totalUpvotes + upvoteDiff };
      saveUser(updatedUser);
      checkAndAwardBadges(updatedUser);
    }

    // Try API, then refresh data
    try {
      await api.vote({
        conversationId: threadId,
        type: type.toUpperCase() as 'UP' | 'DOWN',
      });
      // Refresh data from server to ensure consistency
      await refreshData();
    } catch (error) {
      console.error('Failed to sync vote with server:', error);
    }
  };

  const handleLikeReply = async (threadId: number, replyId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    // Optimistic UI update first
    const isLiked = likedReplies[replyId];
    const nextLikedReplies = { ...likedReplies };
    if (isLiked) {
      delete nextLikedReplies[replyId];
    } else {
      nextLikedReplies[replyId] = true;
    }
    setLikedReplies(nextLikedReplies);

    // Update conversation locally
    setConversations(prev => prev.map(c => {
      if (c.id === threadId) {
        return {
          ...c,
          replies: c.replies.map(r => 
            r.id === replyId 
              ? { ...r, likes: isLiked ? r.likes - 1 : r.likes + 1 } 
              : r
          )
        };
      }
      return c;
    }));

    // Update via API and refresh data
    try {
      await api.vote({
        replyId,
        type: 'UP',
      });
      await refreshData();
    } catch (error) {
      console.error('Failed to sync reply like with server:', error);
    }
  };
  const detectProductRecommendation = (text: string): string | undefined => {
    const raw = text.toLowerCase();
    if (/sunscreen|sunblock|spf|cricket|tan|outdoor/.test(raw)) return 'sunscreen';
    if (/moistur|dry|flake|eczema|cheeks|cream|lotion/.test(raw)) return 'moisturiser';
    if (/bath|wash|soap|shower|bodywash|fragrance|gentle/.test(raw)) return 'bodywash';
    if (/shampoo|hair|scalp|lice|conditioning/.test(raw)) return 'shampoo';
    return undefined;
  };
  // Helper to add a nested reply recursively
  const addNestedReply = (replies: Reply[], parentId: number, newReply: Reply): Reply[] => {
    return replies.map(r => {
      if (r.id === parentId) {
        return { ...r, replies: [...(r.replies || []), newReply] };
      }
      if (r.replies && r.replies.length > 0) {
        return { ...r, replies: addNestedReply(r.replies, parentId, newReply) };
      }
      return r;
    });
  };

  // Helper to update a nested reply recursively
  const updateNestedReply = (replies: Reply[], replyId: number, newText: string): Reply[] => {
    return replies.map(r => {
      if (r.id === replyId) {
        return { ...r, text: newText };
      }
      if (r.replies && r.replies.length > 0) {
        return { ...r, replies: updateNestedReply(r.replies, replyId, newText) };
      }
      return r;
    });
  };

  // Helper to delete a nested reply recursively
  const deleteNestedReply = (replies: Reply[], replyId: number): Reply[] => {
    return replies.filter(r => {
      if (r.id === replyId) return false;
      if (r.replies && r.replies.length > 0) {
        r.replies = deleteNestedReply(r.replies, replyId);
      }
      return true;
    });
  };

  const handleAddReply = async (
    threadId: number,
    name: string,
    city: string,
    text: string,
    image?: string,
    parentId?: number
  ) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const threadForAnalysis = conversations.find(c => c.id === threadId);
    const analysis = analyzeContent(text, threadForAnalysis?.category || 'general');
    if (analysis.outcome === 'CLEAR_VIOLATION') {
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Reply Rejected',
        message:
          'Your reply was rejected due to community guidelines violation. Please review the Moderation Rules.',
      });
      return;
    }

    try {
      // Create reply via API
      const createdReply = await api.addReply(threadId, {
        text: analysis.civilityReminder ? `${text}\n\n---\n💛 ${analysis.civilityReminder}` : text,
        city,
        image,
        parentId,
      });

      const newReply: Reply = {
        id: createdReply.id || Date.now() + Math.random(),
        author: name,
        city,
        time: 'Just now',
        text: analysis.civilityReminder ? `${text}\n\n---\n💛 ${analysis.civilityReminder}` : text,
        image,
        likes: 0,
        authorRole: currentUser.role,
        authorBadges: currentUser.badges.map(b => b.type),
        parentId,
      };

      setConversations(prev => {
        const thread = prev.find(c => c.id === threadId);
        let updated;

        if (parentId) {
          // Add nested reply
          updated = prev.map(c =>
            c.id === threadId
              ? { ...c, replies: addNestedReply(c.replies, parentId, newReply) }
              : c
          );
        } else {
          // Add root reply
          updated = prev.map(c =>
            c.id === threadId ? { ...c, replies: [...c.replies, newReply] } : c
          );
        }

        // Add notification for the thread author
        if (thread && thread.authorId && thread.authorId !== currentUser.id) {
          const newNotif: Notification = {
            id: Date.now() + Math.random(),
            type: 'reply',
            title: parentId ? 'New reply to your comment' : 'New reply to your thread',
            description: `${currentUser.username} replied ${parentId ? 'to your comment' : `to "${thread.title}"`}`,
            time: 'Just now',
            read: false,
            threadId: thread.id,
          };
          saveNotifications([newNotif, ...notifications]);
        }

        return updated;
      });

      const updatedUser = { ...currentUser, replyCount: currentUser.replyCount + 1 };
      saveUser(updatedUser);
      checkAndAwardBadges(updatedUser);
      setActiveReplyTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Reply Failed',
        message: error instanceof Error ? error.message : 'Failed to add reply. Please try again.',
      });
    }
  };
  const handleReportReply = (threadId: number, replyId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setReportTarget({ type: 'reply', id: replyId });
    setIsReportOpen(true);
  };
  const handleSubmitReport = async (reason: string, details: string) => {
    if (!reportTarget) return;
    
    try {
      await api.submitReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason,
        details,
      });
      
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Report Submitted',
        message: 'Thank you for your report. Our moderation team will review this promptly.',
      });
      setReportTarget(null);
    } catch (error) {
      console.error('Failed to submit report:', error);
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Report Failed',
        message: error instanceof Error ? error.message : 'Failed to submit report. Please try again.',
      });
    }
  };
  const handleEditReply = async (threadId: number, replyId: number, newText: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    
    try {
      // Update reply via API
      await api.updateReply(replyId, { text: newText });
      
      const updated = conversations.map(c => {
        if (c.id === threadId) {
          const updatedReplies = updateNestedReply(c.replies, replyId, newText);
          return { ...c, replies: updatedReplies };
        }
        return c;
      });
      setConversations(updated);
      
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Reply Updated',
        message: 'Your reply has been successfully updated!',
      });
    } catch (error) {
      console.error('Failed to update reply:', error);
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update reply. Please try again.',
      });
    }
  };
  const handleDeleteReply = async (threadId: number, replyId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    
    try {
      // Delete reply via API
      await api.deleteReply(replyId);
      
      const updated = conversations.map(c => {
        if (c.id === threadId) {
          return { ...c, replies: deleteNestedReply(c.replies, replyId) };
        }
        return c;
      });
      setConversations(updated);
      
      setWarningModal({
        isOpen: true,
        type: 'info',
        title: 'Reply Deleted',
        message: 'Your reply has been deleted.',
      });
    } catch (error) {
      console.error('Failed to delete reply:', error);
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete reply. Please try again.',
      });
    }
  };

  const handleCreateNewThread = async (
    title: string,
    category: string,
    text: string,
    image?: string
  ) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (currentUser.role === 'tuco_team') {
      const teamCheck = cantucoTeamPost(category, title, text);
      if (!teamCheck.allowed) {
        setWarningModal({
          isOpen: true,
          type: 'warning',
          title: 'Not Allowed',
          message: teamCheck.reason!,
        });
        return;
      }
    }
    const accountAgeDays =
      (Date.now() - new Date(currentUser.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const isInCoolingPeriod = currentUser.role === 'member' && accountAgeDays < 1;
    
    const analysis = analyzeContent(text + ' ' + title, category);
    let moderationStatus: ModerationStatus = 'pending';
    if (analysis.outcome === 'CLEAR_VIOLATION') {
      moderationStatus = 'rejected';
    }
    
    try {
      // Create conversation via API
      const createdConv = await api.createConversation({
        title,
        category,
        city: currentUser.city,
        text: analysis.civilityReminder ? `${text}\n\n---\n💛 ${analysis.civilityReminder}` : text,
        image,
        moderationStatus,
        greyAreaFlags: analysis.greyAreaFlags,
        reviewPriority: getReviewPriority(
          currentUser.role,
          currentUser.trustScore,
          analysis.greyAreaFlags
        ),
      });

      if (moderationStatus === 'rejected') {
        setWarningModal({
          isOpen: true,
          type: 'error',
          title: 'Post Rejected',
          message:
            'Your post was rejected due to community guidelines violation. Please review the Moderation Rules.',
        });
        return;
      }

      const newThread: Conversation = {
        id: createdConv.id || Date.now() + Math.random(),
        title,
        category,
        votes: 1,
        views: 0,
        op: {
          author: currentUser.role === 'tuco_team' ? 'tuco Team' : currentUser.username,
          city: currentUser.city,
          time: 'Just now',
          text: analysis.civilityReminder ? `${text}\n\n---\n💛 ${analysis.civilityReminder}` : text,
          image,
          authorRole: currentUser.role,
          authorBadges: currentUser.badges.map(b => b.type),
        },
        replies: [],
        moderationStatus,
        authorId: currentUser.id,
        createdAt: new Date().toISOString(),
        greyAreaFlags: analysis.greyAreaFlags,
        reviewPriority: isInCoolingPeriod ? 100 : getReviewPriority(
          currentUser.role,
          currentUser.trustScore,
          analysis.greyAreaFlags
        ),
      };

      setConversations(prev => [newThread, ...prev]);

      const updatedUser = { ...currentUser, postCount: currentUser.postCount + 1 };
      saveUser(updatedUser);
      checkAndAwardBadges(updatedUser);
      setIsNewPostOpen(false);
      
      if (isInCoolingPeriod) {
        const hoursRemaining = Math.ceil((1 - accountAgeDays) * 24);
        setWarningModal({
          isOpen: true,
          type: 'info',
          title: 'Post Submitted for Review',
          message: `Your post has been submitted and is awaiting moderator review. As a new member, your posts will be reviewed before going live. You'll be able to post freely in ${hoursRemaining} hours!`,
        });
      } else if (moderationStatus === 'pending') {
        setPendingReview({
          threadId: newThread.id,
          title,
          category,
          submittedAt: new Date().toISOString(),
        });
      } else {
        handleThreadOpen(newThread.id);
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Post Failed',
        message: error instanceof Error ? error.message : 'Failed to create post. Please try again.',
      });
    }
  };
  // Helper function to refresh data from API
  const refreshData = async () => {
    try {
      const [apiConversations, apiUsers, apiNotifications] = await Promise.all([
        api.getConversations(),
        api.getUsers(),
        currentUser ? api.getNotifications() : Promise.resolve([]),
      ]);
      setConversations(apiConversations);
      setUsers(apiUsers);
      if (currentUser) {
        setNotifications(apiNotifications);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleApproveThread = async (threadId: number) => {
    const thread = conversations.find(c => c.id === threadId);
    const updated = conversations.map(c =>
      c.id === threadId
        ? { ...c, moderationStatus: 'approved' as ModerationStatus, moderatedBy: currentUser?.id }
        : c
    );
    // Update local state first for optimistic UI
    setConversations(updated);
    // Call API to update
    await api.updateConversation(threadId, {
      moderationStatus: 'approved',
      moderatedBy: currentUser?.id,
    });
    // Refresh notifications and data
    await refreshData();
    if (thread?.authorId) {
      const author = users[thread.authorId];
      if (author?.email) {
        sendThreadApprovalEmail(author, thread.title);
      }
    }
    setWarningModal({
      isOpen: true,
      type: 'success',
      title: 'Thread Approved',
      message: 'Thread approved and is now live! Approval email sent.',
    });
  };
  const handleRejectThread = async (threadId: number, reason: string) => {
    const thread = conversations.find(c => c.id === threadId);
    const updated = conversations.map(c =>
      c.id === threadId
        ? {
            ...c,
            moderationStatus: 'rejected' as ModerationStatus,
            moderationReason: reason,
            moderatedBy: currentUser?.id,
          }
        : c
    );
    // Update local state first for optimistic UI
    setConversations(updated);
    // Call API to update
    await api.updateConversation(threadId, {
      moderationStatus: 'rejected',
      moderationReason: reason,
      moderatedBy: currentUser?.id,
    });
    // Refresh notifications and data
    await refreshData();
    setWarningModal({
      isOpen: true,
      type: 'error',
      title: 'Thread Rejected',
      message: `Thread rejected. Reason: ${reason}`,
    });
  };
  const handlePinThread = (threadId: number, pinned: boolean) => {
    saveConversations(conversations.map(c => (c.id === threadId ? { ...c, isPinned: pinned } : c)));
  };
  const handleFeatureThread = (threadId: number, featured: boolean) => {
    saveConversations(
      conversations.map(c =>
        c.id === threadId
          ? {
              ...c,
              isFeatured: featured,
              featuredLabel: featured ? 'Circle Mom of the Month' : undefined,
            }
          : c
      )
    );
  };
  const handleResetToDefault = () => {
    localStorage.removeItem('tuco_conversations_v1');
    localStorage.removeItem('tuco_votes_v1');
    localStorage.removeItem('tuco_reply_likes_v1');
    localStorage.removeItem('tuco_saved_posts_v1');
    localStorage.removeItem('tuco_current_user');
    localStorage.removeItem('tuco_users_db');
    const seeded = enrichConversations(mergeSeedWithExisting(INITIAL_CONVERSATIONS, 100));
    setConversations(seeded);
    setVotedThreads({});
    setLikedReplies({});
    setSavedPosts([]);
    navigate('/');
    setSearchTerm('');
    setSelectedThreadId(null);
    setIsModalOpen(false);
    setCurrentUser(null);
    setUsers({ [DEMO_MODERATOR.id]: DEMO_MODERATOR });
  };
  
  const handleCategoryChange = (catId: string) => {
    setIsMobileLeftSidebarOpen(false);
    if (catId === 'saved') {
      setIsSavedActive(true);
      navigate('/');
    } else if (catId === 'all') {
      setIsSavedActive(false);
      navigate('/');
    } else if (catId === 'sidebar-open') {
      // Handle sidebar open state locally without changing URL
    } else {
      setIsSavedActive(false);
      navigate(`/${catId}`);
    }
  };

  const openNewPost = () => {
    if (!currentUser) setIsAuthOpen(true);
    else setIsNewPostOpen(true);
  };

  const relatedForReview = pendingReview
    ? getRelatedThreads(conversations, pendingReview.category, pendingReview.threadId)
    : [];

  if (!isAppReady) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-neutral-800">
      <Header
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        conversations={conversations}
        onNewPostClick={openNewPost}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginClick={() => setIsAuthOpen(true)}
        onModerationClick={() => setIsModerationOpen(true)}
        onAdminClick={() => setIsAdminOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
        onNotificationsClick={() => {}}
        onOpenCategories={() => {
          setIsMobileLeftSidebarOpen(!isMobileLeftSidebarOpen);
        }}
        onSuggestionSelect={id => {
          setSearchTerm(''); // Clear search term after selection
          handleThreadOpen(id);
        }}
        notifications={notifications}
        onMarkAsRead={async id => {
          const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
          setNotifications(updated);
          // Mark notification as read via API
          try {
            await api.markNotificationRead(id);
          } catch (error) {
            console.error('Failed to mark notification as read:', error);
          }
        }}
        onThreadOpen={handleThreadOpen}
      />

      {/* Mobile Left Sidebar Overlay */}
      {isMobileLeftSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsMobileLeftSidebarOpen(false)}
          ></div>
          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 md:hidden overflow-y-auto border-r border-neutral-200 shadow-xl animate-in slide-in-from-left-2 duration-200">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <img src={tucoLogo} alt="tuco" className="h-8 w-auto" />
                <button
                  onClick={() => setIsMobileLeftSidebarOpen(false)}
                  className="p-1 hover:bg-neutral-100 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-neutral-500">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <LeftSidebar
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                conversations={conversations}
                savedPosts={savedPosts}
              />
            </div>
          </div>
        </>
      )}
      <div className="layout flex-1 w-full mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[252px_1fr_280px] gap-4 md:gap-8">
          <div className="hidden md:block">
            <LeftSidebar
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              conversations={conversations}
              savedPosts={savedPosts}
            />
          </div>
          <div className="min-w-0">
            {isSearchMode ? (
              <SearchResults
                results={searchResults}
                query={searchTerm}
                onThreadOpen={handleThreadOpen}
                onVote={handleVote}
                votedThreads={votedThreads}
                categoryFilter={searchCategoryFilter}
                dateFilter={searchDateFilter}
                onCategoryFilterChange={setSearchCategoryFilter}
                onDateFilterChange={setSearchDateFilter}
                onStartDiscussion={openNewPost}
                users={users}
              />
            ) : (
              <MainContent
                activeCategory={activeCategory}
                searchTerm={searchTerm}
                conversations={conversations}
                onThreadOpen={handleThreadOpen}
                onVote={handleVote}
                onSavePost={toggleSavedPost}
                savedPosts={savedPosts}
                votedThreads={votedThreads}
                onResetToDefault={handleResetToDefault}
                onStartDiscussion={openNewPost}
                users={users}
                featuredThreads={featuredThreads}
                onCategoryChange={handleCategoryChange}
                onOpenRightSidebar={() => setIsRightSidebarOpen(true)}
              />
            )}
          </div>
          {/* Right Sidebar - Desktop Only */}
          <div className="hidden lg:block">
            <RightSidebar
              onTrendingClick={handleThreadOpen}
              featuredThreads={featuredThreads}
              onFeaturedClick={handleThreadOpen}
              variant="sidebar"
            />
          </div>
        </div>
      </div>
      <footer className="bg-white border-t border-neutral-200/90 py-10 px-4 mt-12 text-center text-xs text-neutral-400 font-bold font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={tucoLogo} alt="tuco Kids Logo" className="h-8 w-auto" />
            <strong className="text-neutral-700 font-display text-sm tracking-tight text-left leading-tight">
              Parents Circle
            </strong>
          </div>
          <p className="text-[10px] font-medium text-neutral-400">
            © 2026 tuco Parents Circle. A safe space for Indian parents.
          </p>
        </div>
      </footer>
      {!currentUser && (
        <GuestPromptBanner onSignIn={() => setIsAuthOpen(true)} onNewPost={openNewPost} />
      )}
      <Modal
        thread={selectedThread}
        isOpen={isModalOpen}
        onClose={() => {
          // If we added a history entry, go back to remove it
          if (window.location.hash.startsWith('#thread-')) {
            window.history.back();
          } else {
            setIsModalOpen(false);
            setSelectedThreadId(null);
            setActiveReplyTo(null);
          }
        }}
        onAddReply={handleAddReply}
        onLikeReply={handleLikeReply}
        activeReplyTo={activeReplyTo}
        setActiveReplyTo={setActiveReplyTo}
        onReportReply={handleReportReply}
        onEditReply={handleEditReply}
        onDeleteReply={handleDeleteReply}
        currentUser={currentUser}
        likedReplies={likedReplies}
        users={users}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        conversations={conversations}
        onNewPostClick={openNewPost}
        onLogout={handleLogout}
        onLoginClick={() => setIsAuthOpen(true)}
        onModerationClick={() => setIsModerationOpen(true)}
        onAdminClick={() => setIsAdminOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
        onNotificationsClick={() => {}}
        onOpenCategories={() => {
          setIsMobileLeftSidebarOpen(!isMobileLeftSidebarOpen);
        }}
        notifications={notifications}
        onMarkAsRead={(id) => {
          const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
          setNotifications(updated);
        }}
        onSuggestionSelect={(id) => {
          setSearchTerm('');
          handleThreadOpen(id);
        }}
        onThreadOpen={handleThreadOpen}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onSavePostClick={toggleSavedPost}
        savedPosts={savedPosts}
      />
      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        onSubmit={handleCreateNewThread}
        istucoTeam={currentUser?.role === 'tuco_team'}
      />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignup={handleSignup}
        onLogin={handleLogin}
      />
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          user={currentUser}
          conversations={conversations}
          onThreadOpen={handleThreadOpen}
          loginEmail={sessionCredentials?.email ?? currentUser.email}
          loginPassword={sessionCredentials?.password}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
      
      {/* Right Sidebar Modal (Mobile Only) */}
      {isRightSidebarOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-end md:items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-t-3xl md:rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-xl relative animate-in slide-in-from-bottom">
            <button
              onClick={() => setIsRightSidebarOpen(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 z-10"
            >
              ✕
            </button>
            <div className="p-5 pt-12">
              <RightSidebar
                onTrendingClick={(id) => {
                  handleThreadOpen(id);
                  setIsRightSidebarOpen(false);
                }}
                featuredThreads={featuredThreads}
                onFeaturedClick={(id) => {
                  handleThreadOpen(id);
                  setIsRightSidebarOpen(false);
                }}
                variant="sidebar"
              />
            </div>
          </div>
        </div>
      )}
      {pendingReview && (
        <ThreadReviewConfirmation
          threadTitle={pendingReview.title}
          relatedThreads={relatedForReview}
          onBrowseRelated={id => {
            setPendingReview(null);
            handleThreadOpen(id);
          }}
          onClose={() => setPendingReview(null)}
        />
      )}
      {isModerationOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-xl relative">
            <button
              onClick={() => setIsModerationOpen(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 z-10"
            >
              ✕
            </button>
            <ModerationDashboard
              pendingThreads={pendingThreads}
              users={users}
              onApprove={handleApproveThread}
              onReject={handleRejectThread}
            />
          </div>
        </div>
      )}
      {isAdminOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] overflow-y-auto">
          <div className="w-full max-w-lg relative">
            <AdminToolsPanel
              conversations={conversations}
              users={users}
              onSeedContent={threads => saveConversations(enrichConversations(threads))}
              onPinThread={handlePinThread}
              onFeatureThread={handleFeatureThread}
              onClose={() => setIsAdminOpen(false)}
            />
          </div>
        </div>
      )}
      <WarningModal
        isOpen={warningModal.isOpen}
        type={warningModal.type}
        title={warningModal.title}
        message={warningModal.message}
        onClose={() => setWarningModal({ ...warningModal, isOpen: false })}
      />

      <ChatBot />
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setReportTarget(null);
        }}
        onSubmit={handleSubmitReport}
        type={reportTarget?.type || 'reply'}
      />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/:category" element={<AppContent />} />
    </Routes>
  );
}
