
import { Conversation } from '../types';
import { CATEGORIES } from '../data/categories';

const AUTHORS = [
  { author: 'Priya_Rao', city: 'Mumbai' },
  { author: 'AnanyaK', city: 'Bangalore' },
  { author: 'SnehaVerma', city: 'Delhi' },
  { author: 'MeeraSingh', city: 'Pune' },
  { author: 'DeepikaSharma', city: 'Jaipur' },
  { author: 'KavyaT', city: 'Chennai' },
  { author: 'RohiniM', city: 'Delhi' },
  { author: 'NehaMehta', city: 'Surat' },
  { author: 'DivyaNair', city: 'Kochi' },
  { author: 'PoojaReddy', city: 'Hyderabad' },
];

const TITLE_TEMPLATES: Record<string, string[]> = {
  skincare: [
    'Best sunscreen for outdoor cricket this summer?',
    'My 5-year-old has dry flaky patches on cheeks — mild eczema or something else?',
    'Chapped lips in AC classrooms — what helps?',
    'Gentle hair oil for 3yo with dry scalp?',
    'Sun tan removal safe for 6 year old?',
  ],
  school: [
    'CBSE vs ICSE for grade 1 — thoughts?',
    'Homework battles — how do you cope?',
    'School lunch box ideas that don\'t get boring?',
    'Best stationary for 1st standard?',
    'How to help child with reading?',
  ],
  kids_growth: [
    'Height growth tips for 7 year old?',
    'My kid is a picky eater — help!',
    'Weight gain for underweight 4yo?',
    'Best calcium-rich foods for kids?',
    'Sleep requirements by age?',
  ],
  active_kids: [
    'Best sports for 5 year old to start?',
    'Cycling safety tips for kids?',
    'Swimming classes — when to start?',
    'Football gear for young kids?',
    'Outdoor activity ideas for weekends?',
  ],
  parenting_hacks: [
    'Morning routine hack that saved us!',
    'Quick and easy breakfast ideas for school days',
    'How to get kids to clean their room?',
    'Travel hack with toddlers — lifesaver!',
    'Medicine reminder system parents use',
  ],
};

const REPLY_SNIPPETS = [
  'We went through the same — what helped us was consistency and patience.',
  'Our paediatrician suggested we track symptoms for 3 days before worrying.',
  'Mumbai parent here — humidity makes a big difference to skin care choices.',
  'Try the 5-minute warning before transitions — game changer for us.',
  'Hinglish mein bolo toh bhi theek hai — yahan sab parents samajhte hain.',
  'Please be kind in replies — mental health topics need gentle support.',
  'Every family\'s cultural practice is different — respect goes both ways.',
];

function daysAgo(days: number): string {
  if (days === 0) return 'Just now';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`;
}

export function generateSeededThreads(count: number, startId: number = 200): Conversation[] {
  const categoryIds = Object.keys(CATEGORIES);
  const threads: Conversation[] = [];

  for (let i = 0; i < count; i++) {
    const cat = categoryIds[i % categoryIds.length];
    const templates = TITLE_TEMPLATES[cat] || TITLE_TEMPLATES.skincare;
    const title = templates[i % templates.length];
    const author = AUTHORS[i % AUTHORS.length];
    const days = (i % 90) + 1;
    const replyCount = (i % 6) + 1;

    const replies = Array.from({ length: replyCount }, (_, r) => {
      const replier = AUTHORS[(i + r + 1) % AUTHORS.length];
      return {
        id: startId * 100 + i * 10 + r,
        author: replier.author,
        city: replier.city,
        time: daysAgo(days - r),
        text: REPLY_SNIPPETS[(i + r) % REPLY_SNIPPETS.length],
        likes: Math.floor(Math.random() * 12) + 1,
      };
    });

    threads.push({
      id: startId + i,
      title,
      category: cat,
      isPinned: i === 0 && cat === 'skincare',
      isHot: i % 7 === 0,
      isFeatured: i % 15 === 0,
      featuredLabel: i % 15 === 0 ? 'Circle Mom of the Month' : undefined,
      votes: 15 + (i % 80),
      views: 200 + i * 45,
      createdAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      moderationStatus: 'approved',
      op: {
        author: author.author,
        city: author.city,
        time: daysAgo(days),
        text: `Looking for advice from other Indian parents on "${title}". My child is ${3 + (i % 8)} years old. Would love to hear what worked in your family — especially practical tips from ${author.city}.`,
        authorBadges: i % 5 === 0 ? ['community_insider'] : i % 3 === 0 ? ['community_member'] : undefined,
      },
      replies,
    });
  }

  return threads;
}

export function mergeSeedWithExisting(
  existing: Conversation[],
  targetTotal: number = 100
): Conversation[] {
  const needed = Math.max(0, targetTotal - existing.length);
  if (needed === 0) return existing;
  const maxId = Math.max(...existing.map((c) => c.id), 0);
  const generated = generateSeededThreads(needed, maxId + 1);
  return [...existing, ...generated];
}
