import fs from 'fs/promises';
import path from 'path';
import { Conversation, User } from '../src/types';

const DATA_FILE = path.join(process.cwd(), 'server/data.json');

interface DatabaseSchema {
  conversations: Conversation[];
  users: Record<string, User>;
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private async load(): Promise<DatabaseSchema> {
    if (this.data) return this.data;
    try {
      const content = await fs.readFile(DATA_FILE, 'utf-8');
      this.data = JSON.parse(content);
    } catch (error) {
      // If file doesn't exist, initialize with empty state
      this.data = { conversations: [], users: {} };
      await this.save();
    }
    return this.data!;
  }

  private async save(): Promise<void> {
    if (!this.data) return;
    await fs.writeFile(DATA_FILE, JSON.stringify(this.data, null, 2));
  }

  public async getConversations(): Promise<Conversation[]> {
    const data = await this.load();
    return data.conversations;
  }

  public async saveConversations(conversations: Conversation[]): Promise<void> {
    const data = await this.load();
    data.conversations = conversations;
    await this.save();
  }

  public async getUsers(): Promise<Record<string, User>> {
    const data = await this.load();
    return data.users;
  }

  public async saveUsers(users: Record<string, User>): Promise<void> {
    const data = await this.load();
    data.users = users;
    await this.save();
  }

  public async getUser(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users[id] || null;
  }

  public async saveUser(user: User): Promise<void> {
    const users = await this.getUsers();
    users[user.id] = user;
    await this.saveUsers(users);
  }
}
