#!/usr/bin/env node
/*
  Überlappung — deckt im Menü irgendetwas irgendetwas anderes zu?

    node tools/ueberlappung.mjs            alle Menüschirme
    node tools/ueberlappung.mjs --bild     zusätzlich Aufnahmen nach dist/

  DER ANLASS kam vom Nutzer, mit einem Bildschirmfoto der Level-Vorschau:
  „Die Bilder im Level-Preview duerfen nicht ueberlappend sein, genauso wie
  sonst auch nichts ueberlappend sein darf."

  Auf dem Foto lag ein Gegnerbild quer ueber dem Missionsziel, ueber der
  Ueberschrift, ueber zwei Nachbarn und ueber den Praemien. Nachgemessen:
  e_lanzenwache wird 162 x 401 Weltpunkte gross gezeichnet — in einer Spalte,
  die 88 breit ist. Vierzehn Tore waren dabei gruen. Keines hat je gefragt,
  ob zwei Dinge uebereinander liegen.

  WARUM ES KEIN TOR GAB: die bisherigen Tore messen FARBE (Farbtor),
  SILHOUETTE (Formentor) und KANTEN (Bildtor) — alles an einzelnen Bildern.
  Wo etwas LIEGT, hat nie jemand gemessen. Ein Bild kann tadellos sein und
  trotzdem an der falschen Stelle stehen.

  GEMESSEN WIRD am gebauten Spiel, im Browser, bei 390 x 844 (iPhone
  hochkant, das Zielgeraet):

    Auf der Leinwand   die Rechtecke aller Texte und Bilder jedes
                       Menueschirms, paarweise geschnitten
    Ueber der Leinwand die festen DOM-Knoepfe (Modifikator) gegen die
                       Knoepfe im Spiel — sie liegen ausserhalb von Phaser
                       und wuerden einer Messung auf der Leinwand entgehen

  DIE REGEL — und sie kommt aus der ZEICHENREIHENFOLGE, nicht aus einer
  Liste von Ausnahmen. Ein erster Entwurf zaehlte einfach jedes Paar, das
  sich schneidet, und meldete 446 Befunde: die Vignette gegen alles, die
  Funken gegen den Titel, die Beschriftung auf dem Flugzeug im Hauptmenue.
  Nichts davon ist ein Mangel. Ein Wort, das ABSICHTLICH auf ein Bild
  gesetzt wird, wird nach dem Bild gezeichnet — ein Bild, das ein Wort
  ZUDECKT, wird danach gezeichnet. Das ist der ganze Unterschied, und er
  steht in der Anzeigeliste.

    A  Ein Bild darf nichts verdecken, was vor ihm gezeichnet wurde.
    B  Zwei Schaltflaechen duerfen sich nicht ueberlappen, und eine
       Schaltflaeche darf nicht auf einem Bild liegen.
    C  Zwei Beschriftungen duerfen sich nicht schneiden. Hier gibt es
       keine erlaubte Lesart — zwei Worte uebereinander sind unlesbar.

  Nicht gezaehlt wird, was Unterlage ist (Hintergrund, Vignette: alles, was
  ueber 45 % der Flaeche deckt), was durchscheinend ist (Alpha unter 0,5 —
  ein Schleier verdeckt nichts) und was kleiner als acht Punkte ist
  (Funken).

  DIE GEGNERBILDER MUESSEN GELADEN SEIN. Sie kommen nachtraeglich; beim
  ersten Betreten fehlt die Haelfte, und dann misst man ein halbleeres Band
  und meldet gruen. Deshalb wird jeder Schirm ZWEIMAL betreten und vorher
  geprueft, wieviele Gegnerbilder wirklich einen Rahmen haben.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Überlappung', 'kein Text und kein Bild liegt auf einem anderen.');
const BILD = process.argv.includes('--bild');
// Zwei Weltpunkte Spiel: Textrahmen tragen etwas Luft, und zwei Zeilen, die
// sich um einen Punkt beruehren, sind keine Ueberdeckung. Bei 390 px Breite
// ist ein Weltpunkt 0,72 Bildpunkte — die Schwelle ist also kleiner als
// anderthalb Bildpunkte und faengt trotzdem jedes echte Uebereinander.
const SPIEL = 2;
// Was so gross ist, ist Unterlage und nicht Inhalt.
const GRUND_ANTEIL = .45;

const SCHIRME = [
  { key: 'Menu' },
  { key: 'Levels' },
  { key: 'Briefing', arg: { stage: 6, sel: 'easy' } },
  { key: 'Hangar' },
  { key: 'Loadout' },
  { key: 'Arsenal' },
  { key: 'Workshop' },
  { key: 'Options' },
];

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

// UEBER HTTP, nicht ueber file://. Unter file:// wirft localStorage, und
// damit laesst sich keine Einweisung als gesehen merken: der Dialog kommt
// nach jedem Tipp zurueck, und gemessen wird ein Schirm, den so niemand
// sieht. Erster Anlauf hat genau das getan und vierzehn Befunde gemeldet,
// die alle die Einweisung gegen den Schirm dahinter waren.
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
await seite.goto(adresse);
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
await seite.waitForTimeout(2500);

// Die Naht: ohne die Leseschnittstelle der Anzeigeliste gibt es nichts zu
// messen. `--ohne-naht` nimmt sie weg und verlangt die Rueckgabe 2.
if (OHNE_NAHT) await seite.evaluate(() => { window.__game.scene.getScene = () => null; });

console.log('Überlappung\n');
console.log('  gemessen bei 390 x 844 (iPhone hochkant), Welt 540 x 960\n');

// Wieviele Gegnerbilder haben ueberhaupt einen Rahmen? Ohne das misst man
// ein halbleeres Band.
const bilder = await seite.evaluate(() => {
  const t = window.__game.textures;
  const arten = Object.keys(window.__SKF_GEGNER || {});
  let da = 0, offen = [];
  for (const a of arten) {
    const k = (window.__SKF_GEGNER[a].tex) || ('e_' + a);
    const hat = t.exists(k) && !!t.get(k).firstFrame && !!t.get(k).frames[t.get(k).firstFrame];
    hat ? da++ : offen.push(a);
  }
  return { gesamt: arten.length, da, offen };
});

const schnitt = (a, b) => {
  const x = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const y = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return (x > SPIEL && y > SPIEL) ? { x: Math.round(x), y: Math.round(y) } : null;
};

let gemessen = 0;
for (const s of SCHIRME) {
  const daten = await seite.evaluate(async ({ key, arg }) => {
    const g = window.__game;
    try {
      g.scene.getScenes(true).forEach((z) => z.scene.key !== 'Boot' && z.scene.stop());
      // Zweimal: beim ersten Betreten fehlen die nachgeladenen Bilder.
      g.scene.start(key, arg || {});
      await new Promise((f) => setTimeout(f, 3000));
      g.scene.stop(key); g.scene.start(key, arg || {});
      await new Promise((f) => setTimeout(f, 3000));
      // Einweisungen wegtippen. Beim ersten Betreten legt sich ueber die
      // Ausruestung ein Dialog, und dahinter liegt der ganze Schirm — nach
      // Rechtecken gerechnet ueberlappt dann alles mit allem. Das ist kein
      // Mangel, sondern eine eigene Schicht. Gemessen wird der Schirm, den
      // der Spieler ab dem zweiten Mal sieht.
      for (let runde = 0; runde < 3; runde++) {
        const sz0 = g.scene.getScene(key);
        if (!sz0) break;
        const flach0 = [];
        const geh0 = (arr) => { for (const o of arr) { flach0.push(o); if (o.list) geh0(o.list); } };
        geh0(sz0.children.list);
        const wort = flach0.find((o) => o.type === 'Text' && /^(Verstanden|Alles klar|Los geht|OK)\b/.test(String(o.text || '')));
        if (!wort) break;
        const m = wort.getBounds();
        const mx = m.x + m.width / 2, my = m.y + m.height / 2;
        // Die KLEINSTE Flaeche, die das Wort enthaelt — nicht die erste.
        // Der erste Anlauf nahm die Tafel des Dialogs (484 x 486) statt des
        // Knopfes (200 x 46): sie liegt frueher in der Liste und enthaelt
        // den Punkt auch. Auf ihr haengt kein Handler, es passierte nichts,
        // und der Dialog stand weiter im Bild.
        const treffend = flach0.filter((o) => o.type === 'Zone' && o.input).filter((o) => {
          const q = o.getBounds();
          return mx >= q.x && mx <= q.x + q.width && my >= q.y && my <= q.y + q.height;
        });
        treffend.sort((u, v2) => (u.getBounds().width * u.getBounds().height) - (v2.getBounds().width * v2.getBounds().height));
        const z = treffend[0];
        if (!z) break;
        z.emit('pointerdown');
        await new Promise((f) => setTimeout(f, 1200));
      }
    } catch (e) { return { fehler: String(e) }; }
    const sz = g.scene.getScene(key);
    if (!sz || !sz.children) return { fehler: 'Szene nicht erreichbar' };
    const kam = sz.cameras && sz.cameras.main;
    if (!kam) return { fehler: 'keine Kamera' };
    // Die Kamera misst in LEINWANDPUNKTEN (1080 x 1920), das Spiel rechnet
    // in Weltpunkten (540 x 960) — die Kamera zoomt zweifach. Wer die
    // Kameramasse fuer die Welt haelt, haelt die Vignette fuer ein Viertel
    // des Schirms und zaehlt sie als Inhalt. Erster Lauf: 160 Befunde,
    // davon 120 die Vignette gegen alles.
    const BREITE = kam.width / (kam.zoom || 1), HOEHE = kam.height / (kam.zoom || 1), FLAECHE = BREITE * HOEHE;

    // Flach machen und in ZEICHENREIHENFOLGE bringen: erst nach Tiefe,
    // dann nach Platz in der Liste. Phaser zeichnet genau so.
    const flach = [];
    const geh = (arr) => { for (const o of arr) { flach.push(o); if (o.list) geh(o.list); } };
    geh(sz.children.list);
    flach.forEach((o, i) => { o.__i = i; });
    const ordnung = flach.slice().sort((a, b) => ((a.depth || 0) - (b.depth || 0)) || (a.__i - b.__i));

    const raus = [];
    ordnung.forEach((o, z) => {
      const istZone = o.type === 'Zone' && !!o.input;
      const istBild = o.type === 'Image' || o.type === 'Sprite';
      const istText = o.type === 'Text' || o.type === 'BitmapText';
      if (!istZone && !istBild && !istText) return;
      if (!o.visible) return;
      if (!istZone && (o.alpha ?? 1) < .5) return;
      let b = null;
      try { b = o.getBounds(); } catch (e) { raus.push({ name: (o.texture && o.texture.key) || o.type, rahmenlos: true }); return; }
      if (!b || b.width < 8 || b.height < 8) return;
      if (b.width * b.height >= FLAECHE * 0.45) return;   // Unterlage
      raus.push({
        z,
        art: istZone ? 'knopf' : istBild ? 'bild' : 'text',
        name: istText ? JSON.stringify(String(o.text).slice(0, 24)) : (istZone ? 'Schaltfläche' : ((o.texture && o.texture.key) || 'Bild')),
        b: [b.x, b.y, b.width, b.height].map((n) => Math.round(n * 10) / 10),
      });
    });
    const lw = document.querySelector('canvas').getBoundingClientRect();
    const dom = [...document.querySelectorAll('body > *')]
      .filter((e) => getComputedStyle(e).position === 'fixed' && getComputedStyle(e).display !== 'none'
        && (e.textContent || '').trim() && e.getBoundingClientRect().width < 300)
      .map((e) => { const r = e.getBoundingClientRect(); return { text: (e.textContent || '').trim().slice(0, 24), r: [r.x, r.y, r.width, r.height].map(Math.round) }; });
    return { breite: BREITE, hoehe: HOEHE, lw: [lw.x, lw.y, lw.width, lw.height].map((n) => Math.round(n * 10) / 10), raus, dom };
  }, s);

  if (daten.fehler) { M.ungemessen(`${s.key}: ${daten.fehler}`); continue; }
  gemessen++;
  const rahmenlos = daten.raus.filter((o) => o.rahmenlos);
  const dinge = daten.raus.filter((o) => !o.rahmenlos);

  const treffer = [];
  // A — ein Bild verdeckt, was vor ihm gezeichnet wurde.
  for (const bild of dinge.filter((o) => o.art === 'bild')) {
    for (const frueher of dinge) {
      if (frueher.z >= bild.z || frueher.art === 'knopf') continue;
      const t = schnitt(bild.b, frueher.b);
      if (t) treffer.push({ regel: 'A', a: bild, b: frueher, t });
    }
  }
  // C — zwei Beschriftungen uebereinander. Anders als bei Bild und Wort
  // gibt es hier keine erlaubte Lesart: zwei Worte, die sich schneiden,
  // sind unlesbar, ganz gleich welches zuerst gezeichnet wurde.
  const texte = dinge.filter((o) => o.art === 'text');
  for (let i = 0; i < texte.length; i++) {
    for (let j = i + 1; j < texte.length; j++) {
      const t = schnitt(texte[i].b, texte[j].b);
      if (t) treffer.push({ regel: 'C', a: texte[i], b: texte[j], t, was: 'zwei Beschriftungen' });
    }
  }
  // B — Schaltflächen gegen Schaltflächen und gegen Bilder.
  const knoepfe = dinge.filter((o) => o.art === 'knopf');
  for (let i = 0; i < knoepfe.length; i++) {
    for (let j = i + 1; j < knoepfe.length; j++) {
      const t = schnitt(knoepfe[i].b, knoepfe[j].b);
      if (t) treffer.push({ regel: 'B', a: knoepfe[i], b: knoepfe[j], t, was: 'zwei Schaltflächen' });
    }
    for (const bild of dinge.filter((o) => o.art === 'bild')) {
      // Ein Knopf, der das Bild MEINT, umschliesst seinen Mittelpunkt — die
      // drei Symbolknoepfe unten im Hauptmenue, das antippbare Flugzeug.
      // Ein Knopf, der auf einem Bild LIEGT, tut das nicht. Ohne diese
      // Unterscheidung meldet die Regel jedes bebilderte Knopffeld.
      const mx = bild.b[0] + bild.b[2] / 2, my = bild.b[1] + bild.b[3] / 2;
      const k = knoepfe[i].b;
      const gehoert = mx >= k[0] && mx <= k[0] + k[2] && my >= k[1] && my <= k[1] + k[3];
      if (gehoert) continue;
      const t = schnitt(k, bild.b);
      if (t) treffer.push({ regel: 'B', a: knoepfe[i], b: bild, t, was: 'Schaltfläche auf Bild' });
    }
  }
  treffer.sort((p, q) => q.t.x * q.t.y - p.t.x * p.t.y);

  const zahl = (o) => `${o.name} [${o.b[0]},${o.b[1]} ${o.b[2]}x${o.b[3]}]`;
  console.log(`  ${s.key.padEnd(10)} ${String(dinge.length).padStart(3)} Dinge · ${treffer.length} Überlappung(en)`);
  for (const t of treffer.slice(0, 8)) console.log(`      ${t.regel}  ${t.t.x}x${t.t.y}   ${zahl(t.a)}  ⨯  ${zahl(t.b)}`);
  if (treffer.length > 8) console.log(`      … und ${treffer.length - 8} weitere`);
  for (const t of treffer) {
    M.befund(t.regel === 'A'
      ? `${s.key}: ${zahl(t.a)} verdeckt ${zahl(t.b)} — ${t.t.x}x${t.t.y} Weltpunkte.`
      : `${s.key}: ${t.was} — ${zahl(t.a)} ⨯ ${zahl(t.b)}, ${t.t.x}x${t.t.y} Weltpunkte.`);
  }
  for (const r of rahmenlos) M.ungemessen(`${s.key}: ${r.name} hat keinen Rahmen (Bild noch nicht geladen) — nicht messbar.`);

  // Die festen Knoepfe ueber der Leinwand. Sie liegen ausserhalb von Phaser
  // und wuerden der Messung auf der Leinwand entgehen — genau deshalb sind
  // sie zweimal aufgefallen und nie gemessen worden.
  const [lx, ly, lw2, lh] = daten.lw;
  const inLeinwand = (welt) => [lx + welt[0] / daten.breite * lw2, ly + welt[1] / daten.hoehe * lh,
    welt[2] / daten.breite * lw2, welt[3] / daten.hoehe * lh].map((n) => Math.round(n * 10) / 10);
  for (const d of daten.dom) {
    for (const o of dinge) {
      if (o.art === 'text') continue;
      const t = schnitt(d.r, inLeinwand(o.b));
      if (t) M.befund(`${s.key}: der feste Knopf "${d.text}" liegt auf ${o.name} — ${t.x}x${t.y} Bildpunkte.`);
    }
  }
  if (BILD) await seite.screenshot({ path: `dist/ueberlappung-${s.key}.png` });
}

// ---- Die Knoepfe ueber der Leinwand, bei verschiedenen Bildschirmen ----
//
// Sie liegen ausserhalb von Phaser, also ausserhalb jeder Messung auf der
// Leinwand — und genau sie lagen auf dem Bildschirmfoto des Nutzers ueber
// "‹ Weltkarte". Wo sie landen, haengt allein vom Verhaeltnis des
// Bildschirms ab: die Leinwand ist 9:16, das Telefon ist schmaler, und was
// oben und unten schwarz bleibt, ist der Platz, den sie haben.
//
// Verlangt wird: sobald EIN Balken 36 Punkte nutzbar hat, liegt kein Knopf
// mehr auf der Leinwand. Bleibt keiner — ein Geraet mit fast genau 9:16 —,
// ist es unvermeidlich und wird als solches gemeldet, nicht als Mangel.
const SCHIRMGROESSEN = [[390, 844], [390, 800], [390, 760], [402, 874]];
console.log('\n  Knöpfe über der Leinwand');
for (const [br, ho] of SCHIRMGROESSEN) {
  await seite.setViewportSize({ width: br, height: ho });
  await seite.waitForTimeout(900);
  const d = await seite.evaluate(() => {
    const k = document.querySelector('canvas').getBoundingClientRect();
    const sicht = window.innerHeight;
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;'
      + 'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(p);
    const cs = getComputedStyle(p);
    const so = parseFloat(cs.paddingTop) || 0, su = parseFloat(cs.paddingBottom) || 0;
    p.remove();
    const knoepfe = [...document.querySelectorAll('body > button')]
      .filter((e) => getComputedStyle(e).display !== 'none')
      .map((e) => { const r = e.getBoundingClientRect(); return { text: (e.textContent || '').trim().slice(0, 20), r: [r.x, r.y, r.width, r.height].map((n) => Math.round(n)) }; });
    return {
      lw: [k.x, k.y, k.width, k.height].map((n) => Math.round(n)),
      oben: Math.round(Math.max(0, k.top - so)), unten: Math.round(Math.max(0, sicht - k.bottom - su)),
      knoepfe,
    };
  });
  const platz = Math.max(d.oben, d.unten);
  const auf = d.knoepfe.filter((b2) => schnitt(b2.r, d.lw));
  console.log(`    ${br}x${ho}   Leinwand y ${d.lw[1]}..${d.lw[1] + d.lw[3]} · Balken oben ${d.oben} / unten ${d.unten} · ${d.knoepfe.length} Knopf/Knöpfe, ${auf.length} auf der Leinwand`);
  for (const b2 of auf) {
    if (platz >= 36) M.befund(`bei ${br}x${ho} liegt der feste Knopf "${b2.text}" auf der Leinwand, obwohl der Balken ${platz} Punkte hat.`);
    else M.ungemessen(`bei ${br}x${ho} hat kein Balken 36 Punkte (oben ${d.oben}, unten ${d.unten}) — der Knopf muss auf die Leinwand.`);
  }
}
await seite.setViewportSize({ width: 390, height: 844 });

console.log(`\n  Gegnerbilder geladen: ${bilder.da} von ${bilder.gesamt}${bilder.offen.length ? '  (offen: ' + bilder.offen.join(', ') + ')' : ''}`);
if (bilder.da === 0) M.ungemessen('kein einziges Gegnerbild geladen — das Gegnerband ist nicht gemessen.');
if (!gemessen) M.ungemessen('kein Schirm messbar.');

await browser.close();
server.close();
M.urteil(`${gemessen} Menüschirme, ${bilder.da} Gegnerbilder geladen.`);
