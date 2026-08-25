'use strict';

// Client-side logic for the homepage's "Start Here" routing quiz (item 1 of
// the 2026-08-25 site-audit task, task-mt83rhrh-759f27 - rescoped by HQ
// after checking the live site: the static "Three steps to start"/"Start
// here" sections already exist, so this is an ENHANCEMENT that adds
// interactive routing on top of them, not a from-scratch onboarding
// rebuild). Three questions (role, rank, biggest weakness), then reveals
// direct links to the matching focus card, drill, and warmup - no account,
// nothing saved, nothing sent anywhere. Same dual-environment pattern as
// src/web/trackerClient.js: this exact file is inlined verbatim into the
// browser as a plain <script> tag (no bundler on this site) AND required()
// directly by test/quizClient.test.js for real unit coverage of the pure
// routing-map function. The rank question does not affect routing today
// (every focus is rank-agnostic) - it is collected because the audit's own
// question set asked for it, and content/focuses.json's own graduation
// bars are already rank-independent by design, so there is no real
// per-rank routing difference to route on; asking still primes the
// visitor to think about their baseline before clicking through.

var ROLE_TO_WARMUP_ID = {
  Top: 'solo-lane',
  Jungle: 'jungle',
  Mid: 'solo-lane',
  ADC: 'adc',
  Support: 'support'
};

// Pure: given a role and a chosen focus id, returns the three hrefs the
// quiz routes to, or null for a href it can't resolve (an unrecognized
// role or focus id, rather than guessing).
function buildRoutingLinks(role, focusId, focusesData) {
  var focus = null;
  for (var i = 0; i < focusesData.length; i++) {
    if (focusesData[i].id === focusId) { focus = focusesData[i]; break; }
  }
  if (!focus) return null;
  var warmupId = ROLE_TO_WARMUP_ID[role];
  return {
    focusHref: 'focus-menu.html#' + focus.id,
    drillHref: 'drills.html#' + focus.drillId,
    warmupHref: warmupId ? 'warmup.html#' + warmupId : null
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-quiz-app]');
    if (!root) return;
    var focusesData = JSON.parse(document.getElementById('quiz-focuses-data').textContent);
    var baseUrl = root.getAttribute('data-base-url') || '';

    var roleSelect = root.querySelector('[data-quiz-role]');
    var rankSelect = root.querySelector('[data-quiz-rank]');
    var focusSelect = root.querySelector('[data-quiz-focus]');
    var resultsEl = root.querySelector('[data-quiz-results]');
    var promptEl = root.querySelector('[data-quiz-prompt]');

    function refresh() {
      var role = roleSelect.value;
      var rank = rankSelect.value;
      var focusId = focusSelect.value;
      if (!role || !rank || !focusId) {
        resultsEl.hidden = true;
        promptEl.hidden = false;
        return;
      }
      var links = buildRoutingLinks(role, focusId, focusesData);
      if (!links) {
        resultsEl.hidden = true;
        promptEl.hidden = false;
        return;
      }
      var focusLink = resultsEl.querySelector('[data-quiz-focus-link]');
      var drillLink = resultsEl.querySelector('[data-quiz-drill-link]');
      var warmupLink = resultsEl.querySelector('[data-quiz-warmup-link]');
      focusLink.href = baseUrl + links.focusHref;
      drillLink.href = baseUrl + links.drillHref;
      if (links.warmupHref) {
        warmupLink.href = baseUrl + links.warmupHref;
        warmupLink.hidden = false;
      } else {
        warmupLink.hidden = true;
      }
      promptEl.hidden = true;
      resultsEl.hidden = false;
    }

    roleSelect.addEventListener('change', refresh);
    rankSelect.addEventListener('change', refresh);
    focusSelect.addEventListener('change', refresh);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ROLE_TO_WARMUP_ID: ROLE_TO_WARMUP_ID, buildRoutingLinks: buildRoutingLinks };
}
