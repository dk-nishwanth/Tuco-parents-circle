import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino-http';
import { Database } from './db';
import { Conversation, User } from '../src/types';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const db = Database.getInstance();

// ------------------------------
// PRODUCTION MIDDLEWARE
// ------------------------------

// Security headers
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false // Disable CSP in dev for Vite HMR
}));

// Logging (Pino is very fast for production)
app.use(pino({
  transport: NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
}));

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: NODE_ENV === 'production' ? 100 : 1000, // 100 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://admin.shopify.com'] // Add your actual domains
    : ['http://localhost:3000', 'http://localhost:3006', 'http://localhost:5173'], // Dev origins
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ------------------------------
// UTILITIES
// ------------------------------

const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

// ------------------------------
// SHOPIFY VERIFICATION MIDDLEWARE
// ------------------------------

const verifyShopifyProxy = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { signature, ...params } = req.query;
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!secret) {
    if (NODE_ENV === 'development') {
      return next();
    }
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

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

// ------------------------------
// ROOT & HEALTH CHECKS
// ------------------------------

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Tuco Parents Circle API', 
    status: 'running',
    endpoints: [
      'GET /health',
      'GET /api/health',
      'GET /api/conversations',
      'POST /api/conversations',
      'GET /api/users',
      'POST /api/users',
      'POST /api/chat'
    ]
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString(), env: NODE_ENV });
});

// ------------------------------
// API ENDPOINTS
// ------------------------------

app.get('/api/conversations', async (req, res, next) => {
  try {
    const conversations = await db.getConversations();
    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations', async (req, res, next) => {
  try {
    const conversations: Conversation[] = req.body;
    await db.saveConversations(conversations);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users', async (req, res, next) => {
  try {
    const users = await db.getUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', async (req, res, next) => {
  try {
    const user: User = req.body;
    await db.saveUser(user);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

// Claude Chat Endpoint
app.post('/api/chat', async (req, res, next) => {
  try {
    const { messages } = req.body;
    const client = getAnthropicClient();

    if (!client) {
      // Mock response for testing if no API key is provided
      const userMessage = (messages[messages.length - 1]?.content || '').toLowerCase();
      let mockReply = "I'm currently in testing mode (no API key found). How can I help you today?";
      
      if (userMessage.match(/hi|hello|hey|greetings|good morning/)) {
        mockReply = "Hello! 👋 I'm your Tuco Parenting Assistant. How can I help you today?";
      }
      else if (userMessage.match(/sunscreen|spf|skin|rash|eczema|moisturizer|soap|bath/)) {
        mockReply = "For skincare, we always recommend natural, paraben-free products. For specific concerns like rashes or eczema, it's best to consult a pediatric dermatologist. You can also check the 'Skincare' category in our forum!";
      }
      else if (userMessage.match(/eat|food|vegetable|tiffin|nutrition|protein|water|milk|sugar/)) {
        mockReply = "Nutrition is key for growing kids! Try involving them in cooking to reduce pickiness. Check out our 'Parenting Hacks' for healthy tiffin ideas from other moms.";
      }
      else if (userMessage.match(/sleep|bedtime|walk|teeth|tantrum|growth|potty/)) {
        mockReply = "Every child grows at their own pace. Establishing a consistent bedtime routine usually helps with sleep issues. You'll find many threads on these topics in 'Kids & Growth'.";
      }
      else if (userMessage.match(/school|homework|math|reading|preschool|exam|cbse|ib/)) {
        mockReply = "Education is a big topic! Whether it's choosing between CBSE/IB or managing exam stress, our 'School & Learning' category has plenty of parent-shared experiences.";
      }
      else if (userMessage.match(/post|discussion|saved|category|categories|reply|image|upload|helpful|notification|search|hot|log out|logout/)) {
        mockReply = "To use the forum: Click 'New Post' to start a discussion, use the 'Helpful' heart to thank others, and find your saved posts in the sidebar. You can also upload images using the camera icon!";
      }
      else if (userMessage.match(/badge|badges|trusted|insider|score|reward|moderator/)) {
        mockReply = "You earn badges by being helpful! Post quality advice to increase your Trust Score and unlock badges like 'Community Insider' or 'Trusted Member'.";
      }
      else if (userMessage.match(/recommended|picks|product|products/)) {
        mockReply = "Recommended Picks are safe, natural Tuco products suggested by our community experts to help with specific parenting needs.";
      }
      
      return res.status(200).json({ content: mockReply });
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

    const content = response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not process that.';
    res.status(200).json({ content });
  } catch (error) {
    next(error);
  }
});

app.get('/apps/community', verifyShopifyProxy, (req, res) => {
  const customerId = req.query.logged_in_customer_id;
  res.send('Welcome to the community! (Proxy is working)');
});

// ------------------------------
// CENTRALIZED ERROR HANDLING
// ------------------------------

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.log.error(error, 'Unhandled error');
  res.status(500).json({ 
    error: NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ------------------------------
// START SERVER
// ------------------------------

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port} [${NODE_ENV}]`);
  if (NODE_ENV === 'production') {
    console.log('🔒 Production mode enabled');
  }
});
