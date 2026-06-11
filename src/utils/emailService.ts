import { Conversation, EmailLogEntry, User } from '../types';
const EMAIL_LOG_KEY = 'tuco_email_log_v1';
const WEEKLY_LAST_SENT_KEY = 'tuco_weekly_email_last_v1';
export function getEmailLog(): EmailLogEntry[] {
  try {
    const raw = localStorage.getItem(EMAIL_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveEmailLog(entries: EmailLogEntry[]) {
  localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(entries.slice(0, 50)));
}
export function sendSimulatedEmail(
  type: EmailLogEntry['type'],
  to: string,
  subject: string,
  body: string
): EmailLogEntry {
  const entry: EmailLogEntry = {
    id: `email_${Date.now()}`,
    type,
    to,
    subject,
    sentAt: new Date().toISOString(),
    preview: body.slice(0, 120) + (body.length > 120 ? '…' : ''),
  };
  const log = [entry, ...getEmailLog()];
  saveEmailLog(log);
  return entry;
}
export function sendThreadApprovalEmail(user: User, threadTitle: string): EmailLogEntry {
  const body = `Hi ${user.username},
Great news! Your post "${threadTitle}" has been approved and is now live on tuco Parents Circle.
Parents in our community can now read and reply to your discussion.
With warmth,
The tuco Parents Circle Team
tucokids.com/community`;
  return sendSimulatedEmail(
    'approval',
    user.email,
    `✅ Your post is live: ${threadTitle.slice(0, 40)}…`,
    body
  );
}
export function buildWeeklyEngagementEmail(
  user: User,
  topThreads: Conversation[]
): { subject: string; body: string } {
  const threadList = topThreads
    .slice(0, 5)
    .map((t, i) => `${i + 1}. ${t.title} (${t.replies.length} replies)`)
    .join('\n');
  const body = `Hi ${user.username},
Here's what happened in Parents Circle this week — conversations you might have missed:
${threadList || '• New discussions are starting every day — jump in!'}
💬 You have ${user.postCount} posts and ${user.replyCount} replies so far.
${user.badges.length > 0 ? `🏅 Badge progress: keep going — you're building your community reputation!` : '🌱 Post your first question to earn your Community Member badge.'}
Join the conversation: tucokids.com/community
Unsubscribe anytime in your profile settings.
Warmly,
tuco Parents Circle`;
  return {
    subject: `📬 Your weekly Parents Circle digest`,
    body,
  };
}
export function sendWeeklyEngagementToAllUsers(
  users: Record<string, User>,
  conversations: Conversation[]
): EmailLogEntry[] {
  const approved = conversations.filter(
    c => !c.moderationStatus || c.moderationStatus === 'approved'
  );
  const topThreads = [...approved]
    .sort((a, b) => b.votes + b.replies.length - (a.votes + a.replies.length))
    .slice(0, 5);
  const sent: EmailLogEntry[] = [];
  Object.values(users).forEach(user => {
    if (!user.email || user.emailNotifications === false) return;
    const { subject, body } = buildWeeklyEngagementEmail(user, topThreads);
    sent.push(sendSimulatedEmail('weekly_engagement', user.email, subject, body));
  });
  localStorage.setItem(WEEKLY_LAST_SENT_KEY, new Date().toISOString());
  return sent;
}
export function getLastWeeklyEmailSent(): string | null {
  return localStorage.getItem(WEEKLY_LAST_SENT_KEY);
}
export function shouldSendWeeklyEmail(): boolean {
  const last = getLastWeeklyEmailSent();
  if (!last) return true;
  const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 7;
}
