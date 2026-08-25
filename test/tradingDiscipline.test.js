'use strict';

// Tests for src/web/tradingDiscipline.js (trading.html) -- a standalone
// content-gap page, not derived from content/guide.js like
// src/web/contentPages.js's pages. Mirrors test/teamfighting.test.js's
// pattern, plus a cross-page prose-collision check against every other
// standalone content-gap page.

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderTradingDiscipline } = require('../src/web/tradingDiscipline.js');
const site = require('../src/site.js');

const html = renderTradingDiscipline();

test('trading.html has exactly one <h1> and no heading level is skipped', () => {
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  assert.equal(h1Count, 1, `expected exactly one <h1>, found ${h1Count}`);
  const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skipped: ...${levels[i - 1]} -> ${levels[i]}...`);
  }
});

test('trading.html carries the canonical link, JSON-LD, and a title/description within the site\'s length caps', () => {
  assert.ok(html.includes(`<link rel="canonical" href="${site.absoluteUrl('trading.html')}">`));
  assert.ok(html.includes('application/ld+json'));
  const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
  const descMatch = /<meta name="description" content="([^"]*)">/.exec(html);
  assert.ok(titleMatch && titleMatch[1].length <= 60, 'title missing or over 60 chars');
  assert.ok(descMatch && descMatch[1].length <= 160, 'description missing or over 160 chars');
});

test('trading.html links to tracker.html, downloads.html, and the focus menu', () => {
  assert.ok(html.includes(site.url('tracker.html')));
  assert.ok(html.includes(site.url('downloads.html')));
  assert.ok(html.includes(site.url('focus-menu.html')));
});

test('trading.html links to a real drill anchor and real focus-menu anchors, not made-up ids', () => {
  const drills = require('../content/drills.json');
  const focuses = require('../content/focuses.json');
  const drillIds = new Set(drills.map(d => d.id));
  const focusIds = new Set(focuses.map(f => f.id));

  const drillHrefs = [...html.matchAll(/href="[^"]*drills\.html#([^"]+)"/g)].map(m => m[1]);
  assert.ok(drillHrefs.length > 0, 'expected at least one drills.html#<id> link');
  for (const id of drillHrefs) {
    assert.ok(drillIds.has(id), `drills.html#${id} does not match a real drill id`);
  }

  const focusHrefs = [...html.matchAll(/href="[^"]*focus-menu\.html#([^"]+)"/g)].map(m => m[1]);
  assert.ok(focusHrefs.length > 0, 'expected at least one focus-menu.html#<id> link');
  for (const id of focusHrefs) {
    assert.ok(focusIds.has(id), `focus-menu.html#${id} does not match a real focus id`);
  }
});

test('trading.html carries no manual ad-slot placeholder', () => {
  assert.equal((html.match(/class="ad-slot"/g) || []).length, 0);
});

test('program.html and focus-menu.html both link to trading.html', () => {
  const { CONTENT_PAGES } = require('../src/web/contentPages.js');
  const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));
  assert.ok(rendered.get('program.html').includes(site.url('trading.html')), 'program.html should link to trading.html');
  assert.ok(rendered.get('focus-menu.html').includes(site.url('trading.html')), 'focus-menu.html should link to trading.html');
});

test('early-game.html and trading.html cross-link bidirectionally', () => {
  const { renderEarlyGame } = require('../src/web/earlyGame.js');
  const earlyGameHtml = renderEarlyGame();
  assert.ok(earlyGameHtml.includes(site.url('trading.html')), 'early-game.html should link to trading.html');
  assert.ok(html.includes(site.url('early-game.html')), 'trading.html should link back to early-game.html');
});

test('trading.html keeps the not-X-but-Y antithesis construction rare (design-standards.md Distinctiveness Gate item 3)', () => {
  const text = html.replace(/<[^>]+>/g, ' ');
  const literalTell = /[Ii]t'?s not (just )?.{0,60}(it'?s|it is|but)/g;
  const broadShape = /\bnot\b[^.]{0,60}(,|-)\s*(it'?s|it is|just|but)\b/gi;
  const literalHits = text.match(literalTell) || [];
  const broadHits = text.match(broadShape) || [];
  assert.equal(literalHits.length, 0, `literal antithesis tell found: ${literalHits.join(' | ')}`);
  assert.ok(broadHits.length <= 2, `antithesis construction used ${broadHits.length} times, over the 2-use budget: ${broadHits.join(' | ')}`);
});

test('trading.html carries no literal or encoded em dash', () => {
  assert.equal((html.match(/—/g) || []).length, 0, 'em dash found in rendered output');
});

test('trading.html shares no identical prose sentence with any other standalone content-gap page', () => {
  const { renderEarlyGame } = require('../src/web/earlyGame.js');
  const { renderMacroPlay } = require('../src/web/macroPlay.js');
  const { renderWaveManagement } = require('../src/web/waveManagement.js');
  const { renderVisionWarding } = require('../src/web/visionWarding.js');
  const { renderTeamfighting } = require('../src/web/teamfighting.js');
  const {
    renderTopGuide,
    renderJungleGuide,
    renderMidGuide,
    renderAdcGuide,
    renderSupportGuide
  } = require('../src/web/roleGuides.js');

  const pages = [
    ['trading.html', html],
    ['early-game.html', renderEarlyGame()],
    ['macro-play.html', renderMacroPlay()],
    ['wave-management.html', renderWaveManagement()],
    ['vision.html', renderVisionWarding()],
    ['teamfighting.html', renderTeamfighting()],
    ['climbing-top.html', renderTopGuide()],
    ['climbing-jungle.html', renderJungleGuide()],
    ['climbing-mid.html', renderMidGuide()],
    ['climbing-adc.html', renderAdcGuide()],
    ['climbing-support.html', renderSupportGuide()]
  ];

  function sentencesOf(pageHtml) {
    const zoneStart = pageHtml.indexOf('class="zone-measure"');
    const footerStart = pageHtml.indexOf('<footer');
    const bodyOnly = zoneStart === -1 ? pageHtml : pageHtml.slice(zoneStart, footerStart === -1 ? undefined : footerStart);
    const noScripts = bodyOnly.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
    const text = noScripts.replace(/<[^>]+>/g, ' ');
    return new Set(text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 40));
  }

  const tradingSentences = sentencesOf(html);
  for (const [slug, pageHtml] of pages.slice(1)) {
    const otherSentences = sentencesOf(pageHtml);
    const shared = [...tradingSentences].filter(s => otherSentences.has(s));
    assert.equal(shared.length, 0, `trading.html and ${slug} share identical sentence(s): ${shared.join(' | ')}`);
  }
});
