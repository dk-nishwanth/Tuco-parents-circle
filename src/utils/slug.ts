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

// Raw "<id>[-slug]" value shared by every thread-URL scheme below — the
// slug is cosmetic (only the leading digits are ever parsed back out), kept
// mainly so a pasted/bookmarked link shows the actual question.
function threadIdSlug(id: number, title: string | undefined | null): string {
  const slug = title ? slugify(title) : '';
  return `${id}${slug ? `-${slug}` : ''}`;
}

// The in-app "thread open" URL while browsing — a *query string* on the
// current page (e.g. "?thread=425-my-thread-title"), not a #hash. Unlike a
// hash, a query string DOES reach the server, so copying this straight out
// of the address bar is just as crawlable/link-preview-able as the
// dedicated share button — see the bot-detection branch on the /:category
// routes in server/index.ts, which now recognizes this same param.
export function threadQuery(id: number, title: string | undefined | null): string {
  return `?thread=${threadIdSlug(id, title)}`;
}

// Full external share URL — points at the server's /thread/:id[-slug]
// permalink route (a clean, stable URL, unlike the query-string form above
// which is tied to whatever category page happened to be open). Both reach
// the server, both work for previews; this one is just the nicer canonical
// link for deliberate sharing.
export function threadShareUrl(id: number, title: string | undefined | null): string {
  return `${window.location.origin}/thread/${threadIdSlug(id, title)}`;
}
