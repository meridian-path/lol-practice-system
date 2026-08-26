'use strict';

// Tests for promoting vod-review.html and
// tilt-rules.html to first-class nav items. Both were already real,
// indexable, sitemap-listed pages before this change (confirmed against
// src/web/buildSite.js's own WEB_PAGES list and sitemap.js, not literally
// buried subsections) - this checks specifically that they're now
// reachable from the shared header nav on every page, with the right page
// marked aria-current on each of their own pages.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildSite, DIST } = require('../src/web/buildSite.js');

function readDist(name) {
  return fs.readFileSync(path.join(DIST, name), 'utf8');
}

buildSite();

test('the shared header nav links to vod-review.html and tilt-rules.html on every page, not just program.html\'s own end-links', () => {
  for (const page of ['index.html', 'program.html', 'focus-menu.html', 'faq.html']) {
    const html = readDist(page);
    const navSection = html.split('<nav class="site-nav"')[1] || '';
    assert.ok(navSection.includes(path.posix.join('/', 'vod-review.html')) || navSection.includes('vod-review.html'), `${page}'s header nav should link to vod-review.html`);
    assert.ok(navSection.includes('tilt-rules.html'), `${page}'s header nav should link to tilt-rules.html`);
  }
});

test('vod-review.html and tilt-rules.html each mark their own nav link aria-current="page"', () => {
  const vodHtml = readDist('vod-review.html');
  const tiltHtml = readDist('tilt-rules.html');
  assert.ok(/<a href="[^"]*vod-review\.html" aria-current="page">/.test(vodHtml), 'vod-review.html should mark its own nav link current');
  assert.ok(/<a href="[^"]*tilt-rules\.html" aria-current="page">/.test(tiltHtml), 'tilt-rules.html should mark its own nav link current');
});

test('every real nav link on the home page resolves to a page that actually exists in WEB_PAGES (no dead nav link introduced)', () => {
  const { WEB_PAGES } = require('../src/web/buildSite.js');
  const realPageNames = new Set(WEB_PAGES.map(([name]) => name));
  const html = readDist('index.html');
  const navSection = html.split('<nav class="site-nav"')[1].split('</nav>')[0];
  const hrefs = [...navSection.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
  assert.ok(hrefs.length >= 10, `expected at least 10 nav links (8 original + vod-review + tilt-rules), found ${hrefs.length}`);
  for (const href of hrefs) {
    const file = href.replace(/^\//, '');
    if (file === '') continue; // home
    assert.ok(realPageNames.has(file), `nav links to "${href}", which is not a real page in WEB_PAGES`);
  }
});
