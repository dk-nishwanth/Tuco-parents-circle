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
