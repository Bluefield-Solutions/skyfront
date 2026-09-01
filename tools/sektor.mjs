#!/usr/bin/env node
/*
  Sektor — was haelt ein Sektor ueber seine ganze Laufzeit im Bild?

    node tools/sektor.mjs

  DER ANLASS. Seit SKY-268 stand die Frage offen: woraus bestehen die 519
  Anzeigeobjekte, die das Geraet in Sektor 106 gemeldet hat, wenn nur
  15 Gegner und 86 Geschosse aktiv sind? Die Antwort hiess immer „diese
  Umgebung kann die Last nicht herstellen" — neun Sekunden Sektor 106
  unter SwiftShader ergaben 95 Objekte und keinen einzigen Gegner.

  DAS WAR EIN IRRTUM UEBER DEN FLASCHENHALS. Nicht das Rechnen war zu
  langsam, sondern das ZEICHNEN. Wer das Zeichnen abschaltet und die
  Spielschleife von Hand taktet, rechnet 90 Sekunden Spielzeit in gut
  vier Sekunden Wanduhr — mit derselben Wellensteuerung, derselben
  Physik, denselben Vorraeten.

      g.renderer.render = () => {};
      for (let i = 0; i < N; i++) g.loop.step(t += 16.7);

  DAS IST EIN RIG, KEIN SPIEL, und es steht hier, damit niemand die
  Zahlen fuer Spielerfahrung haelt:
    · Der Spieler ist unverwundbar — sonst endet der Lauf nach zwanzig
      Sekunden und misst das Sterben statt den Sektor.
    · Er weicht nicht aus und zielt nicht. Er trifft also weniger als ein
      Mensch, und es leben MEHR Gegner als im echten Spiel (das Geraet sah
      15, hier sind es 54). Fuer die Frage „waechst die Liste" ist das die
      unguenstigere Seite, und damit die richtige.
    · Bildzeiten sagt das hier NICHT. Die Schrittweite ist gesetzt.

  WAS GEMESSEN WIRD:

    A  Der Sektor laeuft 90 s Spielzeit durch, ohne stehenzubleiben.
       Gemessen werden DREI Sektoren: 3 (Stadt, Effekt 1), 61 (Gewitter,
       Effekt 2 — vier bildfuellende Wetterebenen) und 106 (Lava,
       Effekt 3).
    B  Die Anzeigeliste laeuft in eine EBENE. Waechst das letzte Drittel
       deutlich ueber das mittlere, laeuft etwas aus dem Ruder.
    C  Aufgeraeumt wird auch in einem VOLLEN Sektor. Bis v66 hing das an
       „hoechstens zwei Gegner im Bild" — in Sektor 106 traf das auf
       0,7 % der Bilder zu, und es wurde in 90 Sekunden genau einmal
       aufgeraeumt.
    D  Der Anteil abgeschalteter Objekte in der Liste bleibt in Grenzen.
    E  Die BEMALTE FLAECHE je Bild und die Zahl der bildfuellenden
       Ebenen bleiben in ihrem Budget.
    F  Kein Vorrat VERLIERT mehr als 2 % der Anfragen (B9). Ein voller
       Vorrat verschiebt, er wirft nicht weg.

  ZU E, weil die Zahl eine Geschichte hat: Nach v67 lag der Verdacht auf
  dem fx-Deckel — 170 aktive Effekte sind der groesste Block der
  Anzeigeliste. Durchprobiert (170 · 130 · 100 · 70 · 45) ergab das eine
  FEHLANZEIGE: Zeichenaufrufe 29 → 26, Rechenzeit 0,8 → 0,6 ms, bemalte
  Flaeche 5,87 → 5,96 Bildschirme. Der Deckel bewegt nichts davon; die
  Effekte sind klein und werden gebuendelt. Das Geraet hatte es ohnehin
  schon gesagt: bei Q 0,35 stand der Deckel auf 89 und es reichte
  trotzdem nicht.

  Die Flaeche liegt woanders, und zwar in wenigen grossen Posten:

      Rectangle 1,42 (7x) · e_weaver 1,06 (76x) · <Untergrund> 1,00 (1x)
      · <Ebene> 0,55 · e_bomber 0,51 (32x) · <Ebene> 0,30 · gradeBot 0,22

  Rund 3,4 der 5,9 Bildschirme sind bildfuellende EBENEN, nicht Gegner.
  Das ist dieselbe Form wie der Menuebefund aus v66 — nur hier gemessen,
  nicht dort. Bemalte Flaeche ist reine Geometrie und uebertraegt sich
  eins zu eins aufs Telefon, anders als jede Millisekunde von hier.

  Die Gegneranteile sind wegen des Rigs eine OBERGRENZE (es leben mehr
  Gegner als im echten Spiel); die bildfuellenden Ebenen sind es nicht —
  die liegen immer da.

  Und die Zerlegung wird ausgegeben: wem jedes Objekt gehoert. Das ist
  die Antwort auf SKY-268, und sie braucht kein Telefon mehr.

  `--ohne-naht` nimmt den Zugriff auf die Spielschleife weg und verlangt
  die Rueckgabe 2.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Sektor', 'die Anzeigeliste laeuft in eine Ebene, und aufgeraeumt wird auch im vollen Sektor.');

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
await seite.waitForTimeout(1200);

if (OHNE_NAHT) await seite.evaluate(() => { try { window.__game.loop.step = null; } catch (e) {} });

const SEKUNDEN = 90;
const lauf = (stage, sekunden) => seite.evaluate(async ({ stage, sekunden }) => {
  const g = window.__game;
  if (!g || !g.loop || typeof g.loop.step !== 'function') return { fehler: 'an die Spielschleife ist nicht heranzukommen' };
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Game', { stage });
  let sp = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((f) => setTimeout(f, 200));
    sp = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
    if (!sp) continue;
    if (!sp.stageStarted && typeof sp.startStage === 'function') sp.startStage();
    if (sp.player) break;
  }
  if (!sp || !sp.player) return { fehler: 'das Gefecht kommt nicht hoch' };
  const altR = g.renderer.render;
  g.renderer.render = function () {};
  const SCHRITT = 16.7, N = Math.round(sekunden * 1000 / SCHRITT);
  let t = performance.now();
  const verlauf = [];
  let offen = 0, schritte = 0;
  const t0 = performance.now();
  try {
    for (let i = 0; i < N; i++) {
      if (sp.player) { sp.player.shieldUntil = 1e12; sp.lives = 9; }
      g.loop.step(t += SCHRITT);
      if (!sp.scene.isActive()) break;
      schritte++;
      if (sp.enemies.countActive(true) <= 2 && !(sp.boss && sp.boss.active)) offen++;
      if (i % 100 === 0) verlauf.push([Math.round(i * SCHRITT / 1000), sp.children.list.length]);
    }
  } catch (e) { g.renderer.render = altR; return { fehler: 'Schleife gestolpert: ' + e }; }
  const dauer = performance.now() - t0;

  // BEMALTE FLAECHE je Bild, in Bildschirmen. Reine Geometrie — sie
  // uebertraegt sich eins zu eins aufs Telefon, anders als jede
  // Millisekunde aus dieser Umgebung (Regel 12).
  //
  // NICHT MIT DER DECKKRAFT GEWICHTET, und das ist der Punkt: eine
  // ueberblendete Flaeche kostet die Grafikeinheit dasselbe, ob sie zu
  // vier Prozent oder zu hundert deckt. Jedes Bildpunktpaar wird gelesen,
  // gemischt und geschrieben. Wer mit Alpha gewichtet, misst die WIRKUNG
  // und nennt sie Kosten.
  //
  // Der erste Anlauf (v68) tat genau das — und zusaetzlich mit dem
  // falschen Feld: bei einer Phaser-FORM ist `alpha` nicht die Deckkraft
  // der Fuellung, das ist `fillAlpha`. Die bildfuellende Lasur in Sektor 3
  // deckt zu 0,04 und stand mit `alpha` 1 in der Liste. Beide Fehler
  // zusammen ergaben „sieben Rechtecke bemalen 1,86 Bildschirme" — eine
  // Zahl, die in beide Richtungen falsch war.
  const kam = sp.cameras.main, BREITE = kam.width / (kam.zoom || 1), HOEHE = kam.height / (kam.zoom || 1);
  const SCHIRM = BREITE * HOEHE;
  const posten = {};
  const ebenen = [];
  let flaeche = 0;
  const deck = (o) => o.fillAlpha != null ? o.fillAlpha * (o.alpha == null ? 1 : o.alpha)
    : (o.alpha == null ? 1 : o.alpha);
  const malt = (arr) => { for (const o of arr) {
    if (o.list) { malt(o.list); continue; }
    if (o.visible === false || o.active === false) continue;
    // ALPHA NULL KOSTET NICHTS. Phaser loescht bei `setAlpha(0)` das
    // Alpha-Bit in `renderFlags`, und `willRender` gibt dann false zurueck
    // — das Objekt wird gar nicht erst eingereicht. Wer es mitzaehlt,
    // erfindet Kosten. (Der erste Anlauf tat genau das und meldete zehn
    // bildfuellende Ebenen, von denen drei zu null Prozent deckten.)
    if (o.alpha === 0) continue;
    const w = Math.abs(o.displayWidth || 0), h = Math.abs(o.displayHeight || 0);
    if (!w || !h) continue;
    const a = Math.min(w, BREITE * 2) * Math.min(h, HOEHE * 2);
    flaeche += a;
    const k = o.texture && o.texture.key ? o.texture.key : o.type;
    if (!posten[k]) posten[k] = [0, 0, 0];
    posten[k][0] += a; posten[k][1]++; posten[k][2] = Math.max(posten[k][2], a / SCHIRM > .5 ? deck(o) : 0);
    // BILDFUELLENDE EBENEN einzeln zaehlen. Sie sind der Posten, den man
    // abstellen kann — ein Sprite mehr oder weniger ist Rauschen dagegen.
    if (a / SCHIRM >= .9) ebenen.push({ o, was: k, deckt: Math.round(deck(o) * 100), tiefe: o.depth });
  } };
  malt(sp.children.list);

  // STEHT SIE ODER BEWEGT SIE SICH? Das ist der Unterschied, auf den es
  // ankommt: eine stehende bildfuellende Ebene ist IMMER backbar (Regel
  // 60), eine bewegte ist eine gestalterische Entscheidung. Der
  // Wettereffekt legt vier bewegte uebereinander; die abzuzaehlen wie
  // eine vergessene Lasur waere derselbe Fehler wie mit Alpha zu
  // gewichten — Wirkung und Kosten verwechselt.
  //
  // Gemessen wird es, nicht angenommen: Kachelversatz, Ort und Deckung
  // jetzt gegen dieselben Werte sechzig Bilder spaeter.
  //
  // ABER NUR, WAS DAS RIG AUCH TREIBT. Der Modifikator (`src/modifier.js`)
  // taktet sich selbst ueber `requestAnimationFrame`; die Schleife hier
  // wird von Hand gestellt und ruft ihn nie auf. Seine Wetterebenen sind
  // im Rig EINGEFROREN — sie „stehen" nicht, sie werden nur nicht
  // bewegt. Wer sie als stehend zaehlt, meldet einen Befund ueber sein
  // eigenes Werkzeug. Sie sind an `sp.__skf` zu erkennen und werden
  // gezaehlt, aber nicht beurteilt.
  const modifikator = new Set(Array.isArray(sp.__skf) ? sp.__skf : []);
  const fingerabdruck = (o) => [o.tilePositionX, o.tilePositionY, o.x, o.y,
    o.alpha, o.fillAlpha, o.angle, o.scaleX].map((z) => Math.round((z || 0) * 100)).join(',');
  const vor = ebenen.map((e) => fingerabdruck(e.o));
  for (let i = 0; i < 60; i++) g.loop.step(t += SCHRITT);
  const nach = ebenen.map((e) => fingerabdruck(e.o));
  ebenen.forEach((e, i) => {
    e.mod = modifikator.has(e.o);
    e.steht = !e.mod && vor[i] === nach[i];
  });

  // Wem gehoert jedes Objekt? Zugeordnet, nicht geraten.
  const flach = [];
  const geh = (arr) => { for (const o of arr) { flach.push(o); if (o.list) geh(o.list); } };
  geh(sp.children.list);
  const mengen = [];
  const dazu = (n, q) => { const m = new Set(); if (q) for (const o of q) m.add(o); mengen.push([n, m]); };
  dazu('Gegner', sp.enemies && sp.enemies.getChildren());
  dazu('Kugeln', sp.bullets && sp.bullets.getChildren());
  dazu('Gegnerkugeln', sp.enemyBullets && sp.enemyBullets.getChildren());
  dazu('Aufsammler', sp.powerups && sp.powerups.getChildren());
  dazu('fx-Vorrat', sp.fxPool);
  dazu('Text-Vorrat', sp.txtPool);
  const zaehl = {};
  let aus = 0;
  for (const o of flach) {
    if (o.active === false) aus++;
    let wo = 'Rest';
    for (const [n, m] of mengen) if (m.has(o)) { wo = n; break; }
    const k = wo + (o.active === false ? ' (aus)' : '');
    zaehl[k] = (zaehl[k] || 0) + 1;
  }
  g.renderer.render = altR;
  return {
    schritte, sekunden: schritte * SCHRITT / 1000, dauer: Math.round(dauer),
    offen, trims: sp.poolTrims || 0, verlauf,
    vorrat: sp.vorrat ? Object.entries(sp.vorrat).filter(([, v]) => v.an)
      .map(([k, v]) => ({ k, an: v.an, leer: v.leer, vsch: v.vsch || 0, weg: v.weg || 0,
                          anteil: v.leer / v.an, verloren: (v.weg || 0) / v.an })) : [],
    warteschlange: sp.nachzuegler ? sp.nachzuegler.length : -1,
    liste: flach.length, aus, fxAktiv: sp.fxActive || 0, fxCap: sp.fxCap || 0,
    flaeche: flaeche / SCHIRM,
    ebenen: ebenen.sort((a, b) => (a.tiefe || 0) - (b.tiefe || 0))
      .map((e) => `${/^[0-9a-f-]{30,}$/.test(e.was) ? '<erzeugt>' : e.was}(${e.deckt}%${e.steht ? ', steht' : ''}${e.mod ? ', Modifikator' : ''})`),
    stehende: ebenen.filter((e) => e.steht).length,
    modEbenen: ebenen.filter((e) => e.mod).length,
    posten: Object.entries(posten).sort((a, b) => b[1][0] - a[1][0]).slice(0, 6)
      // Erzeugte Texturen tragen einen Zufallsnamen und waeren im Bericht
      // von Lauf zu Lauf verschieden — sie werden benannt, nicht gezeigt.
      // Die Deckkraft steht dabei, wo eine bildfuellende Ebene beteiligt
      // ist: sie kostet immer voll, sie WIRKT aber vielleicht kaum.
      .map(([k, v]) => `${/^[0-9a-f-]{30,}$/.test(k) ? '<erzeugte Ebene>' : k} ${(v[0] / SCHIRM).toFixed(2)} (${v[1]}x${v[2] ? `, deckt ${Math.round(v[2] * 100)} %` : ''})`),
    zaehl: Object.entries(zaehl).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`),
  };
}, { stage, sekunden });

console.log('\nSektor\n');
console.log('  RIG, kein Spiel: Zeichnen aus, Schleife von Hand getaktet, Spieler unverwundbar');
console.log('  und ohne Ausweichen. Es leben deshalb MEHR Gegner als im echten Spiel.');
console.log('  Bildzeiten sagt das hier NICHT — die Schrittweite ist gesetzt.\n');

let gemessen = 0;
// DREI SEKTOREN, NICHT ZWEI — und der dritte ist der schwerste.
//
// Bis v71 mass dieses Tor Sektor 3 (Stadt) und 106 (Lava). Was es NIE
// gesehen hat, ist der Wettereffekt aus `src/modifier.js`: `eff === 2`
// legt VIER bildfuellende Ebenen uebereinander (Dunkelung, Boe, Regen,
// Schwaden), und die gibt es nur ueber Alpen und Gewitter. Ein Tor, das
// zwei von vier Tueren prueft, meldet gruen ueber ein Haus (Regel 47).
//
//   Biom → Effekt:  city/station/biolum 1 · alps/thunder 2
//                   desert/dune/lava 3 · snow/frost/jungle 4
//
// Sektor 61 ist Gewitter, also Effekt 2.
for (const stage of [3, 61, 106]) {
  const r = await lauf(stage, SEKUNDEN);
  if (r.fehler) { M.ungemessen(`Sektor ${stage}: ${r.fehler}`); continue; }
  gemessen++;
  const anteilOffen = r.offen / r.schritte * 100;
  console.log(`  Sektor ${String(stage).padStart(3)}   ${r.sekunden.toFixed(0)} s Spielzeit in ${r.dauer} ms Wanduhr`);
  console.log(`             Anzeigeliste ${r.liste}, davon abgeschaltet ${r.aus} (${(r.aus / r.liste * 100).toFixed(0)} %)   fx ${r.fxAktiv}/${r.fxCap}`);
  console.log(`             aufgeraeumt ${r.trims}x   ·   hoechstens zwei Gegner: ${anteilOffen.toFixed(1)} % der Bilder`);
  console.log(`             ${r.zaehl.join(' · ')}`);
  console.log(`             bemalt ${r.flaeche.toFixed(2)} Bildschirme je Bild:  ${r.posten.join(' · ')}`);
  console.log(`             bildfuellende Ebenen ${r.ebenen.length} — ${r.stehende} stehen, ${r.modEbenen} vom Modifikator (im Rig eingefroren, nicht beurteilt)`);
  console.log(`             ${r.ebenen.join(' → ')}`);
  const p = r.verlauf.map((v) => v[1]);
  const d = Math.floor(p.length / 3);
  const mitte = p.slice(d, d * 2), ende = p.slice(d * 2);
  const mw = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

  // A — laeuft der Sektor durch?
  if (r.schritte < Math.round(SEKUNDEN * 1000 / 16.7) * 0.9)
    M.befund(`Sektor ${stage} bleibt nach ${r.sekunden.toFixed(0)} von ${SEKUNDEN} s stehen — der Lauf misst dann das Ende, nicht den Sektor.`);

  // B — laeuft die Liste in eine Ebene?
  if (mitte.length >= 3 && ende.length >= 3) {
    const wachstum = mw(ende) / (mw(mitte) || 1);
    console.log(`             Anzeigeliste mittleres Drittel ${mw(mitte).toFixed(0)} → letztes ${mw(ende).toFixed(0)}  (${((wachstum - 1) * 100).toFixed(0)} %)`);
    if (wachstum > 1.15)
      M.befund(`Sektor ${stage}: die Anzeigeliste waechst noch im letzten Drittel (${mw(mitte).toFixed(0)} → ${mw(ende).toFixed(0)}, ${((wachstum - 1) * 100).toFixed(0)} %). Eine Liste, die nicht in eine Ebene laeuft, laeuft irgendwann ueber.`);
  } else M.ungemessen(`Sektor ${stage}: zu wenige Stichproben fuer den Verlauf.`);

  // C — wird auch im vollen Sektor aufgeraeumt? ANTEILIG an der Laufzeit,
  // nicht an einer gegriffenen Zahl: der Takt ist vier Sekunden, verlangt
  // wird die Haelfte davon.
  const soll = Math.floor(r.sekunden / 8);
  if (r.trims < soll)
    M.befund(`Sektor ${stage}: in ${r.sekunden.toFixed(0)} s wurde ${r.trims}x aufgeraeumt, erwartet mindestens ${soll}x. Haengt die Bedingung an der Gegnerzahl, ist sie genau dort zu, wo die Vorraete am groessten sind (hier nur ${anteilOffen.toFixed(1)} % der Bilder mit hoechstens zwei Gegnern).`);

  // D — wieviel Totes traegt die Liste mit?
  if (r.aus / r.liste > .45)
    M.befund(`Sektor ${stage}: ${(r.aus / r.liste * 100).toFixed(0)} % der Anzeigeliste sind abgeschaltete Objekte (${r.aus} von ${r.liste}). Sie kosten kein Zeichnen, aber jede Liste, die zur Haelfte aus Leichen besteht, wird bei jedem Durchgang mitgetragen.`);
  // F — WIRD ETWAS STILL VERSCHLUCKT? (B9)
  //
  // Ein erschoepfter Vorrat gab bis v70 `null` zurueck, und jede
  // Aufrufstelle liess es fallen: ein Schuss, der nicht kommt, ein
  // Gegner, der nicht erscheint. Nichts davon war irgendwo zu sehen.
  //
  // Die Grenze ist ein ANTEIL, nicht eine Stueckzahl (Regel 2): zehn
  // Fehlgriffe bei zehn Anfragen sind ein Befund, zehn bei
  // zwanzigtausend sind keiner. fx und Texte sind ABSICHTLICH gedeckelt
  // und bleiben deshalb aussen vor — sie werden nur mitgeschrieben.
  const NAME = { k: 'Kugeln', gk: 'Gegnerkugeln', g: 'Gegner', pu: 'Aufsammler', fx: 'fx', tx: 'Texte' };
  if (!r.vorrat.length) M.ungemessen(`Sektor ${stage}: es ist keine einzige Vorratsanfrage gezaehlt — der Zaehler laeuft nicht.`);
  else {
    console.log(`             Vorrat leer  ${r.vorrat.map((v) => `${NAME[v.k] || v.k} ${v.leer}/${v.an} (${(v.anteil * 100).toFixed(1)} %)${v.vsch ? ` — ${v.vsch} verschoben, ${v.weg} verloren` : ''}`).join(' · ')}`);
    console.log(`             Warteschlange am Ende ${r.warteschlange}`);
    for (const v of r.vorrat) {
      if (v.k === 'fx' || v.k === 'tx') continue;
      // Gemessen wird der VERLUST, nicht der Fehlgriff. Ein Gegner, der
      // eine Sekunde spaeter kommt, ist da; einer, der verfaellt, nicht.
      // Wo nichts nachgeholt wird, ist jeder Fehlgriff ein Verlust — dann
      // faellt derselbe Wert unter dieselbe Grenze.
      const verlust = v.vsch ? v.verloren : v.anteil;
      if (verlust > .02)
        M.befund(`Sektor ${stage}: ${v.vsch ? v.weg : v.leer} von ${v.an} Anfragen an den Vorrat "${NAME[v.k] || v.k}" gingen VERLOREN (${(verlust * 100).toFixed(1)} %, Grenze 2 %). Das faellt still aus — ein Schuss, der nicht kommt, oder ein Gegner, der nicht erscheint, sieht im Feld aus wie „das Spiel reagiert manchmal nicht". Und beim Gegner ist es verkehrt herum: der Sektor wird duenner, gerade wenn der Spieler schlecht dasteht.`);
    }
  }

  // E — bemalte Flaeche und bildfuellende Ebenen.
  //
  // In BILDSCHIRMEN gemessen, also schon anteilig: die Grenzen bleiben
  // gueltig, wenn sich die Aufloesung aendert (Regel 2).
  //
  // Beide Zahlen sind BUDGETS MIT LUFT, keine Bestmarken: heute stehen
  // 6,3 / 11,7 Bildschirme und 5 / 8 Ebenen. Eine Grenze, die genau auf
  // dem heutigen Wert sitzt, faellt beim naechsten Sprite um und sagt
  // nichts ueber den Fehler, um den es geht.
  //
  // Der Fehler, um den es geht, hat einen Namen: WAS SICH NICHT BEWEGT,
  // WIRD GEBACKEN. Drei bildfuellende Ebenen lagen bis v71 uebereinander,
  // aenderten sich innerhalb eines Sektors nie und kosteten trotzdem drei
  // volle Bildschirme Ueberblendung je Bild. Eine ueberblendete Flaeche
  // kostet dasselbe, ob sie zu vier Prozent deckt oder zu hundert.
  if (r.flaeche > 14)
    M.befund(`Sektor ${stage}: es werden ${r.flaeche.toFixed(2)} Bildschirme je Bild bemalt (Budget 14). Groesste Posten: ${r.posten.slice(0, 4).join(' · ')}. Auf einem Telefon ist die bemalte Flaeche der teure Posten, nicht die Zahl der Objekte.`);
  // GEZAEHLT WIRD, WAS STEHT.
  //
  // Ein erster Anlauf setzte ein Budget auf ALLE bildfuellenden Ebenen.
  // Sektor 61 (Gewitter) hat zehn, weil der Wettereffekt vier bewegte
  // uebereinanderlegt — also musste das Budget auf zwoelf hoch, und
  // damit war es stumpf: die Gegenprobe, die die gebackenen Farbebenen
  // wieder trennt, lief glatt durch. Ein Budget, das den Fehler nicht
  // mehr faengt, gegen den es gebaut wurde, ist keins (Regel 5).
  //
  // Die Grenze gilt deshalb den STEHENDEN Ebenen. Eine stehende
  // bildfuellende Ebene ist immer backbar; eine bewegte ist eine
  // gestalterische Entscheidung, die ein Tor nicht trifft.
  // Zwei, nicht fuenf: beurteilt wird nur, was das Rig auch treibt, und
  // das sind heute in jedem Sektor GENAU EINE stehende Ebene (der
  // gebackene Farbstich). Wer die drei wieder trennt, steht bei drei.
  if (r.stehende > 2)
    M.befund(`Sektor ${stage}: ${r.stehende} bildfuellende Ebenen STEHEN uebereinander (Budget 2) — sie aendern sich in sechzig Bildern um kein Haar: ${r.ebenen.filter((e) => /steht/.test(e)).join(' → ')}. Jede kostet einen vollen Bildschirm Ueberblendung, auch die, die zu vier Prozent deckt. Was steht, gehoert einmal gebacken statt je Bild gemischt.`);
  console.log('');
}

await browser.close();
server.close();
if (!gemessen) M.ungemessen('kein Sektor gemessen — es steht keine Zahl zur Verfuegung.');
M.urteil();
