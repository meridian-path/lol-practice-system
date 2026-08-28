'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const drills = require('../content/drills.json');
const focuses = require('../content/focuses.json');
const warmups = require('../content/warmups.json');
const benchmarks = require('../content/benchmarks.json');
const guide = require('../content/guide.js');
const { build, DIST } = require('../src/build.js');
const { build: buildSite, DIST: WEB_DIST } = require('../src/web/buildSite.js');

// This project's style guide bans em dashes outright -- replace with a
// plain hyphen or restructure with a period/comma. This is a build-time
// guard against a regression, not a one-time cleanup: any new copy that
// introduces a literal em dash fails the test suite.
const EM_DASH = '—';
// The HTML-entity and numeric-character-reference spellings of an em dash
// decode to the same literal character once a browser parses the DOM (this
// bit us once already -- src/web/shell.js's footer credit shipped &mdash;
// unchanged by a literal-character-only grep of the .js source).
const EM_DASH_ENCODED = /&mdash;|&#8212;|&#x2014;/i;

// Internal task/decision ids from the shared Orchestra queue must never leak
// into this public repo -- they've shown up as source comments before (a
// recurring incident class, twice already elsewhere in this multi-asset
// setup) and, on this site, screen.css/tokens.css and every *Client.js file
// under src/web are read via fs.readFileSync() and inlined verbatim into
// every built page's <style>/<script> block, so a leaked comment there ships
// straight to every visitor's "View Source." Checking only source or only
// built output would each miss half of that path, so both are checked below.
const LEAKED_ID = /\btask-[0-9a-z]+-[0-9a-f]+\b|\bdecision-[0-9a-z]+-[0-9a-f]+\b/i;

// Internal governing-doc filenames and internal rotation/series labels --
// like the task/decision id shape above, these name Orchestra's own internal
// process docs and audit rotations, meaningless (and revealing) to a visitor
// reading "View Source" or browsing this repo's source on GitHub. Found live
// in screen.css/shell.js comments (6th monthly audit, 2026-08-28) even though
// LEAKED_ID's id-shape regex never matches a bare filename like this.
const DOC_LEAK = /\bdesign-standards\.md\b|\bqa\.md\b|\bCRAFT_DOCTRINE\b|\bDESIGN_PLAYBOOK\b|\bREFERENCE_LIBRARY\b|\bGOALS\.md\b|\bTESTING\.md\b|\bWS-\d+\b|\bPhase-\d+\b|\bspec-section-\d+\b|\bsite-audit-item-\d+\b/i;

// Tracked-file extensions this scan can't safely read as text.
const BINARY_EXT = /\.(png|jpe?g|gif|ico|xlsx|pdf|woff2?|ttf|eot)$/i;

function inlinedWebSourceFiles() {
  const webDir = path.join(__dirname, '..', 'src', 'web');
  return fs.readdirSync(webDir)
    .filter(f => f === 'screen.css' || f === 'tokens.css' || /Client\.js$/.test(f))
    .map(f => path.join(webDir, f));
}

// The full git-tracked tree (source of truth for what a public GitHub repo
// actually ships), not just the inlined-file allowlist above -- an id or doc
// name can leak from any tracked file, not only ones read verbatim into a
// built page (e.g. .claude/commands/conduct-lite.md, scripts/*.js), and the
// repeated real-world failure shape has specifically been a tracked file this
// checker's old narrower scope never looked at.
function allTrackedFiles() {
  const root = path.join(__dirname, '..');
  const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
  return out.split('\n')
    .filter(Boolean)
    .filter(f => !f.startsWith('node_modules/') && !f.startsWith('dist/'))
    .filter(f => !BINARY_EXT.test(f))
    .map(f => path.join(root, f));
}

// This site's own shipped/tooling source -- everything actually written for
// this product (page builders, styles, content data, build/QA scripts), as
// opposed to this repo's separate Orchestra-operational files (SESSION_SCOPE.md,
// ROLLING_PLAN.md, .claude/commands/*.md) which necessarily and legitimately
// name these same internal docs/rotations as part of describing the session's
// own operating process -- flagged as its own finding rather than folded in
// here, since scanning those too would require rewriting genuinely necessary
// operating instructions, not fixing an accidental leak.
function siteSourceFiles() {
  const root = path.join(__dirname, '..');
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|css)$/.test(entry.name)) results.push(full);
    }
  }
  for (const d of ['src', 'scripts', 'content']) walk(path.join(root, d));
  return results;
}

function collectStrings(value, out) {
  if (typeof value === 'string') { out.push(value); return; }
  if (Array.isArray(value)) { value.forEach(v => collectStrings(v, out)); return; }
  if (value && typeof value === 'object') { Object.values(value).forEach(v => collectStrings(v, out)); }
}

test('no content JSON/JS record contains a literal or encoded em dash', () => {
  const strings = [];
  collectStrings(drills, strings);
  collectStrings(focuses, strings);
  collectStrings(warmups, strings);
  collectStrings(benchmarks, strings);
  collectStrings(guide.sections, strings);
  const blob = strings.join('\n');
  assert.ok(!blob.includes(EM_DASH), 'content contains a literal em dash (—) -- replace with a plain hyphen or restructure');
  assert.ok(!EM_DASH_ENCODED.test(blob), 'content contains an HTML-entity-encoded em dash (&mdash; / &#8212; / &#x2014;) -- replace with a plain hyphen or restructure');
});

test('no rendered HTML output contains a literal or encoded em dash', () => {
  build();
  buildSite();
  const printFiles = fs.readdirSync(DIST).filter(f => f.endsWith('.html')).map(f => path.join(DIST, f));
  const webFiles = fs.readdirSync(WEB_DIST).filter(f => f.endsWith('.html')).map(f => path.join(WEB_DIST, f));
  const files = [...printFiles, ...webFiles];
  assert.ok(files.length > 0, 'expected at least one built HTML file');
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!content.includes(EM_DASH), `${f} contains a literal em dash (—) -- replace with a plain hyphen or restructure`);
    assert.ok(!EM_DASH_ENCODED.test(content), `${f} contains an HTML-entity-encoded em dash (&mdash; / &#8212; / &#x2014;) -- replace with a plain hyphen or restructure`);
  }
});

test('no source file inlined verbatim into HTML/print output contains a leaked internal task/decision id', () => {
  for (const f of inlinedWebSourceFiles()) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!LEAKED_ID.test(content), `${f} contains a leaked internal task/decision id -- describe the "why" without citing the id, it will be inlined verbatim into every built page`);
  }
});

test('no rendered HTML output contains a leaked internal task/decision id', () => {
  build();
  buildSite();
  const printFiles = fs.readdirSync(DIST).filter(f => f.endsWith('.html')).map(f => path.join(DIST, f));
  const webFiles = fs.readdirSync(WEB_DIST).filter(f => f.endsWith('.html')).map(f => path.join(WEB_DIST, f));
  const files = [...printFiles, ...webFiles];
  assert.ok(files.length > 0, 'expected at least one built HTML file');
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!LEAKED_ID.test(content), `${f} contains a leaked internal task/decision id -- trace it back to its source comment and rewrite without the id`);
  }
});

test('no file in the full git-tracked tree contains a leaked internal task/decision id', () => {
  for (const f of allTrackedFiles()) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!LEAKED_ID.test(content), `${f} contains a leaked internal task/decision id -- describe the "why" without citing the id`);
  }
});

test('no site source file (src/, scripts/, content/) contains a leaked internal governing-doc filename or series label', () => {
  for (const f of siteSourceFiles()) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!DOC_LEAK.test(content), `${f} contains a reference to an internal governing-doc filename or series label -- describe the "why" without naming the internal doc`);
  }
});

test('no rendered HTML output contains a leaked internal governing-doc filename or series label', () => {
  build();
  buildSite();
  const printFiles = fs.readdirSync(DIST).filter(f => f.endsWith('.html')).map(f => path.join(DIST, f));
  const webFiles = fs.readdirSync(WEB_DIST).filter(f => f.endsWith('.html')).map(f => path.join(WEB_DIST, f));
  const files = [...printFiles, ...webFiles];
  assert.ok(files.length > 0, 'expected at least one built HTML file');
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!DOC_LEAK.test(content), `${f} contains a leaked internal governing-doc filename or series label`);
  }
});
