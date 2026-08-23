'use strict';

// The web-site build: writes dist/site.css and every
// flat .html page under dist/ (the site root -- separate from dist/print/,
// which src/build.js owns). WEB_PAGES below now lists all 15 pages the site
// ships (home/404 from this file's own foundation, plus each other page
// module spliced in), assembled without this file needing to be
// restructured as more pages landed.
//
// This build does NOT do a blanket clear of dist/ before writing -- dist/ is
// shared with dist/print/ (owned by src/build.js's own cleanDir()), and a
// blanket rmSync here would delete the print pack out from under a
// build:all run that hasn't gotten to the print step yet (or has already
// finished it). Instead, pruneStaleTopLevelFiles() below removes any
// top-level *file* in dist/ (never touching the dist/print/ directory,
// which src/build.js owns and cleans itself) that this build did not just
// write and that isn't a known hand-run output -- so a page renamed or
// removed from WEB_PAGES doesn't leave a stale file behind forever. Added
// during the integration pass per this file's own prior note that a later
// pass should add this check.

const fs = require('fs');
const path = require('path');

const site = require('../site.js');
const shell = require('./shell.js');
const { CONTENT_PAGES } = require('./contentPages.js');
// drills.html (12 cards, anchor id + back-link per
// drill) and warmup.html (5 role routines with anchors).
const { DRILL_WARMUP_PAGES } = require('./drillWarmupPages.js');
// early-game.html, macro-play.html, wave-management.html -- standalone content-gap pages (not guide.js-derived).
const { renderEarlyGame } = require('./earlyGame.js');
const { renderMacroPlay } = require('./macroPlay.js');
const { renderWaveManagement } = require('./waveManagement.js');
// climbing-{role}.html -- 5 standalone content-gap pages, one per role.
const {
  renderTopGuide,
  renderJungleGuide,
  renderMidGuide,
  renderAdcGuide,
  renderSupportGuide
} = require('./roleGuides.js');

// home (replaces this file's original minimal stub),
// tracker, downloads, about, and privacy. Each of these pages lives in its
// own small module and is merged into WEB_PAGES below, so this file itself
// never needs restructuring as more pages land.
const pagesB3 = require('./pagesB3.js');

// SEO/metadata infrastructure -- sitemap.xml/robots.txt
// generated from the final written file list, dist/ads.txt, and a build-time
// metadata assertion that fails loudly on a missing/over-length/duplicate
// title or description. These wire into build() below rather than into
// WEB_PAGES, since they aren't pages themselves.
const sitemap = require('./sitemap.js');
const { adsTxtContent } = require('./adsTxt.js');
const { assertPageMetadata } = require('./assertMetadata.js');

const DIST = path.join(__dirname, '..', '..', 'dist');

// Pre-generated, git-tracked assets copied into dist/ on every build --
// currently just og-image.png, produced by scripts/build-og-image.js (a
// Playwright script, deliberately not wired into build:site/build:all so
// the main build never depends on a browser being available -- see that
// script's own header). Lives under assets/, not dist/, precisely because
// dist/ is gitignored build output regenerated from scratch by CI on every
// deploy: a file only ever written by hand straight into dist/ would
// silently vanish from the live site the moment dist/ stopped being
// committed. Mirrors filetools' own src/build.js ASSETS_DIR/copy-if-present
// pattern for its equivalent pre-generated identity assets.
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
const COPIED_ASSETS = [
  'og-image.png',
  // IndexNow key file -- must be served at https://<host>/<key>.txt
  // verbatim, so it's a copied-in tracked asset like og-image.png rather
  // than anything build-generated.
  '7f91145eb345dbdc125025ab9faf0c6482c302aa1b92d73a7b8e20a76f818668.txt'
];

function copyTrackedAssets() {
  const copied = [];
  for (const file of COPIED_ASSETS) {
    const src = path.join(ASSETS_DIR, file);
    if (fs.existsSync(src)) {
      fs.mkdirSync(DIST, { recursive: true });
      fs.copyFileSync(src, path.join(DIST, file));
      copied.push(file);
    }
  }
  return copied;
}

function writeFile(name, content) {
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, name), content, 'utf8');
  return name;
}

// Removes any top-level file directly under dist/ that this build did not
// just write and that isn't a known copied-in tracked asset (COPIED_ASSETS,
// kept in the expected set even on a run where copyTrackedAssets() found
// nothing to copy, so a pre-existing dist/og-image.png is never deleted out
// from under a partial/interrupted build). Never touches directories
// (dist/print/ is owned and cleaned by src/build.js's own cleanDir(), not
// this function). Returns the list of removed filenames.
function pruneStaleTopLevelFiles(writtenFiles) {
  if (!fs.existsSync(DIST)) return [];
  const expected = new Set([...writtenFiles, ...COPIED_ASSETS]);
  const removed = [];
  for (const entry of fs.readdirSync(DIST, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (!expected.has(entry.name)) {
      fs.rmSync(path.join(DIST, entry.name));
      removed.push(entry.name);
    }
  }
  return removed;
}

// Ordered list of [filename, renderFn] pairs. New pages are appended
// here (or in their own small module merged into this array) rather
// than restructuring this build.
const WEB_PAGES = [
  ['index.html', pagesB3.renderHome],
  ['404.html', shell.render404Page],
  ['tracker.html', pagesB3.renderTracker],
  ['downloads.html', pagesB3.renderDownloads],
  ['about.html', pagesB3.renderAbout],
  ['privacy.html', pagesB3.renderPrivacy],
  // Guide-derived content pages (program/baseline/focus-menu/
  // champion-pool/vod-review/tilt-rules/faq), rendered from content/guide.js
  // via src/web/contentPages.js.
  ...CONTENT_PAGES,
  // drills.html, warmup.html.
  ...DRILL_WARMUP_PAGES,
  ['early-game.html', renderEarlyGame],
  ['macro-play.html', renderMacroPlay],
  ['wave-management.html', renderWaveManagement],
  ['climbing-top.html', renderTopGuide],
  ['climbing-jungle.html', renderJungleGuide],
  ['climbing-mid.html', renderMidGuide],
  ['climbing-adc.html', renderAdcGuide],
  ['climbing-support.html', renderSupportGuide]
];

function build() {
  const written = [];
  const htmlPages = [];
  written.push(writeFile('site.css', shell.SITE_CSS));
  for (const [name, render] of WEB_PAGES) {
    const content = render();
    written.push(writeFile(name, content));
    if (name.endsWith('.html')) {
      htmlPages.push({ file: name, html: content });
    }
  }

  // Metadata correctness is a test, not a review item --
  // fails the whole build loudly on a missing/over-length/duplicate title
  // or description before anything below (sitemap, ads.txt) is written.
  assertPageMetadata(htmlPages);

  // Pre-generated identity assets (og-image.png), copied in from the
  // git-tracked assets/ directory -- see copyTrackedAssets()'s own comment
  // above for why this can't just live in dist/ directly. Pushed into
  // `written` (harmless for the sitemap generation right below, which only
  // ever looks at .html files) so pruneStaleTopLevelFiles() below never
  // treats a freshly-copied-in asset as stale.
  written.push(...copyTrackedAssets());

  // Generated from the files actually written above, never hand-maintained
  // -- sitemap.js itself excludes 404.html and print/.
  written.push(writeFile('sitemap.xml', sitemap.renderSitemapXml(written)));
  written.push(writeFile('robots.txt', sitemap.robotsTxtContent()));
  written.push(writeFile('ads.txt', adsTxtContent()));

  // GitHub Pages custom-domain wiring: a CNAME file at the root of the
  // uploaded Pages artifact is what tells GitHub Pages which custom domain
  // to serve this site on and to redirect the bare .github.io URL to it.
  // Derived from site.js's SITE_ORIGIN rather than a second hardcoded
  // domain string, so there is exactly one place the domain is defined.
  const customDomain = new URL(site.SITE_ORIGIN).hostname;
  written.push(writeFile('CNAME', `${customDomain}\n`));

  pruneStaleTopLevelFiles(written);

  return written;
}

if (require.main === module) {
  const files = build();
  console.log(`Built ${files.length} files into ${DIST}:`);
  files.forEach(f => console.log(`  - ${f}`));
}

module.exports = { build, DIST, WEB_PAGES, pruneStaleTopLevelFiles, ASSETS_DIR, COPIED_ASSETS, copyTrackedAssets };
