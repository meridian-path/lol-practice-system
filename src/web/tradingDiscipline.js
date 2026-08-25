'use strict';

// trading.html: a standalone content-gap page (not derived from
// content/guide.js), covering lane trading as a deliberate skill -- the
// three trade shapes, the all-in decision checklist, and how trading
// interacts with wave state. Follows src/web/teamfighting.js's/
// visionWarding.js's own freeform-page pattern (hand-written body HTML,
// not guide-block-rendered) and reuses the shared dataTable()/callout()
// primitives (src/render/html.js). Maps directly onto the existing
// "trade-discipline" focus, which previously had only a Focus Menu card
// and the Trade-Then-Back drill -- no deep-dive page of its own.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`tradingDiscipline.js: unknown focus id "${id}"`);
  return `<a href="${escapeHtml(site.url(`focus-menu.html#${f.id}`))}">${escapeHtml(f.title)}</a>`;
}

function crossLinks(links) {
  const items = links.map(([href, label]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join('\n      ');
  return `<nav class="cross-links" aria-label="Related pages">
      <ul>
      ${items}
      </ul>
    </nav>`;
}

// Matches src/web/contentPages.js's, src/web/drillWarmupPages.js's,
// src/web/earlyGame.js's, src/web/macroPlay.js's, src/web/waveManagement.js's,
// src/web/visionWarding.js's, and src/web/teamfighting.js's own
// standardEndLinks() exactly -- duplicated rather than imported since none
// of them export it and this is an eighth, independent caller (same
// accepted duplication those files' own headers already note).
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderTradeTypesTable() {
  return dataTable({
    columns: [
      { key: 'type', label: 'Trade Type' },
      { key: 'shape', label: 'What It Looks Like' },
      { key: 'when', label: 'When It Is Correct' }
    ],
    rows: [
      { type: 'Poke', shape: 'A single ranged ability or auto-attack from outside your opponent\'s effective threat range, then a full reset to a safe distance.', when: 'Every lane where you hold a range advantage, and any lane where you are simply not ready to commit further yet.' },
      { type: 'Short', shape: 'One to two abilities plus auto-attacks in a quick exchange, both sides disengaging within a few seconds.', when: 'A clear cooldown or level advantage exists but the wave state or jungler position does not support staying longer.' },
      { type: 'Extended', shape: 'A sustained exchange running most or all of both sides\' combat cooldowns before either player disengages.', when: 'Wave state, item state, and jungler position all favor you at once - the same three-part check the all-in decision below uses.' }
    ]
  });
}

function renderTradeTypesSection() {
  return `<section class="guide-section">
    <h2>Three Trades, Not One</h2>
    <p>"Trading" gets used as one word for three different decisions, and picking the wrong one for the situation is where most lane damage gets given away for free. A poke fishes for small, safe value. A short trade cashes in a real but temporary advantage. An extended trade commits to a real fight inside the lane, and only one of the three situations below actually supports that commitment.</p>
    ${renderTradeTypesTable()}
    <p>Reaching for an extended trade by default, regardless of what the wave and jungler position actually support, is the single most common way a player with a real damage advantage still loses a lane.</p>
  </section>`;
}

function renderAllInDecisionTable() {
  return dataTable({
    columns: [
      { key: 'check', label: 'Check' },
      { key: 'question', label: 'The Question' }
    ],
    rows: [
      { check: 'Wave state', question: 'Is the wave positioned so a long fight will not shove itself into your opponent\'s tower, or leave you stuck under yours?' },
      { check: 'Item state', question: 'Do you hold a real item or level spike right now, not one your opponent will also hit before the fight ends?' },
      { check: 'Jungler position', question: 'Is the enemy jungler confirmed elsewhere on the map, not simply unseen for the last few seconds?' }
    ]
  });
}

function renderAllInDecisionSection() {
  return `<section class="guide-section">
    <h2>The All-In Decision</h2>
    <p>An all-in is an extended trade you commit to on purpose, aiming to end the exchange with a kill or a forced recall rather than a reset. Three checks decide whether one is correct, and all three have to clear, not just the one that happens to feel obvious in the moment.</p>
    ${renderAllInDecisionTable()}
    ${callout('An all-in that fails one of the three checks was a bet made without reading the board first, whatever it felt like committing to in the moment - the lost health total reads the same either way.')}
  </section>`;
}

function renderWaveInteractionSection() {
  return `<section class="guide-section">
    <h2>Why Wave State Decides More Than Damage Does</h2>
    <p>The same trade that wins a lane against a pushed wave can lose it against a frozen one, with no change to either champion's damage output. A pushed wave toward your opponent means a long trade shoves the lane further, walking both of you toward their tower and their jungler's ganking range. A wave frozen near your own tower means the opposite trade: staying to fight is safe, because your tower and vision cover the same ground the fight is happening on.</p>
    <p>${focusLink('wave-management')} covers reading and shaping the wave itself in full - this page assumes that read is already made, and only covers the trade decision that follows from it.</p>
  </section>`;
}

function renderMistakeTable() {
  return dataTable({
    columns: [
      { key: 'rank', label: 'Rank Band' },
      { key: 'mistake', label: 'Common Trading Mistake' },
      { key: 'fix', label: 'The Fix' }
    ],
    rows: [
      { rank: 'Iron-Bronze', mistake: 'Trading on cooldown availability alone, with no read on the wave or the jungler.', fix: 'Run the three-check all-in decision before every extended trade, out loud if it helps, until it becomes automatic.' },
      { rank: 'Silver-Gold', mistake: 'Winning a short trade cleanly, then staying for "one more auto" instead of resetting.', fix: 'Treat the reset as part of the trade itself, not an optional step after it - the trade only finishes once you are back at a safe distance.' },
      { rank: 'Platinum+', mistake: 'Correctly reading wave and items, but missing a jungler who has been unseen for over 15 seconds.', fix: 'Add a fixed unseen-timer check to the routine - an assumed-safe jungler and a confirmed-elsewhere jungler carry very different risk.' }
    ]
  });
}

function renderTradingDiscipline() {
  const introHtml = `<h1>Lane Trading Discipline: Three Trade Types and the All-In Decision</h1>
    <p class="lead">This page covers the decision that happens dozens of times a lane phase: whether to poke, trade briefly, commit to a full exchange, or leave the fight alone entirely. Reading a matchup correctly means little if the trade decision on top of it is made on instinct instead of on the wave, items, and jungler position in front of you.</p>`;

  const sectionsHtml = `${renderTradeTypesSection()}
    ${renderAllInDecisionSection()}
    ${renderWaveInteractionSection()}
    <section class="guide-section">
      <h2>Mistakes By Rank</h2>
      <p>Every rank band below trades on a different piece of incomplete information - cooldowns only, a clean short trade with no reset discipline, or a jungler assumption instead of a jungler confirmation.</p>
      ${renderMistakeTable()}
    </section>
    <section class="guide-section">
      <h2>How This Ties Into the 12 Focuses</h2>
      <p>${focusLink('trade-discipline')} is the focus this page expands on directly - its own number tracks exactly the reset discipline described above, clean disengages out of ten attempted trades. Two more focuses connect to it:</p>
      <ul>
        <li>${focusLink('wave-management')} - the wave-state check in the all-in decision above only works once wave state itself is being read and shaped on purpose, not left to whatever the minions happen to be doing.</li>
        <li>${focusLink('minimap-awareness')} - the jungler-position check depends entirely on this habit; a trade decision made without checking the map first is a guess wearing a checklist.</li>
      </ul>
      <p>A baseline read of your own last ten games will show whether trading is actually the focus most worth holding right now, or whether the Focus Menu points somewhere else first.</p>
    </section>`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#trade-then-back'), 'Run the Trade-Then-Back drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu'],
      [site.url('wave-management.html'), 'Reading and shaping the wave itself: Wave Management'],
      [site.url('early-game.html'), 'The lane phase this trade decision happens inside: Early Game Fundamentals']
    ])}
  </div>`;

  const description = 'A guide to League of Legends lane trading: the three trade types, the all-in decision checklist, and how wave state changes which trade is correct.';
  return shell.documentShell({
    title: site.pageTitle('Lane Trading Discipline Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('trading.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Lane Trading Discipline: Three Trade Types and the All-In Decision',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('trading.html')
    })
  });
}

module.exports = { renderTradingDiscipline };
