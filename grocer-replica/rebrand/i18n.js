// Build-time Gujarati translation of a cheerio document, using the rules shared with the client toggle
// (lib/i18n-core.js). Only strings present in rebrand/gu.json (plus the few numeric
// patterns below) change, so anything not in the dictionary is left as it is.
const path = require('path');
const G = require(path.join(__dirname, 'gu.json'));

const { createTranslator, norm } = require(path.join(__dirname, '..', 'lib', 'i18n-core.js'));
const { toGu } = createTranslator(G);

const ATTRS = ['alt', 'placeholder', 'aria-label', 'value', 'title', 'content'];

function translateDoc($) {
  const replaceText = (node) => {
    const raw = node.data;
    const key = norm(raw);
    if (!key) return;
    const out = toGu(key);
    if (out !== null) node.data = raw.match(/^\s*/)[0] + out + raw.match(/\s*$/)[0];
  };
  const walk = (node) => {
    if (node.type === 'text') { replaceText(node); return; }
    if (node.type === 'tag') {
      if (node.name === 'script' || node.name === 'style' || (node.attribs && node.attribs['data-no-i18n'] !== undefined)) return;
      for (const attr of ATTRS) {
        const v = node.attribs && node.attribs[attr];
        if (v !== undefined) { const out = toGu(norm(v)); if (out !== null) node.attribs[attr] = out; }
      }
    }
    (node.children || []).forEach(walk);
  };
  $('body').toArray().forEach(walk);
  $('title').toArray().forEach(walk);
  $('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]').toArray().forEach(walk);
}

module.exports = { translateDoc, toGu, norm };
