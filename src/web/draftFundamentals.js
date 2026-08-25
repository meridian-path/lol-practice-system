'use strict';

// draft.html: a standalone content-gap page (not derived from any section of
// content/guide.js, same pattern as src/web/teamfighting.js/shotCalling.js)
// covering draft/champion-select fundamentals -- damage-type balance, pick
// order, and the comfort-pick principle. Genuinely distinct in kind from
// every other content-gap page on the site: all of them (early-game,
// macro-play, wave-management, vision, teamfighting, trading, objectives,
// comms) cover something that happens IN the game; draft is the one phase
// that happens before it, and nothing on the site addressed it before this
// page. Deliberately does NOT force a "How This Ties Into the 12 Focuses"
// section the way teamfighting.js/tradingDiscipline.js/objectiveControl.js/
// shotCalling.js do -- draft genuinely doesn't map onto any of the 12
// focuses (content/focuses.json), all of which measure something about
// play once a game has already started. Forcing 2-3 loose ties here would
// misrepresent the connection the way those other pages' real ties do not.
// Stays fully champion-agnostic throughout (damage types and pick-order
// principles only, no specific champion names) -- test/ip-hygiene.test.js's
// own denylist rules out naming any specific champion anywhere on this
// site, for real trademark-posture reasons, not a style choice.
// Reuses the shared dataTable()/callout() primitives (src/render/html.js),
// matching every sibling content-gap page's approach.

const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

function crossLinks(links) {
  const items = links.map(([href, label]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join('\n      ');
  return `<nav class="cross-links" aria-label="Related pages">
      <ul>
      ${items}
      </ul>
    </nav>`;
}

// Matches every sibling content-gap page's own standardEndLinks() exactly --
// duplicated rather than imported since none of them export it (see those
// files' own headers for the same accepted-duplication note).
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderDamageTypeSection() {
  return `<section class="guide-section">
    <h2>Damage-Type Balance Is a Draft Decision, Not an In-Game One</h2>
    <p>A team stacked heavily toward one damage type is easier to itemize against than a mixed one - the enemy team needs one or two well-timed defensive items to blunt most of what your team can do, instead of having to split their gold and item slots two ways. This is a draft-phase problem: by the time it's visible in a scoreboard, the picks that caused it are long since locked in.</p>
    ${callout('The imbalance does not need to be total to matter - a team with only a small minority of its damage in the second type is still meaningfully easier to build against than one closer to an even split.')}
    <p>Checking this takes one habit: after your team's fourth pick, take five seconds to count damage types before locking the fifth. If it's already lopsided, that's real information for the last pick to weigh - not a guarantee they can or should fix it alone, but a read nobody else on the team is likely making in the moment.</p>
  </section>`;
}

function renderPickOrderTable() {
  return dataTable({
    columns: [
      { key: 'position', label: 'Pick Position' },
      { key: 'principle', label: 'What The Position Actually Allows' }
    ],
    rows: [
      { position: 'Early (1st-2nd pick, your side)', principle: 'The least information available and the most exposure to a counter-pick later in the same draft - favors a flexible, hard-to-punish choice over a high-ceiling, high-risk one.' },
      { position: 'Middle', principle: 'Some read on both teams\' shape so far, but still committing before the draft is finished - a reasonable point to react to an obvious gap (a damage-type imbalance, a missing frontline) rather than only to lock a preference.' },
      { position: 'Late (final pick, either side)', principle: 'Maximum information, minimum exposure - the pick with the least risk in the whole draft, since it reacts to everything already shown with nothing left to counter it.' }
    ]
  });
}

function renderPickOrderSection() {
  return `<section class="guide-section">
    <h2>Pick Order Changes What the Correct Pick Is</h2>
    <p>The same champion can be a correct pick in one draft position and a real risk in another - pick order is not a formality, it's the single biggest input into how safe a given choice actually is.</p>
    ${renderPickOrderTable()}
  </section>`;
}

function renderComfortPickSection() {
  return `<section class="guide-section">
    <h2>Comfort Beats Optimal in Solo Queue</h2>
    <p>A coordinated team can draft around a theoretically stronger pick because they can also coordinate the game plan that makes it work. Solo queue offers no such coordination - four strangers are not going to play around a pick they didn't know was coming, which means the pick's own ceiling matters far less than whether the player on it can actually execute it under pressure, every single game, without needing help to do it.</p>
    ${renderMistakeTable()}
  </section>`;
}

function renderMistakeTable() {
  return dataTable({
    columns: [
      { key: 'rank', label: 'Rank Band' },
      { key: 'mistake', label: 'Common Draft Mistake' },
      { key: 'fix', label: 'The Fix' }
    ],
    rows: [
      { rank: 'Iron-Bronze', mistake: 'Locking whatever felt strong in the last game played, regardless of matchup or team shape.', fix: 'Pick from a short list of 2-3 champions genuinely practiced enough to play on autopilot under pressure - the list matters more than which one gets picked this game.' },
      { rank: 'Silver-Gold', mistake: 'Reaching for a mechanically harder, higher-ceiling pick specifically because the last few games were losses.', fix: 'A losing streak is a signal to simplify decision-making, not add difficulty - stay on the comfort list until the streak itself is understood, not just outlasted.' },
      { rank: 'Platinum+', mistake: 'Locking a pick before checking the team\'s emerging damage-type shape, then discovering the imbalance only once it shows up in a fight.', fix: 'Make the damage-type check a fixed step before every non-first lock, not an occasional afterthought once a game already feels lopsided.' }
    ]
  });
}

function renderDraftFundamentals() {
  const introHtml = `<h1>Draft Fundamentals: Damage Balance, Pick Order, and Comfort</h1>
    <p class="lead">Every other page in this program covers something that happens once a game has already started. This one covers the ten minutes before that: the draft decisions that shape how winnable the game already is by the time anyone loads in.</p>`;

  const sectionsHtml = `${renderDamageTypeSection()}
    ${renderPickOrderSection()}
    ${renderComfortPickSection()}
    <section class="guide-section">
      <h2>Draft Doesn't Fit Into the 12 Focuses, and That's Fine</h2>
      <p>Every focus on the <a href="${escapeHtml(site.url('focus-menu.html'))}">Focus Menu</a> measures something about how a game is played once it starts - CS, wave state, vision, objective timers, comms. Draft happens before any of that, which is exactly why it doesn't have a focus of its own here: it isn't a skill to hold for a block of games the way the other 12 are, it's a fixed decision made once per game, and the habits on this page are meant to become automatic rather than tracked.</p>
    </section>`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('focus-menu.html'), 'See the full Focus Menu'],
      [site.url('early-game.html'), 'What happens next: Early Game Fundamentals'],
      [site.url('macro-play.html'), 'How draft shows up later: identifying your win condition']
    ])}
  </div>`;

  const description = 'A guide to League of Legends draft fundamentals: damage-type balance, pick-order principles, and the comfort-pick-over-optimal-pick rule for solo queue.';
  return shell.documentShell({
    title: site.pageTitle('Draft Fundamentals Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('draft.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Draft Fundamentals: Damage Balance, Pick Order, and Comfort',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('draft.html')
    })
  });
}

module.exports = { renderDraftFundamentals };
