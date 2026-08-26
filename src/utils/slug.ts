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

// Builds the "-my-thread-title" suffix appended after the numeric id, or an
// empty string if the title doesn't yield a usable slug (e.g. all-emoji).
export function threadSlugSuffix(title: string | undefined | null): string {
  if (!title) return '';
  const slug = slugify(title);
  return slug ? `-${slug}` : '';
}
