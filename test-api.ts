
import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const port = 3002;

// ------------------------------
// HELPERS (copy from server/index.ts)
// ------------------------------
const mapRole = (role: string) => {
  switch (role) {
    case 'MODERATOR':
    case 'TUCO_TEAM':
      return role;
    default:
      return 'member';
  }
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
  trustScore: (u.trustScore || 0) / 100,
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

// ------------------------------
// ENDPOINTS
// ------------------------------
app.get('/api/conversations', async (req, res) => {
  console.log('📄 Getting conversations...');
  try {
    const conversations = await prisma.conversation.findMany({
      include: { replies: { orderBy: { id: 'asc' } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    console.log('✅ Found', conversations.length, 'conversations');
    const formatted = conversations.map(formatConversation);
    console.log('✅ Formatted first conversation:', JSON.stringify(formatted[0], null, 2));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('❌ Error getting conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------------
// START SERVER & TEST
// ------------------------------
const testServer = app.listen(port, async () => {
  console.log(`🟢 Test server running on http://localhost:${port}`);
  try {
    const response = await fetch(`http://localhost:${port}/api/conversations`);
    console.log('📥 Response status:', response.status);
    const data = await response.json();
    console.log('📥 Response data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Request failed:', err);
  } finally {
    testServer.close(() => {
      console.log('🔴 Test server stopped');
      prisma.$disconnect();
    });
  }
});
