export interface Op {
  author: string;
  city: string;
  time: string;
  text: string;
  image?: string;
  authorRole?: UserRole;
  authorBadges?: BadgeType[];
}

export interface Reply {
  id: number;
  author: string;
  city: string;
  time: string;
  text: string;
  image?: string;
  tucoRec?: string;
  likes?: number;
  authorRole?: UserRole;
  authorBadges?: BadgeType[];
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
}
export type GreyAreaFlag =
  | 'religious_cultural'
  | 'mental_health'
  | 'hinglish'
  | 'negative_tuco_review';
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
  city: string;
  childAge?: string;
  role: UserRole;
  badges: Badge[];
  createdAt: string;
  isVerified: boolean;
  postCount: number;
  replyCount: number;
  totalUpvotes: number;
  trustScore: number;
  emailNotifications?: boolean;
  savedPosts?: number[];
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

