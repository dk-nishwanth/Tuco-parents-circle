import React, { useState } from 'react';
import { Conversation } from '../types';
import { MODERATION_RULES } from '../utils/moderation';
import { getGreyAreaReminder } from '../utils/moderation';
import { Flag, Check, AlertCircle, CheckCircle, Shield } from 'lucide-react';
interface ModerationDashboardProps {
  pendingThreads: Conversation[];
  onApprove: (threadId: number) => void;
  onReject: (threadId: number, reason: string) => void;
}
export function ModerationDashboard({
  pendingThreads,
  onApprove,
  onReject,
}: ModerationDashboardProps) {
  const sortedPending = [...pendingThreads].sort(
    (a, b) => (a.reviewPriority ?? 50) - (b.reviewPriority ?? 50)
  );
  const REJECTION_REASONS = [
    'Medical prescription language',
    'Diagnosis statement',
    'Promotional content',
    'Personal information shared',
    'Personal attack',
    'Medical misinformation',
    'Duplicate post',
    'Other - needs human review',
  ];
  return (
    <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 border-b border-neutral-200">
        <div className="flex items-center gap-3 mb-3">
          <Flag className="w-5 h-5 text-orange-600" />
          <div>
            <h2 className="font-display font-black text-lg text-neutral-800">Moderation Queue</h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {sortedPending.length} threads awaiting review · Trusted members deprioritized
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-white/80 rounded-lg p-3 border border-orange-100 text-xs text-neutral-600">
          <Shield className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <p>
            <strong>Tuco Team rules:</strong> Cannot close threads or remove negative feedback.
            Hinglish/Hindi posts are never auto-removed for language.
          </p>
        </div>
      </div>
      <details className="px-6 py-3 border-b border-neutral-100 bg-neutral-50/50">
        <summary className="text-xs font-display font-black text-neutral-600 cursor-pointer">
          Grey area guidelines
        </summary>
        <ul className="mt-2 space-y-1 text-xs text-neutral-500 list-disc pl-4">
          {Object.entries(MODERATION_RULES.GREY_AREAS).map(([key, val]) => (
            <li key={key}>
              <strong>{key}:</strong> {val}
            </li>
          ))}
        </ul>
      </details>
      <div className="divide-y divide-neutral-150 max-h-[50vh] overflow-y-auto">
        {sortedPending.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-display font-black text-neutral-800 mb-1">All caught up!</h3>
            <p className="text-sm text-neutral-500">No pending threads to review.</p>
          </div>
        ) : (
          sortedPending.map(thread => {
            const reminder =
              thread.greyAreaFlags && thread.greyAreaFlags.length > 0
                ? getGreyAreaReminder(thread.greyAreaFlags)
                : undefined;
            const isTrusted = (thread.reviewPriority ?? 50) >= 65;
            return (
              <div key={thread.id} className="p-5 hover:bg-neutral-50 transition-colors">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                      {thread.category}
                    </span>
                    {isTrusted && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        Trusted — lower priority
                      </span>
                    )}
                    {thread.greyAreaFlags?.map(flag => (
                      <span
                        key={flag}
                        className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  <h4 className="font-display font-black text-neutral-800 mb-2">{thread.title}</h4>
                  <p className="text-sm text-neutral-600 line-clamp-2 mb-3">{thread.op.text}</p>
                  {reminder && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 mb-3 font-medium">
                      💛 {reminder}
                    </div>
                  )}
                  {thread.greyAreaFlags?.includes('hinglish') && (
                    <p className="text-[10px] text-emerald-700 font-bold mb-2">
                      ✓ Hinglish/regional language — do not reject for language alone
                    </p>
                  )}
                  {thread.greyAreaFlags?.includes('negative_tuco_review') && (
                    <p className="text-[10px] text-red-600 font-bold mb-2">
                      ⚠ Negative Tuco review — allow; cannot remove
                    </p>
                  )}
                  <div className="text-xs text-neutral-500 space-y-1">
                    <div>
                      <strong>Author:</strong> {thread.op.author} ({thread.op.city})
                    </div>
                    <div>
                      <strong>Posted:</strong> {thread.op.time}
                    </div>
                    <div>
                      <strong>Queue priority:</strong> {thread.reviewPriority ?? 50}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-3 border-t border-neutral-150">
                  <button
                    onClick={() => onApprove(thread.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-display font-bold text-xs rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <select
                    onChange={e => {
                      if (e.target.value) onReject(thread.id, e.target.value);
                    }}
                    className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-display font-bold text-xs rounded-lg border border-red-200 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="">Reject...</option>
                    {REJECTION_REASONS.map(reason => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
