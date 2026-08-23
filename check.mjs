// CI-Check: baut Master + alle Varianten, startet jede headless und schreibt
// einen kurzen Markdown-Bericht (dist/check-report.md, auch auf stdout).
// Exit 0 = alles gut, sonst != 0. Ideal für Git-Hook / Pipeline / PR-Kommentar.
//   node check.mjs
// (Boot-Test braucht Playwright: `npm i playwright`. Ohne bleibt es bei der
//  Struktur-Prüfung — dann kann der Check keine Laufzeitfehler finden.)
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { ladeChromium, startbar } from './tools/boot.mjs';

function step(label, cmd) { console.log(`\n▶ ${label}`); execSync(cmd, { stdio: 'inherit' }); }

let ok = true;
try {
  if (existsSync('dist/boot-report.txt')) rmSync('dist/boot-report.txt');  // Stale-Schutz
  step('Build (Master)', 'node build.mjs');
  step('Build + Boot-Test aller Varianten', 'node build-variants.mjs --boot');
} catch { ok = false; }

// Bildtor: prueft nicht, ob etwas laeuft, sondern ob es aussieht wie
// vorgesehen. Dafuer gab es bisher kein Tor — der Nebel war seit jeher kaputt
// und alle Tore meldeten gruen.
let bildZeile = '';
if (ok) {
  try {
    step('Bildtor (Modifikator-Modi)', 'node tools/bildtor.mjs');
    bildZeile = '| Bildtor (5 Modi) | ✅ ohne Befund | 0 |\n';
  } catch {
    ok = false;
    bildZeile = '| Bildtor (5 Modi) | ❌ Befund | – |\n';
  }
}

// Farbtor: prueft, dass sich die drei Farbbaender nicht ueberschneiden —
// Gefahr, Eigenfeuer, Aufsammler. Der Bildtor sieht den ganzen Schirm, das
// Farbtor sieht die einzelnen Projektile, und zwar gerendert: es zaehlt die
// Pixel des gebauten Spiels. Die Gegenproben dazu stehen in
// tools/farbproben.mjs.
let farbZeile = '';
if (ok) {
  try {
    step('Farbtor (Gefahr · Eigenfeuer · Aufsammler)', 'node tools/farbtor.mjs');
    farbZeile = '| Farbtor (17 Projektile) | ✅ ohne Befund | 0 |\n';
  } catch {
    ok = false;
    farbZeile = '| Farbtor (17 Projektile) | ❌ Befund | – |\n';
  }
}

// Der Master. Er wurde oben gebaut, aber bis v3 nie gestartet — ausgerechnet
// die Datei, die ausgeliefert wird, war die einzige ohne Boot-Test.
let masterZeile = '';
if (ok) {
  const chromium = await ladeChromium();
  if (!chromium) {
    masterZeile = '| `Skyfront.html` (Master) | ⚪ nicht getestet | – |\n';
    console.log('\n  (—) Master-Boot: Playwright nicht gefunden.');
  } else {
    console.log('\n▶ Boot-Test Master');
    const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
    const r = await startbar(browser, process.cwd() + '/dist/Skyfront.html');
    await browser.close();
    console.log(`  ${r.gestartet ? '✓' : '✗'} Skyfront.html — ${r.gestartet ? 'gestartet, 0 Fehler' : 'Boot fehlgeschlagen (' + r.fehler.length + ' Fehler)'}`);
    r.fehler.slice(0, 3).forEach(f => console.log('     ! ' + String(f).slice(0, 160)));
    ok = ok && r.gestartet;
    masterZeile = `| \`Skyfront.html\` (Master) | ${r.gestartet ? '✅ gestartet' : '❌ Boot-Fehler'} | ${r.fehler.length} |\n`;
  }
}

const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
let md = `# Skyfront — Check-Report\n\n_${date}_\n\n`;

if (existsSync('dist/boot-report.txt')) {
  const lines = readFileSync('dist/boot-report.txt', 'utf8').split('\n').filter(l => /^[✓✗]/.test(l));
  md += '| Datei | Status | Fehler |\n|---|:--:|:--:|\n' + masterZeile + bildZeile + farbZeile;
  let allBoot = true;
  for (const l of lines) {
    const good = l.startsWith('✓');
    if (!good) allBoot = false;
    const file = (l.match(/(Skyfront-[^\s]+\.html)/) || [])[1] || l.slice(2).trim();
    const errs = (l.match(/(\d+)\s*Fehler/) || [])[1] || '0';
    md += `| \`${file}\` | ${good ? '✅ gestartet' : '❌ Boot-Fehler'} | ${errs} |\n`;
  }
  ok = ok && allBoot;
  md += `\n**Ergebnis:** ${ok ? '✅ bestanden' : '❌ fehlgeschlagen'}\n`;
} else {
  md += (ok ? '✅ Alle Builds erzeugt. ' : '❌ Build fehlgeschlagen. ') +
    '_Boot-Test nicht gelaufen (Playwright nicht installiert) — nur Struktur-Prüfung._\n';
}

writeFileSync('dist/check-report.md', md);
console.log('\n' + md);
console.log(ok ? '✓ CHECK bestanden.' : '✗ CHECK fehlgeschlagen.');
process.exit(ok ? 0 : 1);
