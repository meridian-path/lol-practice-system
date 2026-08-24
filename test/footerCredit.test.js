'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderFooter } = require('../src/web/shell.js');

test('renderFooter carries the portfolio-wide credit line naming the operator and the other two properties', () => {
  const footer = renderFooter();
  assert.match(footer, /Built by Dylan/);
  assert.match(footer, /also making <a href="https:\/\/repertoire-builder\.com"[^>]*>Repertoire Builder<\/a>/);
  assert.match(footer, /<a href="https:\/\/usefiletools\.com"[^>]*>filetools<\/a>/);
  assert.doesNotMatch(footer, /dylangerloski/i, 'footer must never link to the stale personal GitHub Pages URL');
});

test('renderFooter links the social handle to the shared X profile with rel="noopener noreferrer"', () => {
  const footer = renderFooter();
  assert.match(footer, /<a class="footer-social" href="https:\/\/x\.com\/builtittheycome" rel="noopener noreferrer">/);
  assert.match(footer, /Follow @builtittheycome/);
});

test('renderFooter carries exactly one social icon/link, not two, for the shared X/Bluesky handle', () => {
  const footer = renderFooter();
  const matches = footer.match(/href="https:\/\/x\.com\/builtittheycome"/g) || [];
  assert.equal(matches.length, 1);
  assert.doesNotMatch(footer, /bsky\.app/);
});

test('renderFooter still keeps the "no donation/affiliate link" guarantee -- the credit line is cross-property + social only', () => {
  const footer = renderFooter();
  assert.doesNotMatch(footer, /ko-fi/i);
  assert.doesNotMatch(footer, /buymeacoffee/i);
});

test('the social mark SVG carries no literal hex color -- colors come from tokens.css via CSS classes', () => {
  const footer = renderFooter();
  const svgMatch = footer.match(/<svg[^]*?<\/svg>/);
  assert.ok(svgMatch, 'footer should contain the inline social-mark svg');
  assert.doesNotMatch(svgMatch[0], /#[0-9A-Fa-f]{6}/);
});
