import { Conversation, DateFilter, User, BadgeType, UserRole } from '../types';
const AVATAR_COLORS = [
  '#FFE259',
  '#FFE259',
  '#FFE259',
  '#FFE259',
  '#FFE259',
];
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
export function getInitials(name: string): string {
  const parts = name.split(/[_\s.-]/g).filter(p => p.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
export function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}
export function matchesDateFilter(createdAt: string | undefined, filter: DateFilter): boolean {
  if (filter === 'all' || !createdAt) return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (filter) {
    case 'today':
      return now - created < day;
    case 'week':
      return now - created < 7 * day;
    case 'month':
      return now - created < 30 * day;
    case 'year':
      return now - created < 365 * day;
    default:
      return true;
  }
}
export function filterThreads(
  threads: Conversation[],
  searchTerm: string,
  category: string,
  dateFilter: DateFilter = 'all'
): Conversation[] {
  return threads.filter(thread => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      thread.title.toLowerCase().includes(term) ||
      thread.op.text.toLowerCase().includes(term) ||
      thread.op.author.toLowerCase().includes(term) ||
      thread.replies.some(r => r.text.toLowerCase().includes(term));
    const matchesCategory = category === 'all' || thread.category === category;
    const matchesDate = matchesDateFilter(thread.createdAt, dateFilter);
    return matchesSearch && matchesCategory && matchesDate;
  });
}
export function getAuthorMeta(
  authorName: string,
  authorId: string | undefined,
  users: Record<string, User>
): { role?: UserRole; badges: BadgeType[] } {
  const byId = authorId ? users[authorId] : undefined;
  const byName = Object.values(users).find(
    u => u.username.toLowerCase() === authorName.toLowerCase()
  );
  const user = byId || byName;
  if (user) {
    return {
      role: user.role,
      badges: user.badges.map(b => b.type),
    };
  }
  return { badges: [] };
}
export function sortThreads(threads: Conversation[], sortType: string): Conversation[] {
  const sorted = [...threads];
  const pinFirst = (list: Conversation[]) =>
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  switch (sortType) {
    case 'trending':
      return pinFirst(sorted.sort((a, b) => b.votes - a.votes));
    case 'new':
      return pinFirst(
        sorted.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bTime - aTime;
        })
      );
    case 'unanswered':
      return pinFirst(sorted.sort((a, b) => a.replies.length - b.replies.length));
    default:
      return pinFirst(sorted);
  }
}
export function getRelatedThreads(
  threads: Conversation[],
  category: string,
  excludeId: number,
  limit = 4
): Conversation[] {
  return threads
    .filter(
      t =>
        t.id !== excludeId &&
        t.category === category &&
        (!t.moderationStatus || t.moderationStatus === 'approved')
    )
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit);
}
export function getFeaturedThreads(threads: Conversation[]): Conversation[] {
  return threads
    .filter(t => t.isFeatured && (!t.moderationStatus || t.moderationStatus === 'approved'))
    .slice(0, 3);
}
export function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return '1 day ago';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}

export function searchThreadsWithRanking(
  threads: Conversation[],
  query: string,
  limit: number = 10
): Conversation[] {
  if (!query.trim()) return [];
  const queryLower = query.toLowerCase();
  const scored = threads
    .filter(thread => {
      return !thread.moderationStatus || thread.moderationStatus === 'approved';
    })
    .map(thread => {
      let score = 0;
      const titleMatch = thread.title.toLowerCase().includes(queryLower);
      if (titleMatch) {
        score += thread.title.toLowerCase().startsWith(queryLower) ? 100 : 50;
      }
      if (thread.op.text.toLowerCase().includes(queryLower)) {
        score += 30;
      }
      const replyMatches = thread.replies.filter(r =>
        r.text.toLowerCase().includes(queryLower)
      ).length;
      score += replyMatches * 10;
      if (thread.views > 100) score += 20;
      if (thread.replies.length > 5) score += 15;
      if (thread.isPinned) score += 25;
      return { thread, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.thread);
  return scored;
}
