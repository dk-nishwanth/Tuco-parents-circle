import { Conversation, DateFilter, User, BadgeType, UserRole, Reply } from '../types';
import { CHILD_AGE_OPTIONS, normalizeChildAge } from '../data/childAgeOptions';

// Ordered ladder of the canonical child-age buckets. Distance between two
// buckets on this ladder is used by the "For Your Age" feed to include
// adjacent groups (e.g. a 2–3-year parent also sees 1–2 and 3–5 threads).
const AGE_ORDER: readonly string[] = CHILD_AGE_OPTIONS;

export function ageBucketDistance(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeChildAge(a);
  const nb = normalizeChildAge(b);
  if (!na || !nb) return Infinity;
  const ia = AGE_ORDER.indexOf(na);
  const ib = AGE_ORDER.indexOf(nb);
  if (ia < 0 || ib < 0) return Infinity;
  return Math.abs(ia - ib);
}

// Count every reply in a thread, including nested ones. The server nests child
// replies under their parent, so `thread.replies.length` only counts root-level
// comments and undercounts total engagement everywhere it's shown.
export function countAllReplies(replies: Reply[] | undefined): number {
  if (!replies || replies.length === 0) return 0;
  return replies.reduce((total, r) => total + 1 + countAllReplies(r.replies), 0);
}
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
export function sortThreads(
  threads: Conversation[],
  sortType: string,
  viewerChildAge?: string | null,
): Conversation[] {
  const sorted = [...threads];
  const pinFirst = (list: Conversation[]) =>
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  const trendingScore = (c: Conversation) => {
    const ageHours = c.createdAt
      ? (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60)
      : 999;
    const recencyBoost = Math.max(0, 1 - ageHours / 168);
    return (c.votes || 0) * 2 + (c.replies?.length || 0) * 3 + (c.views || 0) * 0.1 + recencyBoost * 20;
  };

  switch (sortType) {
    case 'trending':
      return pinFirst(sorted.sort((a, b) => trendingScore(b) - trendingScore(a)));
    case 'new':
      return pinFirst(
        sorted.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bTime - aTime;
        })
      );
    case 'unanswered':
      return pinFirst(sorted.sort((a, b) => (a.replies?.length || 0) - (b.replies?.length || 0)));
    case 'for-you': {
      // Only include threads whose age bucket is within 1 of the viewer's.
      // Sort exact-match first, then adjacent, then by newness inside each tier.
      // If viewer has no childAge yet, fall back to plain "new".
      if (!viewerChildAge) return sortThreads(threads, 'new');
      const filtered = sorted.filter(c => {
        const d = ageBucketDistance(c.childAge, viewerChildAge);
        return d <= 1;
      });
      return pinFirst(
        filtered.sort((a, b) => {
          const da = ageBucketDistance(a.childAge, viewerChildAge);
          const db = ageBucketDistance(b.childAge, viewerChildAge);
          if (da !== db) return da - db;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bTime - aTime;
        })
      );
    }
    default:
      return pinFirst(sorted.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return bTime - aTime;
      }));
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
  
  // Pluralize so we never render "1 days ago" / "1 hours ago".
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return plural(Math.floor(seconds / 60), 'min');
  if (seconds < 86400) return plural(Math.floor(seconds / 3600), 'hour');
  if (seconds < 2592000) return plural(Math.floor(seconds / 86400), 'day');
  if (seconds < 31536000) return plural(Math.floor(seconds / 2592000), 'month');
  return plural(Math.floor(seconds / 31536000), 'year');
}

// Common English words we shouldn't score. Kept small on purpose — anything
// domain-specific ("kids", "child", "food") stays in for signal.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'is', 'it', 'in', 'to', 'for',
  'of', 'on', 'at', 'be', 'i', 'my', 'me', 'we', 'us', 'you', 'your',
  'do', 'does', 'this', 'that', 'was', 'are', 'with', 'how', 'what',
  'when', 'where', 'why', 'so', 'as', 'by', 'from', 'about',
]);

function normalize(s: string): string {
  return (s || '').toLowerCase();
}

// Simple English-plural normalization: 'kids' → 'kid', 'babies' → 'babie'.
// Not linguistically perfect but stops obvious singular/plural misses.
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function tokenize(input: string): string[] {
  return normalize(input)
    .split(/[^\w']+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

// Count how many times any of the words appears in text, plus word-boundary
// and prefix awareness. Word-boundary matches score higher than substring.
function tokenScore(text: string, tokens: string[]): { matched: number; hits: number } {
  if (!text || tokens.length === 0) return { matched: 0, hits: 0 };
  const normalizedText = normalize(text);
  const words = normalizedText.split(/[^\w']+/).filter(Boolean);
  const stemmedWords = words.map(stem);

  let matched = 0;
  let hits = 0;
  for (const raw of tokens) {
    const t = stem(raw);
    let tokenMatched = false;
    // Whole-word or stem match (strongest)
    for (const w of stemmedWords) {
      if (w === t) { hits += 3; tokenMatched = true; }
      else if (w.startsWith(t) && t.length >= 3) { hits += 2; tokenMatched = true; }
    }
    // Substring fallback (weakest)
    if (!tokenMatched && normalizedText.includes(raw)) {
      hits += 1;
      tokenMatched = true;
    }
    if (tokenMatched) matched++;
  }
  return { matched, hits };
}

export function searchThreadsWithRanking(
  threads: Conversation[],
  query: string,
  limit: number = 10
): Conversation[] {
  const rawQuery = normalize(query).trim();
  if (!rawQuery) return [];
  const tokens = tokenize(rawQuery);
  const isSingleWord = tokens.length <= 1;

  const scored = threads
    .filter(thread => !thread.moderationStatus || thread.moderationStatus === 'approved')
    .map(thread => {
      const title = normalize(thread.title);
      const opText = normalize(thread.op?.text || '');
      const category = normalize(thread.category || '');
      const author = normalize(thread.op?.author || '');

      let score = 0;

      // 1. Exact-phrase matches (strongest signal for multi-word queries)
      if (title.includes(rawQuery)) {
        score += title.startsWith(rawQuery) ? 200 : 120;
      }
      if (opText.includes(rawQuery)) score += 50;
      if (category.includes(rawQuery)) score += 60;
      if (author.includes(rawQuery)) score += 40;

      // 2. Per-token matches (handles multi-word queries + similar words)
      if (tokens.length > 0) {
        const titleScore = tokenScore(title, tokens);
        const opScore = tokenScore(opText, tokens);
        const categoryScore = tokenScore(category, tokens);
        const authorScore = tokenScore(author, tokens);

        // Weight by field importance: title >> category > op text > author
        score += titleScore.hits * 15;
        score += categoryScore.hits * 10;
        score += opScore.hits * 6;
        score += authorScore.hits * 4;

        // Coverage bonus — reward threads that match ALL query tokens
        const anyFieldMatched = Math.max(
          titleScore.matched, opScore.matched, categoryScore.matched, authorScore.matched
        );
        if (tokens.length > 1 && anyFieldMatched === tokens.length) {
          score += 40;
        }

        // Reply body matches (capped to avoid one long thread dominating)
        let replyHits = 0;
        for (const r of thread.replies || []) {
          const rs = tokenScore(r.text || '', tokens);
          replyHits += rs.hits;
          if (replyHits >= 30) break;
        }
        score += Math.min(replyHits * 2, 30);
      }

      // 3. Engagement boosts — only when the post already had a text match,
      // so a popular unrelated thread never leaks in.
      if (score > 0) {
        score += Math.min((thread.votes || 0) * 0.5, 25);
        score += Math.min((thread.replies?.length || 0) * 1.5, 20);
        if (thread.isPinned) score += 15;
      }

      // Single-word bare queries need a much higher floor to be considered
      // useful — filters out threads that only weakly match one word.
      const floor = isSingleWord ? 8 : 4;
      return { thread, score: score >= floor ? score : 0 };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.thread);
  return scored;
}
