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

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const api = {
  async signup(
    email: string,
    password: string,
    username: string,
    city: string,
    childAge: string
  ): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, city, childAge }),
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
    data: { text: string; city: string; image?: string; tucoRec?: string }
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

  // ── User profile ────────────────────────────────────────────────────────────

  async updateMe(data: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async getUsers(): Promise<Record<string, User>> {
    const res = await fetch(`${API_BASE_URL}/users`);
    return handleResponse<Record<string, User>>(res);
  },

  async toggleSavedPost(threadId: number): Promise<{ savedPosts: number[] }> {
    const res = await fetch(`${API_BASE_URL}/users/me/saved`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ threadId }),
    });
    return handleResponse<{ savedPosts: number[] }>(res);
  },

  // ── Reports ─────────────────────────────────────────────────────────────────

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
};
