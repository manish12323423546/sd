/* Shared Gujarati/English translation rules. Used at build time by rebrand/i18n.js (CommonJS) and on the
   client by lib/i18n.ts, so it has no Node or browser dependencies. Only strings in the dictionary and the
   few composed patterns below translate; anything else is returned unchanged. */
const norm = (s) => s.replace(/[\s ]+/g, ' ').trim();

const TAIL_EN = 'Available at Hare Krishna Mall, Virpur and Lalsar.';
const TAIL_GU = 'હરે કૃષ્ણ મોલ, વીરપુર અને લાલસર ખાતે ઉપલબ્ધ.';
const AT_GU = 'હરે કૃષ્ણ મોલ, વીરપુર અને લાલસર ખાતે';

function createTranslator(dict) {
  const EN2GU = {}, GU2EN = {};
  for (const [k, v] of Object.entries(dict.exact)) { const nk = norm(k), nv = norm(v); EN2GU[nk] = v; if (!(nv in GU2EN)) GU2EN[nv] = k; }
  const M = dict.months, MB = Object.fromEntries(Object.entries(dict.months).map(([en, gu]) => [gu, en]));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const toGu = (key) => {
    if (Object.prototype.hasOwnProperty.call(EN2GU, key)) return EN2GU[key];
    let m;
    if ((m = key.match(/^\((\d+)% off\)$/))) return `(${m[1]}% છૂટ)`;
    if ((m = key.match(/^(\d+) Min Read$/i))) return `${m[1]} મિનિટ વાંચન`;
    if ((m = key.match(/^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/)) && M[m[1]]) return `${m[2]} ${M[m[1]]} ${m[3]}`;
    // composed page titles and descriptions
    if ((m = key.match(/^(.+) \| (.+)$/))) { const a = toGu(m[1]), b = toGu(m[2]); if (a !== null && b !== null) return `${a} | ${b}`; }
    if ((m = key.match(/^(.+) \((.+)\)$/))) { const a = toGu(m[1]), b = toGu(m[2]); if (a !== null && b !== null) return `${a} (${b})`; }
    if ((m = key.match(new RegExp(`^([^,:]+), ([^:]+): (.+) ${esc(TAIL_EN)}$`)))) { const a = toGu(m[1]), b = toGu(m[2]), c = toGu(m[3]); if (a !== null && b !== null && c !== null) return `${a}, ${b}: ${c} ${TAIL_GU}`; }
    if ((m = key.match(/^(.+?) at Hare Krishna Mall, Virpur and Lalsar: (.+)$/))) { const a = toGu(m[1]), b = toGu(m[2]); if (a !== null && b !== null) return `${AT_GU} ${a}: ${b}`; }
    return null;
  };
  const toEn = (key) => {
    if (Object.prototype.hasOwnProperty.call(GU2EN, key)) return GU2EN[key];
    let m;
    if ((m = key.match(/^\((\d+)% છૂટ\)$/))) return `(${m[1]}% off)`;
    if ((m = key.match(/^(\d+) મિનિટ વાંચન$/))) return `${m[1]} Min Read`;
    if ((m = key.match(/^(\d{1,2}) (\S+) (\d{4})$/)) && MB[m[2]]) return `${MB[m[2]]} ${m[1]}, ${m[3]}`;
    if ((m = key.match(/^(.+) \| (.+)$/))) { const a = toEn(m[1]), b = toEn(m[2]); if (a !== null && b !== null) return `${a} | ${b}`; }
    if ((m = key.match(/^(.+) \((.+)\)$/))) { const a = toEn(m[1]), b = toEn(m[2]); if (a !== null && b !== null) return `${a} (${b})`; }
    if ((m = key.match(new RegExp(`^([^,:]+), ([^:]+): (.+) ${esc(TAIL_GU)}$`)))) { const a = toEn(m[1]), b = toEn(m[2]), c = toEn(m[3]); if (a !== null && b !== null && c !== null) return `${a}, ${b}: ${c} ${TAIL_EN}`; }
    if ((m = key.match(new RegExp(`^${esc(AT_GU)} (.+?): (.+)$`)))) { const a = toEn(m[1]), b = toEn(m[2]); if (a !== null && b !== null) return `${a} at Hare Krishna Mall, Virpur and Lalsar: ${b}`; }
    return null;
  };

  /** Translate one string into `lang`, keeping surrounding whitespace. Unknown strings come back unchanged. */
  const translate = (text, lang) => {
    const key = norm(text);
    if (!key) return text;
    const out = lang === 'gu' ? toGu(key) : toEn(key);
    if (out === null) return text;
    return text.match(/^\s*/)[0] + out + text.match(/\s*$/)[0];
  };
  return { translate, toGu, toEn, norm };
}

module.exports = { createTranslator, norm };
