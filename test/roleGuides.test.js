'use strict';

// Tests for src/web/roleGuides.js (climbing-top/jungle/mid/adc/support.html) --
// 5 standalone content-gap pages, one per role, not derived from
// content/guide.js like src/web/contentPages.js's pages.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  renderTopGuide,
  renderJungleGuide,
  renderMidGuide,
  renderAdcGuide,
  renderSupportGuide
} = require('../src/web/roleGuides.js');
const site = require('../src/site.js');

const PAGES = [
  { slug: 'climbing-top.html', render: renderTopGuide },
  { slug: 'climbing-jungle.html', render: renderJungleGuide },
  { slug: 'climbing-mid.html', render: renderMidGuide },
  { slug: 'climbing-adc.html', render: renderAdcGuide },
  { slug: 'climbing-support.html', render: renderSupportGuide }
];

for (const { slug, render } of PAGES) {
  const html = render();

  test(`${slug} has exactly one <h1> and no heading level is skipped`, () => {
    const h1Count = (html.match(/<h1[ >]/g) || []).length;
    assert.equal(h1Count, 1, `expected exactly one <h1>, found ${h1Count}`);
    const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map(m => Number(m[1]));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skipped: ...${levels[i - 1]} -> ${levels[i]}...`);
    }
  });

  test(`${slug} carries the canonical link, JSON-LD, and a title/description within the site's length caps`, () => {
    assert.ok(html.includes(`<link rel="canonical" href="${site.absoluteUrl(slug)}">`));
    assert.ok(html.includes('application/ld+json'));
    const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
    const descMatch = /<meta name="description" content="([^"]*)">/.exec(html);
    assert.ok(titleMatch && titleMatch[1].length <= 60, 'title missing or over 60 chars');
    assert.ok(descMatch && descMatch[1].length <= 160, 'description missing or over 160 chars');
  });

  test(`${slug} links to tracker.html, downloads.html, and the focus menu`, () => {
    assert.ok(html.includes(site.url('tracker.html')));
    assert.ok(html.includes(site.url('downloads.html')));
    assert.ok(html.includes(site.url('focus-menu.html')));
  });

  test(`${slug} links to real drill anchors and real focus-menu anchors, not made-up ids`, () => {
    const drills = require('../content/drills.json');
    const focuses = require('../content/focuses.json');
    const drillIds = new Set(drills.map(d => d.id));
    const focusIds = new Set(focuses.map(f => f.id));

    const drillHrefs = [...html.matchAll(/href="[^"]*drills\.html#([^"]+)"/g)].map(m => m[1]);
    assert.ok(drillHrefs.length > 0, 'expected at least one drills.html#<id> link');
    for (const id of drillHrefs) {
      assert.ok(drillIds.has(id), `drills.html#${id} does not match a real drill id`);
    }

    const focusHrefs = [...html.matchAll(/href="[^"]*focus-menu\.html#([^"]+)"/g)].map(m => m[1]);
    assert.ok(focusHrefs.length > 0, 'expected at least one focus-menu.html#<id> link');
    for (const id of focusHrefs) {
      assert.ok(focusIds.has(id), `focus-menu.html#${id} does not match a real focus id`);
    }
  });

  test(`${slug} carries no manual ad-slot placeholder`, () => {
    assert.equal((html.match(/class="ad-slot"/g) || []).length, 0);
  });
}

test('the 5 role-guide pages carry no two identical prose sentences (no shared templated paragraph)', () => {
  const sentenceSets = PAGES.map(({ render }) => {
    const html = render();
    const zoneStart = html.indexOf('class="zone-measure"');
    const footerStart = html.indexOf('<footer');
    const bodyOnly = zoneStart === -1 ? html : html.slice(zoneStart, footerStart === -1 ? undefined : footerStart);
    const noScripts = bodyOnly.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
    const text = noScripts.replace(/<[^>]+>/g, ' ');
    const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 40);
    return new Set(sentences);
  });
  for (let i = 0; i < sentenceSets.length; i++) {
    for (let j = i + 1; j < sentenceSets.length; j++) {
      const shared = [...sentenceSets[i]].filter(s => sentenceSets[j].has(s));
      assert.equal(shared.length, 0, `pages ${PAGES[i].slug} and ${PAGES[j].slug} share identical sentence(s): ${shared.join(' | ')}`);
    }
  }
});

test('program.html and focus-menu.html both link to all 5 role-guide pages', () => {
  const { CONTENT_PAGES } = require('../src/web/contentPages.js');
  const rendered = new Map(CONTENT_PAGES.map(([name, render]) => [name, render()]));
  for (const { slug } of PAGES) {
    assert.ok(rendered.get('program.html').includes(site.url(slug)), `program.html should link to ${slug}`);
    assert.ok(rendered.get('focus-menu.html').includes(site.url(slug)), `focus-menu.html should link to ${slug}`);
  }
});
