'use strict';

// Client-side logic for the role filter on focus-menu.html and drills.html
// (task-mt83rhrh-759f27 item 3). Both pages' cards already carry a real
// data-roles attribute (content/focuses.json's own roles field - see
// src/web/contentPages.js's renderFocusCardsWithDrillLinks() and
// src/web/drillWarmupPages.js's renderDrillCard()); this script only
// filters by it and remembers the choice across both pages via
// localStorage, so picking "Jungle" on the Focus Menu also applies on
// Drills without re-selecting. Same dual-environment inline-script/Node-
// require pattern as src/web/trackerClient.js and src/web/quizClient.js.

var ROLE_FILTER_STORAGE_KEY = 'lol-practice-role-filter';

// Pure: given a card's raw data-roles attribute value ("Top,Jungle,Mid")
// and the currently selected role ("" means no filter, show everything),
// returns whether that card should be visible.
function roleMatches(dataRolesAttr, selectedRole) {
  if (!selectedRole) return true;
  var roles = String(dataRolesAttr || '').split(',').map(function (r) { return r.trim(); });
  return roles.indexOf(selectedRole) !== -1;
}

function getStoredRoleFilter() {
  try {
    return localStorage.getItem(ROLE_FILTER_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setStoredRoleFilter(role) {
  try {
    localStorage.setItem(ROLE_FILTER_STORAGE_KEY, role);
  } catch (e) {
    // ignore -- filtering still works for this page load, just doesn't persist
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-role-filter]');
    if (!root) return;
    var cards = document.querySelectorAll('[data-roles]');
    var buttons = root.querySelectorAll('[data-role-btn]');
    var countEl = root.querySelector('[data-role-filter-count]');

    function activate(role) {
      var visibleCount = 0;
      cards.forEach(function (card) {
        var visible = roleMatches(card.getAttribute('data-roles'), role);
        card.hidden = !visible;
        if (visible) visibleCount++;
      });
      buttons.forEach(function (btn) {
        var isActive = (btn.getAttribute('data-role-btn') || '') === role;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      if (countEl) {
        countEl.textContent = role
          ? `Showing ${visibleCount} of ${cards.length}, filtered to ${role}.`
          : `Showing all ${cards.length}.`;
      }
      setStoredRoleFilter(role);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activate(btn.getAttribute('data-role-btn') || '');
      });
    });

    activate(getStoredRoleFilter());
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { roleMatches: roleMatches, ROLE_FILTER_STORAGE_KEY: ROLE_FILTER_STORAGE_KEY };
}
