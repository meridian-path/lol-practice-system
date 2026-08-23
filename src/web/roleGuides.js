'use strict';

// climbing-{role}.html: 5 standalone content-gap pages (one per role: Top,
// Jungle, Mid, ADC, Support), not derived from content/guide.js's A1-A11
// sections. Follows src/web/earlyGame.js's own freeform-page pattern
// (hand-written body HTML, not guide-block-rendered) and reuses the same
// shared card()/dataTable()/callout() primitives (src/render/html.js) so
// these pages match the visual language every other page already uses.
// Each page covers rank-tier climbing goals (Iron-Silver, Silver-Gold,
// Gold-Plat, Plat+), that role's own win condition, common mistakes by
// rank, and the role's tie-in to the site's existing 12-focus program.
// One shared build function (buildRoleGuide) renders all 5 pages from
// per-role data below -- the section order and headings are intentionally
// identical across the 5 (an established site convention, matching how
// earlyGame.html and macro-play.html both structure "intro, content
// sections, focus integration, end links"), but every sentence of prose
// is written per-role and does not repeat across pages.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`roleGuides.js: unknown focus id "${id}"`);
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
// src/web/earlyGame.js's own standardEndLinks() exactly -- duplicated
// rather than imported since none of them export it and this is a fourth,
// independent caller.
function standardEndLinks(extra = []) {
  return crossLinks([
    ...extra,
    [site.url('tracker.html'), 'Get the free tracker spreadsheet'],
    [site.url('downloads.html'), 'Download the full printable pack']
  ]);
}

function renderRankTierTable(rows) {
  return dataTable({
    columns: [
      { key: 'band', label: 'Rank Band' },
      { key: 'goal', label: 'Primary Goal' },
      { key: 'blocker', label: 'What Usually Blocks It' }
    ],
    rows
  });
}

function renderMistakeTable(rows) {
  return dataTable({
    columns: [
      { key: 'phase', label: 'Phase' },
      { key: 'ironBronze', label: 'Iron-Bronze Mistake' },
      { key: 'goldPlat', label: 'Gold-Plat+ Mistake' }
    ],
    rows
  });
}

function buildRoleGuide(data) {
  const introHtml = `<h1>${escapeHtml(data.h1)}</h1>
    <p class="lead">${data.leadHtml}</p>`;

  const winConditionSection = `<section class="guide-section">
    <h2>${escapeHtml(data.winConditionHeading)}</h2>
    ${data.winConditionHtml}
  </section>`;

  const rankTierSection = `<section class="guide-section">
    <h2>Climbing Goals By Rank</h2>
    <p>${data.rankTierIntroHtml}</p>
    ${renderRankTierTable(data.rankTiers)}
  </section>`;

  const mistakesSection = `<section class="guide-section">
    <h2>Common Mistakes By Rank</h2>
    <p>${data.mistakesIntroHtml}</p>
    ${renderMistakeTable(data.mistakes)}
  </section>`;

  const focusItems = data.focusIntegration.map(
    ([id, text]) => `<li>${focusLink(id)} - ${text}</li>`
  ).join('\n      ');

  const focusIntegrationSection = `<section class="guide-section">
    <h2>How This Ties Into the 12 Focuses</h2>
    <p>${data.focusIntroHtml}</p>
    <ul>
      ${focusItems}
    </ul>
    <p>${data.closerHtml}</p>
  </section>`;

  const sectionsHtml = `${winConditionSection}
    ${rankTierSection}
    ${mistakesSection}
    ${focusIntegrationSection}`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks(data.endLinks)}
  </div>`;

  return shell.documentShell({
    title: site.pageTitle(data.metaTitle),
    description: data.description,
    bodyHtml: body,
    canonical: site.absoluteUrl(data.slug),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: data.h1,
      description: data.description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl(data.slug)
    })
  });
}

const TOP = {
  slug: 'climbing-top.html',
  metaTitle: 'Top Lane Climbing Guide',
  description: 'A rank-by-rank guide to climbing in the top lane: wave management, Teleport as a map tool, split-push timing, and the mistakes that repeat by rank.',
  h1: 'Top Lane: A Rank-by-Rank Climbing Guide',
  leadHtml: 'Top lane is the most isolated lane on the map, which means its win condition is built almost entirely from two things: who controls the wave, and who uses Teleport better. Everything below is organized around those two levers, broken down by what actually changes as you climb.',
  winConditionHeading: 'What Wins the Top Lane Matchup',
  winConditionHtml: `<p>A top laner's win condition starts as a 1v1 read and grows into a map-wide threat. Early on, it is entirely about wave management: holding a freeze or a slow push denies your opponent CS and sets up a clean gank window without you doing anything risky yourself. That control is the actual foundation - a top laner who wins the wave usually wins the lane, independent of who "wins" any individual trade.</p>
    <p>Once Teleport is up on both sides, the lane stops being purely local. A top laner who tracks the enemy Teleport cooldown alongside their own can use it to swing a bot lane skirmish or answer a dive, turning an isolated lane into a map resource. At the highest rank bands, this becomes full split-push pressure: threatening the side lane hard enough that the enemy has to commit two players to answer it, buying a numbers advantage everywhere else on the map.</p>`,
  rankTierIntroHtml: 'The specific goal changes with rank, but each one builds directly on the last - you cannot split-push effectively in Plat+ if the wave-management fundamentals from Iron-Silver never solidified.',
  rankTiers: [
    { band: 'Iron-Silver', goal: 'Survive the 1v1 without feeding it - see all-ins coming before they land.', blocker: 'No wave-state read yet, so trades happen at random moments instead of on a plan.' },
    { band: 'Silver-Gold', goal: 'Hold a freeze or a slow push on purpose, to control the opponent\'s CS.', blocker: 'Wave management is understood in theory but breaks down the moment a trade happens mid-freeze.' },
    { band: 'Gold-Plat', goal: 'Use Teleport as a map tool, not just a recall shortcut.', blocker: 'TP gets tracked only for personal recalls, never against the enemy top laner\'s own TP cooldown.' },
    { band: 'Plat+', goal: 'Threaten a split push hard enough that the enemy has to send two players to answer it.', blocker: 'The threat itself is real, but the exact moment to commit to the split versus group with the team is still misread.' }
  ],
  mistakesIntroHtml: 'Top lane rank tends to stall on two specific habits: a laning-phase read that never quite solidifies, and a second one that only shows up once Teleport and side-lane pressure enter the picture.',
  mistakes: [
    { phase: 'Laning Phase', ironBronze: 'Pushing the wave to the enemy tower for no reason, handing CS to tower aggro and losing freeze control.', goldPlat: 'Holding a freeze correctly but missing the power-spike window to actually cash it in on a trade.' },
    { phase: 'Mid/Late Game', ironBronze: 'Split-pushing alone with Teleport on cooldown, dying to a rotation with no way to answer it.', goldPlat: 'Holding the side lane too long after a teamfight has already started elsewhere, arriving too late to matter.' }
  ],
  focusIntroHtml: 'Three focuses on the existing menu get their top-lane context filled in here:',
  focusIntegration: [
    ['wave-management', 'this is the core top-lane skill - the freeze/slow-push control described above is exactly what this focus measures.'],
    ['trade-discipline', 'a favorable trade only matters if you leave before it turns; the Gold-Plat laning mistake above is a trade-discipline problem wearing a wave-management label.'],
    ['recall-efficiency', 'a recall timed to wave state rather than a fixed clock is what lets you hold a freeze without losing tempo to an unnecessary trip back.']
  ],
  closerHtml: 'Haven\'t started the program yet? The <a href="' + '__FOCUS_MENU__' + '">Focus Menu</a> is the actual starting point - pick whichever focus your own baseline shows is weakest, then come back here for the top-lane-specific version of it.',
  endLinks: [
    [site.url('drills.html#wave-freeze-setup'), 'Run the Wave-Freeze Setup drill'],
    [site.url('drills.html#trade-then-back'), 'Run the Trade-Then-Back Pattern drill'],
    [site.url('focus-menu.html'), 'See the full Focus Menu'],
    [site.url('wave-management.html'), 'Wave Management, the mechanic behind this page\'s freeze/slow-push control'],
    [site.url('macro-play.html'), 'Macro Play and Win Condition, for the split-push read at Plat+']
  ]
};

const JUNGLE = {
  slug: 'climbing-jungle.html',
  metaTitle: 'Jungle Climbing Guide',
  description: 'A rank-by-rank guide to climbing as jungle: clear efficiency, reading which lane to gank, objective timing, and the mistakes that repeat by rank.',
  h1: 'Jungle: A Rank-by-Rank Climbing Guide',
  leadHtml: 'Jungle is the one role whose win condition is a choice, made over and over, every couple of minutes: farm, gank, or take an objective. Getting that choice right more often than your opposing jungler is most of what separates one rank band from the next.',
  winConditionHeading: 'What Wins You Games From the Jungle',
  winConditionHtml: `<p>A jungler's win condition is tempo: using an efficient clear to arrive at the right camp, lane, or objective at the moment it matters most. Clear speed matters because it buys the time to gank a lane that's actually ahead, or to reach a scuttle crab or Dragon before the enemy jungler does.</p>
    <p>Reading which lane to reinforce is the single highest-leverage decision in the role. A gank into an already-winning lane snowballs a lead that was already forming; a gank into an even or losing lane usually spends jungle time for a coin-flip result. As rank climbs, this same read extends to objectives: contesting Dragon or Herald with vision and a timing plan, rather than just showing up with the most damage.</p>`,
  rankTierIntroHtml: 'Each rank band adds a wider read on top of the last - clear efficiency has to be solid before gank-lane selection matters, and gank-lane selection has to be solid before full map-tempo control is possible.',
  rankTiers: [
    { band: 'Iron-Silver', goal: 'Clear a full route without dying to an invade or a bad counter-gank.', blocker: 'No read on the enemy jungler\'s starting side, so an invade lands as a total surprise.' },
    { band: 'Silver-Gold', goal: 'Gank the lane that\'s actually winning or actually gankable, not just the first one pinged.', blocker: 'Ganks get chosen by proximity or a teammate\'s ping spam instead of a real read on which lane converts a gank into a lead.' },
    { band: 'Gold-Plat', goal: 'Win contested scuttle crabs and early Dragons through vision and timing.', blocker: 'Objective vision gets placed reactively, after the enemy jungler is already spotted near the pit, instead of before.' },
    { band: 'Plat+', goal: 'Control tempo across the whole map - path toward whichever objective actually swings the game.', blocker: 'Pathing still optimizes for personal farm efficiency over the read on which objective matters most right now.' }
  ],
  mistakesIntroHtml: 'Ask what actually holds junglers back and the answer is almost always one of two things: which lane got picked for a gank, or how an objective got played.',
  mistakes: [
    { phase: 'Early Clears/Ganks', ironBronze: 'Dying to an invade because the enemy jungler\'s starting side was never tracked.', goldPlat: 'Ganking a lane that\'s already losing instead of reinforcing the lane that\'s already ahead.' },
    { phase: 'Objectives', ironBronze: 'Contesting Dragon or Herald with zero vision on the pit, fighting blind into a numbers disadvantage.', goldPlat: 'Clearing one more camp instead of taking a free, uncontested objective that was already lined up.' }
  ],
  focusIntroHtml: 'Three focuses on the existing menu get their jungle-specific context filled in here:',
  focusIntegration: [
    ['jungle-efficiency', 'a fast, consistent clear is the foundation everything else above is built on - if ganks and objectives always feel late, this is usually where to start.'],
    ['objective-awareness', 'calling and acting on Dragon/Herald timers before they spawn is exactly the objective read described above.'],
    ['minimap-awareness', 'tracking the enemy jungler\'s position is what turns "gank the lane that\'s ahead" from a guess into an actual read.']
  ],
  closerHtml: 'If none of the twelve focuses are picked yet, the <a href="' + '__FOCUS_MENU__' + '">Focus Menu</a> is where that decision actually gets made - start with whichever one the baseline flags as weakest, jungle-specific or not, and treat this page as the jungle lens on it.',
  endLinks: [
    [site.url('drills.html#jungle-clear-timing'), 'Run the Jungle Clear Timing drill'],
    [site.url('drills.html#objective-timer-precall'), 'Run the Objective-Timer Pre-Call drill'],
    [site.url('vision.html'), 'Vision around your own camps and pits, in depth: Vision and Warding'],
    [site.url('focus-menu.html'), 'See the full Focus Menu'],
    [site.url('macro-play.html'), 'Objective priority and win conditions, mapped out in full: Macro Play'],
    [site.url('early-game.html'), 'What the early clear and first ganks are actually setting up: Early Game Fundamentals']
  ]
};

const MID = {
  slug: 'climbing-mid.html',
  metaTitle: 'Mid Lane Climbing Guide',
  description: 'A rank-by-rank guide to climbing in mid lane: surviving ganks, timing roams to wave state and objective timers, and the mistakes that repeat by rank.',
  h1: 'Mid Lane: A Rank-by-Rank Climbing Guide',
  leadHtml: 'Mid lane sits in the center of the map, which makes its win condition different from a side lane\'s: it is less about winning the 1v1 outright and more about using that central position - and the lane\'s own wave state - to influence everything around it.',
  winConditionHeading: 'What Wins You Games From Mid',
  winConditionHtml: `<p>Before a mid laner can roam anywhere, they have to survive the ganks their own central, exposed position invites. That means tracking the enemy jungler through missing pings and camp timers, and treating river vision as part of laning, not an extra.</p>
    <p>Once lane is safe, mid's actual win condition kicks in: using wave state to enable a roam, or denying the enemy's own roam by holding a freeze. A roam only pays off when it is timed to something real - a jungler's objective setup, a side lane that's already pushed - rather than triggered by a kill that simply looks available. Get that timing right consistently, and mid becomes the lane that decides where the map's next fight happens.</p>`,
  rankTierIntroHtml: 'Survivability comes first, then wave control, then roam timing tied to the wider game - each rank band below assumes the one before it is already solid.',
  rankTiers: [
    { band: 'Iron-Silver', goal: 'Stop dying to ganks - track the enemy jungler through missing pings and camp timers.', blocker: 'Minimap glances happen only after a gank has already started, not before.' },
    { band: 'Silver-Gold', goal: 'Use wave state on purpose - push to enable a roam, freeze to deny the enemy\'s own roam.', blocker: 'Wave state gets left to chance, so a roam either isn\'t available when it\'s needed or crashes into the friendly tower.' },
    { band: 'Gold-Plat', goal: 'Time roams to jungler objective timers instead of to whenever a kill looks tempting.', blocker: 'Roams still get triggered by a flashy opportunity rather than a Herald or Dragon timer.' },
    { band: 'Plat+', goal: 'Use mid\'s central position to influence both side lanes and river vision at once.', blocker: 'Map influence is understood conceptually, but the moment-to-moment choice of where to apply it still lags the read.' }
  ],
  mistakesIntroHtml: 'Mid lane rank stalls on the same two habits at almost every level: surviving lane long enough for the rest of the kit to matter, and timing a roam once it\'s actually safe to leave.',
  mistakes: [
    { phase: 'Laning Phase', ironBronze: 'Overextending past the minion wave with no river vision, dying to a fully telegraphed gank.', goldPlat: 'Roaming the instant a kill looks available, missing that the wave was about to crash into the friendly tower.' },
    { phase: 'Roam Timing', ironBronze: 'Never leaving lane at all, even when wave state and jungler position both say the roam is free.', goldPlat: 'Roaming to a lane that doesn\'t need the help instead of the one an objective timer actually calls for.' }
  ],
  focusIntroHtml: 'Three focuses on the existing menu get their mid-lane context filled in here:',
  focusIntegration: [
    ['wave-management', 'the push-to-roam, freeze-to-deny pattern above is exactly what this focus measures.'],
    ['objective-awareness', 'timing a roam to a Herald or Dragon spawn instead of to a stray kill opportunity is this focus, applied to mid specifically.'],
    ['vision-cadence', 'the river vision that keeps you alive in lane is the same habit that lets you see a roam window before it closes.']
  ],
  closerHtml: 'Run the baseline first if a focus isn\'t locked in yet - the <a href="' + '__FOCUS_MENU__' + '">Focus Menu</a> will show which of the twelve is weakest, and this page becomes the mid-specific detail for whichever one that turns out to be.',
  endLinks: [
    [site.url('drills.html#wave-freeze-setup'), 'Run the Wave-Freeze Setup drill'],
    [site.url('drills.html#objective-timer-precall'), 'Run the Objective-Timer Pre-Call drill'],
    [site.url('focus-menu.html'), 'See the full Focus Menu'],
    [site.url('wave-management.html'), 'The push-to-roam, freeze-to-deny mechanic in full: Wave Management'],
    [site.url('macro-play.html'), 'Timing a roam to the wider game: Macro Play and Win Condition']
  ]
};

const ADC = {
  slug: 'climbing-adc.html',
  metaTitle: 'ADC Climbing Guide',
  description: 'A rank-by-rank guide to climbing as ADC: farming under pressure, itemizing for the real threat, teamfight positioning, and the mistakes that repeat by rank.',
  h1: 'ADC: A Rank-by-Rank Climbing Guide',
  leadHtml: 'ADC\'s win condition is less about dominating the early lane and more about surviving it intact: staying safe and farmed enough to reach the item spikes that make the role\'s damage matter, then landing that damage from a position that doesn\'t get you killed.',
  winConditionHeading: 'What Actually Wins an ADC Game',
  winConditionHtml: `<p>Early on, the job is narrower than it looks: keep CS up, even under pressure, and don't die to an all-in the enemy support could clearly set up. A missed all-in read costs more than a missed CS wave, since it also costs the item spike that CS was building toward.</p>
    <p>Past laning phase, the win condition shifts to positioning. The same damage that wins a fight from behind the front line loses it from the front line, focused down in the first three seconds. Consistently finding that position under pressure - and itemizing for whichever enemy threat is actually doing the damage, rather than a generic build order - is what separates a carry performance from a lane lead that quietly evaporates by 25 minutes.</p>`,
  rankTierIntroHtml: 'Each rank band shifts the hardest part of the role forward - from surviving lane, to reading trades, to itemization, to fight positioning under real pressure.',
  rankTiers: [
    { band: 'Iron-Silver', goal: 'Keep CS up even when the enemy is pushing you under tower.', blocker: 'Farming under pressure feels risky enough that CS gets abandoned instead of played around.' },
    { band: 'Silver-Gold', goal: 'Coordinate trades with the support instead of trading alone.', blocker: 'Trades still get taken on instinct, without checking what the support\'s cooldowns can actually back up.' },
    { band: 'Gold-Plat', goal: 'Itemize for the specific threat that\'s actually killing you, not a generic build order.', blocker: 'Item choices follow a build guide\'s default order regardless of which enemy champion is dealing the damage.' },
    { band: 'Plat+', goal: 'Hold teamfight positioning under focus fire without giving up damage output.', blocker: 'Positioning is correct at the start of a fight but drifts forward as the fight goes on, chasing one more auto.' }
  ],
  mistakesIntroHtml: 'For ADC, the pattern holding back most climbs shows up in two different phases of the game: how lane gets played under pressure, and how fights get positioned once it ends.',
  mistakes: [
    { phase: 'Laning Phase', ironBronze: 'Attack-moving into range without checking whether the enemy support\'s engage tool is up.', goldPlat: 'Losing CS to a freeze the enemy is holding instead of matching their wave management.' },
    { phase: 'Teamfights', ironBronze: 'Standing in the front line on instinct instead of positioning behind the tank or bruiser line.', goldPlat: 'Taking one more auto-attack in a fight that\'s already lost, dying for damage that no longer changes the outcome.' }
  ],
  focusIntroHtml: 'Three focuses on the existing menu get their ADC-specific context filled in here:',
  focusIntegration: [
    ['pressured-farming', 'this is the exact skill the Iron-Silver row above is asking for - keeping CS up under tower pressure instead of giving up the wave.'],
    ['cs-per-min', 'the item spikes the win-condition section above depends on only arrive on schedule if CS/min holds up across the whole laning phase.'],
    ['trade-discipline', 'a coordinated trade only pays off if you also disengage cleanly afterward, rather than staying in range for one extra hit.']
  ],
  closerHtml: 'Still deciding where to start? Open the <a href="' + '__FOCUS_MENU__' + '">Focus Menu</a> and go with whatever your own baseline flags as weakest - the ADC-specific version of it is right here once you\'ve picked.',
  endLinks: [
    [site.url('drills.html#last-hit-under-tower'), 'Run the Last-Hit Under Tower drill'],
    [site.url('drills.html#cs-10min'), 'Run the 10-Minute CS Drill'],
    [site.url('focus-menu.html'), 'See the full Focus Menu'],
    [site.url('early-game.html'), 'The first-back and power-spike timing that sets up your own early lane: Early Game Fundamentals'],
    [site.url('wave-management.html'), 'Reading the freeze the enemy laner is holding against you: Wave Management']
  ]
};

const SUPPORT = {
  slug: 'climbing-support.html',
  metaTitle: 'Support Climbing Guide',
  description: 'A rank-by-rank guide to climbing as support: proactive vision, real kill-window engages, objective-timer coverage, and the mistakes that repeat by rank.',
  h1: 'Support: A Rank-by-Rank Climbing Guide',
  leadHtml: 'Support is the one role whose win condition rarely shows up on the scoreboard directly: it is measured in the vision that lets a team see fights coming, and the engage timing that turns a landed spell into an actual kill window for someone else.',
  winConditionHeading: 'What Wins You Games From Support',
  winConditionHtml: `<p>Early vision is the foundation: wards placed on a real rhythm, tied to what the lane or jungler timer actually needs, rather than a fixed schedule regardless of the game state. From there, engage timing matters as much as the engage itself - landing a key spell only helps if the ADC or jungler is actually positioned to follow it up before it's wasted.</p>
    <p>As the game moves past laning phase, the same vision habit has to extend outward, covering objective timers instead of just the lane. A support who can roam to set up a Dragon or Herald window - without leaving the ADC exposed while doing it - is directly translating vision and timing into map-wide pressure, which is the role's real win condition at every rank above the earliest ones.</p>`,
  rankTierIntroHtml: 'Vision comes first, then engage timing, then extending both outward to objectives - each rank band below builds on the vision habit from the one before it.',
  rankTiers: [
    { band: 'Iron-Silver', goal: 'Ward on a rhythm and learn the range of your own engage tool before using it.', blocker: 'Wards get placed on a fixed timer instead of on what the lane or jungler timer actually needs right now.' },
    { band: 'Silver-Gold', goal: 'Set up real kill windows with landed CC instead of engaging on a whim.', blocker: 'Engages happen the moment a cooldown is available, not when the follow-up damage is actually there to punish it.' },
    { band: 'Gold-Plat', goal: 'Extend vision to cover objective timers, not just the lane itself.', blocker: 'Vision stays lane-focused even after the game\'s priority has already shifted to a Dragon or Herald timer.' },
    { band: 'Plat+', goal: 'Shotcall objective setups and roam windows without losing bot lane\'s own priority.', blocker: 'Roaming off lane still costs more tempo than it buys, because the lane isn\'t left in a safe wave state first.' }
  ],
  mistakesIntroHtml: 'Support rank usually comes down to two habits: how vision gets placed, and what happens the moment a roam leaves the lane uncovered.',
  mistakes: [
    { phase: 'Laning Phase', ironBronze: 'Warding on a fixed timer regardless of what the lane state or jungler timer actually calls for.', goldPlat: 'Landing the engage but not following it up, letting the ADC\'s kill window close unused.' },
    { phase: 'Mid Game', ironBronze: 'Trading trinket-only vision for wards, leaving deep river or objective vision uncovered.', goldPlat: 'Roaming off lane without telling the ADC, leaving them exposed to a call they never saw coming.' }
  ],
  focusIntroHtml: 'Three focuses on the existing menu get their support-specific context filled in here:',
  focusIntegration: [
    ['vision-cadence', 'the rhythm-based warding described above is exactly what this focus measures.'],
    ['comms-discipline', 'the "leaving the ADC exposed" mistake above is usually a comms gap as much as a positioning one - a roam that\'s called ahead of time is a very different risk than one that isn\'t.'],
    ['objective-awareness', 'extending vision to cover Dragon and Herald timers is the same habit as lane vision, applied one level up.']
  ],
  closerHtml: 'Not sure which focus to start with? The <a href="' + '__FOCUS_MENU__' + '">Focus Menu</a> will tell you, based on your own baseline - this page fills in the support-specific detail once you\'ve made that pick.',
  endLinks: [
    [site.url('drills.html#ward-clock'), 'Run the Ward Clock drill'],
    [site.url('drills.html#no-flame-comms'), 'Run the No-Flame Comms drill'],
    [site.url('vision.html'), 'The rhythm-based warding this page builds on, in depth: Vision and Warding'],
    [site.url('focus-menu.html'), 'See the full Focus Menu'],
    [site.url('macro-play.html'), 'Objective priority by game state, the read this page\'s vision coverage feeds: Macro Play'],
    [site.url('early-game.html'), 'Engage timing starts with the same first-15-minutes read: Early Game Fundamentals']
  ]
};

const FOCUS_MENU_HREF = escapeHtml(site.url('focus-menu.html'));
for (const role of [TOP, JUNGLE, MID, ADC, SUPPORT]) {
  role.closerHtml = role.closerHtml.replace('__FOCUS_MENU__', FOCUS_MENU_HREF);
}

function renderTopGuide() { return buildRoleGuide(TOP); }
function renderJungleGuide() { return buildRoleGuide(JUNGLE); }
function renderMidGuide() { return buildRoleGuide(MID); }
function renderAdcGuide() { return buildRoleGuide(ADC); }
function renderSupportGuide() { return buildRoleGuide(SUPPORT); }

module.exports = {
  renderTopGuide,
  renderJungleGuide,
  renderMidGuide,
  renderAdcGuide,
  renderSupportGuide
};
