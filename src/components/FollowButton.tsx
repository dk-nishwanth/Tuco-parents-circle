import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { api } from '../utils/api';
import { track } from '../utils/analytics';

interface Props {
  targetType: 'user' | 'thread';
  targetId: string | number;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  size?: 'sm' | 'md';
  labelWhenFollowing?: string;
  labelWhenNot?: string;
}

// Self-contained follow toggle. Fetches the caller's follow set on mount so
// the button renders in the correct state whether the user is following the
// target or not. Optimistic on click; falls back to the server truth on error.
export function FollowButton({
  targetType,
  targetId,
  isLoggedIn,
  onRequireLogin,
  size = 'sm',
  labelWhenFollowing = 'Following',
  labelWhenNot = 'Follow',
}: Props) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn) { setFollowing(false); return; }
    (async () => {
      try {
        const f = await api.getMyFollows();
        if (cancelled) return;
        const isFollowed = targetType === 'user'
          ? f.users.includes(String(targetId))
          : f.threads.includes(Number(targetId));
        setFollowing(isFollowed);
      } catch {
        if (!cancelled) setFollowing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn, targetType, targetId]);

  const handleClick = async () => {
    if (!isLoggedIn) { onRequireLogin(); return; }
    if (busy || following === null) return;
    const nextFollowing = !following;
    setBusy(true);
    setFollowing(nextFollowing);
    try {
      if (nextFollowing) await api.follow(targetType, targetId);
      else await api.unfollow(targetType, targetId);
      track(nextFollowing ? 'follow_created' : 'follow_removed', { target_type: targetType, target_id: String(targetId) });
    } catch {
      setFollowing(following);
    } finally {
      setBusy(false);
    }
  };

  const px = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs';
  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={following === true}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-colors ${px} ${
        following
          ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          : 'bg-[#35B5EC] text-white hover:bg-[#2ba1d4]'
      } disabled:opacity-60`}
    >
      {following ? <BellOff className={iconSize} strokeWidth={2} /> : <Bell className={iconSize} strokeWidth={2} />}
      <span>{following ? labelWhenFollowing : labelWhenNot}</span>
    </button>
  );
}
