// Turns a thread title into a URL-friendly slug for readable share links.
// The numeric id stays the actual source of truth for routing — the slug is
// purely cosmetic, so a stale/mismatched slug in an old bookmarked link
// never breaks navigation (see parsing side: only the leading digits count).
export function slugify(text: string, maxLen = 60): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '');
  return slug;
}

// Builds the URL hash for a thread — slug-only ("#thread-my-thread-title")
// whenever the title yields a usable slug, so the numeric id never shows up
// in a freshly-generated link. Falls back to the bare id only for the rare
// title that slugifies to nothing (all-emoji, non-Latin script, etc.),
// since a slug that collides with every other such title would be
// unresolvable on the reading end.
export function threadHash(id: number, title: string | undefined | null): string {
  const slug = title ? slugify(title) : '';
  return `#thread-${slug || id}`;
}
