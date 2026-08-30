#!/usr/bin/env node
/*
  Kopfzeile — liegt im GEFECHT etwas auf etwas anderem?

    node tools/kopfzeile.mjs             ohne und mit Boss
    node tools/kopfzeile.mjs --bild      zusaetzlich zwei Aufnahmen nach dist/

  DER ANLASS: Rueckmeldung des Nutzers zur Kopfzeile — „die Power des
  Flugzeugs muss besser angezeigt werden" und „das Level des Piloten muss
  besser eingearbeitet werden, sodass man versteht, welches Level der Pilot
  ist". Beim Umbau kam ein zweiter Befund heraus, nach dem niemand gefragt
  hatte: die BOSSLEISTE lief seit ihrer Einfuehrung bei y = 118 quer ueber
  die Kopfzeilentafel, die bis y = 126 reicht. Der Erfahrungsbalken des
  Flugzeugs lag also in JEDEM Bosskampf unter der Bossleiste.

  WARUM KEIN TOR DAS SAH: tools/ueberlappung.mjs misst acht MENUESCHIRME.
  Im Gefecht hat nie jemand gemessen — und dort liegt die Halbe des
  Problems, weil die Bossleiste erst erscheint, wenn der Boss kommt. Das
  ist Regel 47 in einer neuen Tuer: ein Tor, das die Menues prueft, meldet
  gruen ueber ein Spiel, dessen Kopfzeile sich im Kampf selbst zudeckt.

  WAS GEMESSEN WIRD, am gebauten Spiel, im Browser, bei 390 x 844 (iPhone
  hochkant, das Zielgeraet), Layoutraum 540 x 960:

    A  Zwei Beschriftungen der Kopfzeile schneiden sich.  Es gibt hier
       keine erlaubte Lesart — zwei Worte uebereinander sind unlesbar.
    B  Eine gezeichnete Flaeche (Tafel, Kraftleiter, Lebensgurt,
       Bossleiste) deckt eine Beschriftung oder einen Balken zu, der nicht
       zu ihr gehoert.
    C  Eine Beschriftung unter dem Schriftboden von 13 Layoutpunkten
       (Regel 10).
    D  Etwas ragt ueber den Rand des Layoutraums hinaus.

  DIE NAHT: `window.__SKF_KOPFZEILE` haelt die vier Rechtecke, die die
  Kopfzeile WIRKLICH zeichnet. Tafel, Leiter, Gurt und Bossleiste sind
  Graphics — sie haben keine getBounds(), an denen ein Werkzeug sie fassen
  koennte. Eingetragen werden sie beim Zeichnen, nicht hier nachgerechnet:
  ein Tor, das die Formel wiederholt, bezeugt sie, statt sie zu pruefen
  (Regel 17). `--ohne-naht` nimmt die Naht weg und verlangt die Rueckgabe 2.

  GEMESSEN WIRD ZWEIMAL — ohne Boss und mit. Wieviele Zustaende es gibt,
  wird vorher aufgezaehlt, nicht unterwegs bemerkt (Regel 47).
*/
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Kopfzeile', 'im Gefecht deckt nichts etwas anderes zu, ohne und mit Boss.');
const BILD = process.argv.includes('--bild');
// Zwei Layoutpunkte Spiel, wie im Ueberlappungstor: Textrahmen tragen Luft,
// und zwei Zeilen, die sich um einen Punkt beruehren, sind keine Deckung.
const SPIEL = 2;
const BODEN = 13;      // Schriftboden in Layoutpunkten (Regel 10)
// Die Kopfzeile ist das obere Fuenftel des Layoutraums. Alles, was ganz
// darin liegt, gehoert dazu; was darueber hinausreicht, ist eine SCHICHT
// (Levelankuendigung, Bosswarnung, Schleier) und deckt absichtlich zu.
// Anteilig, nicht absolut (Regel 2): eine feste 200 waere beim naechsten
// Seitenverhaeltnis still falsch.
const KOPF_ANTEIL = .21;

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

// Ueber http, nicht ueber file://: unter file:// wirft localStorage, und
// dann laesst sich die Einweisung nicht als gesehen merken.
const TYP = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = createServer((an, aw) => {
  const pfad = decodeURIComponent(an.url.split('?')[0]);
  const datei = join('dist', normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(datei) || statSync(datei).isDirectory()) { aw.writeHead(404).end(); return; }
  const roh = readFileSync(datei);
  aw.writeHead(200, { 'Content-Type': TYP[extname(datei)] || 'application/octet-stream', 'Content-Length': roh.length }).end(roh);
});
await new Promise((f) => server.listen(0, '127.0.0.1', f));
const adresse = `http://127.0.0.1:${server.address().port}/Skyfront.html`;

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
// Der SCHLIMMSTE Spielstand, nicht der freundlichste: neun Sterne ergeben
// „Oberleutnant" — den laengsten der sieben Rangnamen —, und 999999
// Erfahrung ergeben die Hoechststufe. Ein reicher Stand haette „General"
// gezeigt, sieben Zeichen kuerzer, und die Spalte waere nie gerissen.
await seite.addInitScript(() => {
  try {
    localStorage.setItem('seen_tut', '1');
    localStorage.setItem('gold', '99999');
    localStorage.setItem('xp_falcon', '999999');
    for (let i = 1; i <= 3; i++) localStorage.setItem('stars_' + i, '3');
  } catch (e) {}
});
await seite.goto(adresse);
await seite.waitForFunction(() => window.__game && window.__bootStats && window.__bootStats.totalMs, null, { timeout: 90000 });
await seite.waitForTimeout(1200);

if (OHNE_NAHT) await seite.evaluate(() => { delete window.__SKF_KOPFZEILE; });

// Den Sektor RUFEN, nicht hintippen. Das steht seit v45 in
// tools/vorwaermen.mjs und hat in v56 vier rote Laeufe gekostet, weil es
// nur dort stand (Regel 46).
const drin = await seite.evaluate(async () => {
  const g = window.__game;
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Game', { stage: 6 });
  for (let i = 0; i < 40; i++) {
    await new Promise((f) => setTimeout(f, 250));
    const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
    if (!sz) continue;
    if (!sz.stageStarted && typeof sz.startStage === 'function') sz.startStage();
    if (sz.player) return true;
  }
  return false;
});
if (!drin) { await browser.close(); server.close(); M.abbruch('kommt nicht ins Gefecht.'); }
// Ein paar Sekunden fliegen lassen: erst nach dem ersten Schuss steht die
// Zahl der Bahnen in der Kopfzeile, vorher steht dort ein Strich.
await seite.waitForTimeout(3500);

const lesen = () => seite.evaluate((KOPF_ANTEIL) => {
  const g = window.__game;
  const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
  if (!sz) return { fehler: 'Gefecht nicht aktiv' };
  const naht = window.__SKF_KOPFZEILE;
  if (!naht) return { fehler: '__SKF_KOPFZEILE fehlt' };
  const kam = sz.cameras && sz.cameras.main;
  if (!kam) return { fehler: 'keine Kamera' };
  // Kameramasse sind LEINWANDPUNKTE (1080 x 1920), das Spiel rechnet in
  // Layoutpunkten (540 x 960) — die Kamera zoomt zweifach (Regel 7).
  const BREITE = kam.width / (kam.zoom || 1), HOEHE = kam.height / (kam.zoom || 1);
  const flach = [];
  const geh = (arr) => { for (const o of arr) { flach.push(o); if (o.list) geh(o.list); } };
  geh(sz.children.list);
  // Die Kopfzeile: was mitscrollt, gehoert zur Welt und nicht hierher.
  const kopf = flach.filter((o) => o.visible && (o.scrollFactorX === 0) && (o.depth || 0) >= 95 && (o.alpha ?? 1) >= .5);
  const grenze = HOEHE * KOPF_ANTEIL;
  const texte = [], balken = [];
  const gesehen = new Set;
  for (const o of kopf) {
    if (gesehen.has(o)) continue;
    gesehen.add(o);
    let b = null;
    try { b = o.getBounds(); } catch (e) { continue; }
    if (!b || b.width < 2 || b.height < 2) continue;
    if (b.y < -2 || b.y + b.height > grenze) continue;   // Schicht, nicht Kopfzeile
    const r = [b.x, b.y, b.width, b.height].map((n) => Math.round(n * 10) / 10);
    if (o.type === 'Text') {
      const t = String(o.text || '').trim();
      if (!t) continue;
      texte.push({ text: t.slice(0, 28), r, groesse: parseFloat(String(o.style && o.style.fontSize || '0')) || 0 });
    } else if (o.type === 'Rectangle') balken.push({ text: `Balken ${Math.round(b.x)},${Math.round(b.y)}`, r });
  }
  const bossDa = !!(sz.boss && sz.boss.active && sz.bossBar);
  return {
    breite: BREITE, hoehe: HOEHE, texte, balken, bossDa,
    flaechen: {
      Tafel: naht.tafel.slice(), Kraftleiter: naht.leiter.slice(),
      Lebensgurt: naht.gurt.slice(), Bossleiste: bossDa ? naht.boss.slice() : null,
    },
  };
}, KOPF_ANTEIL);

const schnitt = (a, b) => {
  const x = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const y = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return (x > SPIEL && y > SPIEL) ? { x: Math.round(x), y: Math.round(y) } : null;
};
// Was zu einer Flaeche GEHOERT, liegt in ihr — das ist keine Deckung,
// sondern ihr Inhalt. Nur was aus einer Flaeche HERAUSRAGT oder in eine
// FREMDE hineinragt, ist ein Befund.
const drinnen = (klein, gross) => klein[0] >= gross[0] - SPIEL && klein[1] >= gross[1] - SPIEL
  && klein[0] + klein[2] <= gross[0] + gross[2] + SPIEL && klein[1] + klein[3] <= gross[1] + gross[3] + SPIEL;

console.log('Kopfzeile\n');
console.log('  gemessen am gebauten Spiel, 390 x 844 (iPhone hochkant), Layoutraum 540 x 960\n');

// Zwei Zustaende, vorher aufgezaehlt (Regel 47).
const ZUSTAENDE = [
  { name: 'ohne Boss', boss: false },
  { name: 'mit Boss', boss: true },
];
let gemessen = 0;

for (const z of ZUSTAENDE) {
  if (z.boss) {
    const kam = await seite.evaluate(async () => {
      const g = window.__game;
      const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
      if (!sz || typeof sz.spawnBoss !== 'function') return false;
      sz.spawnBoss(2);
      for (let i = 0; i < 40; i++) {
        await new Promise((f) => setTimeout(f, 250));
        if (sz.boss && sz.boss.active && sz.bossBar) return true;
      }
      return false;
    });
    if (!kam) { M.ungemessen('der Boss ist nicht erschienen — der Zustand „mit Boss" ist nicht gemessen.'); continue }
    await seite.waitForTimeout(1500);
  }
  const d = await lesen();
  if (d.fehler) { M.ungemessen(`${z.name}: ${d.fehler}`); continue }
  if (z.boss && !d.bossDa) { M.ungemessen('mit Boss: die Bossleiste steht nicht — nicht gemessen.'); continue }
  gemessen++;
  if (BILD) writeFileSync(`dist/kopfzeile-${z.boss ? 'boss' : 'ruhig'}.png`, await seite.screenshot());

  const dinge = d.texte.concat(d.balken);
  const flaechen = Object.entries(d.flaechen).filter(([, r]) => r && r[2] > 0 && r[3] > 0);
  console.log(`  ${z.name}: ${d.texte.length} Beschriftungen, ${d.balken.length} Balken, ${flaechen.length} Flaechen`);
  for (const t of d.texte) console.log(`    ${String(t.r[0]).padStart(5)},${String(t.r[1]).padStart(4)}  ${t.groesse}px  ${JSON.stringify(t.text)}`);
  for (const [n, r] of flaechen) console.log(`    ${String(r[0]).padStart(5)},${String(r[1]).padStart(4)}  ${r[2]} x ${r[3]}  ${n}`);

  // A — zwei Beschriftungen uebereinander.
  for (let i = 0; i < d.texte.length; i++)
    for (let k = i + 1; k < d.texte.length; k++) {
      const t = schnitt(d.texte[i].r, d.texte[k].r);
      if (t) M.befund(`${z.name}: ${JSON.stringify(d.texte[i].text)} und ${JSON.stringify(d.texte[k].text)} liegen uebereinander (${t.x} x ${t.y} Layoutpunkte).`);
    }

  // B — eine Flaeche deckt zu, was nicht zu ihr gehoert.
  for (const [name, r] of flaechen)
    for (const o of dinge) {
      if (drinnen(o.r, r)) continue;             // Inhalt der Flaeche
      const t = schnitt(r, o.r);
      if (t) M.befund(`${z.name}: die Flaeche ${name} schneidet ${JSON.stringify(o.text)} (${t.x} x ${t.y} Layoutpunkte) — ${JSON.stringify(o.text)} liegt nicht darin, sondern ragt heraus.`);
    }
  // B2 — zwei Flaechen uebereinander. Genau hier lag die Bossleiste.
  for (let i = 0; i < flaechen.length; i++)
    for (let k = i + 1; k < flaechen.length; k++) {
      const [n1, r1] = flaechen[i], [n2, r2] = flaechen[k];
      if (drinnen(r1, r2) || drinnen(r2, r1)) continue;
      const t = schnitt(r1, r2);
      if (t) M.befund(`${z.name}: die Flaeche ${n1} und die Flaeche ${n2} liegen uebereinander (${t.x} x ${t.y} Layoutpunkte).`);
    }

  // C — Schriftboden.
  for (const t of d.texte)
    if (t.groesse && t.groesse < BODEN) M.befund(`${z.name}: ${JSON.stringify(t.text)} ist ${t.groesse} Layoutpunkte gross — unter dem Boden von ${BODEN}.`);

  // D — ueber den Rand.
  for (const o of dinge.concat(flaechen.map(([n, r]) => ({ text: n, r }))))
    if (o.r[0] < -SPIEL || o.r[1] < -SPIEL || o.r[0] + o.r[2] > d.breite + SPIEL || o.r[1] + o.r[3] > d.hoehe + SPIEL)
      M.befund(`${z.name}: ${JSON.stringify(o.text)} ragt ueber den Rand (${o.r.join(', ')} bei ${d.breite} x ${d.hoehe}).`);
  console.log('');
}

await browser.close();
server.close();
if (!gemessen) M.abbruch('kein Zustand gemessen.');
if (gemessen < ZUSTAENDE.length) M.ungemessen(`nur ${gemessen} von ${ZUSTAENDE.length} Zustaenden gemessen.`);
M.urteil();
