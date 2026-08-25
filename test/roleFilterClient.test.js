'use strict';

// Tests for src/web/roleFilterClient.js's pure roleMatches() function.

const test = require('node:test');
const assert = require('node:assert/strict');

const roleFilter = require('../src/web/roleFilterClient.js');

test('roleMatches() returns true for every card when no role is selected (the "All" state)', () => {
  assert.equal(roleFilter.roleMatches('Jungle', ''), true);
  assert.equal(roleFilter.roleMatches('Top,Mid,ADC', ''), true);
});

test('roleMatches() returns true only when the selected role is in the card\'s comma-separated list', () => {
  assert.equal(roleFilter.roleMatches('Top,Mid,ADC', 'Top'), true);
  assert.equal(roleFilter.roleMatches('Top,Mid,ADC', 'Jungle'), false);
  assert.equal(roleFilter.roleMatches('Jungle', 'Jungle'), true);
});

test('roleMatches() treats a missing/empty data-roles attribute as matching nothing (a real content gap, not silently shown everywhere)', () => {
  assert.equal(roleFilter.roleMatches(null, 'Top'), false);
  assert.equal(roleFilter.roleMatches('', 'Top'), false);
  assert.equal(roleFilter.roleMatches(undefined, 'Top'), false);
});

test('roleMatches() is exact-match, not a substring match (e.g. does not let "Mid" match inside a differently-named role)', () => {
  assert.equal(roleFilter.roleMatches('ADC', 'AD'), false);
});
