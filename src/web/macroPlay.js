'use strict';

// macro-play.html: a standalone content-gap page (not derived from any
// section of content/guide.js, same pattern as src/web/earlyGame.js) covering
// macro decision-making -- win-condition identification, objective priority
// by game state, and macro mistakes by rank -- tied to the existing 12-focus
// framework. Reuses the shared dataTable()/callout() primitives
// (src/render/html.js) for its decision-matrix tables, matching
// early-game.html's own approach to the same "decision trees and examples"
// deliverable shape rather than introducing a new, one-off visual component.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`macroPlay.js: unknown focus id "${id}"`);
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

// Matches src/web/contentPages.js's, src/web/drillWarmupPages.js's, and
// src/web/earlyGame.js's own standardEndLinks() exactly -- duplicated rather
// than imported since none of them export it and this is a fourth,
// independent caller.
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderWinConditionTable() {
  return dataTable({
    columns: [
      { key: 'signal', label: 'What Your Team Comp/Game State Shows' },
      { key: 'condition', label: 'Win Condition' },
      { key: 'action', label: 'What To Prioritize' }
    ],
    rows: [
      {
        signal: 'Your team has strong engage and disengage tools, and the enemy comp lacks a way to peel or disengage cleanly.',
        condition: 'Teamfight',
        action: 'Group at the first even objective, force 5v5s around it, and avoid splitting your own engage tools across side lanes.'
      },
      {
        signal: 'You have a hyper-carry top or mid with a strong 1v1/1v2 and the enemy has no reliable way to answer a side lane alone.',
        condition: 'Splitpush',
        action: 'Build a lead in a side lane while your other four hold the wave/objective pressure elsewhere - the threat of the split forces the enemy to split their own attention.'
      },
      {
        signal: 'Neither team has a clean all-in, but your comp has strong poke, zone control, or catch potential around neutral objectives.',
        condition: 'Objective control',
        action: 'Play around vision and objective timers directly - trade objectives for objectives instead of forcing a fight neither side wants.'
      }
    ]
  });
}

function renderObjectivePriorityTable() {
  return dataTable({
    columns: [
      { key: 'phase', label: 'Game State' },
      { key: 'priority', label: 'Priority Objective' },
      { key: 'reason', label: 'Why' }
    ],
    rows: [
      { phase: 'Early (0-14 min)', priority: 'First tower plates and the first dragon', reason: 'Plates convert lane pressure into permanent gold before they expire at 14 minutes; the first dragon is usually the least contested one all game.' },
      { phase: 'Mid (14-25 min)', priority: 'Herald/second-third dragon and mid-lane control', reason: 'Whichever team controls mid vision controls which objective gets contested uncontested - this is the phase where a read on the enemy jungler’s position matters most.' },
      { phase: 'Late (25+ min)', priority: 'Baron and the dragon soul objective', reason: 'A single won fight around Baron or soul point usually ends the game outright - this is the phase where win-condition identification matters most, since the wrong fight here is unrecoverable.' }
    ]
  });
}

function renderRankMistakeTable() {
  return dataTable({
    columns: [
      { key: 'rank', label: 'Rank Band' },
      { key: 'mistake', label: 'Common Macro Mistake' },
      { key: 'fix', label: 'The Fix' }
    ],
    rows: [
      { rank: 'Iron-Bronze', mistake: 'Rushing into fights with no read on whether the team actually wins them - fighting because a fight is available, not because it is favorable.', fix: 'Before engaging, count both teams’ summoner spells and ultimates on cooldown - if you cannot answer whether you win the fight, it is not yet time to take it.' },
      { rank: 'Silver-Gold', mistake: 'Ignoring wards and objective timers in favor of farming or dueling - winning the lane but losing the map.', fix: 'Set a personal rule: check the objective timer and place or check a ward every time you recall, not just when a fight is already starting.' },
      { rank: 'Platinum+', mistake: 'Identifying the correct win condition, then abandoning it mid-game the moment a single skirmish goes wrong, instead of trusting the read.', fix: 'Write your team’s win condition down (or say it in chat) at the 10-minute mark, then treat every decision after that as a test of whether it still holds - not a reason to panic and improvise a new plan.' }
    ]
  });
}

function renderMacroPlay() {
  const introHtml = `<h1>Macro Play and Win Condition Identification</h1>
    <p class="lead">Mechanics win lanes; macro decisions win games. This page covers how to read your team's actual win condition, which objective to prioritize at each phase of the game, and the macro mistakes that repeat at every rank - including the ones that only show up once the mechanics are no longer the problem.</p>`;

  const winConditionSection = `<section class="guide-section">
    <h2>Identifying Your Team's Win Condition</h2>
    <p>A win condition is a specific read on your own team comp against the enemy's, made explicit early enough to actually play around. Most teams have one of three shapes, and the fastest way to lose a winnable game is building an early lead correctly toward one win condition, then accidentally playing the rest of the game like a different one once the fighting starts.</p>
    ${renderWinConditionTable()}
    <p>Reconfirm this read every time the game state changes meaningfully - an item completes, a summoner spell goes on cooldown, a lane loses or gains a plate - rather than treating champion select as the only moment that decision gets made. See ${focusLink('objective-awareness')} for how this read connects to the timers that actually let you act on it.</p>
  </section>`;

  const objectivePrioritySection = `<section class="guide-section">
    <h2>Objective Priority by Game State</h2>
    <p>Every objective is worth taking eventually, but timing decides whether taking it right now helps or hurts: the same dragon that is a free, uncontested reset at 8 minutes can be a bait that loses the game at 28 minutes if it pulls your team away from Baron vision. Priority shifts across three broad phases.</p>
    ${renderObjectivePriorityTable()}
    ${callout('None of this replaces reading the actual game in front of you - these are defaults for when you have no stronger read, never a script to force blindly into a fight you can already see is lost.')}
  </section>`;

  const rankMistakesSection = `<section class="guide-section">
    <h2>Macro Mistakes by Rank</h2>
    <p>The specific macro mistake changes by rank, but the underlying pattern is the same one your lane-phase mistakes probably already showed: reacting to what's directly in front of you before reading the wider game state.</p>
    ${renderRankMistakeTable()}
    <p>Treat this table as a starting point - your own VOD review will find your specific repeat mistake faster than any generic list can.</p>
  </section>`;

  const focusIntegrationSection = `<section class="guide-section">
    <h2>How This Ties Into the 12 Focuses</h2>
    <p>Three focuses on the existing menu get their macro-game context filled in here:</p>
    <ul>
      <li>${focusLink('objective-awareness')} - the objective-priority table above is exactly what this focus measures: calling timers early enough to act on them, rather than just reacting once they spawn.</li>
      <li>${focusLink('death-cause')} - the Iron-Bronze row above (fighting because a fight is available) is usually the single biggest driver of a repeat death cause at that rank band.</li>
      <li>${focusLink('vision-cadence')} - the Silver-Gold row above (ignoring wards in favor of farming) is a vision-cadence problem wearing a macro-mistake label.</li>
    </ul>
    <p>New to the program? The <a href="${escapeHtml(site.url('focus-menu.html'))}">Focus Menu</a> is where you pick your first focus - base that choice on what your own baseline actually shows is weakest, not on whichever focus this page happened to mention.</p>
  </section>`;

  const sectionsHtml = `${winConditionSection}
    ${objectivePrioritySection}
    ${rankMistakesSection}
    ${focusIntegrationSection}`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#objective-timer-precall'), 'Run the Objective-Timer Pre-Call drill'],
      [site.url('drills.html#death-audit'), 'Run the Death Audit drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu'],
      [site.url('early-game.html'), 'Before macro: the first 15 minutes'],
      [site.url('wave-management.html'), 'Wave state feeds every read on this page: Wave Management']
    ])}
  </div>`;

  const description = 'A guide to League of Legends macro play: identifying your team’s win condition, objective priority by game state, and macro mistakes by rank.';
  return shell.documentShell({
    title: site.pageTitle('Macro Play and Win Condition Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('macro-play.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Macro Play and Win Condition Identification',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('macro-play.html')
    })
  });
}

module.exports = { renderMacroPlay };
