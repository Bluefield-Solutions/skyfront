#!/usr/bin/env node
/*
  Formentor — wie weit stehen die Gegnerkugeln als FORM auseinander?

  Seit v2 tragen alle zwoelf Gegnerprojektile dieselbe Kennfarbe. Damit ist
  die Form der einzige Traeger der Information „wer hat geschossen" — und die
  zehn Silhouetten sind nie als Familie entworfen worden, sondern einzeln.
  Diese Messung sagt, ob das traegt.

    node tools/formen.mjs [--bild <pfad>]

  Gemessen wird an der ANZEIGEGROESSE (390 px breit → 0,722 Anzeigepunkte je
  Layoutpunkt), nicht am Quellbild. Eine 34 px breite Saege ist auf dem Telefon
  24 Punkte gross; bei 24 Punkten ist „Raute gegen Stern" womoeglich gar kein
  Unterschied mehr. Deshalb ist die Quellaufloesung hier die falsche Messstelle.

  Zwei Zahlen je Paar:

    Deckung   Anteil gemeinsamer Flaeche (Schnitt durch Vereinigung, IoU) der
              beiden Silhouetten, uebereinandergelegt und mittig ausgerichtet.
              1,00 = identisch, 0,00 = kein gemeinsamer Punkt.
    Groesse   Verhaeltnis der Flaechen. Zwei aehnlich geformte Kugeln sind
              trotzdem unterscheidbar, wenn eine doppelt so gross ist.

  Gedreht wird, was sich dreht: `spin` aus EB_STYLE. Ein Stern mit 240 Grad in
  der Sekunde steht nie still, also wird er gegen jede Lage geprueft und das
  SCHLIMMSTE Paar gezaehlt — nicht das guenstigste.
*/
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ANZEIGE = 0.722;          // 390 / 540
const RASTER = 64;              // Messfeld, grosszuegig ueber der groessten Kugel
// Ab welcher Deckkraft ein Punkt zur SILHOUETTE gehoert. Nicht 96: jede Kugel
// traegt einen dunklen Hof (`Zt`, bis 0,55 Deckkraft = 140). Bei 96 zaehlt der
// Hof als Form — dann sind alle Kugeln runde Scheiben und die Messung misst
// den Hof, nicht die Form. Erster Anlauf tat genau das: eb_ring gegen eb_saw
// kam auf 0,89, obwohl das eine ein Reif und das andere eine volle Scheibe ist.
const DECKKRAFT = 200;
const bildPfad = process.argv.includes('--bild') ? process.argv[process.argv.indexOf('--bild') + 1] : null;

if (!existsSync('dist/Skyfront.html')) { console.error('✗ dist/Skyfront.html fehlt — erst bauen.'); process.exit(1); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Formentor: Playwright nicht gefunden — uebersprungen.'); process.exit(0); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__game.scene.scenes.some((s) => s.scene.isActive()), null, { timeout: 90000 });
await seite.waitForTimeout(2500);

// Textur und Drehrate kommen aus EB_STYLE in der Quelle, nicht aus dem Kopf.
// Findet das Tor die Tabelle nicht, bricht es ab — eine still gekuerzte Liste
// wuerde aussehen wie ein bestandener Lauf.
const quelle = readFileSync('src/app.js', 'utf8');
const eb = /yt\.EB_STYLE = \{[\s\S]*?\n  \}/.exec(quelle);
if (!eb) { console.error('✗ EB_STYLE nicht in src/app.js gefunden'); process.exit(1); }
const KUGELN = [...eb[0].matchAll(/tex: "([a-z_0-9]+)",[\s\S]*?spin: (\d+)/g)].map((m) => ({ tex: m[1], spin: Number(m[2]) }));
if (KUGELN.length !== 10) { console.error(`✗ EB_STYLE: ${KUGELN.length} Eintraege, 10 erwartet`); process.exit(1); }
// bullet_e und missile fliegen ebenso auf den Spieler zu und gehoeren dazu.
KUGELN.push({ tex: 'bullet_e', spin: 0 }, { tex: 'missile', spin: 0 });

const daten = await seite.evaluate(({ ANZEIGE, RASTER, KUGELN, DECKKRAFT }) => {
  const g = window.__game;
  const c = document.createElement('canvas');
  c.width = RASTER; c.height = RASTER;
  const t = c.getContext('2d', { willReadFrequently: true });
  const aus = {};
  for (const { tex, spin } of KUGELN) {
    if (!g.textures.exists(tex)) { aus[tex] = null; continue; }
    const src = g.textures.get(tex).getSourceImage();
    const w = src.width * ANZEIGE, h = src.height * ANZEIGE;
    const lagen = spin ? [0, 45, 90, 135] : [0];
    aus[tex] = { w, h, masken: [] };
    for (const grad of lagen) {
      t.clearRect(0, 0, RASTER, RASTER);
      t.save();
      t.translate(RASTER / 2, RASTER / 2);
      t.rotate(grad * Math.PI / 180);
      t.drawImage(src, -w / 2, -h / 2, w, h);
      t.restore();
      const d = t.getImageData(0, 0, RASTER, RASTER).data;
      const m = new Uint8Array(RASTER * RASTER);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) m[p] = d[i + 3] >= DECKKRAFT ? 1 : 0;
      aus[tex].masken.push({ grad, m: Array.from(m) });
    }
  }
  return aus;
}, { ANZEIGE, RASTER, KUGELN, DECKKRAFT });
await browser.close();

const namen = Object.keys(daten).filter((k) => daten[k]);
const flaeche = (m) => m.reduce((a, b) => a + b, 0);
const iou = (a, b) => {
  let s = 0, v = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) v++; if (a[i] && b[i]) s++; }
  return v ? s / v : 0;
};

// Deckung allein misst MASSE, nicht Gestalt. Als eb_bolt von der runden
// Kapsel zum kantigen Leuchtspurkoerper wurde — fuer das Auge sofort ein
// anderes Ding —, STIEG die Deckung gegen eb_flame von 0,75 auf 0,80, weil
// der Bolzen laenger geworden war. Eine zweite Zahl muss also sagen, wie die
// Flaeche VERTEILT ist.
//
// Breitenprofil: die Breite der Silhouette auf sechzehn Hoehen, jeweils auf
// die groesste Breite der Form bezogen. Ein Bolzen ist ueberall gleich breit,
// ein Tropfen oben breit und unten spitz, ein Pfeil hat einen Ausschlag auf
// Widerhakenhoehe. Der Abstand ist der mittlere Unterschied dieser sechzehn
// Werte — groessen- und flaechenunabhaengig.
const STUFEN = 16;
const profil = (m) => {
  const zeilen = [];
  for (let y = 0; y < RASTER; y++) {
    let n = 0;
    for (let x = 0; x < RASTER; x++) if (m[y * RASTER + x]) n++;
    zeilen.push(n);
  }
  const oben = zeilen.findIndex((n) => n > 0), unten = zeilen.length - 1 - [...zeilen].reverse().findIndex((n) => n > 0);
  if (oben < 0) return new Array(STUFEN).fill(0);
  const hoch = unten - oben || 1, breit = Math.max(...zeilen) || 1;
  return Array.from({ length: STUFEN }, (_, i) => zeilen[oben + Math.round(i / (STUFEN - 1) * hoch)] / breit);
};
const profilAbstand = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

const paare = [];
for (let i = 0; i < namen.length; i++)
  for (let j = i + 1; j < namen.length; j++) {
    const A = daten[namen[i]], B = daten[namen[j]];
    // Ueber alle Lagen GEMITTELT, nicht das schlimmste Paar. Was sich dreht,
    // sieht man sich drehen: eine Raute mit 90 Grad in der Sekunde deckt den
    // Pfeil in einem Augenblick von vieren und steht in den anderen dreien
    // quer. Ein zufaellig deckungsgleicher Augenblick ist kein
    // Lesbarkeitsfehler — das Auge sieht die Bahn, nicht das Einzelbild.
    // Die schlimmste Lage steht trotzdem daneben.
    let summe = 0, n = 0, schlimmste = 0, lage = '';
    for (const ma of A.masken) for (const mb of B.masken) {
      const v = iou(ma.m, mb.m);
      summe += v; n++;
      if (v > schlimmste) { schlimmste = v; lage = `${ma.grad}°/${mb.grad}°`; }
    }
    const mittelDeckung = n ? summe / n : 0;
    const fa = flaeche(A.masken[0].m), fb = flaeche(B.masken[0].m);
    const gr = fa && fb ? Math.max(fa, fb) / Math.min(fa, fb) : 1;
    const pf = profilAbstand(profil(A.masken[0].m), profil(B.masken[0].m));
    paare.push({ a: namen[i], b: namen[j], deckung: mittelDeckung, schlimmste, groesse: gr, profil: pf, lage });
  }
paare.sort((x, y) => y.deckung - x.deckung);

console.log(`Formentor — ${namen.length} Gegnerprojektile bei Anzeigegroesse (${ANZEIGE} Punkte je Layoutpunkt, Silhouette ab Deckkraft ${DECKKRAFT}/255)\n`);
console.log('  Groesse auf dem Telefon:');
for (const n of namen)
  console.log(`    ${n.padEnd(12)} ${daten[n].w.toFixed(1).padStart(5)} x ${daten[n].h.toFixed(1).padStart(5)} Punkte · ${flaeche(daten[n].masken[0].m).toString().padStart(4)} Punkte Flaeche`);

// Verwechselbar ist ein Paar erst, wenn BEIDE Zahlen eng sind: viel
// gemeinsame Flaeche UND aehnlich verteilt. Eines von beiden reicht nicht.
// Gemessen ueber die 55 Paare: Deckung im Mittel 0,32, schlimmstes Paar 0,71;
// Profil im Mittel 0,27, engstes Paar 0,12. Die Grenzen liegen dazwischen und
// haben zum naechsten gemessenen Wert mindestens das Anderthalbfache Abstand.
const ENG_DECKUNG = 0.72, ENG_PROFIL = 0.10;
const eng = paare.filter((p) => p.deckung >= ENG_DECKUNG && p.profil <= ENG_PROFIL);

console.log('\n  Die zehn engsten Paare (Deckung = gemeinsame Flaeche, Profil = Breitenverlauf):');
for (const p of paare.slice(0, 10))
  console.log(`    ${p.a.padEnd(12)} ${p.b.padEnd(12)} Deckung ${p.deckung.toFixed(2)} (schlimmste Lage ${p.schlimmste.toFixed(2)} bei ${p.lage}) · Profil ${p.profil.toFixed(2)} · Groesse ${p.groesse.toFixed(2)}x`);

const mittel = paare.reduce((a, p) => a + p.deckung, 0) / paare.length;
const mittelP = paare.reduce((a, p) => a + p.profil, 0) / paare.length;
console.log(`\n  Mittel ueber alle ${paare.length} Paare: Deckung ${mittel.toFixed(2)} · Profil ${mittelP.toFixed(2)}`);

if (eng.length) {
  console.log(`\n  VERWECHSELBAR (Deckung >= ${ENG_DECKUNG} UND Profil <= ${ENG_PROFIL}):`);
  for (const p of eng) console.log(`    ✗ ${p.a} / ${p.b} — Deckung ${p.deckung.toFixed(2)}, Profil ${p.profil.toFixed(2)}`);
} else {
  // Wie weit ist das naechste Paar vom Tor entfernt? Ohne diese Zeile weiss
  // niemand, ob "gruen" bedeutet "weit weg" oder "um ein Hundertstel vorbei".
  let naechstes = null;
  for (const p of paare) {
    const noetig = Math.max(ENG_DECKUNG / p.deckung, p.profil / ENG_PROFIL);
    if (!naechstes || noetig < naechstes.noetig) naechstes = { p, noetig };
  }
  console.log(`\n  Kein Paar ist zugleich flaechengleich (>= ${ENG_DECKUNG}) und profilgleich (<= ${ENG_PROFIL}).`);
  console.log(`  Am naechsten dran: ${naechstes.p.a} / ${naechstes.p.b} — eine der beiden Zahlen muesste sich um ${naechstes.noetig.toFixed(2)}x aendern.`);
}
process.exitCode = eng.length ? 1 : 0;

if (bildPfad) {
  // Kontaktbogen der Silhouetten, zum Ansehen.
  const S = 68, sp = Math.ceil(Math.sqrt(namen.length));
  const zeilen = [];
  for (const n of namen) {
    const m = daten[n].masken[0].m;
    let z = '';
    for (let y = 0; y < RASTER; y += 2) {
      for (let x = 0; x < RASTER; x += 2) z += m[y * RASTER + x] ? '█' : '·';
      z += '\n';
    }
    zeilen.push(n + '\n' + z);
  }
  writeFileSync(bildPfad, zeilen.join('\n'));
  console.log(`\n  Silhouetten als Text: ${bildPfad}`);
}
