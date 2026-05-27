import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Database } from './db';
import { Conversation, User } from '../src/types';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const db = Database.getInstance();

// Move anthropic initialization to a function or handle empty key
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

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

// Claude Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const client = getAnthropicClient();

    if (!client) {
      // Mock response for testing if no API key is provided
      const userMessage = messages[messages.length - 1].content.toLowerCase();
      let mockReply = "I'm currently in testing mode (no API key found). How can I help you today?";
      
      // 1. Greetings
      if (userMessage.match(/hi|hello|hey|greetings|good morning/)) {
        mockReply = "Hello! 👋 I'm your Tuco Parenting Assistant. How can I help you today?";
      }
      // 2. Skincare
      else if (userMessage.match(/sunscreen|spf|skin|rash|eczema|moisturizer|soap|bath/)) {
        mockReply = "For skincare, we always recommend natural, paraben-free products. For specific concerns like rashes or eczema, it's best to consult a pediatric dermatologist. You can also check the 'Skincare' category in our forum!";
      }
      // 3. Nutrition & Food
      else if (userMessage.match(/eat|food|vegetable|tiffin|nutrition|protein|water|milk|sugar/)) {
        mockReply = "Nutrition is key for growing kids! Try involving them in cooking to reduce pickiness. Check out our 'Parenting Hacks' for healthy tiffin ideas from other moms.";
      }
      // 4. Sleep & Growth
      else if (userMessage.match(/sleep|bedtime|walk|teeth|tantrum|growth|potty/)) {
        mockReply = "Every child grows at their own pace. Establishing a consistent bedtime routine usually helps with sleep issues. You'll find many threads on these topics in 'Kids & Growth'.";
      }
      // 5. School & Learning
      else if (userMessage.match(/school|homework|math|reading|preschool|exam|cbse|ib/)) {
        mockReply = "Education is a big topic! Whether it's choosing between CBSE/IB or managing exam stress, our 'School & Learning' category has plenty of parent-shared experiences.";
      }
      // 6. Website Features & Navigation
      else if (userMessage.match(/post|discussion|saved|category|categories|reply|image|upload|helpful|notification|search|hot|log out|logout/)) {
        mockReply = "To use the forum: Click 'New Post' to start a discussion, use the 'Helpful' heart to thank others, and find your saved posts in the sidebar. You can also upload images using the camera icon!";
      }
      // 7. Community & Badges
      else if (userMessage.match(/badge|badges|trusted|insider|score|reward|moderator/)) {
        mockReply = "You earn badges by being helpful! Post quality advice to increase your Trust Score and unlock badges like 'Community Insider' or 'Trusted Member'.";
      }
      // 8. Recommended Picks
      else if (userMessage.match(/recommended|picks|product|products/)) {
        mockReply = "Recommended Picks are safe, natural Tuco products suggested by our community experts to help with specific parenting needs.";
      }
      
      return res.json({ content: mockReply });
    }

    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: messages,
      system: `You are the Tuco Parenting Assistant for the "Tuco Parents Circle" community.

About Tuco Parents Circle:
- It is a supportive community platform where parents share real-world advice on skincare, nutrition, activities, and general parenting.
- Key features include discussion threads, categories (Skincare, School, Kids Growth, Active Kids, Parenting Hacks), a voting system (Helpful/Likes), and a badge system for active members.
- The platform often features "Recommended Picks" which are natural and safe Tuco products integrated into helpful replies.
- Users can earn badges like "Community Insider" or "Trusted Member" based on their helpfulness.

Your Instructions:
0. For Greetings (Hello, Hi, Hey, etc.): Respond very warmly with a friendly greeting. Briefly mention you are the Tuco Assistant here to help with parenting tips or navigating the "Parents Circle" community.
1. For general parenting questions: Provide kind, supportive, and informative advice.
2. For questions about this website: Explain how to use the forum, how to post, what the categories are, or how the badge/helpful system works.
3. Tone: Always be warm, helpful, and community-focused. If you don't know a specific detail about a user's account, kindly guide them to the profile or notification settings.
4. Keep responses concise and easy to read on a mobile-friendly chat window.`,
    });

    res.json({ content: response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not process that.' });
  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({ error: 'Failed to communicate with Claude' });
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
