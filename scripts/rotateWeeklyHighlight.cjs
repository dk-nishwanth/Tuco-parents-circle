// Rotates "highlights of the week" to a new eligible thread. Run weekly via
// cron on the server (see deploy notes). Eligible = approved thread with at
// least one reply from a tuco-team/moderator account (video or not) — the
// product ask is "threads which have tuco team videos or replies etc".
//
// Picks the highest-engagement eligible thread that ISN'T already this
// week's highlight, so it actually rotates instead of re-picking the same
// one every week when it's still the best scorer.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const current = await prisma.conversation.findFirst({ where: { isWeeklyHighlight: true } });

  const candidates = await prisma.conversation.findMany({
    where: { moderationStatus: 'APPROVED' },
    include: { replies: true },
  });

  const eligible = candidates.filter(c =>
    c.replies.some(r => r.authorRole === 'TUCO_TEAM' || r.authorRole === 'MODERATOR')
  );

  if (eligible.length === 0) {
    console.log('No eligible threads (none have a tuco-team/moderator reply). Leaving current highlight as-is.');
    await prisma.$disconnect();
    return;
  }

  const score = (c) => {
    const ageHours = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 1 - ageHours / 168);
    return (c.votes || 0) * 2 + c.replies.length * 3 + (c.views || 0) * 0.1 + recencyBoost * 20;
  };

  const pool = eligible.length > 1 && current
    ? eligible.filter(c => c.id !== current.id)
    : eligible;

  const next = [...pool].sort((a, b) => score(b) - score(a))[0];

  await prisma.conversation.updateMany({
    where: { isWeeklyHighlight: true },
    data: { isWeeklyHighlight: false },
  });
  await prisma.conversation.update({
    where: { id: next.id },
    data: { isWeeklyHighlight: true },
  });

  console.log(`Rotated highlight: [${current ? current.id : 'none'}] -> [${next.id}] "${next.title}"`);
  await prisma.$disconnect();
})().catch(e => {
  console.error('rotateWeeklyHighlight failed:', e);
  process.exit(1);
});
