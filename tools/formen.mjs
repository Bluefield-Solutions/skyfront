#!/usr/bin/env node
/*
  Formentor — wie weit stehen die Dinge als FORM auseinander?

    node tools/formen.mjs

  Zwei Gruppen, aus zwei verschiedenen Gruenden:

    Gegnerprojektile  Seit v2 tragen alle dieselbe Kennfarbe. Damit ist die
                      Form der einzige Traeger der Information "wer hat
                      geschossen".
    Gegner            Zwoelf Arten, jede mit eigenem Verhalten — aber die
                      Silhouetten sind nie als Familie entworfen worden,
                      sondern einzeln. Wer nicht sieht, WAS da kommt, kann
                      auch nicht wissen, was es tun wird.

  Gemessen wird an der ANZEIGEGROESSE (390 px breit → 0,722 Anzeigepunkte je
  Layoutpunkt), nicht am Quellbild. Der Spaeher ist auf dem Telefon 10 Punkte
  gross, die Elite 62 — bei zehn Punkten ist "Pfeil gegen Raute" womoeglich
  gar kein Unterschied mehr. Die Quellaufloesung ist hier die falsche
  Messstelle.

  Drei Zahlen je Paar:

    Deckung   Anteil gemeinsamer Flaeche (Schnitt durch Vereinigung) der
              beiden Silhouetten, mittig uebereinandergelegt.
    Profil    Breite der Silhouette auf sechzehn Hoehen, auf die groesste
              Breite bezogen — sagt, WIE die Flaeche verteilt ist. Deckung
              allein misst Masse: als eb_bolt von der runden Kapsel zum
              kantigen Leuchtspurkoerper wurde, STIEG die Deckung gegen
              eb_flame von 0,75 auf 0,80, weil der Bolzen laenger geworden
              war. Fuer das Auge war es sofort ein anderes Ding.
    Groesse   Verhaeltnis der Flaechen. Zwei aehnlich geformte Dinge sind
              trotzdem unterscheidbar, wenn eines doppelt so gross ist.

  Verwechselbar ist ein Paar erst, wenn ALLE DREI eng sind.
*/
import { existsSync, readFileSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const ANZEIGE = 0.722;          // 390 / 540
// Ab welcher Deckkraft ein Punkt zur SILHOUETTE gehoert. Nicht 96: jede Kugel
// traegt einen dunklen Hof (`Zt`, bis 0,55 Deckkraft = 140). Bei 96 zaehlt der
// Hof als Form — dann sind alle Kugeln runde Scheiben und die Messung misst
// den Hof, nicht die Form. Erster Anlauf tat genau das: eb_ring gegen eb_saw
// kam auf 0,89, obwohl das eine ein Reif und das andere eine volle Scheibe ist.
const DECKKRAFT = 200;
const STUFEN = 16;              // Hoehen, auf denen das Breitenprofil abliest

// Gemessen ueber die Paare: Deckung im Mittel 0,35, engstes 0,68; Profil im
// Mittel 0,27, engstes 0,12. Die Grenzen liegen dazwischen und haben zum
// naechsten gemessenen Wert mindestens das Anderthalbfache Abstand.
const ENG_DECKUNG = 0.72, ENG_PROFIL = 0.10, ENG_GROESSE = 1.35;

// Das Zielgeraet: 390 Anzeigepunkte breit, Puffer 1080 — also 2,77 Bildpunkte
// je Anzeigepunkt. Wer weniger Quellbildpunkte hat, wird hochgerechnet und
// wird weich. Das ist keine Meinung, das ist Division.
const GERAETE_PUNKTE = 1080 / 390;

const M = messstelle('Formentor', 'keine zwei Silhouetten sind zugleich gleich gross und gleich gebaut.');

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

// Was gemessen wird, kommt aus der QUELLE, nicht aus dem Kopf. Findet das Tor
// eine Tabelle nicht, bricht es ab — eine still gekuerzte Liste saehe aus wie
// ein bestandener Lauf.
const quelle = readFileSync('src/app.js', 'utf8');

const eb = /yt\.EB_STYLE = \{[\s\S]*?\n  \}/.exec(quelle);
if (!eb) { console.error('✗ EB_STYLE nicht in src/app.js gefunden'); process.exit(1); }
const KUGELN = [...eb[0].matchAll(/tex: "([a-z_0-9]+)",[\s\S]*?spin: (\d+)/g)]
  .map((m) => ({ name: m[1], tex: m[1], spin: Number(m[2]), skala: 1 }));
if (KUGELN.length !== 10) { console.error(`✗ EB_STYLE: ${KUGELN.length} Eintraege, 10 erwartet`); process.exit(1); }
// Die Rakete des Rocketeers fliegt ebenso auf den Spieler zu und gehoert dazu.
KUGELN.push({ name: 'missile', tex: 'missile', spin: 0, skala: 1 });

const ke = /\n  const Ke = \{[\s\S]*?\n  \};/.exec(quelle);
if (!ke) { console.error('✗ Gegnertabelle Ke nicht in src/app.js gefunden'); process.exit(1); }
const GEGNER = [];
for (const m of ke[0].matchAll(/(\w+): \{([\s\S]*?)\n    \}/g)) {
  const s = /scale: ([\d.]+)/.exec(m[2]);
  if (!s) continue;
  const t = /tex: "([^"]+)"/.exec(m[2]);
  GEGNER.push({ name: m[1], tex: t ? t[1] : 'e_' + m[1], spin: 0, skala: Number(s[1]) });
}
if (GEGNER.length < 12) { console.error(`✗ Gegnertabelle: nur ${GEGNER.length} Eintraege`); process.exit(1); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__game.scene.scenes.some((s) => s.scene.isActive()), null, { timeout: 90000 });

// NICHT auf eine Frist warten, sondern darauf, dass sich nichts mehr aendert.
//
// `ht()` loescht eine vorhandene Textur und legt sie neu an; die Bilder aus
// dem Vorrat kommen asynchron dazu und ersetzen sie noch einmal. Es gibt also
// ein Fenster, in dem eine Textur GAR NICHT existiert — bei 2000 ms fehlten
// Spaeher, Weber, Tiefflieger, Schuetze und Rotor. Ein Tor, das dann misst,
// misst acht von dreizehn und meldet gruen.
//
// Gewartet wird deshalb, bis Bestand UND Groessen zwei Runden lang gleich
// bleiben. Das ist der einzige Zustand, ueber den sich etwas sagen laesst.
async function stillstand(schluessel) {
  let vorher = '';
  for (let i = 0; i < 60; i++) {
    const jetzt = await seite.evaluate((keys) => {
      const g = window.__game;
      return keys.map((k) => {
        if (!g.textures.exists(k)) return k + ':-';
        const s = g.textures.get(k).getSourceImage();
        return k + ':' + (s && s.width ? s.width + 'x' + s.height : '?');
      }).join(',');
    }, schluessel);
    if (jetzt === vorher && !jetzt.includes(':-') && !jetzt.includes(':?')) return jetzt;
    vorher = jetzt;
    await seite.waitForTimeout(500);
  }
  return vorher;
}

async function messen(liste, raster) {
  return seite.evaluate(({ ANZEIGE, raster, liste, DECKKRAFT }) => {
    const g = window.__game;
    const c = document.createElement('canvas');
    c.width = raster; c.height = raster;
    const t = c.getContext('2d', { willReadFrequently: true });
    const aus = {};
    for (const { name, tex, spin, skala } of liste) {
      if (!g.textures.exists(tex)) { aus[name] = null; continue; }
      const src = g.textures.get(tex).getSourceImage();
      const w = src.width * skala * ANZEIGE, h = src.height * skala * ANZEIGE;
      const lagen = spin ? [0, 45, 90, 135] : [0];
      aus[name] = { w, h, tex, quelleW: src.width, quelleH: src.height, masken: [] };
      for (const grad of lagen) {
        t.clearRect(0, 0, raster, raster);
        t.save();
        t.translate(raster / 2, raster / 2);
        t.rotate(grad * Math.PI / 180);
        t.drawImage(src, -w / 2, -h / 2, w, h);
        t.restore();
        const d = t.getImageData(0, 0, raster, raster).data;
        const m = new Uint8Array(raster * raster);
        for (let i = 0, p = 0; i < d.length; i += 4, p++) m[p] = d[i + 3] >= DECKKRAFT ? 1 : 0;
        aus[name].masken.push({ grad, m: Array.from(m) });
      }
    }
    return aus;
  }, { ANZEIGE, raster, liste, DECKKRAFT });
}

const alleKeys = [...KUGELN, ...GEGNER].map((x) => x.tex);
const zustand = await stillstand(alleKeys);
// Nicht zur Ruhe gekommen heisst: es fehlt etwas oder es aendert sich noch.
// Bis hierher stand das als Hinweis im Protokoll und das Tor urteilte
// trotzdem — ueber die Silhouetten, die es gerade erwischt hatte.
if (zustand.includes(':-') || zustand.includes(':?'))
  M.ungemessen('Texturbestand kam nicht zur Ruhe: ' + zustand.split(',').filter((x) => /:[-?]$/.test(x)).join(' '));

// Der Hebel fuer die Gegenprobe: EINE Textur wegnehmen. Damit entsteht genau
// der Zustand, den das Tor bis v18 als Befund gemeldet hat.
if (OHNE_NAHT) await seite.evaluate(() => { window.__game.textures.remove('e_elite'); });

const rohKugeln = await messen(KUGELN, 64);
const rohGegner = await messen(GEGNER, 96);
await browser.close();

const flaeche = (m) => m.reduce((a, b) => a + b, 0);
const iou = (a, b) => {
  let s = 0, v = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) v++; if (a[i] && b[i]) s++; }
  return v ? s / v : 0;
};
const profil = (m, raster) => {
  const zeilen = [];
  for (let y = 0; y < raster; y++) {
    let n = 0;
    for (let x = 0; x < raster; x++) if (m[y * raster + x]) n++;
    zeilen.push(n);
  }
  const oben = zeilen.findIndex((n) => n > 0);
  if (oben < 0) return new Array(STUFEN).fill(0);
  const unten = zeilen.length - 1 - [...zeilen].reverse().findIndex((n) => n > 0);
  const hoch = unten - oben || 1, breit = Math.max(...zeilen) || 1;
  return Array.from({ length: STUFEN }, (_, i) => zeilen[oben + Math.round(i / (STUFEN - 1) * hoch)] / breit);
};
const profilAbstand = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

const befunde = [];

function auswerten(titel, roh, raster, wieviel) {
  const namen = Object.keys(roh).filter((k) => roh[k]);
  // Eine fehlende Textur ist KEIN Mangel an der Silhouette — es ist eine
  // Silhouette, ueber die dieses Tor nichts sagt. Als Befund gemeldet hat
  // sie einen roten Lauf erzeugt, der ueber das Spiel nichts aussagte;
  // genau diese Sorte falscher Befund kostete auf GitHub Lauf 31.
  for (const k of Object.keys(roh)) if (!roh[k]) M.ungemessen(`${titel}: Textur fuer ${k} nicht gefunden — diese Silhouette ist nicht beurteilt`);
  if (namen.length < wieviel) { M.ungemessen(`${titel}: nur ${namen.length} von ${wieviel} gemessen — kein Massstab, es wird gar nicht verglichen`); return; }

  const paare = [];
  for (let i = 0; i < namen.length; i++)
    for (let j = i + 1; j < namen.length; j++) {
      const A = roh[namen[i]], B = roh[namen[j]];
      // Ueber alle Lagen GEMITTELT, nicht das schlimmste Paar. Was sich dreht,
      // sieht man sich drehen: eine Raute mit 90 Grad in der Sekunde deckt den
      // Pfeil in einem Augenblick von vieren und steht in den anderen dreien
      // quer. Ein zufaellig deckungsgleicher Augenblick ist kein
      // Lesbarkeitsfehler. Die schlimmste Lage steht trotzdem daneben.
      let summe = 0, n = 0, schlimmste = 0, lage = '';
      for (const ma of A.masken) for (const mb of B.masken) {
        const v = iou(ma.m, mb.m);
        summe += v; n++;
        if (v > schlimmste) { schlimmste = v; lage = `${ma.grad}°/${mb.grad}°`; }
      }
      const fa = flaeche(A.masken[0].m), fb = flaeche(B.masken[0].m);
      paare.push({
        a: namen[i], b: namen[j],
        deckung: n ? summe / n : 0, schlimmste, lage,
        groesse: fa && fb ? Math.max(fa, fb) / Math.min(fa, fb) : 1,
        profil: profilAbstand(profil(A.masken[0].m, raster), profil(B.masken[0].m, raster)),
      });
    }
  paare.sort((x, y) => y.deckung - x.deckung);

  console.log(`\n${titel} — ${namen.length} Stueck bei Anzeigegroesse (Silhouette ab Deckkraft ${DECKKRAFT}/255)\n`);
  for (const n of namen)
    console.log(`    ${n.padEnd(12)} ${roh[n].w.toFixed(1).padStart(5)} x ${roh[n].h.toFixed(1).padStart(5)} Punkte · ${flaeche(roh[n].masken[0].m).toString().padStart(4)} Punkte Flaeche`);

  console.log('\n  Die sechs engsten Paare:');
  for (const p of paare.slice(0, 6))
    console.log(`    ${p.a.padEnd(12)} ${p.b.padEnd(12)} Deckung ${p.deckung.toFixed(2)} · Profil ${p.profil.toFixed(2)} · Groesse ${p.groesse.toFixed(2)}x`);

  const mD = paare.reduce((a, p) => a + p.deckung, 0) / paare.length;
  const mP = paare.reduce((a, p) => a + p.profil, 0) / paare.length;
  console.log(`\n  Mittel ueber alle ${paare.length} Paare: Deckung ${mD.toFixed(2)} · Profil ${mP.toFixed(2)}`);

  const eng = paare.filter((p) => p.deckung >= ENG_DECKUNG && p.profil <= ENG_PROFIL && p.groesse <= ENG_GROESSE);
  if (eng.length) {
    for (const p of eng)
      befunde.push(`${titel}: ${p.a} / ${p.b} — Deckung ${p.deckung.toFixed(2)}, Profil ${p.profil.toFixed(2)}, Groesse ${p.groesse.toFixed(2)}x: gleich gross, gleich gefuellt, gleich verteilt`);
  } else {
    // Wie weit ist das naechste Paar vom Tor entfernt? Ohne diese Zeile weiss
    // niemand, ob "gruen" heisst "weit weg" oder "um ein Hundertstel vorbei".
    let naechstes = null;
    for (const p of paare) {
      const noetig = Math.max(ENG_DECKUNG / p.deckung, p.profil / ENG_PROFIL, p.groesse / ENG_GROESSE);
      if (!naechstes || noetig < naechstes.noetig) naechstes = { p, noetig };
    }
    console.log(`  Kein Paar ist zugleich flaechen-, profil- UND groessengleich.`);
    console.log(`  Am naechsten dran: ${naechstes.p.a} / ${naechstes.p.b} — eine der drei Zahlen muesste sich um ${naechstes.noetig.toFixed(2)}x aendern.`);
  }
}

console.log(`Formentor · Grenzen: Deckung >= ${ENG_DECKUNG} UND Profil <= ${ENG_PROFIL} UND Groesse <= ${ENG_GROESSE}x`);
auswerten('Gegnerprojektile', rohKugeln, 64, 11);
auswerten('Gegner', rohGegner, 96, 12);

/* ---- Wer geschossen werden soll, darf nicht kleiner sein als das Geschoss --

   Der Spaeher mass 6,7 x 10,2 Punkte und hatte 17 Punkte Flaeche — weniger
   als JEDES Geschoss im Spiel (74 bis 294) und ein Neuntel des naechsten
   Gegners. Bei der Groesse traegt keine Silhouette mehr, das ist ein Punkt.

   Die Grenze ist nicht gesetzt, sondern abgeleitet: das kleinste Projektil
   des Spiels. Ein Ding, auf das man zielen soll, darf nicht kleiner sein als
   das, womit man zielt.                                                    */
{
  const kFl = Object.values(rohKugeln).filter(Boolean).map((x) => flaeche(x.masken[0].m));
  const grenze = Math.min(...kFl);
  const gegner = Object.entries(rohGegner).filter(([, v]) => v).map(([k, v]) => [k, flaeche(v.masken[0].m)]);
  gegner.sort((a, b) => a[1] - b[1]);
  console.log(`\nMindestgroesse — kleinstes Projektil: ${grenze} Punkte Flaeche`);
  for (const [k, fl] of gegner.slice(0, 4))
    console.log(`    ${k.padEnd(12)} ${String(fl).padStart(5)} Punkte  (${(fl / grenze).toFixed(2)}x)`);
  for (const [k, fl] of gegner)
    if (fl < grenze) befunde.push(`Gegner ${k} hat ${fl} Punkte Flaeche — weniger als das kleinste Projektil (${grenze}). Bei der Groesse gibt es keine Silhouette mehr.`);
}

/* ---- Aufloesung: was auf dem Zielgeraet ankommt ---------------------------

   Nur gemeldet, nicht gewertet: hier fehlen BILDER, kein Code. Die Zahl sagt,
   wie viele Quellbildpunkte je Geraetebildpunkt uebrig sind. Unter 1,0 wird
   hochgerechnet.                                                            */
{
  console.log(`\nAufloesung auf dem Zielgeraet (${GERAETE_PUNKTE.toFixed(2)} Bildpunkte je Anzeigepunkt)`);
  const zeilen = [];
  for (const [k, v] of Object.entries(rohGegner)) {
    if (!v) continue;
    const noetig = v.w * GERAETE_PUNKTE;
    zeilen.push({ k, quelle: v.quelleW, noetig, anteil: v.quelleW / noetig });
  }
  zeilen.sort((a, b) => a.anteil - b.anteil);
  // WEICH IM BILD ab 0,6x — und das ist nachgesehen, nicht gerechnet.
  //
  // "8 von 13 werden hochgerechnet" war richtig und unbrauchbar: es sagte
  // nicht, welche davon man SIEHT. In Geraetegroesse nebeneinander gelegt
  // (docs/AUDIT, Nachtrag v16) halten kamikaze und gunship bei 0,76x,
  // bomber bei 0,81x, arcer bei 0,84x und rocketeer bei 0,90x tadellos.
  // Matschig sind drei: elite 0,37x, carrier 0,42x und rotor 0,53x.
  const WEICH = 0.6;
  for (const z of zeilen) {
    const marke = z.anteil < WEICH ? '  WEICH IM BILD' : z.anteil < 1 ? '  hochgerechnet' : '';
    console.log(`    ${z.k.padEnd(12)} Quelle ${String(z.quelle).padStart(4)} px · gebraucht ${z.noetig.toFixed(0).padStart(4)} px · ${z.anteil.toFixed(2)}x${marke}`);
  }
  const schlecht = zeilen.filter((z) => z.anteil < 1).length;
  const weich = zeilen.filter((z) => z.anteil < WEICH);
  console.log(`    ${schlecht} von ${zeilen.length} werden hochgerechnet, davon ${weich.length} sichtbar weich (unter ${WEICH}x).`);
  if (weich.length) {
    console.log('    Zu beheben an den BILDERN, nicht am Code. Gebraucht wird je Quellbild:');
    for (const z of weich)
      console.log(`      ${z.k.padEnd(10)} ${String(z.quelle).padStart(4)} px → mindestens ${z.noetig.toFixed(0)} px breit  (+${(z.noetig - z.quelle).toFixed(0)} px)`);
    // Nachgemessen und verworfen: eine Unschaerfemaske nach dem Hochrechnen
    // hebt in glatten Flaechen genauso viel wie an Kanten (elite bei
    // Staerke 0,7: +9,6 % an Kanten, +9,4 % in Flaechen). Sie stellt keine
    // Struktur her, sie dreht den Kontrast des Sprites hoch und verstaerkt
    // das Oberflachenkorn mit. Kein Ersatz fuer Bildpunkte.
    console.log('    (Eine Schaerfemaske ist geprueft und verworfen — sie verstaerkt Korn wie Kanten.)');
  }
}

for (const b of befunde) M.befund(b);
M.urteil();
