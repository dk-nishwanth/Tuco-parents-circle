import { Badge, BadgeType, User } from '../types';

export const BADGE_CRITERIA: Record<BadgeType, { threads: number; upvotes: number; days: number }> = {
  community_member: { threads: 1, upvotes: 0, days: 0 },
  community_insider: { threads: 5, upvotes: 0, days: 0 },
  trusted_member: { threads: 10, upvotes: 25, days: 30 },
  insider_plus: { threads: 15, upvotes: 50, days: 0 },
  community_vip: { threads: 30, upvotes: 150, days: 180 },
  circle_elder: { threads: 50, upvotes: 300, days: 365 },
};

export const BADGE_DISPLAY: Record<BadgeType, { name: string; icon: string; color: string }> = {
  community_member: {
    name: 'Community Member',
    icon: '🌱',
    color: 'bg-emerald-100 text-emerald-700',
  },
  community_insider: {
    name: 'Community Insider',
    icon: '⭐',
    color: 'bg-yellow-100 text-yellow-700',
  },
  trusted_member: {
    name: 'Trusted Member',
    icon: '✅',
    color: 'bg-cyan-100 text-cyan-700',
  },
  insider_plus: {
    name: 'Community Insider+',
    icon: '✨',
    color: 'bg-blue-100 text-blue-700',
  },
  community_vip: {
    name: 'Community VIP',
    icon: '👑',
    color: 'bg-purple-100 text-purple-700',
  },
  circle_elder: {
    name: 'Circle Elder',
    icon: '🏆',
    color: 'bg-red-100 text-red-700',
  },
};

export const DISCOUNT_CODES: Record<BadgeType, { discount: number; validity: number }> = {
  community_member: { discount: 0, validity: 0 },
  community_insider: { discount: 5, validity: 30 },
  trusted_member: { discount: 7, validity: 30 },
  insider_plus: { discount: 10, validity: 30 },
  community_vip: { discount: 15, validity: 45 },
  circle_elder: { discount: 15, validity: 45 },
};

export function checkEligibleBadges(user: User): BadgeType[] {
  const eligible: BadgeType[] = [];
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  for (const [badgeType, criteria] of Object.entries(BADGE_CRITERIA)) {
    if (
      user.postCount >= criteria.threads &&
      user.totalUpvotes >= criteria.upvotes &&
      accountAgeDays >= criteria.days &&
      !user.badges.some((b) => b.type === badgeType)
    ) {
      eligible.push(badgeType as BadgeType);
    }
  }

  return eligible;
}

export function generateDiscountCode(userId: string, badgeType: BadgeType): string {
  const badge = BADGE_DISPLAY[badgeType];
  const code = `${badgeType.toUpperCase()}_${userId.substring(0, 6).toUpperCase()}`;
  return code;
}
