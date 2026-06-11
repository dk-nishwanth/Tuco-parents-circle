import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-please';

const prisma = new PrismaClient();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ------------------------------
// STARTUP SEEDING
// ------------------------------
async function seedOnStartup() {
  console.log('Checking database for seed data...');
  
  // Seed Categories
  const categories = [
    {
      id: 'skincare',
      label: 'Skincare, haircare & personal care',
      icon: '🧴',
      className: 'skincare',
      bg: '#FFF0E8',
      text: '#D84315',
      border: '#FFD8C2'
    },
    {
      id: 'school',
      label: 'School & Learning',
      icon: '📚',
      className: 'school',
      bg: '#FEE8F4',
      text: '#880E4F',
      border: '#FDBBDD'
    },
    {
      id: 'kids_growth',
      label: 'Kids & Growth',
      icon: '🌱',
      className: 'kids_growth',
      bg: '#EAF7F0',
      text: '#1B5E20',
      border: '#C7EED8'
    },
    {
      id: 'active_kids',
      label: 'Active Kids',
      icon: '🏃',
      className: 'active_kids',
      bg: '#E8F3FF',
      text: '#0D47A1',
      border: '#C4E1FF'
    },
    {
      id: 'parenting_hacks',
      label: 'Parenting Hacks',
      icon: '💡',
      className: 'parenting_hacks',
      bg: '#F1F9F1',
      text: '#2E7D32',
      border: '#D3ECD5'
    }
  ];

  // Upsert categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
    console.log(`✅ Seeded category: ${cat.label}`);
  }

  // Seed Products
  const products = [
    {
      id: 'sunscreen',
      name: 'tuco Mineral Sunscreen SPF 50+',
      icon: '☀️',
      subtitle: 'Gentle for sensitive skin',
      tag: 'Trending',
      price: '₹499',
      linkUrl: 'https://example.com/sunscreen'
    },
    {
      id: 'moisturizer',
      name: 'tuco Baby Moisturizer',
      icon: '🧴',
      subtitle: 'Dermatologist-tested',
      tag: 'Best Seller',
      price: '₹399',
      linkUrl: 'https://example.com/moisturizer'
    }
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: prod,
    });
    console.log(`✅ Seeded product: ${prod.name}`);
  }

  console.log('✅ Database seed check complete!');
}

// Test Prisma connection and run seed on startup
async function startup() {
  try {
    console.log('🔌 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    await seedOnStartup();
  } catch (error) {
    console.error('❌ Failed to connect to database or seed:', error);
    process.exit(1);
  }
}

startup();

// ------------------------------
// MIDDLEWARE
// ------------------------------

app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
}));

app.use(pino({
  transport: NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: NODE_ENV === 'production' ? 500 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    console.warn('⚠️ API rate limit hit for IP:', req.ip);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
  handler: (req, res) => {
    console.warn('⚠️ Auth rate limit hit for IP:', req.ip);
    res.status(429).json({ error: 'Too many auth attempts, please try again later.' });
  }
});

const corsOptions = {
  origin: NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || true
    : ['http://localhost:3000', 'http://localhost:3006', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ------------------------------
// AUTH MIDDLEWARE
// ------------------------------

interface AuthRequest extends express.Request {
  userId?: string;
  userRole?: string;
}

const authenticate = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      req.userId = payload.userId;
      req.userRole = payload.role;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
};

const requireModerator = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
  if (req.userRole !== 'MODERATOR' && req.userRole !== 'TUCO_TEAM') {
    return res.status(403).json({ error: 'Moderator access required' });
  }
  next();
};

// ------------------------------
// HELPERS
// ------------------------------

const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

// Map Prisma enum roles to frontend roles
const mapRole = (role: string): string => {
  const map: Record<string, string> = {
    GUEST: 'guest',
    MEMBER: 'member',
    TRUSTED: 'trusted',
    MODERATOR: 'moderator',
    TUCO_TEAM: 'tuco_team',
  };
  return map[role] || 'member';
};

const mapRoleToDb = (role: string): string => {
  const map: Record<string, string> = {
    guest: 'GUEST',
    member: 'MEMBER',
    trusted: 'TRUSTED',
    moderator: 'MODERATOR',
    tuco_team: 'TUCO_TEAM',
  };
  return map[role] || 'MEMBER';
};

// Convert Prisma user to frontend User shape
const formatUser = (u: any) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  city: u.city || '',
  childAge: u.childAge || '',
  role: mapRole(u.role),
  badges: u.badges || [],
  createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
  isVerified: u.isVerified || false,
  postCount: u.postCount || 0,
  replyCount: u.replyCount || 0,
  totalUpvotes: u.totalUpvotes || 0,
  trustScore: (u.trustScore || 0) / 100, // stored as 0-100 in DB, frontend expects 0-1
  emailNotifications: u.emailNotifications || true,
  savedPosts: u.savedPosts || [],
});

// Convert Prisma conversation to frontend Conversation shape
const formatConversation = (c: any) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  isPinned: c.isPinned || false,
  isHot: c.isHot || false,
  isFeatured: c.isFeatured || false,
  featuredLabel: c.featuredLabel,
  votes: c.votes || 0,
  views: c.views || 0,
  op: {
    author: c.opAuthor,
    city: c.opCity,
    time: c.opTime,
    text: c.opText,
    image: c.opImage,
    authorRole: mapRole(c.opAuthorRole),
    authorBadges: c.opAuthorBadges || [],
  },
  replies: (c.replies || []).map((r: any) => ({
    id: r.id,
    author: r.author,
    city: r.city,
    time: r.time,
    text: r.text,
    image: r.image,
    tucoRec: r.tucoRec,
    likes: r.likes || 0,
    authorRole: mapRole(r.authorRole),
    authorBadges: r.authorBadges || [],
  })),
  moderationStatus: (c.moderationStatus || 'PENDING').toLowerCase(),
  moderatedBy: c.moderatedBy,
  moderationReason: c.moderationReason,
  createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
  authorId: c.authorId,
  greyAreaFlags: c.greyAreaFlags || [],
  reviewPriority: c.reviewPriority,
});

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return true;
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'tuco Parents Circle <noreply@tucokids.com>',
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

// ------------------------------
// STATIC FILES
// ------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

// ------------------------------
// HEALTH CHECKS
// ------------------------------

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString(), env: NODE_ENV });
});

// ------------------------------
// AUTH ENDPOINTS
// ------------------------------

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(30),
  city: z.string().optional(),
  childAge: z.string().optional(),
});

app.post('/api/auth/signup', authLimiter, async (req: AuthRequest, res, next) => {
  console.log('📝 Processing signup request...');
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      console.log('❌ Validation failed:', firstError);
      return res.status(400).json({ error: firstError?.message || 'Validation failed' });
    }
    const { email, password, username, city, childAge } = parsed.data;
    const normalEmail = email.trim().toLowerCase();
    console.log('👤 Checking if user exists:', normalEmail);

    const existing = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (existing) {
      console.log('❌ User already exists');
      return res.status(409).json({ error: 'Email already registered' });
    }

    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);
    
    console.log('💾 Creating user in database...');
    const user = await prisma.user.create({
      data: {
        email: normalEmail,
        passwordHash,
        username,
        city: city || 'India',
        childAge,
        role: 'MEMBER',
        isVerified: false,
        trustScore: 50, // 0.5 in frontend scale
        savedPosts: [], // Initialize empty array
      },
    });

    console.log('✅ User created:', user.id);

    // Check for JWT_SECRET
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    // Send welcome email (don't fail signup if email fails)
    try {
      await sendEmail(
        user.email,
        'Welcome to tuco Parents Circle!',
        `<h2>Welcome, ${user.username}!</h2><p>You've joined the tuco Parents Circle community. Start sharing your parenting experiences today!</p><p><a href="${process.env.FRONTEND_URL || 'https://your-app.onrender.com'}">Visit the community</a></p>`
      );
    } catch (emailErr) {
      console.warn('⚠️ Welcome email failed, but signup successful:', emailErr);
    }

    console.log('✅ Signup successful');
    res.status(201).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('❌ Signup error:', error);
    next(error);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.post('/api/auth/login', authLimiter, async (req: AuthRequest, res, next) => {
  console.log('🔐 Processing login request...');
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log('❌ Login validation failed');
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const { email, password } = parsed.data;
    const normalEmail = email.trim().toLowerCase();
    console.log('👤 Looking up user:', normalEmail);

    const user = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('🔑 Verifying password...');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Login successful for user:', user.id);
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('❌ Login error:', error);
    next(error);
  }
});

app.get('/api/auth/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(formatUser(user));
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// CONVERSATIONS
// ------------------------------

app.get('/api/conversations', optionalAuth, async (req: AuthRequest, res, next) => {
  console.log('📄 Getting conversations...');
  try {
    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    console.log('👤 User role:', req.userRole, 'Is mod:', isMod);
    const conversations = await prisma.conversation.findMany({
      where: isMod ? undefined : { moderationStatus: 'APPROVED' },
      include: { replies: { orderBy: { id: 'asc' } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    console.log('✅ Found', conversations.length, 'conversations');
    res.status(200).json(conversations.map(formatConversation));
  } catch (error) {
    console.error('❌ Error getting conversations:', error);
    next(error);
  }
});

const createThreadSchema = z.object({
  title: z.string().min(5).max(300),
  category: z.string(),
  city: z.string(),
  text: z.string().min(10).max(5000),
  image: z.string().optional(),
  moderationStatus: z.string().optional(),
  greyAreaFlags: z.array(z.string()).optional(),
  reviewPriority: z.number().optional(),
});

app.post('/api/conversations', authenticate, async (req: AuthRequest, res, next) => {
  console.log('💬 Creating new conversation...');
  try {
    const parsed = createThreadSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      console.log('❌ Conversation validation failed:', firstError);
      return res.status(400).json({ error: firstError?.message || 'Validation failed' });
    }

    console.log('👤 Finding user:', req.userId);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    const accountAgeMs = Date.now() - user.createdAt.getTime();
    if (!isMod && accountAgeMs < 24 * 60 * 60 * 1000) {
      const hoursRemaining = Math.ceil((24 * 60 * 60 * 1000 - accountAgeMs) / (60 * 60 * 1000));
      return res.status(403).json({
        error: `New members have a 24-hour cooling period before posting. Please try again in ${hoursRemaining} hour(s).`,
      });
    }

    const { title, category, city, text, image, greyAreaFlags, reviewPriority } = parsed.data;
    const status = isMod ? (parsed.data.moderationStatus?.toUpperCase() as any) || 'PENDING' : 'PENDING';

    console.log('💾 Creating conversation in database...');
    const conversation = await prisma.conversation.create({
      data: {
        title,
        category,
        opAuthor: user.username,
        opCity: city,
        opTime: 'Just now',
        opText: text,
        opImage: image,
        opAuthorRole: user.role,
        opAuthorBadges: (user.badges as any[] || []).map((b: any) => b.type),
        authorId: user.id,
        moderationStatus: status,
        greyAreaFlags: greyAreaFlags || [],
        reviewPriority,
        votes: 1,
      },
      include: { replies: true },
    });
    console.log('✅ Conversation created with ID:', conversation.id);

    // Update user post count
    console.log('📊 Updating user post count...');
    await prisma.user.update({
      where: { id: req.userId },
      data: { postCount: { increment: 1 } },
    });

    console.log('✅ Conversation created successfully!');
    res.status(201).json(formatConversation(conversation));
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    next(error);
  }
});

app.patch('/api/conversations/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { votes, views, isPinned, isFeatured, featuredLabel, moderationStatus, moderationReason, moderatedBy } = req.body;

    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';

    // Check moderation fields require mod role
    if ((moderationStatus || isPinned !== undefined || isFeatured !== undefined) && !isMod) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    const updateData: any = {};
    if (votes !== undefined) updateData.votes = votes;
    if (views !== undefined) updateData.views = views;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (featuredLabel !== undefined) updateData.featuredLabel = featuredLabel;
    if (moderationStatus) updateData.moderationStatus = moderationStatus.toUpperCase();
    if (moderationReason) updateData.moderationReason = moderationReason;
    if (moderatedBy) updateData.moderatedBy = moderatedBy;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: { replies: true },
    });

    // If approved, send email to author
    if (moderationStatus === 'approved') {
      const author = await prisma.user.findUnique({ where: { id: conversation.authorId } });
      if (author) {
        await sendEmail(
          author.email,
          `✅ Your post is live: ${conversation.title.slice(0, 40)}`,
          `<h2>Great news, ${author.username}!</h2><p>Your post "<strong>${conversation.title}</strong>" has been approved and is now live on tuco Parents Circle.</p><p><a href="${process.env.FRONTEND_URL || ''}">View it in the community</a></p>`
        );
      }
    }

    res.status(200).json(formatConversation(conversation));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/conversations/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) return res.status(404).json({ error: 'Thread not found' });
    if (!isMod && conversation.authorId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await prisma.conversation.delete({ where: { id } });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// REPLIES
// ------------------------------

const replySchema = z.object({
  text: z.string().min(1).max(3000),
  city: z.string(),
  image: z.string().optional(),
  tucoRec: z.string().optional(),
});

app.post('/api/conversations/:id/replies', authenticate, async (req: AuthRequest, res, next) => {
  console.log('💬 Adding reply to conversation:', req.params.id);
  try {
    const conversationId = parseInt(req.params.id);
    console.log('📝 Parsing reply data...');
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      console.log('❌ Reply validation failed:', firstError);
      return res.status(400).json({ error: firstError?.message || 'Validation failed' });
    }

    console.log('👤 Finding user:', req.userId);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const { text, city, image, tucoRec } = parsed.data;

    console.log('💾 Creating reply in database...');
    const reply = await prisma.reply.create({
      data: {
        conversationId,
        author: user.username,
        authorId: user.id,
        city,
        time: 'Just now',
        text,
        image,
        tucoRec,
        authorRole: user.role,
        authorBadges: (user.badges as any[] || []).map((b: any) => b.type),
      },
    });
    console.log('✅ Reply created with ID:', reply.id);

    // Update reply count
    console.log('📊 Updating user reply count...');
    await prisma.user.update({
      where: { id: req.userId },
      data: { replyCount: { increment: 1 } },
    });

    // Notify thread author
    console.log('🔍 Finding conversation...');
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (conversation && conversation.authorId !== req.userId) {
      console.log('🔔 Creating notification for thread author...');
      await prisma.notification.create({
        data: {
          userId: conversation.authorId,
          type: 'REPLY',
          title: 'New reply to your thread',
          description: `${user.username} replied to "${conversation.title}"`,
          time: 'Just now',
          threadId: conversationId,
        },
      });
    }

    console.log('✅ Reply added successfully!');
    res.status(201).json({
      id: reply.id,
      author: reply.author,
      city: reply.city,
      time: reply.time,
      text: reply.text,
      image: reply.image,
      tucoRec: reply.tucoRec,
      likes: reply.likes || 0,
      authorRole: mapRole(reply.authorRole),
      authorBadges: reply.authorBadges || [],
    });
  } catch (error) {
    console.error('❌ Error adding reply:', error);
    next(error);
  }
});

app.patch('/api/replies/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { text, likes } = req.body;

    const reply = await prisma.reply.findUnique({ where: { id } });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    if (text && reply.authorId !== req.userId && !isMod) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.reply.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(likes !== undefined && { likes }),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/replies/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const reply = await prisma.reply.findUnique({ where: { id } });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    if (reply.authorId !== req.userId && !isMod) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.reply.delete({ where: { id } });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// VOTES
// ------------------------------

app.post('/api/votes', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { conversationId, replyId, type } = req.body;
    if (!conversationId && !replyId) {
      return res.status(400).json({ error: 'conversationId or replyId required' });
    }

    const existingVote = await prisma.vote.findFirst({
      where: {
        userId: req.userId!,
        ...(conversationId ? { conversationId } : { replyId }),
      },
    });

    // Get user for notifications
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingVote) {
      if (existingVote.type === type) {
        // Same vote = remove it (toggle off)
        await prisma.vote.delete({ where: { id: existingVote.id } });
        if (conversationId) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { votes: { increment: type === 'UP' ? -1 : 1 } },
          });
        }
        return res.status(200).json({ action: 'removed', type });
      } else {
        // Different vote = flip it
        await prisma.vote.update({ where: { id: existingVote.id }, data: { type } });
        if (conversationId) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { votes: { increment: type === 'UP' ? 2 : -2 } },
          });
        }
        return res.status(200).json({ action: 'flipped', type });
      }
    }

    // New vote
    await prisma.vote.create({
      data: {
        userId: req.userId!,
        conversationId: conversationId || null,
        replyId: replyId || null,
        type,
      },
    });

    if (conversationId) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { votes: { increment: type === 'UP' ? 1 : -1 } },
      });

      // Notify conversation author about new like
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (conversation && conversation.authorId !== req.userId && type === 'UP') {
        await prisma.notification.create({
          data: {
            userId: conversation.authorId,
            type: 'LIKE',
            title: 'Your thread got a like!',
            description: `${user.username} liked your thread "${conversation.title}"`,
            time: 'Just now',
            threadId: conversationId,
          },
        });
      }
    } else if (replyId) {
      // Notify reply author about new like
      const reply = await prisma.reply.findUnique({ where: { id: replyId } });
      if (reply && reply.authorId !== req.userId && type === 'UP') {
        await prisma.notification.create({
          data: {
            userId: reply.authorId,
            type: 'LIKE',
            title: 'Your reply got a like!',
            description: `${user.username} liked your reply`,
            time: 'Just now',
            threadId: reply.conversationId,
          },
        });
      }
    }

    res.status(201).json({ action: 'added', type });
  } catch (error) {
    next(error);
  }
});

// Get all votes for the current user (for UI state restoration)
app.get('/api/votes', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const votes = await prisma.vote.findMany({ where: { userId: req.userId } });
    res.status(200).json(votes);
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// NOTIFICATIONS
// ------------------------------

app.get('/api/notifications', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { id: 'desc' },
      take: 50,
    });
    res.status(200).json(notifications.map(n => ({
      id: n.id,
      type: n.type.toLowerCase(),
      title: n.title,
      description: n.description,
      time: n.time,
      read: n.read,
      threadId: n.threadId,
    })));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/notifications/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.update({ where: { id }, data: { read: true } });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// USER PROFILE
// ------------------------------

app.patch('/api/users/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { username, city, childAge, emailNotifications, savedPosts, badges, role, trustScore, postCount, replyCount, totalUpvotes } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (city) updateData.city = city;
    if (childAge !== undefined) updateData.childAge = childAge;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (savedPosts !== undefined) updateData.savedPosts = savedPosts;
    if (badges !== undefined) updateData.badges = badges;
    if (trustScore !== undefined) updateData.trustScore = Math.round(trustScore * 100);
    if (postCount !== undefined) updateData.postCount = postCount;
    if (replyCount !== undefined) updateData.replyCount = replyCount;
    if (totalUpvotes !== undefined) updateData.totalUpvotes = totalUpvotes;

    // Only mods can change roles
    if (role && (req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM')) {
      updateData.role = mapRoleToDb(role);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
    });

    res.status(200).json(formatUser(user));
  } catch (error) {
    next(error);
  }
});

app.get('/api/users', async (req, res, next) => {
  try {
    // Returns minimal public user info (no passwords, no emails)
    const users = await prisma.user.findMany({
      select: { id: true, username: true, city: true, role: true, badges: true, createdAt: true, postCount: true, replyCount: true, totalUpvotes: true, trustScore: true },
    });
    // Return as a record keyed by id for backwards compatibility
    const result: Record<string, any> = {};
    users.forEach(u => {
      result[u.id] = {
        id: u.id,
        username: u.username,
        city: u.city,
        role: mapRole(u.role),
        badges: u.badges || [],
        createdAt: u.createdAt.toISOString(),
        postCount: u.postCount,
        replyCount: u.replyCount,
        totalUpvotes: u.totalUpvotes,
        trustScore: u.trustScore / 100,
      };
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// SAVED POSTS
// ------------------------------

app.post('/api/users/me/saved', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { threadId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const saved = user.savedPosts || [];
    let updated: number[];
    if (saved.includes(threadId)) {
      updated = saved.filter((id: number) => id !== threadId);
    } else {
      updated = [...saved, threadId];
    }

    await prisma.user.update({ where: { id: req.userId }, data: { savedPosts: updated } });
    res.status(200).json({ savedPosts: updated });
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// AI CHAT
// ------------------------------

app.post('/api/chat', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { messages } = req.body;
    const client = getAnthropicClient();

    if (!client) {
      const userMessage = (messages[messages.length - 1]?.content || '').toLowerCase();
      let mockReply = "I'm currently in testing mode. How can I help you today?";
      if (userMessage.match(/hi|hello|hey/)) mockReply = "Hello! 👋 I'm your tuco Parenting Assistant. How can I help?";
      else if (userMessage.match(/sunscreen|spf|skin|rash|eczema|moisturizer/)) mockReply = "For skincare, we recommend natural, paraben-free products. Check the Skincare category in our forum!";
      else if (userMessage.match(/eat|food|tiffin|nutrition/)) mockReply = "Nutrition is key! Try involving kids in cooking. Check Parenting Hacks for tiffin ideas.";
      else if (userMessage.match(/sleep|bedtime|tantrum/)) mockReply = "A consistent bedtime routine helps. You'll find great tips in Kids & Growth.";
      else if (userMessage.match(/school|homework|exam/)) mockReply = "Check our School & Learning category for parent-shared experiences.";
      return res.status(200).json({ content: mockReply });
    }

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages,
      system: `You are the tuco Parenting Assistant for the "tuco Parents Circle" community — a supportive forum for Indian parents to share advice on skincare, nutrition, activities, and general parenting. Be warm, concise, and helpful.`,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not process that.';
    res.status(200).json({ content });
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// REPORTS
// ------------------------------

app.post('/api/reports', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    // Log to moderation log
    await prisma.moderationLog.create({
      data: {
        moderatorId: req.userId!,
        targetType: targetType === 'thread' ? 'CONVERSATION' : 'REPLY',
        targetId: parseInt(targetId),
        action: 'FLAGGED',
        reason: `${reason}: ${details}`,
      },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// SHOPIFY PROXY
// ------------------------------

const verifyShopifyProxy = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { signature, ...params } = req.query;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    if (NODE_ENV === 'development') return next();
    return res.status(500).json({ error: 'Server configuration error' });
  }
  if (!signature) return res.status(401).json({ error: 'Missing signature' });
  const message = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('');
  const generatedHash = crypto.createHmac('sha256', secret).update(message).digest('hex');
  if (signature === generatedHash) return next();
  return res.status(401).json({ error: 'Invalid signature' });
};

app.get('/apps/community', verifyShopifyProxy, (req, res) => {
  res.send('Welcome to the community!');
});

// ------------------------------
// FRONTEND FALLBACK
// ------------------------------

// Mount the static files at /community
app.use('/community', express.static(distPath));

// Fallback for SPA routing - all /community/* paths go to index.html
app.get('/community/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Also handle root redirect if needed
app.get('/', (req, res) => {
  res.redirect('/community');
});

// 404 for API/app paths
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/apps')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // If someone accesses root, redirect to community
  res.redirect('/community');
});

// ------------------------------
// ERROR HANDLING
// ------------------------------

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log detailed error information
  console.error('⚠️ Server Error:');
  console.error('  Message:', error.message);
  console.error('  Stack:', error.stack);
  console.error('  Request URL:', req.url);
  console.error('  Request Method:', req.method);
  
  res.status(500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${port} [${NODE_ENV}]`);
});
