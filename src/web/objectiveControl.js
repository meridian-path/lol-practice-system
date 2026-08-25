'use strict';

// objectives.html: a standalone content-gap page (not derived from any
// section of content/guide.js, same pattern as src/web/teamfighting.js and
// src/web/visionWarding.js) covering objective control -- pre-objective
// setup and the herald-to-baron transition -- tied to the existing 12-focus
// framework. Anchored primarily to the "objective-awareness" focus, which
// currently has only a focus-menu card + drill, no deep-dive page.
// Deliberately scoped away from macro-play.html's existing "Objective
// Priority by Game State" section (which covers *which* objective is worth
// taking, by phase) -- this page covers the setup mechanics that make
// contesting an objective possible at all (vision + wave state before it
// spawns) and the specific herald/baron timing window, a distinct, more
// tactical layer. Reuses the shared dataTable()/callout() primitives
// (src/render/html.js), matching every sibling content-gap page's approach.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`objectiveControl.js: unknown focus id "${id}"`);
  return `<a href="${escapeHtml(site.url(`focus-menu.html#${f.id}`))}">${escapeHtml(f.title)}</a>`;
}

function crossLinks(links) {
  const items = links.map(([href, label]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join('\n      ');
  return `<nav class="cross-links" aria-label="Related pages">
      <ul>
      ${items}
      </ul>
    </nav>`;
}

// Matches src/web/contentPages.js's, src/web/drillWarmupPages.js's,
// src/web/earlyGame.js's, src/web/macroPlay.js's, src/web/waveManagement.js's,
// src/web/visionWarding.js's, and src/web/teamfighting.js's own
// standardEndLinks() exactly -- duplicated rather than imported since none
// of them export it and this is an eighth, independent caller (same
// accepted duplication those files' own headers already note).
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderSetupTable() {
  return dataTable({
    columns: [
      { key: 'when', label: 'When' },
      { key: 'do', label: 'What To Actually Do' }
    ],
    rows: [
      { when: '~60-90 seconds before spawn', do: 'Ward the objective pit and its river entrances (or refresh an aging ward) before the timer runs out - warding after the objective is already up means facechecking into whatever is waiting for you.' },
      { when: '~45 seconds before spawn', do: 'Start pushing the two nearest lane waves toward enemy turrets. A pushed wave frees your team to leave lane and buys extra seconds before minions crash back and start bleeding your own tower.' },
      { when: 'The moment vision confirms enemy position', do: 'Commit or hold based on what the ward actually shows, not what you assumed - a jungler who tracks the enemy jungler as missing bot side but wards show them top is the entire reason the ward exists.' }
    ]
  });
}

function renderSetupSection() {
  return `<section class="guide-section">
    <h2>Pre-Objective Setup: the Fight Is Won Before It's Visible</h2>
    <p>Whoever controls an objective almost always won the minute before it spawned, not the fight for it. Vision placed after the objective is already up is vision placed too late - by then the only information it can give you is who is already standing in the pit. The actual skill is running the same setup sequence every single time an objective timer gets inside two minutes, not reacting once the on-screen prompt appears.</p>
    ${renderSetupTable()}
    ${callout('A team that shows up to contest with no ward down and both lane waves still sitting in the middle of the map has already lost the objective, regardless of who wins the fight that follows.')}
  </section>`;
}

function renderTimingTable() {
  return dataTable({
    columns: [
      { key: 'objective', label: 'Objective' },
      { key: 'timing', label: 'Spawn / Despawn Window' }
    ],
    rows: [
      { objective: 'Dragon', timing: 'First spawns at 5:00, then again 5:00 after each one is killed.' },
      { objective: 'Herald', timing: 'Spawns at 15:00, despawns permanently at 19:45 (19:55 if it is in combat when the timer would expire) - it never returns after that, so a Herald not taken by then is gone for the rest of the game.' },
      { objective: 'Baron', timing: 'Spawns at 20:00 - the same pit Herald occupied, immediately after Herald despawns, then again 6:00 after each Baron kill.' }
    ]
  });
}

function renderTimingSection() {
  return `<section class="guide-section">
    <h2>The Herald-to-Baron Transition</h2>
    <p>Herald and Baron share one pit and one clock, which is exactly why teams misplay the handoff between them: Herald is gone for good at 19:45 (19:55 at the latest, if a fight is still running), and Baron spawns in the same spot 15 minutes later at 20:00. The two most common timing mistakes are trying to start a Herald fight with under a minute left on its own clock (it despawns mid-fight, wasting the vision and wave setup that was spent getting there) and forgetting there is a real gap between Herald disappearing and Baron appearing, not an instant swap.</p>
    ${renderTimingTable()}
  </section>`;
}

function renderMistakeTable() {
  return dataTable({
    columns: [
      { key: 'rank', label: 'Rank Band' },
      { key: 'mistake', label: 'Common Objective Mistake' },
      { key: 'fix', label: 'The Fix' }
    ],
    rows: [
      { rank: 'Iron-Bronze', mistake: 'Noticing the objective is up from the on-screen alert, then starting to group.', fix: 'Set a personal cue at the 2-minute mark on the objective timer to start warding and pushing waves, well before the spawn alert fires.' },
      { rank: 'Silver-Gold', mistake: 'Warding the pit itself but leaving the river entrances the enemy jungler actually paths through unwarded.', fix: 'Ward both the pit and at least one river entrance - the pit ward confirms the objective, the entrance ward gives the actual advance warning.' },
      { rank: 'Platinum+', mistake: 'Committing to a contest with no read on whether the enemy jungler is even nearby, purely because the timer says the objective is up.', fix: 'Treat "is the objective up" and "is it safe to take right now" as two separate questions - the timer only answers the first one.' }
    ]
  });
}

function renderObjectiveControl() {
  const introHtml = `<h1>Objective Control: Setup, Vision, and the Herald-to-Baron Timing Window</h1>
    <p class="lead">Knowing an objective is coming up is not the same skill as being ready to take it. This page covers the setup work that decides most objective fights before they start - vision and wave state in the minute beforehand - plus the exact Herald/Baron timing window that catches even players who already track objectives.</p>`;

  const sectionsHtml = `${renderSetupSection()}
    ${renderTimingSection()}
    <section class="guide-section">
      <h2>Which Objective Is Actually Worth Taking</h2>
      <p>This page covers setup and timing - whether a specific objective is worth fighting for at all, given the current game state, is a separate macro read covered in full on <a href="${escapeHtml(site.url('macro-play.html'))}">Macro Play and Win Condition Identification</a>, including the phase-by-phase objective priority table there. Use that page to decide if an objective is worth taking; use this one to make sure you are actually ready when it is.</p>
    </section>
    <section class="guide-section">
      <h2>Mistakes By Rank</h2>
      <p>Every rank band below is a variation on the same root problem: treating the objective spawn as the starting gun for preparation, instead of the deadline for preparation already being done.</p>
      ${renderMistakeTable()}
    </section>
    <section class="guide-section">
      <h2>How This Ties Into the 12 Focuses</h2>
      <p>Objective control does not have one focus entirely to itself, but two existing focuses meet directly at this page:</p>
      <ul>
        <li>${focusLink('objective-awareness')} - calling a timer 30+ seconds early is only useful if the vision and wave setup behind it actually happened; this page is what that focus's own drill is training you to be ready for.</li>
        <li>${focusLink('minimap-awareness')} - the river-entrance ward that gives real advance warning only matters if someone is actually watching the minimap when it lights up.</li>
      </ul>
      <p>None of this replaces picking an actual focus to hold for a block of games - it is context for whichever one your baseline points you toward, objective-related or not.</p>
    </section>`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#objective-timer-precall'), 'Run the Objective-Timer Pre-Call drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu'],
      [site.url('macro-play.html'), 'Deciding which objective is worth taking: Macro Play and Win Condition Identification'],
      [site.url('comms.html'), 'Turning the timer into a team-wide call: Shot-Calling and Comms']
    ])}
  </div>`;

  const description = 'A guide to League of Legends objective control: pre-objective vision and wave setup, and the exact Herald-to-Baron timing window.';
  return shell.documentShell({
    title: site.pageTitle('Objective Control Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('objectives.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Objective Control: Setup, Vision, and the Herald-to-Baron Timing Window',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('objectives.html')
    })
  });
}

module.exports = { renderObjectiveControl };
