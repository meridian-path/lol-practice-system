'use strict';

// vision.html: a standalone content-gap page (not derived from
// content/guide.js's A1-A11 sections) covering vision and warding as a
// deliberate skill -- rhythm-based placement, vision denial, and the
// role-specific split in how much of it each position actually owns.
// Follows src/web/earlyGame.js's/waveManagement.js's own freeform-page
// pattern (hand-written body HTML, not guide-block-rendered) and reuses
// the shared dataTable()/callout() primitives (src/render/html.js).
// Maps directly onto the existing "vision-cadence" focus, which previously
// had only a Focus Menu card and the Ward Clock drill -- no deep-dive page
// of its own, unlike wave-management, which got one earlier this session.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`visionWarding.js: unknown focus id "${id}"`);
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
// src/web/earlyGame.js's, src/web/macroPlay.js's, and
// src/web/waveManagement.js's own standardEndLinks() exactly -- duplicated
// rather than imported since none of them export it and this is a sixth,
// independent caller (same accepted duplication those files' own headers
// already note).
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderVisionToolsSection() {
  return `<section class="guide-section">
    <h2>What a Ward Actually Buys You</h2>
    <p>A ward's value is not the vision score number it adds - it is the specific decision it lets you make safely that you could not make blind. Every vision tool on the map does one of two jobs: it either watches a path something has to walk through, or it watches a spot something has to stand still in to take (a jungle camp, an objective pit, a recall). Placing a ward that does neither is the most common way to raise vision score without actually buying any safety.</p>
    <p>Your trinket ward and purchased Control Wards do the same underlying job with different tradeoffs: the trinket is free and always available on a cooldown, so it is what you use to keep a baseline of coverage running; a Control Ward costs real gold and lasts far longer, and it also removes an existing enemy ward in the spot where you place it, so it is what you use for a spot you specifically need to hold, not refresh out of habit. The map's known high-traffic choke points - river crossings, jungle entrances, objective pits - are worth more per ward than an open lane, because more of the enemy's possible paths run through them.</p>
  </section>`;
}

function renderRhythmSection() {
  return `<section class="guide-section">
    <h2>Warding On a Rhythm, Not a Feeling</h2>
    <p>The single biggest gap between a player with a decent vision score and a player whose vision actually prevents deaths is timing. Warding only when something already feels dangerous means the ward goes down after the threat is already close enough to matter - it raises the number, but it did not do the job a ward is for. ${focusLink('vision-cadence')} measures this directly: the longest stretch of the game you spend with zero active wards nearby, not how many wards you placed in total.</p>
    <p>A rhythm is simple to build: tie your ward placement to something that already happens on a cycle, like your trinket coming off cooldown, instead of to a feeling. Every time that cycle hits, place a ward, whether or not anything currently looks threatening. Add a second, slower rhythm for Control Wards once the trinket cycle is automatic - a Control Ward held for a known contested fight (an objective spawn, a dive setup) does more than one placed reactively after the fight already started.</p>
    ${callout('The drill for this is mechanical on purpose: set a cadence before the game starts, then check afterward for any gap over 90 seconds with no active ward nearby. The number matters less than noticing where the gaps actually happen.')}
  </section>`;
}

function renderDenialSection() {
  return `<section class="guide-section">
    <h2>Vision Denial: The Half Most Players Skip</h2>
    <p>Placing wards is half of vision play. Clearing the enemy's wards is the other half, and it gets skipped far more often, because a cleared ward does not show up anywhere on your own scoreboard the way a placed one does. A control ward you place does three things at once: it grants vision, it removes one enemy ward on sight, and it denies that spot for its full duration.</p>
    <p>Sweeping before a contested play is not optional prep, it is the play itself: walking into an objective fight or a dive with the enemy still holding vision on your approach is the same mistake as walking in with no vision of your own, just from the other direction. Treat a known enemy ward spot the same way you would treat a known enemy cooldown - something to check and account for before you commit, not something to discover mid-fight.</p>
  </section>`;
}

function renderRoleSection() {
  return `<section class="guide-section">
    <h2>Vision Responsibility By Role</h2>
    <p>Every role benefits from vision, but the load is not shared evenly, and expecting an even split is its own common mistake.</p>
    <ul>
      <li><strong>Support:</strong> carries the largest share by default - lane vision, then river and objective vision as the game moves past laning phase. This is close to a full-time job that deserves dedicated attention through the rest of the game.</li>
      <li><strong>Jungle:</strong> owns vision around your own jungle entrances and contested objective pits specifically, since a jungler with no vision on their own camps is the easiest gank target on the map.</li>
      <li><strong>Mid:</strong> river vision is a laning-phase survival tool first, an information tool second - the same ward that shows an incoming gank also shows whether a roam window is actually open.</li>
      <li><strong>Top:</strong> the most isolated lane, so a single well-placed ward on the jungle entrance you are most vulnerable from often has to cover for the entire lane phase.</li>
      <li><strong>ADC:</strong> the smallest independent share, since a support usually covers lane vision - but that only holds if the two of you have actually agreed on it, not assumed it.</li>
    </ul>
  </section>`;
}

function renderMistakeTable() {
  return dataTable({
    columns: [
      { key: 'phase', label: 'Phase' },
      { key: 'ironBronze', label: 'Iron-Bronze Mistake' },
      { key: 'goldPlat', label: 'Gold-Plat+ Mistake' }
    ],
    rows: [
      { phase: 'Laning Phase', ironBronze: 'Using the trinket only when it happens to be remembered, so real gaps open up between placements.', goldPlat: 'Warding on a rhythm correctly but always the same spot, making the pattern predictable and easy to clear.' },
      { phase: 'Mid Game', ironBronze: 'Never buying a Control Ward, relying on the trinket alone for spots that need to be held, not just refreshed.', goldPlat: 'Buying the Control Ward but placing it reactively after a fight starts, instead of ahead of the objective spawn it was meant for.' },
      { phase: 'Vision Denial', ironBronze: 'Never sweeping at all, so an enemy control ward sits uncleared for its full duration.', goldPlat: 'Sweeping on a schedule instead of before the specific play that vision denial was actually needed for.' }
    ]
  });
}

function renderVisionWarding() {
  const introHtml = `<h1>Vision and Warding: A Deliberate-Practice Guide</h1>
    <p class="lead">Vision score is a byproduct, not the goal. This page covers what a ward actually buys you, how to place them on a rhythm instead of a feeling, why clearing the enemy's wards matters as much as placing your own, and how the workload splits by role.</p>`;

  const sectionsHtml = `${renderVisionToolsSection()}
    ${renderRhythmSection()}
    ${renderDenialSection()}
    ${renderRoleSection()}
    <section class="guide-section">
      <h2>Common Mistakes and How To Fix Them</h2>
      <p>The mistakes below cluster around timing and denial, not raw ward count - a player who wards enough but only reactively will still get caught by the exact threat vision was supposed to reveal.</p>
      ${renderMistakeTable()}
    </section>
    <section class="guide-section">
      <h2>Where This Fits In the 12-Focus Program</h2>
      <p>${focusLink('vision-cadence')} is the focus this entire page expands on - the rhythm-based warding described above is exactly what its own number tracks. Two more focuses connect directly to it:</p>
      <ul>
        <li>${focusLink('objective-awareness')} - vision on an objective pit is what turns a timer you know about into a timer you can actually act on; a correct timer with no vision on the pit is still a guess.</li>
        <li>${focusLink('minimap-awareness')} - the habit of checking the minimap is what turns a placed ward into information you actually use, rather than a number that sits unused in the corner of the screen.</li>
      </ul>
      <p>Not sure this is the right focus to pick up next? Run a baseline first - the Focus Menu shows which of the twelve your own last ten games actually flag as weakest, vision or otherwise.</p>
    </section>`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#ward-clock'), 'Run the Ward Clock drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu'],
      [site.url('climbing-support.html'), 'Vision in the support role specifically: Support Climbing Guide'],
      [site.url('climbing-jungle.html'), 'Vision around your own camps and pits: Jungle Climbing Guide']
    ])}
  </div>`;

  const description = 'A guide to vision and warding in League of Legends: rhythm-based ward placement, vision denial, and how the workload splits by role.';
  return shell.documentShell({
    title: site.pageTitle('Vision and Warding Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('vision.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Vision and Warding: A Deliberate-Practice Guide',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('vision.html')
    })
  });
}

module.exports = { renderVisionWarding };
