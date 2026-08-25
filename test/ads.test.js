'use strict';

// Tests for src/web/ads.js -- the older manual-ad-unit plan, dormant/gated
// behind adConfig.enabled (currently false everywhere real pages render,
// per Auto ads superseding it -- see shell.js's own comment). Not dead
// code: the human's own design intent (adConfig.js's header comment) is
// that flipping adConfig.enabled back to true re-activates this path, so
// its enabled-branch deserves real coverage even though today's live
// builds never exercise it.

const test = require('node:test');
const assert = require('node:assert/strict');

const ads = require('../src/web/ads.js');
const adConfig = require('../src/web/adConfig.js');

// adConfig.js's module.exports is a plain object -- mutating its properties
// directly (restored in a finally block) matches this repo's own convention
// for temporarily overriding shared config/state in a test (see
// test/pdf.test.js's fs.existsSync override).
function withAdConfig(overrides, fn) {
  const originalEnabled = adConfig.enabled;
  const originalSlots = { ...adConfig.slots };
  Object.assign(adConfig, overrides.top || {});
  if (overrides.slots) Object.assign(adConfig.slots, overrides.slots);
  try {
    fn();
  } finally {
    adConfig.enabled = originalEnabled;
    Object.assign(adConfig.slots, originalSlots);
  }
}

test('adSlot() renders the real AdSense unit when enabled with a real slot id', () => {
  withAdConfig({ top: { enabled: true }, slots: { inContentTop: '1234567890' } }, () => {
    const html = ads.adSlot('inContentTop');
    assert.ok(html.includes('class="adsbygoogle"'), 'expected a real <ins class="adsbygoogle"> unit');
    assert.ok(html.includes('data-ad-slot="1234567890"'), 'expected the real slot id in data-ad-slot');
    assert.ok(html.includes(`data-ad-client="${adConfig.client}"`), 'expected the configured client id');
    assert.ok(html.includes('(adsbygoogle = window.adsbygoogle || []).push({});'), 'expected the push() activation script');
  });
});

test('adSlot() falls back to the placeholder (no script) when enabled but this slot has no id', () => {
  withAdConfig({ top: { enabled: true }, slots: { inContentMid: null } }, () => {
    const html = ads.adSlot('inContentMid');
    assert.ok(!html.includes('class="adsbygoogle"'), 'should not render a real unit with no slot id');
    assert.ok(!html.includes('<script>'), 'placeholder should carry no script tag at all');
    assert.ok(html.includes('class="ad-slot"'), 'should still render the reserved-height placeholder shell');
  });
});

test('adSlot() falls back to the placeholder (no script) when disabled, even with a real slot id present', () => {
  withAdConfig({ top: { enabled: false }, slots: { contentEnd: '9999999999' } }, () => {
    const html = ads.adSlot('contentEnd');
    assert.ok(!html.includes('class="adsbygoogle"'), 'disabled should never render a real unit regardless of slot id');
    assert.ok(!html.includes('<script>'), 'placeholder should carry no script tag at all');
  });
});

test('adsScriptTag() returns the empty string when disabled', () => {
  withAdConfig({ top: { enabled: false } }, () => {
    assert.equal(ads.adsScriptTag(), '');
  });
});

test('adsScriptTag() returns the real loader <script> tag, carrying the configured client id, when enabled', () => {
  withAdConfig({ top: { enabled: true } }, () => {
    const tag = ads.adsScriptTag();
    assert.ok(tag.startsWith('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='), 'expected the real AdSense loader script src');
    assert.ok(tag.includes(`client=${adConfig.client}`), 'expected the configured client id in the loader URL');
    assert.ok(tag.includes('crossorigin="anonymous"'), 'expected crossorigin="anonymous" on the loader script');
  });
});
