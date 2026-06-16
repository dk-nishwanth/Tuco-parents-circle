/**
 * Backdates the 110 seeded conversations to spread over the past 6 months.
 * Run from ~/Tuco-parents-circle on the server:
 *   node prisma/backdate.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all conversations created by the seed system user, ordered by id
  const seedUser = await prisma.user.findUnique({
    where: { email: 'seed@tucokids.internal' },
  });

  if (!seedUser) {
    console.error('Seed user not found. Run seed.js first.');
    process.exit(1);
  }

  const seeded = await prisma.conversation.findMany({
    where: { authorId: seedUser.id },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  console.log(`Found ${seeded.length} seeded conversations to backdate.`);

  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < seeded.length; i++) {
    // Spread evenly across the last 6 months, oldest first
    const fraction = i / Math.max(seeded.length - 1, 1);
    const timestamp = new Date(sixMonthsAgo + fraction * (now - sixMonthsAgo - 7 * 24 * 60 * 60 * 1000));

    await prisma.conversation.update({
      where: { id: seeded[i].id },
      data: { createdAt: timestamp },
    });
    process.stdout.write('.');
  }

  console.log('\nDone! Conversations are now spread over the past 6 months.');

  // Verify
  const recent = await prisma.conversation.count({
    where: {
      createdAt: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  console.log(`Conversations created in last 7 days: ${recent}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
