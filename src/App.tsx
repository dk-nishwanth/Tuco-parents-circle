import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { track, setAnalyticsUser, trackPageView } from './utils/analytics';
import { AdminPanel } from './components/AdminPanel';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { CategoryNav } from './components/CategoryNav';
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
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { PublicProfilePage } from './components/PublicProfilePage';
import { ProfileModal } from './components/ProfileModal';
import { WarningModal } from './components/WarningModal';
import { ReportModal } from './components/ReportModal';
import { NotificationsPage } from './components/NotificationsPage';
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
  const activeCategory = isSavedActive ? 'saved' : (category === 'community' || !category ? 'all' : category);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCategoryFilter, setSearchCategoryFilter] = useState<string>('all');
  const [searchDateFilter, setSearchDateFilter] = useState<DateFilter>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [authResetToken, setAuthResetToken] = useState<string>('');

  // Open the auth popup in a specific mode. A guest prompted mid-action
  // (comment/vote/reply/save/new post) is almost always a NEW user — returning
  // users are already auto-logged-in via their saved token — so those prompts
  // open in 'signup'. Explicit "Sign in" buttons pass 'login'. This is the
  // single biggest conversion fix: it stops new users from landing on a login
  // form and failing with an account that doesn't exist yet.
  const openAuth = (mode: 'login' | 'signup' = 'signup') => {
    setAuthInitialMode(mode);
    setIsAuthOpen(true);
  };
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
  // True when we fell back to bundled seed content because the API was
  // unreachable/slow. Surfaces a dismissible banner so users know actions
  // (voting, replying, posting) won't stick until the server is back.
  const [isShowingCachedContent, setIsShowingCachedContent] = useState(false);
  const [cachedBannerDismissed, setCachedBannerDismissed] = useState(false);
  // Friendly notice shown when a sign-in attempt fails (e.g. a Google OAuth
  // round-trip errors out), so the user isn't dumped on the homepage silently.
  const [authNotice, setAuthNotice] = useState<string | null>(null);
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [activeReplyTo, setActiveReplyTo] = useState<{ threadId: number; replyId: number } | null>(null);
  const [showCompleteProfile, setShowCompleteProfile] = useState<boolean>(false);

  // Prevent body scroll when any modal/overlay is open
  useEffect(() => {
    const anyModalOpen = isModalOpen || isNewPostOpen || isAuthOpen || isModerationOpen || isAdminOpen || isReportOpen || isProfileOpen || isMobileLeftSidebarOpen || isRightSidebarOpen || showCompleteProfile;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen, isNewPostOpen, isAuthOpen, isModerationOpen, isAdminOpen, isReportOpen, isProfileOpen, isMobileLeftSidebarOpen, isRightSidebarOpen, showCompleteProfile]);

  // Force profile completion for any logged-in user missing a child age
  // (covers Google signups, partial signups, and users created before childAge existed)
  useEffect(() => {
    if (currentUser && !currentUser.childAge) {
      setShowCompleteProfile(true);
    }
  }, [currentUser]);

  // Identify the logged-in user in GA4 (uses the opaque user id, not PII).
  useEffect(() => {
    setAnalyticsUser(currentUser?.id ?? null);
  }, [currentUser?.id]);

  // Fire a manual GA4 page_view on every SPA route change.
  // Without this, only the initial document load is counted; category nav is invisible.
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  useEffect(() => {
    // Handle Google OAuth redirect token and password reset token
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get('oauth_code');
    const resetToken = params.get('reset_token');
    const authError = params.get('auth_error');
    if (authError) {
      // The Google callback redirects here with ?auth_error=... on failure.
      const messages: Record<string, string> = {
        google_failed: 'Google sign-in could not be completed. Please try again.',
        no_code: 'Google sign-in was cancelled or timed out. Please try again.',
        invalid_token: 'We could not verify your Google account. Please try again.',
      };
      setAuthNotice(messages[authError] || 'Sign-in failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (oauthCode) {
      window.history.replaceState({}, '', window.location.pathname);
      fetch('/api/auth/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oauthCode }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.token) {
            tokenStore.set(data.token);
            if (data.isNew) {
              track('sign_up', { method: 'google' });
            }
            track('login', { method: 'google', is_new_user: !!data.isNew });
            // If the user started the OAuth flow from inside a thread, AuthModal
            // stashed the original URL (with #thread-N hash) so we can return
            // them to exactly where they were — otherwise their draft reply
            // vanishes and they land on the homepage.
            const savedReturn = sessionStorage.getItem('tuco_return_url');
            sessionStorage.removeItem('tuco_return_url');
            const returnTo = savedReturn && savedReturn.startsWith('/') ? savedReturn : window.location.pathname;
            // Put the return URL (including any #thread-N hash) in place, then
            // hard-reload. We must reload — not just location.replace — because
            // when the thread was opened from the homepage the return URL
            // differs from the current one ONLY by hash, and a hash-only
            // navigation does not reboot the app. Without a real reload getMe()
            // never runs, currentUser stays null, and the restored draft can't
            // be posted (clicking Comment just re-opens the login).
            window.history.replaceState({}, '', returnTo);
            window.location.reload();
          } else {
            // Exchange returned no token (expired/replayed one-time code) — tell
            // the user instead of silently leaving them logged out.
            setAuthNotice('Google sign-in could not be completed. Please try again.');
          }
        })
        .catch(() => setAuthNotice('Google sign-in could not be completed. Please try again.'));
    }
    if (resetToken) {
      setAuthResetToken(resetToken);
      setAuthInitialMode('reset');
      setIsAuthOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
            // Do NOT clear the token here. api.getMe() already drops it on a
            // real 401/403 (expired/invalid). Any other failure is transient
            // (server restart, 5xx, offline) — keep the token so the session
            // is restored on the next load instead of forcing a re-login.
            console.error('Failed to restore session (keeping token for retry):', error);
          }
        }

        // Fetch conversations from API
        // Guard the initial load with a timeout. Without this, a hung (but not
        // erroring) API leaves the LoadingScreen up forever; racing against a
        // timeout lets us fall through to the cached-content path instead.
        const withTimeout = <T,>(p: Promise<T>, ms = 12000): Promise<T> =>
          Promise.race([
            p,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
          ]);

        const apiConversations = await withTimeout(api.getConversations());
        const apiUsers = await withTimeout(api.getUsers());

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
        setIsShowingCachedContent(true);
      }

      const minDisplayMs = 1200;
      setTimeout(() => setIsAppReady(true), minDisplayMs);
    }

    initData();
  }, []);

  // Poll for notifications every 30 seconds when user is logged in
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      try {
        const apiNotifications = await api.getNotifications();
        setNotifications(apiNotifications);
      } catch {
        // silent — don't break the app if polling fails
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle initial hash. Two deep-link formats:
  //   #thread-<id>  → open that thread modal
  //   #reply-<id>   → find the reply's parent thread, open it, then scroll
  //                   the reply into view once the modal renders.
  useEffect(() => {
    if (conversations.length === 0) return;
    const threadMatch = window.location.hash.match(/^#thread-(\d+)$/);
    if (threadMatch) {
      const threadId = parseInt(threadMatch[1], 10);
      if (conversations.some(c => c.id === threadId)) {
        setSelectedThreadId(threadId);
        setIsModalOpen(true);
      }
      return;
    }
    const replyMatch = window.location.hash.match(/^#reply-(\d+)$/);
    if (replyMatch) {
      const replyId = parseInt(replyMatch[1], 10);
      // Recursively search through nested replies for the matching id.
      const findParentThreadId = (): number | null => {
        const walk = (list: any[]): boolean =>
          list.some(r => r.id === replyId || (r.replies && walk(r.replies)));
        for (const c of conversations) {
          if (walk(c.replies || [])) return c.id;
        }
        return null;
      };
      const parentThreadId = findParentThreadId();
      if (parentThreadId != null) {
        setSelectedThreadId(parentThreadId);
        setIsModalOpen(true);
        // Scroll after modal mounts. Retry a few times because deeply-nested
        // replies render after the parent tree, so the element may not exist
        // on the first tick.
        let attempts = 0;
        const tryScroll = () => {
          const el = document.getElementById(`reply-${replyId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-tuco-cyan', 'ring-offset-2');
            setTimeout(() => el.classList.remove('ring-2', 'ring-tuco-cyan', 'ring-offset-2'), 2500);
          } else if (attempts++ < 20) {
            setTimeout(tryScroll, 150);
          }
        };
        setTimeout(tryScroll, 250);
      }
    }
  }, [conversations]);

  // Open a thread when arriving via /?thread=<id>. A member's profile page
  // (/u/:username) is a separate route that can only navigate by URL, so its
  // post links land here. We reuse the canonical modal-open path and then
  // normalize the URL to the #thread-<id> hash everything else uses, so the
  // back button, sharing, and close-handler all behave identically.
  useEffect(() => {
    if (conversations.length === 0) return;
    const threadParam = new URLSearchParams(location.search).get('thread');
    if (!threadParam) return;
    const threadId = parseInt(threadParam, 10);
    if (!Number.isNaN(threadId) && conversations.some(c => c.id === threadId)) {
      setSelectedThreadId(threadId);
      setIsModalOpen(true);
      // Normalize to the canonical /#thread-<id> URL, dropping the ?thread=
      // query so closing the modal lands on a clean path.
      window.history.replaceState({ threadId }, '', `${window.location.pathname}#thread-${threadId}`);
    } else {
      // Unknown/invalid id — just drop the query so we don't loop or 404.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.search, conversations]);

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

  const clearNotifications = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const toggleSavedPost = (threadId: number) => {
    if (!currentUser) {
      openAuth('signup');
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
  const checkAndAwardBadges = async (user: User) => {
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

      // Persist badges to DB and create real notifications
      try {
        await api.updateMe({ badges: updatedUser.badges } as any);
        for (const badgeType of eligibleBadges) {
          await api.createNotification(
            'badge',
            'Badge Earned!',
            `Congratulations! You've earned the ${BADGE_DISPLAY[badgeType].name} badge.`
          );
        }
      } catch {
        // badge persist failed silently — local state already updated
      }

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
      track('sign_up', { method: 'email' });

      setIsAuthOpen(false);
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Welcome!',
        message: `Welcome to the circle, ${user.username}! 👋`,
      });
    } catch (error) {
      console.error('Signup failed:', error);
      track('sign_up_failed', {
        method: 'email',
        error: error instanceof Error ? error.message.slice(0, 100) : 'unknown',
      });
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
      track('login', { method: 'email' });
      
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
      track('login_failed', {
        method: 'email',
        error: error instanceof Error ? error.message.slice(0, 100) : 'unknown',
      });
      throw error; // let AuthModal show inline error
    }
  };
  const handleLogout = () => {
    track('logout');
    setSessionCredentials(null);
    api.logout();
    setCurrentUser(null);
    setSavedPosts([]);
  };
  const selectedThread = conversations.find(c => c.id === selectedThreadId) || null;
  const isSearchMode = searchTerm.trim().length > 0;
  // All conversations the current user is allowed to see (used for sidebar counts and trending)
  const visibleConversations = useMemo(() => {
    const canSeePending = currentUser?.role === 'moderator' || currentUser?.role === 'tuco_team';
    return conversations.filter(c =>
      c.moderationStatus === 'approved' ||
      (canSeePending && c.moderationStatus === 'pending') ||
      c.authorId === currentUser?.id
    );
  }, [conversations, currentUser]);

  // Conversations filtered further by active category/saved (passed to MainContent)
  const filteredConversations = useMemo(() => {
    let filtered = visibleConversations;

    if (activeCategory === 'saved') {
      filtered = visibleConversations.filter(c => savedPosts.includes(c.id));
    } else if (activeCategory !== 'all' && activeCategory !== 'sidebar-open') {
      filtered = visibleConversations.filter(c => c.category === activeCategory);
    }

    return filtered;
  }, [visibleConversations, activeCategory, savedPosts]);
  const searchResults = useMemo(() => {
    const ranked = searchThreadsWithRanking(visibleConversations, searchTerm, 50);
    return filterThreads(ranked, '', searchCategoryFilter, searchDateFilter);
  }, [visibleConversations, searchTerm, searchCategoryFilter, searchDateFilter]);
  const featuredThreads = useMemo(() => getFeaturedThreads(visibleConversations), [visibleConversations]);
  const pendingThreads = useMemo(
    () =>
      [...conversations.filter(c => c.moderationStatus === 'pending')].sort(
        (a, b) => (a.reviewPriority ?? 50) - (b.reviewPriority ?? 50)
      ),
    [conversations]
  );
  // Guest read limit: after this many distinct thread opens as a guest,
  // clicking on another thread pops the signup modal instead of the thread.
  // Counting distinct thread ids (not raw opens) so a guest can revisit the
  // same thread without eating into their quota. Reset on login.
  const GUEST_READ_LIMIT = 3;

  const handleThreadOpen = async (threadId: number) => {
    const updatedThread = conversations.find(c => c.id === threadId);
    const newViews = (updatedThread?.views || 0) + 1;

    if (!currentUser) {
      const seenRaw = localStorage.getItem('tuco_guest_read_ids') || '[]';
      let seen: number[] = [];
      try { seen = JSON.parse(seenRaw); } catch { seen = []; }
      if (!seen.includes(threadId) && seen.length >= GUEST_READ_LIMIT) {
        track('guest_read_limit_hit', { thread_id: threadId, limit: GUEST_READ_LIMIT });
        openAuth('signup');
        return;
      }
      if (!seen.includes(threadId)) {
        seen = [...seen, threadId].slice(-GUEST_READ_LIMIT * 2);
        try { localStorage.setItem('tuco_guest_read_ids', JSON.stringify(seen)); } catch { /* ignore quota */ }
      }
    }

    setConversations(prev => {
      return prev.map(c => (c.id === threadId ? { ...c, views: newViews } : c));
    });

    setSelectedThreadId(threadId);
    setIsModalOpen(true);
    track('thread_opened', {
      thread_id: threadId,
      category: updatedThread?.category,
    });

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
      openAuth('signup');
      return;
    }
    
    // Update local state first, then try API (optimistic UI)
    const previousState = votedThreads[threadId] || null;
    let voteDiff = 0;

    if (previousState === type) {
      voteDiff = type === 'up' ? -1 : 1;
      const nextVotes = { ...votedThreads };
      delete nextVotes[threadId];
      saveVotes(nextVotes);
    } else {
      if (previousState === null) {
        voteDiff = type === 'up' ? 1 : -1;
      } else {
        voteDiff = type === 'up' ? 2 : -2;
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

    // NOTE: do NOT bump the current user's totalUpvotes here. totalUpvotes means
    // "upvotes received on MY content" — the person casting a vote is not
    // receiving one. The old code inflated the voter's own score (and let them
    // self-award badges) every time they upvoted anyone. The author's received
    // upvotes and trust score are recomputed server-side.

    // Try API, then refresh data
    try {
      await api.vote({
        conversationId: threadId,
        type: type.toUpperCase() as 'UP' | 'DOWN',
      });
      // 'undone' fires when the user clicks the same vote again to remove it.
      const action = previousState === type ? 'undone' : 'set';
      track('vote', { target: 'thread', type, action, thread_id: threadId });
      // Refresh data from server to ensure consistency
      await refreshData();
    } catch (error) {
      console.error('Failed to sync vote with server:', error);
    }
  };

  const handleLikeReply = async (threadId: number, replyId: number) => {
    if (!currentUser) {
      openAuth('signup');
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
      track('reply_liked', {
        action: isLiked ? 'undone' : 'set',
        thread_id: threadId,
        reply_id: replyId,
      });
      await refreshData();
    } catch (error) {
      console.error('Failed to sync reply like with server:', error);
    }
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
      openAuth('signup');
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
      track('reply_created', { is_nested: !!parentId });

      const newReply: Reply = {
        id: createdReply.id || Date.now() + Math.random(),
        author: name,
        authorId: currentUser.id, // so edit/delete controls match by id, not username
        city,
        time: 'Just now',
        // Stamp createdAt so the optimistic reply renders "Just now" instead of
        // the "1 day ago" fallback formatTimeAgo() returns for a missing date.
        createdAt: createdReply.createdAt || new Date().toISOString(),
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

        // NOTE: the notification for the thread/parent author is created by the
        // SERVER (POST /replies). We must NOT add it here — `notifications` is
        // the *replier's* own list, so doing so gave the person who replied a
        // bogus "new reply to your thread" alert about their own reply.

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
      openAuth('signup');
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
      openAuth('signup');
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
      openAuth('signup');
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
      openAuth('signup');
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
    
    const finalReviewPriority = isInCoolingPeriod ? 100 : getReviewPriority(
      currentUser.role,
      currentUser.trustScore,
      analysis.greyAreaFlags
    );

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
        reviewPriority: finalReviewPriority,
      });
      track('post_created', { category, moderation_status: moderationStatus });

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
        reviewPriority: finalReviewPriority,
      };

      setConversations(prev => [newThread, ...prev]);

      const updatedUser = { ...currentUser, postCount: currentUser.postCount + 1 };
      saveUser(updatedUser);
      checkAndAwardBadges(updatedUser);
      setIsNewPostOpen(false);
      
      // All posts go to moderation — always show pending review message
      setPendingReview({
        threadId: newThread.id,
        title,
        category,
        submittedAt: new Date().toISOString(),
      });
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
  const handlePinThread = async (threadId: number, pinned: boolean) => {
    setConversations(prev => prev.map(c => c.id === threadId ? { ...c, isPinned: pinned } : c));
    try {
      await api.updateConversation(threadId, { isPinned: pinned });
    } catch (error) {
      console.error('Failed to pin thread:', error);
    }
  };
  const handleFeatureThread = async (threadId: number, featured: boolean) => {
    const featuredLabel = featured ? 'Circle Mom of the Month' : undefined;
    setConversations(prev => prev.map(c =>
      c.id === threadId ? { ...c, isFeatured: featured, featuredLabel } : c
    ));
    try {
      await api.updateConversation(threadId, { isFeatured: featured, featuredLabel });
    } catch (error) {
      console.error('Failed to feature thread:', error);
    }
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
    if (!currentUser) openAuth('signup');
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
      {isShowingCachedContent && !cachedBannerDismissed && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 text-amber-800 text-[13px] font-medium px-4 py-2 flex items-center justify-center gap-3 text-center"
        >
          <span>We couldn't reach the server, so you're seeing cached discussions. Voting, replying and posting won't save until the connection is back.</span>
          <button
            onClick={() => setCachedBannerDismissed(true)}
            aria-label="Dismiss offline notice"
            className="shrink-0 w-6 h-6 rounded-full hover:bg-amber-100 flex items-center justify-center text-amber-700"
          >
            ✕
          </button>
        </div>
      )}
      {authNotice && (
        <div
          role="alert"
          className="bg-red-50 border-b border-red-200 text-red-700 text-[13px] font-medium px-4 py-2 flex items-center justify-center gap-3 text-center"
        >
          <span>{authNotice}</span>
          <button
            onClick={() => { setAuthNotice(null); setIsAuthOpen(true); }}
            className="shrink-0 underline font-semibold hover:text-red-800"
          >
            Try again
          </button>
          <button
            onClick={() => setAuthNotice(null)}
            aria-label="Dismiss sign-in error"
            className="shrink-0 w-6 h-6 rounded-full hover:bg-red-100 flex items-center justify-center text-red-600"
          >
            ✕
          </button>
        </div>
      )}
      <Header
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        conversations={visibleConversations}
        onNewPostClick={openNewPost}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginClick={() => openAuth('login')}
        onModerationClick={() => setIsModerationOpen(true)}
        onAdminClick={() => navigate('/admin')}
        onProfileClick={() => setIsProfileOpen(true)}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
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
        onClearNotifications={clearNotifications}
        onThreadOpen={handleThreadOpen}
      />

      {/* Category circle nav */}
      {!isSearchMode && (
        <CategoryNav
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      )}

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
                <a
                  href="https://tucokids.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Go to tucokids.com"
                >
                  <img src={tucoLogo} alt="tuco Kids" className="h-8 w-auto" />
                </a>
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
                conversations={visibleConversations}
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
              conversations={visibleConversations}
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
                conversations={filteredConversations}
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
                isLoggedIn={!!currentUser}
                onJoinClick={() => openAuth('signup')}
                currentUser={currentUser}
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
              conversations={visibleConversations}
            />
          </div>
        </div>
      </div>
      <footer className="bg-white border-t border-neutral-200/90 py-10 px-4 mt-12 text-center text-xs text-neutral-400 font-bold font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <a
            href="https://tucokids.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="Go to tucokids.com"
          >
            <img src={tucoLogo} alt="tuco Kids Logo" className="h-8 w-auto" />
            <strong className="text-neutral-700 font-display text-sm tracking-tight text-left leading-tight">
              Parents Circle
            </strong>
          </a>
          <p className="text-[10px] font-medium text-neutral-400">
            © 2026 tuco Parents Circle. A safe space for Indian parents.
          </p>
        </div>
      </footer>
      {!currentUser && (
        <GuestPromptBanner onSignIn={() => openAuth('signup')} onNewPost={openNewPost} />
      )}
      <Modal
        thread={selectedThread}
        isOpen={isModalOpen}
        onClose={() => {
          // Strip the #thread-N hash by REPLACING the current history entry
          // rather than calling history.back(). After a Google OAuth round-trip
          // the back-stack still contains the Google login pages, so
          // history.back() would bounce the user to Google instead of the feed.
          // replaceState rewrites the URL in place and we close the modal via
          // state, which lands reliably on the home/category feed every time.
          if (window.location.hash.startsWith('#thread-')) {
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
          }
          setIsModalOpen(false);
          setSelectedThreadId(null);
          setActiveReplyTo(null);
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
        conversations={visibleConversations}
        onNewPostClick={openNewPost}
        onLogout={handleLogout}
        onLoginClick={() => openAuth('login')}
        onModerationClick={() => setIsModerationOpen(true)}
        onAdminClick={() => navigate('/admin')}
        onProfileClick={() => setIsProfileOpen(true)}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
        onOpenCategories={() => {
          setIsMobileLeftSidebarOpen(!isMobileLeftSidebarOpen);
        }}
        notifications={notifications}
        onMarkAsRead={async id => {
          const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
          setNotifications(updated);
          // Persist, otherwise the 30s poll re-fetches and the notification
          // pops back as unread (the other two bells already persist).
          try { await api.markNotificationRead(id); } catch {}
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
        initialMode={authInitialMode}
        initialResetToken={authResetToken}
      />
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          user={currentUser}
          conversations={visibleConversations}
          onThreadOpen={handleThreadOpen}
          loginEmail={sessionCredentials?.email ?? currentUser.email}
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
                conversations={conversations}
              />
            </div>
          </div>
        </div>
      )}
      <NotificationsPage
        isOpen={isNotificationsOpen}
        notifications={notifications}
        onMarkAsRead={async id => {
          const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
          setNotifications(updated);
          try { await api.markNotificationRead(id); } catch {}
        }}
        onClearAll={clearNotifications}
        onClose={() => setIsNotificationsOpen(false)}
        onThreadOpen={id => { setIsNotificationsOpen(false); handleThreadOpen(id); }}
      />
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

<ReportModal
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setReportTarget(null);
        }}
        onSubmit={handleSubmitReport}
        type={reportTarget?.type || 'reply'}
      />
      {showCompleteProfile && currentUser && (
        <CompleteProfileModal
          user={currentUser}
          onComplete={updatedUser => {
            setCurrentUser(updatedUser);
            setShowCompleteProfile(false);
          }}
        />
      )}
    </div>
  );
}

function AdminRoute() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { navigate('/'); return; }
    api.getMe()
      .then(u => {
        // Defense-in-depth: only TUCO_TEAM may see the admin panel. The server
        // already enforces this on every admin endpoint, but don't render the
        // panel shell to a regular logged-in user who navigates to /admin.
        if (u.role !== 'tuco_team') { navigate('/'); return; }
        setUser(u);
        setLoading(false);
      })
      .catch(() => { navigate('/'); });
  }, [navigate]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  return (
    <AdminPanel
      currentUserRole={user.role}
      onLogout={() => { api.logout(); navigate('/'); }}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/u/:username" element={<PublicProfilePage />} />
      <Route path="/" element={<AppContent />} />
      <Route path="/:category" element={<AppContent />} />
    </Routes>
  );
}
