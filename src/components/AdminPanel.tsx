import { useState, useEffect, useCallback } from 'react';
import {
  Users, MessageSquare, MessageCircle, BarChart3, Shield, Trash2,
  CheckCircle, XCircle, Pin, Star, RefreshCw, LogOut, Search,
  ChevronDown, ChevronUp, AlertTriangle, Clock, Eye, ThumbsUp,
  Send, Flag, Coins, Wrench, Activity, MailWarning, Play, Download, ExternalLink,
} from 'lucide-react';
import { User } from '../types';
import { api, tokenStore } from '../utils/api';
import { threadShareUrl } from '../utils/slug';
import { getAvatarColor, getInitials } from '../utils/helpers';
import { parseYouTubeId, stripYouTubeUrl, TucoVideoCard } from './TucoVideo';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  users: number; conversations: number; replies: number;
  pending: number; votes: number; notifications: number; recentUsers: number;
  weeklyLoginEvents: number; weeklyActiveUsers: number;
}
interface AdminUser {
  id: string; username: string; email: string; city: string;
  role: string; createdAt: string; isVerified: boolean;
  postCount: number; replyCount: number; totalUpvotes: number;
  trustScore: number; childAge?: string;
  emailBounced?: boolean; emailBounceReason?: string | null;
  _count: { conversations: number; replies: number; votes: number };
}
interface AdminConversation {
  id: number; title: string; category: string;
  moderationStatus: string; isPinned: boolean; isFeatured: boolean;
  isWeeklyHighlight?: boolean;
  votes: number; views: number; createdAt: string;
  opAuthor: string; replyCount: number; voteCount: number;
  greyAreaFlags: string[]; reviewPriority?: number;
}
interface AdminReply {
  id: number; author: string; authorId: string; text: string;
  likes: number; createdAt: string; moderationStatus: string;
  conversationId: number; conversationTitle?: string;
}
interface ModerationLog {
  id: string; moderatorId: string; targetType: string;
  targetId: number; action: string; reason?: string; timestamp: string;
}
interface NeedsReplyThread {
  id: number; title: string; category: string; opAuthor: string;
  createdAt: string; preview: string;
}
interface Report {
  id: string; targetType: string; targetId: number; reason?: string;
  timestamp: string; reporterUsername: string; contentPreview: string;
  contentAuthorId: string | null; contentAuthorName: string;
  timesThisContentWasFlagged: number;
  threadId: number | null; threadTitle: string | null;
}
interface NectorSearchResult { id: string; username: string; email: string; phone?: string | null; }
interface NectorAward {
  id: string; userId: string; sourceType: string; sourceId: string;
  triggerId?: string; createdAt: string;
}
interface NectorUserDetail {
  user: NectorSearchResult; balance: number | null; phoneOnFile: boolean; awards: NectorAward[];
}
interface AdminJob {
  name: string; lastRun: string | null; lastOutput: string;
  sendsRealEmail: boolean; supportsDryRun: boolean;
}
interface ActivityItem {
  type: 'signup' | 'post' | 'reply'; at: string; summary: string; meta: any;
}
interface HealthCheck { ok: boolean; detail?: string; }
interface HealthResponse {
  checks: Record<string, HealthCheck>;
  jobStatuses: { name: string; lastRun: string | null; staleDays: number | null }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    flagged: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || 'bg-neutral-100 text-neutral-500'}`}>
      {status}
    </span>
  );
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    tuco_team: 'bg-purple-100 text-purple-700',
    moderator: 'bg-blue-100 text-blue-700',
    trusted: 'bg-emerald-100 text-emerald-700',
    member: 'bg-neutral-100 text-neutral-500',
    guest: 'bg-neutral-50 text-neutral-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[role] || 'bg-neutral-100 text-neutral-500'}`}>
      {role.replace('_', ' ')}
    </span>
  );
}

// ── Admin API calls ──────────────────────────────────────────────────────────

async function adminFetch(path: string, opts?: RequestInit) {
  const token = tokenStore.get();
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// File downloads need auth headers too (a plain <a href> can't carry the
// bearer token), so fetch as a blob and trigger the save manually instead.
async function adminDownload(path: string, filename: string) {
  const token = tokenStore.get();
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Sub-panels ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <div className={`text-2xl font-black font-display ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs font-bold text-neutral-600 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function DashboardTab({ stats, error, onRetry }: { stats: Stats | null; error?: string; onRetry?: () => void }) {
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-bold text-red-600 mb-1">Couldn't load dashboard stats</p>
        <p className="text-xs text-neutral-400 mb-3">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs font-bold text-tuco-cyan hover:underline">Try again</button>
        )}
      </div>
    );
  }
  if (!stats) return <div className="text-center py-12 text-neutral-400">Loading stats…</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={stats.users} sub={`+${stats.recentUsers} new signups this week`} color="text-tuco-cyan" />
        <StatCard label="Conversations" value={stats.conversations} color="text-emerald-600" />
        <StatCard label="Replies" value={stats.replies} color="text-blue-600" />
        <StatCard label="Pending Review" value={stats.pending} color="text-amber-600" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Deliberately separate from "new signups" above — a returning
            user logging in isn't a signup, and a new signup's first login
            is only one data point among many, so conflating the two under
            one "+X this week" number was misleading. */}
        <StatCard label="Logins This Week" value={stats.weeklyLoginEvents} sub={`${stats.weeklyActiveUsers} distinct users`} color="text-tuco-cyan" />
        <StatCard label="Total Votes" value={stats.votes} color="text-purple-600" />
        <StatCard label="Notifications Sent" value={stats.notifications} color="text-neutral-600" />
      </div>
      <div>
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">All users</h3>
        <UsersTab />
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'trustScore' | 'postCount'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [updating, setUpdating] = useState<string | null>(null);
  const [bouncedOnly, setBouncedOnly] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await adminDownload('/api/admin/export/users.csv', `tuco-users-export-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await adminFetch('/api/admin/users')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await adminFetch(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x));
    } finally { setUpdating(null); }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setUpdating(userId);
    try {
      await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(u => u.filter(x => x.id !== userId));
    } finally { setUpdating(null); }
  };

  const toggle = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const bouncedCount = users.filter(u => u.emailBounced).length;

  const filtered = users
    .filter(u => !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .filter(u => !bouncedOnly || u.emailBounced)
    .sort((a, b) => {
      const v = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'trustScore') return (a.trustScore - b.trustScore) * v;
      if (sortBy === 'postCount') return (a.postCount - b.postCount) * v;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * v;
    });

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-tuco-cyan" />
        </div>
        <button onClick={() => setBouncedOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold transition-colors whitespace-nowrap ${
            bouncedOnly ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}>
          <MailWarning className="w-3.5 h-3.5" /> Bounced ({bouncedCount})
        </button>
        <button onClick={exportCsv} disabled={exporting}
          title="Export username, email, phone, posts, replies, Nector award count, bounce status, signup + last login date"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 whitespace-nowrap">
          <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
        <button onClick={load} className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50">
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {loading ? <div className="text-center py-8 text-neutral-400">Loading users…</div> : (
        <>
        {/* Card list below md — a 5-column table forces horizontal scroll
            on a phone; a stacked card per user reads far better there.
            Same data, same actions, just a different layout. */}
        <div className="md:hidden space-y-2">
          {filtered.map(u => (
            <div key={u.id} className={`border border-neutral-200 rounded-xl p-3 ${updating === u.id ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-bold text-neutral-800 text-sm">{u.username}</div>
                  <div className="text-neutral-400 text-[11px] truncate">{u.email}</div>
                  <div className="text-neutral-400 text-[11px]">{u.city}{u.childAge ? ` · child: ${u.childAge}` : ''}</div>
                  {u.emailBounced && (
                    <span title={u.emailBounceReason || 'Bounced'} className="inline-flex items-center gap-0.5 text-red-500 bg-red-50 px-1 rounded font-bold text-[10px] mt-1">
                      <MailWarning className="w-2.5 h-2.5" /> bounced
                    </span>
                  )}
                </div>
                <button onClick={() => deleteUser(u.id, u.username)} disabled={updating === u.id}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-neutral-600 mb-2">
                <span>{u.postCount} posts · {u.replyCount} replies</span>
                <span className="text-neutral-400">{ago(u.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={u.role}
                  disabled={updating === u.id}
                  onChange={e => changeRole(u.id, e.target.value)}
                  className="text-xs border border-neutral-200 rounded-lg px-2 py-1 bg-white"
                >
                  {['member', 'trusted', 'moderator', 'tuco_team', 'guest'].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5">
                  <div className="w-12 bg-neutral-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-tuco-cyan" style={{ width: `${Math.round(u.trustScore * 100)}%` }} />
                  </div>
                  <span className="text-xs text-neutral-600">{Math.round(u.trustScore * 100)}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="text-[10px] text-neutral-400 text-center py-1">{filtered.length} of {users.length} users</div>
        </div>
        <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">User</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Role</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600 cursor-pointer hover:text-tuco-cyan" onClick={() => toggle('postCount')}>
                  <div className="flex items-center gap-1">Posts <SortIcon col="postCount" /></div>
                </th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600 cursor-pointer hover:text-tuco-cyan" onClick={() => toggle('trustScore')}>
                  <div className="flex items-center gap-1">Trust <SortIcon col="trustScore" /></div>
                </th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600 cursor-pointer hover:text-tuco-cyan" onClick={() => toggle('createdAt')}>
                  <div className="flex items-center gap-1">Joined <SortIcon col="createdAt" /></div>
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-neutral-800">{u.username}</div>
                    <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                      {u.email}
                      {u.emailBounced && (
                        <span title={u.emailBounceReason || 'Bounced'} className="flex items-center gap-0.5 text-red-500 bg-red-50 px-1 rounded font-bold">
                          <MailWarning className="w-2.5 h-2.5" /> bounced
                        </span>
                      )}
                    </div>
                    <div className="text-neutral-400 text-[10px]">{u.city}{u.childAge ? ` · child: ${u.childAge}` : ''}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={u.role}
                      disabled={updating === u.id}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="text-[10px] border border-neutral-200 rounded px-1 py-0.5 bg-white"
                    >
                      {['member', 'trusted', 'moderator', 'tuco_team', 'guest'].map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">
                    <div>{u.postCount} posts</div>
                    <div className="text-neutral-400">{u.replyCount} replies</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-neutral-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-tuco-cyan" style={{ width: `${Math.round(u.trustScore * 100)}%` }} />
                      </div>
                      <span className="text-neutral-600">{Math.round(u.trustScore * 100)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-400">{ago(u.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => deleteUser(u.id, u.username)}
                      disabled={updating === u.id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 text-[10px] text-neutral-400">
            {filtered.length} of {users.length} users
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function ConversationsTab() {
  const [convs, setConvs] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setConvs(await adminFetch('/api/admin/conversations')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const moderate = async (id: number, moderationStatus: string) => {
    setUpdating(id);
    try {
      await api.updateConversation(id, { moderationStatus });
      setConvs(c => c.map(x => x.id === id ? { ...x, moderationStatus } : x));
    } finally { setUpdating(null); }
  };

  const togglePin = async (id: number, isPinned: boolean) => {
    setUpdating(id);
    try {
      await api.updateConversation(id, { isPinned });
      setConvs(c => c.map(x => x.id === id ? { ...x, isPinned } : x));
    } finally { setUpdating(null); }
  };

  // Manual override for the Monday cron pick — only one thread should carry
  // this at a time, so setting it here also clears it from whichever thread
  // currently has it (mirrors the rotation script's own invariant).
  const setWeeklyHighlight = async (id: number) => {
    setUpdating(id);
    try {
      const previous = convs.find(c => c.isWeeklyHighlight && c.id !== id);
      await api.updateConversation(id, { isWeeklyHighlight: true });
      if (previous) await api.updateConversation(previous.id, { isWeeklyHighlight: false });
      setConvs(c => c.map(x => ({ ...x, isWeeklyHighlight: x.id === id })));
    } finally { setUpdating(null); }
  };

  const deleteConv = async (id: number, title: string) => {
    if (!confirm(`Delete "${title.slice(0, 50)}"? This cannot be undone.`)) return;
    setUpdating(id);
    try {
      await api.deleteConversation(id);
      setConvs(c => c.filter(x => x.id !== id));
    } finally { setUpdating(null); }
  };

  const filtered = convs
    .filter(c => statusFilter === 'all' || c.moderationStatus === statusFilter)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.opAuthor.toLowerCase().includes(search.toLowerCase()));

  const counts = { all: convs.length, pending: 0, approved: 0, rejected: 0, flagged: 0 };
  convs.forEach(c => { if (c.moderationStatus in counts) (counts as any)[c.moderationStatus]++; });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title or author…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-tuco-cyan" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected', 'flagged'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-colors ${
                statusFilter === s ? 'bg-tuco-cyan text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}>
              {s} {s !== 'all' && `(${counts[s]})`}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50">
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {loading ? <div className="text-center py-8 text-neutral-400">Loading conversations…</div> : (
        <>
        <div className="md:hidden space-y-2">
          {filtered.map(c => (
            <div key={c.id} className={`border border-neutral-200 rounded-xl p-3 ${updating === c.id ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <a href={threadShareUrl(c.id, c.title)} target="_blank" rel="noopener noreferrer"
                  className="font-bold text-neutral-800 text-sm flex items-center gap-1 hover:text-tuco-cyan min-w-0">
                  <span className="truncate min-w-0">{c.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-neutral-400" />
                </a>
                {statusBadge(c.moderationStatus)}
              </div>
              <div className="text-neutral-400 text-[11px] flex gap-2 flex-wrap mb-1.5">
                <span>by {c.opAuthor}</span>
                <span className="capitalize bg-neutral-100 px-1.5 rounded">{c.category}</span>
                {c.isPinned && <span className="text-orange-500">📌 pinned</span>}
                {c.isFeatured && <span className="text-purple-500">⭐ featured</span>}
              </div>
              {c.greyAreaFlags?.length > 0 && (
                <div className="flex gap-1 mb-1.5 flex-wrap">
                  {c.greyAreaFlags.map(f => (
                    <span key={f} className="bg-amber-50 text-amber-600 text-[9px] px-1 rounded">{f}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{c.votes}</span>
                  <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{c.views}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{c.replyCount}</span>
                  <span className="text-neutral-400">· {ago(c.createdAt)}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {c.moderationStatus !== 'approved' && (
                    <button onClick={() => moderate(c.id, 'approved')} title="Approve"
                      className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {c.moderationStatus !== 'rejected' && (
                    <button onClick={() => moderate(c.id, 'rejected')} title="Reject"
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => togglePin(c.id, !c.isPinned)} title={c.isPinned ? 'Unpin' : 'Pin'}
                    className={`p-1.5 rounded-lg ${c.isPinned ? 'text-orange-500 bg-orange-50' : 'text-neutral-400 hover:bg-neutral-100'}`}>
                    <Pin className="w-4 h-4" />
                  </button>
                  <button onClick={() => setWeeklyHighlight(c.id)}
                    title={c.isWeeklyHighlight ? 'Current Thread of the Week' : 'Make Thread of the Week'}
                    className={`p-1.5 rounded-lg ${c.isWeeklyHighlight ? 'text-purple-500 bg-purple-50' : 'text-neutral-400 hover:bg-neutral-100'}`}>
                    <Star className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteConv(c.id, c.title)} title="Delete"
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="text-[10px] text-neutral-400 text-center py-1">{filtered.length} of {convs.length} conversations</div>
        </div>
        <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Thread</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Status</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Stats</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Date</th>
                <th className="px-3 py-2.5 font-bold text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map(c => (
                <tr key={c.id} className={`hover:bg-neutral-50 ${updating === c.id ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5 max-w-[280px]">
                    <a href={threadShareUrl(c.id, c.title)} target="_blank" rel="noopener noreferrer"
                      className="font-bold text-neutral-800 truncate flex items-center gap-1 hover:text-tuco-cyan">
                      {c.title} <ExternalLink className="w-3 h-3 shrink-0 text-neutral-400" />
                    </a>
                    <div className="text-neutral-400 text-[10px] flex gap-2 mt-0.5">
                      <span>by {c.opAuthor}</span>
                      <span className="capitalize bg-neutral-100 px-1.5 rounded">{c.category}</span>
                      {c.isPinned && <span className="text-orange-500">📌 pinned</span>}
                      {c.isFeatured && <span className="text-purple-500">⭐ featured</span>}
                    </div>
                    {c.greyAreaFlags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {c.greyAreaFlags.map(f => (
                          <span key={f} className="bg-amber-50 text-amber-600 text-[9px] px-1 rounded">{f}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{statusBadge(c.moderationStatus)}</td>
                  <td className="px-3 py-2.5 text-neutral-600">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{c.votes}</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{c.views}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{c.replyCount}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-400">{ago(c.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {c.moderationStatus !== 'approved' && (
                        <button onClick={() => moderate(c.id, 'approved')} title="Approve"
                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {c.moderationStatus !== 'rejected' && (
                        <button onClick={() => moderate(c.id, 'rejected')} title="Reject"
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => togglePin(c.id, !c.isPinned)} title={c.isPinned ? 'Unpin' : 'Pin'}
                        className={`p-1.5 rounded-lg ${c.isPinned ? 'text-orange-500 bg-orange-50' : 'text-neutral-400 hover:bg-neutral-100'}`}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setWeeklyHighlight(c.id)}
                        title={c.isWeeklyHighlight ? 'Current Thread of the Week' : 'Make Thread of the Week'}
                        className={`p-1.5 rounded-lg ${c.isWeeklyHighlight ? 'text-purple-500 bg-purple-50' : 'text-neutral-400 hover:bg-neutral-100'}`}>
                        <Star className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteConv(c.id, c.title)} title="Delete"
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 text-[10px] text-neutral-400">
            {filtered.length} of {convs.length} conversations
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function RepliesTab() {
  const [replies, setReplies] = useState<AdminReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReplies(await adminFetch('/api/admin/replies')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteReply = async (id: number) => {
    if (!confirm('Delete this reply?')) return;
    setDeleting(id);
    try {
      await adminFetch(`/api/admin/replies/${id}`, { method: 'DELETE' });
      setReplies(r => r.filter(x => x.id !== id));
    } finally { setDeleting(null); }
  };

  const filtered = replies.filter(r =>
    !search || r.author.toLowerCase().includes(search.toLowerCase()) ||
    r.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by author or content…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-tuco-cyan" />
        </div>
        <button onClick={load} className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50">
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {loading ? <div className="text-center py-8 text-neutral-400">Loading replies…</div> : (
        <>
        <div className="md:hidden space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="border border-neutral-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-neutral-700 text-sm">{r.author}</span>
                {statusBadge(r.moderationStatus)}
              </div>
              <p className="text-neutral-600 text-sm line-clamp-2 mb-1.5">{r.text}</p>
              <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                <a href={threadShareUrl(r.conversationId, r.conversationTitle)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-tuco-cyan min-w-0">
                  <span className="truncate min-w-0">{r.conversationTitle || `Thread #${r.conversationId}`}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <span className="flex items-center gap-1 shrink-0"><ThumbsUp className="w-2.5 h-2.5" />{r.likes}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-neutral-400">{ago(r.createdAt)}</span>
                <button onClick={() => deleteReply(r.id)} disabled={deleting === r.id}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="text-[10px] text-neutral-400 text-center py-1">{filtered.length} of {replies.length} replies (latest 500)</div>
        </div>
        <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Author</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Content</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Thread</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Status</th>
                <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Date</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2.5 font-bold text-neutral-700 whitespace-nowrap">{r.author}</td>
                  <td className="px-3 py-2.5 max-w-[260px]">
                    <p className="text-neutral-600 line-clamp-2">{r.text}</p>
                    <span className="text-neutral-400 text-[10px] flex items-center gap-1 mt-0.5">
                      <ThumbsUp className="w-2.5 h-2.5" />{r.likes} likes
                    </span>
                  </td>
                  <td className="px-3 py-2.5 max-w-[160px]">
                    <p className="text-neutral-500 truncate">{r.conversationTitle || `#${r.conversationId}`}</p>
                  </td>
                  <td className="px-3 py-2.5">{statusBadge(r.moderationStatus)}</td>
                  <td className="px-3 py-2.5 text-neutral-400 whitespace-nowrap">{ago(r.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => deleteReply(r.id)} disabled={deleting === r.id}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 text-[10px] text-neutral-400">
            {filtered.length} of {replies.length} replies (latest 500)
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/logs').then(setLogs).finally(() => setLoading(false));
  }, []);

  return loading ? <div className="text-center py-8 text-neutral-400">Loading logs…</div> : (
    <>
    <div className="md:hidden space-y-2">
      {logs.map(l => (
        <div key={l.id} className="border border-neutral-200 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-bold uppercase text-xs ${
              l.action === 'APPROVED' ? 'text-emerald-600' :
              l.action === 'REJECTED' ? 'text-red-500' : 'text-amber-600'
            }`}>{l.action}</span>
            <span className="text-[11px] text-neutral-400">{ago(l.timestamp)}</span>
          </div>
          <div className="text-xs text-neutral-600 mb-1">{l.targetType} #{l.targetId}</div>
          <p className="text-xs text-neutral-500">{l.reason || '—'}</p>
        </div>
      ))}
      <div className="text-[10px] text-neutral-400 text-center py-1">{logs.length} entries (latest 200)</div>
    </div>
    <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Action</th>
            <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Target</th>
            <th className="text-left px-3 py-2.5 font-bold text-neutral-600">Reason</th>
            <th className="text-left px-3 py-2.5 font-bold text-neutral-600">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {logs.map(l => (
            <tr key={l.id} className="hover:bg-neutral-50">
              <td className="px-3 py-2.5">
                <span className={`font-bold uppercase ${
                  l.action === 'APPROVED' ? 'text-emerald-600' :
                  l.action === 'REJECTED' ? 'text-red-500' : 'text-amber-600'
                }`}>{l.action}</span>
              </td>
              <td className="px-3 py-2.5 text-neutral-600">
                {l.targetType} #{l.targetId}
              </td>
              <td className="px-3 py-2.5 text-neutral-500">{l.reason || '—'}</td>
              <td className="px-3 py-2.5 text-neutral-400">{ago(l.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 text-[10px] text-neutral-400">
        {logs.length} entries (latest 200)
      </div>
    </div>
    </>
  );
}

// Compose as tuco team: the "needs a reply" queue plus a reply composer.
// Posts through the SAME api.addReply() the normal member reply box uses —
// no new backend endpoint, so this can never behave differently from a
// real reply for any other part of the app (rendering, notifications,
// Nector award, all of it already works because it's the same code path).
// Mirrors the real reply bubble in Modal.tsx (avatar, name, video embed via
// TucoVideoCard, image) as closely as reasonable outside the actual thread
// view — so "what will this look like" doesn't require posting for real
// first. Kept intentionally separate from Modal.tsx's ReplyComponent rather
// than importing it directly: that component is wired to live thread state
// (likes, edit, nested replies, voting) this preview has none of, and
// forcing it to tolerate a fake reply object would risk it breaking in the
// real thread view — a preview bug is a much smaller problem than that.
function ComposePreview({ text, imageUrl, authorName }: { text: string; imageUrl: string; authorName: string }) {
  const videoId = parseYouTubeId(text);
  const bodyText = videoId ? stripYouTubeUrl(text) : text;
  if (!text.trim() && !imageUrl.trim()) {
    return (
      <div className="text-center py-10 text-neutral-400 text-sm border border-dashed border-neutral-200 rounded-xl">
        Nothing to preview yet — write a reply first
      </div>
    );
  }
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-neutral-200">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px]"
            style={{ backgroundColor: getAvatarColor(authorName), color: '#4D4747' }}>
            {getInitials(authorName)}
          </div>
          <div>
            <h4 className="font-bold text-[15px] text-[#4D4747] leading-none mb-1 flex items-center gap-1.5">
              {authorName}
              <span className="text-[9px] bg-tuco-cyan/10 text-tuco-cyan px-1.5 py-0.5 rounded-full font-black uppercase">tuco team</span>
            </h4>
            <p className="text-[12px] text-neutral-400 font-medium leading-none">Official reply</p>
          </div>
        </div>
        <span className="text-[12px] text-neutral-400 font-medium">Just now</span>
      </div>
      <div className="mb-2">
        {bodyText ? (
          <p className="text-[14.5px] text-[#4D4747] leading-relaxed font-normal whitespace-pre-wrap">{bodyText}</p>
        ) : null}
        {videoId ? (
          <div className="flex justify-center mt-3">
            <TucoVideoCard videoId={videoId} variant="thread" />
          </div>
        ) : imageUrl.trim() ? (
          <img src={imageUrl.trim()} alt="" className="mt-3 rounded-2xl max-h-80 w-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : null}
      </div>
    </div>
  );
}

function ComposeTab({ adminUser }: { adminUser: User }) {
  const [queue, setQueue] = useState<NeedsReplyThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [composeView, setComposeView] = useState<'write' | 'preview'>('write');
  // "Any thread" search — separate from the needs-reply queue, since a
  // tuco-team reply is sometimes wanted on a thread that already has
  // replies (following up, correcting something, adding a video) not just
  // the zero-reply ones the queue surfaces.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const [allConvs, setAllConvs] = useState<NeedsReplyThread[]>([]);
  const [loadingAllConvs, setLoadingAllConvs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setQueue(await adminFetch('/api/admin/needs-reply')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!pickerOpen || allConvs.length > 0) return;
    setLoadingAllConvs(true);
    adminFetch('/api/admin/conversations')
      .then(setAllConvs)
      .finally(() => setLoadingAllConvs(false));
  }, [pickerOpen, allConvs.length]);

  const searchResults = threadSearch.trim().length < 2 ? [] : allConvs
    .filter(c =>
      c.title.toLowerCase().includes(threadSearch.toLowerCase()) ||
      c.opAuthor.toLowerCase().includes(threadSearch.toLowerCase())
    )
    .slice(0, 20);

  // A thread selected from search isn't necessarily in the queue (it may
  // already have replies) — check both lists so the composer works either way.
  const activeThread = queue.find(t => t.id === activeThreadId) || allConvs.find(t => t.id === activeThreadId);

  const submit = async () => {
    if (!activeThreadId || !replyText.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.addReply(activeThreadId, {
        text: replyText.trim(),
        city: adminUser.city || 'India',
        ...(imageUrl.trim() ? { image: imageUrl.trim() } : {}),
      });
      setSentIds(s => new Set(s).add(activeThreadId));
      setReplyText('');
      setImageUrl('');
      setActiveThreadId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setSending(false);
    }
  };

  return (
    // min-w-0 on both grid children below is load-bearing, not decorative:
    // a grid item's default min-width is "auto" (fit its content), so a
    // truncating flex child deeper inside (the thread title span) refuses
    // to actually shrink and forces this whole column — and with it the
    // page — wider than the viewport on mobile. Same fix applied to every
    // other grid md:grid-cols-2 tab below (Nector, Activity).
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Needs a reply ({queue.length})</h3>
          <button onClick={load} className="p-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50">
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        </div>
        <p className="text-[11px] text-neutral-400 -mt-1">
          Every APPROVED thread with zero replies, oldest first. A thread drops off this list the moment ANY reply lands
          — from a parent or the tuco team — it doesn't mean tuco team specifically has replied.
        </p>
        {loading ? <div className="text-center py-8 text-neutral-400 text-sm">Loading…</div> : queue.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-sm">Every approved thread has at least one reply 🎉</div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {queue.map(t => (
              <div key={t.id} onClick={() => { setActiveThreadId(t.id); setError(''); }} role="button" tabIndex={0}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  activeThreadId === t.id ? 'border-tuco-cyan bg-tuco-cyan/5' : 'border-neutral-200 hover:bg-neutral-50'
                } ${sentIds.has(t.id) ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-neutral-800 truncate min-w-0">{t.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a href={threadShareUrl(t.id, t.title)} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()} title="Open thread"
                      className="text-neutral-400 hover:text-tuco-cyan">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {sentIds.has(t.id) && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                </div>
                <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">{t.preview}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-neutral-400">
                  <span className="bg-neutral-100 px-1.5 rounded capitalize">{t.category}</span>
                  <span>by {t.opAuthor}</span>
                  <span>·</span>
                  <span>{ago(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-neutral-200 pt-3 mt-1">
          <button onClick={() => setPickerOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-tuco-cyan hover:text-tuco-cyan-hover">
            <Search className="w-3.5 h-3.5" />
            {pickerOpen ? 'Hide thread search' : 'Or reply to any thread…'}
          </button>
          <p className="text-[11px] text-neutral-400 mt-1">
            Not limited to the queue above — search every thread, including ones that already have replies
            (following up, correcting something, adding a video answer later).
          </p>
          {pickerOpen && (
            <div className="mt-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input value={threadSearch} onChange={e => setThreadSearch(e.target.value)}
                  placeholder="Search by title or author…"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-tuco-cyan" />
              </div>
              {loadingAllConvs ? (
                <p className="text-xs text-neutral-400 text-center py-2">Loading every thread…</p>
              ) : threadSearch.trim().length < 2 ? (
                <p className="text-xs text-neutral-400 text-center py-2">Type at least 2 characters…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-2">No matches.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map(t => (
                    <div key={t.id} onClick={() => { setActiveThreadId(t.id); setError(''); setPickerOpen(false); }}
                      role="button" tabIndex={0}
                      className={`w-full text-left p-2.5 rounded-lg border cursor-pointer ${
                        activeThreadId === t.id ? 'border-tuco-cyan bg-tuco-cyan/5' : 'border-neutral-200 hover:bg-neutral-50'
                      }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-neutral-800 truncate min-w-0">{t.title}</span>
                        <a href={threadShareUrl(t.id, t.title)} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()} title="Open thread"
                          className="text-neutral-400 hover:text-tuco-cyan shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        by {t.opAuthor} · {ago(t.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">Reply as tuco team</h3>
        {!activeThread ? (
          <div className="text-center py-12 text-neutral-400 text-sm border border-dashed border-neutral-200 rounded-xl">
            Pick a thread from the queue, or search for any thread, to reply to it
          </div>
        ) : (
          <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
            <div>
              <div className="font-bold text-sm text-neutral-800">{activeThread.title}</div>
              <p className="text-xs text-neutral-500 mt-1">{activeThread.preview}</p>
            </div>

            <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
              <button onClick={() => setComposeView('write')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${composeView === 'write' ? 'bg-white text-tuco-cyan shadow-sm' : 'text-neutral-500'}`}>
                Write
              </button>
              <button onClick={() => setComposeView('preview')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${composeView === 'preview' ? 'bg-white text-tuco-cyan shadow-sm' : 'text-neutral-500'}`}>
                Preview
              </button>
            </div>

            {composeView === 'write' ? (
              <>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={6}
                  placeholder="Write the tuco team's reply… (paste a YouTube link to embed a video answer)"
                  className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-tuco-cyan resize-none"
                />
                <input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="Optional image URL"
                  className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-tuco-cyan"
                />
              </>
            ) : (
              <ComposePreview text={replyText} imageUrl={imageUrl} authorName="tuco Team" />
            )}

            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <div className="flex items-center gap-2">
              <button onClick={submit} disabled={sending || !replyText.trim()}
                className="flex items-center gap-1.5 bg-tuco-cyan hover:bg-tuco-cyan-hover disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
                <Send className="w-3.5 h-3.5" /> {sending ? 'Posting…' : 'Post reply'}
              </button>
              <button onClick={() => { setActiveThreadId(null); setReplyText(''); setImageUrl(''); setComposeView('write'); }}
                className="text-sm text-neutral-500 hover:text-neutral-700 px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Open reports (unresolved flags) with enough context to act without
// jumping to the Posts/Replies tab first — approve/reject reuses the same
// endpoints those tabs use, so behavior is identical either way.
function ModerationTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReports(await adminFetch('/api/admin/reports')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (report: Report, action: 'approved' | 'rejected') => {
    setUpdating(report.id);
    try {
      if (report.targetType === 'CONVERSATION') {
        await api.updateConversation(report.targetId, { moderationStatus: action });
      } else {
        await adminFetch(`/api/replies/${report.targetId}`, { method: 'PATCH', body: JSON.stringify({ moderationStatus: action }) });
      }
      setReports(r => r.filter(x => x.id !== report.id));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-neutral-400">Loading reports…</div>;
  if (reports.length === 0) {
    return <div className="text-center py-12 text-neutral-400 text-sm">No open reports — the queue is clear 🎉</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={load} className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50">
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>
      {reports.map(r => (
        <div key={r.id} className={`border border-neutral-200 rounded-xl p-4 ${updating === r.id ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase">{r.targetType.toLowerCase()} #{r.targetId}</span>
              {r.timesThisContentWasFlagged > 1 && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                  flagged {r.timesThisContentWasFlagged}× total
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-400">{ago(r.timestamp)}</span>
          </div>
          <p className="text-sm text-neutral-800 bg-neutral-50 border border-neutral-100 rounded-lg p-2.5 mb-2 flex items-center justify-between gap-2">
            <span>{r.contentPreview}</span>
            {r.threadId != null && (
              <a href={threadShareUrl(r.threadId, r.threadTitle)} target="_blank" rel="noopener noreferrer" title="Open thread"
                className="text-neutral-400 hover:text-tuco-cyan shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </p>
          <div className="text-xs text-neutral-500 mb-3 space-y-0.5">
            <div>By: <span className="font-bold text-neutral-700">{r.contentAuthorName || 'unknown'}</span></div>
            <div>Reported by: <span className="font-bold text-neutral-700">{r.reporterUsername}</span></div>
            {r.reason && <div>Reason: <span className="text-neutral-700">{r.reason}</span></div>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => resolve(r, 'approved')} disabled={updating === r.id}
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" /> Keep up
            </button>
            <button onClick={() => resolve(r, 'rejected')} disabled={updating === r.id}
              className="flex items-center gap-1 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg">
              <XCircle className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Per-user Nector standing (live balance + our local award ledger) plus a
// browsable feed of recent awards across everyone — the two things that
// otherwise need a live API call or a raw Prisma query to check.
function NectorTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NectorSearchResult[]>([]);
  const [detail, setDetail] = useState<NectorUserDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [recentAwards, setRecentAwards] = useState<NectorAward[] & { user?: NectorSearchResult | null }[] | any[]>([]);
  const [loadingAwards, setLoadingAwards] = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/nector/awards').then(setRecentAwards).finally(() => setLoadingAwards(false));
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await adminFetch(`/api/admin/nector/search?q=${encodeURIComponent(query)}`)); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const inspect = async (userId: string) => {
    setDetail(null);
    setDetail(await adminFetch(`/api/admin/nector/user/${userId}`));
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3 min-w-0">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Look up a user</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by username or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-tuco-cyan" />
        </div>
        {searching && <p className="text-xs text-neutral-400">Searching…</p>}
        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.map(u => (
              <button key={u.id} onClick={() => inspect(u.id)}
                className="w-full text-left p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-sm">
                <div className="font-bold text-neutral-800">{u.username}</div>
                <div className="text-xs text-neutral-400">{u.email}{u.phone ? ` · ${u.phone}` : ' · no phone on file'}</div>
              </button>
            ))}
          </div>
        )}

        {detail && (
          <div className="border border-neutral-200 rounded-xl p-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-neutral-800">{detail.user.username}</div>
                <div className="text-xs text-neutral-400">{detail.user.email}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-tuco-cyan">{detail.balance ?? '—'}</div>
                <div className="text-[10px] text-neutral-400">live balance</div>
              </div>
            </div>
            <div className={`text-xs font-bold mb-2 ${detail.phoneOnFile ? 'text-emerald-600' : 'text-amber-600'}`}>
              {detail.phoneOnFile ? '✓ Phone on file (linkable to checkout)' : '⚠ No phone — points not linkable yet'}
            </div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Award history</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {detail.awards.length === 0 ? (
                <p className="text-xs text-neutral-400">No awards yet.</p>
              ) : detail.awards.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs bg-neutral-50 rounded px-2 py-1">
                  <span className="font-bold text-neutral-700">{a.sourceType}</span>
                  <span className="text-neutral-400">{ago(a.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">Recent awards (all users)</h3>
        {loadingAwards ? <div className="text-center py-8 text-neutral-400 text-sm">Loading…</div> : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {recentAwards.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-xs bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2">
                <div>
                  <span className="font-bold text-neutral-700">{a.user?.username || a.userId}</span>
                  <span className="text-neutral-400 ml-1.5">{a.sourceType}</span>
                </div>
                <span className="text-neutral-400">{ago(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Scheduled-job visibility + a manual trigger, so "did the digest actually
// send" doesn't require pm2 logs over SSH. Real (non-dry-run) runs need an
// explicit confirmation since sendWeeklyDigest emails real users for real.
function JobsTab() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setJobs(await adminFetch('/api/admin/jobs')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (name: string, dryRun: boolean, job: AdminJob) => {
    if (!dryRun) {
      const warning = job.sendsRealEmail
        ? 'This sends REAL emails to real users right now. Are you sure?'
        : `This job has no preview mode — running it will make a real, live change (${name}). Are you sure?`;
      if (!confirm(warning)) return;
    }
    setRunning(name);
    try {
      const res = await adminFetch('/api/admin/jobs/run', { method: 'POST', body: JSON.stringify({ name, dryRun }) });
      setOutput(o => ({ ...o, [name]: res.output || '(no output)' }));
      load();
    } catch (err) {
      setOutput(o => ({ ...o, [name]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setRunning(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-neutral-400">Loading jobs…</div>;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-neutral-400 -mt-1">
        These are the same two scripts that already run automatically every Monday via cron (rotate at 00:30, digest at
        01:00) — this just lets you trigger one on demand instead of waiting, or check what it would do first.
        "Dry run" only exists where the script actually supports one (it runs for real otherwise, no matter which
        button you press) — <b>rotateWeeklyHighlight has no preview mode</b>, so "Run for real" is its only option
        and it immediately changes the live homepage highlight. <b>sendWeeklyDigest</b> emails every user who has
        something new to see, for real, once you use "Run for real" instead of "Dry run."
      </p>
      {jobs.map(job => (
        <div key={job.name} className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-bold text-neutral-800 flex items-center gap-2 flex-wrap">
                {job.name}
                {job.sendsRealEmail && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold uppercase">sends email</span>}
                {!job.supportsDryRun && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase">no preview mode</span>}
              </div>
              <div className="text-xs text-neutral-400">Last run: {job.lastRun ? ago(job.lastRun) : 'never (on this server)'}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {job.supportsDryRun && (
                <button onClick={() => run(job.name, true, job)} disabled={running === job.name}
                  className="flex items-center gap-1 text-xs font-bold text-neutral-600 border border-neutral-200 hover:bg-neutral-50 px-3 py-1.5 rounded-lg">
                  <Play className="w-3.5 h-3.5" /> Dry run
                </button>
              )}
              <button onClick={() => run(job.name, false, job)} disabled={running === job.name}
                className="flex items-center gap-1 text-xs font-bold text-white bg-tuco-cyan hover:bg-tuco-cyan-hover px-3 py-1.5 rounded-lg">
                <Play className="w-3.5 h-3.5" /> Run for real
              </button>
            </div>
          </div>
          {job.lastOutput && (
            <pre className="text-[10px] text-neutral-500 bg-neutral-50 rounded-lg p-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">{job.lastOutput}</pre>
          )}
          {output[job.name] && (
            <pre className="text-[10px] text-neutral-700 bg-tuco-cyan/5 border border-tuco-cyan/20 rounded-lg p-2 mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">{output[job.name]}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

// Recent platform activity + a single-glance health check for the external
// services this app depends on — what I've been checking by hand over SSH.
function ActivityTab() {
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [bounced, setBounced] = useState<{ id: string; username: string; email: string; emailBounceReason?: string }[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [activity, healthRes] = await Promise.all([
        adminFetch('/api/admin/activity'),
        adminFetch('/api/admin/health'),
      ]);
      setFeed(activity.feed);
      setBounced(activity.currentlyBounced);
      setHealth(healthRes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const iconFor = (type: ActivityItem['type']) =>
    type === 'signup' ? <Users className="w-3.5 h-3.5 text-tuco-cyan" /> :
    type === 'post' ? <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> :
    <MessageCircle className="w-3.5 h-3.5 text-blue-500" />;

  if (loading) return <div className="text-center py-8 text-neutral-400">Loading…</div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">System health</h3>
          <button onClick={load} className="p-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50">
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        </div>
        {health && (
          <div className="space-y-1.5">
            {Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${
                check.ok ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
              }`}>
                <span className="font-bold capitalize">{key}</span>
                <span className={check.ok ? 'text-emerald-600' : 'text-red-600'}>{check.detail || (check.ok ? 'OK' : 'Not OK')}</span>
              </div>
            ))}
            {health.jobStatuses.map(j => (
              <div key={j.name} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg border border-neutral-100 bg-neutral-50">
                <span className="font-bold">{j.name}</span>
                <span className="text-neutral-500">
                  {j.lastRun ? `last ran ${ago(j.lastRun)}${j.staleDays && j.staleDays > 8 ? ' ⚠️ overdue' : ''}` : 'never run'}
                </span>
              </div>
            ))}
          </div>
        )}
        {bounced.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mt-4 mb-1.5">
              Currently bounced ({bounced.length})
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {bounced.map(u => (
                <div key={u.id} className="text-xs bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                  <span className="font-bold text-neutral-700">{u.username}</span>
                  <span className="text-neutral-400 ml-1.5">{u.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Recent activity</h3>
        <p className="text-[11px] text-neutral-400 mb-2">
          The 20 newest signups + 20 newest posts + 20 newest replies, merged and re-sorted by time — the 40 most recent shown.
        </p>
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {feed.map((item, i) => {
            const threadId = item.type === 'post' ? item.meta.id : item.type === 'reply' ? item.meta.conversationId : null;
            return (
              <div key={i} className="flex items-center gap-2 text-xs bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2">
                {iconFor(item.type)}
                <span className="flex-1 min-w-0 text-neutral-700 truncate">{item.summary}</span>
                {threadId != null && (
                  <a href={threadShareUrl(threadId, item.type === 'post' ? item.meta.title : undefined)}
                    target="_blank" rel="noopener noreferrer" title="Open thread" className="text-neutral-400 hover:text-tuco-cyan shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="text-neutral-400 whitespace-nowrap">{ago(item.at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────

interface AdminPanelProps {
  currentUserRole: string;
  currentUser?: User;
  onLogout: () => void;
}

type Tab = 'dashboard' | 'compose' | 'moderation' | 'conversations' | 'replies' | 'nector' | 'jobs' | 'activity' | 'logs';

// One-line, plain-English summary of what each tab actually does — shown
// right under the page heading so a non-technical teammate doesn't need to
// ask what a tab is for before using it.
const TAB_DESCRIPTIONS: Record<Tab, string> = {
  dashboard: 'Platform totals at a glance, plus the full user list below — search, change roles, and export to CSV.',
  compose: 'Approved threads with zero replies, oldest first. Pick one and reply as the tuco team — posts exactly like a real member reply, including video/image support.',
  moderation: 'Every open report (flagged post or reply nobody has acted on yet), with who reported it and why. "Keep up" or "Remove" resolves it the same way approving/rejecting from the Posts or Replies tab would.',
  conversations: 'Every thread on the platform — approve/reject, pin, delete, or set which one is this week\'s featured highlight.',
  replies: 'Every reply on the platform (most recent 500) — search and delete.',
  nector: 'Look up any user\'s live tuco Points balance and award history, or browse recent awards across everyone. Counts here are local (what we attempted to award), not a live balance for everyone — that would need one API call per user and Nector limits those to 60/minute.',
  jobs: 'Manually trigger the two scripts that otherwise only run on their Monday cron schedule, and see when they last ran.',
  activity: 'A live feed of signups/posts/replies, plus a health check for the services this app depends on (database, Nector, Resend, bounce tracking, and whether the cron jobs are overdue).',
  logs: 'The full moderation audit trail — every approve/reject/flag action ever taken, in order.',
};

export function AdminPanel({ currentUserRole, currentUser, onLogout }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [reportCount, setReportCount] = useState(0);
  const [needsReplyCount, setNeedsReplyCount] = useState(0);
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<{ users: any[]; conversations: any[]; replies: any[] } | null>(null);

  const loadStats = useCallback(() => {
    setStatsError('');
    // These badge counts fetch once on mount with no automatic retry — a
    // transient failure (the API restarting mid-request during a deploy) or
    // a real permission problem (e.g. a promoted account's existing token
    // still carrying its pre-promotion role — see requireAdmin server-side,
    // now fixed to re-check the DB fresh instead of trusting the token) used
    // to leave the Dashboard stuck on "Loading stats…" forever with nothing
    // to click and nothing in the UI explaining why.
    adminFetch('/api/admin/stats').then(setStats).catch(err => {
      console.error('Failed to load admin stats:', err);
      setStatsError(err instanceof Error ? err.message : 'Failed to load.');
    });
    adminFetch('/api/admin/reports').then(r => setReportCount(r.length)).catch(err => console.error('Failed to load report count:', err));
    adminFetch('/api/admin/needs-reply').then(r => setNeedsReplyCount(r.length)).catch(err => console.error('Failed to load needs-reply count:', err));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (globalQuery.trim().length < 2) { setGlobalResults(null); return; }
    const t = setTimeout(() => {
      adminFetch(`/api/admin/search?q=${encodeURIComponent(globalQuery)}`).then(setGlobalResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [globalQuery]);

  const isAllowed = currentUserRole === 'tuco_team' || currentUserRole === 'moderator';

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center max-w-sm">
          <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="font-display font-black text-lg text-neutral-800 mb-2">Access Denied</h2>
          <p className="text-sm text-neutral-500 mb-4">You need moderator or tuco_team role to access the admin panel.</p>
          <button onClick={onLogout} className="text-sm text-tuco-cyan hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any; badge?: number; badgeKey?: Tab }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'compose', label: 'Compose', icon: Send, badge: needsReplyCount, badgeKey: 'compose' },
    { key: 'moderation', label: 'Moderation', icon: Flag, badge: reportCount, badgeKey: 'moderation' },
    { key: 'conversations', label: 'Posts', icon: MessageSquare, badge: stats?.pending, badgeKey: 'conversations' },
    { key: 'replies', label: 'Replies', icon: MessageCircle },
    { key: 'nector', label: 'Nector', icon: Coins },
    { key: 'jobs', label: 'Jobs', icon: Wrench },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'logs', label: 'Mod Logs', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-3 sm:px-4 py-3 flex items-center justify-between gap-2 flex-wrap sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 bg-tuco-cyan rounded-lg flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display font-black text-neutral-800 text-sm">tuco Admin</span>
            <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
              {currentUserRole.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {stats?.pending ? (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
              <AlertTriangle className="w-3 h-3" />
              {stats.pending} pending
            </div>
          ) : null}
          <button onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-500 px-3 py-1.5 border border-neutral-200 rounded-xl hover:border-red-200 transition-colors whitespace-nowrap">
            <LogOut className="w-3.5 h-3.5" /> Exit Admin
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-white border-b border-neutral-200 px-4 flex gap-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              tab === key ? 'border-tuco-cyan text-tuco-cyan' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <div className="mb-1 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display font-black text-lg text-neutral-800">
            {tabs.find(t => t.key === tab)?.label}
          </h1>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input value={globalQuery} onChange={e => setGlobalQuery(e.target.value)}
              placeholder="Search everything…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:border-tuco-cyan" />
            {globalResults && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto p-2 space-y-2">
                {globalResults.users.length === 0 && globalResults.conversations.length === 0 && globalResults.replies.length === 0 && (
                  <p className="text-xs text-neutral-400 p-2">No matches.</p>
                )}
                {globalResults.users.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase px-1">Users</div>
                    {globalResults.users.map((u: any) => (
                      <div key={u.id} className="text-xs px-2 py-1 hover:bg-neutral-50 rounded"><b>{u.username}</b> · {u.email}</div>
                    ))}
                  </div>
                )}
                {globalResults.conversations.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase px-1">Threads</div>
                    {globalResults.conversations.map((c: any) => (
                      <div key={c.id} className="text-xs px-2 py-1 hover:bg-neutral-50 rounded truncate">#{c.id} {c.title}</div>
                    ))}
                  </div>
                )}
                {globalResults.replies.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase px-1">Replies</div>
                    {globalResults.replies.map((r: any) => (
                      <div key={r.id} className="text-xs px-2 py-1 hover:bg-neutral-50 rounded truncate">{r.author}: {r.text.slice(0, 60)}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-500 mb-4 max-w-3xl">{TAB_DESCRIPTIONS[tab]}</p>
        {tab === 'dashboard' && <DashboardTab stats={stats} error={statsError} onRetry={loadStats} />}
        {tab === 'compose' && currentUser && <ComposeTab adminUser={currentUser} />}
        {tab === 'moderation' && <ModerationTab />}
        {tab === 'conversations' && <ConversationsTab />}
        {tab === 'replies' && <RepliesTab />}
        {tab === 'nector' && <NectorTab />}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'logs' && <LogsTab />}
      </main>
    </div>
  );
}
