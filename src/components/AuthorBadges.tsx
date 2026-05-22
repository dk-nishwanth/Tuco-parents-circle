import { BadgeType, UserRole } from '../types';
import { BADGE_DISPLAY } from '../utils/badgeSystem';
interface AuthorBadgesProps {
  badges?: BadgeType[];
  role?: UserRole;
  compact?: boolean;
}
export function AuthorBadges({ badges = [], role, compact = true }: AuthorBadgesProps) {
  const topBadge = badges.length > 0 ? badges[badges.length - 1] : null;
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0">
      {role === 'tuco_team' && (
        <span
          className={`font-display font-black uppercase bg-tuco-orange/10 text-tuco-orange border border-tuco-orange/25 rounded-sm ${
            compact ? 'text-[8px] px-1 py-0' : 'text-[9px] px-1.5 py-0.5'
          }`}
          title="Official Tuco Team — posts only when directly relevant"
        >
          Tuco Team
        </span>
      )}
      {role === 'trusted' && (
        <span
          className={`font-display font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm ${
            compact ? 'text-[8px] px-1' : 'text-[9px] px-1.5'
          }`}
          title="Trusted Member"
        >
          ✓
        </span>
      )}
      {topBadge && (
        <span
          className={`${compact ? 'text-[10px]' : 'text-xs'}`}
          title={BADGE_DISPLAY[topBadge].name}
        >
          {BADGE_DISPLAY[topBadge].icon}
        </span>
      )}
    </span>
  );
}
