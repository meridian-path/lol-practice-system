'use strict';

// teamfighting.html: a standalone content-gap page (not derived from any
// section of content/guide.js, same pattern as src/web/earlyGame.js) covering
// teamfighting fundamentals -- target priority, positioning by archetype,
// and the engage/disengage read -- tied to the existing 12-focus framework.
// Genuinely missing topic area: the 12 focuses and the other content-gap
// pages (early-game/macro-play/wave-management/vision) cover laning-phase
// and macro fundamentals, but nothing on this site addresses the teamfight
// itself. Anchored primarily to the "death-cause" focus -- a teamfight
// positioning/target-priority mistake is very often the literal
// cause-of-death category that focus already measures -- rather than
// forced onto a focus that does not fit as cleanly. Reuses the shared
// dataTable()/callout() primitives (src/render/html.js), matching every
// sibling content-gap page's approach.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`teamfighting.js: unknown focus id "${id}"`);
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
// and src/web/visionWarding.js's own standardEndLinks() exactly -- duplicated
// rather than imported since none of them export it and this is a seventh,
// independent caller (same accepted duplication those files' own headers
// already note).
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderTargetPriorityTable() {
  return dataTable({
    columns: [
      { key: 'instinct', label: 'What Instinct Picks' },
      { key: 'correct', label: 'What Actually Wins the Fight' }
    ],
    rows: [
      { instinct: 'The enemy carry, because they deal the most damage.', correct: 'Whichever enemy is both in range and unprotected right now - a carry sitting safely behind their own frontline is out of reach until that changes.' },
      { instinct: 'Whoever your team is already focusing, out of habit.', correct: 'A fresh read on who is exposed this exact second - the target that was correct three seconds ago may already be peeled or repositioned.' },
      { instinct: 'The lowest-health enemy, to secure a kill.', correct: 'The lowest-health enemy only if reaching them does not walk you into the rest of their team - a kill that costs your own life is rarely a good trade.' }
    ]
  });
}

function renderTargetPrioritySection() {
  return `<section class="guide-section">
    <h2>Target Priority: the One Decision That Decides Most Fights</h2>
    <p>The correct target in a teamfight is whichever enemy you can actually damage without dying to reach them. That target changes constantly as the fight develops, since positions, cooldowns, and who is currently exposed all shift second by second - treating the first target you clicked as the target for the whole fight is how a promising engage falls apart.</p>
    ${renderTargetPriorityTable()}
    ${callout('This is the single mistake that separates most losing fights from winning ones at every rank below the very top: reaching for the best available target instead of the safely reachable one.')}
  </section>`;
}

function renderPositioningSection() {
  return `<section class="guide-section">
    <h2>Positioning By Archetype</h2>
    <p>The right position depends entirely on what your champion is trying to accomplish in that specific fight: dealing damage safely, absorbing it, or creating an opening for someone else to do either.</p>
    <ul>
      <li><strong>Ranged damage (most ADCs, ranged mages):</strong> play at maximum attack range behind your own frontline, forcing the enemy to fight through your team to reach you. Landing one big hit from an exposed angle only helps if you survive the fight that follows it.</li>
      <li><strong>Frontline (tanks, most bruisers):</strong> your job is absorbing damage and creating space for your team, which usually means committing early. A frontline that hangs back with the damage dealers leaves nothing between the enemy and your own carries.</li>
      <li><strong>Flex melee (some fighters, divers):</strong> your role shifts by matchup - sometimes you start the fight, sometimes you answer whoever the enemy sends at your own backline. Read the matchup before the fight starts so the decision is already made once it does.</li>
    </ul>
    <p>The correct spot at the moment a fight starts is rarely the correct spot ten seconds later, once cooldowns are used and the frontline has moved - keep re-reading your own position as the fight develops, the same way you re-read the target.</p>
  </section>`;
}

function renderEngageSection() {
  return `<section class="guide-section">
    <h2>Deciding Whether To Fight At All</h2>
    <p>Positioning and target priority only matter once a fight is already the right call. That decision - whether this is a fight worth taking - is a macro read, not a mechanical one, and it is covered in full on <a href="${escapeHtml(site.url('macro-play.html'))}">Macro Play and Win Condition Identification</a>: the same win-condition and objective-priority tables that decide whether to group for a fight in the first place also decide whether the fight you are already in is worth finishing or worth abandoning.</p>
    <p>The one addition specific to the fight itself, once it has started: pulling back from a fight that has turned - because the target you needed is dead, unreachable, or the enemy has more left than expected - is its own legitimate decision, worth making deliberately rather than defaulting into committing further. A correct engage still turns into a lost game if the fight is pushed past the point it can actually be won.</p>
  </section>`;
}

function renderMistakeTable() {
  return dataTable({
    columns: [
      { key: 'rank', label: 'Rank Band' },
      { key: 'mistake', label: 'Common Teamfight Mistake' },
      { key: 'fix', label: 'The Fix' }
    ],
    rows: [
      { rank: 'Iron-Bronze', mistake: 'Fighting from the front regardless of role, because that is where the action is visible.', fix: 'Before every fight, name your own role in it out loud (deal damage from range, absorb damage, or create an opening) and position for that specific job.' },
      { rank: 'Silver-Gold', mistake: 'Locking onto one target for the whole fight and chasing them across the map, even once they are clearly unreachable.', fix: 'Re-check target priority every couple of seconds instead of once at the start - the correct target now is rarely the one you first clicked.' },
      { rank: 'Platinum+', mistake: 'Continuing to commit into a fight that has already turned, because backing out feels like wasting the engage.', fix: 'Ask "do I still win this" continuously through the fight, and treat pulling back as a legitimate answer to that question at any point, not only at the start.' }
    ]
  });
}

function renderTeamfighting() {
  const introHtml = `<h1>Teamfighting Fundamentals: Positioning and Target Priority</h1>
    <p class="lead">Laning and macro decisions set up the fight. This page covers the fight itself: who to target, where to stand, and how to tell whether a fight already in progress is still worth finishing - the skill area that keeps separating players once CS, wave state, and objective timers stop being the problem.</p>`;

  const sectionsHtml = `${renderTargetPrioritySection()}
    ${renderPositioningSection()}
    ${renderEngageSection()}
    <section class="guide-section">
      <h2>Mistakes By Rank</h2>
      <p>Every rank band below makes a version of the same underlying error: reacting to what is directly in front of them instead of running the target-priority and positioning read continuously through the whole fight.</p>
      ${renderMistakeTable()}
    </section>
    <section class="guide-section">
      <h2>How This Ties Into the 12 Focuses</h2>
      <p>Teamfighting does not have one dedicated focus of its own, but three existing focuses meet directly at this page:</p>
      <ul>
        <li>${focusLink('death-cause')} - a bad target-priority call or a positioning mistake is one of the most common actual causes behind a repeat death, even when it gets logged under a different label.</li>
        <li>${focusLink('minimap-awareness')} - tracking where the enemy team actually is before a fight starts is what makes an accurate engage-or-not read possible in the first place.</li>
        <li>${focusLink('objective-awareness')} - most teamfights that matter happen around a contested objective, so the timer that tells you a fight is coming is the same one that tells you whether taking it is worth it.</li>
      </ul>
      <p>None of this replaces picking an actual focus to hold for a block of games - it is context for whichever one your baseline points you toward, teamfighting-related or not.</p>
    </section>`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#death-audit'), 'Run the Death Audit drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu'],
      [site.url('macro-play.html'), 'Deciding whether a fight is worth having: Macro Play and Win Condition Identification']
    ])}
  </div>`;

  const description = 'A guide to League of Legends teamfighting fundamentals: target priority, positioning by archetype, and when to engage or disengage.';
  return shell.documentShell({
    title: site.pageTitle('Teamfighting Fundamentals Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('teamfighting.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Teamfighting Fundamentals: Positioning and Target Priority',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('teamfighting.html')
    })
  });
}

module.exports = { renderTeamfighting };
