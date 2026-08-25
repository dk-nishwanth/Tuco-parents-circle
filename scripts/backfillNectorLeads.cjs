// One-time backfill: register every existing user as a Nector lead.
// New signups register themselves automatically going forward (see
// nectorRewardSignup in server/index.ts) — this script only exists to cover
// everyone who signed up BEFORE the Nector integration shipped, since a
// person must exist as a Nector lead before any post/reply activity call
// can award them points.
//
// Safe to re-run: Nector's lead creation is keyed on customer_id (we use our
// own User.id), so a second run just re-submits already-registered users —
// not upserting duplicates as far as we're concerned either way, since we
// never create more than one lead per user.id.
//
// Usage:
//   node scripts/backfillNectorLeads.cjs            # runs for real
//   node scripts/backfillNectorLeads.cjs --dry-run    # logs what would be sent, sends nothing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const NECTOR_API_KEY = process.env.NECTOR_API_KEY;
const NECTOR_WORKSPACE_ID = process.env.NECTOR_WORKSPACE_ID;
const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';

if (!DRY_RUN && (!NECTOR_API_KEY || !NECTOR_WORKSPACE_ID)) {
  console.error('NECTOR_API_KEY / NECTOR_WORKSPACE_ID not set — aborting (use --dry-run to preview without credentials).');
  process.exit(1);
}

async function createLead(user) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would register lead: ${user.username} <${user.email}> (customer_id=${user.id})`);
    return true;
  }
  try {
    const res = await fetch('https://platform.nector.io/api/v2/merchant/leads', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-apikey': NECTOR_API_KEY,
        'x-workspaceid': NECTOR_WORKSPACE_ID,
        'x-source': 'web',
      },
      body: JSON.stringify({
        customer_id: user.id,
        name: user.username,
        metadetail: { email: user.email },
      }),
    });
    if (!res.ok) {
      console.error(`FAILED ${user.email}: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`ERROR ${user.email}:`, err.message);
    return false;
  }
}

(async () => {
  const users = await prisma.user.findMany({
    where: { email: { not: SYSTEM_USER_EMAIL } },
    select: { id: true, email: true, username: true },
  });

  console.log(`Backfilling ${users.length} users${DRY_RUN ? ' (dry run)' : ''}...`);

  let ok = 0, failed = 0;
  // Sequential, not parallel — Nector's docs cap this at 60 requests/minute,
  // and a burst of 700+ concurrent calls would blow straight through that.
  for (const user of users) {
    const success = await createLead(user);
    if (success) ok++; else failed++;
    if (!DRY_RUN) await new Promise(r => setTimeout(r, 1100)); // stay under 60/min
    if ((ok + failed) % 50 === 0) console.log(`  ${ok + failed}/${users.length}...`);
  }

  console.log(`Done. ${ok} succeeded, ${failed} failed.`);
  await prisma.$disconnect();
})().catch(async e => {
  console.error('backfillNectorLeads failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
