export interface Op {
  author: string;
  city: string;
  time: string;
  text: string;
  image?: string;
  // Optional array of images for carousel. When present, image is the first
  // entry (kept for backwards compatibility with older code paths).
  images?: string[];
  authorRole?: UserRole;
  authorBadges?: BadgeType[];
}

export interface Reply {
  id: number;
  author: string;
  authorId?: string;
  city: string;
  time: string;
  text: string;
  image?: string;
  images?: string[];
  likes: number;
  authorRole?: UserRole;
  authorBadges?: BadgeType[];
  createdAt?: string;
  parentId?: number; // ID of the parent reply for nested replies
  replies?: Reply[]; // Array of nested replies
}
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';
export interface Conversation {
  id: number;
  title: string;
  category: string;
  isPinned?: boolean;
  isHot?: boolean;
  isFeatured?: boolean;
  featuredLabel?: string;
  isWeeklyHighlight?: boolean;
  votes: number;
  views: number;
  op: Op;
  replies: Reply[];
  moderationStatus?: ModerationStatus;
  moderatedBy?: string;
  moderationReason?: string;
  createdAt?: string;
  authorId?: string;
  greyAreaFlags?: GreyAreaFlag[];
  reviewPriority?: number;
  // Age-of-child bucket this thread is about. Powers the "For Your Age" feed.
  childAge?: string | null;
}
export type GreyAreaFlag =
  | 'religious_cultural'
  | 'mental_health'
  | 'english'
  | 'negative_tuco_review'
  | 'safety_concern';
export interface Category {
  id: string;
  label: string;
  icon: string;
  className: string;
  count: number;
}
export interface CategoryColor {
  bg: string;
  text: string;
  border: string;
}
export interface Product {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  tag: string;
  price: string;
  linkUrl: string;
}
export interface Trending {
  id: number;
  rank: string;
  title: string;
  meta: string;
}
export type UserRole = 'guest' | 'member' | 'trusted' | 'moderator' | 'tuco_team';
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  city: string;
  childAge?: string;
  role: UserRole;
  badges: Badge[];
  createdAt: string;
  isVerified: boolean;
  // False only for Google-only accounts that never set a real password —
  // lets the UI show "Set a password" instead of "Change password" and skip
  // asking for a current password that doesn't exist.
  hasPassword?: boolean;
  postCount: number;
  replyCount: number;
  totalUpvotes: number;
  trustScore: number;
  emailNotifications?: boolean;
  savedPosts?: number[];
  interests?: string[];
}
export type BadgeType =
  | 'community_member'
  | 'community_insider'
  | 'trusted_member'
  | 'insider_plus'
  | 'community_vip'
  | 'circle_elder';
export interface Badge {
  type: BadgeType;
  earnedAt: string;
  discountCode?: string;
  discountExpiry?: string;
}
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type AIApprovalOutcome = 'CLEAN' | 'UNCERTAIN' | 'CLEAR_VIOLATION';
export interface ConversationWithMeta extends Conversation {
  moderationStatus: ModerationStatus;
  moderatedBy?: string;
  moderationReason?: string;
  createdAt: string;
}
export interface PendingReviewSession {
  threadId: number;
  title: string;
  category: string;
  submittedAt: string;
}
export interface EmailLogEntry {
  id: string;
  type: 'approval' | 'weekly_engagement' | 'launch';
  to: string;
  subject: string;
  sentAt: string;
  preview: string;
}

export interface Notification {
  id: number;
  type: 'reply' | 'like' | 'badge' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
  threadId?: number;
}

export interface Vote {
  id?: string;
  userId?: string;
  conversationId?: number;
  replyId?: number;
  type: 'UP' | 'DOWN';
  createdAt?: string;
}

export interface ModerationLog {
  id?: string;
  moderatorId?: string;
  targetType?: 'CONVERSATION' | 'REPLY';
  targetId?: number;
  action?: string;
  reason?: string;
  createdAt?: string;
}

