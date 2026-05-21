import { User } from '../types';
import { BADGE_DISPLAY } from '../utils/badgeSystem';
import { Mail, MapPin, Award, Lock, Baby, Shield } from 'lucide-react';

interface MemberProfileProps {
  user: User;
  isCurrentUser?: boolean;
  loginEmail?: string;
  loginPassword?: string;
}

export function MemberProfile({
  user,
  isCurrentUser = false,
  loginEmail,
  loginPassword,
}: MemberProfileProps) {
  const trustLevelLabel =
    user.role === 'tuco_team'
      ? 'Tuco Team'
      : user.role === 'moderator'
        ? 'Moderator'
        : user.role === 'trusted'
          ? 'Trusted Member'
          : 'Community Member';

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
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

        {/* Trust Level Badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 ${
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

      {/* Account details */}
      <div className="space-y-2.5 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
        <h3 className="font-display font-black text-xs text-neutral-500 uppercase tracking-wider mb-1">
          Account Details
        </h3>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="font-medium break-all">{loginEmail || user.email}</span>
        </div>
        {loginPassword !== undefined && (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="font-mono font-medium">{loginPassword || '—'}</span>
          </div>
        )}
        {user.childAge && (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Baby className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="font-medium">Child age: {user.childAge}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Shield className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="font-medium">
            Trust score: {Math.round(user.trustScore * 100)}%
          </span>
        </div>
        <p className="text-[10px] text-neutral-400 font-medium pt-1 border-t border-neutral-200">
          User ID: <span className="font-mono">{user.id}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-neutral-50 rounded-lg p-3 text-center">
          <div className="font-display font-black text-lg text-neutral-800">
            {user.postCount}
          </div>
          <div className="text-xs text-neutral-500 font-medium mt-1">Posts</div>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3 text-center">
          <div className="font-display font-black text-lg text-neutral-800">
            {user.replyCount}
          </div>
          <div className="text-xs text-neutral-500 font-medium mt-1">Replies</div>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3 text-center">
          <div className="font-display font-black text-lg text-tuco-cyan">
            {user.totalUpvotes}
          </div>
          <div className="text-xs text-neutral-500 font-medium mt-1">Upvotes</div>
        </div>
      </div>

      {/* Badges Section */}
      {user.badges.length > 0 && (
        <div className="border-t border-neutral-150 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-tuco-cyan" />
            <h3 className="font-display font-black text-sm text-neutral-800">
              Badges Earned
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {user.badges.map((badge) => {
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

      {/* Member Since */}
      <div className="border-t border-neutral-150 mt-6 pt-4 text-xs text-neutral-500">
        Member since{' '}
        <strong>
          {new Date(user.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
          })}
        </strong>
      </div>

      {user.badges.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-2 border-t border-neutral-150">
          Post and engage to earn your first badge 🌱
        </p>
      )}
    </div>
  );
}
