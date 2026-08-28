'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { smartenText, smartenHtml } = require('../src/render/smartQuotes.js');
const { build, DIST } = require('../src/build.js');
const { build: buildSite, DIST: WEB_DIST } = require('../src/web/buildSite.js');

// This project's craft floor (design-standards.md) requires curly
// quotes/apostrophes in prose. src/render/smartQuotes.js's smartenHtml()
// converts a straight apostrophe to curly wherever it sits between two word
// characters (don't, jungler's) in HTML TEXT CONTENT only -- never inside a
// tag attribute, a <script> block, or a <style> block, since a straight
// apostrophe there is load-bearing (a JS string literal, a JSON value, a
// URL) rather than typographic prose. These tests guard both halves: real
// conversion where it should happen, and untouched output everywhere it must
// not.
const CURLY = '’';

test('smartenText converts an intra-word apostrophe to curly', () => {
  assert.equal(smartenText("don't"), `don${CURLY}t`);
  assert.equal(smartenText("jungler's clear"), `jungler${CURLY}s clear`);
  assert.equal(smartenText("it isn't a read"), `it isn${CURLY}t a read`);
});

test('smartenText leaves a non-intra-word apostrophe (trailing possessive, quotation mark) straight', () => {
  // Trailing possessive: nothing follows the apostrophe but a space --
  // out of this task's own declared scope, deliberately not converted.
  assert.equal(smartenText("Riot Games' policy"), "Riot Games' policy");
  // Quotation-mark use: no word character on either side.
  assert.equal(smartenText("call it 'the read' every time"), "call it 'the read' every time");
});

test('smartenText converts back-to-back intra-word apostrophes independently', () => {
  assert.equal(smartenText("y'all's calls"), `y${CURLY}all${CURLY}s calls`);
});

test('smartenHtml converts apostrophes in text content but leaves tag attributes untouched', () => {
  const html = `<a href="/jungler's-guide" aria-label="Jungler's Guide">don't skip this</a>`;
  const out = smartenHtml(html);
  assert.equal(out, `<a href="/jungler's-guide" aria-label="Jungler's Guide">don${CURLY}t skip this</a>`);
});

test('smartenHtml leaves <script> block content untouched, including a JSON island', () => {
  const html = `<p>don't skip</p><script id="data" type="application/json">{"label":"it's fine"}</script><script>var x = 'it isn\\'t broken';</script>`;
  const out = smartenHtml(html);
  assert.ok(out.includes(`don${CURLY}t skip`), 'text content outside <script> should be converted');
  assert.ok(out.includes('{"label":"it\'s fine"}'), 'JSON island inside <script> must stay byte-for-byte, still valid JSON');
  assert.ok(out.includes(`var x = 'it isn\\'t broken';`), 'JS string literal inside <script> must stay untouched');
});

test('smartenHtml leaves <style> block content untouched', () => {
  const html = `<p>it isn't hidden</p><style>/* isn't drawn from tokens */ .x::before { content: '▸'; }</style>`;
  const out = smartenHtml(html);
  assert.ok(out.includes(`it isn${CURLY}t hidden`), 'text content outside <style> should be converted');
  assert.ok(out.includes(`/* isn't drawn from tokens */ .x::before { content: '▸'; }`), '<style> content must stay untouched');
});

test('smartenHtml treats an HTML comment as opaque, not text content', () => {
  const html = `<!-- this isn't rendered --><p>this isn't hidden</p>`;
  const out = smartenHtml(html);
  assert.ok(out.startsWith(`<!-- this isn't rendered -->`), 'comment content must stay untouched');
  assert.ok(out.includes(`this isn${CURLY}t hidden`), 'text content after the comment should still be converted');
});

// Mirrors emDashHygiene.test.js's own text-node-boundary walk (the same
// tag/script/style skip logic smartenHtml() itself uses) so this checks the
// real rendered output rather than re-testing the unit above.
function extractTextNodes(html) {
  let out = '';
  let i = 0;
  const lower = html.toLowerCase();
  while (i < html.length) {
    const nextTag = html.indexOf('<', i);
    if (nextTag === -1) { out += html.slice(i); break; }
    if (nextTag > i) out += html.slice(i, nextTag);
    if (lower.startsWith('<script', nextTag) || lower.startsWith('<style', nextTag) || lower.startsWith('<!--', nextTag)) {
      const closeTag = lower.startsWith('<script', nextTag) ? '</script>' : lower.startsWith('<style', nextTag) ? '</style>' : '-->';
      const idx = lower.indexOf(closeTag, nextTag);
      i = idx === -1 ? html.length : idx + closeTag.length;
    } else {
      const idx = html.indexOf('>', nextTag);
      i = idx === -1 ? html.length : idx + 1;
    }
  }
  return out;
}

function builtHtmlFiles() {
  build();
  buildSite();
  const printFiles = fs.readdirSync(DIST).filter(f => f.endsWith('.html')).map(f => path.join(DIST, f));
  const webFiles = fs.readdirSync(WEB_DIST).filter(f => f.endsWith('.html')).map(f => path.join(WEB_DIST, f));
  return [...printFiles, ...webFiles];
}

test('every built page\'s text content is predominantly curly, not straight, apostrophes', () => {
  const files = builtHtmlFiles();
  assert.ok(files.length > 0, 'expected at least one built HTML file');
  let straight = 0;
  let curly = 0;
  for (const f of files) {
    const text = extractTextNodes(fs.readFileSync(f, 'utf8'));
    straight += (text.match(/'/g) || []).length;
    curly += (text.match(new RegExp(CURLY, 'g')) || []).length;
  }
  assert.ok(curly > 0, 'expected at least one curly apostrophe across built text content');
  // Not zero, deliberately -- a trailing possessive or quotation-mark use has
  // no word character on one side and is left straight, by this task's own
  // declared scope (see smartenText's own tests above).
  assert.ok(curly > straight, `expected curly apostrophes (${curly}) to dominate straight ones (${straight}) in rendered text content`);
});

test('no built page\'s text content contains an unconverted intra-word straight apostrophe', () => {
  const files = builtHtmlFiles();
  const intraWord = /(\w)'(\w)/;
  for (const f of files) {
    const text = extractTextNodes(fs.readFileSync(f, 'utf8'));
    const m = intraWord.exec(text);
    assert.ok(!m, `${f} has an unconverted intra-word straight apostrophe near: "${text.slice(Math.max(0, (m && m.index) || 0) - 20, ((m && m.index) || 0) + 20)}"`);
  }
});

test('embedded JSON data islands in built HTML still parse as valid JSON after normalization', () => {
  buildSite();
  const indexHtml = fs.readFileSync(path.join(WEB_DIST, 'index.html'), 'utf8');
  const quizMatch = indexHtml.match(/<script id="quiz-focuses-data"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(quizMatch, 'expected to find the #quiz-focuses-data script island on index.html');
  assert.doesNotThrow(() => JSON.parse(quizMatch[1]), 'quiz-focuses-data must remain valid JSON');

  const trackerHtml = fs.readFileSync(path.join(WEB_DIST, 'tracker.html'), 'utf8');
  const benchmarksMatch = trackerHtml.match(/<script id="tracker-benchmarks-data"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(benchmarksMatch, 'expected to find the #tracker-benchmarks-data script island on tracker.html');
  assert.doesNotThrow(() => JSON.parse(benchmarksMatch[1]), 'tracker-benchmarks-data must remain valid JSON');
});
