/**
 * Seeds the 110 original conversations (and their replies) into the database.
 * Run from the tuco-api directory on the server:
 *   node prisma/seed.js
 *
 * Safe to re-run — skips conversations that already exist (by title match).
 */

import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const conversations = require(join(__dirname, './seed-data.json'));

const prisma = new PrismaClient();

const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';
const SYSTEM_USER_ID_PLACEHOLDER = '__seed_user__';

async function getOrCreateSeedUser() {
  let user = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: SYSTEM_USER_EMAIL,
        username: 'tuco Team',
        passwordHash: 'SYSTEM_NO_LOGIN',
        city: 'India',
        role: 'TUCO_TEAM',
        isVerified: true,
        trustScore: 100,
      },
    });
    console.log('Created seed system user:', user.id);
  }
  return user;
}

function toUserRole(role) {
  if (!role) return 'MEMBER';
  const map = { member: 'MEMBER', trusted: 'TRUSTED', moderator: 'MODERATOR', tuco_team: 'TUCO_TEAM', guest: 'GUEST' };
  return map[role.toLowerCase()] || 'MEMBER';
}

async function seedConversation(conv, seedUserId) {
  // Check if a conversation with this title already exists
  const existing = await prisma.conversation.findFirst({ where: { title: conv.title } });
  if (existing) {
    process.stdout.write('.');
    return existing;
  }

  const created = await prisma.conversation.create({
    data: {
      title: conv.title,
      category: conv.category || 'general',
      isPinned: conv.isPinned || false,
      isHot: conv.isHot || false,
      isFeatured: conv.isFeatured || false,
      featuredLabel: conv.featuredLabel || null,
      votes: conv.votes || 0,
      views: conv.views || 0,
      opAuthor: conv.op?.author || 'Community Member',
      opCity: conv.op?.city || 'India',
      opTime: conv.op?.time || 'some time ago',
      opText: conv.op?.text || '',
      opImage: conv.op?.image || null,
      opAuthorRole: toUserRole(conv.op?.authorRole),
      opAuthorBadges: conv.op?.authorBadges || [],
      moderationStatus: 'APPROVED',
      authorId: seedUserId,
      greyAreaFlags: conv.greyAreaFlags || [],
      reviewPriority: conv.reviewPriority || null,
    },
  });

  // Seed replies (flat — ignore nested for seeded content)
  if (conv.replies && conv.replies.length > 0) {
    for (const reply of conv.replies) {
      try {
        await prisma.reply.create({
          data: {
            conversationId: created.id,
            author: reply.author || 'Community Member',
            authorId: seedUserId,
            city: reply.city || 'India',
            time: reply.time || 'some time ago',
            text: reply.text || '',
            image: reply.image || null,
            likes: reply.likes || 0,
            authorRole: toUserRole(reply.authorRole),
            authorBadges: reply.authorBadges || [],
            moderationStatus: 'APPROVED',
          },
        });
      } catch (err) {
        // Skip individual reply errors silently
      }
    }
  }

  process.stdout.write('+');
  return created;
}

async function main() {
  console.log(`\nSeeding ${conversations.length} conversations…\n`);
  const seedUser = await getOrCreateSeedUser();

  let seeded = 0;
  let skipped = 0;

  for (const conv of conversations) {
    const existing = await prisma.conversation.findFirst({ where: { title: conv.title } });
    if (existing) {
      skipped++;
      process.stdout.write('.');
    } else {
      await seedConversation(conv, seedUser.id);
      seeded++;
    }
  }

  console.log(`\n\nDone! Seeded: ${seeded}, Already existed: ${skipped}`);

  const total = await prisma.conversation.count();
  const approved = await prisma.conversation.count({ where: { moderationStatus: 'APPROVED' } });
  console.log(`Total conversations in DB: ${total} (${approved} approved)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
