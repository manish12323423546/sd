// Extract Webflow IX2 raw data (object literal) from a chunk file via a sandboxed vm.
const fs = require('fs'); const vm = require('vm');
const js = fs.readFileSync(process.argv[2], 'utf8');
const idx = js.indexOf('events:{');
let start = idx; while (js[start] !== '{') start--;
let depth = 0, end = start;
for (let i = start; i < js.length; i++) { const c = js[i]; if (c === '"') { i++; while (js[i] !== '"') { if (js[i] === '\\') i++; i++; } continue; } if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i; break; } } }
const blob = js.slice(start, end + 1);
const data = vm.runInNewContext('(' + blob + ')', Object.create(null), { timeout: 2000 });
fs.writeFileSync(process.argv[3], JSON.stringify(data));
const ev = Object.values(data.events);
console.log('events', ev.length, 'actionLists', Object.keys(data.actionLists).length, 'site', data.site && Object.keys(data.site));
