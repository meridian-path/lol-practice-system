'use strict';

// drills.html and warmup.html: the 12 practice-tool
// drills and 5 role warmup routines as web pages, each drill/warmup getting
// its own anchor id so focus-menu.html (src/web/contentPages.js) can
// deep-link `drills.html#<drillId>` per the site's cross-linking
// convention. Reuses the shared card() primitive (src/render/html.js) exactly
// like the print pack's Drill Library/Warmup Cards documents -- see
// drillToSlots() below, ported from src/render/pages.js's private helper of
// the same name since it isn't exported (a small, deliberate duplication
// rather than reaching into another module's file).

const fs = require('fs');
const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, card } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const drills = require(path.join('..', '..', 'content', 'drills.json'));
const focuses = require(path.join('..', '..', 'content', 'focuses.json'));
const warmups = require(path.join('..', '..', 'content', 'warmups.json'));

const focusByDrillId = new Map(focuses.map((f) => [f.drillId, f]));

// Role filter's own client-side logic (task-mt83rhrh-759f27 item 3) - read
// once at require time and inlined verbatim, same pattern as
// src/web/shell.js's own SITE_CSS. Also inlined into focus-menu.html
// (src/web/contentPages.js) - both pages need it independently, since a
// visitor may land on either one first.
const ROLE_FILTER_CLIENT_JS = fs.readFileSync(path.join(__dirname, 'roleFilterClient.js'), 'utf8');

// Duplicated from src/web/contentPages.js's own renderRoleFilterBar()
// rather than shared, matching this file's existing crossLinks()/
// standardEndLinks() precedent (each already duplicated the other
// direction, exactly one other caller each, not worth a shared module).
function renderRoleFilterBar() {
  const roles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
  const buttons = ['<button type="button" class="role-filter-btn" data-role-btn="" aria-pressed="true">All</button>']
    .concat(roles.map(r => `<button type="button" class="role-filter-btn" data-role-btn="${escapeHtml(r)}" aria-pressed="false">${escapeHtml(r)}</button>`))
    .join('\n      ');
  return `<div class="role-filter" data-role-filter>
      <span class="t-label">Filter by role</span>
      ${buttons}
      <p class="tracker-note" data-role-filter-count hidden></p>
    </div>`;
}

function crossLinks(links) {
  const items = links.map(([href, label]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join('\n      ');
  return `<nav class="cross-links" aria-label="Related pages">
      <ul>
      ${items}
      </ul>
    </nav>`;
}

// Every content page ends with links to the tracker and the free download
// pack (the site's cross-linking convention), same convention as
// src/web/contentPages.js's standardEndLinks -- duplicated here rather than
// imported since contentPages.js doesn't export it and this is the only
// other module that needs it.
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function drillToSlots(d) {
  const procedureText = d.procedure.map((step, i) => `${i + 1}) ${step}`).join('  ');
  return [
    { label: 'Skill Trained', value: d.skillTrained },
    { label: 'Where', value: d.where },
    { label: 'Duration', value: d.duration },
    { label: 'Procedure', value: procedureText },
    { label: 'Pass Bar', value: d.passBar, valueClass: 'pass-bar' },
    { label: 'Progression', value: d.progression },
    { label: 'Common Failure', value: d.commonFailure, valueClass: 'common-failure' }
  ];
}

// ---------------------------------------------------------------------------
// drills.html
// ---------------------------------------------------------------------------

function renderDrillJumpList() {
  const items = drills.map((d) => `<li><a href="#${escapeHtml(d.id)}">${escapeHtml(d.name)}</a></li>`).join('\n      ');
  return `<nav class="cross-links" aria-label="Jump to a drill">
      <ul>
      ${items}
      </ul>
    </nav>`;
}

// Each drill card gets a back-link to the Focus Menu card it trains (the
// other half of focus-menu.html's forward link into drills.html#<drillId>)
// plus a same-page "back to top" link into the jump
// list above, since 12 stacked cards is a long scroll.
function renderDrillCard(d) {
  const focus = focusByDrillId.get(d.id);
  const cardHtml = card({ title: d.name, slots: drillToSlots(d) });
  const backLinks = focus
    ? `<p><a href="${escapeHtml(site.url(`focus-menu.html#${focus.id}`))}">Trains the “${escapeHtml(focus.title)}” focus →</a> · <a href="#drills-top">Back to top ↑</a></p>`
    : `<p><a href="#drills-top">Back to top ↑</a></p>`;
  // Role tags mirror the drill's own matching focus (content/focuses.json's
  // roles field) - a drill trains one focus, so it inherits that focus's
  // own role relevance rather than needing a second, separately-maintained
  // roles list for drills specifically. A drill with no matching focus
  // (none currently exist) defaults to every role rather than disappearing
  // from every filter.
  const roles = focus ? focus.roles : ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
  return `<div id="${escapeHtml(d.id)}" data-roles="${escapeHtml(roles.join(','))}">${cardHtml}${backLinks}</div>`;
}

function renderDrills() {
  const introHtml = `<h1 id="drills-top">12 League of Legends Practice Drills</h1>
    <p class="lead">Twelve Practice Tool and self-review drills, one per Focus Menu card. Each has a pass bar you can actually measure yourself against and a progression for once you clear it.</p>`;
  const first = drills.slice(0, 6).map(renderDrillCard).join('\n');
  const rest = drills.slice(6).map(renderDrillCard).join('\n');
  const body = `<div class="zone-measure">
    ${introHtml}
    ${renderRoleFilterBar()}
    ${renderDrillJumpList()}
    <h2>The Drills</h2>
    ${first}
    ${rest}
    ${standardEndLinks([
      [site.url('focus-menu.html'), 'Which drill matches your focus'],
      [site.url('warmup.html'), 'Warmup routines by role']
    ])}
  </div>
  <script>${ROLE_FILTER_CLIENT_JS}</script>`;
  const description = 'Twelve League of Legends practice-tool drills for CS, wave control, vision, trading, and tilt discipline, each with a measurable pass bar and a progression.';
  return shell.documentShell({
    title: site.pageTitle('12 League of Legends Practice Drills'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('drills.html'),
    active: 'drills',
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: '12 League of Legends Practice Drills',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('drills.html')
    })
  });
}

// ---------------------------------------------------------------------------
// warmup.html
// ---------------------------------------------------------------------------

function renderWarmupJumpList() {
  const items = warmups.map((w) => `<li><a href="#${escapeHtml(w.id)}">${escapeHtml(w.title)}</a></li>`).join('\n      ');
  return `<nav class="cross-links" aria-label="Jump to a warmup">
      <ul>
      ${items}
      </ul>
    </nav>`;
}

// Maps each role-specific warmup (content/warmups.json's own ids) to its
// climbing guide(s) -- warmups.json has one combined "solo-lane" routine
// for Top/Mid, so that one links to both; "universal" has no single
// climbing guide to point at and is left alone.
const WARMUP_ROLE_GUIDES = {
  'solo-lane': [
    [site.url('climbing-top.html'), 'Top Lane Climbing Guide'],
    [site.url('climbing-mid.html'), 'Mid Lane Climbing Guide']
  ],
  jungle: [[site.url('climbing-jungle.html'), 'Jungle Climbing Guide']],
  adc: [[site.url('climbing-adc.html'), 'ADC Climbing Guide']],
  support: [[site.url('climbing-support.html'), 'Support Climbing Guide']]
};

function renderWarmupCard(w) {
  const cardHtml = card({
    title: w.title,
    slots: [
      { label: `Physical (${w.blocks.physical.duration})`, value: w.blocks.physical.description },
      { label: `Mechanical Drill (${w.blocks.mechanical.duration})`, value: w.blocks.mechanical.description },
      { label: `Mental Reset (${w.blocks.mentalReset.duration})`, value: w.blocks.mentalReset.description },
      { label: 'Start-Within Rule', value: w.startWithinRule },
      { label: 'Same-Settings Rule', value: w.sameSettingsRule }
    ]
  });
  const roleGuideLinks = (WARMUP_ROLE_GUIDES[w.id] || [])
    .map(([href, label]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join(' · ');
  const backLink = roleGuideLinks
    ? `<p>${roleGuideLinks} · <a href="#warmup-top">Back to top ↑</a></p>`
    : `<p><a href="#warmup-top">Back to top ↑</a></p>`;
  return `<div id="${escapeHtml(w.id)}"><p class="slot-label">${escapeHtml(w.role)}</p>${cardHtml}${backLink}</div>`;
}

function renderWarmup() {
  const introHtml = `<h1 id="warmup-top">LoL Warmup Routines by Role</h1>
    <p class="lead">Five 15-minute routines - one universal, four role-specific - each built the same way: two minutes physical, ten minutes mechanical, two minutes mental reset. Queue within thirty minutes of finishing, on the same settings you play ranked at.</p>`;
  const first = warmups.slice(0, 3).map(renderWarmupCard).join('\n');
  const rest = warmups.slice(3).map(renderWarmupCard).join('\n');
  const body = `<div class="zone-measure">
    ${introHtml}
    ${renderWarmupJumpList()}
    <h2>The Routines</h2>
    ${first}
    ${rest}
    ${standardEndLinks([
      [site.url('drills.html'), 'The 12 practice-tool drills'],
      [site.url('program.html'), 'Back to the 30-day program']
    ])}
  </div>`;
  const description = 'Five 15-minute League of Legends warmup routines by role, each built from physical prep, a mechanical drill block, and a two-minute mental reset.';
  return shell.documentShell({
    title: site.pageTitle('LoL Warmup Routines by Role'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('warmup.html'),
    active: 'warmup',
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'LoL Warmup Routines by Role',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('warmup.html')
    })
  });
}

const DRILL_WARMUP_PAGES = [
  ['drills.html', renderDrills],
  ['warmup.html', renderWarmup]
];

module.exports = { DRILL_WARMUP_PAGES };
