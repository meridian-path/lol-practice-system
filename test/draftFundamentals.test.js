'use strict';

// Tests for src/web/draftFundamentals.js (draft.html) -- a standalone
// content-gap page, not derived from content/guide.js like
// src/web/contentPages.js's pages. Mirrors test/shotCalling.test.js's
// pattern, including the cross-page prose-collision check against every
// other standalone content-gap page, but WITHOUT a focus-anchor-link test --
// this page deliberately does not link any content/focuses.json id (see the
// file's own header comment for why draft doesn't map onto the 12 focuses).

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderDraftFundamentals } = require('../src/web/draftFundamentals.js');
const site = require('../src/site.js');

const html = renderDraftFundamentals();

test('draft.html has exactly one <h1> and no heading level is skipped', () => {
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  assert.equal(h1Count, 1, `expected exactly one <h1>, found ${h1Count}`);
  const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skipped: ...${levels[i - 1]} -> ${levels[i]}...`);
  }
});

test('draft.html carries the canonical link, JSON-LD, and a title/description within the site\'s length caps', () => {
  assert.ok(html.includes(`<link rel="canonical" href="${site.absoluteUrl('draft.html')}">`));
  assert.ok(html.includes('application/ld+json'));
  const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
  const descMatch = /<meta name="description" content="([^"]*)">/.exec(html);
  assert.ok(titleMatch && titleMatch[1].length <= 60, 'title missing or over 60 chars');
  assert.ok(descMatch && descMatch[1].length <= 160, 'description missing or over 160 chars');
});

test('draft.html links to tracker.html, downloads.html, and the focus menu', () => {
  assert.ok(html.includes(site.url('tracker.html')));
  assert.ok(html.includes(site.url('downloads.html')));
  assert.ok(html.includes(site.url('focus-menu.html')));
});

test('draft.html carries no manual ad-slot placeholder', () => {
  assert.equal((html.match(/class="ad-slot"/g) || []).length, 0);
});

test('draft.html names no specific champion (this site\'s own IP-hygiene denylist, test/ip-hygiene.test.js)', () => {
  const DENYLIST_SAMPLE = ['Ahri', 'Yasuo', 'Jinx', 'Zed', 'Lee Sin', 'Thresh', 'Malphite', 'Yuumi'];
  for (const name of DENYLIST_SAMPLE) {
    assert.ok(!html.includes(name), `draft.html should stay champion-agnostic, found "${name}"`);
  }
});

test('program.html and focus-menu.html both link to draft.html', () => {
  const { CONTENT_PAGES } = require('../src/web/contentPages.js');
  const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));
  assert.ok(rendered.get('program.html').includes(site.url('draft.html')), 'program.html should link to draft.html');
  assert.ok(rendered.get('focus-menu.html').includes(site.url('draft.html')), 'focus-menu.html should link to draft.html');
});

test('early-game.html and draft.html cross-link bidirectionally', () => {
  const { renderEarlyGame } = require('../src/web/earlyGame.js');
  const earlyGameHtml = renderEarlyGame();
  assert.ok(earlyGameHtml.includes(site.url('draft.html')), 'early-game.html should link to draft.html');
  assert.ok(html.includes(site.url('early-game.html')), 'draft.html should link back to early-game.html');
});

test('draft.html keeps the not-X-but-Y antithesis construction rare (design-standards.md Distinctiveness Gate item 3)', () => {
  const text = html.replace(/<[^>]+>/g, ' ');
  const literalTell = /[Ii]t'?s not (just )?.{0,60}(it'?s|it is|but)/g;
  const broadShape = /\bnot\b[^.]{0,60}(,|-)\s*(it'?s|it is|just|but)\b/gi;
  const literalHits = text.match(literalTell) || [];
  const broadHits = text.match(broadShape) || [];
  assert.equal(literalHits.length, 0, `literal antithesis tell found: ${literalHits.join(' | ')}`);
  assert.ok(broadHits.length <= 2, `antithesis construction used ${broadHits.length} times, over the 2-use budget: ${broadHits.join(' | ')}`);
});

test('draft.html shares no identical prose sentence with any other standalone content-gap page', () => {
  const { renderEarlyGame } = require('../src/web/earlyGame.js');
  const { renderMacroPlay } = require('../src/web/macroPlay.js');
  const { renderWaveManagement } = require('../src/web/waveManagement.js');
  const { renderVisionWarding } = require('../src/web/visionWarding.js');
  const { renderTeamfighting } = require('../src/web/teamfighting.js');
  const { renderTradingDiscipline } = require('../src/web/tradingDiscipline.js');
  const { renderObjectiveControl } = require('../src/web/objectiveControl.js');
  const { renderShotCalling } = require('../src/web/shotCalling.js');
  const {
    renderTopGuide,
    renderJungleGuide,
    renderMidGuide,
    renderAdcGuide,
    renderSupportGuide
  } = require('../src/web/roleGuides.js');

  const pages = [
    ['draft.html', html],
    ['early-game.html', renderEarlyGame()],
    ['macro-play.html', renderMacroPlay()],
    ['wave-management.html', renderWaveManagement()],
    ['vision.html', renderVisionWarding()],
    ['teamfighting.html', renderTeamfighting()],
    ['trading.html', renderTradingDiscipline()],
    ['objectives.html', renderObjectiveControl()],
    ['comms.html', renderShotCalling()],
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

  const draftSentences = sentencesOf(html);
  for (const [slug, pageHtml] of pages.slice(1)) {
    const otherSentences = sentencesOf(pageHtml);
    const shared = [...draftSentences].filter(s => otherSentences.has(s));
    assert.equal(shared.length, 0, `draft.html and ${slug} share identical sentence(s): ${shared.join(' | ')}`);
  }
});
