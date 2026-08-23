'use strict';

// wave-management.html: a standalone content-gap page (not derived from
// content/guide.js's A1-A11 sections) covering the three deliberate wave
// states -- freeze, slow push, fast push -- as applied to solo queue
// climbing. Follows src/web/earlyGame.js's own freeform-page pattern
// (hand-written body HTML, not guide-block-rendered) and reuses the shared
// dataTable()/callout() primitives (src/render/html.js) for the page's
// tabular content. The one genuinely new piece is laneDiagram() below: an
// inline-SVG lane-position diagram, since none of src/render/html.js's five
// existing primitives (card/checklist/fill-line/callout/table) represent a
// spatial "where does the wave sit" concept. Built as one shared render
// helper fed by per-pattern data (clash position + minion counts on each
// side), reused three times, rather than three one-off SVG blocks.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`waveManagement.js: unknown focus id "${id}"`);
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

// Matches src/web/contentPages.js's, src/web/drillWarmupPages.js's, and
// src/web/earlyGame.js's own standardEndLinks() exactly -- duplicated
// rather than imported since none of them export it and this is a fourth,
// independent caller (same duplication earlyGame.js's own header already
// notes and accepts).
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

// A wave's position is one number on a line between two towers -- that's
// the whole shape of the concept, so the diagram is one horizontal track
// with a tower glyph at each end and a cluster of minion dots at the
// clash point. clashPercent: 0 = sitting at your own tower, 100 = sitting
// at the enemy tower. allyCount/enemyCount (1-6) size each side's cluster,
// showing which side currently outnumbers the other at the clash point --
// the actual mechanism that determines which way the wave will drift next.
function laneDiagram({ id, pattern, clashPercent, allyCount, enemyCount, title, desc }) {
  const trackX1 = 40;
  const trackX2 = 560;
  const laneY = 60;
  const clashX = trackX1 + (trackX2 - trackX1) * (clashPercent / 100);
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  function dotCluster(count, direction) {
    // direction: -1 places dots to the left of the clash point (your
    // minions, pushed forward from your side), +1 to the right (enemy
    // minions). Dots stack outward from the clash point in both x and a
    // small y offset so they read as a cluster, not a single stacked line.
    const dots = [];
    for (let i = 0; i < count; i += 1) {
      const cx = clashX + direction * (10 + i * 9);
      const cy = laneY + (i % 2 === 0 ? -7 : 7);
      const cls = direction < 0 ? 'wave-dot-ally' : 'wave-dot-enemy';
      dots.push(`<circle class="${cls}" cx="${cx.toFixed(1)}" cy="${cy}" r="5"></circle>`);
    }
    return dots.join('');
  }

  return `<figure class="wave-diagram">
    <svg role="img" aria-labelledby="${titleId} ${descId}" viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
      <title id="${titleId}">${escapeHtml(title)}</title>
      <desc id="${descId}">${escapeHtml(desc)}</desc>
      <line x1="${trackX1}" y1="${laneY}" x2="${trackX2}" y2="${laneY}" class="wave-track"></line>
      <rect x="20" y="40" width="20" height="40" rx="2" class="wave-tower-ally"></rect>
      <rect x="560" y="40" width="20" height="40" rx="2" class="wave-tower-enemy"></rect>
      <text x="30" y="96" class="wave-tower-label" text-anchor="middle">You</text>
      <text x="570" y="96" class="wave-tower-label" text-anchor="middle">Enemy</text>
      ${dotCluster(allyCount, -1)}
      ${dotCluster(enemyCount, 1)}
    </svg>
    <figcaption class="wave-diagram-caption">${escapeHtml(pattern)}: ${desc}</figcaption>
  </figure>`;
}

function renderPatternSection() {
  const freeze = laneDiagram({
    id: 'wave-diagram-freeze',
    pattern: 'Freeze',
    clashPercent: 18,
    allyCount: 2,
    enemyCount: 4,
    title: 'Frozen wave sitting near your own tower',
    desc: 'The clash point sits close to your tower because the enemy wave outnumbers yours, so it keeps pushing toward you while your tower keeps it from crashing in.'
  });
  const slowPush = laneDiagram({
    id: 'wave-diagram-slow-push',
    pattern: 'Slow Push',
    clashPercent: 55,
    allyCount: 5,
    enemyCount: 2,
    title: 'Slow-pushing wave building up past the midpoint',
    desc: 'Your wave already outnumbers the enemy wave and the clash point has moved past the midpoint, growing bigger each cycle as you keep only killing enough to stay safe.'
  });
  const fastPush = laneDiagram({
    id: 'wave-diagram-fast-push',
    pattern: 'Fast Push',
    clashPercent: 90,
    allyCount: 1,
    enemyCount: 0,
    title: 'Fast-pushed wave crashing into the enemy tower',
    desc: 'The clash point has reached the enemy tower and the enemy wave is gone, so the tower is now doing the work of holding your minions there while you are free to leave lane.'
  });

  return `<section class="guide-section">
    <h2>The Three Wave States, and What Each One Looks Like</h2>
    <p>Wave management sounds abstract until you picture the wave as one point on the lane, pulled toward whichever side currently has more minions at the clash. Everything below - freezing, slow-pushing, fast-pushing - is the same underlying mechanic, aimed at three different clash positions on purpose.</p>
    <div class="wave-diagram-stack">
      <div>
        <h3>Freeze</h3>
        ${freeze}
        <p>You only last-hit, and you let one or two enemy minions live each wave instead of killing everything. The enemy wave outnumbers yours, so the clash point sits near your own tower - not the lane's midpoint - where your tower keeps the wave from pushing any further in. That position denies the enemy safe CS: any minion they want has to be last-hit inside your tower's range.</p>
      </div>
      <div>
        <h3>Slow Push</h3>
        ${slowPush}
        <p>You kill caster minions but leave melee minions alive, so your side gains extra minions each cycle without immediately crashing the wave. Over two or three waves the clash point drifts past the midpoint and the wave grows large enough to threaten a tower plate or force the enemy to give up CS to avoid it.</p>
      </div>
      <div>
        <h3>Fast Push</h3>
        ${fastPush}
        <p>You clear the entire wave, melee included, as fast as your kit allows. The clash point reaches the enemy tower and stays there - a wave sitting at a tower does not push further on its own - which is what actually frees you to roam or recall without handing the enemy a free push of their own.</p>
      </div>
    </div>
  </section>`;
}

function renderWinConditionTable() {
  return dataTable({
    columns: [
      { key: 'pattern', label: 'Pattern' },
      { key: 'useWhen', label: 'Use It When' },
      { key: 'buys', label: 'What It Buys You' }
    ],
    rows: [
      { pattern: 'Freeze', useWhen: 'You are behind on levels or items and need a safe lane, or you want to bait the enemy into your tower range for a jungler gank.', buys: 'Denied enemy CS and a stable, low-risk lane while you catch back up.' },
      { pattern: 'Slow Push', useWhen: 'You want to roam or set up a recall without giving the wave away, and the enemy has no fast-clear tool to punish the buildup.', buys: 'A wave that occupies the enemy laner or threatens a plate while you are doing something else.' },
      { pattern: 'Fast Push', useWhen: 'You need to leave lane right now - to roam, recall, or answer a call elsewhere on the map - without leaving a live wave for the enemy to push back.', buys: 'A safe window to be absent from lane, since the wave is parked at a tower instead of walking toward yours.' }
    ]
  });
}

function renderMistakeTable() {
  return dataTable({
    columns: [
      { key: 'pattern', label: 'Pattern' },
      { key: 'ironBronze', label: 'Iron-Bronze Mistake' },
      { key: 'goldPlat', label: 'Gold-Plat+ Mistake' }
    ],
    rows: [
      { pattern: 'Freeze', ironBronze: 'Auto-attacking a minion out of habit, pushing the wave forward and losing the freeze by accident.', goldPlat: 'Holding the freeze correctly but never cashing it in - the opponent adapts and the denied CS stops mattering.' },
      { pattern: 'Slow Push', ironBronze: 'Killing every minion including melee, which crashes the wave early instead of letting it build.', goldPlat: 'Building the push correctly, then staying in lane to defend it instead of using the window it was built for.' },
      { pattern: 'Fast Push', ironBronze: 'Trying to fast-push without the clear speed to finish it, walking away from a half-cleared wave that gets punished.', goldPlat: 'Fast-pushing on a timer instead of on a read - clearing and leaving even when there was nowhere useful to go.' }
    ]
  });
}

function renderRoleSection() {
  return `<section class="guide-section">
    <h2>Wave Management By Role</h2>
    <p>The three patterns above apply to every lane, but which one matters most - and what it buys you - shifts by role.</p>
    <ul>
      <li><strong>Top:</strong> the most isolated lane, so a freeze or slow push you set up yourself has to hold with no help; a fast push is what actually enables a split-push threat later, not just a recall.</li>
      <li><strong>Jungle:</strong> you do not hold a wave yourself, but reading a laner's wave state before you gank changes everything - a gank into a freeze the enemy laner is holding walks you into a bad trade near their tower.</li>
      <li><strong>Mid:</strong> a fast push is a roam ticket; a slow push denies the enemy laner the freedom to roam themselves. Central position means both directions matter every game.</li>
      <li><strong>ADC:</strong> almost always paired with a support, so wave state has to be a shared decision - freezing without telling your support invites a dive neither of you is set up to survive.</li>
      <li><strong>Support:</strong> vision around the clash point is what makes any of this safe to hold - a freeze near your own tower without river vision is just a slower way to get dove.</li>
    </ul>
  </section>`;
}

function renderWaveManagement() {
  const introHtml = `<h1>Wave Management: Freeze, Slow Push, Fast Push</h1>
    <p class="lead">Wave management is picking where the minion wave sits on purpose, instead of letting it drift wherever last-hitting happens to leave it. This page covers the three deliberate states - freeze, slow push, fast push - what each one looks like on the lane, when to use it, and the mistakes that repeat at every rank.</p>`;

  const patternSection = renderPatternSection();

  const winConditionSection = `<section class="guide-section">
    <h2>When and Why To Use Each Pattern</h2>
    <p>None of the three patterns is better than the others in general - each one answers a different question about what you need from the lane right now.</p>
    ${renderWinConditionTable()}
    <p>Picking the right pattern is a read on your own game state first. See ${focusLink('trade-discipline')} for the trade side of that same read.</p>
  </section>`;

  const roleSection = renderRoleSection();

  const mistakesSection = `<section class="guide-section">
    <h2>Common Mistakes and How To Fix Them</h2>
    <p>Each pattern has its own way to fail, and the failure mode changes by rank more than by pattern.</p>
    ${renderMistakeTable()}
    ${callout('If your own mistake isn’t on this table, that’s fine - this is a starting point. Practice Tool with two bots on your own side is the fastest way to find your specific one.')}
  </section>`;

  const focusIntegrationSection = `<section class="guide-section">
    <h2>Where This Fits In the 12-Focus Program</h2>
    <p>${focusLink('wave-management')} is the focus this entire page expands on - everything above is the detail behind that one line on the Focus Menu. Two more focuses connect directly to it:</p>
    <ul>
      <li>${focusLink('recall-efficiency')} - a good recall is timed to wave state; knowing which of the three patterns you are currently holding is what makes that timing possible instead of guesswork.</li>
      <li>${focusLink('pressured-farming')} - holding a freeze while under pressure is the exact skill this focus measures, applied to the specific case where the pressure is coming from an opponent who also knows how to freeze.</li>
    </ul>
    <p>Working through the program in order? The <a href="${escapeHtml(site.url('focus-menu.html'))}">Focus Menu</a> is where wave-management sits alongside the other eleven - this page is the deep dive for whenever that one comes up, not a separate track to run through on its own.</p>
  </section>`;

  const sectionsHtml = `${patternSection}
    ${winConditionSection}
    ${roleSection}
    ${mistakesSection}
    ${focusIntegrationSection}`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#wave-freeze-setup'), 'Run the Wave-Freeze Setup drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu']
    ])}
  </div>`;

  const description = 'A guide to League of Legends wave management: how to freeze, slow-push, and fast-push a lane on purpose, when to use each, and the mistakes that repeat by rank.';
  return shell.documentShell({
    title: site.pageTitle('Wave Management Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('wave-management.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Wave Management: Freeze, Slow Push, Fast Push',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('wave-management.html')
    })
  });
}

module.exports = { renderWaveManagement };
