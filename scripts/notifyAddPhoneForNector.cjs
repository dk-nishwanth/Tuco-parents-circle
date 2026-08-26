// One-time nudge: tell every existing user without a phone number that
// adding one in their profile will sync their tuco Points with tucokids.com
// checkout. Safe to re-run — skipped for anyone who already has a phone set
// or who already received this exact notification.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';
const TITLE = 'Sync your tuco Points with tucokids.com 📱';
const DESCRIPTION = "Add your phone number in your profile and your tuco Points earned here will sync with tucokids.com, so you can redeem them at checkout. Go to your profile > Add phone number.";

(async () => {
  const users = await prisma.user.findMany({
    where: { email: { not: SYSTEM_USER_EMAIL }, phone: null },
    select: { id: true, email: true },
  });
  console.log(`${users.length} users without a phone number${DRY_RUN ? ' (dry run)' : ''}...`);

  let sent = 0, skipped = 0;
  for (const user of users) {
    const already = await prisma.notification.findFirst({
      where: { userId: user.id, title: TITLE },
      select: { id: true },
    });
    if (already) { skipped++; continue; }
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would notify ${user.email}`);
      sent++;
      continue;
    }
    await prisma.notification.create({
      data: { userId: user.id, type: 'BADGE', title: TITLE, description: DESCRIPTION, time: 'Just now' },
    });
    sent++;
    if (sent % 100 === 0) console.log(`  ${sent}/${users.length}...`);
  }
  console.log(`Done. ${sent} notified, ${skipped} already had it.`);
  await prisma.$disconnect();
})().catch(async e => {
  console.error('notifyAddPhoneForNector failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
