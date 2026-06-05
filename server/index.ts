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
  limit: NODE_ENV === 'production' ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
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
  city: u.city,
  childAge: u.childAge,
  role: mapRole(u.role),
  badges: u.badges || [],
  createdAt: u.createdAt.toISOString(),
  isVerified: u.isVerified,
  postCount: u.postCount,
  replyCount: u.replyCount,
  totalUpvotes: u.totalUpvotes,
  trustScore: u.trustScore / 100, // stored as 0-100 in DB, frontend expects 0-1
  emailNotifications: u.emailNotifications,
  savedPosts: u.savedPosts || [],
});

// Convert Prisma conversation to frontend Conversation shape
const formatConversation = (c: any) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  isPinned: c.isPinned,
  isHot: c.isHot,
  isFeatured: c.isFeatured,
  featuredLabel: c.featuredLabel,
  votes: c.votes,
  views: c.views,
  op: {
    author: c.opAuthor,
    city: c.opCity,
    time: c.opTime,
    text: c.opText,
    image: c.opImage,
    authorRole: mapRole(c.opAuthorRole),
    authorBadges: c.opAuthorBadges,
  },
  replies: (c.replies || []).map((r: any) => ({
    id: r.id,
    author: r.author,
    city: r.city,
    time: r.time,
    text: r.text,
    image: r.image,
    tucoRec: r.tucoRec,
    likes: r.likes,
    authorRole: mapRole(r.authorRole),
    authorBadges: r.authorBadges,
  })),
  moderationStatus: c.moderationStatus.toLowerCase(),
  moderatedBy: c.moderatedBy,
  moderationReason: c.moderationReason,
  createdAt: c.createdAt.toISOString(),
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
      from: process.env.EMAIL_FROM || 'Tuco Parents Circle <noreply@tucokids.com>',
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

app.use(express.static(distPath));

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
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return res.status(400).json({ error: firstError?.message || 'Validation failed' });
    }
    const { email, password, username, city, childAge } = parsed.data;
    const normalEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
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
      },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    // Send welcome email
    await sendEmail(
      user.email,
      'Welcome to Tuco Parents Circle!',
      `<h2>Welcome, ${user.username}!</h2><p>You've joined the Tuco Parents Circle community. Start sharing your parenting experiences today!</p><p><a href="${process.env.FRONTEND_URL || 'https://your-app.onrender.com'}">Visit the community</a></p>`
    );

    res.status(201).json({ token, user: formatUser(user) });
  } catch (error) {
    next(error);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.post('/api/auth/login', authLimiter, async (req: AuthRequest, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const { email, password } = parsed.data;
    const normalEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token, user: formatUser(user) });
  } catch (error) {
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
  try {
    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    const conversations = await prisma.conversation.findMany({
      where: isMod ? undefined : { moderationStatus: 'APPROVED' },
      include: { replies: { orderBy: { id: 'asc' } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    res.status(200).json(conversations.map(formatConversation));
  } catch (error) {
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
  try {
    const parsed = createThreadSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return res.status(400).json({ error: firstError?.message || 'Validation failed' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { title, category, city, text, image, moderationStatus, greyAreaFlags, reviewPriority } = parsed.data;

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
        moderationStatus: (moderationStatus?.toUpperCase() as any) || 'PENDING',
        greyAreaFlags: greyAreaFlags || [],
        reviewPriority,
        votes: 1,
      },
      include: { replies: true },
    });

    // Update user post count
    await prisma.user.update({
      where: { id: req.userId },
      data: { postCount: { increment: 1 } },
    });

    res.status(201).json(formatConversation(conversation));
  } catch (error) {
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
          `<h2>Great news, ${author.username}!</h2><p>Your post "<strong>${conversation.title}</strong>" has been approved and is now live on Tuco Parents Circle.</p><p><a href="${process.env.FRONTEND_URL || ''}">View it in the community</a></p>`
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
  try {
    const conversationId = parseInt(req.params.id);
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return res.status(400).json({ error: firstError?.message || 'Validation failed' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { text, city, image, tucoRec } = parsed.data;

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

    // Update reply count
    await prisma.user.update({
      where: { id: req.userId },
      data: { replyCount: { increment: 1 } },
    });

    // Notify thread author
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (conversation && conversation.authorId !== req.userId) {
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

    res.status(201).json({
      id: reply.id,
      author: reply.author,
      city: reply.city,
      time: reply.time,
      text: reply.text,
      image: reply.image,
      tucoRec: reply.tucoRec,
      likes: reply.likes,
      authorRole: mapRole(reply.authorRole),
      authorBadges: reply.authorBadges,
    });
  } catch (error) {
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
      if (userMessage.match(/hi|hello|hey/)) mockReply = "Hello! 👋 I'm your Tuco Parenting Assistant. How can I help?";
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
      system: `You are the Tuco Parenting Assistant for the "Tuco Parents Circle" community — a supportive forum for Indian parents to share advice on skincare, nutrition, activities, and general parenting. Be warm, concise, and helpful.`,
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

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/apps')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ------------------------------
// ERROR HANDLING
// ------------------------------

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port} [${NODE_ENV}]`);
});
