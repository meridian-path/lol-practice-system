'use strict';
// Shared leak-pattern module, extracted from test/emDashHygiene.test.js so the build-time
// source/output scan and scripts/hooks/pr-metadata-id-leak-guard.js (the gh pr create/edit
// PreToolUse guard) can't drift apart from one another over time -- the same reuse discipline
// filetools' own check-internal-ids.js/pr-metadata-id-leak-guard.js pair already established
// (see that repo's own header comments). Same regex content as before this extraction, just
// relocated -- emDashHygiene.test.js's own LEAKED_ID/DOC_LEAK usage is unaffected.

// Internal task/decision ids from the shared Orchestra queue must never leak into this public
// repo -- see emDashHygiene.test.js's own header for why both source and built output are
// checked against this.
const ID_RE = /\btask-[0-9a-z]+-[0-9a-f]+\b|\bdecision-[0-9a-z]+-[0-9a-f]+\b/i;

// Internal governing-doc filenames and internal rotation/series labels -- these name
// Orchestra's own internal process docs and audit rotations, meaningless (and revealing) to a
// visitor reading "View Source" or browsing this repo's source on GitHub.
const DOC_FILENAME_RE =
  /\bdesign-standards\.md\b|\bqa\.md\b|\bCRAFT_DOCTRINE\b|\bDESIGN_PLAYBOOK\b|\bREFERENCE_LIBRARY\b|\bGOALS\.md\b|\bTESTING\.md\b|\bWS-\d+\b|\bPhase-\d+\b|\bspec-section-\d+\b|\bsite-audit-item-\d+\b/i;

module.exports = { ID_RE, DOC_FILENAME_RE };
