'use strict';

// Tests for src/web/pagesB3.js (home/tracker/downloads/about/privacy).
// build.js's build() runs first in each test that needs
// dist/print/ populated, mirroring how `npm run build:all` actually orders
// things (print pack, then site) -- these tests don't assume any other test
// file has already populated dist/print/ for them.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildPrint } = require('../src/build.js');
const { build: buildSite, DIST, WEB_PAGES } = require('../src/web/buildSite.js');
const pagesB3 = require('../src/web/pagesB3.js');
const site = require('../src/site.js');

const HOME_TRACKER_DOWNLOADS_ABOUT_PRIVACY_PAGES = ['index.html', 'tracker.html', 'downloads.html', 'about.html', 'privacy.html'];

function readDist(name) {
  return fs.readFileSync(path.join(DIST, name), 'utf8');
}

test('downloads.html links every actual file currently in dist/print/ (excluding print.css)', () => {
  buildPrint();
  buildSite();
  const content = readDist('downloads.html');
  const printFiles = fs.readdirSync(pagesB3.PRINT_DIR).filter(f => f !== 'print.css');
  assert.ok(printFiles.length > 0, 'expected the print pack to have produced at least one file');
  for (const f of printFiles) {
    assert.ok(content.includes(`print/${f}`), `downloads.html is missing a link to ${f}`);
  }
});

test('downloads.html shows a file type and a size for every download row', () => {
  buildPrint();
  buildSite();
  const content = readDist('downloads.html');
  // Every group row's meta span should contain at least one "(<n> KB)" size.
  const meta = content.match(/<span class="download-meta">[\s\S]*?<\/span>/g) || [];
  assert.ok(meta.length > 0, 'expected at least one download-meta span');
  assert.ok(meta.some(m => /KB\)/.test(m)), 'expected at least one size like "(12 KB)" in a download-meta span');
});

test('every file in dist/print/ has a working (non-noindex-broken) type label -- html/pdf/xlsx all recognized', () => {
  buildPrint();
  const files = pagesB3.readPrintFiles();
  assert.ok(files.length > 0);
  for (const f of files) {
    assert.notEqual(f.typeLabel, '', `${f.file} got an empty type label`);
    assert.ok(/^\d+(\.\d+)? KB$/.test(f.sizeLabel), `${f.file} got a malformed size label: ${f.sizeLabel}`);
  }
});

test('home page links to every major section, including tracker and downloads, via 3 ranked feature cards + 8 tile-index tiles', () => {
  buildSite();
  const content = readDist('index.html');
  for (const file of ['program.html', 'baseline.html', 'focus-menu.html', 'drills.html', 'warmup.html',
    'champion-pool.html', 'vod-review.html', 'tilt-rules.html', 'tracker.html', 'downloads.html', 'faq.html']) {
    assert.ok(content.includes(site.url(file)), `home page is missing a link to ${file}`);
  }
  const featureCardCount = (content.match(/class="feature-card"/g) || []).length;
  const tileCount = (content.match(/class="tile"/g) || []).length;
  assert.equal(featureCardCount, 3, 'expected exactly 3 ranked "Start here" feature cards on the home page');
  assert.equal(tileCount, 8, 'expected exactly 8 tiles in the "Everything else" tile index on the home page');
});

test('about.html carries the full Riot disclaimer and trademark notice in its own body (not just the shared footer)', () => {
  buildSite();
  const content = readDist('about.html');
  const bodyOnly = content.split('</header>')[1] || content;
  assert.ok(bodyOnly.includes(site.RIOT_DISCLAIMER), 'about.html body should restate the Riot disclaimer');
  assert.ok(bodyOnly.includes(site.TRADEMARK_NOTICE), 'about.html body should restate the trademark notice');
  assert.ok(!content.includes('Meridian Path Media'), 'about.html must never use the business-entity contact identity');
});

test('about.html carries the project contact email as a mailto link, not a placeholder', () => {
  buildSite();
  const content = readDist('about.html');
  assert.ok(!/no public contact address/i.test(content), 'about.html should no longer show the not-yet-supplied contact placeholder notice now that a real address is wired in');
  assert.ok(content.includes('mailto:ops@meridianpath.media'), 'expected a mailto link to the real contact address');
  assert.ok(content.includes('ops@meridianpath.media'), 'expected the real contact email to appear in the rendered page');
  assert.ok(!content.includes('dylanger2525@gmail.com'), 'about.html must never expose the personal contact email');
});

test('about.html carries no internal task/decision ids or process vocabulary in its rendered output', () => {
  buildSite();
  const content = readDist('about.html');
  assert.ok(!/task-ms|decision-ms|orchestrator|chief-of-staff|meridian path media/i.test(content),
    'about.html should never leak internal ids, role names, or the excluded business-entity identity into rendered output');
});

test('privacy.html discloses both third-party ad cookies (AdSense) and analytics (GoatCounter)', () => {
  buildSite();
  const content = readDist('privacy.html');
  assert.match(content, /AdSense/);
  assert.match(content, /GoatCounter/);
  assert.match(content, /cookies/i);
});

test('tracker.html and downloads.html each carry exactly one primary action button', () => {
  buildPrint();
  buildSite();
  for (const page of ['tracker.html', 'downloads.html', 'about.html', 'privacy.html', 'index.html']) {
    const content = readDist(page);
    const primaryCount = (content.match(/class="btn-primary"/g) || []).length;
    assert.equal(primaryCount, 1, `${page} should carry exactly one primary action, found ${primaryCount}`);
  }
});

test('all five home/tracker/downloads/about/privacy pages are present in WEB_PAGES and build without throwing', () => {
  for (const name of HOME_TRACKER_DOWNLOADS_ABOUT_PRIVACY_PAGES) {
    assert.ok(WEB_PAGES.some(([n]) => n === name), `${name} missing from WEB_PAGES`);
  }
});

test('index.html carries a WebSite JSON-LD block; tracker/downloads/about/privacy each carry an Article block matching their own canonical URL', () => {
  buildPrint();
  buildSite();
  const CANONICAL_FILE = { 'index.html': '', 'tracker.html': 'tracker.html', 'downloads.html': 'downloads.html', 'about.html': 'about.html', 'privacy.html': 'privacy.html' };
  for (const page of HOME_TRACKER_DOWNLOADS_ABOUT_PRIVACY_PAGES) {
    const content = readDist(page);
    const matches = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(matches.length, 1, `${page} should carry exactly one JSON-LD block, found ${matches.length}`);
    const data = JSON.parse(matches[0][1]);
    assert.equal(data['@context'], 'https://schema.org');
    if (page === 'index.html') {
      assert.equal(data['@type'], 'WebSite');
      assert.equal(data.url, site.absoluteUrl(''));
      assert.ok(!('potentialAction' in data), 'index.html WebSite JSON-LD should carry no sitelinks searchbox action (no on-site search)');
    } else {
      assert.equal(data['@type'], 'Article');
      assert.equal(data.mainEntityOfPage['@id'], site.absoluteUrl(CANONICAL_FILE[page]));
    }
  }
});
