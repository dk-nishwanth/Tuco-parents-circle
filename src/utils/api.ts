import { Conversation, User, Notification } from '../types';

// Use relative path since frontend and backend are served from the same domain
const API_BASE_URL = '/api';

export const api = {
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(`${API_BASE_URL}/health`, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  },

  async getConversations(): Promise<Conversation[]> {
    const response = await fetch(`${API_BASE_URL}/conversations`);
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  },

  async saveConversations(conversations: Conversation[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conversations),
    });
    if (!response.ok) throw new Error('Failed to save conversations');
  },

  async getUsers(): Promise<Record<string, User>> {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async saveUser(user: User): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Failed to save user');
  },

  async chat(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw new Error('Failed to communicate with ChatBot');
    const data = await response.json();
    return data.content;
  },
};
