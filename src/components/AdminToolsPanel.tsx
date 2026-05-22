import { useState } from 'react';
import { LAUNCH_ANNOUNCEMENT_TEMPLATES } from '../data/announcementTemplates';
import {
  getEmailLog,
  getLastWeeklyEmailSent,
  sendWeeklyEngagementToAllUsers,
} from '../utils/emailService';
import { mergeSeedWithExisting } from '../utils/seedContent';
import { Conversation, User } from '../types';
import { Copy, Database, Mail, Megaphone, Pin, X } from 'lucide-react';
interface AdminToolsPanelProps {
  conversations: Conversation[];
  users: Record<string, User>;
  onSeedContent: (threads: Conversation[]) => void;
  onPinThread: (threadId: number, pinned: boolean) => void;
  onFeatureThread: (threadId: number, featured: boolean) => void;
  onClose: () => void;
}
export function AdminToolsPanel({
  conversations,
  users,
  onSeedContent,
  onPinThread,
  onFeatureThread,
  onClose,
}: AdminToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<'seed' | 'email' | 'launch' | 'pin'>('seed');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const emailLog = getEmailLog();
  const lastWeekly = getLastWeeklyEmailSent();
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const approvedThreads = conversations.filter(
    c => !c.moderationStatus || c.moderationStatus === 'approved'
  );
  return (
    <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden max-h-[85vh] flex flex-col">
      <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
        <h2 className="font-display font-black text-lg text-neutral-800">Admin & Launch Tools</h2>
        <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1 px-4 pt-3 border-b border-neutral-100 shrink-0 overflow-x-auto">
        {[
          { key: 'seed' as const, label: 'Seed', icon: Database },
          { key: 'email' as const, label: 'Weekly Email', icon: Mail },
          { key: 'launch' as const, label: 'Launch', icon: Megaphone },
          { key: 'pin' as const, label: 'Pin/Feature', icon: Pin },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-display font-black rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === key
                ? 'border-tuco-cyan text-tuco-cyan'
                : 'border-transparent text-neutral-500'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="p-5 overflow-y-auto flex-1">
        {activeTab === 'seed' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Pre-populate the forum with <strong>75–100 threads</strong> (Section 13). Current:{' '}
              <strong>{conversations.length}</strong> threads.
            </p>
            <button
              onClick={() => onSeedContent(mergeSeedWithExisting(conversations, 100))}
              className="w-full py-3 bg-tuco-cyan text-white font-display font-black text-sm rounded-xl hover:bg-tuco-cyan-hover transition-all"
            >
              Seed to 100 Threads
            </button>
            <p className="text-xs text-neutral-400">
              Generates realistic Indian parenting topics across all categories with replies.
            </p>
          </div>
        )}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              <strong>Weekly Engagement Emailer</strong> (Section 16) — sends digest to all users
              with notifications enabled.
            </p>
            {lastWeekly && (
              <p className="text-xs text-neutral-500">
                Last sent: {new Date(lastWeekly).toLocaleString()}
              </p>
            )}
            <button
              onClick={() => {
                const sent = sendWeeklyEngagementToAllUsers(users, conversations);
                alert(
                  `📬 Weekly digest sent to ${sent.length} users (simulated). Check email log.`
                );
              }}
              className="w-full py-3 bg-emerald-600 text-white font-display font-black text-sm rounded-xl hover:bg-emerald-700 transition-all"
            >
              Send Weekly Digest Now
            </button>
            <div className="border border-neutral-200 rounded-xl divide-y max-h-40 overflow-y-auto">
              {emailLog.length === 0 ? (
                <p className="p-3 text-xs text-neutral-400">No emails sent yet.</p>
              ) : (
                emailLog.slice(0, 8).map(e => (
                  <div key={e.id} className="p-2 text-xs">
                    <span className="font-bold text-neutral-700">{e.type}</span> → {e.to}
                    <p className="text-neutral-400 truncate">{e.subject}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {activeTab === 'launch' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Email & WhatsApp announcement templates for launch.
            </p>
            {LAUNCH_ANNOUNCEMENT_TEMPLATES.map(t => (
              <div key={t.id} className="border border-neutral-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-tuco-orange">{t.channel}</span>
                  <button
                    onClick={() =>
                      handleCopy(t.subject ? `${t.subject}\n\n${t.body}` : t.body, t.id)
                    }
                    className="flex items-center gap-1 text-xs font-bold text-tuco-cyan hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedId === t.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <h4 className="font-display font-black text-sm text-neutral-800 mb-1">{t.title}</h4>
                <pre className="text-[10px] text-neutral-500 whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-y-auto">
                  {t.body}
                </pre>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'pin' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-sm text-neutral-600 mb-3">
              Pin threads for safety alerts. Feature for Circle Mom of the Month (Instagram).
            </p>
            {approvedThreads.slice(0, 15).map(t => (
              <div
                key={t.id}
                className="flex items-center gap-2 py-2 border-b border-neutral-100 text-xs"
              >
                <span className="flex-1 truncate font-bold text-neutral-700">{t.title}</span>
                <button
                  onClick={() => onPinThread(t.id, !t.isPinned)}
                  className={`px-2 py-1 rounded font-black ${
                    t.isPinned ? 'bg-tuco-orange text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  📌
                </button>
                <button
                  onClick={() => onFeatureThread(t.id, !t.isFeatured)}
                  className={`px-2 py-1 rounded font-black ${
                    t.isFeatured
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  ⭐
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
