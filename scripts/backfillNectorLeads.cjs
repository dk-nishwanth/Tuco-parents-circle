// One-time backfill: register every existing user as a Nector lead, and let
// them know the points program exists — WITHOUT claiming they got the signup
// bonus (they didn't just sign up, so that would be a false claim; only
// nectorRewardSignup/notifySignupPointsBonus in server/index.ts award that,
// for genuinely new signups).
//
// New signups register themselves automatically going forward (see
// nectorRewardSignup in server/index.ts) — this script only exists to cover
// everyone who signed up BEFORE the Nector integration shipped, since a
// person must exist as a Nector lead before any post/reply activity call
// can award them points.
//
// Safe to re-run for the lead-creation part: Nector's lead creation is keyed
// on customer_id (we use our own User.id), so a second run just re-submits
// already-registered users. The explainer notification is NOT safe to
// re-run blindly — re-running would spam a duplicate notification to
// everyone who already got one, so it's gated on NectorAward-style tracking:
// we only send it to users who don't already have a Notification with the
// exact title used below.
//
// Usage:
//   node scripts/backfillNectorLeads.cjs             # runs for real
//   node scripts/backfillNectorLeads.cjs --dry-run    # logs what would be sent, sends nothing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const NECTOR_API_KEY = process.env.NECTOR_API_KEY;
const NECTOR_WORKSPACE_ID = process.env.NECTOR_WORKSPACE_ID;
const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';
const NOTIFICATION_TITLE = 'tuco Points are here! ⭐';

// Nector's real-world limit is 40 requests/min (their docs say 60, but the
// account actually enforces 40) — 1.6s between calls keeps us at 37.5/min,
// safely under that with margin for clock drift.
const DELAY_MS = 1600;

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
      const body = await res.text();
      // Already having a lead is success from our point of view, not a failure.
      if (res.status === 422 && body.includes('Lead already exists')) return true;
      console.error(`FAILED ${user.email}: ${res.status} ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`ERROR ${user.email}:`, err.message);
    return false;
  }
}

async function notifyExistingMember(userId) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would notify user ${userId} about tuco Points`);
    return;
  }
  const already = await prisma.notification.findFirst({
    where: { userId, title: NOTIFICATION_TITLE },
    select: { id: true },
  });
  if (already) return;
  await prisma.notification.create({
    data: {
      userId,
      type: 'BADGE',
      title: NOTIFICATION_TITLE,
      description: "We've added tuco Points! Earn +10 points for asking a question and +5 points for every reply. Your points show up next to your name in the header and on your profile.",
      time: 'Just now',
    },
  });
}

(async () => {
  const users = await prisma.user.findMany({
    where: { email: { not: SYSTEM_USER_EMAIL } },
    select: { id: true, email: true, username: true },
  });

  console.log(`Backfilling ${users.length} users${DRY_RUN ? ' (dry run)' : ''}...`);

  let ok = 0, failed = 0;
  // Sequential, not parallel — Nector actually enforces 40 requests/minute,
  // and a burst of 700+ concurrent calls would blow straight through that.
  for (const user of users) {
    const success = await createLead(user);
    if (success) {
      ok++;
      await notifyExistingMember(user.id);
    } else {
      failed++;
    }
    if (!DRY_RUN) await new Promise(r => setTimeout(r, DELAY_MS));
    if ((ok + failed) % 50 === 0) console.log(`  ${ok + failed}/${users.length}...`);
  }

  console.log(`Done. ${ok} succeeded, ${failed} failed.`);
  await prisma.$disconnect();
})().catch(async e => {
  console.error('backfillNectorLeads failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
