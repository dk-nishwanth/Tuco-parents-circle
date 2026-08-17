// Ported straight from the live Shopify quiz section's product pools +
// recommendation logic, so results here match what tucokids.com itself
// would show for the same answers.

export interface PoolProduct {
  id: string;
  handle: string;
  name: string;
}

export interface Pick extends PoolProduct {
  note?: string;
  primary?: boolean;
}

const POOLS: Record<string, PoolProduct[]> = {
  skin: [
    { id: '8089329008856', handle: 'dull-skin-facewash-for-kids-100ml', name: 'Dull Skin Face Wash' },
    { id: '8516102914264', handle: 'bye-dull-skin-handmade-soap-pack-of-3', name: 'Dull Skin Soap (Pack of 3)' },
    { id: '8890835632344', handle: 'kumkumadi-facecream-for-kids-50g', name: 'Kumkumadi Face Cream' },
    { id: '8089332252888', handle: 'dull-skin-lotion-for-kids-200ml', name: 'Dull Skin Body Lotion (200ml)' },
    { id: '9179466629336', handle: 'bedtime-skincare-for-kids', name: 'Bedtime Skincare Kit' },
  ],
  hair: [
    { id: '7614266638552', handle: 'reetha-shampoo-for-kids-300ml', name: 'Reetha Shampoo (300ml)' },
    { id: '7573264695512', handle: 'tuco-kids-juicy-locks-hair-oil-100-ml', name: 'Juicy Locks Hair Oil' },
    { id: '8309626372312', handle: 'tangle-tamer-conditioner-for-kids-10g', name: 'Tangle Tamer Conditioner' },
    { id: '8952010735832', handle: 'reetha-shampoo-and-coconut-hair-oil', name: 'Reetha Shampoo + Coconut Oil Combo' },
    { id: '9022400135384', handle: 'tangled-and-frizzy-hair-regimen', name: 'Tangled & Frizzy Hair Regimen' },
  ],
  makeup: [
    { id: '8990881120472', handle: 'kiddy-kajal-1', name: 'Kiddy Kajal' },
    { id: '9011145638104', handle: 'tints-cherry-and-nothing', name: 'Cherry Tint & Nothing Lip Balm' },
    { id: '9011142263000', handle: 'nail-paint-pack-of-4', name: 'Nail Paint (Pack of 4)' },
    { id: '8769144848600', handle: 'beetroot-tint-and-kid-safe-kajal', name: 'Beetroot Tint + Kajal Starter Kit' },
    { id: '8982859940056', handle: 'mega-makeup-kit-for-kids', name: 'Mega Makeup Kit' },
  ],
  sun: [
    { id: '9021557506264', handle: '2-in-1-sunscreen-for-kids-spf-50', name: '2-in-1 Sunscreen SPF 50' },
    { id: '9013347057880', handle: 'sunscreen-for-kids-spf-30-30-gms', name: 'Sunscreen SPF 30' },
    { id: '8741173395672', handle: 'sunscreen-and-body-lotion-for-kids-spf30', name: 'Sunscreen + Body Lotion SPF 30' },
    { id: '9180362965208', handle: 'swimming-sports-skincare-kit-for-kids', name: 'Swimming & Sports Kit' },
    {
      id: '9199324922072',
      handle: 'complete-skincare-kit-for-kids-face-wash-soap-sunscreen-oat-lotion',
      name: 'Complete Morning Skincare Kit',
    },
  ],
};

function order(pool: PoolProduct[], primaryId: string, primaryNote: string, secondaryId?: string, secondaryNote?: string): Pick[] {
  const rest = pool.filter(p => p.id !== primaryId && p.id !== secondaryId);
  const primary = pool.find(p => p.id === primaryId);
  const out: Pick[] = primary ? [{ ...primary, note: primaryNote, primary: true }] : [];
  if (secondaryId) {
    const secondary = pool.find(p => p.id === secondaryId);
    if (secondary) out.push({ ...secondary, note: secondaryNote });
  }
  return [...out, ...rest];
}

export interface QuizResult {
  title: string;
  sub: string;
  picks: Pick[];
}

type Answers = Record<string, string | string[] | undefined>;

function resolveSkin(a: Answers): QuizResult {
  const pool = POOLS.skin;
  const ID = {
    faceWash: '8089329008856',
    soap: '8516102914264',
    kumkumadi: '8890835632344',
    lotion: '8089332252888',
    bedtimeKit: '9179466629336',
  };
  if (a.q4 === 'very_sensitive' && a.q1 !== 'patchy')
    return { title: 'extra gentle care for reactive skin', sub: 'leave-on hydration, no active exfoliants.', picks: order(pool, ID.lotion, 'gentlest option — safe for reactive skin') };
  if (a.q2 === 'full' && (a.q3 === '10_12' || a.q3 === '13_15'))
    return { title: 'a complete dull-skin routine', sub: 'a full day-to-night routine, right for this age.', picks: order(pool, ID.bedtimeKit, 'covers the full day-to-night routine') };
  if (a.q1 === 'dry')
    return { title: 'for dry, rough patches', sub: 'ranked for deeper hydration first.', picks: order(pool, ID.lotion, 'deeper hydration for rough patches', ID.soap) };
  if (a.q1 === 'patchy')
    return { title: 'for dull & tanned skin', sub: 'kumkumadi is our brightening, even-tone specialist.', picks: order(pool, ID.kumkumadi, 'brightening — helps even out tone') };
  if (a.q2 === 'body')
    return { title: 'dull skin, treated head to toe', sub: 'ranked for face + body coverage.', picks: order(pool, ID.soap, 'everyday tan-fighting soap, face and body') };
  return { title: 'for dull or tanned skin', sub: 'our most-loved dullness fighters, ranked for you.', picks: order(pool, ID.faceWash, 'our most-loved dullness face wash') };
}

function resolveHair(a: Answers): QuizResult {
  const pool = POOLS.hair;
  const ID = {
    shampoo: '7614266638552',
    oil: '7573264695512',
    conditioner: '8309626372312',
    starterCombo: '8952010735832',
    frizzyRegimen: '9022400135384',
  };
  if (a.q3 === '3_5' && a.q2 === 'never')
    return { title: 'a gentle starting point', sub: 'ranked for the easiest way to begin, for a younger child.', picks: order(pool, ID.starterCombo, 'shampoo + oil — a simple first routine') };
  if (a.q1 === 'dry' && a.q4 === 'long')
    return { title: 'for dry, rough hair', sub: 'ranked for moisture and detangling together — long hair needs both.', picks: order(pool, ID.conditioner, 'locks in moisture after washing', ID.oil) };
  if (a.q1 === 'dry')
    return { title: 'for dry, rough hair', sub: 'ranked to nourish first.', picks: order(pool, ID.oil, 'nourishes dry hair without weighing it down', ID.conditioner) };
  if (a.q1 === 'frizzy' || a.q1 === 'weak' || a.q2 === 'often')
    return { title: 'the full champi ritual', sub: 'ranked for frizz and hair fall together.', picks: order(pool, ID.frizzyRegimen, "our most complete hair-fall & frizz routine") };
  if (a.q2 === 'never')
    return { title: 'a gentle starting point', sub: 'ranked for the easiest way to begin.', picks: order(pool, ID.starterCombo, 'shampoo + oil — a simple first routine') };
  return { title: 'your hair-care match', sub: 'ranked for your current routine.', picks: order(pool, ID.shampoo, 'a gentle everyday shampoo') };
}

function resolveMakeup(a: Answers): QuizResult {
  const pool = POOLS.makeup;
  const uses = Array.isArray(a.q1) ? a.q1 : [];
  const symptoms = Array.isArray(a.q2) ? a.q2 : [];
  const ID = {
    kajal: '8990881120472',
    lipTint: '9011145638104',
    nailPaint: '9011142263000',
    starterKit: '8769144848600',
    megaKit: '8982859940056',
  };
  if (a.q4 === 'just_started' || a.q4 === 'curious')
    return { title: 'a safe starter kit', sub: "since you're just getting started.", picks: order(pool, ID.starterKit, "a safe starter kit for whenever they're ready") };
  if (a.q3 === '3_5')
    return { title: 'a safe starter kit', sub: 'right-sized for a younger child.', picks: order(pool, ID.starterKit, 'a gentle starter kit, sized right for this age') };
  if (uses.includes('unsure') || uses.length >= 3)
    return { title: 'the all-in-one swap', sub: 'kajal, tint and nail paint, all dermat-tested and kid-safe.', picks: order(pool, ID.megaKit, 'everything in one kit') };
  if (uses.includes('kajal') || symptoms.includes('eyes'))
    return { title: 'your personalised swaps', sub: 'ranked for eye sensitivity first.', picks: order(pool, ID.kajal, 'castor-oil based — built for sensitive eyes') };
  if (uses.includes('lips') || symptoms.includes('chapped'))
    return { title: 'your personalised swaps', sub: 'ranked for lip care first.', picks: order(pool, ID.lipTint, 'doubles as a lip balm — no drying alcohol') };
  if (uses.includes('nailpaint') || symptoms.includes('stain'))
    return { title: 'your personalised swaps', sub: 'ranked for nail colour first.', picks: order(pool, ID.nailPaint, 'water-based, peels off easily') };
  return { title: 'your personalised swaps', sub: "a safe starter kit, ranked first for you.", picks: order(pool, ID.starterKit, "a safe starter kit for whenever they're ready") };
}

function resolveSun(a: Answers): QuizResult {
  const pool = POOLS.sun;
  const ID = {
    spf50: '9021557506264',
    spf30: '9013347057880',
    lotionSpf30: '8741173395672',
    swimKit: '9180362965208',
    morningKit: '9199324922072',
  };
  if (a.q4 === 'burns_easily' && a.q1 !== 'swim')
    return { title: 'extra protection for sun-sensitive skin', sub: 'stronger SPF, since burns are a safety concern.', picks: order(pool, ID.spf50, 'higher SPF for a child who burns easily') };
  if (a.q1 === 'swim')
    return { title: 'built for water & sport days', sub: 'ranked for chlorine & sweat resistance first.', picks: order(pool, ID.swimKit, 'made for swim & sports days') };
  if (a.q1 === 'full' || a.q2 === 'kit')
    return { title: 'a complete morning routine', sub: 'ranked for full-routine coverage first.', picks: order(pool, ID.morningKit, 'face wash + soap + sunscreen + lotion') };
  if (a.q1 === 'beach' || a.q2 === 'duo')
    return { title: 'for long days in the sun', sub: 'ranked for extra hydration first.', picks: order(pool, ID.lotionSpf30, 'sun lotion + SPF 30 sunscreen') };
  if (a.q4 === 'rarely_reacts')
    return { title: 'for everyday protection', sub: 'lighter protection fits low-risk skin.', picks: order(pool, ID.spf30, 'standard daily protection') };
  if (a.q4 === 'not_sure' && (a.q3 === '3_5' || a.q3 === '6_9'))
    return { title: 'for everyday protection', sub: 'defaulting to stronger protection for a younger child.', picks: order(pool, ID.spf50, 'SPF 50, lightweight daily wear') };
  if (a.q4 === 'not_sure' && (a.q3 === '10_12' || a.q3 === '13_15'))
    return { title: 'for everyday protection', sub: 'standard protection as a starting point.', picks: order(pool, ID.spf30, 'standard daily protection') };
  return { title: 'for everyday protection', sub: 'ranked for lightweight daily wear first.', picks: order(pool, ID.spf50, 'SPF 50, lightweight daily wear') };
}

export function resolveQuiz(category: string, answers: Answers): QuizResult {
  if (category === 'skin') return resolveSkin(answers);
  if (category === 'hair') return resolveHair(answers);
  if (category === 'makeup') return resolveMakeup(answers);
  return resolveSun(answers);
}

export interface LiveProductInfo {
  handle: string;
  title?: string;
  price?: number | null;
  image?: string | null;
  available?: boolean;
  url?: string;
}

export async function fetchLiveProductInfo(handles: string[]): Promise<Record<string, LiveProductInfo>> {
  if (handles.length === 0) return {};
  const res = await fetch(`/api/quiz-products?handles=${encodeURIComponent(handles.join(','))}`);
  if (!res.ok) return {};
  const list: LiveProductInfo[] = await res.json();
  const byHandle: Record<string, LiveProductInfo> = {};
  list.forEach(p => {
    byHandle[p.handle] = p;
  });
  return byHandle;
}

export function formatPrice(amount: number): string {
  return `₹${Math.round(amount)}`;
}
