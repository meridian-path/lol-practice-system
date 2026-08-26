'use strict';

// Home, tracker, downloads, about, and privacy. Home
// replaces the site's original minimal stub;
// the other four are new pages. All five are exported and wired into
// src/web/buildSite.js's WEB_PAGES array, not built standalone.

const fs = require('fs');
const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml } = require('../render/html.js');
const { lastModifiedFor } = require('./pageLastModified.js');
const { articleJsonLd, websiteJsonLd } = require('./structuredData.js');

// Stat-rail source counts: read at build time from the same content
// files the guide/drill/warmup pages already render from, rather than
// typed in, so the hero's "12 focuses / 12 drills / 5 warmups" numbers can
// never drift from the actual content. The 30-day program length and the
// single tracker workbook file are structural constants of the program
// itself (not list lengths anywhere in content/), stated directly below.
const focuses = require(path.join('..', '..', 'content', 'focuses.json'));
const drills = require(path.join('..', '..', 'content', 'drills.json'));
const warmups = require(path.join('..', '..', 'content', 'warmups.json'));
const benchmarks = require(path.join('..', '..', 'content', 'benchmarks.json'));
const deathCauses = require(path.join('..', '..', 'content', 'deathCauses.json'));

// The web tracker's own client-side logic -- read once at require time and
// inlined verbatim into tracker.html's own
// <script> tag, same pattern src/web/shell.js's SITE_CSS already uses for
// tokens.css/screen.css. See that file's own header for why it's written to
// run unmodified in both this Node require() context (its own unit tests)
// and a real browser with no bundler.
const TRACKER_CLIENT_JS = fs.readFileSync(path.join(__dirname, 'trackerClient.js'), 'utf8');

// Fixed 5-role list, shared between the tracker's two static forms below --
// matches climbing-{role}.html's own role set exactly (Top/Jungle/Mid/ADC/
// Support), not content/warmups.json's own looser role labels (which
// include combined/any-role entries not meaningful as a single dropdown
// choice here).
const TRACKER_ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

// The Start Here routing quiz's own client-side logic (rescoped to an
// enhancement on the existing Start Here/Three-steps sections rather than a
// from-scratch onboarding build) -- read once at
// require time and inlined verbatim, same pattern as TRACKER_CLIENT_JS
// above and src/web/shell.js's own SITE_CSS.
const QUIZ_CLIENT_JS = fs.readFileSync(path.join(__dirname, 'quizClient.js'), 'utf8');

const { RIOT_DISCLAIMER, TRADEMARK_NOTICE } = site;

// Real public contact address for this project.
const CONTACT_EMAIL = 'ops@meridianpath.media';

const PRINT_DIR = path.join(__dirname, '..', '..', 'dist', 'print');

// Friendly labels for the print pack's numbered filenames, matching the
// names src/render/pages.js's renderReadme() already uses -- keeps the two
// "what's in the pack" listings (the README document, downloads.html)
// reading the same way without literally sharing code across the print/web
// split. A file whose prefix isn't in this map (e.g. a sheet added later)
// still renders correctly, with a label derived from its filename -- nothing
// here can produce a missing/dead entry for an unrecognized file.
const DOC_LABELS = {
  '00-readme': 'README',
  '01-quick-start': 'Quick Start',
  '02-program-guide': 'Program Guide',
  '03-warmup-cards': 'Warmup Cards',
  '04-drill-library': 'Drill Library',
  '05-tracker-workbook': 'Tracker Workbook',
  '06-matchup-study-sheet': 'Matchup Study Sheet',
  '07-vod-review-sheet': 'VOD Review Sheet',
  '08-focus-card': 'Focus Card'
};

const TYPE_LABELS = {
  '.html': 'HTML',
  '.pdf': 'PDF',
  '.xlsx': 'Excel Workbook'
};

function prettyLabel(base) {
  if (DOC_LABELS[base]) return DOC_LABELS[base];
  return base
    .replace(/^\d+-/, '')
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatSize(bytes) {
  const kb = bytes / 1024;
  if (kb < 10) return `${kb.toFixed(1)} KB`;
  return `${Math.round(kb)} KB`;
}

/**
 * @returns {{file, base, ext, label, typeLabel, sizeLabel}[]} every file
 *   currently sitting in dist/print/ except print.css (a stylesheet, not a
 *   download), sorted by filename. Reads the directory fresh on every call
 *   -- there is no hardcoded file list anywhere in this module, since
 *   dist/print/'s exact contents depend on the drill/warmup/print sheets
 *   as well as the original print pack. An
 *   empty array (dist/print/ not built yet, e.g. `npm run build:site` run
 *   standalone) is a valid, non-crashing result -- callers render an
 *   honest "check back shortly" message instead of a broken page.
 */
function readPrintFiles() {
  if (!fs.existsSync(PRINT_DIR)) return [];
  return fs.readdirSync(PRINT_DIR)
    .filter(f => f !== 'print.css')
    .sort()
    .map(file => {
      const ext = path.extname(file);
      const base = file.slice(0, -ext.length);
      const sizeBytes = fs.statSync(path.join(PRINT_DIR, file)).size;
      return {
        file,
        base,
        ext,
        label: prettyLabel(base),
        typeLabel: TYPE_LABELS[ext] || ext.replace('.', '').toUpperCase(),
        sizeLabel: formatSize(sizeBytes)
      };
    });
}

/** Groups readPrintFiles()' flat list by document (numeric-prefix base), so
 *  e.g. 02-program-guide.html and 02-program-guide.pdf render as one row
 *  with two format links instead of two separate rows. */
function groupPrintFiles(files) {
  const order = [];
  const byBase = new Map();
  for (const f of files) {
    if (!byBase.has(f.base)) {
      byBase.set(f.base, { base: f.base, label: f.label, files: [] });
      order.push(f.base);
    }
    byBase.get(f.base).files.push(f);
  }
  return order.map(b => byBase.get(b));
}

function printHref(file) {
  return site.url(`print/${file}`);
}

function groupRow(group) {
  const links = group.files
    .map(f => `<a href="${escapeHtml(printHref(f.file))}">${escapeHtml(f.typeLabel)} (${escapeHtml(f.sizeLabel)})</a>`)
    .join(' &middot; ');
  return `<div class="download-row">
      <strong>${escapeHtml(group.label)}</strong>
      <span class="download-meta">${links}</span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

// The 11 section links, ranked: the first 3 are the
// actual entry path ("Start here", rendered as feature cards); the
// remaining 8 are everything else in the program (rendered as the compact
// tile index). Order matches the original 11-card list exactly -- nothing
// was reprioritized beyond the 3/8 split itself.
const SECTION_LINKS = [
  ['program.html', 'Program', 'The 30-day plan: one focus per game, in order.'],
  ['baseline.html', 'Day 0 Baseline', 'Where your CS/min and deaths actually sit for your rank, before you change anything.'],
  ['focus-menu.html', 'Focus Menu', 'Twelve named things to work on, one at a time, each with a number that proves you did it.'],
  ['drills.html', 'Drill Library', 'Twelve practice-tool drills, one per focus, each with a pass bar.'],
  ['warmup.html', 'Warmup Routines', 'Five 15-minute warmups, one per role, to run before every ranked game.'],
  ['champion-pool.html', 'Champion Pool', 'How many champions to play, and how to pick them, while you are practicing.'],
  ['vod-review.html', 'VOD Review', 'Review your own replays in twelve minutes with a four-checkpoint routine.'],
  ['tilt-rules.html', 'Tilt & Stop Rules', 'When to log off, decided in advance instead of in the moment.'],
  ['tracker.html', 'Tracker Spreadsheet', 'The free workbook that logs every game and averages your numbers for you.'],
  ['downloads.html', 'Downloads', 'The entire program as printable HTML and PDF, plus the tracker file.'],
  ['faq.html', 'FAQ', 'What this program is, what it is not, and the questions that come up most.']
];

function renderFeatureCards(items) {
  return items.map(([file, title, text], i) => `<a class="feature-card" href="${escapeHtml(site.url(file))}">
        <span class="step-index t-label">${String(i + 1).padStart(2, '0')}</span>
        <h3>${escapeHtml(title)}</h3>
        <p class="t-compact">${escapeHtml(text)}</p>
      </a>`).join('\n      ');
}

// Start Here routing quiz (rescoped from a from-scratch onboarding build to
// an enhancement on the existing flow): three
// questions, answered inline on the homepage, that reveal direct links to
// the matching focus card/drill/warmup once all three are chosen. The
// heavy lifting (resolving a focus id to its real drill/warmup hrefs) is
// src/web/quizClient.js's own buildRoutingLinks(), unit-tested directly
// against content/focuses.json/content/warmups.json in
// test/quizClient.test.js -- this function only renders the static
// question markup and the (initially hidden) results shell that script
// fills in.
function renderStartHereQuiz() {
  const roleOptions = '<option value="">Select</option>' +
    ['Top', 'Jungle', 'Mid', 'ADC', 'Support'].map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
  const rankOptions = '<option value="">Select</option>' +
    benchmarks.ranks.map(r => `<option value="${escapeHtml(r.rank)}">${escapeHtml(r.rank)}</option>`).join('');
  const focusOptions = '<option value="">Select</option>' +
    focuses.map(f => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.title)}</option>`).join('');

  return `<section class="zone-content quiz-app" data-quiz-app data-base-url="${escapeHtml(site.url(''))}">
      <h2>Or answer 3 questions and skip ahead</h2>
      <p class="t-compact">Rather not read the steps above and self-navigate? Answer these and get routed straight to your specific focus card, drill, and warmup.</p>
      <div class="quiz-form">
        <label>Your role <select data-quiz-role>${roleOptions}</select></label>
        <label>Your rank <select data-quiz-rank>${rankOptions}</select></label>
        <label>Biggest thing holding you back <select data-quiz-focus>${focusOptions}</select></label>
      </div>
      <p class="callout" data-quiz-prompt>Answer all three above to get routed straight to what to do next.</p>
      <div class="feature-grid" data-quiz-results hidden>
        <a class="quiz-result-card" data-quiz-focus-link href="${escapeHtml(site.url('focus-menu.html'))}">
          <span class="step-index t-label">01</span>
          <h3>Your focus card</h3>
          <p class="t-compact">The exact focus on the menu that matches what you picked, with its own graduation bar.</p>
        </a>
        <a class="quiz-result-card" data-quiz-drill-link href="${escapeHtml(site.url('drills.html'))}">
          <span class="step-index t-label">02</span>
          <h3>Its drill</h3>
          <p class="t-compact">The one practice-tool drill built to train that exact focus.</p>
        </a>
        <a class="quiz-result-card" data-quiz-warmup-link href="${escapeHtml(site.url('warmup.html'))}" hidden>
          <span class="step-index t-label">03</span>
          <h3>Your role's warmup</h3>
          <p class="t-compact">A 15-minute routine for your role, to run before every ranked game.</p>
        </a>
      </div>
      <script id="quiz-focuses-data" type="application/json">${JSON.stringify(focuses)}</script>
      <script>${QUIZ_CLIENT_JS}</script>
    </section>`;
}

function renderTileIndex(items) {
  const tiles = items.map(([file, title, text]) => `<li><a class="tile" href="${escapeHtml(site.url(file))}">
          <span class="tile-title t-compact">${escapeHtml(title)}</span>
          <p>${escapeHtml(text)}</p>
        </a></li>`).join('\n      ');
  return `<ul class="tile-index">
      ${tiles}
      </ul>`;
}

function renderHome() {
  const featureCards = SECTION_LINKS.slice(0, 3);
  const tileLinks = SECTION_LINKS.slice(3);

  const workbook = readPrintFiles().find(f => f.base === '05-tracker-workbook');
  const workbookHref = workbook ? printHref(workbook.file) : site.url('tracker.html');

  // Stat rail figures: 12/12/5 are derived from content/ at build time
  // (see the requires at the top of this file); 30 (program length) and 1
  // (tracker file count) are structural constants of the program, not list
  // lengths, and are stated directly here rather than regex-scraped out of
  // content/guide.js's prose.
  const stats = [
    [30, 'days'],
    [focuses.length, 'focuses'],
    [drills.length, 'drills'],
    [warmups.length, 'warmups'],
    [1, 'tracker file']
  ];
  const statRows = stats.map(([value, label]) => `<div class="stat-rail-row">
          <span class="stat-rail-value t-section">${escapeHtml(String(value))}</span>
          <span class="stat-rail-label t-compact">${escapeHtml(label)}</span>
        </div>`).join('\n        ');

  const body = `<section class="hero zone-measure">
      <span class="hero-eyebrow t-label">Free &middot; No account</span>
      <h1 class="t-display">${escapeHtml(site.SITE_NAME)}</h1>
      <p class="lead">${escapeHtml(site.SITE_TAGLINE)}</p>
      <a class="btn-primary" href="${escapeHtml(site.url('program.html'))}">Start the 30-day program</a>
    </section>
    <aside class="stat-rail zone-rail" aria-label="Program at a glance">
      <div class="stat-rail-figures">
        ${statRows}
      </div>
      <p class="stat-rail-foot t-metadata"><a href="${escapeHtml(workbookHref)}">Download the tracker workbook (.xlsx)</a></p>
    </aside>
    <section class="zone-content">
      <h2>Three steps to start</h2>
      <ol class="steps-strip">
        <li><span class="step-index t-label">01</span><p class="t-compact">Log your last ten ranked games and compare your numbers against the benchmarks on the baseline page.</p></li>
        <li><span class="step-index t-label">02</span><p class="t-compact">Pick the single weakest measurable thing from the focus menu and run its drill before your next session.</p></li>
        <li><span class="step-index t-label">03</span><p class="t-compact">Play with that one focus held for two or three games, log every game, and review after.</p></li>
      </ol>
    </section>
    ${renderStartHereQuiz()}
    <section class="zone-content">
      <h2>Start here</h2>
      <div class="feature-grid">
      ${renderFeatureCards(featureCards)}
      </div>
    </section>
    <section class="zone-content">
      <h2>Everything else in the program</h2>
      ${renderTileIndex(tileLinks)}
    </section>
    <section class="zone-content">
      <h2>Free printable pack</h2>
      <p class="zone-measure">Every page here also exists as a clean, printable document - the full guide, the drill library, warmup cards, and two blank study sheets, plus the tracker as a real spreadsheet file. No email, no account, no payment.</p>
      <div class="download-row">
        <a href="${escapeHtml(workbookHref)}">Tracker Workbook - spreadsheet</a>
        <span class="download-meta">.xlsx</span>
      </div>
      <div class="download-row">
        <a href="${escapeHtml(site.url('downloads.html'))}">Full printable pack - every guide, drill, and sheet</a>
        <span class="download-meta">HTML + PDF</span>
      </div>
    </section>`;

  const description = 'A free, ad-supported 30-day deliberate-practice program for League of Legends solo queue, with drills, warmups, and a printable tracker.';
  return shell.documentShell({
    title: site.pageTitle('Solo Queue Practice System'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl(''),
    active: 'home',
    jsonLd: websiteJsonLd({
      url: site.absoluteUrl(''),
      description
    })
  });
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

function roleOptionsHtml() {
  return '<option value="">Select</option>' + TRACKER_ROLES.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
}

function resultOptionsHtml() {
  return '<option value="">Select</option><option value="W">Win</option><option value="L">Loss</option>';
}

function renderTracker() {
  const workbook = readPrintFiles().find(f => f.base === '05-tracker-workbook');
  const workbookHref = workbook ? printHref(workbook.file) : site.url('downloads.html');
  const workbookMeta = workbook
    ? `<p class="download-meta">${escapeHtml(workbook.typeLabel)} &middot; ${escapeHtml(workbook.sizeLabel)}</p>`
    : '';

  const rankOptionsHtml = '<option value="">Select your rank</option>' +
    benchmarks.ranks.map(r => `<option value="${escapeHtml(r.rank)}">${escapeHtml(r.rank)}</option>`).join('');

  const deathCauseOptionsHtml = '<option value="">Select</option>' +
    deathCauses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  const focusDatalistHtml = focuses.map(f => `<option value="${escapeHtml(f.title)}">`).join('');

  const trackerAppHtml = `<div class="tracker-app" data-tracker-app>
    <h2>Your Rank</h2>
    <p class="lead">This drives the benchmark comparison below - it never leaves your browser.</p>
    <label>Rank <select data-rank-select>${rankOptionsHtml}</select></label>
    <label><input type="checkbox" data-jungler-checkbox> I mainly play jungle (adjusts the benchmark by -1 CS/min, same as the workbook)</label>

    <h2>Baseline: Your Last 10 Games</h2>
    <p>Enter your last ten ranked games once, before you start the program - the same one-time baseline the workbook's Baseline sheet asks for.</p>
    <form class="tracker-form" data-baseline-form>
      <label>Date <input type="date" name="date" required></label>
      <label>Champion <input type="text" name="champion" maxlength="40" required></label>
      <label>Role <select name="role" required>${roleOptionsHtml()}</select></label>
      <label>Result <select name="result" required>${resultOptionsHtml()}</select></label>
      <label>CS@10 <input type="number" name="cs10" min="0" max="200" required></label>
      <label>Minutes <input type="number" name="minutes" min="1" max="90" required></label>
      <label>Deaths <input type="number" name="deaths" min="0" max="30"></label>
      <label>Vision Score <input type="number" name="visionScore" min="0" max="200"></label>
      <button type="submit" class="tracker-submit-btn">Add baseline game</button>
    </form>
    <p class="callout" data-baseline-full-note hidden>Baseline is full at 10 games - delete a row below to log a different one.</p>
    <div data-baseline-table-slot></div>
    <div data-baseline-stats-slot></div>

    <h2>Game Log</h2>
    <p>One row per game after your baseline. Every stat below updates automatically as you log games - the same rolling-average formulas the workbook's Game Log sheet computes.</p>
    <form class="tracker-form" data-gamelog-form>
      <label>Date <input type="date" name="date" required></label>
      <label>Champion <input type="text" name="champion" maxlength="40" required></label>
      <label>Role <select name="role" required>${roleOptionsHtml()}</select></label>
      <label>Result <select name="result" required>${resultOptionsHtml()}</select></label>
      <label>Focus <input type="text" name="focus" list="tracker-focus-list" maxlength="60" placeholder="e.g. Farming Consistency"></label>
      <datalist id="tracker-focus-list">${focusDatalistHtml}</datalist>
      <label>Adherence (1-5) <select name="adherence"><option value="">Select</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label>
      <label>CS@10 <input type="number" name="cs10" min="0" max="200" required></label>
      <label>Minutes <input type="number" name="minutes" min="1" max="90" required></label>
      <label>Deaths <input type="number" name="deaths" min="0" max="30"></label>
      <label>Primary Death Cause <select name="deathCause">${deathCauseOptionsHtml}</select></label>
      <label>Vision Score <input type="number" name="visionScore" min="0" max="200"></label>
      <label>One-Sentence Lesson <input type="text" name="lesson" maxlength="200" placeholder="What will you change next game?"></label>
      <button type="submit" class="tracker-submit-btn">Log this game</button>
    </form>
    <div data-gamelog-stats-slot></div>
    <div data-gamelog-table-slot></div>

    <h2>Progress</h2>
    <p>One box per game across the 30-day program's three ten-game blocks - filled as you log games above, same data as the Game Log, nothing separate to keep in sync.</p>
    <div data-progress-slot></div>

    <button type="button" class="tracker-clear-btn" data-clear-tracker>Clear all tracker data in this browser</button>
    <p class="tracker-note">Everything above lives only in this browser's local storage - nothing is sent anywhere, and nothing here creates an account. Clearing your browser data, or using a different device or browser, starts you over.</p>
  </div>
  <script id="tracker-benchmarks-data" type="application/json">${JSON.stringify(benchmarks)}</script>
  <script>${TRACKER_CLIENT_JS}</script>`;

  const body = `<div class="zone-measure">
    <h1>The Tracker</h1>
    <p class="lead">Log your games right here, on any device - the running averages update automatically, and nothing you enter leaves your browser. Prefer a spreadsheet, or want it on a second device without retyping ten games? Download the same tracker as an .xlsx below.</p>
    ${trackerAppHtml}
    <h2>Prefer a Spreadsheet? Download the Workbook</h2>
    <p>The original tracker, as a real spreadsheet file - the same Baseline and Game Log structure as above, plus a Block Review sheet, a Champion Pool sheet, and the Benchmarks reference table, all in one file you can open in Excel, LibreOffice Calc, or Google Sheets.</p>
    <a class="btn-primary" href="${escapeHtml(workbookHref)}">Download the tracker workbook (.xlsx)</a>
    ${workbookMeta}
    <p>Want the rest of the program on paper too? The <a href="${escapeHtml(site.url('downloads.html'))}">full printable pack</a> has the guide, the drills, and two blank study sheets alongside this workbook.</p>
  </div>`;

  const description = 'A free web-based tracker for League of Legends solo queue games: log games from any device, automatic rolling averages, no account required.';
  return shell.documentShell({
    title: site.pageTitle('Free LoL Practice Tracker'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('tracker.html'),
    active: 'tracker',
    jsonLd: articleJsonLd({
      headline: 'The Tracker',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('tracker.html')
    })
  });
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

function renderDownloads() {
  const files = readPrintFiles();
  const groups = groupPrintFiles(files);
  const workbookGroup = groups.find(g => g.base === '05-tracker-workbook');
  const readme = files.find(f => f.base === '00-readme' && f.ext === '.html');
  const restGroups = groups.filter(g => g.base !== '05-tracker-workbook');

  const rows = restGroups.map(groupRow).join('\n    ');

  const workbookBlock = workbookGroup
    ? `<a class="btn-primary" href="${escapeHtml(printHref(workbookGroup.files[0].file))}">Download the tracker workbook (.xlsx)</a>
    <p class="download-meta">${escapeHtml(workbookGroup.files[0].typeLabel)} &middot; ${escapeHtml(workbookGroup.files[0].sizeLabel)}</p>`
    : '';

  const readmeLine = readme
    ? `<p>New here? The <a href="${escapeHtml(printHref(readme.file))}">README</a> lists everything below in the order it is meant to be used.</p>`
    : '';

  const body = `<div class="zone-measure">
    <h1>Free downloads</h1>
    <p class="lead">Every document from the program as a file you can save, print, or open offline - the guide, the drill library, warmup cards, two blank study sheets, and the tracker spreadsheet. No email, no account, no payment, for any of it.</p>
    ${workbookBlock}
    <h2>The rest of the pack</h2>
    <p>Each document ships as clean HTML you can open straight in a browser, and, where a browser was available at build time, a matching PDF for printing.</p>
    ${rows || '<p>The download pack is being rebuilt right now - check back shortly.</p>'}
    ${readmeLine}
  </div>`;

  const description = 'Download the full Solo Queue Practice System pack free: program guide, drill library, warmup cards, two study sheets, and the tracker spreadsheet.';
  return shell.documentShell({
    title: site.pageTitle('Free Printable LoL Practice Pack'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('downloads.html'),
    active: 'downloads',
    jsonLd: articleJsonLd({
      headline: 'Free Printable LoL Practice Pack',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('downloads.html')
    })
  });
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

function renderAbout() {
  const body = `<div class="zone-measure">
    <h1>About</h1>
    <p class="lead">${escapeHtml(site.SITE_NAME)} is a free, one-person project: a 30-day deliberate-practice program for League of Legends solo queue, built the same way most practiced skills improve - pick one measurable thing, drill it, review it, then move to the next.</p>
    <h2>Why it is free</h2>
    <p>Riot Games' fan-content rules let an individual player run a project like this on passive ad revenue, but not sell anything, take donations or sponsorships, or run it as a company. So this site does neither of those things - the program, the tracker spreadsheet, and the printable pack are all free, with nothing to fill in and no account to create. The only revenue this site earns comes from the ad space on its content pages.</p>
    <h2>Who made it</h2>
    <p>This is an independent, individual project, not a studio, agency, or company.</p>
    <p>Contact: <a href="mailto:${escapeHtml(CONTACT_EMAIL)}">${escapeHtml(CONTACT_EMAIL)}</a></p>
    <h2>Legal</h2>
    <p>${escapeHtml(RIOT_DISCLAIMER)}</p>
    <p>${escapeHtml(TRADEMARK_NOTICE)}</p>
    <a class="btn-primary" href="${escapeHtml(site.url('program.html'))}">Read the program guide</a>
  </div>`;

  const description = `Who built ${site.SITE_NAME}, why it is free, and the Riot Games fan-content disclaimer that governs this project.`;
  return shell.documentShell({
    title: site.pageTitle('About'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('about.html'),
    active: null,
    jsonLd: articleJsonLd({
      headline: 'About',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('about.html')
    })
  });
}

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

function renderPrivacy() {
  const body = `<div class="zone-measure">
    <h1>Privacy</h1>
    <p class="lead">This page explains what happens to your data on ${escapeHtml(site.SITE_NAME)}. Short version: there are no accounts, no forms, and no sign-ups anywhere on this site - what gets collected comes from your browser and from the two third-party services described below, not from anything you type in.</p>
    <h2>Analytics</h2>
    <p>This site may use GoatCounter, a privacy-focused analytics tool, to count page views. GoatCounter does not use cookies and does not build a profile of individual visitors - it reports aggregate numbers only, such as how many people viewed a page and roughly where the traffic came from, never anything tied back to you personally.</p>
    <h2>Advertising</h2>
    <p>This site may show ads served by Google AdSense. Google and its advertising partners can set cookies or use similar technology in your browser to serve ads based on your visits to this and other sites, and to measure how those ads perform. This site does not control what those cookies do - that is between you and Google.</p>
    <p>You can review and adjust what Google uses for ad personalization at <a href="https://adssettings.google.com/">Google Ads Settings</a>, and opt out of personalized advertising more broadly at the Digital Advertising Alliance's <a href="https://optout.aboutads.info/">consumer opt-out page</a>. Most browsers also let you block third-party cookies entirely from their own privacy settings.</p>
    <h2>What this site does not do</h2>
    <ul>
      <li>No account creation, no login, no password, anywhere on the site.</li>
      <li>No email collection - every download here is free with nothing to fill in.</li>
      <li>No sale of any data to anyone, because none is collected here to sell.</li>
    </ul>
    <h2>Changes</h2>
    <p>If this policy changes, the change will be posted on this page with an updated date. Last updated ${escapeHtml(lastModifiedFor('privacy.html'))}.</p>
    <a class="btn-primary" href="${escapeHtml(site.url())}">Back to the program</a>
  </div>`;

  const description = `What ${site.SITE_NAME} collects (nothing directly), and how its analytics and advertising partners use cookies.`;
  return shell.documentShell({
    title: site.pageTitle('Privacy'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('privacy.html'),
    active: null,
    jsonLd: articleJsonLd({
      headline: 'Privacy',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('privacy.html')
    })
  });
}

module.exports = {
  renderHome,
  renderTracker,
  renderDownloads,
  renderAbout,
  renderPrivacy,
  readPrintFiles,
  groupPrintFiles,
  PRINT_DIR
};
