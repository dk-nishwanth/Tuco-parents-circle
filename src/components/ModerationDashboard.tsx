import React, { useState, useEffect, useMemo } from 'react';
import { Conversation, User } from '../types';
import { MODERATION_RULES } from '../utils/moderation';
import { getGreyAreaReminder } from '../utils/moderation';
import { Flag, Check, AlertCircle, CheckCircle, Shield, Clock, User as UserIcon } from 'lucide-react';
import { api } from '../utils/api';

interface ModerationDashboardProps {
  pendingThreads: Conversation[];
  users: Record<string, User>;
  onApprove: (threadId: number) => void;
  onReject: (threadId: number, reason: string) => void;
}

interface ModerationLogEntry {
  id: string;
  moderatorId: string;
  targetType: string;
  targetId: number;
  action: string;
  reason: string | null;
  timestamp: string;
}

export function ModerationDashboard({
  pendingThreads,
  users,
  onApprove,
  onReject,
}: ModerationDashboardProps) {
  const [moderationLogs, setModerationLogs] = useState<ModerationLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'logs'>('queue');
  const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null);

  const sortedPending = useMemo(() => {
    return [...pendingThreads].sort((a, b) => (b.reviewPriority ?? 50) - (a.reviewPriority ?? 50));
  }, [pendingThreads]);

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

  useEffect(() => {
    async function fetchLogs() {
      try {
        const logs = await api.getModerationLogs();
        setModerationLogs(logs);
      } catch (err) {
        console.error('Failed to fetch moderation logs:', err);
      }
    }
    fetchLogs();
  }, []);

  const isCoolingPeriodPost = (thread: Conversation) => {
    return thread.reviewPriority === 100;
  };

  const getAuthorInfo = (authorId?: string) => {
    if (!authorId) return null;
    return users[authorId];
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 border-b border-neutral-200">
        <div className="flex items-center gap-3 mb-3">
          <Flag className="w-5 h-5 text-orange-600" />
          <div>
            <h2 className="font-display font-black text-lg text-neutral-800">Moderation Dashboard</h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {sortedPending.length} threads awaiting review · Trusted members deprioritized
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-white/80 rounded-lg p-3 border border-orange-100 text-xs text-neutral-600">
          <Shield className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <p>
            <strong>tuco Team rules:</strong> Cannot close threads or remove negative feedback.
            English/Hindi posts are never auto-removed for language alone.
          </p>
        </div>
        {/* Tabs */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'queue' ? 'bg-orange-100 text-orange-700' : 'bg-transparent text-neutral-600 hover:bg-orange-50'}`}
          >
            Moderation Queue
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-orange-100 text-orange-700' : 'bg-transparent text-neutral-600 hover:bg-orange-50'}`}
          >
            Moderation Logs ({moderationLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <>
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
              sortedPending.map((thread) => {
                const reminder =
                  thread.greyAreaFlags && thread.greyAreaFlags.length > 0
                    ? getGreyAreaReminder(thread.greyAreaFlags)
                    : undefined;
                const isTrusted = (thread.reviewPriority ?? 50) >= 65 && !isCoolingPeriodPost(thread);
                const author = getAuthorInfo(thread.authorId);
                const accountAge = author ? (Date.now() - new Date(author.createdAt).getTime()) / (1000 * 60 * 60 * 24) : null;

                return (
                  <div key={thread.id} className={`p-5 hover:bg-neutral-50 transition-colors ${isCoolingPeriodPost(thread) ? 'bg-orange-50/30' : ''}`}>
                    <div className="mb-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                          {thread.category}
                        </span>
                        {isCoolingPeriodPost(thread) && (
                          <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            New Member - Cooling Period
                          </span>
                        )}
                        {isTrusted && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            Trusted — lower priority
                          </span>
                        )}
                        {thread.greyAreaFlags?.map((flag) => (
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
                      <div className={`text-sm text-neutral-600 mb-3 ${expandedThreadId === thread.id ? '' : 'line-clamp-2'}`}>
                        {thread.op.text}
                      </div>
                      <button
                        onClick={() => setExpandedThreadId(expandedThreadId === thread.id ? null : thread.id)}
                        className="text-xs text-orange-600 font-bold hover:text-orange-800 mb-3"
                      >
                        {expandedThreadId === thread.id ? 'Show less' : 'Show more'}
                      </button>
                      {reminder && (
                        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 mb-3 font-medium">
                          💛 {reminder}
                        </div>
                      )}
                      {thread.greyAreaFlags?.includes('english') && (
                        <p className="text-[10px] text-emerald-700 font-bold mb-2">
                          ✓ English/Hindi/regional language — do not reject for language alone
                        </p>
                      )}
                      {thread.greyAreaFlags?.includes('negative_tuco_review') && (
                        <p className="text-[10px] text-red-600 font-bold mb-2">
                          ⚠️ Negative tuco review — allow; cannot remove
                        </p>
                      )}
                      <div className="text-xs text-neutral-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3 h-3" />
                          <strong>Author:</strong> {thread.op.author} ({thread.op.city})
                          {accountAge !== null && accountAge < 1 && (
                            <span className="text-orange-600 font-medium">
                              (Account created {Math.round(accountAge * 24)} hours ago)
                            </span>
                          )}
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
                        onChange={(e) => {
                          if (e.target.value) onReject(thread.id, e.target.value);
                        }}
                        className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-display font-bold text-xs rounded-lg border border-red-200 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="">Reject...</option>
                        {REJECTION_REASONS.map((reason) => (
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
        </>
      ) : (
        <div className="divide-y divide-neutral-150 max-h-[50vh] overflow-y-auto">
          {moderationLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="font-display font-black text-neutral-800 mb-1">No logs yet</h3>
              <p className="text-sm text-neutral-500">Moderation actions will appear here.</p>
            </div>
          ) : (
            moderationLogs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-neutral-50 transition-colors">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    log.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    log.action === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {log.action}
                  </div>
                  <div className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                    {log.targetType} #{log.targetId}
                  </div>
                  {log.moderatorId && (
                    <div className="text-xs font-medium text-neutral-500">
                      By: {log.moderatorId === 'SYSTEM' ? 'System' : log.moderatorId}
                    </div>
                  )}
                </div>
                {log.reason && (
                  <p className="text-sm text-neutral-600 mb-2">{log.reason}</p>
                )}
                <p className="text-xs text-neutral-400">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}