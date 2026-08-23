'use strict';

// early-game.html: a standalone content-gap page (not derived from
// content/guide.js's A1-A11 sections, unlike src/web/contentPages.js's
// pages) covering the first 15 minutes of a solo queue game -- first back
// timing, level 2/3 power spikes, win-condition identification, and
// role/rank-specific early mistakes. Follows src/web/pagesB3.js's
// freeform-page pattern (hand-written body HTML, not guide-block-rendered)
// since this content has no guide.js section to source from. Reuses the
// shared card()/dataTable()/checklistRow() primitives (src/render/html.js)
// so the page's structured content (win-condition table, role mistake
// table, first-back checklist) matches the visual language every other
// page on the site already uses.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, checklistRow, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`earlyGame.js: unknown focus id "${id}"`);
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

// Matches src/web/contentPages.js's and src/web/drillWarmupPages.js's own
// standardEndLinks() exactly -- duplicated rather than imported since
// neither module exports it and this is a third, independent caller.
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderFirstBackChecklist() {
  const items = [
    'You are recalling with a wave banked (a minion wave about to reach you or already pushed to your tower), not walking away from gold on the ground.',
    'You have priced out your next item before you recall, not after landing back in lane.',
    'Your gold covers a completed component or a full item, not a partial that leaves you weaker in the next trade than before you left.',
    'You checked the enemy jungler’s last-seen location before committing to the walk back, not just before the recall itself.'
  ];
  return `<div class="vod-checklist">${items.map(checklistRow).join('\n')}</div>`;
}

function renderWinConditionTable() {
  return dataTable({
    columns: [
      { key: 'signal', label: 'What You See By ~10 Minutes' },
      { key: 'condition', label: 'Likely Win Condition' },
      { key: 'action', label: 'What To Do About It' }
    ],
    rows: [
      {
        signal: 'You are ahead in CS and your lane opponent has recalled down a wave or more.',
        condition: 'Lane pressure',
        action: 'Keep shoving and threaten a plate or a recall-timer punish - do not leave for a low-value roam.'
      },
      {
        signal: 'Your jungler has ganked your lane twice and neither side has an item lead.',
        condition: 'Roam setup',
        action: 'Ask for or set up a freeze so your jungler’s next gank is a clean kill, not a coin flip.'
      },
      {
        signal: 'Your jungler is clearing fast and your lane is even.',
        condition: 'Jungle synergy',
        action: 'Play for your jungler’s first scuttle/objective contest instead of forcing something solo in lane.'
      }
    ]
  });
}

function renderRoleMistakeTable() {
  return dataTable({
    columns: [
      { key: 'role', label: 'Role' },
      { key: 'ironBronze', label: 'Iron-Bronze Mistake' },
      { key: 'goldPlat', label: 'Gold-Plat Mistake' }
    ],
    rows: [
      { role: 'Top', ironBronze: 'Walking up to trade with no wave state read, eating a freeze punish.', goldPlat: 'Holding a wave too long past level 6, missing the first item power spike window.' },
      { role: 'Jungle', ironBronze: 'Clearing out of order and arriving at ganks two levels behind.', goldPlat: 'Ganking a losing lane instead of snowballing the lane already ahead.' },
      { role: 'Mid', ironBronze: 'Overextending after a kill with no vision on either river entrance.', goldPlat: 'Missing the first roam window because the wave was never set up to freeze or shove first.' },
      { role: 'ADC', ironBronze: 'Contesting an all-in without checking if support’s spells are up.', goldPlat: 'Recalling on cooldown timing instead of on wave state, wasting a shove.' },
      { role: 'Support', ironBronze: 'Warding on a timer instead of on the enemy jungler’s actual pathing read.', goldPlat: 'Roaming off lane without telling the ADC to play safe first.' }
    ]
  });
}

function renderEarlyGame() {
  const introHtml = `<h1>Early Game Fundamentals: Your First 15 Minutes</h1>
    <p class="lead">Most solo queue games are decided, or set up to be decided, before the ten-minute mark. This page covers the four things that actually move the needle in that window: your first back, your level 2/3 spike, reading your team's win condition early, and the mistakes that repeat by role and rank.</p>`;

  const firstBackSection = `<section class="guide-section">
    <h2>First Back Timing and Item Priority</h2>
    <p>The most common early-game leak is not a bad trade - it's a bad recall. Recalling too early wastes travel time and a wave; recalling too late means playing several minions down while an opponent who timed theirs correctly gets a head start on the next power spike.</p>
    <p>The rule that actually works in practice: recall when the wave you're standing next to is already pushing toward your own tower and you can't get meaningful value staying for it. Don't recall on a fixed clock - recall on wave state.</p>
    <p>Item priority follows the same logic as everything else in this program: buy what closes the specific gap your baseline showed, not what a build guide lists first. A lane that's losing trades needs defensive stats before offense; a lane that's winning trades needs to close out the kill threshold on its next spike.</p>
    ${renderFirstBackChecklist()}
    <p>This is exactly what ${focusLink('recall-efficiency')} measures - if your low-value recall count is high, this is the first thing to fix.</p>
  </section>`;

  const powerSpikeSection = `<section class="guide-section">
    <h2>Level 2 and 3 Power Spikes</h2>
    <p>Level 2 arrives the moment either laner lands a third ability point - usually from the first minion wave crashing. Whoever hits level 2 first, and recognizes it first, gets a short window where a full combo wins a trade the opponent can't yet answer. Losing that window because you weren't tracking XP is a free trade given away for nothing.</p>
    <p>Level 3 works the same way but compounds: it's the first point most kits get real access to their full three-ability combo, which is also usually the point an all-in becomes threatening instead of just a poke trade. Track your own XP bar, not just your opponent's health bar - the spike is what makes the trade favorable, not the other way around.</p>
    <p>Jungle role reads this differently: a jungler's first clear puts them at level 3 or 4 by the time they reach a lane, which is exactly why a gank timed to a laner's own level 2 spike is so much stronger than one timed to nothing in particular.</p>
  </section>`;

  const winConditionSection = `<section class="guide-section">
    <h2>Identifying Your Win Condition Early</h2>
    <p>By the ten-minute mark, the game is usually already telling you which of three shapes it wants to take. Reading this early - instead of only realizing it in a 25-minute post-game replay - is what turns a lane lead into a game win instead of a wasted head start.</p>
    ${renderWinConditionTable()}
    <p>Getting this read right, then acting on it every game, is the whole difference between "playing well" and "playing to win" - see ${focusLink('objective-awareness')} for how this connects to mid-game macro decisions once the early window closes.</p>
  </section>`;

  const mistakesSection = `<section class="guide-section">
    <h2>Common Early Game Mistakes by Role and Rank</h2>
    <p>The specific mistake changes by rank, but the shape doesn't: lower ranks lose the early game mechanically (a missed trade, a bad clear order), higher ranks lose it structurally (a wave held too long, a roam with no setup). Neither is really about mechanics once you're past the fundamentals - both are about reading the game state before you commit.</p>
    ${renderRoleMistakeTable()}
    ${callout('If your own mistake isn’t on this table, that’s fine - the table is a starting list, not a diagnosis. Your own VOD review will find your specific repeat mistake faster than any generic list can.')}
  </section>`;

  const focusIntegrationSection = `<section class="guide-section">
    <h2>How This Ties Into the 12 Focuses</h2>
    <p>Nothing on this page is a new system on top of the program - it's the early-game context for three focuses you may already be holding:</p>
    <ul>
      <li>${focusLink('trade-discipline')} - the level 2/3 spike section above is exactly when a "favorable trade, then leave" decision gets made or missed.</li>
      <li>${focusLink('cs-per-min')} - first-back timing is the single biggest lever on your early CS/min, since a mistimed recall costs an entire wave.</li>
      <li>${focusLink('vision-cadence')} - the win-condition table above depends on knowing where the enemy jungler is, which is a vision-cadence problem before it's a decision-making one.</li>
    </ul>
    <p>If you haven't picked a focus yet, start at the <a href="${escapeHtml(site.url('focus-menu.html'))}">Focus Menu</a> and pick the one your baseline shows is weakest - this page is context for whichever one you land on, not a replacement for holding one at a time.</p>
  </section>`;

  const sectionsHtml = `${firstBackSection}
    ${powerSpikeSection}
    ${winConditionSection}
    ${mistakesSection}
    ${focusIntegrationSection}`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#recall-timing'), 'Run the Recall Timing drill'],
      [site.url('drills.html#trade-then-back'), 'Run the Trade-Then-Back Pattern drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu']
    ])}
  </div>`;

  const description = 'A guide to the first 15 minutes of League of Legends solo queue: first back timing, power spikes, win-condition reads, and mistakes by role and rank.';
  return shell.documentShell({
    title: site.pageTitle('Early Game Guide: First 15 Minutes'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('early-game.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Early Game Fundamentals: First 15 Minutes',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('early-game.html')
    })
  });
}

module.exports = { renderEarlyGame };
