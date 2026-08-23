'use strict';

// Tests for the web-site build (src/web/buildSite.js, src/web/shell.js,
// src/web/ads.js). Covers the two foundational pages
// (index.html, 404.html) and the shared shell they're both built
// from, so later pages that get added inherit a shell already known
// to satisfy these checks.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { build, DIST, WEB_PAGES, ASSETS_DIR, COPIED_ASSETS } = require('../src/web/buildSite.js');
const site = require('../src/site.js');

test('build() writes site.css, one file per WEB_PAGES entry, the SEO infra files (sitemap.xml/robots.txt/ads.txt), the GitHub Pages CNAME file, and every COPIED_ASSETS file actually present in assets/ into dist/', () => {
  const written = build();
  const presentCopiedAssets = COPIED_ASSETS.filter((f) => fs.existsSync(path.join(ASSETS_DIR, f)));
  const expected = ['site.css', ...WEB_PAGES.map(([name]) => name), 'sitemap.xml', 'robots.txt', 'ads.txt', 'CNAME', ...presentCopiedAssets];
  assert.deepEqual(written.slice().sort(), expected.slice().sort());
  for (const f of expected) {
    assert.ok(fs.existsSync(path.join(DIST, f)), `expected ${f} to exist in dist/`);
  }
});

test('CNAME contains exactly the custom domain hostname derived from site.SITE_ORIGIN', () => {
  build();
  const content = fs.readFileSync(path.join(DIST, 'CNAME'), 'utf8');
  assert.equal(content, `${new URL(site.SITE_ORIGIN).hostname}\n`);
});

test('every built HTML page has html lang="en", a <title>, and a meta description', () => {
  build();
  const htmlFiles = WEB_PAGES.map(([name]) => name).filter(f => f.endsWith('.html'));
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.ok(content.includes('<html lang="en">'), `${f} missing html lang attribute`);
    assert.ok(/<title>[^<]+<\/title>/.test(content), `${f} missing <title>`);
    assert.ok(/<meta name="description" content="[^"]+"/.test(content), `${f} missing meta description`);
  }
});

test('every built HTML page carries the Riot disclaimer, and About/Privacy footer links', () => {
  build();
  const htmlFiles = WEB_PAGES.map(([name]) => name).filter(f => f.endsWith('.html'));
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.ok(content.includes(site.RIOT_DISCLAIMER), `${f} missing the Riot disclaimer line`);
    assert.ok(content.includes(site.TRADEMARK_NOTICE), `${f} missing the trademark notice`);
    assert.ok(content.includes(site.url('about.html')), `${f} missing an About link`);
    assert.ok(content.includes(site.url('privacy.html')), `${f} missing a Privacy link`);
  }
});

test('index.html carries a canonical link, a skip link, the full nav, no manual ad-slot placeholder, and the unconditional AdSense Auto ads loader', () => {
  build();
  const content = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  assert.ok(content.includes(`<link rel="canonical" href="${site.absoluteUrl('')}">`), 'missing canonical link');
  assert.ok(content.includes('class="skip-link"'), 'missing skip link');
  // The old manual-unit plan (src/web/ads.js's adSlot()) is no longer called
  // from any page -- Auto ads (below) places ads on its own now, so the old
  // empty placeholder wells were removed rather than left visually
  // coexisting with the live Auto ads loader.
  assert.ok(!content.includes('class="ad-slot"'), 'should not carry a manual ad-slot placeholder now that Auto ads covers the page');
  // Auto ads loads unconditionally, independent of
  // adConfig.enabled -- unlike the older manual-unit plan above.
  assert.ok(
    content.includes('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9767914878112531" crossorigin="anonymous"></script>'),
    'missing the unconditional AdSense Auto ads loader script'
  );
  // The old manual-unit plan (src/web/ads.js's adSlot()/adsScriptTag()) stays
  // gated on adConfig.enabled, which is still false, and is no longer called
  // from any page at all, so no real ad unit (<ins class="adsbygoogle">) or
  // its push() call should render.
  assert.ok(!content.includes('class="adsbygoogle"'), 'manual ad unit should not render while adConfig.enabled is false');
  assert.ok(!content.includes('adsbygoogle = window.adsbygoogle'), 'manual ad unit push script should not render while adConfig.enabled is false');
});

test('404.html is marked noindex and links back to the site root', () => {
  build();
  const content = fs.readFileSync(path.join(DIST, '404.html'), 'utf8');
  assert.ok(content.includes('<meta name="robots" content="noindex">'), '404 page should be noindex');
  assert.ok(content.includes(`href="${site.url('')}"`), '404 page should link back home');
});

test('no hardcoded hex color appears in any built HTML page outside a var() reference', () => {
  build();
  const htmlFiles = WEB_PAGES.map(([name]) => name).filter(f => f.endsWith('.html'));
  // Every hex color in the shipped output should come from the inlined
  // tokens.css <style> block (the source of truth) -- so the only hex codes
  // that may legally appear are the ones tokens.css itself defines.
  const tokensSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'web', 'tokens.css'), 'utf8');
  const tokenHexCodes = new Set((tokensSrc.match(/#[0-9A-Fa-f]{6}/g) || []).map(h => h.toUpperCase()));
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(DIST, f), 'utf8');
    const hexCodesInPage = (content.match(/#[0-9A-Fa-f]{6}/g) || []).map(h => h.toUpperCase());
    for (const hex of hexCodesInPage) {
      assert.ok(tokenHexCodes.has(hex), `${f} contains a hex color (${hex}) not defined in tokens.css`);
    }
  }
});

test('build() removes a stale top-level file left in dist/ by an earlier partial build', () => {
  build();
  const staleFile = path.join(DIST, 'this-page-no-longer-exists.html');
  fs.writeFileSync(staleFile, '<html>orphaned by a renamed/removed WEB_PAGES entry</html>', 'utf8');
  assert.ok(fs.existsSync(staleFile), 'setup: stale file should exist before rebuilding');
  build();
  assert.ok(!fs.existsSync(staleFile), 'a stale top-level file should be pruned by the next build()');
});

test('build() never touches dist/print/ (owned and cleaned by src/build.js)', () => {
  build();
  const printDir = path.join(DIST, 'print');
  fs.mkdirSync(printDir, { recursive: true });
  const printMarker = path.join(printDir, 'marker-from-src-build-js.html');
  fs.writeFileSync(printMarker, '<html>owned by src/build.js, not this build</html>', 'utf8');
  build();
  assert.ok(fs.existsSync(printMarker), 'build() must never delete anything under dist/print/');
});

test('build() copies every COPIED_ASSETS file present in assets/ into dist/ on every run, overwriting a stale dist/ copy', () => {
  build();
  for (const asset of COPIED_ASSETS) {
    const assetSrc = path.join(ASSETS_DIR, asset);
    if (!fs.existsSync(assetSrc)) continue; // nothing to prove for an asset not present in this checkout
    const distPath = path.join(DIST, asset);
    const realBytes = fs.readFileSync(assetSrc);
    // Corrupt dist/'s copy to prove the next build() actually re-copies from
    // assets/ rather than leaving whatever was already in dist/ alone --
    // the exact behavior change from the old "never touch a manual output"
    // contract this asset used to have.
    fs.writeFileSync(distPath, 'stale/corrupted placeholder, not the real asset', 'utf8');
    build();
    assert.ok(
      fs.readFileSync(distPath).equals(realBytes),
      `build() must overwrite a stale dist/${asset} with the real bytes from assets/${asset} on every run`
    );
  }
});

test("build() never deletes a pre-existing dist/ copy of a COPIED_ASSETS file on a run where assets/ temporarily doesn't have it", () => {
  build();
  for (const asset of COPIED_ASSETS) {
    const assetSrc = path.join(ASSETS_DIR, asset);
    if (!fs.existsSync(assetSrc)) continue;
    const distPath = path.join(DIST, asset);
    const realBytes = fs.readFileSync(assetSrc);
    const tempMoveTarget = `${assetSrc}.test-temp-moved`;
    fs.renameSync(assetSrc, tempMoveTarget);
    try {
      build();
      assert.ok(fs.existsSync(distPath), `build() must not delete a pre-existing dist/${asset} just because assets/${asset} is temporarily missing this run`);
    } finally {
      fs.renameSync(tempMoveTarget, assetSrc);
    }
    // Restore dist/'s own copy too (the run above with assets/ missing left
    // dist/ holding whatever was there before -- already correct, but a
    // final build() with the real asset back in place keeps this test's own
    // side effects fully cleaned up either way).
    build();
    assert.ok(fs.readFileSync(distPath).equals(realBytes));
  }
});
