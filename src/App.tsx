import { useState, useEffect, useMemo } from 'react';
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
import { NotificationsPage } from './components/NotificationsPage';
import { ReportModal } from './components/ReportModal';
import { INITIAL_CONVERSATIONS } from './data/conversations';
import { Conversation, Reply, User, ModerationStatus, DateFilter, PendingReviewSession } from './types';
import {
  analyzeContent,
  canTucoTeamPost,
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
import { sendThreadApprovalEmail, shouldSendWeeklyEmail, sendWeeklyEngagementToAllUsers } from './utils/emailService';
import { mergeSeedWithExisting } from './utils/seedContent';
import tucoLogo from './assets/tuco-logo.webp';

function enrichConversations(threads: Conversation[]): Conversation[] {
  return threads.map((c, i) => ({
    ...c,
    createdAt: c.createdAt || new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    moderationStatus: c.moderationStatus || 'approved',
    isFeatured: c.isFeatured ?? (c.id === 2),
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
};

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCategoryFilter, setSearchCategoryFilter] = useState<string>('all');
  const [searchDateFilter, setSearchDateFilter] = useState<DateFilter>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isModerationOpen, setIsModerationOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'thread' | 'reply'; id: number } | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReviewSession | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [votedThreads, setVotedThreads] = useState<Record<number, 'up' | 'down' | null>>({});
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

  useEffect(() => {
    // Check if we need to reseed data
    const needsReseed = localStorage.getItem('tuco_seed_version') !== 'v2';
    
    if (needsReseed) {
      localStorage.removeItem('tuco_conversations_v1');
      localStorage.removeItem('tuco_votes_v1');
      localStorage.removeItem('tuco_saved_posts_v1');
      localStorage.removeItem('tuco_current_user');
      localStorage.removeItem('tuco_users_db');
      
      const seeded = enrichConversations(mergeSeedWithExisting(INITIAL_CONVERSATIONS, 100));
      setConversations(seeded);
      localStorage.setItem('tuco_conversations_v1', JSON.stringify(seeded));
      setUsers({ [DEMO_MODERATOR.id]: DEMO_MODERATOR });
      localStorage.setItem('tuco_users_db', JSON.stringify({ [DEMO_MODERATOR.id]: DEMO_MODERATOR }));
      
      setVotedThreads({});
      setSavedPosts([]);
      setCurrentUser(null);
      
      localStorage.setItem('tuco_seed_version', 'v2');
    } else {
      // Load existing data
      const cachedData = localStorage.getItem('tuco_conversations_v1');
      if (cachedData) {
        try {
          setConversations(enrichConversations(JSON.parse(cachedData)));
        } catch {
          setConversations(enrichConversations(INITIAL_CONVERSATIONS));
        }
      } else {
        const seeded = enrichConversations(mergeSeedWithExisting(INITIAL_CONVERSATIONS, 100));
        setConversations(seeded);
        localStorage.setItem('tuco_conversations_v1', JSON.stringify(seeded));
      }

      const cachedVotes = localStorage.getItem('tuco_votes_v1');
      if (cachedVotes) {
        try {
          setVotedThreads(JSON.parse(cachedVotes));
        } catch {
          /* ignore */
        }
      }

      const cachedSavedPosts = localStorage.getItem('tuco_saved_posts_v1');
      if (cachedSavedPosts) {
        try {
          setSavedPosts(JSON.parse(cachedSavedPosts));
        } catch {
          /* ignore */
        }
      }

      const cachedUser = localStorage.getItem('tuco_current_user');
      if (cachedUser) {
        try {
          setCurrentUser(JSON.parse(cachedUser));
        } catch {
          /* ignore */
        }
      }

      const cachedUsers = localStorage.getItem('tuco_users_db');
      if (cachedUsers) {
        try {
          setUsers(JSON.parse(cachedUsers));
        } catch {
          setUsers({ [DEMO_MODERATOR.id]: DEMO_MODERATOR });
        }
      } else {
        setUsers({ [DEMO_MODERATOR.id]: DEMO_MODERATOR });
        localStorage.setItem('tuco_users_db', JSON.stringify({ [DEMO_MODERATOR.id]: DEMO_MODERATOR }));
      }
    }

    const minDisplayMs = 1200;
    const readyTimer = setTimeout(() => setIsAppReady(true), minDisplayMs);
    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    const cachedUsers = localStorage.getItem('tuco_users_db');
    const cachedConvs = localStorage.getItem('tuco_conversations_v1');
    if (cachedUsers && cachedConvs && shouldSendWeeklyEmail()) {
      try {
        const u = JSON.parse(cachedUsers);
        const c = JSON.parse(cachedConvs);
        sendWeeklyEngagementToAllUsers(u, c);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const saveConversations = (updated: Conversation[]) => {
    setConversations(updated);
    localStorage.setItem('tuco_conversations_v1', JSON.stringify(updated));
  };

  const saveVotes = (updated: Record<number, 'up' | 'down' | null>) => {
    setVotedThreads(updated);
    localStorage.setItem('tuco_votes_v1', JSON.stringify(updated));
  };

  const toggleSavedPost = (threadId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    let newSaved: number[];
    if (savedPosts.includes(threadId)) {
      newSaved = savedPosts.filter((id) => id !== threadId);
    } else {
      newSaved = [...savedPosts, threadId];
    }
    setSavedPosts(newSaved);
    localStorage.setItem('tuco_saved_posts_v1', JSON.stringify(newSaved));
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

  const saveUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('tuco_current_user', JSON.stringify(user));
      const updatedUsers = { ...users, [user.id]: user };
      setUsers(updatedUsers);
      localStorage.setItem('tuco_users_db', JSON.stringify(updatedUsers));
      if (user.trustScore >= 0.85 && user.role === 'member') {
        const promoted = { ...user, role: 'trusted' as const };
        setCurrentUser(promoted);
        localStorage.setItem('tuco_current_user', JSON.stringify(promoted));
        const promotedUsers = { ...updatedUsers, [user.id]: promoted };
        setUsers(promotedUsers);
        localStorage.setItem('tuco_users_db', JSON.stringify(promotedUsers));
      }
    } else {
      localStorage.removeItem('tuco_current_user');
    }
  };

  const checkAndAwardBadges = (user: User) => {
    const eligibleBadges = checkEligibleBadges(user);
    if (eligibleBadges.length > 0) {
      const newBadges = eligibleBadges.map((badgeType) => ({
        type: badgeType,
        earnedAt: new Date().toISOString(),
        discountCode: generateDiscountCode(user.id, badgeType),
        discountExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const updatedUser = { ...user, badges: [...user.badges, ...newBadges] };
      saveUser(updatedUser);
      const badgeNames = eligibleBadges
        .map((b) => `${BADGE_DISPLAY[b].icon} ${BADGE_DISPLAY[b].name}`)
        .join(', ');
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Congratulations!',
        message: `You've earned: ${badgeNames}`,
      });
    }
  };

  const handleSignup = (email: string, username: string, city: string, childAge: string) => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      username,
      email,
      city,
      childAge,
      role: 'member',
      badges: [],
      createdAt: new Date().toISOString(),
      isVerified: true,
      postCount: 0,
      replyCount: 0,
      totalUpvotes: 0,
      trustScore: 0.5,
      emailNotifications: true,
    };
    const updatedUsers = { ...users, [newUser.id]: newUser };
    setUsers(updatedUsers);
    localStorage.setItem('tuco_users_db', JSON.stringify(updatedUsers));
    setSessionCredentials({ email, password: '(signed up via OTP)' });
    saveUser(newUser);
    setIsAuthOpen(false);
  };

  const handleLogin = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setSessionCredentials({ email: email.trim(), password });

    let user = Object.values(users).find((u) => u.email.toLowerCase() === normalizedEmail);

    if (normalizedEmail === DEMO_MODERATOR.email.toLowerCase()) {
      user = DEMO_MODERATOR;
    } else if (!user) {
      const username =
        normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') || 'Parent';
      user = {
        id: `user_${Date.now()}`,
        username,
        email: normalizedEmail,
        city: 'India',
        role: 'member',
        badges: [],
        createdAt: new Date().toISOString(),
        isVerified: true,
        postCount: 0,
        replyCount: 0,
        totalUpvotes: 0,
        trustScore: 0.5,
        emailNotifications: true,
      };
      const updatedUsers = { ...users, [user.id]: user };
      setUsers(updatedUsers);
      localStorage.setItem('tuco_users_db', JSON.stringify(updatedUsers));
    }

    saveUser(user);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    setSessionCredentials(null);
    saveUser(null);
  };

  const selectedThread = conversations.find((c) => c.id === selectedThreadId) || null;
  const isSearchMode = searchTerm.trim().length > 0;

  const searchResults = useMemo(() => {
    const ranked = searchThreadsWithRanking(conversations, searchTerm, 50);
    return filterThreads(ranked, '', searchCategoryFilter, searchDateFilter);
  }, [conversations, searchTerm, searchCategoryFilter, searchDateFilter]);

  const filteredConversations = useMemo(() => {
    if (activeCategory === 'saved') {
      return conversations.filter((c) => savedPosts.includes(c.id));
    }
    if (activeCategory === 'sidebar-open') {
      return conversations;
    }
    return conversations;
  }, [conversations, activeCategory, savedPosts]);

  const featuredThreads = useMemo(() => getFeaturedThreads(conversations), [conversations]);

  const pendingThreads = useMemo(
    () =>
      [...conversations.filter((c) => c.moderationStatus === 'pending')].sort(
        (a, b) => (a.reviewPriority ?? 50) - (b.reviewPriority ?? 50)
      ),
    [conversations]
  );

  const handleThreadOpen = (threadId: number) => {
    const updated = conversations.map((c) =>
      c.id === threadId ? { ...c, views: c.views + 1 } : c
    );
    saveConversations(updated);
    setSelectedThreadId(threadId);
    setIsModalOpen(true);
  };

  const handleVote = (threadId: number, type: 'up' | 'down') => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
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

    const updated = conversations.map((c) =>
      c.id === threadId ? { ...c, votes: c.votes + voteDiff } : c
    );
    saveConversations(updated);

    if (upvoteDiff !== 0 && currentUser) {
      const updatedUser = { ...currentUser, totalUpvotes: currentUser.totalUpvotes + upvoteDiff };
      saveUser(updatedUser);
      checkAndAwardBadges(updatedUser);
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

  const handleAddReply = (threadId: number, name: string, city: string, text: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const thread = conversations.find((c) => c.id === threadId);
    const analysis = analyzeContent(text, thread?.category || 'general');

    if (analysis.outcome === 'CLEAR_VIOLATION') {
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Reply Rejected',
        message: 'Your reply was rejected due to community guidelines violation. Please review the Moderation Rules.',
      });
      return;
    }

    const newReply: Reply = {
      id: Date.now(),
      author: name,
      city,
      time: 'Just now',
      text: analysis.civilityReminder ? `${text}\n\n---\n💛 ${analysis.civilityReminder}` : text,
      tucoRec: detectProductRecommendation(text),
      likes: 0,
      authorRole: currentUser.role,
      authorBadges: currentUser.badges.map((b) => b.type),
    };
    const updated = conversations.map((c) =>
      c.id === threadId ? { ...c, replies: [...c.replies, newReply] } : c
    );
    const updatedUser = { ...currentUser, replyCount: currentUser.replyCount + 1 };
    saveUser(updatedUser);
    checkAndAwardBadges(updatedUser);
    saveConversations(updated);
  };

  const handleReportReply = (threadId: number, replyId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setReportTarget({ type: 'reply', id: replyId });
    setIsReportOpen(true);
  };

  const handleSubmitReport = (reason: string, details: string) => {
    setWarningModal({
      isOpen: true,
      type: 'success',
      title: 'Report Submitted',
      message: 'Thank you for your report. Our moderation team will review this promptly.',
    });
    setReportTarget(null);
  };

  const handleEditReply = (threadId: number, replyId: number, newText: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const updated = conversations.map((c) => {
      if (c.id === threadId) {
        const updatedReplies = c.replies.map((r) => {
          if (r.id === replyId) {
            return { ...r, text: newText };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }
      return c;
    });
    setConversations(updated);
    localStorage.setItem('tuco_conversations_v1', JSON.stringify(updated));
    setWarningModal({
      isOpen: true,
      type: 'success',
      title: 'Reply Updated',
      message: 'Your reply has been successfully updated!',
    });
  };

  const handleDeleteReply = (threadId: number, replyId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const updated = conversations.map((c) => {
      if (c.id === threadId) {
        return { ...c, replies: c.replies.filter((r) => r.id !== replyId) };
      }
      return c;
    });
    setConversations(updated);
    localStorage.setItem('tuco_conversations_v1', JSON.stringify(updated));
    setWarningModal({
      isOpen: true,
      type: 'info',
      title: 'Reply Deleted',
      message: 'Your reply has been deleted.',
    });
  };

  const handleLikeReply = (threadId: number, replyId: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const updated = conversations.map((c) => {
      if (c.id === threadId) {
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === replyId ? { ...r, likes: (r.likes || 0) + 1 } : r
          ),
        };
      }
      return c;
    });
    saveConversations(updated);
  };

  const handleCreateNewThread = (
    title: string,
    category: string,
    author: string,
    city: string,
    text: string
  ) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    if (currentUser.role === 'tuco_team') {
      const teamCheck = canTucoTeamPost(category, title, text);
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
    if (currentUser.role === 'member' && accountAgeDays < 1) {
      const hoursRemaining = Math.ceil((1 - accountAgeDays) * 24);
      setWarningModal({
        isOpen: true,
        type: 'warning',
        title: '24-Hour Cooling Period',
        message: `New members have a 24-hour cooling period before posting. You can post again in ${hoursRemaining} hours.`,
      });
      return;
    }

    const analysis = analyzeContent(text + ' ' + title, category);
    let moderationStatus: ModerationStatus = 'pending';

    if (analysis.outcome === 'CLEAR_VIOLATION') {
      moderationStatus = 'rejected';
    }
    // All new threads go to human review, no auto-approval

    const newThread: Conversation = {
      id: Date.now(),
      title,
      category,
      votes: 1,
      views: 0,
      op: {
        author: currentUser.role === 'tuco_team' ? 'Tuco Team' : author,
        city,
        time: 'Just now',
        text: analysis.civilityReminder ? `${text}\n\n---\n💛 ${analysis.civilityReminder}` : text,
        authorRole: currentUser.role,
        authorBadges: currentUser.badges.map((b) => b.type),
      },
      replies: [],
      moderationStatus,
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
      greyAreaFlags: analysis.greyAreaFlags,
      reviewPriority: getReviewPriority(
        currentUser.role,
        currentUser.trustScore,
        analysis.greyAreaFlags
      ),
    };

    if (moderationStatus === 'rejected') {
      setWarningModal({
        isOpen: true,
        type: 'error',
        title: 'Post Rejected',
        message: 'Your post was rejected due to community guidelines violation. Please review the Moderation Rules.',
      });
      return;
    }

    const updatedUser = { ...currentUser, postCount: currentUser.postCount + 1 };
    saveUser(updatedUser);
    checkAndAwardBadges(updatedUser);

    saveConversations([newThread, ...conversations]);
    setIsNewPostOpen(false);

    if (moderationStatus === 'pending') {
      setPendingReview({
        threadId: newThread.id,
        title,
        category,
        submittedAt: new Date().toISOString(),
      });
    } else {
      setWarningModal({
        isOpen: true,
        type: 'success',
        title: 'Discussion Live!',
        message: 'Your discussion is now live!',
      });
    }
  };

  const handleApproveThread = (threadId: number) => {
    const thread = conversations.find((c) => c.id === threadId);
    const updated = conversations.map((c) =>
      c.id === threadId
        ? { ...c, moderationStatus: 'approved' as ModerationStatus, moderatedBy: currentUser?.id }
        : c
    );
    saveConversations(updated);

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

  const handleRejectThread = (threadId: number, reason: string) => {
    const updated = conversations.map((c) =>
      c.id === threadId
        ? {
            ...c,
            moderationStatus: 'rejected' as ModerationStatus,
            moderationReason: reason,
            moderatedBy: currentUser?.id,
          }
        : c
    );
    saveConversations(updated);
    setWarningModal({
      isOpen: true,
      type: 'error',
      title: 'Thread Rejected',
      message: `Thread rejected. Reason: ${reason}`,
    });
  };

  const handlePinThread = (threadId: number, pinned: boolean) => {
    saveConversations(
      conversations.map((c) => (c.id === threadId ? { ...c, isPinned: pinned } : c))
    );
  };

  const handleFeatureThread = (threadId: number, featured: boolean) => {
    saveConversations(
      conversations.map((c) =>
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
    localStorage.removeItem('tuco_saved_posts_v1');
    localStorage.removeItem('tuco_current_user');
    localStorage.removeItem('tuco_users_db');
    const seeded = enrichConversations(mergeSeedWithExisting(INITIAL_CONVERSATIONS, 100));
    setConversations(seeded);
    setVotedThreads({});
    setSavedPosts([]);
    setActiveCategory('all');
    setSearchTerm('');
    setSelectedThreadId(null);
    setIsModalOpen(false);
    setCurrentUser(null);
    setUsers({ [DEMO_MODERATOR.id]: DEMO_MODERATOR });
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
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col font-sans text-neutral-800">
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
        onNotificationsClick={() => setIsNotificationsOpen(true)}
        onOpenCategories={() => setActiveCategory(activeCategory === 'sidebar-open' ? 'all' : 'sidebar-open')}
        onSuggestionSelect={(id) => {
          const thread = conversations.find((c) => c.id === id);
          if (thread) setSearchTerm(thread.title.split(' ').slice(0, 3).join(' '));
          handleThreadOpen(id);
        }}
      />

      <div className="layout flex-1 w-full mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-8">
        {activeCategory === 'sidebar-open' ? (
          <div className="lg:hidden space-y-4 mb-6">
            <LeftSidebar
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              conversations={conversations}
              savedPosts={savedPosts}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[252px_1fr_280px] gap-4 md:gap-8">
            <div className="hidden lg:block">
              <LeftSidebar
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
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
                />
              )}
            </div>

            <div className="hidden lg:block">
              <RightSidebar
                onTrendingClick={handleThreadOpen}
                featuredThreads={featuredThreads}
                onFeaturedClick={handleThreadOpen}
              />
            </div>
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-neutral-200/90 py-10 px-4 mt-12 text-center text-xs text-neutral-400 font-bold font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={tucoLogo} alt="Tuco Kids Logo" className="h-8 w-auto" />
            <strong className="text-neutral-700 font-display text-sm tracking-tight text-left leading-tight">
              Parents Circle
            </strong>
          </div>
          <p className="text-[10px] font-medium text-neutral-400">
            © 2026 Tuco Parents Circle. A safe space for Indian parents.
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
          setIsModalOpen(false);
          setSelectedThreadId(null);
        }}
        onAddReply={handleAddReply}
        onLikeReply={handleLikeReply}
        onReportReply={handleReportReply}
        onEditReply={handleEditReply}
        onDeleteReply={handleDeleteReply}
        currentUser={currentUser}
        users={users}
      />

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        onSubmit={handleCreateNewThread}
        isTucoTeam={currentUser?.role === 'tuco_team'}
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

      {pendingReview && (
        <ThreadReviewConfirmation
          threadTitle={pendingReview.title}
          relatedThreads={relatedForReview}
          onBrowseRelated={(id) => {
            setPendingReview(null);
            handleThreadOpen(id);
          }}
          onClose={() => setPendingReview(null)}
        />
      )}

      {isModerationOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-xl relative">
            <button
              onClick={() => setIsModerationOpen(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 z-10"
            >
              ✕
            </button>
            <ModerationDashboard
              pendingThreads={pendingThreads}
              onApprove={handleApproveThread}
              onReject={handleRejectThread}
            />
          </div>
        </div>
      )}

      {isAdminOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-lg relative">
            <AdminToolsPanel
              conversations={conversations}
              users={users}
              onSeedContent={(threads) => saveConversations(enrichConversations(threads))}
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

      <NotificationsPage
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
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
    </div>
  );
}
