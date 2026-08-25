'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build, DIST } = require('../src/build.js');
const { VERSION, LAST_REVIEWED } = require('../src/render/pages.js');

const EXPECTED_FILES = [
  'print.css',
  '00-readme.html',
  '01-quick-start.html',
  '02-program-guide.html',
  '03-warmup-cards.html',
  '04-drill-library.html',
  '05-tracker-workbook.xlsx',
  '06-matchup-study-sheet.html',
  '07-vod-review-sheet.html',
  '08-focus-card.html'
];

test('build() produces exactly the expected file list in dist/', () => {
  const written = build();
  assert.deepEqual(written.slice().sort(), EXPECTED_FILES.slice().sort());
  for (const f of EXPECTED_FILES) {
    assert.ok(fs.existsSync(path.join(DIST, f)), `expected ${f} to exist in dist/`);
  }
});

test('every produced HTML document contains the version/last-reviewed footer', () => {
  build();
  const htmlFiles = EXPECTED_FILES.filter(f => f.endsWith('.html'));
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.ok(content.includes(`v${VERSION}`), `${f} missing version footer`);
    assert.ok(content.includes(LAST_REVIEWED), `${f} missing last-reviewed date in footer`);
    assert.ok(content.includes('Legal Jibber Jabber'), `${f} missing disclaimer`);
  }
});

test('every produced HTML document ships the CSP and referrer meta tags', () => {
  build();
  const htmlFiles = EXPECTED_FILES.filter(f => f.endsWith('.html'));
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.match(
      content,
      /<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'none'">/,
      `${f} missing CSP meta tag`
    );
    assert.match(
      content,
      /<meta name="referrer" content="strict-origin-when-cross-origin">/,
      `${f} missing referrer meta tag`
    );
  }
});

test('every produced HTML document has a unique <title>, a <meta description>, and html lang="en"', () => {
  build();
  const htmlFiles = EXPECTED_FILES.filter(f => f.endsWith('.html'));
  const titles = new Set();
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST, f), 'utf8');
    // The print pack's <html> tag also carries data-theme="light" (the
    // print pack always renders light regardless of the web build's
    // dark-default theme toggle), so this checks for the lang attribute
    // rather than an exact full-tag string.
    assert.match(content, /<html lang="en"[^>]*>/, `${f} missing html lang attribute`);
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    assert.ok(titleMatch, `${f} missing <title>`);
    assert.ok(!titles.has(titleMatch[1]), `${f} has a duplicate <title>: ${titleMatch[1]}`);
    titles.add(titleMatch[1]);
    assert.ok(/<meta name="description" content="[^"]+"/.test(content), `${f} missing meta description`);
  }
});
