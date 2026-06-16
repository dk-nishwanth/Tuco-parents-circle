import { useState, useEffect, useCallback } from 'react';
import {
  Users, MessageSquare, MessageCircle, BarChart3, Shield, Trash2,
  CheckCircle, XCircle, Pin, Star, RefreshCw, LogOut, Search,
  ChevronDown, ChevronUp, AlertTriangle, Clock, Eye, ThumbsUp,
} from 'lucide-react';
import { api, tokenStore } from '../utils/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  users: number; conversations: number; replies: number;
  pending: number; votes: number; notifications: number; recentUsers: number;
}
interface AdminUser {
  id: string; username: string; email: string; city: string;
  role: string; createdAt: string; isVerified: boolean;
  postCount: number; replyCount: number; totalUpvotes: number;
  trustScore: number; childAge?: string;
  _count: { conversations: number; replies: number; votes: number };
}
interface AdminConversation {
  id: number; title: string; category: string;
  moderationStatus: string; isPinned: boolean; isFeatured: boolean;
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

function DashboardTab({ stats }: { stats: Stats | null }) {
  if (!stats) return <div className="text-center py-12 text-neutral-400">Loading stats…</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={stats.users} sub={`+${stats.recentUsers} this week`} color="text-tuco-cyan" />
        <StatCard label="Conversations" value={stats.conversations} color="text-emerald-600" />
        <StatCard label="Replies" value={stats.replies} color="text-blue-600" />
        <StatCard label="Pending Review" value={stats.pending} color="text-amber-600" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Votes" value={stats.votes} color="text-purple-600" />
        <StatCard label="Notifications Sent" value={stats.notifications} color="text-neutral-600" />
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

  const filtered = users
    .filter(u => !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-tuco-cyan" />
        </div>
        <button onClick={load} className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50">
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {loading ? <div className="text-center py-8 text-neutral-400">Loading users…</div> : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
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
                    <div className="text-neutral-400 text-[10px]">{u.email}</div>
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
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
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
                    <div className="font-bold text-neutral-800 truncate">{c.title}</div>
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
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
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
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
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
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────

interface AdminPanelProps {
  currentUserRole: string;
  onLogout: () => void;
}

type Tab = 'dashboard' | 'users' | 'conversations' | 'replies' | 'logs';

export function AdminPanel({ currentUserRole, onLogout }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminFetch('/api/admin/stats').then(setStats).catch(() => {});
  }, []);

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

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'users', label: 'Users', icon: Users, badge: stats?.users },
    { key: 'conversations', label: 'Posts', icon: MessageSquare, badge: stats?.pending },
    { key: 'replies', label: 'Replies', icon: MessageCircle, badge: stats?.replies },
    { key: 'logs', label: 'Mod Logs', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-tuco-cyan rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-display font-black text-neutral-800 text-sm">tuco Admin</span>
            <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
              {currentUserRole.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats?.pending ? (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-bold">
              <AlertTriangle className="w-3 h-3" />
              {stats.pending} pending
            </div>
          ) : null}
          <button onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-500 px-3 py-1.5 border border-neutral-200 rounded-xl hover:border-red-200 transition-colors">
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
            {badge !== undefined && badge > 0 && key === 'conversations' && (
              <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <div className="mb-4">
          <h1 className="font-display font-black text-lg text-neutral-800">
            {tabs.find(t => t.key === tab)?.label}
          </h1>
        </div>
        {tab === 'dashboard' && <DashboardTab stats={stats} />}
        {tab === 'users' && <UsersTab />}
        {tab === 'conversations' && <ConversationsTab />}
        {tab === 'replies' && <RepliesTab />}
        {tab === 'logs' && <LogsTab />}
      </main>
    </div>
  );
}
