'use strict';

/**
 * Local visual-QA harness: screenshots a page at three viewports and prints
 * a Lighthouse (Performance/Accessibility/Best Practices/SEO) score summary
 * to stdout -- the same four categories design-standards.md's 90-floor rule
 * checks against.
 *
 * Usage:
 *   npm run visual-qa -- <url-or-local-file-path>
 *
 * Examples:
 *   npm run visual-qa -- dist/00-readme.html
 *   npm run visual-qa -- http://localhost:8787/00-readme.html
 *
 * A bare http(s) URL is used as-is. A local path is served from a throwaway
 * static file server (rooted at that file's directory, bound to localhost
 * only) so relative asset links (css/js/images) resolve the same way they
 * would under a real server, and so Lighthouse gets a real http:// URL
 * (Lighthouse's navigation runner does not accept file:// or data: URLs).
 *
 * Local-only: nothing here publishes, deploys, or binds beyond localhost.
 *
 * Copied from lichess-stats-poc/scripts/visual-qa.js (written generically on
 * purpose so it ports between workspaces with just a path tweak -- none was
 * needed here beyond OUTPUT_DIR's implicit workspace root).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const lighthouse = require('lighthouse').default;

// --- constants (edit these when reusing this script in another workspace) ---
const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
];
const OUTPUT_DIR = path.join(__dirname, '..', 'visual-qa-output');
const LIGHTHOUSE_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
// A fixed CDP debug port for the Lighthouse pass. 0 (OS-assigned) isn't an
// option here because Lighthouse needs to be told the port *before* Chrome
// finishes starting; this port only needs to be free on localhost for the
// life of this process.
const LIGHTHOUSE_CDP_PORT = 9523;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Serves `rootDir` (recursively) on localhost only, on an OS-assigned port. */
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath;
      try {
        reqPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      } catch {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }
      const resolved = path.normalize(path.join(rootDir, reqPath));
      if (!resolved.startsWith(path.normalize(rootDir))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(resolved, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        const ext = path.extname(resolved).toLowerCase();
        res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, 'localhost', () => resolve(server));
  });
}

function isHttpUrl(target) {
  return /^https?:\/\//i.test(target);
}

/** Turns a page path/URL into a filesystem-safe base name for screenshots. */
function pageNameFor(target) {
  const base = isHttpUrl(target)
    ? new URL(target).pathname.replace(/\/+$/, '') || 'index'
    : path.basename(target, path.extname(target));
  const cleaned = base.replace(/^\/+/, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return cleaned || 'page';
}

function formatScoreSummary(categories) {
  const lines = ['Lighthouse scores:'];
  for (const key of LIGHTHOUSE_CATEGORIES) {
    const cat = categories[key];
    if (!cat) {
      lines.push(`  ${key}: n/a`);
      continue;
    }
    const pct = cat.score === null ? 'n/a' : Math.round(cat.score * 100);
    lines.push(`  ${cat.title || key}: ${pct}${pct === 'n/a' ? '' : '/100'}`);
  }
  return lines.join('\n');
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: npm run visual-qa -- <url-or-local-file-path>');
    process.exitCode = 1;
    return;
  }

  let server = null;
  let pageUrl;
  if (isHttpUrl(target)) {
    pageUrl = target;
  } else {
    const absPath = path.resolve(target);
    if (!fs.existsSync(absPath)) {
      console.error(`File not found: ${absPath}`);
      process.exitCode = 1;
      return;
    }
    const rootDir = path.dirname(absPath);
    server = await startStaticServer(rootDir);
    const port = server.address().port;
    pageUrl = `http://localhost:${port}/${path.basename(absPath)}`;
  }

  const pageName = pageNameFor(target);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [`--remote-debugging-port=${LIGHTHOUSE_CDP_PORT}`],
  });

  try {
    console.log(`Visual QA: ${pageUrl}`);

    // 1. Screenshots at each viewport.
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(pageUrl, { waitUntil: 'networkidle' });
      const outFile = path.join(OUTPUT_DIR, `${pageName}-${viewport.name}.png`);
      await page.screenshot({ path: outFile, fullPage: true });
      console.log(`  saved ${path.relative(process.cwd(), outFile)}`);
      await page.close();
    }

    // 2. Lighthouse pass, over CDP, against the same browser instance.
    const result = await lighthouse(pageUrl, {
      port: LIGHTHOUSE_CDP_PORT,
      output: 'json',
      logLevel: 'error',
      onlyCategories: LIGHTHOUSE_CATEGORIES,
    });

    if (!result || !result.lhr) {
      console.error('Lighthouse did not return a report.');
      process.exitCode = 1;
      return;
    }

    console.log('');
    console.log(formatScoreSummary(result.lhr.categories));

    // 3. Em-dash hygiene: this project's style guide bans the literal em
    // dash character outright -- catch a regression in whatever page is
    // under QA, not just at the repo-wide test level.
    const hygienePage = await browser.newPage();
    await hygienePage.goto(pageUrl, { waitUntil: 'networkidle' });
    const html = await hygienePage.content();
    await hygienePage.close();
    // Checks both the literal character and the HTML-entity/numeric-reference
    // spellings, since &mdash;/&#8212;/&#x2014; decode to the same character
    // once the DOM parses them -- a raw-source grep for the literal
    // character alone misses those.
    const hasLiteral = html.includes('—');
    const hasEncoded = /&mdash;|&#8212;|&#x2014;/i.test(html);
    if (hasLiteral || hasEncoded) {
      console.error('Em-dash hygiene FAILED: rendered page contains an em dash (literal or HTML-entity-encoded). Replace with a plain hyphen, or restructure using a period or comma.');
      process.exitCode = 1;
    } else {
      console.log('Em-dash hygiene: OK (no literal or encoded em dash in rendered output)');
    }
  } finally {
    await browser.close();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('visual-qa failed:', err);
    process.exitCode = 1;
  });
}

module.exports = { VIEWPORTS, OUTPUT_DIR, isHttpUrl, pageNameFor, formatScoreSummary };
