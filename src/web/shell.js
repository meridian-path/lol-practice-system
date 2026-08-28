'use strict';

// The shared document shell for every web page: head
// meta, canonical, og/twitter, a JSON-LD slot, inlined CSS, a skip link,
// header + nav, <main>, and a footer carrying Riot's required disclaimer
// plus About/Privacy links. Every page in the web build (index.html/404.html,
// and every page added since) should be built
// by calling documentShell() -- there is exactly one place that assembles
// <head>/<header>/<footer>, so nothing drifts between pages.

const fs = require('fs');
const path = require('path');
const site = require('./../site.js');
const { escapeHtml } = require('../render/html.js');
const { adSlot, adsScriptTag } = require('./ads.js');
const adConfig = require('./adConfig.js');

// GoatCounter is a free, privacy-respecting, cookieless analytics service
// (no personal data collected) -- the standard async snippet, unconditional
// on every page, matching the pattern already live on the human's other
// asset (lichess-stats-poc / repertoire-builder). No other analytics vendor
// is wired in anywhere in this build.
const GOATCOUNTER_URL = 'https://dylangerrrrkerl.goatcounter.com/count';

// AdSense's own site-verification meta tag (independent of ad serving):
// declares the publisher id so the human can complete the "Add site" step
// in the AdSense dashboard. This is unconditional (not gated by
// adConfig.enabled) -- it only proves site ownership to Google, the same
// job ads.txt does for authorized sellers; it does not itself request,
// serve, or enable any ad unit. adConfig.enabled/slots stay untouched and
// still gate actual ad serving, per the human's original decision.
const ADSENSE_CLIENT = adConfig.client;

// AdSense Auto ads loader (human-confirmed, currently-generated snippet for
// this same publisher account). Unconditional,
// same as the verification meta tag above: Auto ads places ad units itself
// once Google approves the site-add, so it isn't gated by
// adConfig.enabled/slots -- that flag only ever applied to the older
// manual-unit plan (src/web/ads.js's adsScriptTag(), still dormant/gated
// below), which Auto ads supersedes per the human's decision. Left the old
// gated code path untouched rather than removing it.
const ADSENSE_AUTO_ADS_SCRIPT = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(ADSENSE_CLIENT)}" crossorigin="anonymous"></script>`;

// Riot's fan-content policy requires this exact wording,
// defined once in site.js and shared with the print pack (src/render/pages.js)
// so both outputs carry byte-identical text. Contact identity throughout the
// web build is a personal one, never a business/legal entity -- Riot's
// policy excludes projects that involve one.
const { RIOT_DISCLAIMER, TRADEMARK_NOTICE } = site;

// Inline SVG favicon: a mono wordmark glyph, no
// image file, no new asset pipeline -- a graphite disc with an amber "S"
// monogram (--color-accent-3, this asset's --accent), matching the
// amber/graphite theme identity rather than the retired accent-blue mark.
// The original design called for the disc as --color-bg-9
// (--paper); built as literally that, the disc is the exact same color as
// the og-image card's own --paper background it's composited onto
// (scripts/build-og-image.js), so it visually disappears there -- verified
// by rendering dist/og-image.png this task and viewing it. Using
// --color-bg-8 (--surface, one graphite step lighter) instead keeps the
// same "graphite disc" identity while staying visible against both the
// og-image card and a light or dark browser tab bar. A data: URI can't
// reference a CSS custom property, so its two colors are copied here
// literally from tokens.css at the one call site that needs them; this is
// the same, deliberate exception the human's other site's own
// FAVICON_DATA_URI takes to the "no hardcoded hex outside tokens.css"
// rule -- it's a self-contained embedded image asset, not page styling.
// scripts/build-og-image.js decodes this exact string to reuse the same
// mark in the 1200x630 og-image, so the favicon and the social-share image
// can never drift apart.
const FAVICON_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%23343330'/%3E%3Ctext x='32' y='45' font-family='Arial, Helvetica, sans-serif' font-size='38' font-weight='700' fill='%23C09941' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E";

// theme-color meta tag (mobile browser chrome). Same documented
// hardcoded-hex exception as FAVICON_DATA_URI above -- a meta content
// attribute can't reference a CSS custom property -- copied by value from
// tokens.css's --color-bg-9 (the dark theme's --paper, the page's default
// ground).
const THEME_COLOR_META = '#1C1B18';

// Pre-paint script: applies a stored theme choice, and marks the document
// as JS-capable, before the <style> block below is parsed -- so there is
// no flash of the wrong theme and the theme toggle (display:none by
// default; see .js .theme-toggle in screen.css) only ever appears once JS
// has actually run. Wrapped in try/catch for private-mode storage
// failures. No localStorage value (first visit) leaves the <html> element
// with no data-theme attribute at all, which is what makes dark the
// default -- :root's plain values are already the dark role assignment.
const THEME_PREPAINT_SCRIPT = `<script>
(function () {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
    document.documentElement.classList.add('js');
  } catch (e) {}
})();
</script>`;

// Theme toggle behavior: syncs the button's label to whatever theme is
// already in effect (covers a returning light-theme visitor, since the
// button's server-rendered label always assumes dark), then on click
// flips the theme, persists the choice, and re-labels. Inline, at the end
// of the body, non-blocking, no dependency.
const THEME_TOGGLE_SCRIPT = `<script>
(function () {
  var btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  function label(theme) {
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }
  label(document.documentElement.getAttribute('data-theme') || 'dark');
  btn.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    label(next);
  });
})();
</script>`;

// tokens.css + screen.css, read once at require time -- this IS the
// concatenation the build writes to dist/site.css, and it is also inlined
// directly into every page's <head> for fast static delivery,
// with no render-blocking stylesheet request for a one-page-and-out visit.
const SITE_CSS = [
  fs.readFileSync(path.join(__dirname, 'tokens.css'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'screen.css'), 'utf8')
].join('\n');

// Fixed nav order. Every page passes `active` (or null) to
// mark the current page with aria-current; pages that don't exist yet (until
// they're built) still get a working link into the future filename, since
// this shell defines the site's whole navigational shape up front.
const NAV_LINKS = [
  { key: 'home', label: 'Home', file: '' },
  { key: 'program', label: 'Program', file: 'program.html' },
  { key: 'focus-menu', label: 'Focus menu', file: 'focus-menu.html' },
  { key: 'drills', label: 'Drills', file: 'drills.html' },
  { key: 'warmup', label: 'Warmup', file: 'warmup.html' },
  { key: 'tracker', label: 'Tracker', file: 'tracker.html' },
  // vod-review.html/tilt-rules.html - both
  // were already real, indexable, sitemap-listed pages before this change
  // (not literally buried subsections), just absent from primary nav, so
  // a visitor browsing the header had no way to discover either one
  // without already knowing the URL or reaching it via program.html's own
  // end-links. .site-nav's own flex-wrap already handles the 2 extra
  // items with no other CSS change needed.
  { key: 'vod-review', label: 'VOD Review', file: 'vod-review.html' },
  { key: 'tilt-rules', label: 'Tilt Rules', file: 'tilt-rules.html' },
  { key: 'downloads', label: 'Downloads', file: 'downloads.html' },
  { key: 'faq', label: 'FAQ', file: 'faq.html' }
];

/**
 * @param {{title:string, description:string, canonical?:string,
 *   ogType?:'website'|'article', jsonLd?:string, noindex?:boolean}} opts
 *   `jsonLd`, if given, must already be a complete, ready-to-embed
 *   `<script type="application/ld+json">...</script>` string -- e.g. the
 *   direct return value of one of src/web/structuredData.js's builders.
 *   This function does not wrap it in another `<script>` tag itself.
 * @returns {string} a full <head>...</head> block.
 */
function documentHead(opts) {
  const { title, description, canonical, ogType = 'website', jsonLd, noindex } = opts;

  const canonicalLink = canonical
    ? `\n  <link rel="canonical" href="${escapeHtml(canonical)}">`
    : '';
  const robotsMeta = noindex ? '\n  <meta name="robots" content="noindex">' : '';
  const og = `\n  <meta property="og:title" content="${escapeHtml(title)}">` +
    `\n  <meta property="og:description" content="${escapeHtml(description)}">` +
    (canonical ? `\n  <meta property="og:url" content="${escapeHtml(canonical)}">` : '') +
    `\n  <meta property="og:type" content="${escapeHtml(ogType)}">` +
    `\n  <meta property="og:site_name" content="${escapeHtml(site.SITE_NAME)}">` +
    `\n  <meta property="og:image" content="${escapeHtml(site.absoluteUrl('og-image.png'))}">` +
    `\n  <meta property="og:image:width" content="1200">` +
    `\n  <meta property="og:image:height" content="630">` +
    `\n  <meta name="twitter:card" content="summary_large_image">`;
  const jsonLdBlock = jsonLd ? `\n  ${jsonLd}` : '';
  const adsScript = adsScriptTag();
  const adsScriptBlock = adsScript ? `\n  ${adsScript}` : '';

  return `<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'none'">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${THEME_COLOR_META}">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">${canonicalLink}${robotsMeta}${og}
  <meta name="google-adsense-account" content="${escapeHtml(ADSENSE_CLIENT)}">
  ${ADSENSE_AUTO_ADS_SCRIPT}
  <link rel="icon" href="${FAVICON_DATA_URI}">
  ${THEME_PREPAINT_SCRIPT}
  <style>${SITE_CSS}</style>${jsonLdBlock}${adsScriptBlock}
  <script data-goatcounter="${GOATCOUNTER_URL}" data-goatcounter-settings='{"allow_query":["utm_source","utm_medium","utm_campaign","utm_content","utm_term","ref"]}' async src="https://gc.zgo.at/count.js"></script>
</head>`;
}

/**
 * @param {string|null} active one of NAV_LINKS' `key`s, or null.
 * @returns {string} the shared header + nav markup.
 */
function renderHeader(active = null) {
  const links = NAV_LINKS
    .map(({ key, label, file }) => `<a href="${escapeHtml(site.url(file))}"${active === key ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`)
    .join('\n      ');

  // Two-tone wordmark: split SITE_NAME at its last space, no copy change,
  // no new constant. "Solo Queue" (--ink) / "Practice" (--accent).
  const lastSpace = site.SITE_NAME.lastIndexOf(' ');
  const brandMarkup = lastSpace === -1
    ? `<span class="brand-ink">${escapeHtml(site.SITE_NAME)}</span>`
    : `<span class="brand-ink">${escapeHtml(site.SITE_NAME.slice(0, lastSpace))}</span><span class="brand-accent">${escapeHtml(site.SITE_NAME.slice(lastSpace))}</span>`;

  // Brand + theme toggle share one row (.brand-row) so the toggle never
  // adds a fourth wrapped nav row on narrow viewports. The toggle is
  // display:none until .js confirms it can work (screen.css); its label
  // text IS the action ("Switch to light theme"), swapped by
  // THEME_TOGGLE_SCRIPT on click.
  return `<header class="site-header">
    <div class="brand-row">
      <a class="brand" href="${escapeHtml(site.url())}">${brandMarkup}</a>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to light theme">
        <span aria-hidden="true">&#9686;</span>
      </button>
    </div>
    <nav class="site-nav" aria-label="Main">
      ${links}
    </nav>
  </header>`;
}

// Newsletter signup: wired to the project's Substack publication. The
// embed URL below is the exact value Substack's own "embed a subscribe
// widget" panel generates for that publication (Settings -> Growth), so
// it is the one verified pointer to the right destination -- if the
// provider is ever swapped, replace this one constant. Loaded lazily by
// the inline script in documentShell() (only once its footer slot nears
// the viewport) rather than unconditionally on every page -- an
// eagerly-loaded iframe here cost filetools' whole Lighthouse Performance
// budget when the same wiring was first tried there, since the footer
// this renders into is sitewide (see docs/CHANGELOG.md).
const NEWSLETTER_FORM_ACTION = 'https://builtittheycome.substack.com/embed';
const SUBSTACK_PUBLICATION_URL = 'https://builtittheycome.substack.com';

/**
 * Shared social-link mark (a ring, a jagged upward line, a dot at the tip)
 * recreated as inline SVG from the operator's own profile picture. Colors
 * are the artist's fixed brand colors, not derived from this site's own
 * token ramp, so the mark stays recognizable and identical across every
 * property and the social profile itself -- same self-contained-asset
 * exception to the tokens-only rule as this file's own FAVICON_DATA_URI.
 */
// Colors are applied via CSS classes (tokens.css's --brand-mark-* custom
// properties), not inline hex attributes, so the built HTML never carries a
// literal hex value outside tokens.css -- keeps this passing
// test/buildSite.test.js's "no hardcoded hex color outside a var()
// reference" invariant while still declaring the colors as fixed, not
// derived from this site's own ramp.
const SOCIAL_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle class="brand-mark-ground" cx="50" cy="50" r="47"/><circle class="brand-mark-ring" cx="50" cy="50" r="35" fill="none" stroke-width="3"/><path class="brand-mark-line" d="M16 74 L38 58 L50 66 L83 27" fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle class="brand-mark-dot" cx="83" cy="27" r="9"/></svg>';

/**
 * Portfolio-wide footer credit line -- identical wording/type role on all
 * three properties, naming the operator and linking to the other two. Not a
 * donation/affiliate link, so renderFooter()'s "kept deliberately clean"
 * guarantee below is unaffected.
 */
function renderFooterCredit() {
  return `<p class="footer-credit">Built by Dylan - also making <a href="https://repertoire-builder.com" rel="noopener noreferrer">Repertoire Builder</a> and <a href="https://usefiletools.com" rel="noopener noreferrer">filetools</a>. <a class="footer-social" href="https://x.com/builtittheycome" rel="noopener noreferrer">${SOCIAL_ICON_SVG}Follow @builtittheycome</a></p>`;
}

/**
 * Sitewide newsletter signup, rendered inside the shared footer so it
 * appears on every page. Distinct from (and does not reintroduce) a
 * donation/affiliate link -- renderFooter()'s comment about staying clean of
 * those is unaffected; this is a plain program-updates signup.
 *
 * Substack's own signup-embed iframe can't be restyled cross-origin, and its
 * support docs confirm the embed form itself has no color/theme
 * customization option (only hiding the publication logo) -- so
 * .newsletter-embed-frame below softens the white-box collision with generous
 * token-driven padding/border/radius around it rather than attempting to
 * eliminate it, reusing this site's existing token roles instead of adding
 * a one-off pattern.
 */
function renderNewsletterSignup() {
  const embedTitle = 'Email signup for Solo Queue Practice updates';
  // A concrete, named incentive instead of a
  // vague "get updates" ask - the Focus Card (print/downloads.html) is a
  // real, ungated download either way (see src/render/pages.js's
  // renderFocusCard() for why this session did not build a client-side
  // gate: it would either be trivially bypassable or contradict this
  // site's own repeated "no email required" promise on every other
  // download), named here as the reason to subscribe rather than pretend
  // it is locked behind doing so.
  return `<div class="newsletter-signup">
      <h2 class="newsletter-heading">Get the Focus Card, plus program updates</h2>
      <p class="newsletter-description">Subscribe and grab the printable <a href="${escapeHtml(site.url('downloads.html'))}">Focus Card</a> - one page per 10-game block, no email required to download it, but a good reason to stay in the loop. One email when new drills, warmups, or focus content ship. No spam, unsubscribe anytime.</p>
      <div class="newsletter-embed-frame">
        <div class="newsletter-embed" data-newsletter-slot data-newsletter-src="${escapeHtml(NEWSLETTER_FORM_ACTION)}" data-newsletter-title="${escapeHtml(embedTitle)}"></div>
      </div>
      <noscript><p class="newsletter-description"><a href="${escapeHtml(SUBSTACK_PUBLICATION_URL)}" target="_blank" rel="noopener noreferrer">Subscribe on Substack</a></p></noscript>
    </div>`;
}

/**
 * Deferred loader for the footer newsletter embed -- inline (this project
 * has no per-page client-script pipeline, unlike filetools' *.client.js
 * modules) and loaded via IntersectionObserver so the third-party iframe
 * never fetches until its slot is actually near the viewport. See
 * NEWSLETTER_FORM_ACTION's comment above for why this matters.
 */
const NEWSLETTER_EMBED_SCRIPT = `<script>
(function () {
  var slots = document.querySelectorAll('[data-newsletter-slot]');
  if (!slots.length) return;
  function loadEmbed(slot) {
    var src = slot.getAttribute('data-newsletter-src');
    var title = slot.getAttribute('data-newsletter-title') || 'Email signup form';
    if (!src || !/^https:\\/\\//.test(src)) return;
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.width = '480';
    iframe.height = '320';
    iframe.loading = 'lazy';
    iframe.title = title;
    iframe.className = 'newsletter-embed';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    slot.replaceWith(iframe);
  }
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(slots, loadEmbed);
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        loadEmbed(entry.target);
      }
    });
  }, { rootMargin: '200px 0px' });
  Array.prototype.forEach.call(slots, function (slot) { observer.observe(slot); });
})();
</script>`;

/**
 * @returns {string} the shared footer -- Riot's required disclaimer verbatim,
 *   plus About/Privacy links. No Ko-fi/donation link and
 *   no affiliate link anywhere in this footer, ever -- kept deliberately clean.
 */
function renderFooter() {
  return `<footer class="site-footer">
    <p>${escapeHtml(RIOT_DISCLAIMER)}</p>
    <p>${escapeHtml(TRADEMARK_NOTICE)}</p>
    <p class="footer-links">
      <a href="${escapeHtml(site.url('about.html'))}">About</a>
      <a href="${escapeHtml(site.url('privacy.html'))}">Privacy</a>
    </p>
    ${renderFooterCredit()}
    ${renderNewsletterSignup()}
  </footer>`;
}

/**
 * @param {{title:string, description:string, bodyHtml:string, canonical?:string,
 *   ogType?:'website'|'article', jsonLd?:string, active?:string|null,
 *   noindex?:boolean}} opts see documentHead() for `jsonLd`'s exact shape.
 * @returns {string} a full standalone HTML document using the shared shell.
 */
function documentShell(opts) {
  const { title, description, bodyHtml, canonical, ogType, jsonLd, active = null, noindex } = opts;
  return `<!doctype html>
<html lang="en">
${documentHead({ title, description, canonical, ogType, jsonLd, noindex })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${renderHeader(active)}
  <main id="main" class="page-shell">
${bodyHtml}
  </main>
  ${renderFooter()}
  ${NEWSLETTER_EMBED_SCRIPT}
  ${THEME_TOGGLE_SCRIPT}
</body>
</html>
`;
}

/**
 * The static-hosting 404 page. GitHub Pages serves
 * /404.html automatically. Uses the exact same header/nav/footer shell as
 * every other page, marked noindex, and carries no ad slot
 * (about/privacy/404/print pages get zero ads).
 */
function render404Page() {
  const title = `Page not found | ${site.SITE_NAME}`;
  const description = `The page you followed a link to doesn’t exist on ${site.SITE_NAME}. Here’s where to pick back up.`;
  const body = `<div class="not-found zone-measure">
      <h1>That page doesn’t exist</h1>
      <p class="lead">The link you followed may be out of date, or the page may have moved.</p>
      <ul>
        <li><a href="${escapeHtml(site.url())}">Home</a></li>
      </ul>
    </div>`;
  return documentShell({ title, description, bodyHtml: body, noindex: true });
}

module.exports = {
  SITE_CSS,
  FAVICON_DATA_URI,
  RIOT_DISCLAIMER,
  TRADEMARK_NOTICE,
  NAV_LINKS,
  documentHead,
  renderHeader,
  renderFooter,
  renderNewsletterSignup,
  documentShell,
  render404Page,
  adSlot
};
