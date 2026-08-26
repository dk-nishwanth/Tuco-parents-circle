import { Conversation, User, Notification } from '../types';

const API_BASE_URL = '/api';

// ── Token helpers ─────────────────────────────────────────────────────────────

export const tokenStore = {
  get: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tuco_auth_token');
  },
  set: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('tuco_auth_token', token);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('tuco_auth_token');
  },
};

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// Called when an authenticated request comes back 401/403 with a token still
// on file — i.e. the session itself was rejected (expired/invalid/rotated
// secret), not a login attempt with a wrong password (those never carry a
// token, see login() below). App.tsx wires this up to force a clean logout +
// a "please sign in again" prompt, instead of every subsequent reply/post/
// vote silently failing while the UI still looks logged in.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null): void {
  onSessionExpired = fn;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && tokenStore.get()) {
      tokenStore.clear();
      onSessionExpired?.();
    }
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Upload a File to S3 via a signed PUT the server hands us. If the server
// hasn't been given S3 credentials (503), we fall back to reading the file as
// a base64 data URL — the API still stores that string in `opImage`, so the
// caller doesn't need to know which path was taken.
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File, kind: 'post' | 'reply' = 'post'): Promise<string> {
  // Ask the server for a signed PUT URL. Server may reply 503 when S3 isn't
  // configured — that's a signal to fall back, not an error to surface.
  try {
    const presignRes = await fetch(`${API_BASE_URL}/uploads/presign`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ contentType: file.type, size: file.size, kind }),
    });
    if (presignRes.status === 503) {
      // Expected, silent fallback: server has no S3 credentials configured.
      return fileToDataUrl(file);
    }
    if (!presignRes.ok) {
      const body = await presignRes.json().catch(() => ({ error: 'Presign failed' }));
      throw new Error(body.error || `Presign HTTP ${presignRes.status}`);
    }
    const { uploadUrl, publicUrl } = (await presignRes.json()) as {
      uploadUrl: string;
      publicUrl: string;
    };
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);
    return publicUrl;
  } catch (err) {
    // S3 IS configured but the upload actually failed (bad credentials, CORS
    // misconfig, bucket policy, etc). This is a real bug, not the expected
    // "not configured" path above — surface it loudly so it isn't mistaken
    // for normal fallback behavior.
    console.error('S3 upload failed unexpectedly (falling back to inline base64 so the post still succeeds):', err);
    return fileToDataUrl(file);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const api = {
  async signup(
    email: string,
    password: string,
    username: string,
    city: string,
    childAge: string,
    phone?: string
  ): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, city, childAge, phone: phone || undefined }),
    });
    const data = await handleResponse<{ token: string; user: User }>(res);
    tokenStore.set(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ token: string; user: User }>(res);
    tokenStore.set(data.token);
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders() });
    // Only discard the saved token when it is genuinely rejected (expired /
    // invalid). A transient failure (server restart → 502, mobile network
    // blip, 5xx) must NOT log the user out — otherwise they silently lose
    // their session and are forced to sign in again, which shows up as repeat
    // logins and "why am I logged out?" churn. The caller keeps the token and
    // simply retries on the next load.
    if (res.status === 401 || res.status === 403) {
      tokenStore.clear();
    }
    return handleResponse<User>(res);
  },

  logout() {
    tokenStore.clear();
  },

  // ── Health ──────────────────────────────────────────────────────────────────

  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  },

  // ── Conversations ───────────────────────────────────────────────────────────

  async getConversations(): Promise<Conversation[]> {
    const token = tokenStore.get();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/conversations`, { headers });
    return handleResponse<Conversation[]>(res);
  },

  async createConversation(data: {
    title: string;
    category: string;
    city: string;
    text: string;
    image?: string;
    images?: string[];
    moderationStatus?: string;
    greyAreaFlags?: string[];
    reviewPriority?: number;
  }): Promise<Conversation> {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Conversation>(res);
  },

  async updateConversation(
    id: number,
    data: Partial<{
      votes: number;
      views: number;
      isPinned: boolean;
      isFeatured: boolean;
      featuredLabel: string;
      moderationStatus: string;
      moderationReason: string;
      moderatedBy: string;
    }>
  ): Promise<Conversation> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Conversation>(res);
  },

  async deleteConversation(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await handleResponse<{ success: boolean }>(res);
  },

  // ── Replies ─────────────────────────────────────────────────────────────────

  async addReply(
    conversationId: number,
    data: { text: string; city: string; image?: string; images?: string[]; parentId?: number }
  ) {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/replies`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateReply(id: number, data: { text?: string; likes?: number }) {
    const res = await fetch(`${API_BASE_URL}/replies/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteReply(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/replies/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await handleResponse<any>(res);
  },

  // ── Votes ───────────────────────────────────────────────────────────────────

  async vote(data: {
    conversationId?: number;
    replyId?: number;
    type: 'UP' | 'DOWN';
  }) {
    const res = await fetch(`${API_BASE_URL}/votes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ action: string; type: string }>(res);
  },

  async getMyVotes(): Promise<Array<{ conversationId?: number; replyId?: number; type: string }>> {
    const res = await fetch(`${API_BASE_URL}/votes`, { headers: authHeaders() });
    return handleResponse<any[]>(res);
  },

  // ── Notifications ───────────────────────────────────────────────────────────

  async getNotifications(): Promise<Notification[]> {
    const res = await fetch(`${API_BASE_URL}/notifications`, { headers: authHeaders() });
    return handleResponse<Notification[]>(res);
  },

  async markNotificationRead(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    await handleResponse<any>(res);
  },

  async createNotification(type: string, title: string, description?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ type, title, description }),
    });
    await handleResponse<any>(res);
  },

  async clearNotifications(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await handleResponse<any>(res);
  },

  // ── Follow (user + thread) ─────────────────────────────────────────────────

  async follow(targetType: 'user' | 'thread', targetId: string | number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/follow`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ targetType, targetId }),
    });
    await handleResponse<any>(res);
  },

  async unfollow(targetType: 'user' | 'thread', targetId: string | number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/follow`, {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ targetType, targetId }),
    });
    await handleResponse<any>(res);
  },

  async getMyFollows(): Promise<{ users: string[]; threads: number[] }> {
    const res = await fetch(`${API_BASE_URL}/follows/me`, { headers: authHeaders() });
    return handleResponse<{ users: string[]; threads: number[] }>(res);
  },

  async getThreadFollowerCount(threadId: number): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/follows/thread/${threadId}/count`);
    const j = await handleResponse<{ count: number }>(res);
    return j.count;
  },

  // ── User profile ────────────────────────────────────────────────────────────

  async updateMe(data: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  // currentPassword is omitted for accounts with hasPassword === false
  // (Google-only) — the server only requires it when a real password exists.
  async changePassword(data: { currentPassword?: string; newPassword: string }): Promise<{ message: string; token?: string }> {
    const res = await fetch(`${API_BASE_URL}/users/me/password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ message: string; token?: string }>(res);
    // Changing your password invalidates every previously-issued token,
    // including the one this very request was authenticated with — without
    // storing the fresh one the server returns, the next API call would
    // 401 and silently boot the user right after they just changed it.
    if (result.token) tokenStore.set(result.token);
    return result;
  },

  async getUsers(): Promise<Record<string, User>> {
    const res = await fetch(`${API_BASE_URL}/users`);
    return handleResponse<Record<string, User>>(res);
  },

  // points is null (not 0) when Nector can't be reached or isn't configured
  // — callers should hide the badge in that case rather than show a wrong 0.
  async getNectorPoints(): Promise<{ points: number | null }> {
    const res = await fetch(`${API_BASE_URL}/users/me/nector-points`, {
      headers: authHeaders(),
    });
    return handleResponse<{ points: number | null }>(res);
  },

  async toggleSavedPost(threadId: number): Promise<{ savedPosts: number[] }> {
    const res = await fetch(`${API_BASE_URL}/users/me/saved`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ threadId }),
    });
    return handleResponse<{ savedPosts: number[] }>(res);
  },

  // ── Reports & Moderation Logs ───────────────────────────────────────────────

  async submitReport(data: {
    targetType: 'thread' | 'reply';
    targetId: number;
    reason: string;
    details: string;
  }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse<any>(res);
  },

  async getModerationLogs(): Promise<Array<{
    id: string;
    moderatorId: string;
    targetType: string;
    targetId: number;
    action: string;
    reason: string | null;
    timestamp: string;
  }>> {
    const res = await fetch(`${API_BASE_URL}/moderation-logs`, { headers: authHeaders() });
    return handleResponse<any[]>(res);
  },

  // ── Chat ────────────────────────────────────────────────────────────────────

  async chat(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ messages }),
    });
    const data = await handleResponse<{ content: string }>(res);
    return data.content;
  },

  // ── Legacy compat (used in a few places in App.tsx still) ───────────────────

  async saveConversations(_conversations: Conversation[]): Promise<void> {
    // no-op: App.tsx calls this but individual operations now go through
    // createConversation / updateConversation / deleteConversation
  },

  async saveUser(user: User): Promise<void> {
    if (!tokenStore.get()) return;
    await this.updateMe(user);
  },

  // ── Public profile ──────────────────────────────────────────────────────────

  async getPublicProfile(username: string): Promise<{
    user: {
      id: string;
      username: string;
      city: string;
      role: string;
      badges: any[];
      createdAt: string;
      postCount: number;
      replyCount: number;
      totalUpvotes: number;
      trustScore: number;
    };
    threads: Array<{
      id: number;
      title: string;
      category: string;
      votes: number;
      views: number;
      replyCount: number;
      createdAt: string;
    }>;
  }> {
    const res = await fetch(`${API_BASE_URL}/users/by-username/${encodeURIComponent(username)}`);
    return handleResponse(res);
  },
};
