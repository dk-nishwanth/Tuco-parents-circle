// Weekly "new replies on threads you follow" digest email, plus a
// cross-promo block for the current "highlights of the week" thread.
// Run weekly via cron on the server, same pattern as rotateWeeklyHighlight.cjs
// (which should run first so the highlight block reflects the fresh pick).
//
// Only emails users who actually have something new to see — a user with
// zero new replies on a thread they follow or authored gets skipped, so
// this never turns into a content-free "come back!" nag.
//
// Usage:
//   node scripts/sendWeeklyDigest.cjs            # sends real emails
//   node scripts/sendWeeklyDigest.cjs --dry-run   # logs what would be sent, sends nothing
const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://community.tucokids.com';
const EMAIL_FROM = process.env.EMAIL_FROM || 'tuco Parents Circle <noreply@tucokids.com>';
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';

// Resend is constructed after PrismaClient so its @/.env autoload (same
// mechanism rotateWeeklyHighlight.cjs relies on) has already populated
// process.env.RESEND_API_KEY.
const resend = !DRY_RUN && process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function emailShell(bodyHtml) {
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

function threadRow(thread, newReplyCount) {
  const url = `${FRONTEND_URL}/community#thread-${thread.id}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
    <tr><td style="padding:14px 16px;background-color:#F9FAFB;border-radius:14px;">
      <a href="${url}" style="color:#4D4747;text-decoration:none;font-weight:700;font-size:14px;">${thread.title}</a>
      <div style="margin-top:4px;color:#35B5EC;font-size:13px;font-weight:700;">${newReplyCount} new ${newReplyCount === 1 ? 'reply' : 'replies'}</div>
    </td></tr>
  </table>`;
}

async function logEmail(type, to, subject, html) {
  try {
    const preview = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
    await prisma.emailLog.create({ data: { type, to, subject, preview } });
  } catch (err) {
    console.error('EmailLog write failed:', err);
  }
}

async function sendDigest(user, threadsWithCounts, highlight) {
  const subject = `${threadsWithCounts.reduce((n, t) => n + t.newReplyCount, 0)} new replies on threads you're following`;
  const rows = threadsWithCounts
    .sort((a, b) => b.newReplyCount - a.newReplyCount)
    .slice(0, 5)
    .map(t => threadRow(t.thread, t.newReplyCount))
    .join('');

  const highlightBlock = highlight && !threadsWithCounts.some(t => t.thread.id === highlight.id)
    ? `<p style="margin:24px 0 10px;font-size:13px;font-weight:700;color:#A3A3A3;text-transform:uppercase;letter-spacing:0.04em;">This week's highlight</p>
       ${threadRow(highlight, highlight._replyCount ?? 0)}`
    : '';

  const html = emailShell(`
    <p style="margin:0 0 18px;font-size:16px;font-weight:700;">Hi ${user.username},</p>
    <p style="margin:0 0 20px;">Here's what happened on threads you're following this week:</p>
    ${rows}
    ${highlightBlock}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
      <tr><td style="background-color:#35B5EC;border-radius:10px;">
        <a href="${FRONTEND_URL}/community" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open tuco Parents Circle</a>
      </td></tr>
    </table>
  `);

  if (DRY_RUN || !resend) {
    console.log(`[DRY RUN] Would email ${user.email}: "${subject}" (${threadsWithCounts.length} threads${highlight ? ', +highlight' : ''})`);
    return;
  }

  try {
    const { error } = await resend.emails.send({ from: EMAIL_FROM, to: user.email, subject, html });
    if (error) {
      console.error(`Digest REJECTED for ${user.email}:`, error);
      return;
    }
    await logEmail('WEEKLY_ENGAGEMENT', user.email, subject, html);
    console.log(`Sent digest to ${user.email} (${threadsWithCounts.length} threads${highlight ? ', +highlight' : ''})`);
  } catch (err) {
    console.error(`Digest send failed for ${user.email}:`, err);
  }
}

(async () => {
  const since = new Date(Date.now() - LOOKBACK_MS);

  const highlight = await prisma.conversation.findFirst({ where: { isWeeklyHighlight: true } });
  if (highlight) {
    highlight._replyCount = await prisma.reply.count({
      where: { conversationId: highlight.id, moderationStatus: 'APPROVED', createdAt: { gte: since } },
    });
  }

  const users = await prisma.user.findMany({
    where: { emailNotifications: true, email: { not: SYSTEM_USER_EMAIL } },
    select: { id: true, username: true, email: true },
  });

  let emailsSent = 0;
  let usersSkipped = 0;

  for (const user of users) {
    const [followedThreads, authoredThreads] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: user.id, targetConversationId: { not: null } },
        select: { targetConversationId: true },
      }),
      prisma.conversation.findMany({
        where: { authorId: user.id },
        select: { id: true },
      }),
    ]);

    const watchedThreadIds = [...new Set([
      ...followedThreads.map(f => f.targetConversationId),
      ...authoredThreads.map(c => c.id),
    ])];

    if (watchedThreadIds.length === 0) {
      usersSkipped++;
      continue;
    }

    const newReplies = await prisma.reply.findMany({
      where: {
        conversationId: { in: watchedThreadIds },
        moderationStatus: 'APPROVED',
        createdAt: { gte: since },
        authorId: { not: user.id },
      },
      select: { conversationId: true },
    });

    if (newReplies.length === 0) {
      usersSkipped++;
      continue;
    }

    const countByThread = new Map();
    for (const r of newReplies) {
      countByThread.set(r.conversationId, (countByThread.get(r.conversationId) || 0) + 1);
    }

    const threads = await prisma.conversation.findMany({
      where: { id: { in: [...countByThread.keys()] } },
      select: { id: true, title: true },
    });

    const threadsWithCounts = threads.map(thread => ({
      thread,
      newReplyCount: countByThread.get(thread.id) || 0,
    }));

    await sendDigest(user, threadsWithCounts, highlight);
    emailsSent++;
  }

  console.log(`Done. ${emailsSent} digest(s) ${DRY_RUN ? 'would be sent' : 'sent'}, ${usersSkipped} user(s) had nothing new.`);
  await prisma.$disconnect();
})().catch(async e => {
  console.error('sendWeeklyDigest failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
