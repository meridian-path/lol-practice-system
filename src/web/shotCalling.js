'use strict';

// comms.html: a standalone content-gap page (not derived from any section of
// content/guide.js, same pattern as src/web/teamfighting.js/objectiveControl.js)
// covering shot-calling and the ping system as an information tool.
// Deliberately NOT framed as "the comms-discipline deep-dive": that focus
// (content/focuses.json) measures something narrower and different --
// complaint-free chat, not shot-calling quality (its own drillId is
// "no-flame-comms", its "theNumber" is complaint-only messages per game).
// Discovered this mismatch while building this page and corrected course
// rather than force-fitting the content to the focus's name -- same
// multi-focus-tie-in pattern src/web/teamfighting.js already established
// (comms-discipline's anti-blame principle is genuinely one of several real
// ties here, just not the only one, and not the page's organizing idea).
// Reuses the shared dataTable()/callout() primitives (src/render/html.js),
// matching every sibling content-gap page's approach.

const path = require('path');
const site = require('../site.js');
const shell = require('./shell.js');
const { escapeHtml, dataTable, callout } = require('../render/html.js');
const { articleJsonLd } = require('./structuredData.js');

const focuses = require(path.join('..', '..', 'content', 'focuses.json'));

const focusById = new Map(focuses.map((f) => [f.id, f]));

function focusLink(id) {
  const f = focusById.get(id);
  if (!f) throw new Error(`shotCalling.js: unknown focus id "${id}"`);
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

function renderPingTable() {
  return dataTable({
    columns: [
      { key: 'ping', label: 'Ping' },
      { key: 'realJob', label: 'What It Actually Communicates' }
    ],
    rows: [
      { ping: 'Missing (danger) ping', realJob: 'Not just "watch out" - it is a location and a direction: where the enemy was last seen and, by omission, where they might now be. A missing ping with no follow-up is half the information it could carry.' },
      { ping: 'On My Way / Assist Me', realJob: 'A commitment with a timer attached - the recipient reads it as "help is coming, hold the position" and plays differently because of it. Pinging it without following through costs more than staying silent would have.' },
      { ping: 'Retreat (caution)', realJob: 'Fastest way to say "this trade/fight is no longer winnable" without a chat message - useful specifically because it arrives before anyone has time to type.' }
    ]
  });
}

function renderPingSection() {
  return `<section class="guide-section">
    <h2>Pings Are Information, Not Just Alerts</h2>
    <p>Every ping carries a specific, decodable meaning - the same information a voice call would give, just faster to send and impossible to miss in the middle of a fight. Treating pings as generic noise ("something happened over there") throws away most of what they were built to communicate.</p>
    ${renderPingTable()}
    ${callout('A missing ping placed the instant a laner disappears is worth more than the same ping placed ten seconds later, once the gank it warned about has already landed - timing is part of the information, not a detail.')}
  </section>`;
}

function renderShotCallerTable() {
  return dataTable({
    columns: [
      { key: 'layer', label: 'Layer' },
      { key: 'whatItLooksLike', label: 'What It Looks Like' }
    ],
    rows: [
      { layer: 'Basic caller (everyone, every game)', whatItLooksLike: 'Calling your own lane\'s missing enemy, calling an objective as available the moment its timer allows, calling your own summoner spells as down after using them. No leadership required - just information your team cannot see for themselves.' },
      { layer: 'Primary caller (usually one player, not required)', whatItLooksLike: 'Deciding *when* to act on the information above - "group top," "take the fight," "back off, we lost the read." Requires reading the whole map at once, not just your own lane, and being willing to be wrong out loud.' }
    ]
  });
}

function renderShotCallerSection() {
  return `<section class="guide-section">
    <h2>Two Layers: the Caller Everyone Should Be, the Caller Someone Should Be</h2>
    <p>Solo queue teams rarely have an assigned shot caller, which leads to a common misread: assuming shot-calling is a role you either have or don't, so nothing gets called at all. In practice there are two separate layers, and only one of them requires stepping up.</p>
    ${renderShotCallerTable()}
    <p>Running the basic layer consistently, every game, does more for a team's actual decision-making than one good primary call in a game where nobody was tracking missing enemies or objective timers in the first place.</p>
  </section>`;
}

function renderMistakeTable() {
  return dataTable({
    columns: [
      { key: 'rank', label: 'Rank Band' },
      { key: 'mistake', label: 'Common Comms Mistake' },
      { key: 'fix', label: 'The Fix' }
    ],
    rows: [
      { rank: 'Iron-Bronze', mistake: 'Typing a call only after something has already gone wrong, as a complaint rather than information.', fix: 'Ask whether a message contains a plan or information before sending it - if it only contains blame, it was never a call in the first place.' },
      { rank: 'Silver-Gold', mistake: 'Pinging danger once, then going silent even as the situation keeps changing.', fix: 'Treat a ping as a snapshot, not a standing alert - re-ping when the read changes, the same way a vision check gets repeated, not done once.' },
      { rank: 'Platinum+', mistake: 'Making a correct call that nobody follows, then escalating in chat instead of adjusting the call.', fix: 'A call that isn\'t landing is a delivery problem, not a teammate problem - shorter, earlier, or paired with a ping usually lands better than the same call typed louder.' }
    ]
  });
}

function renderShotCalling() {
  const introHtml = `<h1>Shot-Calling and the Ping System</h1>
    <p class="lead">Most solo queue comms either say nothing useful or say it as blame. This page covers the two things that actually move games: reading pings as real information instead of generic alerts, and running the basic layer of shot-calling every game, whether or not you're the one making the big calls.</p>`;

  const sectionsHtml = `${renderPingSection()}
    ${renderShotCallerSection()}
    <section class="guide-section">
      <h2>Mistakes By Rank</h2>
      <p>Every rank band below is a version of the same underlying problem: comms that react to what already happened instead of shaping what happens next.</p>
      ${renderMistakeTable()}
    </section>
    <section class="guide-section">
      <h2>How This Ties Into the 12 Focuses</h2>
      <p>Shot-calling does not have one dedicated focus of its own, but three existing focuses meet directly at this page:</p>
      <ul>
        <li>${focusLink('comms-discipline')} - that focus measures something narrower than shot-calling (keeping chat complaint-free), but the same discipline applies here: a call that turns into blame the moment it doesn't land stops being a call at all.</li>
        <li>${focusLink('minimap-awareness')} - a ping is only as good as the read behind it; this page's whole first half is what to actually do with the minimap information that focus is training you to track.</li>
        <li>${focusLink('objective-awareness')} - calling an objective the moment its timer allows is the single most common basic-caller job, and the exact habit that focus's own drill trains.</li>
      </ul>
      <p>None of this replaces picking an actual focus to hold for a block of games - it is context for whichever one your baseline points you toward, comms-related or not.</p>
    </section>`;

  const body = `<div class="zone-measure">
    ${introHtml}
    ${sectionsHtml}
    ${standardEndLinks([
      [site.url('drills.html#no-flame-comms'), 'Run the No-Flame Comms drill'],
      [site.url('drills.html#objective-timer-precall'), 'Run the Objective-Timer Pre-Call drill'],
      [site.url('focus-menu.html'), 'See the full Focus Menu'],
      [site.url('objectives.html'), 'The setup and timing behind the objective calls this page covers: Objective Control']
    ])}
  </div>`;

  const description = 'A guide to League of Legends shot-calling and the ping system: reading pings as real information, and the basic vs primary shot-caller layers.';
  return shell.documentShell({
    title: site.pageTitle('Shot-Calling and Comms Guide'),
    description,
    bodyHtml: body,
    canonical: site.absoluteUrl('comms.html'),
    active: null,
    ogType: 'article',
    jsonLd: articleJsonLd({
      headline: 'Shot-Calling and the Ping System',
      description,
      datePublished: site.BUILD_DATE,
      dateModified: site.BUILD_DATE,
      url: site.absoluteUrl('comms.html')
    })
  });
}

module.exports = { renderShotCalling };
