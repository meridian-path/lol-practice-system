'use strict';

// Guide-derived content pages: program.html,
// baseline.html, focus-menu.html, champion-pool.html, vod-review.html,
// tilt-rules.html, faq.html. Rendered from content/guide.js sections
// A1-A11 per the site's page mapping, reusing the same
// renderGuideBlock/renderBenchmarksTable/renderFocusCards renderers the
// print pack uses (src/render/pages.js), so a guide section, the
// benchmarks table, and a focus card look identical in substance on both
// outputs -- only the surrounding shell differs.
//
// Every guide section (a1 through a11) is used exactly once across these
// seven pages -- see SECTION_MAP below, which is also this module's map
// from page to source content.

const fs = require('fs');
const path = require('path');

const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, checklistRow } = require('../render/html.js');
const {
  renderGuideBlock,
  renderBenchmarksTable
} = require('../render/pages.js');
const { articleJsonLd, faqPageJsonLd } = require('./structuredData.js');

const guide = require(path.join('..', '..', 'content', 'guide.js'));
const benchmarks = require(path.join('..', '..', 'content', 'benchmarks.json'));
const focuses = require(path.join('..', '..', 'content', 'focuses.json'));
const drills = require(path.join('..', '..', 'content', 'drills.json'));

const sectionsById = new Map(guide.sections.map(s => [s.id, s]));
const renderCtx = { benchmarks, focuses, drills };

// Role filter's own client-side logic (task-mt83rhrh-759f27 item 3) - read
// once at require time and inlined verbatim, same pattern as
// src/web/shell.js's own SITE_CSS. Also inlined into drills.html
// (src/web/drillWarmupPages.js) - both pages need it independently, since
// a visitor may land on either one first.
const ROLE_FILTER_CLIENT_JS = fs.readFileSync(path.join(__dirname, 'roleFilterClient.js'), 'utf8');

function section(id) {
  const s = sectionsById.get(id);
  if (!s) throw new Error(`Unknown guide section id: ${id}`);
  return s;
}

/**
 * Renders one guide section as <h2>title</h2> followed by its blocks --
 * identical shape to src/render/pages.js's renderGuide(), reused per-section
 * instead of for the whole guide at once.
 */
function renderSection(id) {
  const s = section(id);
  return `<section class="guide-section">
      <h2>${escapeHtml(s.title)}</h2>
      ${s.body.map(b => renderGuideBlock(b, renderCtx)).join('\n')}
    </section>`;
}

/**
 * The Focus Menu's cards, reimplemented here (rather than calling
 * src/render/pages.js's renderFocusCards) for two reasons: the print pack's
 * card has no links, but the web version requires each web focus card to
 * deep-link its drill slot to drills.html#<drillId>, and the shared card()
 * primitive (src/render/html.js) escapes its slot values as plain text, so
 * it cannot carry an <a> inside a slot; and each card needs its own anchor
 * id (id="<focus.id>") so drills.html's "Trains the '<focus>' focus" back-
 * link (src/web/drillWarmupPages.js, which already targets
 * focus-menu.html#<focus.id>) lands on the exact card instead of just the
 * top of the page. Every other value/label/class here matches
 * renderFocusCards()'s output exactly -- only the anchor id and the drill
 * slot's value (now a link) differ.
 */
function renderFocusCardsWithDrillLinks() {
  const byId = new Map(drills.map(d => [d.id, d]));
  const cards = focuses.map(f => {
    const drill = byId.get(f.drillId);
    const drillLabel = drill ? drill.name : f.drillId;
    const drillHref = site.url(`drills.html#${f.drillId}`);
    return `<div class="card" id="${escapeHtml(f.id)}" data-roles="${escapeHtml(f.roles.join(','))}">
    <h3 class="card-title">${escapeHtml(f.title)}</h3>
    <div class="card-slot">
      <span class="slot-label">What It Is</span>
      <span class="slot-value">${escapeHtml(f.whatItIs)}</span>
    </div>
    <div class="card-slot">
      <span class="slot-label">The Number That Proves It</span>
      <span class="slot-value">${escapeHtml(f.theNumber)}</span>
    </div>
    <div class="card-slot">
      <span class="slot-label">The Drill That Trains It</span>
      <span class="slot-value"><a href="${escapeHtml(drillHref)}">${escapeHtml(drillLabel)}</a></span>
    </div>
    <div class="card-slot">
      <span class="slot-label">Graduation Bar</span>
      <span class="slot-value pass-bar">${escapeHtml(f.graduationBar)}</span>
    </div>
  </div>`;
  }).join('\n');
  return `<div class="drill-grid">${cards}</div>`;
}

/**
 * The VOD Review Sheet's fields (src/render/pages.js's renderVodSheet),
 * reused here as a live checklist rather than a blank fillable template --
 * vod-review.html's source content is guide A8 plus the VOD sheet fields
 * as a checklist.
 */
function renderVodChecklist() {
  const items = [
    'Checkpoint 1, 0-3 minutes (Lane Setup): note the timestamp, and whether your level-1 positioning matched the matchup you expected.',
    'Checkpoint 2, First Back: note the timestamp, whether the recall timing was efficient, and whether your purchase matched the game state.',
    'Checkpoint 3, Mid-Game Grouping: note the timestamp, whether you were where you needed to be, and whether you called the objective timer early.',
    'Checkpoint 4, The Fight That Decided It: note the timestamp, watch it twice, and write one thing about your own positioning and one thing the enemy team did that worked.',
    'Change Next Game: write the one specific action you will change - not a feeling.'
  ];
  return `<div class="vod-checklist">${items.map(checklistRow).join('\n')}</div>`;
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
// pack (the site's cross-linking convention), on top of whatever
// page-specific links a given page also carries.
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function buildPage({ file, titleBase, description, active, introHtml, sectionsHtml, endLinksHtml, jsonLd }) {
  // Every guide-derived content page is prose-dominant (the widest thing
  // any of them carries is the two-column baseline benchmarks table or the
  // focus-menu drill-grid), so the whole page sits in one zone-measure
  // reading column rather than being split block-by-block -- these pages
  // inherit the token/type system without being redesigned themselves.
  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${endLinksHtml}
  </div>`;
  // Article JSON-LD by default (per structuredData.js's design: every
  // content page gets Article) -- callers that need a different schema.org
  // type (faq.html's FAQPage) pass jsonLd explicitly to override.
  const resolvedJsonLd = jsonLd !== undefined ? jsonLd : articleJsonLd({
    headline: titleBase,
    description,
    datePublished: site.BUILD_DATE,
    dateModified: site.BUILD_DATE,
    url: site.absoluteUrl(file)
  });
  return shell.documentShell({
    title: site.pageTitle(titleBase),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl(file),
    active: active || null,
    ogType: 'article',
    jsonLd: resolvedJsonLd
  });
}

// Splits a page's sections into "everything up to and including the
// midpoint" and "the rest" -- originally so a manual ad slot could sit at
// the midpoint of a multi-section page. The manual ad-slot markup itself
// was removed (Auto ads now places ads on its own, so the empty
// placeholder wells were dropped rather than left visually coexisting with
// it), but the split is kept as-is since callers below still pass a
// two-part sectionsHtml shape.
function renderSectionsWithMidAd(ids) {
  const mid = Math.max(1, Math.ceil(ids.length / 2));
  const first = ids.slice(0, mid).map(renderSection).join('\n');
  const rest = ids.slice(mid).map(renderSection).join('\n');
  return `${first}
    ${rest}`;
}

// ---------------------------------------------------------------------------
// program.html -- guide A1, A5, A6
// ---------------------------------------------------------------------------
function renderProgram() {
  const introHtml = `<h1>The 30-Day Program</h1>
    <p class="lead">One focus, held for a block of ten games, measured and reviewed before you move to the next. This page covers how the method works, what a normal session looks like, and how the thirty games are laid out.</p>`;
  return buildPage({
    file: 'program.html',
    titleBase: 'The 30-Day Practice Program',
    description: 'How the Solo Queue Practice System works: one measurable focus per ten-game block, a repeatable session loop, and a 30-day calendar in three blocks.',
    active: 'program',
    introHtml,
    sectionsHtml: renderSectionsWithMidAd(['a1-how-this-works', 'a5-the-session-loop', 'a6-the-30-day-calendar']),
    endLinksHtml: standardEndLinks([
      [site.url('focus-menu.html'), 'Pick your first focus from the Focus Menu'],
      [site.url('warmup.html'), 'Warmup routines by role'],
      [site.url('drills.html'), 'The 12 practice-tool drills'],
      [site.url('champion-pool.html'), 'Build a champion pool that supports the program'],
      [site.url('vod-review.html'), 'Review your own replays in 12 minutes'],
      [site.url('tilt-rules.html'), 'Tilt and stop rules for a session'],
      [site.url('early-game.html'), 'Early Game Fundamentals: your first 15 minutes'],
      [site.url('macro-play.html'), 'Macro Play and Win Condition Identification'],
      [site.url('wave-management.html'), 'Wave Management: freeze, slow push, fast push'],
      [site.url('vision.html'), 'Vision and Warding: a deliberate-practice guide'],
      [site.url('teamfighting.html'), 'Teamfighting Fundamentals: positioning and target priority'],
      [site.url('trading.html'), 'Lane Trading Discipline: trade types and the all-in decision'],
      [site.url('objectives.html'), 'Objective Control: setup, vision, and Herald-to-Baron timing'],
      [site.url('comms.html'), 'Shot-Calling and Comms: pings as information, basic vs primary caller'],
      [site.url('draft.html'), 'Draft Fundamentals: damage balance, pick order, and comfort'],
      [site.url('climbing-top.html'), 'Top Lane Climbing Guide'],
      [site.url('climbing-jungle.html'), 'Jungle Climbing Guide'],
      [site.url('climbing-mid.html'), 'Mid Lane Climbing Guide'],
      [site.url('climbing-adc.html'), 'ADC Climbing Guide'],
      [site.url('climbing-support.html'), 'Support Climbing Guide']
    ])
  });
}

// ---------------------------------------------------------------------------
// baseline.html -- guide A2, A3 (A3 includes the benchmarks table block)
// ---------------------------------------------------------------------------

// Freshness trust signal (task-mt83rhrh-759f27 item 10) - a real,
// domain-specific one given LoL ships a new patch roughly every 2 weeks.
// The CS/min-by-rank figures themselves are community-sourced averages
// (content/benchmarks.json's own "provenance" field), not raw per-patch
// game data, so they don't need updating every patch - but stating which
// patch they were last checked against is still an honest, concrete signal
// a visitor can act on, and one the audit correctly identified this page
// lacked entirely. Real current patch confirmed via WebSearch (2026-08-25,
// live since August 12, 2026) rather than guessed - update this constant
// whenever the benchmarks table is next reviewed against a newer patch.
const BENCHMARKS_LAST_REVIEWED = 'Patch 26.16 (August 2026)';

function renderBaseline() {
  const introHtml = `<h1>Day 0: Baseline and Benchmarks</h1>
    <p class="lead">Before picking a focus, read your own last ten games and compare your numbers against real rank benchmarks. Everything after this point measures you against yourself, not against this table.</p>
    <p class="callout">Benchmarks table last reviewed for ${escapeHtml(BENCHMARKS_LAST_REVIEWED)}.</p>`;
  return buildPage({
    file: 'baseline.html',
    titleBase: 'CS per Minute by Rank',
    description: 'How to build an honest Day 0 baseline from your last ten games, and CS-per-minute benchmarks by rank to compare it against.',
    introHtml,
    sectionsHtml: renderSectionsWithMidAd(['a2-day-zero-baseline', 'a3-read-your-baseline']),
    endLinksHtml: standardEndLinks([
      [site.url('drills.html#cs-10min'), 'Run the 10-Minute CS Drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu']
    ])
  });
}

// ---------------------------------------------------------------------------
// Role filter bar (task-mt83rhrh-759f27 item 3) - shared markup between
// focus-menu.html and drills.html, duplicated between this file and
// src/web/drillWarmupPages.js rather than pulled into a shared module,
// matching this file's own standardEndLinks()/crossLinks() precedent
// (each already duplicated in that same other file for the same reason:
// exactly one other caller, not worth a new shared module for). The actual
// filtering is src/web/roleFilterClient.js, inlined once per page below.
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

// focus-menu.html -- guide A4 (focus cards, with drill deep-links) + A10
// ---------------------------------------------------------------------------
function renderFocusMenu() {
  const introHtml = `<h1>The Focus Menu</h1>
    <p class="lead">Twelve measurable things you could work on. Pick exactly one per block, based on what your baseline shows, run its drill, and hold it until it graduates.</p>`;
  const a4 = section('a4-the-focus-menu');
  const a4Html = `<section class="guide-section">
      <h2>${escapeHtml(a4.title)}</h2>
      ${renderRoleFilterBar()}
      ${a4.body.map(b => (b.type === 'focusCards' ? renderFocusCardsWithDrillLinks() : renderGuideBlock(b, renderCtx))).join('\n')}
    </section>
    <script>${ROLE_FILTER_CLIENT_JS}</script>`;
  const sectionsHtml = `${a4Html}
    ${renderSection('a10-when-to-change-focus')}`;
  return buildPage({
    file: 'focus-menu.html',
    titleBase: 'The Focus Menu: 12 Things to Work On',
    description: 'Twelve measurable League of Legends focuses, one drill each, and the rule for picking exactly one to work on at a time.',
    active: 'focus-menu',
    introHtml,
    sectionsHtml,
    endLinksHtml: standardEndLinks([
      [site.url('drills.html'), 'All 12 practice-tool drills'],
      [site.url('baseline.html'), 'Read your baseline first'],
      [site.url('early-game.html'), 'Early Game Fundamentals: your first 15 minutes'],
      [site.url('macro-play.html'), 'Macro Play and Win Condition Identification'],
      [site.url('wave-management.html'), 'Wave Management: freeze, slow push, fast push'],
      [site.url('vision.html'), 'Vision and Warding: a deliberate-practice guide'],
      [site.url('teamfighting.html'), 'Teamfighting Fundamentals: positioning and target priority'],
      [site.url('trading.html'), 'Lane Trading Discipline: trade types and the all-in decision'],
      [site.url('objectives.html'), 'Objective Control: setup, vision, and Herald-to-Baron timing'],
      [site.url('comms.html'), 'Shot-Calling and Comms: pings as information, basic vs primary caller'],
      [site.url('draft.html'), 'Draft Fundamentals: damage balance, pick order, and comfort'],
      [site.url('climbing-top.html'), 'Top Lane Climbing Guide'],
      [site.url('climbing-jungle.html'), 'Jungle Climbing Guide'],
      [site.url('climbing-mid.html'), 'Mid Lane Climbing Guide'],
      [site.url('climbing-adc.html'), 'ADC Climbing Guide'],
      [site.url('climbing-support.html'), 'Support Climbing Guide']
    ])
  });
}

// ---------------------------------------------------------------------------
// champion-pool.html -- guide A7
// ---------------------------------------------------------------------------
function renderChampionPool() {
  const introHtml = `<h1>Building a Champion Pool That Supports Practice</h1>
    <p class="lead">A pool sized and shaped to keep your focus-block data clean, not a list of favorites.</p>`;
  return buildPage({
    file: 'champion-pool.html',
    titleBase: 'How Many Champions Should You Play',
    description: 'A method for building a two-main-plus-one-blind-pick champion pool that supports deliberate practice instead of diluting it.',
    introHtml,
    sectionsHtml: renderSectionsWithMidAd(['a7-champion-pool-setup']),
    endLinksHtml: standardEndLinks([
      [site.url('program.html'), 'Back to the 30-day program'],
      [site.url('focus-menu.html'), 'Pick a focus first, then size the pool around it']
    ])
  });
}

// ---------------------------------------------------------------------------
// vod-review.html -- guide A8 + VOD sheet fields as a checklist
// ---------------------------------------------------------------------------
function renderVodReview() {
  const introHtml = `<h1>Review Your Own Replays in 12 Minutes</h1>
    <p class="lead">Four checkpoints, roughly three minutes each, using nothing but your client's own replay feature.</p>`;
  const a8Html = renderSection('a8-self-vod-review');
  const checklistSection = `<section class="guide-section">
      <h2>VOD Review Checklist</h2>
      <p>The same four checkpoints as a running checklist - print the fillable version below if you would rather write on paper.</p>
      ${renderVodChecklist()}
    </section>`;
  const sectionsHtml = `${a8Html}
    ${checklistSection}`;
  return buildPage({
    file: 'vod-review.html',
    titleBase: 'Review Your Replays in 12 Minutes',
    description: 'A 4-checkpoint method for reviewing your own League of Legends replays in about twelve minutes, with a printable checklist.',
    active: 'vod-review',
    introHtml,
    sectionsHtml,
    endLinksHtml: standardEndLinks([
      [site.url('print/07-vod-review-sheet.html'), 'Print the blank VOD Review Sheet'],
      [site.url('focus-menu.html#lesson-extraction'), 'Post-Game Lesson Extraction, the focus this checklist trains'],
      [site.url('program.html'), 'Back to the 30-day program']
    ])
  });
}

// ---------------------------------------------------------------------------
// tilt-rules.html -- guide A9
// ---------------------------------------------------------------------------
function renderTiltRules() {
  const introHtml = `<h1>Tilt and Stop Rules</h1>
    <p class="lead">Pre-committed rules for when to stop a session, decided before you are tilted enough to need them.</p>`;
  return buildPage({
    file: 'tilt-rules.html',
    titleBase: 'Tilt and Stop Rules',
    description: 'Pre-committed stop rules for League of Legends solo queue: the two-loss rule, a breathing reset, and why logging before closing the client matters.',
    active: 'tilt-rules',
    introHtml,
    sectionsHtml: renderSectionsWithMidAd(['a9-tilt-and-stop-rules']),
    endLinksHtml: standardEndLinks([
      [site.url('program.html'), 'Back to the 30-day program'],
      [site.url('focus-menu.html#death-cause'), 'Death Cause Control, for the pattern behind most tilt spirals']
    ])
  });
}

// ---------------------------------------------------------------------------
// faq.html -- guide A11
// ---------------------------------------------------------------------------
// The FAQ guide section's "list" block is Q&A pairs written as one string
// each ("Question? Answer text."), not structured data -- this splits each
// on its first "?" to build FAQPage's required {question, answerHtml}
// shape. Only the list block qualifies (the section's three lead-in `p`
// blocks are "what this is not" statements, not questions, so FAQPage
// schema -- which requires an actual question -- would misrepresent them).
function extractFaqPairs() {
  const s = section('a11-faq');
  const listBlock = s.body.find((b) => b.type === 'list');
  return listBlock.items.map((item) => {
    const qEnd = item.indexOf('?');
    return {
      question: item.slice(0, qEnd + 1),
      // Plain text, not HTML -- faqPageJsonLd's stripHtmlToText() is a
      // no-op passthrough on text with no tags/entities, so this is safe
      // to pass as-is.
      answerHtml: item.slice(qEnd + 2).trim()
    };
  });
}

function renderFaq() {
  const introHtml = `<h1>FAQ and What This Is Not</h1>
    <p class="lead">Straight answers, including about what this program cannot promise.</p>`;
  return buildPage({
    file: 'faq.html',
    titleBase: 'FAQ',
    description: 'What the Solo Queue Practice System is and is not: no boost, no rank guarantee, no Riot affiliation, and no account or API key required.',
    active: 'faq',
    introHtml,
    sectionsHtml: renderSectionsWithMidAd(['a11-faq']),
    endLinksHtml: standardEndLinks([
      [site.url('program.html'), 'Read the full program'],
      [site.url('focus-menu.html'), 'See the full Focus Menu']
    ]),
    jsonLd: faqPageJsonLd(extractFaqPairs())
  });
}

const CONTENT_PAGES = [
  ['program.html', renderProgram],
  ['baseline.html', renderBaseline],
  ['focus-menu.html', renderFocusMenu],
  ['champion-pool.html', renderChampionPool],
  ['vod-review.html', renderVodReview],
  ['tilt-rules.html', renderTiltRules],
  ['faq.html', renderFaq]
];

module.exports = { CONTENT_PAGES };
