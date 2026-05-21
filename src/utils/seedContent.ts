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
  skin: [
    'Best moisturiser for dry cheeks in winter?',
    'Chapped lips in AC classrooms — what helps?',
    'Sun tan removal safe for 6 year old?',
    'Cradle cap at 4 months — still normal?',
  ],
  health: [
    'Fever 102°F — when to visit paediatrician?',
    'Vitamin D drops — which brand in India?',
    'Hand foot mouth — how to comfort child?',
    'Seasonal allergies in Delhi pollution — tips?',
  ],
  nutrition: [
    'Picky eater refuses dal — any tricks?',
    'Iron-rich foods for vegetarian toddler?',
    'School tiffin ideas without junk?',
    'Cow milk vs almond milk for 3yo?',
  ],
  sleep: [
    'Bedtime resistance every night — help!',
    'Co-sleeping transition to own bed?',
    'Night terrors at age 5 — normal?',
    'Nap strike at 18 months',
  ],
  dev: [
    'Speech delay at 2.5 years — experiences?',
    'Potty training regression after vacation',
    'When to start writing practice?',
    'Screen time limits that actually work?',
  ],
  school: [
    'CBSE vs ICSE for grade 1 — thoughts?',
    'Homework battles — how do you cope?',
    'Bullying in primary school — next steps?',
    'Online classes vs physical — your view?',
  ],
  behav: [
    'Tantrums in supermarket — embarrassing!',
    'Sibling jealousy after new baby',
    'Hitting phase at 3 — how long?',
    'Shy child at birthday parties',
  ],
  play: [
    'Indoor activities for rainy Mumbai days',
    'Best parks in Bangalore for toddlers?',
    'Craft ideas without too much mess',
    'Board games for 7 year olds?',
  ],
  travel: [
    'Goa trip with 2yo — packing list?',
    'Flight ear pain — what worked?',
    'Car seat rules in India — confused',
    'Hill station with infant — altitude?',
  ],
  shop: [
    'Stroller under 10k — recommendations?',
    'School bag ergonomic brands?',
    'Water bottle BPA free options',
    'Raincoat that actually stays on',
  ],
  hacks: [
    'Morning routine hack that saved us',
    'Label everything for school — tips',
    'Medicine reminder system parents use',
    'Weekend meal prep for working moms',
  ],
  special: [
    'Nut allergy — school snack policies',
    'ADHD diagnosis journey in India',
    'Gluten free tiffin ideas',
    'Sensory processing — OT experiences',
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
    const templates = TITLE_TEMPLATES[cat] || TITLE_TEMPLATES.skin;
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
      isPinned: i === 0 && cat === 'health',
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
