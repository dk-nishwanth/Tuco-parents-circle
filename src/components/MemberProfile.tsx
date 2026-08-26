import { useState, useEffect, FormEvent } from 'react';
import { User, Conversation } from '../types';
import { BADGE_DISPLAY } from '../utils/badgeSystem';
import { api } from '../utils/api';
import { track } from '../utils/analytics';
import { Mail, MapPin, Award, Lock, Baby, Shield, MessageSquare, KeyRound, Pencil } from 'lucide-react';

// Self-contained change-password form. Accounts with hasPassword === false
// (Google-only, never set a real password) skip the current-password field —
// the server enforces that same rule, this just matches the UI to it.
function ChangePasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.changePassword({
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
      });
      setSuccess('Password updated successfully.');
      reset();
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-neutral-150 pt-4 mt-4">
      <button
        type="button"
        onClick={() => {
          setOpen(v => !v);
          reset();
          setSuccess('');
        }}
        className="flex items-center gap-2 text-sm font-bold text-tuco-cyan hover:text-tuco-cyan-hover"
      >
        <KeyRound className="w-4 h-4" />
        {hasPassword ? 'Change password' : 'Set a password'}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 max-w-sm">
          {hasPassword && (
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-tuco-cyan"
            />
          )}
          <input
            type="password"
            placeholder="New password (min. 6 characters)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-tuco-cyan"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-tuco-cyan"
          />
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          {success && <p className="text-xs font-bold text-emerald-600">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-tuco-cyan hover:bg-tuco-cyan-hover disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}
// Many usernames look like "Priya482" — that trailing number isn't
// decorative, it's collision-avoidance: Google sign-in derives a username
// from your Google display name, and since usernames must be unique
// site-wide, a random 3-4 digit suffix gets appended so two "Priya"s don't
// collide (server/index.ts's Google OAuth handler, not something the user
// chose). This section is what lets them change it to whatever they want.
function ChangeUsernameSection({
  currentUsername,
  onUpdated,
}: {
  currentUsername: string;
  onUpdated: (newUsername: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentUsername);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = value.trim();
    if (trimmed === currentUsername) {
      setOpen(false);
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 30) {
      setError('Username must be 3-30 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.updateMe({ username: trimmed });
      onUpdated(updated.username);
      setSuccess('Username updated!');
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-neutral-150 pt-4 mt-4">
      <button
        type="button"
        onClick={() => {
          setOpen(v => !v);
          setValue(currentUsername);
          setError('');
          setSuccess('');
        }}
        className="flex items-center gap-2 text-sm font-bold text-tuco-cyan hover:text-tuco-cyan-hover"
      >
        <Pencil className="w-4 h-4" />
        Change display name
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 max-w-sm">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            maxLength={30}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-tuco-cyan"
          />
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          {success && <p className="text-xs font-bold text-emerald-600">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-tuco-cyan hover:bg-tuco-cyan-hover disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            {submitting ? 'Saving…' : 'Save name'}
          </button>
        </form>
      )}
    </div>
  );
}
function ChangePhoneSection({ currentPhone }: { currentPhone?: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentPhone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = value.trim();
    if (trimmed === (currentPhone || '')) {
      setOpen(false);
      return;
    }
    if (trimmed && !/^[0-9+\-\s]{7,20}$/.test(trimmed)) {
      setError('Enter a valid phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await api.updateMe({ phone: trimmed });
      setSuccess('Phone number updated!');
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update phone number.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-neutral-150 pt-4 mt-4">
      <button
        type="button"
        onClick={() => {
          setOpen(v => !v);
          setValue(currentPhone || '');
          setError('');
          setSuccess('');
        }}
        className="flex items-center gap-2 text-sm font-bold text-tuco-cyan hover:text-tuco-cyan-hover"
      >
        <Pencil className="w-4 h-4" />
        {currentPhone ? 'Change phone number' : 'Add phone number'}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 max-w-sm">
          <input
            type="tel"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="e.g. 98765 43210"
            maxLength={20}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-tuco-cyan"
          />
          <p className="text-xs text-neutral-500">Lets your tuco Points sync with tucokids.com</p>
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          {success && <p className="text-xs font-bold text-emerald-600">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-tuco-cyan hover:bg-tuco-cyan-hover disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            {submitting ? 'Saving…' : 'Save phone number'}
          </button>
        </form>
      )}
    </div>
  );
}
interface MemberProfileProps {
  user: User;
  conversations?: Conversation[];
  isCurrentUser?: boolean;
  onUserUpdate?: (newUsername: string) => void;
  loginEmail?: string;
  onThreadOpen?: (id: number) => void;
}
export function MemberProfile({
  user,
  conversations = [],
  isCurrentUser = false,
  onUserUpdate,
  loginEmail,
  onThreadOpen,
}: MemberProfileProps) {
  const userThreads = conversations.filter(
    c => c.authorId === user.id || c.op.author === user.username
  );
  const userReplies = conversations.flatMap(c =>
    c.replies
      .filter(r => r.author === user.username)
      .map(r => ({ ...r, threadId: c.id, threadTitle: c.title }))
  );
  const trustLevelLabel =
    user.role === 'tuco_team'
      ? 'tuco Team'
      : user.role === 'moderator'
        ? 'Moderator'
        : user.role === 'trusted'
          ? 'Trusted Member'
          : 'Community Member';

  // Fires once per profile view, not per render, so re-renders (e.g. from
  // an unrelated state update while this profile is open) don't re-log it.
  useEffect(() => {
    if (!isCurrentUser) return;
    track('profile_viewed', { profile_username: user.username, viewer_relation: 'own' });
    user.badges
      .filter(b => b.discountCode)
      .forEach(b => track('discount_code_viewed', { discount_code: b.discountCode, user_id: user.id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentUser, user.id]);

  // null = not loaded / Nector unreachable — the stat cell is hidden rather
  // than ever showing a wrong "0 points". Only fetched for the profile's
  // own owner; there's no product need to show this for other members yet.
  const [nectorPoints, setNectorPoints] = useState<number | null>(null);
  useEffect(() => {
    if (!isCurrentUser) return;
    let cancelled = false;
    api.getNectorPoints()
      .then(({ points }) => { if (!cancelled) setNectorPoints(points); })
      .catch(() => { if (!cancelled) setNectorPoints(null); });
    return () => { cancelled = true; };
  }, [isCurrentUser, user.id]);

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
      {}
      {/* Trust-level pill used to sit beside the name in a flex row that
          "wrapped" via flex-wrap — but min-w-0 flex-1 on the name column
          lets it shrink indefinitely instead of ever triggering that wrap,
          so a long username just got squeezed and visually overlapped the
          pill instead. Putting the pill on its own line below removes the
          competition for space entirely, regardless of name length. */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-tuco-cyan/10 border-2 border-tuco-cyan flex items-center justify-center text-2xl font-bold text-tuco-cyan shrink-0">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-black text-lg text-neutral-800 break-words">
              {user.username}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
              {user.city && (
                <>
                  <MapPin className="w-3 h-3" />
                  <span>{user.city}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div
          className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
            user.role === 'tuco_team'
              ? 'bg-tuco-cyan/10 text-tuco-cyan border border-tuco-cyan'
              : user.role === 'moderator'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : user.role === 'trusted'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
          }`}
        >
          {trustLevelLabel}
        </div>
      </div>
      {}
      <div className="space-y-2.5 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
        <h3 className="font-display font-black text-xs text-neutral-500 uppercase tracking-wider mb-1">
          Account Details
        </h3>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="font-medium break-all">{loginEmail || user.email}</span>
        </div>
        {(user.hasPassword ?? true) && (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="font-mono font-medium tracking-widest">••••••••</span>
          </div>
        )}
        {user.childAge && (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Baby className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="font-medium">Child age: {user.childAge}</span>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm text-neutral-700">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="font-medium">Trust Score</span>
            </div>
            <span className="font-bold text-tuco-cyan">{Math.round(user.trustScore * 100)}/100</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(user.trustScore * 100)}%`,
                background: user.trustScore >= 0.85 ? '#10b981' : user.trustScore >= 0.5 ? '#06b6d4' : '#f59e0b',
              }}
            />
          </div>
          <p className="text-[10px] text-neutral-400">
            Based on upvotes, reply likes, engagement on your posts &amp; activity
          </p>
        </div>
        <p className="text-[10px] text-neutral-400 font-medium pt-1 border-t border-neutral-200">
          User ID: <span className="font-mono">{user.id}</span>
        </p>
        {isCurrentUser && onUserUpdate && (
          <ChangeUsernameSection currentUsername={user.username} onUpdated={onUserUpdate} />
        )}
        {isCurrentUser && <ChangePhoneSection currentPhone={user.phone} />}
        {isCurrentUser && <ChangePasswordSection hasPassword={user.hasPassword ?? true} />}
      </div>
      {}
      <div className={`grid gap-3 mb-6 ${nectorPoints !== null ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div className="bg-neutral-50 rounded-lg p-3 text-center">
          <div className="font-display font-black text-lg text-neutral-800">{user.postCount}</div>
          <div className="text-xs text-neutral-500 font-medium mt-1">Posts</div>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3 text-center">
          <div className="font-display font-black text-lg text-neutral-800">{user.replyCount}</div>
          <div className="text-xs text-neutral-500 font-medium mt-1">Replies</div>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3 text-center">
          <div className="font-display font-black text-lg text-tuco-cyan">{user.totalUpvotes}</div>
          <div className="text-xs text-neutral-500 font-medium mt-1">Upvotes</div>
        </div>
        {nectorPoints !== null && (
          <div className="bg-tuco-yellow/10 rounded-lg p-3 text-center">
            <div className="font-display font-black text-lg text-neutral-800">⭐ {nectorPoints}</div>
            <div className="text-xs text-neutral-500 font-medium mt-1">tuco Points</div>
          </div>
        )}
      </div>
      {}
      {user.badges.length > 0 && (
        <div className="border-t border-neutral-150 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-tuco-cyan" />
            <h3 className="font-display font-black text-sm text-neutral-800">Badges Earned</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {user.badges.map(badge => {
              const badgeInfo = BADGE_DISPLAY[badge.type];
              return (
                <div
                  key={badge.type}
                  className={`rounded-lg p-3 text-center border ${badgeInfo.color}`}
                >
                  <div className="text-2xl mb-1">{badgeInfo.icon}</div>
                  <div className="text-xs font-bold">{badgeInfo.name}</div>
                  {badge.discountCode && (
                    <div className="text-[10px] mt-2 opacity-75 font-mono font-bold">
                      {badge.discountCode}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {}
      <div className="border-t border-neutral-150 mt-6 pt-4 text-xs text-neutral-500">
        Member since{' '}
        <strong>
          {new Date(user.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
          })}
        </strong>
      </div>
      {}
      {userThreads.length > 0 && (
        <div className="border-t border-neutral-150 pt-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-tuco-orange" />
            <h3 className="font-display font-black text-sm text-neutral-800">Their Threads</h3>
          </div>
          <div className="space-y-3">
            {userThreads.slice(0, 10).map(thread => (
              <div
                key={thread.id}
                onClick={() => onThreadOpen?.(thread.id)}
                className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 hover:border-tuco-cyan hover:bg-white transition-all cursor-pointer"
              >
                <h4 className="font-display font-black text-xs text-neutral-800 line-clamp-2">
                  {thread.title}
                </h4>
                <p className="text-[10px] text-neutral-400 mt-1 font-medium">
                  {thread.replies.length} replies · {thread.votes} upvotes
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {}
      {userReplies.length > 0 && (
        <div className="border-t border-neutral-150 pt-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-tuco-cyan" />
            <h3 className="font-display font-black text-sm text-neutral-800">Their Replies</h3>
          </div>
          <div className="space-y-3">
            {userReplies.slice(0, 10).map((reply, idx) => (
              <div
                key={reply.id + '-' + idx}
                onClick={() => onThreadOpen?.(reply.threadId)}
                className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 hover:border-tuco-orange hover:bg-white transition-all cursor-pointer"
              >
                <p className="text-[10px] text-neutral-400 font-medium mb-1">
                  On: {reply.threadTitle}
                </p>
                <p className="font-sans text-xs text-neutral-650 line-clamp-3">{reply.text}</p>
                <p className="text-[10px] text-neutral-400 mt-1 font-medium">
                  {reply.likes} helpful
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {user.badges.length === 0 && userThreads.length === 0 && userReplies.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-2 border-t border-neutral-150">
          Post and engage to earn your first badge 🌱
        </p>
      )}
    </div>
  );
}
