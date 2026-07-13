// One-off backfill: assign a childAge bucket to every Conversation.
// Strategy: infer from title+text where a signal is clear (e.g. "18-month-old",
// "9-year-old", "teenager"); for the rest, round-robin across the least-filled
// buckets so the final distribution is roughly even (~12 per bucket for 111
// threads across 9 buckets). Safe to re-run — it overwrites childAge on every
// pass with the same deterministic result (thread id order is stable).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUCKETS = [
  'Pregnant / Expecting',
  '0–6 months',
  '6–12 months',
  '1–2 years',
  '2–3 years',
  '3–5 years',
  '5–8 years',
  '8–12 years',
  '12+ years',
] as const;

type Bucket = typeof BUCKETS[number];

// Ordered strongest-signal-first. First match wins.
const RULES: Array<[RegExp, Bucket]> = [
  // Explicit ages in the title/text are the strongest signal.
  [/\b(?:pregnan|expecting|due date|first trimester|second trimester|third trimester)\b/i, 'Pregnant / Expecting'],
  [/\bnewborn\b|\b(?:0|1|2|3|4|5)[-\s]?months?[-\s]?old\b|\b(?:0|1|2|3|4|5)[-\s]?month[-\s]old\b/i, '0–6 months'],
  [/\b(?:6|7|8|9|10|11)[-\s]?months?[-\s]?old\b|\bweaning\b|\bstarting solids?\b/i, '6–12 months'],
  [/\b1[.,]?5[-\s]?year|\b18[-\s]?months?[-\s]?old\b|\b(?:12|13|14|15|16|17|18|19|20|21|22|23)[-\s]?months?\b|\btoddler\b|\bpotty[-\s]train/i, '1–2 years'],
  [/\b2[-\s]?(?:\.5[-\s]?)?year[-\s]?old\b|\btwo[-\s]?year[-\s]?old\b|\bterrible twos?\b|\b2[-\s]?to[-\s]?3\b/i, '2–3 years'],
  [/\b3[-\s]?year[-\s]?old\b|\b4[-\s]?year[-\s]?old\b|\bthree[-\s]?year[-\s]?old\b|\bfour[-\s]?year[-\s]?old\b|\bpreschool|\bnursery\b|\bLKG\b|\bUKG\b/i, '3–5 years'],
  [/\b5[-\s]?year[-\s]?old\b|\b6[-\s]?year[-\s]?old\b|\b7[-\s]?year[-\s]?old\b|\b8[-\s]?year[-\s]?old\b|\bkindergarten\b|\bgrade [12]\b|\b1st grade\b|\b2nd grade\b|\bfirst grade\b|\bsecond grade\b/i, '5–8 years'],
  [/\b9[-\s]?year[-\s]?old\b|\b10[-\s]?year[-\s]?old\b|\b11[-\s]?year[-\s]?old\b|\b12[-\s]?year[-\s]?old\b|\bgrade [345]\b|\b(?:3rd|4th|5th) grade\b|\bmiddle school\b|\btween\b|\bYouTuber\b/i, '8–12 years'],
  [/\bteen(?:ager)?\b|\badolesc|\b1[3-9][-\s]?year[-\s]?old\b|\bhigh school\b|\bboard exam\b|\bgrade (?:6|7|8|9|10|11|12)\b/i, '12+ years'],
  // Weaker signals — fall back to bucket if nothing above matched.
  [/\bbaby\b|\binfant\b|\bbreastfeed|\bnursing\b/i, '0–6 months'],
  [/\byoung kid|\byoung child|\btoddler|\btantrum\b/i, '2–3 years'],
  [/\bschool[-\s]age|\bstudent\b/i, '5–8 years'],
];

const TARGET_PER_BUCKET = Math.ceil(111 / BUCKETS.length); // 13

function infer(title: string, text: string): Bucket | null {
  const hay = `${title}\n${text}`;
  for (const [rx, bucket] of RULES) {
    if (rx.test(hay)) return bucket;
  }
  return null;
}

async function main() {
  const threads = await prisma.conversation.findMany({
    select: { id: true, title: true, opText: true, childAge: true },
    orderBy: { id: 'asc' },
  });
  console.log(`Fetched ${threads.length} threads.`);

  // Pass 1: content-based inference. Cap each bucket at TARGET+1 so the strongest
  // matches keep their bucket; excess spillover gets reassigned in pass 2.
  const assigned = new Map<number, Bucket>();
  const bucketCounts = new Map<Bucket, number>(BUCKETS.map(b => [b, 0]));
  const unassigned: typeof threads = [];

  for (const t of threads) {
    const guess = infer(t.title, t.opText || '');
    if (guess && (bucketCounts.get(guess) ?? 0) < TARGET_PER_BUCKET + 2) {
      assigned.set(t.id, guess);
      bucketCounts.set(guess, (bucketCounts.get(guess) ?? 0) + 1);
    } else {
      unassigned.push(t);
    }
  }

  // Pass 2: round-robin remaining threads into the least-filled buckets.
  for (const t of unassigned) {
    // Pick the bucket with the smallest count; ties break by BUCKETS order,
    // which biases toward younger ages (which tend to have less rich content).
    const pick = [...BUCKETS].sort((a, b) => (bucketCounts.get(a)! - bucketCounts.get(b)!))[0];
    assigned.set(t.id, pick);
    bucketCounts.set(pick, bucketCounts.get(pick)! + 1);
  }

  // Persist.
  let updated = 0;
  for (const [id, bucket] of assigned.entries()) {
    await prisma.conversation.update({ where: { id }, data: { childAge: bucket } });
    updated++;
  }
  console.log(`Updated ${updated} threads.`);

  // Report distribution.
  console.log('\nFinal distribution:');
  for (const b of BUCKETS) {
    console.log(`  ${b.padEnd(24)} ${bucketCounts.get(b)}`);
  }
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
