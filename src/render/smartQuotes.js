'use strict';

// Build-time typographic-normalization pass: converts a straight apostrophe
// (') into a curly right single quote (’) wherever it appears between
// two word characters (don't, jungler's, isn't) -- but ONLY inside HTML text
// content. Tag attributes (href, class, aria-label, id), <script> blocks
// (inline JS and embedded JSON islands like #quiz-focuses-data), and <style>
// blocks are copied through byte-for-byte untouched, since a straight
// apostrophe there is load-bearing (a JS string literal, a JSON value, a
// URL) rather than typographic prose.
//
// This site has no DOM-parsing dependency in its build (see this task's own
// description for why one wasn't added just for this) -- so this walks the
// built HTML string by hand, tracking only enough state (in a tag? inside
// <script>/<style>/a comment?) to find text-node boundaries correctly.

// Matches a straight apostrophe with a word character on both sides --
// deliberately narrower than "every apostrophe": a trailing possessive with
// nothing after it (e.g. "Games' ") or a quotation-mark use (opening/closing
// a quoted phrase) has no word character on one side and is left alone, per
// this task's own scope.
const INTRA_WORD_APOSTROPHE = /(\w)'(\w)/g;

function smartenText(text) {
  return text.replace(INTRA_WORD_APOSTROPHE, '$1’$2');
}

// Finds the index just past the given case-insensitive closing tag (e.g.
// "</script>"), starting the search at `from`. Returns html.length if the
// closing tag never appears (malformed input -- treat the remainder as
// opaque rather than throwing).
function findCloseTagEnd(html, closeTag, from) {
  const lower = html.toLowerCase();
  const idx = lower.indexOf(closeTag, from);
  return idx === -1 ? html.length : idx + closeTag.length;
}

// Finds the index just past the end of the tag starting at `from` (html[from]
// is '<'), respecting quoted attribute values so a '>' inside a quoted
// attribute (e.g. a JSON blob in a data-* attribute) doesn't end the tag
// early. Returns html.length if the tag never closes.
function findTagEnd(html, from) {
  let i = from + 1;
  let quote = null;
  while (i < html.length) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i + 1;
    }
    i += 1;
  }
  return html.length;
}

// Applies smartenText() to every HTML text node in `html`, leaving tags,
// attributes, <script>...</script>, <style>...</style>, and HTML comments
// untouched.
function smartenHtml(html) {
  let out = '';
  let i = 0;
  const lower = html.toLowerCase();
  while (i < html.length) {
    const nextTag = html.indexOf('<', i);
    if (nextTag === -1) {
      out += smartenText(html.slice(i));
      break;
    }
    if (nextTag > i) {
      out += smartenText(html.slice(i, nextTag));
    }
    if (lower.startsWith('<!--', nextTag)) {
      const end = findCloseTagEnd(html, '-->', nextTag + 4);
      out += html.slice(nextTag, end);
      i = end;
    } else if (lower.startsWith('<script', nextTag)) {
      const tagEnd = findTagEnd(html, nextTag);
      const end = findCloseTagEnd(html, '</script>', tagEnd);
      out += html.slice(nextTag, end);
      i = end;
    } else if (lower.startsWith('<style', nextTag)) {
      const tagEnd = findTagEnd(html, nextTag);
      const end = findCloseTagEnd(html, '</style>', tagEnd);
      out += html.slice(nextTag, end);
      i = end;
    } else {
      const end = findTagEnd(html, nextTag);
      out += html.slice(nextTag, end);
      i = end;
    }
  }
  return out;
}

module.exports = { smartenHtml, smartenText, INTRA_WORD_APOSTROPHE };
