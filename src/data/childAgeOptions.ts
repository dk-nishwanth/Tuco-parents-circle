// Single source of truth for the "child age" field so every entry point
// (email signup AND Google profile completion) stores the SAME canonical
// values. Previously the two forms used different option sets (single years vs
// ranges), which made the childAge column impossible to segment on cleanly.
export const CHILD_AGE_OPTIONS = [
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

// Map a legacy/raw childAge value (e.g. a single year "6", or a stray "null")
// to the closest canonical bucket. Used to normalize historical rows and to be
// tolerant of anything odd coming in.
export function normalizeChildAge(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v || v.toLowerCase() === 'null' || v.toLowerCase() === 'undefined') return null;
  // Already canonical
  if ((CHILD_AGE_OPTIONS as readonly string[]).includes(v)) return v;
  // A number of years, possibly with a unit suffix ("6", "5 years", "5yr") → bucket
  const yearsMatch = v.match(/^(\d+)\s*(y|yr|yrs|year|years)?$/i);
  const n = yearsMatch ? Number(yearsMatch[1]) : Number(v);
  if (!Number.isNaN(n) && (yearsMatch || /^\d+$/.test(v))) {
    if (n < 1) return '0–6 months';
    if (n < 2) return '1–2 years';
    if (n < 3) return '2–3 years';
    if (n < 5) return '3–5 years';
    if (n < 8) return '5–8 years';
    if (n < 12) return '8–12 years';
    return '12+ years';
  }
  return v; // leave anything else untouched
}

// A short "here's what's coming up" blurb per bucket, shown as a milestone
// notification whenever a parent updates their child's age into a NEW
// bucket (see the childAge-change check in PATCH /api/users/me). Kept
// deliberately brief — this is a notification teaser, not the content
// itself.
export const MILESTONE_TIPS: Record<string, string> = {
  '0–6 months': 'Sleep schedules, tummy time, and first smiles — the community has tips for the newborn stretch.',
  '6–12 months': 'Starting solids, crawling, and sleep regressions — see what other parents are navigating right now.',
  '1–2 years': 'Walking, first words, and toddler tantrums begin — check out what the community is discussing.',
  '2–3 years': 'Potty training and the "terrible twos" — browse threads from parents going through it too.',
  '3–5 years': 'Preschool, big feelings, and more independence — see what is trending for this age.',
  '5–8 years': 'School routines, friendships, and screen time questions — the community has been there.',
  '8–12 years': 'Growing independence, tricky social dynamics, and more — see what other parents suggest.',
  '12+ years': 'The teen years bring new questions — browse what other tuco parents are talking about.',
};
