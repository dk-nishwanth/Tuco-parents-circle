export interface AnnouncementTemplate {
  id: string;
  channel: 'email' | 'whatsapp';
  title: string;
  subject?: string;
  body: string;
}
export const LAUNCH_ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: 'launch_email',
    channel: 'email',
    title: 'Launch Email — Parents Circle Invite',
    subject: '🌸 Introducing tuco Parents Circle — your safe space to ask anything',
    body: `Dear [Parent Name],
We're so excited to invite you to **tuco Parents Circle** — a warm, judgment-free community built for Indian parents.
Whether it's sunscreen for cricket season, sleep struggles, or school anxiety — ask real questions and get real answers from parents who've been there.
✨ What makes it different:
• AI-moderated for safety (no medical prescriptions, no diagnosis)
• Real parents, real cities — Mumbai to Kochi
• Product recommendations only when genuinely helpful
Join free: https:
We can't wait to see you there.
With love,
Team tuco Kids`,
  },
  {
    id: 'launch_whatsapp',
    channel: 'whatsapp',
    title: 'Launch WhatsApp — Short Invite',
    body: `🌸 *tuco Parents Circle is LIVE!*
A safe space for Indian parents to ask *anything* — skin, sleep, school, behaviour — without judgment.
✅ Real parent advice
✅ AI-moderated for safety
✅ Free to join
👉 tucokids.com/community
Forward to a parent friend who needs this 💛`,
  },
  {
    id: 'launch_email_reminder',
    channel: 'email',
    title: 'Launch Reminder — Week 1',
    subject: 'Still thinking about joining Parents Circle?',
    body: `Hi [Parent Name],
A quick reminder — tuco Parents Circle has 100+ discussions already started by parents like you.
Popular topics this week:
• Sunscreen for outdoor sports
• Mild eczema & dry skin
• School readiness & morning routines
Your question might help another parent tonight.
Join: https:
— Team tuco`,
  },
  {
    id: 'launch_whatsapp_reminder',
    channel: 'whatsapp',
    title: 'Launch WhatsApp Reminder',
    body: `Parents Circle update 🌸
100+ real discussions already live — sunscreen, sleep, school, special needs & more.
Your parenting question belongs here 👇
tucokids.com/community`,
  },
];
