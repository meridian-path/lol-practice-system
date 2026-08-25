'use strict';

const fs = require('fs');
const path = require('path');

const benchmarks = require('../content/benchmarks.json');
const drills = require('../content/drills.json');
const focuses = require('../content/focuses.json');
const warmups = require('../content/warmups.json');
const guide = require('../content/guide.js');

const pages = require('./render/pages.js');
const { buildTrackerWorkbook } = require('./xlsx/workbook.js');

// The print pack now lives under dist/print/, sharing
// dist/ with the site build (src/web/buildSite.js writes flat .html into
// dist/ itself). cleanDir() below only ever clears this dist/print/
// subdirectory, never the parent dist/ -- so a site build's output already
// on disk survives a print-only rebuild, and vice versa.
const DIST = path.join(__dirname, '..', 'dist', 'print');

// Clears dist/ before every build so a rename (like the one that introduced the
// numbered filenames below) can't leave stale files with old names sitting next to
// the new ones -- "npm run build from clean" must mean dist/ only ever contains
// exactly what the current build produces, nothing left over from a prior run.
// Scoped to this one fixed, project-relative path (never a wildcard), and dist/ is
// pure generated output -- it never holds anything secret-like to lose.
function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(name, content) {
  fs.writeFileSync(path.join(DIST, name), content, 'utf8');
  return name;
}

function build() {
  cleanDir(DIST);

  // tokens.css concatenated ahead of print.css -- exactly one definition of
  // every color/spacing/type value in the project
  // (src/render/print.css's own :root block was deleted for this reason).
  const tokensSrc = fs.readFileSync(path.join(__dirname, 'web', 'tokens.css'), 'utf8');
  const printSrc = fs.readFileSync(path.join(__dirname, 'render', 'print.css'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'print.css'), `${tokensSrc}\n${printSrc}`, 'utf8');

  // Filenames are numbered per the buyer-facing usage order documented in
  // 00-readme.html itself: final dist/ in buyer-facing order
  // with sane filenames. A file browser's default alphabetical sort then matches
  // the order a buyer should actually open things in, instead of an arbitrary
  // alphabetization of topic names.
  const written = ['print.css'];
  written.push(writeFile('00-readme.html', pages.renderReadme()));
  written.push(writeFile('01-quick-start.html', pages.renderQuickStart()));
  written.push(writeFile('02-program-guide.html', pages.renderGuide(guide, benchmarks, focuses, drills)));
  written.push(writeFile('03-warmup-cards.html', pages.renderWarmupCards(warmups)));
  written.push(writeFile('04-drill-library.html', pages.renderDrillLibrary(drills)));

  const xlsxBuffer = buildTrackerWorkbook(benchmarks);
  fs.writeFileSync(path.join(DIST, '05-tracker-workbook.xlsx'), xlsxBuffer);
  written.push('05-tracker-workbook.xlsx');

  written.push(writeFile('06-matchup-study-sheet.html', pages.renderMatchupSheet()));
  written.push(writeFile('07-vod-review-sheet.html', pages.renderVodSheet()));
  written.push(writeFile('08-focus-card.html', pages.renderFocusCard()));

  return written;
}

if (require.main === module) {
  const files = build();
  console.log(`Built ${files.length} files into ${DIST}:`);
  files.forEach(f => console.log(`  - ${f}`));
}

module.exports = { build, DIST };
