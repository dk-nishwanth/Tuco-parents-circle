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
gtag('config', 'G-X9P5L4CF0R');
