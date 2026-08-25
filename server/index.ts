import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import pino from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient, UserRole } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { OAuth2Client } from 'google-auth-library';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;
// A short/guessable secret is brute-forceable regardless of the JWT
// algorithm's strength, so a misconfigured deploy (e.g. JWT_SECRET=abc)
// must fail loud at boot rather than sign tokens with it silently.
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET environment variable is not set or too short (must be at least 32 characters)');
  process.exit(1);
}

const prisma = new PrismaClient();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://community.tucokids.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${FRONTEND_URL}/api/auth/google/callback`);

// Fail-loud config audit at boot so a missing secret is obvious in the deploy
// logs instead of surfacing later as a silent, hard-to-diagnose user problem.
if (NODE_ENV === 'production') {
  if (!resend) console.error('🚨 CONFIG: RESEND_API_KEY missing — welcome & password-reset emails will NOT be delivered.');
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) console.error('🚨 CONFIG: GOOGLE_CLIENT_ID/SECRET missing — "Continue with Google" will fail.');
  if (!process.env.ANTHROPIC_API_KEY) console.warn('⚠️ CONFIG: ANTHROPIC_API_KEY missing — chatbot will use fallback responses.');
}

// ------------------------------
// STARTUP SEED
// ------------------------------
import { INITIAL_CONVERSATIONS } from '../src/data/conversations.js';
// Reuse the exact same content-moderation logic the client uses, so the server
// is the real gate. Previously moderation ran only in the browser and a direct
// API call could post anything. moderation.ts imports only types, so it's safe
// to run under Node/tsx.
import { analyzeContent } from '../src/utils/moderation.js';
// Shared badge thresholds — award badges server-side from real data so they
// persist and can't be gamed by the client.
import { BADGE_CRITERIA } from '../src/utils/badgeSystem.js';
// Canonicalize the child-age field server-side so the column stays uniform no
// matter what the client sends.
import { normalizeChildAge } from '../src/data/childAgeOptions.js';

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

  // Seed demo user if none
  let seedUser = await prisma.user.findUnique({ where: { email: 'demo@tucokids.com' } });
  if (!seedUser) {
    const passwordHash = await bcrypt.hash('password123', 12);
    seedUser = await prisma.user.create({
      data: {
        email: 'demo@tucokids.com',
        passwordHash,
        username: 'DemoParent',
        city: 'Mumbai',
        childAge: '5 years',
        role: 'MEMBER',
        isVerified: true,
        trustScore: 50,
        savedPosts: [],
      },
    });
    console.log(`✅ Seeded user: ${seedUser.username}`);
  }

  // Seed initial conversations only if none exist
  const existingConversations = await prisma.conversation.count();
  if (existingConversations > 0) {
    console.log(`✅ ${existingConversations} conversations already exist — skipping seed`);
    return;
  }

  for (const conv of INITIAL_CONVERSATIONS) {
    const createdConv = await prisma.conversation.create({
      data: {
        title: conv.title,
        category: conv.category,
        isPinned: conv.isPinned,
        isHot: conv.isHot,
        isFeatured: conv.isFeatured,
        featuredLabel: conv.featuredLabel,
        votes: conv.votes,
        views: conv.views,
        opAuthor: conv.op.author,
        opCity: conv.op.city,
        opTime: conv.op.time,
        opText: conv.op.text,
        opImage: conv.op.image,
        opAuthorRole: (conv.op.authorRole || 'MEMBER').toUpperCase() as UserRole,
        opAuthorBadges: conv.op.authorBadges || [],
        moderationStatus: 'APPROVED',
        authorId: seedUser.id,
        greyAreaFlags: conv.greyAreaFlags || [],
        reviewPriority: conv.reviewPriority || 50,
      },
    });
    console.log(`✅ Seeded conversation: ${conv.title}`);

    // Seed replies for this conversation
    if (conv.replies && conv.replies.length > 0) {
      for (const reply of conv.replies) {
        await prisma.reply.create({
          data: {
            conversationId: createdConv.id,
            author: reply.author,
            authorId: seedUser.id,
            city: reply.city,
            time: reply.time,
            text: reply.text,
            image: reply.image,
            likes: reply.likes || 0,
            authorRole: (reply.authorRole || 'MEMBER').toUpperCase() as UserRole,
            authorBadges: reply.authorBadges || [],
            moderationStatus: 'APPROVED',
          },
        });
      }
    }
  }

  console.log('🎉 Database seed check complete!');
}

// Test Prisma connection and run seed on startup
async function startup() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔌 Connecting to database (attempt ${attempt}/${MAX_RETRIES})...`);
      await prisma.$connect();
      console.log('✅ Database connected successfully!');
      await seedOnStartup();
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, (error as Error).message);
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error('❌ All connection attempts failed. Server will continue without database.');
      }
    }
  }
}

startup();

// ------------------------------
// MIDDLEWARE
// ------------------------------

app.set('trust proxy', 1); // trust nginx reverse proxy for correct client IPs in rate limiting

app.use(helmet({
  // Helmet's own default is `no-referrer`, which strips the Referer header on
  // every cross-origin request — including the tuco-team YouTube embeds below.
  // YouTube's embed player validates the referrer to confirm it's being loaded
  // from a real site, and with no referrer at all it fails some videos (esp.
  // Shorts) with error 153 ("video player configuration error"), even though
  // the same video plays fine directly on YouTube. `strict-origin-when-cross-origin`
  // still only ever leaks the bare origin (not the full path/query) cross-site.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    // Extend helmet's strict defaults so tuco team YouTube video replies can render:
    // the poster comes from i.ytimg.com and the player embeds youtube-nocookie.com.
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // 'data:' keeps legacy inline images working; the S3 hosts serve user-uploaded
      // post images (bucket direct + optional CloudFront in S3_PUBLIC_HOST).
      'img-src': [
        "'self'",
        'data:',
        'https://i.ytimg.com',
        'https://*.s3.amazonaws.com',
        'https://*.s3.ap-south-1.amazonaws.com',
        'https://*.cloudfront.net',
        'https://tucokids.com',
        'https://cdn.shopify.com',
      ],
      'frame-src': ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com'],
      // Without this, GA4 doesn't just log noisily to the console — it never
      // loads at all: gtag.js is served from googletagmanager.com (not
      // 'self'), so helmet's default script-src 'self' silently drops the
      // <script> tag before it can even fire the page_view beacon.
      'script-src': ["'self'", 'https://www.googletagmanager.com'],
      // gtag's actual event beacons (page_view, custom events, etc.) go out
      // as fetch/XHR/image pings to these hosts, which is what connect-src
      // (not script-src) governs. Without this, the script loads fine but
      // every event silently fails to send.
      'connect-src': [
        "'self'",
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://region1.google-analytics.com',
      ],
    },
  } : false,
}));

app.use(pino({
  transport: NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Keyed per client IP. Indian mobile users (Jio/Airtel) sit behind carrier-grade
  // NAT sharing ONE public IP, and each page load fires ~5 API calls plus 30s
  // notification polling — so a low cap throttles many real users at once. Keep a
  // high ceiling for abuse protection but well clear of normal shared-NAT traffic.
  // (Auth routes stay tightly capped via authLimiter below.)
  limit: NODE_ENV === 'production' ? 3000 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
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
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many auth attempts, please try again later.' },
  handler: (req, res) => {
    console.warn('⚠️ Auth rate limit hit for IP:', req.ip);
    res.status(429).json({ error: 'Too many auth attempts, please try again later.' });
  }
});

// Votes and replies only sat under the generic 3000/15min apiLimiter, which
// (per the comment above) is deliberately loose to tolerate shared-NAT
// traffic — loose enough that a single scripted account could cast/flip
// thousands of votes or spam replies well beyond any real usage before
// hitting it. Keyed per-user (falls back to IP pre-auth) so this doesn't
// double-punish a whole NAT-shared IP for one abusive account.
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: (req: AuthRequest) => req.userId || ipKeyGenerator(req.ip || 'unknown'),
  message: { error: 'Too many actions, please slow down.' },
  handler: (req: AuthRequest, res) => {
    console.warn('⚠️ Action rate limit hit for:', req.userId || req.ip);
    res.status(429).json({ error: 'Too many actions, please slow down.' });
  }
});

// /api/chat is Anthropic-backed and reachable by unauthenticated visitors
// (optionalAuth) — without a dedicated cap, the shared 3000/15min apiLimiter
// lets an anonymous caller drive a large number of paid completions per IP.
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: NODE_ENV === 'production' ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many chat requests, please try again later.' },
  handler: (req, res) => {
    console.warn('⚠️ Chat rate limit hit for IP:', req.ip);
    res.status(429).json({ error: 'Too many chat requests, please try again later.' });
  }
});

// Per-account login lockout, separate from authLimiter's per-IP cap above —
// mitigates distributed credential stuffing (rotating IPs/residential
// proxies against one target account), which a per-IP limiter alone can't
// touch. In-memory and reset on restart is an accepted tradeoff here since
// authLimiter already durably covers the per-IP case.
const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const LOGIN_LOCKOUT_THRESHOLD = 8;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
function isLoginLocked(email: string): boolean {
  const entry = failedLoginAttempts.get(email);
  if (!entry?.lockedUntil) return false;
  if (entry.lockedUntil <= Date.now()) {
    failedLoginAttempts.delete(email);
    return false;
  }
  return true;
}
function recordFailedLogin(email: string): void {
  const entry = failedLoginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= LOGIN_LOCKOUT_THRESHOLD) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  failedLoginAttempts.set(email, entry);
}
function clearFailedLogins(email: string): void {
  failedLoginAttempts.delete(email);
}

const corsOptions = {
  // Reuses the FRONTEND_URL constant (which already has a safe hardcoded
  // fallback) instead of falling back to `true` — reflecting any origin
  // combined with credentials:true would let any site make authenticated
  // cross-origin requests if the env var were ever unset in production.
  origin: NODE_ENV === 'production'
    ? FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:3006', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Catch malformed URL escapes (bot path-traversal scans like /..%c0%af...)
// before Express's own decoder throws them into the 500 error handler and
// stack-traces the whole thing. Return a clean 400 with no noise so the
// error log only holds real bugs.
app.use((req, res, next) => {
  try {
    decodeURIComponent(req.path);
    next();
  } catch {
    res.status(400).json({ error: 'Malformed URL' });
  }
});

// 25mb accommodates a multi-image post (up to 4 images × ~3mb base64).
// If the app moves to S3-hosted uploads (client uploads direct, only URLs are
// posted here), this can drop back to 1–2mb.
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
// Bots and stray clients POST junk that isn't valid JSON. Turn the
// SyntaxError express.json() raises (err.type === 'entity.parse.failed')
// into a clean 400 here instead of letting it stack-trace through the
// 500 handler.
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  next(err);
});

// ------------------------------
// AUTH MIDDLEWARE
// ------------------------------

interface AuthRequest extends express.Request {
  userId?: string;
  userRole?: string;
}

// tokenVersion is embedded in the JWT at sign time and compared against the
// user's current DB value on every request — this is what makes password
// change/reset actually invalidate old tokens instead of leaving a stolen
// token valid for its full 30-day life. A token signed before this shipped
// has no tokenVersion claim at all; treating that as 0 means it stays valid
// until the user's first password change/reset after this deploy, rather
// than logging everyone out immediately.
const authenticate = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tokenVersion?: number };
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { tokenVersion: true } });
    if (!user || (payload.tokenVersion ?? 0) !== user.tokenVersion) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tokenVersion?: number };
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { tokenVersion: true } });
      if (user && (payload.tokenVersion ?? 0) === user.tokenVersion) {
        req.userId = payload.userId;
        req.userRole = payload.role;
      }
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
  hasPassword: u.hasPassword ?? true,
  postCount: u.postCount || 0,
  replyCount: u.replyCount || 0,
  totalUpvotes: u.totalUpvotes || 0,
  trustScore: (u.trustScore || 0) / 100, // stored as 0-100 in DB, frontend expects 0-1
  emailNotifications: u.emailNotifications ?? true,
  savedPosts: u.savedPosts || [],
  interests: u.interests || [],
});

// Recursively format replies including nested ones
const formatReply = (r: any, allReplies: any[]): any => ({
  id: r.id,
  author: r.author,
  authorId: r.authorId,
  city: r.city,
  // Always compute relative time from createdAt so the label stays accurate
  // across reloads. The stored r.time is ignored unless createdAt is missing.
  time: r.createdAt ? formatRelativeTime(r.createdAt) : (r.time || 'just now'),
  text: r.text,
  image: r.image,
  images: (r.images && r.images.length > 0) ? r.images : (r.image ? [r.image] : []),
  likes: r.likes || 0,
  authorRole: mapRole(r.authorRole),
  authorBadges: r.authorBadges || [],
  createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  parentId: r.parentId,
  // Find all children of this reply
  replies: allReplies.filter((child: any) => child.parentId === r.id).map((child: any) => formatReply(child, allReplies)),
});

// Convert Prisma conversation to frontend Conversation shape
const formatConversation = (c: any) => {
  // Drop replies a moderator has REJECTED so they actually disappear for
  // everyone (reads previously returned all replies regardless of status, so
  // "reject" had no effect). PENDING/APPROVED stay visible as before, so no
  // existing content is hidden. Rejecting a reply also hides its child subtree.
  const allReplies = (c.replies || []).filter(
    (r: any) => (r.moderationStatus || 'PENDING') !== 'REJECTED'
  );
  // Root replies are those without parent
  const rootReplies = allReplies.filter((r: any) => !r.parentId);

  return {
    id: c.id,
    title: c.title,
    category: c.category,
    isPinned: c.isPinned || false,
    isHot: c.isHot || false,
    isFeatured: c.isFeatured || false,
    featuredLabel: c.featuredLabel,
    isWeeklyHighlight: c.isWeeklyHighlight || false,
    votes: c.votes || 0,
    views: c.views || 0,
    op: {
      author: c.opAuthor,
      city: c.opCity,
      // Always compute from createdAt so labels never go stale.
      time: c.createdAt ? formatRelativeTime(c.createdAt) : (c.opTime || 'just now'),
      text: c.opText,
      image: c.opImage,
      images: (c.opImages && c.opImages.length > 0) ? c.opImages : (c.opImage ? [c.opImage] : []),
      authorRole: mapRole(c.opAuthorRole),
      authorBadges: c.opAuthorBadges || [],
    },
    // Age-of-child bucket this thread is about. Set on create from the
    // author's User.childAge; the "For Your Age" feed matches viewers with
    // the same/adjacent bucket. Falls back to the current author.childAge
    // for rows written before this column existed.
    childAge: c.childAge || c.author?.childAge || null,
    replies: rootReplies.map((r: any) => formatReply(r, allReplies)),
    moderationStatus: (c.moderationStatus || 'PENDING').toLowerCase(),
    moderatedBy: c.moderatedBy,
    moderationReason: c.moderationReason,
    createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
    authorId: c.authorId,
    greyAreaFlags: c.greyAreaFlags || [],
    reviewPriority: c.reviewPriority,
  };
};

// Every email — real or simulated — is recorded in the EmailLog table so the
// admin panel and audits have a full trail. Previously the table stayed empty
// because the send path never wrote to it.
type EmailLogType = 'APPROVAL' | 'WEEKLY_ENGAGEMENT' | 'LAUNCH' | 'WELCOME' | 'REPLY_NOTIFICATION' | 'MODERATION' | 'TRANSACTIONAL';

async function logEmail(type: EmailLogType, to: string, subject: string, html: string): Promise<void> {
  try {
    // Strip tags and clip so the DB never stores a huge blob.
    const preview = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
    await prisma.emailLog.create({ data: { type: type as any, to, subject, preview } });
  } catch (err) {
    console.error('EmailLog write failed:', err);
  }
}

// Shared branded wrapper for every outgoing email — logo, brand colors
// (#35B5EC cyan, #FED018 yellow, #4D4747 warm grey), consistent footer.
// Table-based layout + inline styles only, since email clients strip
// <style> blocks and flexbox/grid.
function emailShell(bodyHtml: string, ctaLabel?: string, ctaUrl?: string): string {
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
         <tr><td style="background-color:#35B5EC;border-radius:10px;">
           <a href="${ctaUrl}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
         </td></tr>
       </table>`
    : '';
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#F9FAFB;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:24px;overflow:hidden;">
          <tr><td style="background-color:#FFE259;padding:24px 32px;text-align:center;">
            <img src="${FRONTEND_URL}/tuco-logo-email.png" alt="tuco Kids" width="58" height="32" style="width:58px;height:32px;display:block;margin:0 auto;border:0;" />
          </td></tr>
          <tr><td style="padding:32px 32px 28px;color:#4D4747;font-size:15px;line-height:1.6;">
            ${bodyHtml}
            ${cta}
          </td></tr>
          <tr><td style="padding:18px 32px;background-color:#F9FAFB;border-top:1px solid #F0F0F0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#A3A3A3;">tuco Parents Circle — a safe space for Indian parents.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  type: EmailLogType = 'TRANSACTIONAL',
): Promise<boolean> {
  if (!resend) {
    // In production this is a real outage: password-reset & welcome mails are
    // silently dropped while callers still see "sent". Log loudly so it shows
    // up in prod logs instead of hiding behind a benign-looking info line.
    if (NODE_ENV === 'production') {
      console.error(`🚨 EMAIL NOT SENT (RESEND_API_KEY missing) — "${subject}" to ${to}. Password reset is non-functional until this is set.`);
    } else {
      console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    }
    await logEmail(type, to, subject, html);
    return true;
  }
  try {
    // The Resend SDK resolves to { data, error } for API-level failures
    // (unverified domain, invalid recipient, etc.) — it does NOT throw for
    // those, only for network-level failures. Checking only the thrown-error
    // path (as this used to) meant every API-level rejection was silently
    // treated as a success: logged as sent, caller told "delivered", with
    // nothing ever reaching an inbox.
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'tuco Parents Circle <noreply@tucokids.com>',
      to,
      subject,
      html,
    });
    if (error) {
      console.error(`🚨 Email send REJECTED by Resend — "${subject}" to ${to}:`, error);
      return false;
    }
    await logEmail(type, to, subject, html);
    return true;
  } catch (err) {
    console.error('Email send failed (network/SDK error):', err);
    return false;
  }
}

// Hosted Resend templates (created via the Templates API) — editable from
// the Resend dashboard without a code deploy. Falls back to the inline
// emailShell()-based sendEmail() for anything not yet migrated.
const RESEND_TEMPLATES = {
  WELCOME: 'cabdb77a-9016-4dff-9b34-d798ddee1a92',
  PASSWORD_RESET: 'e5f67395-207d-452b-a3f4-51dfa6d7c6bc',
  NEW_DEVICE_LOGIN: '3b83a4c3-75a5-4d63-8067-7d5a0e2614fa',
} as const;

// There's no separate "real name" field anywhere in the app — only a
// pen-name (username), and some (especially Google sign-ups, which append
// random digits for uniqueness) end up like "Aishvarya533". Strip a trailing
// numeric suffix so emails greet "Aishvarya" instead of "Aishvarya533".
function displayName(username: string): string {
  return username.replace(/\s*\d+$/, '').trim() || username;
}

// "tuco Forum Members" segment — keeps the broadcast/newsletter contact
// list current automatically. Fire-and-forget: a Resend hiccup here must
// never block or fail a signup.
const RESEND_SEGMENT_ID = '5d263a33-83bb-4f28-abe5-a6753237310a';

async function syncResendContact(email: string, username: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const res = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: displayName(username),
        unsubscribed: false,
        segments: [{ id: RESEND_SEGMENT_ID }],
      }),
    });
    if (!res.ok) {
      console.warn('⚠️ Resend contact sync failed:', email, res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('⚠️ Resend contact sync error:', email, err);
  }
}

async function sendTemplateEmail(
  to: string,
  templateId: string,
  variables: Record<string, string>,
  type: EmailLogType = 'TRANSACTIONAL',
): Promise<boolean> {
  if (!resend) {
    if (NODE_ENV === 'production') {
      console.error(`🚨 EMAIL NOT SENT (RESEND_API_KEY missing) — template ${templateId} to ${to}.`);
    } else {
      console.log(`[EMAIL SIMULATED] To: ${to} | Template: ${templateId} | Vars: ${JSON.stringify(variables)}`);
    }
    await logEmail(type, to, `[template ${templateId}]`, JSON.stringify(variables));
    return true;
  }
  try {
    // `template` isn't in this SDK version's TS types yet, but the API
    // accepts it — see https://resend.com/docs/api-reference/emails/send-email
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'tuco Parents Circle <noreply@tucokids.com>',
      to,
      template: { id: templateId, variables },
    } as any);
    if (error) {
      console.error(`🚨 Template email REJECTED by Resend — template ${templateId} to ${to}:`, error);
      return false;
    }
    await logEmail(type, to, `[template ${templateId}]`, JSON.stringify(variables));
    return true;
  } catch (err) {
    console.error('Template email send failed (network/SDK error):', err);
    return false;
  }
}

const SITE_URL = process.env.FRONTEND_URL || 'https://community.tucokids.com';
const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// Convert a Date to a relative-time string. Computed at response time so
// it's always current — never stored in the DB.
function formatRelativeTime(date: Date | null | undefined, fallback = 'just now'): string {
  if (!date) return fallback;
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (diffSec < 45) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  const diffWk = Math.round(diffDay / 7);
  if (diffWk < 5) return `${diffWk} week${diffWk === 1 ? '' : 's'} ago`;
  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo} month${diffMo === 1 ? '' : 's'} ago`;
  const diffYr = Math.round(diffDay / 365);
  return `${diffYr} year${diffYr === 1 ? '' : 's'} ago`;
}

function emailLayout(title: string, intro: string, ctaText: string, ctaUrl: string, body: string): string {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #fafafa;">
    <div style="background: white; border-radius: 16px; padding: 32px;">
      <h1 style="color: #4D4747; font-size: 22px; margin: 0 0 16px;">${title}</h1>
      <p style="color: #555; line-height: 1.5; font-size: 15px; margin: 0 0 16px;">${intro}</p>
      ${body}
      <div style="margin: 28px 0;">
        <a href="${ctaUrl}" style="display: inline-block; background: #35B5EC; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold;">${ctaText}</a>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">You're receiving this because you're part of tuco Parents Circle. <a href="${SITE_URL}" style="color: #35B5EC;">Manage notifications</a></p>
    </div>
  </div>`;
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
  // Surface config presence (booleans only — never the secret values) so a
  // missing email/OAuth key is visible at a glance instead of failing silently.
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    env: NODE_ENV,
    config: {
      database: !!process.env.DATABASE_URL,
      jwt: !!JWT_SECRET,
      email: !!resend,
      googleOAuth: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
      chatbot: !!process.env.ANTHROPIC_API_KEY,
    },
  });
});

// Proxies tucokids.com's public /products/:handle.js endpoint for the quiz
// results screen. That endpoint has no CORS headers, so the browser can't
// call it directly from community.tucokids.com — this fetches it
// server-to-server (no CORS restriction) and returns just the fields the
// results cards need.
const SHOPIFY_HANDLE_RE = /^[a-z0-9-]+$/;
app.get('/api/quiz-products', async (req, res) => {
  const handlesParam = String(req.query.handles || '');
  const handles = handlesParam
    .split(',')
    .map(h => h.trim())
    .filter(h => h && SHOPIFY_HANDLE_RE.test(h))
    .slice(0, 10);

  const results = await Promise.all(
    handles.map(async handle => {
      try {
        const r = await fetch(`https://tucokids.com/products/${handle}.js`);
        if (!r.ok) return { handle, available: undefined };
        const data: any = await r.json();
        const image = data.featured_image || data.images?.[0] || null;
        return {
          handle,
          title: data.title as string,
          price: typeof data.price === 'number' ? data.price / 100 : null,
          image: image ? (image.startsWith('http') ? image : `https:${image}`) : null,
          available: !!data.available,
          url: `https://tucokids.com/products/${handle}`,
        };
      } catch {
        return { handle, available: undefined };
      }
    })
  );

  res.json(results);
});

// ------------------------------
// AUTH ENDPOINTS
// ------------------------------

// In-memory store for password reset tokens (token -> { userId, expiry })
// Password-reset tokens and one-time OAuth codes are persisted in the DB
// (PasswordResetToken / OAuthCode tables) rather than in-memory Maps, so they
// survive server restarts (which happen on every deploy) and work if the app is
// ever run on more than one instance. In-memory storage silently invalidated
// pending reset links and in-flight OAuth logins across a restart.

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().trim().min(3).max(30).regex(/^[\p{L}\p{N}_\-.'’ ]+$/u, 'Username can only contain letters, numbers, spaces, and _ - . \''),
  city: z.string().max(100).optional(),
  childAge: z.string().max(50).optional(),
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
    // "Unclaimed seed" accounts are stubs seeded before launch: real emails, no
    // owner, unloginable password (UNCLAIMED_SEED_ marker). When the real email
    // owner shows up to sign up, treat this as a claim — update the stub in
    // place with their password/username/city — instead of the 409 dead-end.
    if (existing && !existing.passwordHash.startsWith('UNCLAIMED_SEED_')) {
      console.log('❌ User already exists');
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Enforce a unique pen-name (case-insensitive) so mentions and profiles are
    // unambiguous. Return a friendly error instead of letting the DB constraint throw.
    // (Skip the check if the collision is the seed stub we're about to overwrite.)
    const nameTaken = await prisma.user.findFirst({
      where: {
        username: { equals: username.trim(), mode: 'insensitive' },
        ...(existing ? { NOT: { id: existing.id } } : {}),
      },
    });
    if (nameTaken) {
      return res.status(409).json({ error: 'That pen-name is taken — please choose another.' });
    }

    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    let user;
    if (existing) {
      console.log('🔓 Claiming unclaimed seed account:', existing.id);
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          hasPassword: true,
          username: username.trim(),
          city: (city || '').trim() || existing.city || 'India',
          childAge: normalizeChildAge(childAge) || existing.childAge,
          isVerified: false,
          emailNotifications: true,
        },
      });
    } else {
      console.log('💾 Creating user in database...');
      user = await prisma.user.create({
        data: {
          email: normalEmail,
          passwordHash,
          hasPassword: true,
          // Trim/canonicalize server-side so no messy data enters regardless of client.
          username: username.trim(),
          city: (city || '').trim() || 'India',
          childAge: normalizeChildAge(childAge),
          role: 'MEMBER',
          isVerified: false,
          trustScore: 50, // 0.5 in frontend scale
          savedPosts: [], // Initialize empty array
        },
      });
    }

    console.log('✅ User created:', user.id);

    // Check for JWT_SECRET
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion }, JWT_SECRET, { expiresIn: '30d' });

    // Send welcome email (don't fail signup if email fails)
    try {
      await sendTemplateEmail(
        user.email,
        RESEND_TEMPLATES.WELCOME,
        { USERNAME: displayName(user.username) },
        'WELCOME'
      );
    } catch (emailErr) {
      console.warn('⚠️ Welcome email failed, but signup successful:', emailErr);
    }
    syncResendContact(user.email, user.username);
    nectorRewardSignup(user).catch(err => console.warn('⚠️ Nector signup reward failed:', err));
    notifySignupPointsBonus(user.id).catch(err => console.warn('⚠️ Signup points notification failed:', err));

    console.log('✅ Signup successful');
    res.status(201).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('❌ Signup error:', error);
    next(error);
  }
});

// Security alert for a login from a browser/device we haven't seen for this
// user before — NOT sent on every login (that would be noisy and burn
// through the email quota fast for a forum people check daily). Skips the
// user's very first-ever tracked login too, since everything looks "new"
// then and the welcome email already covers that moment.
async function maybeSendNewDeviceAlert(
  userId: string,
  email: string,
  username: string,
  userAgent: string | undefined,
  ip: string | undefined,
): Promise<void> {
  try {
    const priorLogins = await prisma.loginEvent.findMany({
      where: { userId },
      select: { userAgent: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    if (priorLogins.length === 0) return; // first-ever login — nothing to compare against
    const seenBefore = priorLogins.some(l => l.userAgent === userAgent);
    if (seenBefore) return;

    await sendTemplateEmail(
      email,
      RESEND_TEMPLATES.NEW_DEVICE_LOGIN,
      {
        USERNAME: displayName(username),
        IP: ip || 'unknown',
        DEVICE: (userAgent || 'unknown').slice(0, 120),
      },
      'TRANSACTIONAL'
    );
  } catch (err) {
    console.warn('⚠️ New-device login alert failed:', err);
  }
}

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

    if (isLoginLocked(normalEmail)) {
      console.log('🔒 Login locked for too many failed attempts:', normalEmail);
      return res.status(429).json({ error: 'Too many failed attempts. Please try again in 15 minutes.' });
    }

    const user = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (!user) {
      console.log('❌ User not found');
      recordFailedLogin(normalEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Unclaimed seed stubs have a non-bcrypt marker in passwordHash. bcrypt.compare
    // would return false anyway, but skip it to avoid noisy warnings in logs.
    if (user.passwordHash.startsWith('UNCLAIMED_SEED_')) {
      console.log('❌ Login attempt on unclaimed seed account:', user.id);
      recordFailedLogin(normalEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('🔑 Verifying password...');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log('❌ Invalid password');
      recordFailedLogin(normalEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    clearFailedLogins(normalEmail);
    console.log('✅ Login successful for user:', user.id);
    const token = jwt.sign({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion }, JWT_SECRET, { expiresIn: '30d' });
    maybeSendNewDeviceAlert(user.id, user.email, user.username, req.headers['user-agent'], req.ip)
      .catch(err => console.warn('⚠️ New-device alert check failed:', err));
    prisma.loginEvent.create({
      data: { userId: user.id, method: 'EMAIL', ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    }).catch(err => console.warn('⚠️ Failed to record login event:', err));
    res.status(200).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('❌ Login error:', error);
    next(error);
  }
});

app.get('/api/auth/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Refresh trust score on login so the profile always shows current value
    await recalculateTrustScore(req.userId!);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(formatUser(user));
  } catch (error) {
    next(error);
  }
});

// Forgot password — send reset email
app.post('/api/auth/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Normalize exactly like signup/login store it, otherwise a mixed-case or
    // space-padded address (common on mobile autofill) silently misses and the
    // reset email is never sent — while the UI still shows "sent".
    const normalEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalEmail } });
    // Always return success to prevent email enumeration
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour
    });

    const resetUrl = `${FRONTEND_URL}?reset_token=${token}`;
    await sendTemplateEmail(
      user.email,
      RESEND_TEMPLATES.PASSWORD_RESET,
      { USERNAME: displayName(user.username), RESET_URL: resetUrl }
    );

    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// Reset password — verify token and set new password
app.post('/api/auth/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || Date.now() > record.expiresAt.getTime()) {
      if (record) await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // tokenVersion bump invalidates every token issued before this reset —
    // otherwise a stolen token would outlive the very reset meant to kill it.
    await prisma.user.update({ where: { id: record.userId }, data: { passwordHash, hasPassword: true, tokenVersion: { increment: 1 } } });
    await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});

    res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
});

// Change password — for an already-logged-in user (no email involved). If the
// account has a real password (hasPassword), the current one must be verified
// first, so a leaked/stolen session token alone can't be used to lock the real
// owner out. Accounts that never had a password (Google-only signup or claim)
// skip that check — the live session already proves identity — and this is
// how they set one for the first time.
app.post('/api/users/me/password', authenticate, authLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.hasPassword) {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    // tokenVersion bump invalidates every other token for this account (a
    // stolen session, another device) — but the CURRENT request's own token
    // would also go stale, logging the user out of the very action they just
    // took, so a fresh token for this session is issued below.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, hasPassword: true, tokenVersion: { increment: 1 } },
    });
    const newToken = jwt.sign(
      { userId: updated.id, role: updated.role, tokenVersion: updated.tokenVersion },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({ message: 'Password updated successfully.', token: newToken });
  } catch (error) {
    next(error);
  }
});

// Exchange one-time OAuth code for JWT
app.post('/api/auth/oauth-token', authLimiter, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Missing code' });
    const record = await prisma.oAuthCode.findUnique({ where: { code } });
    if (record) await prisma.oAuthCode.delete({ where: { code } }).catch(() => {}); // single-use
    if (!record || Date.now() > record.expiresAt.getTime()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    res.status(200).json({ token: record.token, isNew: record.isNew });
  } catch (error) {
    next(error);
  }
});

// Google OAuth
app.get('/api/auth/google', authLimiter, (req, res) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    // 'openid' guarantees Google returns an id_token (which verifyIdToken needs);
    // without it we'd occasionally get a callback with no id_token and crash.
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', authLimiter, async (req, res, next) => {
  try {
    const { code } = req.query as { code: string };
    if (!code) return res.redirect(`${FRONTEND_URL}?auth_error=no_code`);

    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token!, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.redirect(`${FRONTEND_URL}?auth_error=invalid_token`);

    const { email: rawEmail, name, sub: googleId } = payload;
    // Normalize to match how email signup/login store & look up addresses, so a
    // Google account and a later email login resolve to the SAME user row.
    const email = String(rawEmail).trim().toLowerCase();

    let user = await prisma.user.findUnique({ where: { email } });
    let isNew = false;
    // Unclaimed seed stub → treat this Google sign-in as the first real claim:
    // overwrite the derived username with the Google display name, mark verified,
    // give it a real (unpredictable) passwordHash so future password-based flows
    // work if they set one via reset.
    if (user && user.passwordHash.startsWith('UNCLAIMED_SEED_')) {
      isNew = true;
      const baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_\-. ]/g, '').slice(0, 28) || 'Parent';
      let username = `${baseUsername}${Math.floor(Math.random() * 900 + 100)}`;
      for (let attempt = 0; attempt < 10; attempt++) {
        const clash = await prisma.user.findFirst({
          where: { username: { equals: username, mode: 'insensitive' }, NOT: { id: user.id } },
        });
        if (!clash) break;
        username = `${baseUsername}${Math.floor(Math.random() * 9000 + 1000)}`;
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          isVerified: true,
          emailNotifications: true,
          passwordHash: await bcrypt.hash(googleId + JWT_SECRET, 10),
          hasPassword: false,
        },
      });
    }
    if (!user) {
      isNew = true;
      const baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_\-. ]/g, '').slice(0, 28) || 'Parent';
      // Find a unique pen-name (usernames are unique). Retry with a fresh suffix
      // on the rare collision.
      let username = `${baseUsername}${Math.floor(Math.random() * 900 + 100)}`;
      for (let attempt = 0; attempt < 10; attempt++) {
        const clash = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
        if (!clash) break;
        username = `${baseUsername}${Math.floor(Math.random() * 9000 + 1000)}`;
      }
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(googleId + JWT_SECRET, 10),
          hasPassword: false,
          username,
          city: 'India',
          isVerified: true,
          trustScore: 50,
          savedPosts: [],
          role: 'MEMBER' as UserRole,
        },
      });
      // Welcome new Google sign-ups too — previously only email/password
      // signups got this, so most members (who join via Google) got nothing.
      // Fire-and-forget: never let a mail hiccup block the login.
      sendTemplateEmail(
        user.email,
        RESEND_TEMPLATES.WELCOME,
        { USERNAME: displayName(user.username) },
        'WELCOME'
      ).catch(err => console.warn('⚠️ Google welcome email failed:', err));
      syncResendContact(user.email, user.username);
      nectorRewardSignup(user).catch(err => console.warn('⚠️ Nector signup reward failed:', err));
      notifySignupPointsBonus(user.id).catch(err => console.warn('⚠️ Signup points notification failed:', err));
    }

    const token = jwt.sign({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion }, JWT_SECRET as string, { expiresIn: '30d' });
    maybeSendNewDeviceAlert(user.id, user.email, user.username, req.headers['user-agent'], req.ip)
      .catch(err => console.warn('⚠️ New-device alert check failed:', err));
    prisma.loginEvent.create({
      data: { userId: user.id, method: 'GOOGLE', ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    }).catch(err => console.warn('⚠️ Failed to record login event:', err));
    // Exchange code pattern: store token server-side, redirect with a one-time code
    const oauthCode = crypto.randomBytes(16).toString('hex');
    await prisma.oAuthCode.create({
      data: { code: oauthCode, token, isNew, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    res.redirect(`${FRONTEND_URL}?oauth_code=${oauthCode}`);
  } catch (error) {
    // A failed token exchange (replayed code, network blip, missing id_token)
    // must land the user back in the app with a message — NOT on a raw JSON 500
    // page. The SPA reads ?auth_error and shows a friendly notice.
    console.error('❌ Google OAuth callback failed:', error);
    return res.redirect(`${FRONTEND_URL}?auth_error=google_failed`);
  }
});

// ------------------------------
// CONVERSATIONS
// ------------------------------

app.get('/api/conversations', optionalAuth, async (req: AuthRequest, res, next) => {
  console.log('📄 Getting conversations...');
  try {
    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    const sort = String(req.query.sort || 'recent');
    console.log('👤 User role:', req.userRole, 'Is mod:', isMod, '| sort:', sort);
    const conversations = await prisma.conversation.findMany({
      where: isMod ? undefined : { moderationStatus: 'APPROVED' },
      include: {
        replies: { orderBy: { id: 'asc' } },
        author: { select: { childAge: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    let ordered = conversations;
    if (sort === 'trending') {
      // Score = votes (recent thread bonus) + replies in last 7 days
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      ordered = [...conversations]
        .map(c => {
          const recentReplies = c.replies.filter(r => r.createdAt && r.createdAt.getTime() >= weekAgo).length;
          const ageDays = (Date.now() - c.createdAt.getTime()) / (24 * 60 * 60 * 1000);
          // Gravity-style decay: votes per day-old + recent reply velocity
          const score = (c.votes + 1) / Math.pow(ageDays + 2, 1.4) + recentReplies * 3;
          return { c, score };
        })
        .sort((a, b) => (a.c.isPinned === b.c.isPinned ? b.score - a.score : (a.c.isPinned ? -1 : 1)))
        .map(x => x.c);
    } else if (sort === 'top') {
      ordered = [...conversations].sort((a, b) =>
        a.isPinned === b.isPinned ? b.votes - a.votes : (a.isPinned ? -1 : 1)
      );
    }

    console.log('✅ Found', ordered.length, 'conversations');
    res.status(200).json(ordered.map(formatConversation));
  } catch (error) {
    console.error('❌ Error getting conversations:', error);
    next(error);
  }
});

// ------------------------------
// S3 UPLOAD (presigned PUT)
// ------------------------------
// Users PUT the image straight to S3 using a short-lived signed URL, then
// post the returned public URL as part of the thread/reply payload. This keeps
// image bytes out of Postgres and out of the API request body entirely.
//
// Requires env: S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
// When any are missing the endpoint returns 503 and the frontend transparently
// falls back to inline base64 storage (which still works for small images).
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'ap-south-1';
const S3_PUBLIC_HOST = process.env.S3_PUBLIC_HOST; // optional CDN/CloudFront host

const s3Client = (S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

// ── Nector loyalty points (signup / post / reply) ───────────────────────────
// Nector identifies people by their own "customer_id", which is ours to
// choose — we use the existing User.id (already a UUID) so no new identity
// mapping is needed. A person must exist there as a "lead" before any
// activity/trigger call can award them points, which is why signup does two
// calls (create lead, then award) while post/reply only need the second —
// the lead was already created at signup time.
const NECTOR_API_KEY = process.env.NECTOR_API_KEY;
const NECTOR_WORKSPACE_ID = process.env.NECTOR_WORKSPACE_ID;
const NECTOR_TRIGGER_SIGNUP = process.env.NECTOR_TRIGGER_SIGNUP;
const NECTOR_TRIGGER_POST = process.env.NECTOR_TRIGGER_POST;
const NECTOR_TRIGGER_REPLY = process.env.NECTOR_TRIGGER_REPLY;
const NECTOR_CONFIGURED = !!(NECTOR_API_KEY && NECTOR_WORKSPACE_ID);

function nectorHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-apikey': NECTOR_API_KEY!,
    'x-workspaceid': NECTOR_WORKSPACE_ID!,
    // Nector only accepts 'web' or 'mobile' here despite docs mentioning a
    // 'unix' value too — confirmed by testing directly against their API
    // ('unix' returns "Source is not valid").
    'x-source': 'web',
  };
}

async function nectorCreateLead(user: { id: string; email: string; username: string }): Promise<void> {
  if (!NECTOR_CONFIGURED) return;
  try {
    const res = await fetch('https://platform.nector.io/api/v2/merchant/leads', {
      method: 'POST',
      headers: nectorHeaders(),
      body: JSON.stringify({
        customer_id: user.id,
        name: user.username,
        metadetail: { email: user.email },
      }),
    });
    if (!res.ok) {
      console.error('Nector lead creation failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Nector lead creation error:', err);
  }
}

async function nectorAwardPoints(customerId: string, triggerId: string | undefined): Promise<void> {
  if (!NECTOR_CONFIGURED || !triggerId) return;
  try {
    const res = await fetch('https://platform.nector.io/api/v2/merchant/activities', {
      method: 'POST',
      headers: nectorHeaders(),
      body: JSON.stringify({ trigger_id: triggerId, customer_id: customerId }),
    });
    if (!res.ok) {
      console.error('Nector award failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Nector award error:', err);
  }
}

// New-signup reward: register the lead first (a person must exist in Nector
// before any trigger can award them anything), then award the signup
// trigger. Always fire-and-forget from call sites — a Nector hiccup must
// never block or fail a signup/post/reply.
async function nectorRewardSignup(user: { id: string; email: string; username: string }): Promise<void> {
  if (!NECTOR_CONFIGURED) return;
  await nectorCreateLead(user);
  await nectorAwardPoints(user.id, NECTOR_TRIGGER_SIGNUP);
}

// Separate from nectorRewardSignup's actual award call (which is
// fire-and-forget and best-effort against a third party) — this always
// tells the new member about the points program, even in the rare case
// the live Nector call above lags or fails, since the message is the same
// either way and shouldn't depend on that request's timing.
async function notifySignupPointsBonus(userId: string): Promise<void> {
  if (!NECTOR_CONFIGURED) return;
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'BADGE',
        title: 'You earned 20 tuco Points! 🎉',
        description: 'Thanks for joining tuco Parents Circle! Keep earning: +10 points for asking a question, +5 points for every reply. Points show up next to your name in the header and on your profile.',
        time: 'Just now',
      },
    });
  } catch (err) {
    console.error('Signup points-bonus notification failed:', err);
  }
}

// Points balance is displayed in the header on every page and in the
// profile — without a short cache, that's a live third-party API call on
// nearly every render. 60s is short enough that a fresh signup/post/reply
// award shows up almost immediately, but long enough to absorb repeat
// header/profile mounts within the same short browsing session.
const nectorBalanceCache = new Map<string, { points: number; expiresAt: number }>();
const NECTOR_BALANCE_CACHE_MS = 60 * 1000;

async function nectorGetBalance(customerId: string): Promise<number | null> {
  if (!NECTOR_CONFIGURED) return null;
  const cached = nectorBalanceCache.get(customerId);
  if (cached && cached.expiresAt > Date.now()) return cached.points;
  try {
    // Nector's lookup path requires SOME syntactically-valid UUID as {id},
    // but customer_id as a query param takes search priority over it — so
    // this resolves by our own User.id without ever needing Nector's
    // internal lead _id.
    const res = await fetch(
      `https://platform.nector.io/api/v2/merchant/leads/${crypto.randomUUID()}?customer_id=${encodeURIComponent(customerId)}`,
      { headers: nectorHeaders() }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const available = body?.data?.item?.available;
    const points = available != null ? Math.floor(Number(available)) : null;
    if (points != null) nectorBalanceCache.set(customerId, { points, expiresAt: Date.now() + NECTOR_BALANCE_CACHE_MS });
    return points;
  } catch (err) {
    console.error('Nector balance lookup failed:', err);
    return null;
  }
}

app.get('/api/users/me/nector-points', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const points = await nectorGetBalance(req.userId!);
    // null means "couldn't reach Nector / not configured", not "0 points" —
    // the frontend should just hide the badge rather than show a wrong 0.
    res.status(200).json({ points });
  } catch (error) {
    next(error);
  }
});

// Allow-list of image mimetypes we sign for. Blocks direct upload of SVGs
// (script vector) and non-images even if the client asks.
const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const presignSchema = z.object({
  contentType: z.string(),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  kind: z.enum(['post', 'reply']).optional(),
});

app.post('/api/uploads/presign', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!s3Client || !S3_BUCKET) {
      return res.status(503).json({ error: 'Uploads not configured on server' });
    }
    const parsed = presignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payload' });
    }
    const { contentType, size, kind } = parsed.data;
    if (!ALLOWED_UPLOAD_MIME.has(contentType)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }
    const ext = EXT_FOR_MIME[contentType];
    const prefix = kind === 'reply' ? 'replies' : 'posts';
    // Random key so users can't overwrite each other's images or guess URLs.
    const key = `${prefix}/${req.userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      // Objects are readable by anyone with the URL — this is a public feed;
      // the images are meant to render inline for logged-out visitors too.
      ACL: 'public-read',
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });

    const publicUrl = S3_PUBLIC_HOST
      ? `${S3_PUBLIC_HOST.replace(/\/$/, '')}/${key}`
      : `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error('❌ Presign failed:', error);
    next(error);
  }
});

const createThreadSchema = z.object({
  // No character minimums — a short title is fine, and the body is optional
  // (title-only or image-only posts are allowed). The max caps are just abuse
  // guards, not user-facing limits.
  title: z.string().trim().min(1, 'Please add a title or question.').max(300),
  category: z.string(),
  city: z.string().optional().default(''),
  text: z.string().max(5000).optional().default(''),
  image: z.string().optional(),
  // Multi-image: max 4 images per post. Older clients still send `image` (single);
  // newer clients send `images` (array). Server accepts either and normalises.
  images: z.array(z.string()).max(4).optional(),
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
    const isInCoolingPeriod = !isMod && accountAgeMs < 24 * 60 * 60 * 1000;

    const { title, category, city, text, image, images, greyAreaFlags, reviewPriority } = parsed.data;
    // Normalise: prefer explicit images array, else wrap single image, else empty.
    const normalizedImages = (images && images.length > 0)
      ? images
      : (image ? [image] : []);
    // opImage stays as the first entry so anything still reading the legacy
    // single-image field keeps working (og:image tags, RSS, old clients).
    const firstImage = normalizedImages[0];
    const requestedStatus = parsed.data.moderationStatus?.toUpperCase();
    // Server-side moderation backstop: don't trust the client's verdict. Run the
    // same analysis here so a direct API call can't bypass it.
    const serverAnalysis = analyzeContent(`${title}\n${text}`, category);
    const serverRejected = serverAnalysis.outcome === 'CLEAR_VIOLATION';
    // Auto-publish policy: posts go live immediately. The ONLY thing that
    // blocks a post is the child-safety backstop — content flagged as a
    // CLEAR_VIOLATION (explicit/harmful patterns) is auto-rejected and never
    // published. Everything else is approved on submission, so nothing sits in
    // a review queue and no post is ever "forgotten". (No length/spam/
    // new-account gating — those used to route posts to PENDING.)
    let autoStatus: 'APPROVED' | 'REJECTED' | 'PENDING';
    let autoReason: string | null = null;
    if (serverRejected || requestedStatus === 'REJECTED') {
      autoStatus = 'REJECTED';
      autoReason = 'Auto-rejected: content matched community-guideline violation patterns.';
    } else {
      autoStatus = 'APPROVED';
      autoReason = 'Auto-approved: published immediately.';
    }
    const status = isMod ? ((requestedStatus as any) || 'PENDING') : autoStatus;

    console.log('💾 Creating conversation in database...');
    const conversation = await prisma.conversation.create({
      data: {
        title,
        category,
        opAuthor: user.username,
        opCity: city,
        opTime: 'Just now',
        opText: text,
        opImage: firstImage,
        opImages: normalizedImages,
        opAuthorRole: user.role,
        opAuthorBadges: (user.badges as any[] || []).map((b: any) => b.type),
        authorId: user.id,
        // Snapshot the author's current child-age so this thread stays tagged
        // to the age it's actually about even when the parent's kid grows.
        childAge: user.childAge || null,
        moderationStatus: status,
        greyAreaFlags: greyAreaFlags || [],
        reviewPriority: isInCoolingPeriod ? 100 : reviewPriority, // Higher priority for cooling period posts
        votes: 1,
      },
      include: { replies: true, author: { select: { childAge: true } } },
    });
    console.log('✅ Conversation created with ID:', conversation.id);

    // Update user post count — but not for rejected posts, so badge/stat math
    // reflects real approved contributions.
    if (status !== 'REJECTED') {
      console.log('📊 Updating user post count...');
      await prisma.user.update({
        where: { id: req.userId },
        data: { postCount: { increment: 1 } },
      });
      nectorAwardPoints(user.id, NECTOR_TRIGGER_POST).catch(err => console.warn('⚠️ Nector post reward failed:', err));
    }

    // Log the auto-decision. Every new thread now leaves an audit trail
    // showing whether the SYSTEM approved/rejected/flagged it and why —
    // even the ones that used to pile up silently as PENDING.
    if (!isMod) {
      const logAction = autoStatus === 'APPROVED' ? 'APPROVED'
        : autoStatus === 'REJECTED' ? 'REJECTED'
        : 'FLAGGED';
      await prisma.moderationLog.create({
        data: {
          moderatorId: 'SYSTEM',
          targetType: 'CONVERSATION',
          targetId: conversation.id,
          action: logAction as any,
          reason: autoReason,
        },
      });
    }

    // On auto-reject, tell the author immediately so they know their post
    // didn't go live. (Auto-approved threads don't need a notification —
    // the post appearing on the feed is the confirmation.)
    if (autoStatus === 'REJECTED' && !isMod) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Your post was rejected',
          description: `"${title.slice(0, 60)}${title.length > 60 ? '…' : ''}" was auto-rejected for violating community guidelines. Please review and try again.`,
          time: 'Just now',
          threadId: conversation.id,
        },
      });
    }

    // Fan-out: notify everyone who follows this author when their post is
    // live. Skip on REJECTED/PENDING so followers don't get pinged about
    // content that never surfaces. Notifications are batched but bounded to
    // 500 fan-outs per post to keep this cheap on hot accounts.
    if (autoStatus === 'APPROVED' && !isMod) {
      try {
        const followers = await prisma.follow.findMany({
          where: { targetUserId: user.id },
          select: { followerId: true },
          take: 500,
        });
        if (followers.length > 0) {
          await prisma.notification.createMany({
            data: followers.map(f => ({
              userId: f.followerId,
              type: 'SYSTEM' as any,
              title: `${user.username} posted a new thread`,
              description: conversation.title.slice(0, 100),
              time: 'Just now',
              threadId: conversation.id,
            })),
            skipDuplicates: true,
          });
        }
      } catch (fanErr) {
        console.error('Follower fan-out failed:', fanErr);
      }
    }

    console.log('✅ Conversation created successfully!');
    res.status(201).json(formatConversation(conversation));
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    next(error);
  }
});

// ------------------------------
// FOLLOW (user ↔ user, user → thread)
// ------------------------------

const followSchema = z.object({
  targetType: z.enum(['user', 'thread']),
  targetId: z.union([z.string(), z.number()]),
});

app.post('/api/follow', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const parsed = followSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid follow payload' });
    const { targetType, targetId } = parsed.data;
    if (targetType === 'user') {
      if (String(targetId) === req.userId) return res.status(400).json({ error: 'Cannot follow yourself' });
      const target = await prisma.user.findUnique({ where: { id: String(targetId) }, select: { id: true } });
      if (!target) return res.status(404).json({ error: 'User not found' });
      await prisma.follow.upsert({
        where: { followerId_targetUserId: { followerId: req.userId!, targetUserId: String(targetId) } },
        update: {},
        create: { followerId: req.userId!, targetUserId: String(targetId) },
      });
    } else {
      const convId = typeof targetId === 'number' ? targetId : parseInt(String(targetId));
      if (Number.isNaN(convId)) return res.status(400).json({ error: 'Invalid thread id' });
      const target = await prisma.conversation.findUnique({ where: { id: convId }, select: { id: true } });
      if (!target) return res.status(404).json({ error: 'Thread not found' });
      await prisma.follow.upsert({
        where: { followerId_targetConversationId: { followerId: req.userId!, targetConversationId: convId } },
        update: {},
        create: { followerId: req.userId!, targetConversationId: convId },
      });
    }
    res.status(200).json({ success: true, following: true });
  } catch (error) { next(error); }
});

app.delete('/api/follow', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const parsed = followSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid follow payload' });
    const { targetType, targetId } = parsed.data;
    if (targetType === 'user') {
      await prisma.follow.deleteMany({
        where: { followerId: req.userId!, targetUserId: String(targetId) },
      });
    } else {
      const convId = typeof targetId === 'number' ? targetId : parseInt(String(targetId));
      if (Number.isNaN(convId)) return res.status(400).json({ error: 'Invalid thread id' });
      await prisma.follow.deleteMany({
        where: { followerId: req.userId!, targetConversationId: convId },
      });
    }
    res.status(200).json({ success: true, following: false });
  } catch (error) { next(error); }
});

// What the caller follows — used by the client to show filled follow buttons
// on threads/profiles they already follow.
app.get('/api/follows/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: req.userId! },
      select: { targetUserId: true, targetConversationId: true },
    });
    res.status(200).json({
      users: follows.map(f => f.targetUserId).filter(Boolean),
      threads: follows.map(f => f.targetConversationId).filter(x => x != null),
    });
  } catch (error) { next(error); }
});

app.get('/api/follows/thread/:id/count', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid thread id' });
    const count = await prisma.follow.count({ where: { targetConversationId: id } });
    res.status(200).json({ count });
  } catch (error) { next(error); }
});

app.patch('/api/conversations/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid conversation id' });
    }
    const { votes, views, isPinned, isFeatured, featuredLabel, isWeeklyHighlight, moderationStatus, moderationReason, moderatedBy } = req.body;

    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';

    const wantsModChange =
      moderationStatus !== undefined || isPinned !== undefined || isFeatured !== undefined ||
      featuredLabel !== undefined || isWeeklyHighlight !== undefined || votes !== undefined ||
      moderationReason !== undefined || moderatedBy !== undefined;

    // View counting is server-side only: opening a thread fires a +1. We ignore the
    // client-supplied `views` number (advisory) and increment in the DB instead.
    // Use updateMany so a stale/deleted thread id that isn't in the DB no-ops cleanly
    // (count 0) rather than throwing Prisma P2025 — the old prisma.update() threw on
    // every open of such a thread and spammed the error log (e.g. /api/conversations/1).
    if (views !== undefined && !wantsModChange) {
      await prisma.conversation.updateMany({
        where: { id },
        data: { views: { increment: 1 } },
      });
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: { replies: true, author: { select: { childAge: true } } },
      });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      return res.status(200).json(formatConversation(conversation));
    }

    // Mod-only fields
    if (wantsModChange && !isMod) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    const updateData: any = {};
    if (votes !== undefined && isMod) updateData.votes = votes;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (featuredLabel !== undefined) updateData.featuredLabel = featuredLabel;
    if (isWeeklyHighlight !== undefined) updateData.isWeeklyHighlight = isWeeklyHighlight;
    if (moderationStatus) updateData.moderationStatus = moderationStatus.toUpperCase();
    if (moderationReason) updateData.moderationReason = moderationReason;
    if (moderatedBy) updateData.moderatedBy = moderatedBy;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: { replies: true, author: { select: { childAge: true } } },
    });

    // Log moderation action to ModerationLog table
    if (moderationStatus && req.userId) {
      const action = moderationStatus.toUpperCase() as any;
      await prisma.moderationLog.create({
        data: {
          moderatorId: req.userId,
          targetType: 'CONVERSATION',
          targetId: id,
          action,
          reason: moderationReason || null,
        },
      });
    }

    // If a thread gets rejected, purge the follower-fanout "posted a new
    // thread" notifications generated for it. Otherwise followers keep seeing
    // cards that link to a thread the server now hides.
    //
    // Scope precisely: match the fanout by its title suffix rather than every
    // SYSTEM notification for this thread. The broad filter also matched
    // "<user> mentioned you" notifications (same type + threadId), which are
    // legitimate and must survive a rejection. The author's own moderation
    // notification is likewise untouched (its title is "Your post was …").
    if (moderationStatus?.toLowerCase() === 'rejected') {
      await prisma.notification.deleteMany({
        where: {
          threadId: id,
          type: 'SYSTEM',
          title: { endsWith: 'posted a new thread' },
          NOT: { userId: conversation.authorId }, // extra guard: never touch the author's notifs
        },
      });
    }

    // If approved or rejected, send notification and email to author
    if (moderationStatus?.toLowerCase() === 'approved' || moderationStatus?.toLowerCase() === 'rejected') {
      const author = await prisma.user.findUnique({ where: { id: conversation.authorId } });
      if (author) {
        // Create notification
        await prisma.notification.create({
          data: {
            userId: author.id,
            type: 'SYSTEM',
            title: moderationStatus?.toLowerCase() === 'approved'
              ? 'Your post is live!'
              : 'Your post was rejected',
            description: moderationStatus?.toLowerCase() === 'approved'
              ? `Your post "${conversation.title.slice(0, 40)}${conversation.title.length > 40 ? '...' : ''}" has been approved and is now live.`
              : `Your post "${conversation.title.slice(0, 40)}${conversation.title.length > 40 ? '...' : ''}" was rejected. Reason: ${moderationReason || 'Not specified'}`,
            time: 'Just now',
            threadId: id,
          },
        });

        // Send email
        await sendEmail(
          author.email,
          moderationStatus?.toLowerCase() === 'approved'
            ? `✅ Your post is live: ${conversation.title.slice(0, 40)}`
            : `❌ Your post was rejected: ${conversation.title.slice(0, 40)}`,
          moderationStatus?.toLowerCase() === 'approved'
            ? `<h2>Great news, ${escapeHtml(author.username)}!</h2><p>Your post "<strong>${escapeHtml(conversation.title)}</strong>" has been approved and is now live on tuco Parents Circle.</p><p><a href="${process.env.FRONTEND_URL || ''}">View it in the community</a></p>`
            : `<h2>Hi ${escapeHtml(author.username)},</h2><p>Your post "<strong>${escapeHtml(conversation.title)}</strong>" has been rejected.</p><p><strong>Reason:</strong> ${escapeHtml(moderationReason || 'Not specified')}</p><p>If you have questions, please contact our moderation team.</p>`,
          'MODERATION'
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
  text: z.string().trim().min(1, 'Please write a reply.').max(3000),
  city: z.string().optional().default(''),
  image: z.string().optional(),
  images: z.array(z.string()).max(4).optional(),
  parentId: z.number().optional(),
});

app.post('/api/conversations/:id/replies', authenticate, actionLimiter, async (req: AuthRequest, res, next) => {
  console.log('💬 Adding reply to conversation:', req.params.id);
  try {
    const conversationId = parseInt(req.params.id);
    if (Number.isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }
    console.log('📝 Parsing reply data...');
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      console.log('❌ Reply validation failed:', firstError);
      return res.status(400).json({ error: firstError?.message || 'Validation failed' });
    }

    // Check the thread exists before we hand off to Prisma. Without this a
    // missing/deleted thread bubbles up as a foreign-key crash returning 500;
    // now we return a clean 404 the client can surface.
    const thread = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    console.log('👤 Finding user:', req.userId);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const { text, city, image, images, parentId } = parsed.data;
    const normalizedReplyImages = (images && images.length > 0) ? images : (image ? [image] : []);
    const firstReplyImage = normalizedReplyImages[0];

    // Server-side moderation backstop: block clear violations even on a direct
    // API call (the browser check can be bypassed). Clean replies are approved
    // immediately so they show; there is no separate reply-review queue.
    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    if (!isMod && analyzeContent(text, 'general').outcome === 'CLEAR_VIOLATION') {
      return res.status(400).json({ error: 'Your reply was rejected due to community guidelines. Please revise it.' });
    }

    console.log('💾 Creating reply in database...');
    const reply = await prisma.reply.create({
      data: {
        conversationId,
        author: user.username,
        authorId: user.id,
        city,
        time: 'Just now',
        text,
        image: firstReplyImage,
        images: normalizedReplyImages,
        parentId,
        moderationStatus: 'APPROVED',
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
    nectorAwardPoints(user.id, NECTOR_TRIGGER_REPLY).catch(err => console.warn('⚠️ Nector reply reward failed:', err));

    // Notify thread author
    console.log('🔍 Finding conversation...');
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    const threadUrl = `${SITE_URL}/thread/${conversationId}`;
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
      // Email the OP if they have a valid email and haven't opted out
      const opUser = await prisma.user.findUnique({ where: { id: conversation.authorId } });
      if (opUser?.email && opUser.email !== SYSTEM_USER_EMAIL && opUser.emailNotifications !== false) {
        const preview = text.length > 240 ? text.slice(0, 240) + '…' : text;
        sendEmail(
          opUser.email,
          `${user.username} replied to your thread`,
          emailLayout(
            `${user.username} replied to your thread`,
            `Someone responded to <strong>"${escapeHtml(conversation.title)}"</strong> on tuco Parents Circle.`,
            'Read the reply',
            threadUrl,
            `<blockquote style="border-left: 3px solid #35B5EC; padding: 8px 14px; margin: 16px 0; color: #555; background: #f7fbfd;">${escapeHtml(preview)}</blockquote>`
          ),
          'REPLY_NOTIFICATION'
        ).catch(err => console.error('Reply email failed:', err));
      }
    }

    // Notify parent reply author if it's a nested reply
    if (parentId) {
      const parentReply = await prisma.reply.findUnique({ where: { id: parentId } });
      if (parentReply && parentReply.authorId !== req.userId) {
        console.log('🔔 Creating notification for parent reply author...');
        await prisma.notification.create({
          data: {
            userId: parentReply.authorId,
            type: 'REPLY',
            title: 'New reply to your comment',
            description: `${user.username} replied to your comment`,
            time: 'Just now',
            threadId: conversationId,
          },
        });
        const parentUser = await prisma.user.findUnique({ where: { id: parentReply.authorId } });
        if (parentUser?.email && parentUser.email !== SYSTEM_USER_EMAIL && parentUser.emailNotifications !== false) {
          const preview = text.length > 240 ? text.slice(0, 240) + '…' : text;
          sendEmail(
            parentUser.email,
            `${user.username} replied to your comment`,
            emailLayout(
              `${user.username} replied to your comment`,
              `Someone responded to your comment on tuco Parents Circle.`,
              'Read the reply',
              threadUrl,
              `<blockquote style="border-left: 3px solid #35B5EC; padding: 8px 14px; margin: 16px 0; color: #555; background: #f7fbfd;">${escapeHtml(preview)}</blockquote>`
            ),
            'REPLY_NOTIFICATION'
          ).catch(err => console.error('Nested reply email failed:', err));
        }
      }
    }

    // Parse @mentions and notify (in-app + email) the tagged users (max 5 per reply to avoid abuse).
    // Usernames may contain Unicode letters, spaces and apostrophes (e.g. Google
    // names like "Priya Sharma542"), so a fixed ASCII regex can't capture them.
    // Grab the run of text after each '@', then resolve it to a real account by
    // trying the longest matching username first (multi-word → single word).
    const mentionCandidates = Array.from(text.matchAll(/@([\p{L}\p{N}_.'’ \-]{2,40})/gu))
      .map(m => m[1])
      .slice(0, 10);
    const notifiedIds = new Set<string>();
    if (conversation) notifiedIds.add(conversation.authorId);
    if (parentId) {
      const p = await prisma.reply.findUnique({ where: { id: parentId }, select: { authorId: true } });
      if (p) notifiedIds.add(p.authorId);
    }
    notifiedIds.add(req.userId!);
    let mentionCount = 0;
    for (const cand of mentionCandidates) {
      if (mentionCount >= 5) break;
      const words = cand.trim().split(/\s+/);
      let mentioned: Awaited<ReturnType<typeof prisma.user.findFirst>> = null;
      for (let n = Math.min(words.length, 4); n >= 1; n--) {
        const uname = words.slice(0, n).join(' ');
        if (uname.length < 2) continue;
        mentioned = await prisma.user.findFirst({ where: { username: { equals: uname, mode: 'insensitive' } } });
        if (mentioned) break;
      }
      if (!mentioned || notifiedIds.has(mentioned.id)) continue;
      notifiedIds.add(mentioned.id);
      mentionCount++;
      await prisma.notification.create({
        data: {
          userId: mentioned.id,
          type: 'SYSTEM',
          title: `${user.username} mentioned you`,
          description: `${user.username} mentioned you in "${conversation?.title || 'a thread'}"`,
          time: 'Just now',
          threadId: conversationId,
        },
      });
      if (mentioned.email && mentioned.email !== SYSTEM_USER_EMAIL && mentioned.emailNotifications !== false) {
        const preview = text.length > 240 ? text.slice(0, 240) + '…' : text;
        sendEmail(
          mentioned.email,
          `${user.username} mentioned you on tuco Parents Circle`,
          emailLayout(
            `${user.username} mentioned you`,
            `You were tagged in a reply on <strong>"${escapeHtml(conversation?.title || 'a thread')}"</strong>.`,
            'View the mention',
            threadUrl,
            `<blockquote style="border-left: 3px solid #35B5EC; padding: 8px 14px; margin: 16px 0; color: #555; background: #f7fbfd;">${escapeHtml(preview)}</blockquote>`
          ),
          'REPLY_NOTIFICATION'
        ).catch(err => console.error('Mention email failed:', err));
      }
    }

    // Fan-out to thread followers: notify everyone who chose to follow this
    // thread (except the replier themselves, and skipping the OP + parent
    // reply authors who already got their own dedicated notifications above
    // so they aren't double-pinged).
    if (conversation) {
      try {
        const threadFollowers = await prisma.follow.findMany({
          where: {
            targetConversationId: conversationId,
            NOT: { followerId: req.userId! },
          },
          select: { followerId: true },
          take: 500,
        });
        // notifiedIds was built above to hold OP + parent-reply author + self
        // for the mention loop; reuse it to avoid double-notifying.
        const toNotify = threadFollowers
          .map(f => f.followerId)
          .filter(fid => !notifiedIds.has(fid));
        if (toNotify.length > 0) {
          await prisma.notification.createMany({
            data: toNotify.map(uid => ({
              userId: uid,
              type: 'REPLY' as any,
              title: 'New reply in a thread you follow',
              description: `${user.username}: ${text.slice(0, 100)}`,
              time: 'Just now',
              threadId: conversationId,
            })),
            skipDuplicates: true,
          });
        }
      } catch (fanErr) {
        console.error('Thread-follower fan-out failed:', fanErr);
      }
    }

    // Recalculate trust score for conversation author (engagement signal) and replier (reply count signal)
    if (conversation) recalculateTrustScore(conversation.authorId);
    recalculateTrustScore(req.userId!);

    console.log('✅ Reply added successfully!');
    res.status(201).json({
      id: reply.id,
      author: reply.author,
      city: reply.city,
      time: formatRelativeTime(reply.createdAt),
      createdAt: reply.createdAt ? reply.createdAt.toISOString() : new Date().toISOString(),
      text: reply.text,
      image: reply.image,
      images: (reply.images && reply.images.length > 0) ? reply.images : (reply.image ? [reply.image] : []),
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
    const { text, moderationStatus, moderationReason } = req.body;

    const reply = await prisma.reply.findUnique({ where: { id } });
    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const isMod = req.userRole === 'MODERATOR' || req.userRole === 'TUCO_TEAM';
    // Was `if (text && ...)` — a truthiness check, so text: '' (falsy) skipped
    // the ownership check entirely while still reaching the update below,
    // letting any authenticated user blank out anyone else's reply.
    if (text !== undefined && reply.authorId !== req.userId && !isMod) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (text !== undefined && (typeof text !== 'string' || text.trim().length === 0 || text.length > 5000)) {
      return res.status(400).json({ error: 'Reply text must be 1-5000 characters' });
    }

    // likes are managed exclusively via /api/votes, never accepted here —
    // this endpoint previously let any authenticated user set an arbitrary
    // like count on any reply.
    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (moderationStatus && isMod) updateData.moderationStatus = moderationStatus.toUpperCase();

    const updated = await prisma.reply.update({
      where: { id },
      data: updateData,
    });

    // Log moderation action for replies
    if (moderationStatus && isMod && req.userId) {
      const action = moderationStatus.toUpperCase() as any;
      await prisma.moderationLog.create({
        data: {
          moderatorId: req.userId,
          targetType: 'REPLY',
          targetId: id,
          action,
          reason: moderationReason || null,
        },
      });
    }

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

app.post('/api/votes', authenticate, actionLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { conversationId, replyId, type } = req.body;
    if (!conversationId && !replyId) {
      return res.status(400).json({ error: 'conversationId or replyId required' });
    }
    if (type !== 'UP' && type !== 'DOWN') {
      return res.status(400).json({ error: "type must be 'UP' or 'DOWN'" });
    }
    // Without this, voting on a deleted/nonexistent thread or reply reaches
    // Prisma's create() below and fails with a raw foreign-key-constraint
    // error, surfacing as an opaque 500 instead of a clean 404.
    if (conversationId) {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true } });
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    }
    if (replyId) {
      const reply = await prisma.reply.findUnique({ where: { id: replyId }, select: { id: true } });
      if (!reply) return res.status(404).json({ error: 'Reply not found' });
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
        } else if (replyId && type === 'UP') {
          // If it was an UP vote, decrement reply likes
          await prisma.reply.update({
            where: { id: replyId },
            data: { likes: { decrement: 1 } },
          });
        }
        // Recalculate trust for author after un-vote
        if (conversationId) {
          const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { authorId: true } });
          if (conv) recalculateTrustScore(conv.authorId);
        } else if (replyId) {
          const reply = await prisma.reply.findUnique({ where: { id: replyId }, select: { authorId: true } });
          if (reply) recalculateTrustScore(reply.authorId);
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
        } else if (replyId) {
          const oldTypeWasUp = existingVote.type === 'UP';
          const newTypeIsUp = type === 'UP';
          if (oldTypeWasUp && !newTypeIsUp) {
            await prisma.reply.update({ where: { id: replyId }, data: { likes: { decrement: 1 } } });
          } else if (!oldTypeWasUp && newTypeIsUp) {
            await prisma.reply.update({ where: { id: replyId }, data: { likes: { increment: 1 } } });
          }
        }
        // Recalculate trust for author after flip
        if (conversationId) {
          const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { authorId: true } });
          if (conv) recalculateTrustScore(conv.authorId);
        } else if (replyId) {
          const reply = await prisma.reply.findUnique({ where: { id: replyId }, select: { authorId: true } });
          if (reply) recalculateTrustScore(reply.authorId);
        }
        return res.status(200).json({ action: 'flipped', type });
      }
    }

    // New vote. The unique constraint on (userId, conversationId)/(userId, replyId)
    // stops a rapid double-click or two tabs from creating duplicate rows and
    // permanently inflating the count. If the race is lost, the vote already
    // exists — treat it as a no-op success instead of erroring.
    try {
      await prisma.vote.create({
        data: {
          userId: req.userId!,
          conversationId: conversationId || null,
          replyId: replyId || null,
          type,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return res.status(200).json({ action: 'set', type, deduped: true });
      }
      throw e;
    }

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
      if (type === 'UP') {
        await prisma.reply.update({
          where: { id: replyId },
          data: { likes: { increment: 1 } },
        });
      }
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

    // Recalculate trust score for the content author (fire-and-forget)
    if (type === 'UP') {
      if (conversationId) {
        const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { authorId: true } });
        if (conv) recalculateTrustScore(conv.authorId);
      } else if (replyId) {
        const reply = await prisma.reply.findUnique({ where: { id: replyId }, select: { authorId: true } });
        if (reply) recalculateTrustScore(reply.authorId);
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

app.post('/api/notifications', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { type, title, description } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title are required' });
    const notification = await prisma.notification.create({
      data: {
        userId: req.userId!,
        type: type.toUpperCase(),
        title,
        description: description || '',
        time: 'Just now',
        read: false,
      },
    });
    res.status(201).json({ id: notification.id });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/notifications/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.updateMany({ where: { id, userId: req.userId }, data: { read: true } });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notifications', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.userId } });
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
    const { username, city, childAge, emailNotifications, savedPosts, role, interests } = req.body;

    const updateData: any = {};
    if (username) {
      const trimmed = String(username).trim();
      // Keep pen-names unique (case-insensitive), ignoring the user's own row.
      const taken = await prisma.user.findFirst({
        where: { username: { equals: trimmed, mode: 'insensitive' }, id: { not: req.userId } },
      });
      if (taken) {
        return res.status(409).json({ error: 'That pen-name is taken — please choose another.' });
      }
      updateData.username = trimmed;
    }
    if (city) updateData.city = String(city).trim() || 'India';
    if (childAge !== undefined) updateData.childAge = normalizeChildAge(childAge);
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (savedPosts !== undefined) updateData.savedPosts = savedPosts;
    if (Array.isArray(interests)) {
      // Only accept known category IDs so a bad client can't stuff arbitrary
      // strings into the personalisation signal. Deduped and capped at 6.
      const VALID_INTERESTS = new Set([
        'active_kids', 'school', 'skincare', 'parenting_hacks', 'kids_growth',
      ]);
      updateData.interests = Array.from(new Set(
        interests.map(String).filter(v => VALID_INTERESTS.has(v))
      )).slice(0, 6);
    }
    // trustScore, badges, postCount, replyCount, totalUpvotes are server-managed only

    // Only TUCO_TEAM may change roles, and only via the admin endpoint for OTHER
    // users. A moderator must not be able to self-escalate through their own
    // profile update, so role changes here are restricted to TUCO_TEAM.
    if (role && req.userRole === 'TUCO_TEAM') {
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

// Public profile by username — used by /u/:username pages.
// Returns safe public fields + the user's approved threads.
// Also serves seed-data authors who appear as opAuthor strings but
// don't have their own User row (so profile links don't dead-end).
app.get('/api/users/by-username/:username', async (req, res, next) => {
  try {
    const username = req.params.username;

    // Primary path: real registered user
    const user = await prisma.user.findFirst({
      where: { username },
      select: {
        id: true, username: true, city: true, role: true, badges: true,
        createdAt: true, postCount: true, replyCount: true, totalUpvotes: true, trustScore: true,
      },
    });

    if (user) {
      const threads = await prisma.conversation.findMany({
        where: { authorId: user.id, moderationStatus: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { replies: { select: { id: true } } },
      });
      return res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          city: user.city,
          role: mapRole(user.role),
          badges: user.badges || [],
          createdAt: user.createdAt.toISOString(),
          postCount: user.postCount,
          replyCount: user.replyCount,
          totalUpvotes: user.totalUpvotes,
          trustScore: user.trustScore / 100,
        },
        threads: threads.map(t => ({
          id: t.id,
          title: t.title,
          category: t.category,
          votes: t.votes,
          views: t.views,
          replyCount: t.replies.length,
          createdAt: t.createdAt.toISOString(),
        })),
      });
    }

    // Fallback: synthesise a profile from seeded threads that bear this opAuthor
    const seedThreads = await prisma.conversation.findMany({
      where: { opAuthor: username, moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { replies: { select: { id: true } } },
    });
    if (seedThreads.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalVotes = seedThreads.reduce((sum, t) => sum + (t.votes || 0), 0);
    return res.status(200).json({
      user: {
        id: `seed-${username}`,
        username,
        city: seedThreads[0].opCity || 'India',
        role: 'MEMBER',
        badges: [],
        createdAt: seedThreads[seedThreads.length - 1].createdAt.toISOString(),
        postCount: seedThreads.length,
        replyCount: 0,
        totalUpvotes: totalVotes,
        trustScore: 0.5,
      },
      threads: seedThreads.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        votes: t.votes,
        views: t.views,
        replyCount: t.replies.length,
        createdAt: t.createdAt.toISOString(),
      })),
    });
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

app.post('/api/chat', chatLimiter, optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { messages } = req.body;
    // Without this, a missing/empty messages array reaches
    // messages[messages.length - 1] below and throws a raw TypeError
    // instead of a clean validation error.
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    const client = getAnthropicClient();

    // Persistence layer: every chat turn is written to ChatMessage so the
    // admin panel and audits can see what users are asking. Guests get no
    // session (they don't have a user id), so their turns are still handled
    // but not persisted. Previously ChatMessage sat empty even for members.
    let sessionId: string | null = null;
    if (req.userId) {
      const existing = await prisma.chatSession.findFirst({
        where: { userId: req.userId },
        orderBy: { lastActive: 'desc' },
      });
      const stale = existing && (Date.now() - existing.lastActive.getTime()) > 60 * 60 * 1000;
      if (existing && !stale) {
        sessionId = existing.id;
        await prisma.chatSession.update({ where: { id: existing.id }, data: { lastActive: new Date() } });
      } else {
        const created = await prisma.chatSession.create({ data: { userId: req.userId } });
        sessionId = created.id;
      }
      const lastUserMsg = messages[messages.length - 1];
      if (sessionId && lastUserMsg?.role === 'user' && typeof lastUserMsg?.content === 'string') {
        await prisma.chatMessage.create({
          data: { sessionId, role: 'USER', content: lastUserMsg.content.slice(0, 4000) },
        }).catch(err => console.error('ChatMessage user write failed:', err));
      }
    }

    let content: string;
    if (!client) {
      const userMessage = (messages[messages.length - 1]?.content || '').toLowerCase();
      let mockReply = "I'm currently in testing mode. How can I help you today?";
      if (userMessage.match(/hi|hello|hey/)) mockReply = "Hello! 👋 I'm your tuco Parenting Assistant. How can I help?";
      else if (userMessage.match(/sunscreen|spf|skin|rash|eczema|moisturizer/)) mockReply = "For skincare, we recommend natural, paraben-free products. Check the Skincare category in our forum!";
      else if (userMessage.match(/eat|food|tiffin|nutrition/)) mockReply = "Nutrition is key! Try involving kids in cooking. Check Parenting Hacks for tiffin ideas.";
      else if (userMessage.match(/sleep|bedtime|tantrum/)) mockReply = "A consistent bedtime routine helps. You'll find great tips in Kids & Growth.";
      else if (userMessage.match(/school|homework|exam/)) mockReply = "Check our School & Learning category for parent-shared experiences.";
      content = mockReply;
    } else {
      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages,
        system: `You are the tuco Parenting Assistant for the "tuco Parents Circle" community — a supportive forum for Indian parents to share advice on skincare, nutrition, activities, and general parenting. Be warm, concise, and helpful.`,
      });
      content = response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not process that.';
    }

    if (sessionId) {
      await prisma.chatMessage.create({
        data: { sessionId, role: 'ASSISTANT', content: content.slice(0, 4000) },
      }).catch(err => console.error('ChatMessage assistant write failed:', err));
    }

    res.status(200).json({ content });
  } catch (error) {
    next(error);
  }
});

// ------------------------------
// REPORTS & MODERATION LOGS
// ------------------------------

app.post('/api/reports', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const normalizedType = targetType === 'thread' ? 'CONVERSATION' : 'REPLY';
    const targetIdNum = parseInt(targetId);
    // Guard a non-numeric id: parseInt(...) → NaN previously reached Prisma and
    // threw a 500 instead of a clean validation error.
    if (Number.isNaN(targetIdNum)) {
      return res.status(400).json({ error: 'Invalid report target' });
    }
    // Dedup: one open flag per reporter per target, so a user can't spam the
    // moderation log by reporting the same item repeatedly.
    const existing = await prisma.moderationLog.findFirst({
      where: {
        moderatorId: req.userId!,
        targetType: normalizedType,
        targetId: targetIdNum,
        action: 'FLAGGED',
      },
    });
    if (existing) {
      return res.status(200).json({ success: true, alreadyReported: true });
    }
    await prisma.moderationLog.create({
      data: {
        moderatorId: req.userId!,
        targetType: normalizedType,
        targetId: targetIdNum,
        action: 'FLAGGED',
        reason: `${reason}: ${details}`,
      },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/moderation-logs', authenticate, requireModerator, async (req: AuthRequest, res, next) => {
  try {
    const logs = await prisma.moderationLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.status(200).json(logs);
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
// ADMIN API
// ------------------------------

function requireAdmin(req: AuthRequest, res: any, next: any) {
  // Admin endpoints include changing user roles and deleting users, so they are
  // restricted to TUCO_TEAM only. Previously MODERATOR passed too, which let a
  // moderator self-escalate to TUCO_TEAM or delete members. Moderators do
  // content moderation via requireModerator, not user management.
  if (req.userRole !== 'TUCO_TEAM') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Stats dashboard
app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [users, conversations, replies, pending, votes, notifications] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.reply.count(),
      prisma.conversation.count({ where: { moderationStatus: 'PENDING' } }),
      prisma.vote.count(),
      prisma.notification.count(),
    ]);
    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });
    res.json({ users, conversations, replies, pending, votes, notifications, recentUsers });
  } catch (error) { next(error); }
});

// All users (admin view)
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, email: true, city: true, role: true,
        createdAt: true, isVerified: true, postCount: true, replyCount: true,
        totalUpvotes: true, trustScore: true, badges: true, childAge: true,
        emailNotifications: true,
        _count: { select: { conversations: true, replies: true, votes: true } },
      },
    });
    res.json(users.map(u => ({ ...u, trustScore: u.trustScore / 100 })));
  } catch (error) { next(error); }
});

// Update user (role, ban, etc.)
app.patch('/api/admin/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { role, isVerified, trustScore } = req.body;
    const data: any = {};
    if (role) data.role = mapRoleToDb(role);
    if (isVerified !== undefined) data.isVerified = isVerified;
    if (trustScore !== undefined) data.trustScore = Math.round(trustScore * 100);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(formatUser(user));
  } catch (error) { next(error); }
});

// Delete user
app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { email: true } });
    if (target?.email === 'seed@tucokids.internal') return res.status(400).json({ error: 'Cannot delete the seed user' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// All conversations (admin — includes all statuses)
app.get('/api/admin/conversations', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { replies: true, votesRelation: true } } },
    });
    res.json(conversations.map(c => ({
      id: c.id, title: c.title, category: c.category,
      moderationStatus: c.moderationStatus.toLowerCase(),
      isPinned: c.isPinned, isFeatured: c.isFeatured,
      votes: c.votes, views: c.views, createdAt: c.createdAt,
      authorId: c.authorId, opAuthor: c.opAuthor,
      replyCount: c._count.replies, voteCount: c._count.votesRelation,
      greyAreaFlags: c.greyAreaFlags, reviewPriority: c.reviewPriority,
    })));
  } catch (error) { next(error); }
});

// All replies (admin)
app.get('/api/admin/replies', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const replies = await prisma.reply.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, author: true, authorId: true, text: true, likes: true,
        createdAt: true, moderationStatus: true, conversationId: true,
        conversation: { select: { title: true } },
      },
    });
    res.json(replies.map(r => ({
      ...r,
      moderationStatus: r.moderationStatus.toLowerCase(),
      conversationTitle: r.conversation?.title,
    })));
  } catch (error) { next(error); }
});

// Delete reply (admin)
app.delete('/api/admin/replies/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.reply.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// Moderation logs
app.get('/api/admin/logs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const logs = await prisma.moderationLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
    res.json(logs);
  } catch (error) { next(error); }
});

// ------------------------------
// FRONTEND FALLBACK
// ------------------------------

// ── SEO: robots.txt ────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(
    `User-agent: *\nAllow: /\nSitemap: ${FRONTEND_URL}/sitemap.xml\n`
  );
});

// ── Trust score recalculation ───────────────────────────────────────────────
// Score breakdown (0–100):
//   upvotes on posts          × 2   capped at 25
//   likes on replies          × 1.5 capped at 20
//   replies received on posts × 1   capped at 20
//   approved post count       × 3   capped at 15
//   own reply count           × 0.5 capped at 10
//   account age (days/30 × 2)       capped at 10
async function recalculateTrustScore(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Upvotes on conversations
    const postUpvotes = await prisma.vote.count({
      where: {
        type: 'UP',
        conversation: { authorId: userId },
        userId: { not: userId },
      },
    });

    // Likes on replies
    const replyLikes = await prisma.reply.aggregate({
      where: { authorId: userId },
      _sum: { likes: true },
    });
    const totalReplyLikes = replyLikes._sum.likes || 0;

    // Replies received on user's posts (by others)
    const repliesReceived = await prisma.reply.count({
      where: {
        conversation: { authorId: userId },
        authorId: { not: userId },
        parentId: null,
      },
    });

    // Approved post count
    const approvedPosts = await prisma.conversation.count({
      where: { authorId: userId, moderationStatus: 'APPROVED' },
    });

    // Own reply count
    const ownReplies = user.replyCount || 0;

    // Account age in days
    const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);

    const score =
      Math.min(postUpvotes * 2, 25) +
      Math.min(totalReplyLikes * 1.5, 20) +
      Math.min(repliesReceived * 1, 20) +
      Math.min(approvedPosts * 3, 15) +
      Math.min(ownReplies * 0.5, 10) +
      Math.min((ageDays / 30) * 2, 10);

    const newScore = Math.min(Math.round(score), 100);

    // Persist total upvotes RECEIVED (thread upvotes + reply likes). This column
    // was never written before, so every profile showed 0 and upvote-gated
    // badges could never be earned.
    const totalUpvotes = postUpvotes + totalReplyLikes;

    // Award any newly-earned badges from real server data (postCount is the
    // approved-post count kept in sync elsewhere). Existing badges are kept.
    const currentBadges = Array.isArray(user.badges) ? (user.badges as any[]) : [];
    const earnedTypes = new Set(currentBadges.map(b => b?.type).filter(Boolean));
    const badges = [...currentBadges];
    for (const [type, c] of Object.entries(BADGE_CRITERIA)) {
      if (earnedTypes.has(type)) continue;
      if ((user.postCount || 0) >= c.threads && totalUpvotes >= c.upvotes && ageDays >= c.days) {
        badges.push({ type, earnedAt: new Date().toISOString() });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { trustScore: newScore, totalUpvotes, badges },
    });
  } catch {
    // non-critical — do not surface to caller
  }
}

// ── HTML entity encoder for SSR templates ──────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── SEO: shared head fragment used by every bot-facing HTML response ────────
// Google reads the schema.org Organization "logo" field to decide which
// favicon to show next to the domain in search results. Without it Google
// falls back to a generic globe (which is what the site showed before).
// Also includes proper favicon links + og/twitter image so shares render
// with the logo instead of a blank preview.
function seoHead(opts: { title: string; description: string; canonical: string; ogImage?: string }): string {
  const img = opts.ogImage || `${FRONTEND_URL}/favicon-512.png`;
  return `  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="icon" href="${FRONTEND_URL}/favicon.ico" sizes="any"/>
  <link rel="icon" type="image/png" sizes="32x32" href="${FRONTEND_URL}/favicon-32.png"/>
  <link rel="icon" type="image/png" sizes="192x192" href="${FRONTEND_URL}/favicon-192.png"/>
  <link rel="icon" type="image/png" sizes="512x512" href="${FRONTEND_URL}/favicon-512.png"/>
  <link rel="apple-touch-icon" sizes="180x180" href="${FRONTEND_URL}/apple-touch-icon.png"/>
  <title>${opts.title}</title>
  <meta name="description" content="${opts.description}"/>
  <link rel="canonical" href="${opts.canonical}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="tuco Parents Circle"/>
  <meta property="og:title" content="${opts.title}"/>
  <meta property="og:description" content="${opts.description}"/>
  <meta property="og:url" content="${opts.canonical}"/>
  <meta property="og:image" content="${img}"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:image" content="${img}"/>
  <meta name="twitter:title" content="${opts.title}"/>
  <meta name="twitter:description" content="${opts.description}"/>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "tuco Parents Circle",
    "alternateName": "tuco Kids",
    "url": FRONTEND_URL,
    "logo": `${FRONTEND_URL}/favicon-512.png`,
    "sameAs": ["https://tucokids.com"],
  })}</script>`;
}

// ── SEO: bot-detection helper ───────────────────────────────────────────────
function isBot(ua: string): boolean {
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|linkedinbot|twitterbot|whatsapp|telegrambot|discordbot|rogerbot|semrushbot|ahrefsbot|mj12bot|dotbot/i.test(ua);
}

// ── SEO: sitemap for search crawlers ────────────────────────────────────────
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const threads = await prisma.conversation.findMany({
      where: { moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, category: true },
    });
    const urls = [
      { loc: `${FRONTEND_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${FRONTEND_URL}/community`, priority: '0.9', changefreq: 'daily' },
      ...['skincare', 'school', 'kids_growth', 'active_kids', 'parenting_hacks']
        .map(c => ({ loc: `${FRONTEND_URL}/${c}`, priority: '0.7', changefreq: 'weekly' })),
      ...threads.map(t => ({
        loc: `${FRONTEND_URL}/thread/${t.id}`,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: t.createdAt.toISOString(),
      })),
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${esc(u.loc)}</loc>
    ${'lastmod' in u ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch { next(); }
});

// ── SEO: RSS feed for distribution ──────────────────────────────────────────
app.get('/rss.xml', async (req, res, next) => {
  try {
    const threads = await prisma.conversation.findMany({
      where: { moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, title: true, opText: true, opAuthor: true, createdAt: true, category: true },
    });
    const items = threads.map(t => `    <item>
      <title>${esc(t.title || 'Discussion')}</title>
      <link>${FRONTEND_URL}/thread/${t.id}</link>
      <guid isPermaLink="true">${FRONTEND_URL}/thread/${t.id}</guid>
      <pubDate>${t.createdAt.toUTCString()}</pubDate>
      <author>${esc(t.opAuthor || 'tuco Parent')}</author>
      <category>${esc(t.category || 'general')}</category>
      <description>${esc((t.opText || '').replace(/<[^>]+>/g, '').slice(0, 300))}</description>
    </item>`).join('\n');
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>tuco Parents Circle</title>
    <link>${FRONTEND_URL}/</link>
    <description>Latest parenting discussions from the tuco Parents Circle community.</description>
    <language>en-in</language>
    <atom:link href="${FRONTEND_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(body);
  } catch { next(); }
});

// ── SEO: SSR-lite for crawlers on thread pages ──────────────────────────────
app.get('/thread/:id', async (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  // Real users clicking a shared or Google-indexed /thread/<id> URL used to
  // fall through to the SPA catch-all that redirects to /community — losing
  // the thread id and dropping them on the homepage. Preserve the id by
  // routing to the SPA's own hash-based deep-link handler.
  if (!isBot(ua)) {
    const idParam = req.params.id;
    if (/^\d+$/.test(idParam)) {
      return res.redirect(`/community#thread-${idParam}`);
    }
    return next();
  }

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next();

    const thread = await prisma.conversation.findUnique({
      where: { id },
      include: { replies: { take: 20, orderBy: { id: 'asc' } } },
    });

    if (!thread || thread.moderationStatus !== 'APPROVED') return next();

    const title = esc(thread.title || 'Discussion');
    const desc = esc((thread.opText || '').replace(/<[^>]+>/g, '').slice(0, 200).trim());
    const repliesHtml = thread.replies
      .map(r => `<div class="reply"><p>${esc((r.text || '').replace(/<[^>]+>/g, '').slice(0, 500))}</p></div>`)
      .join('\n');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
${seoHead({
  title: `${title} — tuco Parents Circle`,
  description: desc,
  canonical: `${FRONTEND_URL}/thread/${id}`,
})}
</head>
<body>
  <header><a href="${FRONTEND_URL}">tuco Parents Circle</a></header>
  <main>
    <h1>${title}</h1>
    <p>${desc}</p>
    <section aria-label="Replies">${repliesHtml}</section>
  </main>
</body>
</html>`);
  } catch {
    next();
  }
});

// ── SEO: SSR-lite for bots on homepage ─────────────────────────────────────
app.get('/', async (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (!isBot(ua)) {
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return res.redirect(`/community${qs}`);
  }

  try {
    const threads = await prisma.conversation.findMany({
      where: { moderationStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, title: true, opText: true, category: true },
    });

    const linksHtml = threads
      .map(t => `<li><a href="${FRONTEND_URL}/thread/${t.id}">${esc(t.title || 'Discussion')}</a></li>`)
      .join('\n');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
${seoHead({
  title: 'tuco Parents Circle — Parenting Community for Indian Parents',
  description: 'A safe, anonymous community for Indian parents to discuss skincare, school, kids health, parenting hacks and more.',
  canonical: `${FRONTEND_URL}/`,
})}
</head>
<body>
  <h1>tuco Parents Circle</h1>
  <p>A safe, anonymous community for Indian parents.</p>
  <ul>${linksHtml}</ul>
</body>
</html>`);
  } catch {
    res.redirect('/community');
  }
});

// ── SEO: SSR-lite for bots on the feed + category pages ─────────────────────
// Unlike `/` and `/thread/:id`, these paths ARE the real app for humans (not a
// redirect target) — nginx used to serve the static SPA shell here directly,
// bypassing this file entirely, which is why bots got an empty <div id="root">
// with a canonical pointing at `/`. Non-bots still get the real built app;
// bots get a real per-category title/description/canonical + thread links.
const CATEGORY_META: Record<string, { label: string; description: string }> = {
  skincare: {
    label: 'Skincare, Haircare & Personal Care',
    description: 'Indian parents discussing skincare, haircare and personal care for kids — routines, product picks, and real experience.',
  },
  school: {
    label: 'School & Learning',
    description: 'Indian parents discussing school choices, homework, exams, tuition and learning habits for kids.',
  },
  kids_growth: {
    label: 'Kids & Growth',
    description: 'Indian parents discussing child development, milestones, health and growth.',
  },
  active_kids: {
    label: 'Active Kids',
    description: 'Indian parents discussing sports, screen time, outdoor play and keeping kids active.',
  },
  parenting_hacks: {
    label: 'Parenting Hacks',
    description: 'Real parenting hacks and everyday tips from Indian parents raising kids.',
  },
};

app.get(
  ['/community', '/skincare', '/school', '/kids_growth', '/active_kids', '/parenting_hacks'],
  async (req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    if (!isBot(ua)) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }

    try {
      const categoryParam = req.path.slice(1); // 'community' | 'skincare' | ...
      const isAll = categoryParam === 'community';
      const meta = CATEGORY_META[categoryParam];

      const title = isAll
        ? 'tuco Parents Circle — All Discussions'
        : `${meta.label} — tuco Parents Circle`;
      const description = isAll
        ? 'Browse all parenting discussions on tuco Parents Circle — a safe, anonymous community for Indian parents.'
        : meta.description;

      const threads = await prisma.conversation.findMany({
        where: {
          moderationStatus: 'APPROVED',
          ...(isAll ? {} : { category: categoryParam }),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, title: true },
      });

      const linksHtml = threads
        .map(t => `<li><a href="${FRONTEND_URL}/thread/${t.id}">${esc(t.title || 'Discussion')}</a></li>`)
        .join('\n');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
${seoHead({
  title,
  description,
  canonical: `${FRONTEND_URL}/${categoryParam}`,
})}
</head>
<body>
  <h1>${esc(isAll ? 'All Discussions' : meta.label)}</h1>
  <p>${esc(description)}</p>
  <ul>${linksHtml}</ul>
</body>
</html>`);
    } catch {
      next();
    }
  }
);

// Mount the static files at /community
app.use('/community', express.static(distPath));

// Fallback for SPA routing - all /community/* paths go to index.html
app.get('/community/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 404 for API/app paths
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/apps')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.redirect('/community');
});

// ------------------------------
// ERROR HANDLING
// ------------------------------

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Malformed percent-encoding in the URL (e.g. overlong-UTF8 %c0%af tricks
  // scanners use to probe for /etc/passwd, .env, wp-config.php, etc). Express
  // throws this while decoding the path, before any route runs — it's a bad
  // request from the client, not a server fault. Respond 400 and skip the
  // noisy error-level log; these are frequent, harmless, and not actionable.
  if (error instanceof URIError) {
    return res.status(400).json({ error: 'Bad request' });
  }

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
