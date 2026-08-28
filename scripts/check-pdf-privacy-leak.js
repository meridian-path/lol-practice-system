'use strict';

/**
 * Mechanical check for the local-path/username leak class that src/pdf.js's
 * old --print-to-pdf CLI usage produced (a browser-default print footer
 * stamping "file:///C:/Users/<name>/.../dist/print/<page>.html" on every
 * page of every shipped PDF).
 *
 * A byte-level grep over the raw PDF file does NOT catch this: PDF text is
 * stored as font glyph codes in a compressed content stream, not as literal
 * ASCII, so the offending string is invisible to `grep`/`Buffer.includes()`
 * even though it renders plainly when the PDF is opened. This script
 * actually decodes each PDF's rendered text (via pdfjs-dist, which resolves
 * glyph codes through each font's ToUnicode CMap the same way a PDF viewer
 * does) and greps THAT -- the only check that reflects what a human who
 * opens the file actually sees.
 *
 * Usage:
 *   node scripts/check-pdf-privacy-leak.js [dir]   (default: dist/print)
 *
 * Exit code 0: no PDFs found (nothing to check -- mirrors src/pdf.js's own
 *   "no browser installed" graceful skip, so this never fails npm run
 *   build:all on a machine with no local browser) OR every PDF found is
 *   clean.
 * Exit code 1: at least one PDF contains "file://" or the local OS username
 *   in its rendered text.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_DIR = path.join(__dirname, '..', 'dist', 'print');

/** Extracts all rendered text from every page of a PDF buffer, via its own
 * ToUnicode CMaps (same resolution path a real PDF viewer uses) -- not a raw
 * byte scan. Dynamic import because pdfjs-dist ships ESM-only. */
async function extractPdfText(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  // Points pdfjs-dist at its own bundled standard-font glyph data (shipped in
  // the package itself, no network fetch) so it can resolve text drawn with
  // a non-embedded base-14 font (e.g. bare Helvetica) without warning --
  // real Chrome-generated PDFs embed their own subset fonts and don't need
  // this, but this keeps the check quiet for any PDF that doesn't.
  const standardFontDataUrl = path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    'standard_fonts'
  ).replace(/\\/g, '/') + '/';
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl
  });
  const doc = await loadingTask.promise;

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  await loadingTask.destroy();
  return pages.join('\n');
}

/** The patterns this check exists to catch:
 * a file:// source URL, and the local OS account name (which shows up as
 * part of a Windows home-directory path, e.g. C:\Users\<name>\...). Returns
 * only patterns worth checking -- an empty/unavailable username is skipped
 * rather than matching everything. */
function buildLeakPatterns() {
  const patterns = [{ label: 'file:// URL', re: /file:\/\//i }];
  let username;
  try {
    username = os.userInfo().username;
  } catch (err) {
    username = null;
  }
  if (username && username.trim()) {
    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push({ label: `local OS username ("${username}")`, re: new RegExp(escaped, 'i') });
  }
  return patterns;
}

/** Scans already-extracted PDF text against a list of {label, re} patterns.
 * Returns { clean, hits: [{label, snippet}] }. Pure/sync so it's directly
 * testable without needing a real PDF. */
function scanTextForLeaks(text, patterns) {
  const hits = [];
  for (const { label, re } of patterns) {
    const match = text.match(re);
    if (match) {
      const idx = Math.max(0, match.index - 40);
      const snippet = text.slice(idx, match.index + match[0].length + 40).replace(/\s+/g, ' ').trim();
      hits.push({ label, snippet });
    }
  }
  return { clean: hits.length === 0, hits };
}

/** Full pipeline for one PDF file: decode -> scan. */
async function checkPdfFile(filePath, patterns) {
  const buffer = fs.readFileSync(filePath);
  const text = await extractPdfText(buffer);
  return scanTextForLeaks(text, patterns);
}

async function run(dir) {
  const targetDir = dir || DEFAULT_DIR;
  if (!fs.existsSync(targetDir)) {
    console.log(`check-pdf-privacy-leak: ${targetDir} does not exist -- nothing to check.`);
    return { ok: true, checked: [], leaking: [] };
  }

  const pdfFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith('.pdf')).sort();
  if (pdfFiles.length === 0) {
    console.log(`check-pdf-privacy-leak: no PDFs in ${targetDir} -- nothing to check (expected on a machine with no local browser for "npm run pdf" to use).`);
    return { ok: true, checked: [], leaking: [] };
  }

  const patterns = buildLeakPatterns();
  const checked = [];
  const leaking = [];

  for (const file of pdfFiles) {
    const filePath = path.join(targetDir, file);
    let result;
    try {
      result = await checkPdfFile(filePath, patterns);
    } catch (err) {
      // A PDF this script cannot even parse is itself worth failing loudly on
      // rather than silently skipping -- unlike src/pdf.js's own generation
      // pass, this is a verification gate, not a best-effort convenience.
      console.error(`check-pdf-privacy-leak: FAILED to decode ${file}: ${err.message}`);
      leaking.push({ file, hits: [{ label: 'decode error', snippet: err.message }] });
      continue;
    }
    checked.push(file);
    if (!result.clean) {
      leaking.push({ file, hits: result.hits });
    }
  }

  if (leaking.length) {
    console.error('check-pdf-privacy-leak: FAILED -- local path/username leak found in rendered PDF text:');
    for (const entry of leaking) {
      for (const hit of entry.hits) {
        console.error(`  ${entry.file}: ${hit.label} -- "...${hit.snippet}..."`);
      }
    }
    return { ok: false, checked, leaking };
  }

  console.log(`check-pdf-privacy-leak: OK -- ${checked.length} PDF(s) decoded and checked clean (file:// and local username, checked against rendered text via ToUnicode CMap decode, not a raw byte grep).`);
  return { ok: true, checked, leaking: [] };
}

if (require.main === module) {
  const dirArg = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  run(dirArg).then((result) => {
    process.exit(result.ok ? 0 : 1);
  }).catch((err) => {
    console.error(`check-pdf-privacy-leak: unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { run, extractPdfText, scanTextForLeaks, buildLeakPatterns, checkPdfFile, DEFAULT_DIR };
