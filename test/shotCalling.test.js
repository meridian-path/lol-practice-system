'use strict';

// Tests for src/web/shotCalling.js (comms.html) -- a standalone content-gap
// page, not derived from content/guide.js like src/web/contentPages.js's
// pages. Mirrors test/objectiveControl.test.js's pattern, including the
// cross-page prose-collision check against every other standalone
// content-gap page.

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderShotCalling } = require('../src/web/shotCalling.js');
const site = require('../src/site.js');

const html = renderShotCalling();

test('comms.html has exactly one <h1> and no heading level is skipped', () => {
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  assert.equal(h1Count, 1, `expected exactly one <h1>, found ${h1Count}`);
  const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skipped: ...${levels[i - 1]} -> ${levels[i]}...`);
  }
});

test('comms.html carries the canonical link, JSON-LD, and a title/description within the site\'s length caps', () => {
  assert.ok(html.includes(`<link rel="canonical" href="${site.absoluteUrl('comms.html')}">`));
  assert.ok(html.includes('application/ld+json'));
  const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
  const descMatch = /<meta name="description" content="([^"]*)">/.exec(html);
  assert.ok(titleMatch && titleMatch[1].length <= 60, 'title missing or over 60 chars');
  assert.ok(descMatch && descMatch[1].length <= 160, 'description missing or over 160 chars');
});

test('comms.html links to tracker.html, downloads.html, and the focus menu', () => {
  assert.ok(html.includes(site.url('tracker.html')));
  assert.ok(html.includes(site.url('downloads.html')));
  assert.ok(html.includes(site.url('focus-menu.html')));
});

test('comms.html links to real drill anchors and real focus-menu anchors, not made-up ids', () => {
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

test('comms.html carries no manual ad-slot placeholder', () => {
  assert.equal((html.match(/class="ad-slot"/g) || []).length, 0);
});

test('program.html and focus-menu.html both link to comms.html', () => {
  const { CONTENT_PAGES } = require('../src/web/contentPages.js');
  const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));
  assert.ok(rendered.get('program.html').includes(site.url('comms.html')), 'program.html should link to comms.html');
  assert.ok(rendered.get('focus-menu.html').includes(site.url('comms.html')), 'focus-menu.html should link to comms.html');
});

test('objectives.html and comms.html cross-link bidirectionally', () => {
  const { renderObjectiveControl } = require('../src/web/objectiveControl.js');
  const objectivesHtml = renderObjectiveControl();
  assert.ok(objectivesHtml.includes(site.url('comms.html')), 'objectives.html should link to comms.html');
  assert.ok(html.includes(site.url('objectives.html')), 'comms.html should link back to objectives.html');
});

test('comms.html does not claim to be the dedicated comms-discipline focus page (that focus measures complaint-free chat, not shot-calling)', () => {
  const focuses = require('../content/focuses.json');
  const commsDiscipline = focuses.find(f => f.id === 'comms-discipline');
  assert.ok(commsDiscipline, 'test assumption: comms-discipline focus exists');
  // The page must still link the real focus (it is a genuine, if partial,
  // tie-in), but must not phrase it as comms.html's own dedicated focus --
  // the same "does not have one dedicated focus of its own" framing every
  // sibling multi-focus content-gap page (teamfighting.html) already uses.
  assert.ok(html.includes(site.url(`focus-menu.html#${commsDiscipline.id}`)), 'expected a real link to the comms-discipline focus');
  assert.ok(html.includes('does not have one dedicated focus of its own'), 'expected the same honest multi-focus framing teamfighting.html uses, not an overclaim');
});

test('comms.html keeps the not-X-but-Y antithesis construction rare (design-standards.md Distinctiveness Gate item 3)', () => {
  const text = html.replace(/<[^>]+>/g, ' ');
  const literalTell = /[Ii]t'?s not (just )?.{0,60}(it'?s|it is|but)/g;
  const broadShape = /\bnot\b[^.]{0,60}(,|-)\s*(it'?s|it is|just|but)\b/gi;
  const literalHits = text.match(literalTell) || [];
  const broadHits = text.match(broadShape) || [];
  assert.equal(literalHits.length, 0, `literal antithesis tell found: ${literalHits.join(' | ')}`);
  assert.ok(broadHits.length <= 2, `antithesis construction used ${broadHits.length} times, over the 2-use budget: ${broadHits.join(' | ')}`);
});

test('comms.html shares no identical prose sentence with any other standalone content-gap page', () => {
  const { renderEarlyGame } = require('../src/web/earlyGame.js');
  const { renderMacroPlay } = require('../src/web/macroPlay.js');
  const { renderWaveManagement } = require('../src/web/waveManagement.js');
  const { renderVisionWarding } = require('../src/web/visionWarding.js');
  const { renderTeamfighting } = require('../src/web/teamfighting.js');
  const { renderTradingDiscipline } = require('../src/web/tradingDiscipline.js');
  const { renderObjectiveControl } = require('../src/web/objectiveControl.js');
  const {
    renderTopGuide,
    renderJungleGuide,
    renderMidGuide,
    renderAdcGuide,
    renderSupportGuide
  } = require('../src/web/roleGuides.js');

  const pages = [
    ['comms.html', html],
    ['early-game.html', renderEarlyGame()],
    ['macro-play.html', renderMacroPlay()],
    ['wave-management.html', renderWaveManagement()],
    ['vision.html', renderVisionWarding()],
    ['teamfighting.html', renderTeamfighting()],
    ['trading.html', renderTradingDiscipline()],
    ['objectives.html', renderObjectiveControl()],
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

  const commsSentences = sentencesOf(html);
  for (const [slug, pageHtml] of pages.slice(1)) {
    const otherSentences = sentencesOf(pageHtml);
    const shared = [...commsSentences].filter(s => otherSentences.has(s));
    assert.equal(shared.length, 0, `comms.html and ${slug} share identical sentence(s): ${shared.join(' | ')}`);
  }
});
