'use strict';

const { escapeHtml, card, checklistRow, fillLine, callout, dataTable } = require('./html.js');
const { RIOT_DISCLAIMER, TRADEMARK_NOTICE, absoluteUrl } = require('../site.js');

const VERSION = '1.0.0';
const LAST_REVIEWED = '2026-08-12';
// Riot's fan-content policy ("Legal Jibber Jabber") requires this exact
// wording -- it replaces the pack's original "Not
// endorsed by or affiliated with..." line. Sourced from site.js so the
// print pack and the web build (src/web/shell.js) never drift apart.
const DISCLAIMER = `${RIOT_DISCLAIMER} ${TRADEMARK_NOTICE}`;

function footer(docName) {
  return `<div class="page-footer">${escapeHtml(docName)} - v${VERSION} - last reviewed ${LAST_REVIEWED} - ${DISCLAIMER}</div>`;
}

function documentShell({ title, description, bodyHtml, docName, cardDoc, canonical, noindex }) {
  // canonical/noindex: the print pack's HTML documents are
  // near-verbatim duplicates of their web-page equivalents, so every print
  // page gets noindex'd and pointed at that web page as canonical -- keeps
  // both from competing for the same search query. Still an object param
  // (not required) so a genuinely un-mapped future print document has an
  // escape hatch, but every current one sets it.
  const canonicalLink = canonical ? `\n<link rel="canonical" href="${escapeHtml(canonical)}">` : '';
  const robotsMeta = noindex ? '\n<meta name="robots" content="noindex">' : '';
  // The print pack (opened on screen as often as it's printed) always
  // renders light regardless of the web build's dark-default theme
  // toggle: tokens.css is shared with print.css, and without this
  // attribute the whole printable pack would render dark. See
  // tokens.css's :root[data-theme="light"] block.
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">${canonicalLink}${robotsMeta}
<link rel="stylesheet" href="./print.css">
</head>
<body${cardDoc ? ' class="card-doc"' : ''}>
<div class="page-content">
${bodyHtml}
${footer(docName)}
</div>
</body>
</html>`;
}

function cover({ title, subtitle }) {
  return `<div class="cover">
  <h1 class="cover-title">${escapeHtml(title)}</h1>
  <p class="cover-subtitle">${escapeHtml(subtitle)}</p>
  <hr class="cover-rule">
  <p class="cover-meta">Version ${VERSION} - last reviewed ${LAST_REVIEWED}</p>
  <p class="cover-disclaimer">${DISCLAIMER}</p>
</div>`;
}

// ---------------------------------------------------------------------------
// Guide body block renderer
// ---------------------------------------------------------------------------

function renderGuideBlock(block, ctx) {
  if (block.type === 'p') return `<p>${escapeHtml(block.text)}</p>`;
  if (block.type === 'callout') return callout(block.text);
  if (block.type === 'list') {
    return `<ul>${block.items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  }
  if (block.type === 'table' && block.ref === 'benchmarks') {
    return renderBenchmarksTable(ctx.benchmarks);
  }
  if (block.type === 'focusCards') {
    return renderFocusCards(ctx.focuses, ctx.drills);
  }
  throw new Error(`Unknown guide block type: ${block.type}`);
}

function renderFocusCards(focuses, drills) {
  const byId = new Map(drills.map(d => [d.id, d]));
  const cards = focuses.map(f => {
    const drill = byId.get(f.drillId);
    return card({
      title: f.title,
      slots: [
        { label: 'What It Is', value: f.whatItIs },
        { label: 'The Number That Proves It', value: f.theNumber },
        { label: 'The Drill That Trains It', value: drill ? drill.name : f.drillId },
        { label: 'Graduation Bar', value: f.graduationBar, valueClass: 'pass-bar' }
      ]
    });
  }).join('\n');
  return `<div class="drill-grid">${cards}</div>`;
}

function renderBenchmarksTable(benchmarks) {
  const rows = benchmarks.ranks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(r => ({
      rank: r.rank,
      range: `${r.csPerMinMin}-${r.csPerMinMax}`
    }));
  const table = dataTable({
    columns: [
      { key: 'rank', label: 'Rank', numeric: false },
      { key: 'range', label: 'CS/min', numeric: true }
    ],
    rows
  });
  return `${table}<p class="slot-label">${escapeHtml(benchmarks.provenance)}</p>
  <p class="slot-label">${escapeHtml(benchmarks.junglerAdjustment.note)}</p>`;
}

// ---------------------------------------------------------------------------
// Document renderers -- one per shipped document
// ---------------------------------------------------------------------------

function renderGuide(guide, benchmarks, focuses, drills) {
  const ctx = { benchmarks, focuses, drills };
  const sectionsHtml = guide.sections.map(section => `
    <section class="guide-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.body.map(b => renderGuideBlock(b, ctx)).join('\n')}
    </section>`).join('\n');

  const body = `${cover({ title: 'Solo Queue Practice System', subtitle: 'A 30-day deliberate-practice program for League of Legends solo queue.' })}
  ${sectionsHtml}`;

  return documentShell({
    title: 'Solo Queue Practice System - Program Guide',
    description: 'A 30-day deliberate-practice program for League of Legends solo queue: one focus per game, measured, reviewed, and logged.',
    bodyHtml: body,
    docName: 'Program Guide',
    // program.html covers the same 30-day method as web content -- direct
    // web equivalent.
    canonical: absoluteUrl('program.html'),
    noindex: true
  });
}

function renderWarmupCardSection(w) {
  return `<section class="guide-section">
    <div class="card">
      <h3 class="card-title">${escapeHtml(w.title)}</h3>
      <p class="slot-label">${escapeHtml(w.role)}</p>
      <div class="card-slot">
        <span class="slot-label">Physical (${escapeHtml(w.blocks.physical.duration)})</span>
        <span class="slot-value">${escapeHtml(w.blocks.physical.description)}</span>
      </div>
      <div class="card-slot">
        <span class="slot-label">Mechanical Drill (${escapeHtml(w.blocks.mechanical.duration)})</span>
        <span class="slot-value">${escapeHtml(w.blocks.mechanical.description)}</span>
      </div>
      <div class="card-slot">
        <span class="slot-label">Mental Reset (${escapeHtml(w.blocks.mentalReset.duration)})</span>
        <span class="slot-value">${escapeHtml(w.blocks.mentalReset.description)}</span>
      </div>
      <div class="card-slot">
        <span class="slot-label">Start-Within Rule</span>
        <span class="slot-value">${escapeHtml(w.startWithinRule)}</span>
      </div>
      <div class="card-slot">
        <span class="slot-label">Same-Settings Rule</span>
        <span class="slot-value">${escapeHtml(w.sameSettingsRule)}</span>
      </div>
    </div>
  </section>`;
}

function renderWarmupCards(warmups) {
  const body = `${cover({ title: 'Warmup Cards', subtitle: 'Five 15-minute warmups: universal, solo lane, ADC, support, jungle.' })}
  ${warmups.map(renderWarmupCardSection).join('\n')}`;
  return documentShell({
    title: 'Solo Queue Practice System - Warmup Cards',
    description: 'Five one-page, print-ready 15-minute warmup routines for League of Legends, one per role.',
    bodyHtml: body,
    docName: 'Warmup Cards',
    cardDoc: true,
    // warmup.html covers the same five role warmups as web content --
    // direct web equivalent.
    canonical: absoluteUrl('warmup.html'),
    noindex: true
  });
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

function renderDrillLibrary(drills) {
  const cards = drills.map(d => card({ title: d.name, slots: drillToSlots(d) })).join('\n');
  const body = `${cover({ title: 'Drill Library', subtitle: 'Twelve drills, one per Focus Menu card, three cards to a printed page.' })}
  <div class="drill-grid">${cards}</div>`;
  return documentShell({
    title: 'Solo Queue Practice System - Drill Library',
    description: 'Twelve print-ready practice drills for League of Legends solo queue, each with a pass bar and a progression.',
    bodyHtml: body,
    docName: 'Drill Library',
    cardDoc: true,
    // drills.html covers the same twelve drills as web content -- direct
    // web equivalent.
    canonical: absoluteUrl('drills.html'),
    noindex: true
  });
}

function renderMatchupSheet() {
  const body = `${cover({ title: 'Matchup Study Sheet', subtitle: 'Fill this in yourself for a matchup you want to study - ships blank on purpose.' })}
  <div class="card">
    <h3 class="card-title">Matchup Study Sheet</h3>
    ${fillLine('My champion')}
    ${fillLine('Opponent champion')}
    ${fillLine('Power spikes by level (mine)')}
    ${fillLine('Power spikes by level (theirs)')}
    ${fillLine('Wave states to force')}
    ${fillLine('What beats me')}
    ${fillLine('What I beat')}
    ${fillLine('Rule 1 for this lane')}
    ${fillLine('Rule 2 for this lane')}
    ${fillLine('Rule 3 for this lane')}
  </div>`;
  return documentShell({
    title: 'Solo Queue Practice System - Matchup Study Sheet',
    description: 'A blank, fillable one-page template for studying a League of Legends lane matchup in your own words.',
    bodyHtml: body,
    docName: 'Matchup Study Sheet',
    cardDoc: true,
    // No single web page covers matchup study specifically -- downloads.html
    // is where this sheet is actually presented and linked from,
    // so it's the honest "web equivalent" to canonicalize to.
    canonical: absoluteUrl('downloads.html'),
    noindex: true
  });
}

function renderVodSheet() {
  const checkpoints = [
    ['Checkpoint 1: Lane Setup (0-3 min)', 'checkpoint-1'],
    ['Checkpoint 2: First Back', 'checkpoint-2'],
    ['Checkpoint 3: Mid-Game Grouping', 'checkpoint-3'],
    ['Checkpoint 4: The Fight That Decided It', 'checkpoint-4']
  ];
  const sections = checkpoints.map(([label]) => `
    <div class="card">
      <h3 class="card-title">${escapeHtml(label)}</h3>
      ${fillLine('Timestamp')}
      ${fillLine('Note 1')}
      ${fillLine('Note 2')}
      ${fillLine('Note 3')}
    </div>`).join('\n');
  const body = `${cover({ title: 'VOD Review Sheet', subtitle: 'The 4-checkpoint self-review protocol from the guide, as a fillable sheet.' })}
  ${sections}
  <div class="card">
    <h3 class="card-title">Change Next Game</h3>
    ${fillLine('One specific action')}
  </div>`;
  return documentShell({
    title: 'Solo Queue Practice System - VOD Review Sheet',
    description: 'A blank, fillable one-page template for the 4-checkpoint self-VOD-review protocol.',
    bodyHtml: body,
    docName: 'VOD Review Sheet',
    cardDoc: true,
    // vod-review.html covers this same checkpoint protocol
    // as web content -- direct web equivalent.
    canonical: absoluteUrl('vod-review.html'),
    noindex: true
  });
}

// task-mt83rhrh-759f27 item 8's real lead magnet: a genuinely new,
// on-brand fillable sheet (matching the Matchup Study Sheet/VOD Review
// Sheet pair above exactly, not a different format), one 10-game block's
// worth of tracking for whichever focus a player is currently holding.
// Deliberately NOT wired behind any client-side "gate" -- every other
// download on this site is explicitly, repeatedly promised free with no
// email/account/payment (downloads.html, tracker.html, the home page all
// say this in as many words), and a client-side gate on a static file is
// both trivially bypassable and would directly contradict that standing,
// sitewide promise. Real fix per the task's own actual goal (replace a
// vague "get updates" ask with a concrete one): src/web/shell.js's
// renderNewsletterSignup() now names this real, specific asset as the
// subscribe incentive instead of a generic "get updates" line, while the
// file itself stays a real, ungated download like every other one.
function renderFocusCard() {
  const gameRows = Array.from({ length: 10 }, (_, i) => `Game ${i + 1}: held the focus? logged it?`);
  const gameSections = gameRows.map(checklistRow).join('\n');
  const body = `${cover({ title: 'Focus Card', subtitle: 'One page per 10-game block - track the one focus you picked, game by game.' })}
  <div class="card">
    <h3 class="card-title">This Block's Focus</h3>
    ${fillLine('My focus (from the Focus Menu)')}
    ${fillLine("The number I'm tracking")}
    ${fillLine('My baseline before this block')}
    ${fillLine('Graduation bar - what "done" looks like')}
  </div>
  <div class="card">
    <h3 class="card-title">Game By Game</h3>
    ${gameSections}
  </div>
  <div class="card">
    <h3 class="card-title">Block Review</h3>
    ${fillLine('Did I graduate?')}
    ${fillLine('If not, what specifically is still missing?')}
    ${fillLine('Next block: same focus again, or a new one?')}
  </div>`;
  return documentShell({
    title: 'Solo Queue Practice System - Focus Card',
    description: 'A blank, fillable one-page template for tracking one focus across a 10-game practice block.',
    bodyHtml: body,
    docName: 'Focus Card',
    cardDoc: true,
    // focus-menu.html covers the same 12-focus/graduation-bar system as
    // web content -- direct web equivalent, same convention as the other
    // two fillable sheets above.
    canonical: absoluteUrl('focus-menu.html'),
    noindex: true
  });
}

function readmeLink(href, label) {
  return `<a href="./${href}">${escapeHtml(label)}</a>`;
}

function renderReadme() {
  // Order matches the numbered filenames written by src/build.js -- this list IS the
  // buyer-facing usage order, not just a description of it.
  const items = [
    { href: '01-quick-start.html', label: 'Quick Start', text: 'the one-page version. Start here if you want to begin before reading the full guide.' },
    { href: '02-program-guide.html', label: 'Program Guide', text: 'read this next. Sections A1-A11 explain the whole method.' },
    { href: '03-warmup-cards.html', label: 'Warmup Cards', text: 'print the one matching your role, use before every ranked session.' },
    { href: '04-drill-library.html', label: 'Drill Library', text: 'print, three cards to a page. Work the drill matching your current focus.' },
    { href: '05-tracker-workbook.xlsx', label: 'Tracker Workbook', text: 'log every game here (opens in Excel, LibreOffice Calc, or Google Sheets via File > Import).' },
    { href: '06-matchup-study-sheet.html', label: 'Matchup Study Sheet', text: 'print blank copies as needed, one per matchup you study.' },
    { href: '07-vod-review-sheet.html', label: 'VOD Review Sheet', text: 'print blank copies as needed, one per full review.' },
    { href: '08-focus-card.html', label: 'Focus Card', text: 'print one per 10-game block - the same focus, number, and graduation bar from the Focus Menu, plus a game-by-game tracker.' }
  ];
  const body = `${cover({ title: 'README', subtitle: 'What is in this package, and the order to use it in.' })}
  <ol>${items.map(i => `<li>${readmeLink(i.href, i.label)} - ${escapeHtml(i.text)}</li>`).join('')}</ol>
  <p>All HTML documents open directly in a browser - double-click the file, no install and no account required. Print via your browser's normal Print dialog (Ctrl+P); every document is designed to print cleanly on A4 or US Letter. A PDF copy of each HTML document ships alongside it (same filename, <code>.pdf</code> instead of <code>.html</code>) when this package was built on a machine with a browser available to generate one - if you don't see a matching <code>.pdf</code> file, just open the <code>.html</code> version instead; nothing is missing or broken.</p>
  <p>The tracker workbook (<code>05-tracker-workbook.xlsx</code>) is a real spreadsheet file, not a webpage - open it in Excel, LibreOffice Calc, or Google Sheets.</p>`;
  return documentShell({
    title: 'Solo Queue Practice System - README',
    description: 'What is included in the Solo Queue Practice System and the order to use each piece in.',
    bodyHtml: body,
    docName: 'README',
    // No single web page covers the pack's own contents/usage order --
    // downloads.html is where this pack is actually presented and linked
    // from, same rationale as the Matchup Study Sheet below.
    canonical: absoluteUrl('downloads.html'),
    noindex: true
  });
}

function renderQuickStart() {
  const body = `${cover({ title: 'Quick Start', subtitle: 'The one-page version. Read the full Program Guide when you have 15 minutes.' })}
  ${checklistRow('Read your last 10 games from your own match history and log them on the Baseline sheet (Program Guide, Section A2).')}
  ${checklistRow('Compare your CS/min against the Benchmarks table and pick your single weakest measurable thing (Section A3).')}
  ${checklistRow('Find that thing\'s card in the Drill Library and read its pass bar.')}
  ${checklistRow('Before your next ranked session, run the Warmup Card for your role.')}
  ${checklistRow('Play 2-3 games holding that one focus. Log every game in the Tracker Workbook.')}
  ${checklistRow('After each game, write a one-sentence lesson before queueing again (Section A8).')}
  ${checklistRow('Stop the session after 2 losses in a row (Section A9) - no exceptions.')}
  ${checklistRow('After 10 games, review: did the number move? Graduate or repeat (Section A10).')}
  ${callout('This is the short version. The full Program Guide explains why each step exists and what to do when something does not go as expected.')}`;
  return documentShell({
    title: 'Solo Queue Practice System - Quick Start',
    description: 'The one-page quick-start checklist for the Solo Queue Practice System.',
    bodyHtml: body,
    docName: 'Quick Start',
    cardDoc: true,
    // A condensed extract of the same program.html method (cites Program
    // Guide sections directly) -- program.html is the honest web
    // equivalent, same target as the Program Guide print doc itself.
    canonical: absoluteUrl('program.html'),
    noindex: true
  });
}

module.exports = {
  VERSION,
  LAST_REVIEWED,
  DISCLAIMER,
  renderGuide,
  renderWarmupCards,
  renderDrillLibrary,
  renderMatchupSheet,
  renderVodSheet,
  renderFocusCard,
  renderReadme,
  renderQuickStart,
  // Exported so the web build (src/web/contentPages.js)
  // can reuse the same guide-body renderers the print pack uses -- one
  // implementation of "how a guide block/benchmarks table/focus card looks",
  // shared by both outputs.
  renderGuideBlock,
  renderBenchmarksTable,
  renderFocusCards
};
