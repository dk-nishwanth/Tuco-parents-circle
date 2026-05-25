import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Database } from './db';
import { Conversation, User } from '../src/types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const db = Database.getInstance();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- Shopify Proxy Verification Middleware ---
const verifyShopifyProxy = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { signature, ...params } = req.query;
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!secret) {
    console.warn('SHOPIFY_API_SECRET not set, skipping verification (Development mode)');
    return next();
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  // Sort parameters alphabetically and join them
  const message = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('');

  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  if (signature === generatedHash) {
    return next();
  }

  return res.status(401).json({ error: 'Invalid signature' });
};

// --- API Endpoints ---

// Get all conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await db.getConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Save all conversations (replaces current list)
app.post('/api/conversations', async (req, res) => {
  try {
    const conversations: Conversation[] = req.body;
    await db.saveConversations(conversations);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save conversations' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Save a user
app.post('/api/users', async (req, res) => {
  try {
    const user: User = req.body;
    await db.saveUser(user);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Shopify Proxy entry point (example)
app.get('/apps/community', verifyShopifyProxy, (req, res) => {
  // If request is from Shopify, we can identify the user by req.query.logged_in_customer_id
  const customerId = req.query.logged_in_customer_id;
  console.log('Request from Shopify for customer:', customerId);
  
  // In production, this would serve the built React index.html
  res.send('Welcome to the community! (Proxy is working)');
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
