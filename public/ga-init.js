// GA4 bootstrap, split into its own same-origin file instead of an inline
// <script> block in index.html. The CSP's script-src only allows 'self' +
// the googletagmanager.com host that serves gtag.js — an inline block here
// would need 'unsafe-inline' (which defeats the point of having a script-src
// allowlist at all) or a per-request nonce (extra complexity for a static
// file server). Loading this as a normal same-origin <script src> sidesteps
// both.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
// GA4's debug_mode has to be set on this initial config call — setting it
// via a later gtag('set'/'config', ...) call doesn't retroactively flag
// hits already using the initialized client. ?ga_debug=1 is opt-in only
// (checked once, at load) so it never affects real visitors' events.
const debugMode = new URLSearchParams(window.location.search).get('ga_debug') === '1';
console.log('[GA-INIT-DEBUG] search=', window.location.search, 'debugMode=', debugMode);
gtag('config', 'G-X9P5L4CF0R', debugMode ? { debug_mode: true } : {});
