'use strict';

// Tests for the Start Here quiz's server-rendered side (src/web/pagesB3.js's
// renderStartHereQuiz(), inside renderHome()) - the client script's own pure
// routing logic is covered directly by test/quizClient.test.js. This file
// checks that the page actually assembles correctly and, critically, that
// the CSS fix for a real bug caught during this build (a `hidden` attribute
// silently not hiding an element because a class rule's explicit `display`
// property beats the browser's default `[hidden]` rule) stays in place -
// nothing in this committed suite drives real layout/rendering to catch a
// regression there directly, so this is a text-presence proxy for it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build: buildSite, DIST } = require('../src/web/buildSite.js');
const quizClientSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'web', 'quizClient.js'), 'utf8');
const screenCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'web', 'screen.css'), 'utf8');

function readDist(name) {
  return fs.readFileSync(path.join(DIST, name), 'utf8');
}

buildSite();
const html = readDist('index.html');

test('index.html inlines the real quizClient.js source verbatim, not a stale/partial copy', () => {
  assert.ok(html.includes(quizClientSource), 'index.html should contain quizClient.js\'s exact current source inside a <script> tag');
});

test('index.html carries valid, parseable JSON for the quiz focuses data script tag, matching content/focuses.json exactly', () => {
  const focuses = require('../content/focuses.json');
  const match = /<script id="quiz-focuses-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(match, 'expected the quiz-focuses-data script tag');
  assert.deepEqual(JSON.parse(match[1]), focuses);
});

test('index.html\'s quiz carries the required data-* hooks the client script queries at init', () => {
  for (const hook of ['data-quiz-app', 'data-quiz-role', 'data-quiz-rank', 'data-quiz-focus', 'data-quiz-results', 'data-quiz-prompt', 'data-quiz-focus-link', 'data-quiz-drill-link', 'data-quiz-warmup-link']) {
    assert.ok(html.includes(hook), `missing required hook: ${hook}`);
  }
});

test('index.html\'s quiz results panel starts hidden, and the CSS fix that makes `hidden` actually work on it is present', () => {
  const resultsMatch = /<div class="feature-grid" data-quiz-results hidden>/.exec(html);
  assert.ok(resultsMatch, 'expected the results panel to carry the hidden attribute in the initial server-rendered HTML');
  // Regression guard for the real bug this build hit: .feature-grid sets
  // `display: grid` via a class rule, which silently overrides the
  // browser's own `[hidden] { display: none }` default unless a scoped
  // override with at least as much specificity is also defined.
  assert.ok(/\.feature-grid\[hidden\]\s*\{\s*display:\s*none/.test(screenCss), 'expected a .feature-grid[hidden] override in screen.css - without it, the hidden attribute above silently does nothing');
  assert.ok(/\.quiz-result-card\[hidden\]\s*\{\s*display:\s*none/.test(screenCss), 'expected a .quiz-result-card[hidden] override in screen.css for the same reason, scoped to the warmup card specifically');
});

test('index.html\'s quiz focus dropdown offers every real focus title, and the rank dropdown offers every real benchmark rank', () => {
  const focuses = require('../content/focuses.json');
  const benchmarks = require('../content/benchmarks.json');
  for (const f of focuses) {
    assert.ok(html.includes(`<option value="${f.id}">${f.title}</option>`), `quiz focus dropdown missing: ${f.title}`);
  }
  for (const r of benchmarks.ranks) {
    assert.ok(html.includes(`<option value="${r.rank}">${r.rank}</option>`), `quiz rank dropdown missing: ${r.rank}`);
  }
});

test('the home page still carries exactly 3 .feature-card elements ("Start here") - the quiz results use a visually-identical but distinctly-named .quiz-result-card so this count stays accurate', () => {
  const featureCardCount = (html.match(/class="feature-card"/g) || []).length;
  assert.equal(featureCardCount, 3);
  const quizResultCardCount = (html.match(/class="quiz-result-card"/g) || []).length;
  assert.equal(quizResultCardCount, 3);
});
