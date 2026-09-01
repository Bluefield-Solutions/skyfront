#!/usr/bin/env node
/*
  Zeichenwerk — wieviele PUFFERWECHSEL kostet ein Schirm je Bild?

    node tools/zeichenwerk.mjs

  DER ANLASS. Die dritte Geraetemessung wurde im MENUE genommen und zeigte
  dort p50 17,0 / p95 24,0 ms, 15 % der Bilder ueber 20 ms — auf einem
  Schirm, auf dem nichts fliegt. Millisekunden sind hier nicht zu messen
  (SwiftShader, rund drei Bilder je Sekunde), GL-BEFEHLE schon: ihre Zahl
  ist auf dem Telefon dieselbe, nur ihr Preis ist ein anderer.

  Gemessen ergab das:

    Menue      8 Zeichenaufrufe   5 Pufferwechsel
    Sektor 3  18 Zeichenaufrufe   1 Pufferwechsel

  Das Menue brauchte FUENFMAL soviel Zielwechsel wie ein laufendes Gefecht.
  Die Ursache waren zwei `preFX.addGlow` auf Ueberschriften: Phaser rendert
  ein Objekt mit Vor-Effekt in ein eigenes Ziel und wieder zurueck — zwei
  Pufferwechsel je Bild und Objekt, solange der Schirm steht. Auf einer
  Kachel-Grafikeinheit, wie sie in jedem iPhone steckt, ist genau das der
  teure Posten: die Kachel muss geschrieben und wieder geholt werden.

  DIE GRENZE IST ANTEILIG, NICHT ABSOLUT (Regel 2). Verlangt wird nicht
  „hoechstens ein Pufferwechsel", sondern: ein Schirm, auf dem nichts
  passiert, darf nicht mehr Zielwechsel brauchen als ein laufender Sektor.
  Der Sektor wird im selben Lauf mitgemessen und ist der Massstab.

  `--ohne-naht` nimmt den GL-Zugang weg und verlangt die Rueckgabe 2.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Zeichenwerk', 'kein stehender Schirm braucht mehr Pufferwechsel je Bild als ein laufender Sektor.');

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const TYP = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = createServer((an, aw) => {
  const pfad = decodeURIComponent(an.url.split('?')[0]);
  const datei = join('dist', normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(datei) || statSync(datei).isDirectory()) { aw.writeHead(404).end(); return; }
  const roh = readFileSync(datei);
  aw.writeHead(200, { 'Content-Type': TYP[extname(datei)] || 'application/octet-stream', 'Content-Length': roh.length }).end(roh);
});
await new Promise((f) => server.listen(0, '127.0.0.1', f));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
await seite.addInitScript(() => { try { localStorage.setItem('seen_tut', '1'); } catch (e) {} });
await seite.goto(`http://127.0.0.1:${server.address().port}/Skyfront.html`);
await seite.waitForFunction(() => window.__game && window.__bootStats && window.__bootStats.totalMs, null, { timeout: 90000 });
await seite.waitForTimeout(1500);

// Ohne Naht: der GL-Zugang wird weggenommen. Ein Tor, dessen dritter
// Ausgang sich nicht herbeifuehren laesst, ist nicht geprueft (Regel 43).
if (OHNE_NAHT) await seite.evaluate(() => { try { window.__game.renderer.gl = null; } catch (e) {} });

const gehaengt = await seite.evaluate(() => {
  try {
    const gl = window.__game.renderer.gl;
    if (!gl || typeof gl.drawElements !== 'function') return false;
    window.__Z = { draw: 0, fbo: 0 };
    const w = (n, f) => { const o = gl[n].bind(gl); gl[n] = function (...a) { window.__Z[f]++; return o(...a); }; };
    w('drawElements', 'draw'); w('drawArrays', 'draw'); w('bindFramebuffer', 'fbo');
    window.__P = [];
    (function s() { requestAnimationFrame(s); const z = window.__Z; window.__P.push(z); window.__Z = { draw: 0, fbo: 0 }; })();
    return true;
  } catch (e) { return false; }
});

const med = (a) => { const k = a.slice().sort((x, y) => x - y); return k.length ? k[Math.floor(k.length / 2)] : null; };
// GEWARTET WIRD AUF BILDER, NICHT AUF DIE UHR: hier rechnet SwiftShader mit
// rund drei Bildern je Sekunde, auf dem Laeufer von GitHub mit weniger.
// Eine feste Sekundenzahl ist eine absolute Grenze in Verkleidung.
async function messen(name, wieviel = 7) {
  if (!gehaengt) return null;
  await seite.evaluate(() => { window.__P.length = 0; });
  const bis = Date.now() + 40000;
  while (Date.now() < bis) {
    await seite.waitForTimeout(700);
    if (await seite.evaluate(() => window.__P.length) >= wieviel + 2) break;
  }
  const p = (await seite.evaluate(() => window.__P)).slice(2);
  if (p.length < 3) return null;
  const r = { n: p.length, draw: med(p.map((x) => x.draw)), fbo: med(p.map((x) => x.fbo)) };
  console.log(`  ${name.padEnd(12)} ${String(r.n).padStart(2)} Bilder   Zeichenaufrufe ${String(r.draw).padStart(3)}   Pufferwechsel ${String(r.fbo).padStart(2)}`);
  return r;
}
const schirm = async (k) => seite.evaluate(async (k) => {
  const g = window.__game;
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start(k);
  for (let i = 0; i < 40; i++) {
    await new Promise((f) => setTimeout(f, 200));
    const s = (g.scene.scenes || []).find((x) => x.scene.key === k && x.scene.isActive());
    if (s && s.children && s.children.list.length > 3) return true;
  }
  return false;
}, k);

console.log('\nZeichenwerk\n');
console.log('  gemessen an dist/Skyfront.html, 390 x 844, Chromium ohne Grafikkarte.');
console.log('  Zeichenaufrufe und Pufferwechsel uebertragen sich aufs Telefon, Millisekunden nicht.\n');

if (!gehaengt) M.ungemessen('an den GL-Zugang ist nicht heranzukommen — es ist kein einziger Befehl gezaehlt.');

// Der MASSSTAB zuerst: ein laufender Sektor. Ohne ihn gibt es keine
// anteilige Grenze, nur eine gegriffene Zahl.
let sektor = null;
if (gehaengt) {
  const drin = await seite.evaluate(async () => {
    const g = window.__game;
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Game', { stage: 3 });
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 250));
      const s = (g.scene.scenes || []).find((x) => x.scene.key === 'Game' && x.scene.isActive());
      if (!s) continue;
      if (!s.stageStarted && typeof s.startStage === 'function') s.startStage();
      if (s.player) return true;
    }
    return false;
  });
  if (!drin) M.ungemessen('das Gefecht kommt nicht hoch — ohne Massstab ist die Grenze nicht zu bilden.');
  else sektor = await messen('Sektor 3');
}
if (sektor == null && gehaengt) M.ungemessen('der Massstab (laufender Sektor) hat keine Zahl geliefert.');

const SCHIRME = ['Menu', 'Options', 'Hangar', 'Levels', 'Loadout', 'Gear', 'Arsenal', 'Workshop'];
let gemessen = 0;
if (gehaengt && sektor) {
  console.log('');
  for (const k of SCHIRME) {
    if (!await schirm(k)) { M.ungemessen(`der Schirm ${k} kommt nicht hoch — nicht gemessen.`); continue; }
    const r = await messen(k);
    if (!r) { M.ungemessen(`${k}: keine Bilder gezaehlt.`); continue; }
    gemessen++;
    if (r.fbo > sektor.fbo)
      M.befund(`${k} braucht ${r.fbo} Pufferwechsel je Bild, ein laufender Sektor nur ${sektor.fbo}. Auf einem Schirm, auf dem nichts passiert, ist jeder Zielwechsel Zierrat — und auf einer Kachel-Grafikeinheit der teuerste Posten. Verdaechtig ist preFX auf einer Ueberschrift: das rendert je Bild in ein eigenes Ziel und zurueck.`);
  }
}

await browser.close();
server.close();
console.log('');
if (!gemessen) M.ungemessen('kein Schirm gemessen — es steht keine Zahl zur Verfuegung.');
M.urteil(sektor ? `Massstab: Sektor 3 mit ${sektor.fbo} Pufferwechsel je Bild.` : '');
