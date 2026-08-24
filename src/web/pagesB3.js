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
  '07-vod-review-sheet': 'VOD Review Sheet'
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

function renderTracker() {
  const workbook = readPrintFiles().find(f => f.base === '05-tracker-workbook');
  const workbookHref = workbook ? printHref(workbook.file) : site.url('downloads.html');
  const workbookMeta = workbook
    ? `<p class="download-meta">${escapeHtml(workbook.typeLabel)} &middot; ${escapeHtml(workbook.sizeLabel)}</p>`
    : '';

  const body = `<div class="zone-measure">
    <h1>The Tracker Workbook</h1>
    <p class="lead">One spreadsheet, one row per game. It is the only tool in this program that does math for you on purpose - everything else here is a habit you build by hand.</p>
    <a class="btn-primary" href="${escapeHtml(workbookHref)}">Download the tracker workbook (.xlsx)</a>
    ${workbookMeta}
    <h2>What is inside</h2>
    <ul>
      <li><strong>Baseline sheet.</strong> Enter your last ten games once, before you start. The sheet computes your ten-game averages for you, so you cannot accidentally round in your own favor.</li>
      <li><strong>Game log.</strong> One row per game after that: CS at the ten-minute mark, final CS/min, deaths, vision score, result, and which focus you were holding that game.</li>
      <li><strong>Running averages.</strong> Every formula is already built in - you read numbers, you never calculate them.</li>
    </ul>
    <h2>How to use it</h2>
    <ol>
      <li>Fill in your Day 0 baseline from your last ten games - see the <a href="${escapeHtml(site.url('baseline.html'))}">baseline page</a> for how to read the result.</li>
      <li>Pick one focus from the <a href="${escapeHtml(site.url('focus-menu.html'))}">focus menu</a> and log every game while you hold it, including the ones you lose badly.</li>
      <li>At the end of each ten-game block, read the averages and decide whether to graduate to a new focus or repeat.</li>
    </ol>
    <p>It opens in Excel, LibreOffice Calc, or Google Sheets (File &gt; Import). No macros, no add-ins, no account, and nothing you enter leaves your computer - it is a local file, not a connected app.</p>
    <p>Want the rest of the program on paper too? The <a href="${escapeHtml(site.url('downloads.html'))}">full printable pack</a> has the guide, the drills, and two blank study sheets alongside this workbook.</p>
  </div>`;

  const description = 'A free spreadsheet for logging League of Legends solo queue games: a baseline sheet, a per-game log, and automatic ten-game averages.';
  return shell.documentShell({
    title: site.pageTitle('Free LoL Practice Tracker Spreadsheet'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('tracker.html'),
    active: 'tracker',
    jsonLd: articleJsonLd({
      headline: 'Free LoL Practice Tracker Spreadsheet',
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
