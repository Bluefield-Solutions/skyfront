// Einzel-Build: src/balance.js -> dist/Skyfront.html
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { loadParts, assemble } from './buildcore.mjs';

const parts = loadParts();
let B = null;
if (existsSync('src/balance.js')) {
  const m = await import('./src/balance.js');
  B = m.BALANCE || m.default;
}
const { html, changed, hasModifier } = assemble(parts, B, console.log);

mkdirSync('dist', { recursive: true });
writeFileSync('dist/Skyfront.html', html);
const mb = (html.length / 1048576).toFixed(2);
const note = B ? (changed ? ` (${changed} Balance/Kurven-Werte geändert)` : ' (Balance unverändert)') : '';
console.log('dist/Skyfront.html geschrieben: ' + mb + ' MB' + (hasModifier ? ' +Modifikator' : '') + note);
