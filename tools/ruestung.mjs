#!/usr/bin/env node
/*
  Rüstung — wirkt, was gekauft wurde? Und sieht man es?

    node tools/ruestung.mjs

  DER ANLASS, wörtlich vom Nutzer:

    „Was auch nicht gut funktioniert, ist: Wenn man Sachen dazu kauft, wie
     z. B. Drohnen oder Beiflugschiffe, dann müssten diese auch sauber
     mitschießen können. … Auch neue Spezialwaffen, damit man die dann auch
     nutzen kann nach dem Kauf. Das scheint alles noch nicht richtig
     gegeben zu sein."

  NACHGEMESSEN, und die Rückmeldung war in beiden Teilen berechtigt — aber
  aus zwei ganz verschiedenen Gründen:

  1. BEIFLUG: die Mechanik stimmte. Es wurden nur IMMER BEIDE Schiffe
     gezeichnet, das ungekaufte mit setScale(.24) statt .32 und grauem Ton.
     Auf 390 Bildpunkten ist das unsichtbar — man sieht zwei Begleiter,
     einer schiesst, und schliesst daraus, der Kauf sei wirkungslos.
     Frischer Spielstand, gemessen: „2 gezeichnet, 0 feuernd".

  2. SEKUNDÄRWAFFE: hier war es ein echter Fehler. Der Kauf setzte nur
     `secondary` und liess `up_sec` auf 0 — und BEIDE Feuerstellen
     verlangen `secLevel > 0`. Wer 1000 Gold für die Suchraketen zahlte,
     bekam „✓ Aktiv" angezeigt, und es passierte nichts.

  WAS DIESES TOR MISST, am gebauten Spiel, im Browser, bei 390 x 844
  (iPhone hochkant), Layoutraum 540 x 960:

    A  Beiflug bei 0, 1 und 2 gekauften: gezeichnet == feuernd == gekauft.
       Beide Zahlen, nicht nur eine — „zwei gezeichnet, null feuernd" muss
       ein Befund sein, und „eines gekauft, keines gezeichnet" auch.
    B  Sekundärwaffe: der KAUF ALLEIN (über den Weg, den der Laden geht:
       q.setSecondary) muss eine Stufe ergeben, auf der sie feuert.
       Und die Gegenprobe im selben Lauf: mit Stufe 0 muss die Wirkung
       messbar WEGFALLEN. Sonst misst die Prüfung etwas anderes, das
       lauter ist (Regel 13).
    C  Schild und Drohnen: nach dem Auslösen wirken sie, UND der Knopf
       zeigt, wie lange noch. Bis v57 zeigte der Balken nur die
       Abklingzeit — ein laufendes Schild sah aus wie ein nachladendes.
    D  Die Ausrüstungszeile nennt, was ohne eigenen Knopf wirkt.

  DER SPIELSTAND WIRD ZWISCHEN DEN MESSUNGEN GEWECHSELT, ohne die Seite
  neu zu laden: Bt/St/vt lesen und schreiben localStorage bei jedem Zugriff,
  und die Gefechtsszene liest den Laden in create(). Ein Neustart der Szene
  genügt also — sonst kostete jede der acht Messungen einen Hochlauf.

  `--ohne-naht` nimmt `window.__game` weg und verlangt die Rückgabe 2.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Rüstung', 'was gekauft ist, wirkt — und man sieht es.');

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
const adresse = `http://127.0.0.1:${server.address().port}/Skyfront.html`;

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
await seite.addInitScript(() => { try { localStorage.setItem('seen_tut', '1'); localStorage.setItem('gold', '999999'); } catch (e) {} });
await seite.goto(adresse);
await seite.waitForFunction(() => window.__game && window.__bootStats && window.__bootStats.totalMs, null, { timeout: 90000 });
await seite.waitForTimeout(1200);
if (OHNE_NAHT) await seite.evaluate(() => { delete window.__game; });

// Einen Sektor mit einem bestimmten Spielstand betreten. Gerufen, nicht
// getippt (Regel 46) — der Weg steht seit v45 in tools/vorwaermen.mjs.
const betreten = (laden) => seite.evaluate(async (laden) => {
  const g = window.__game;
  if (!g) return { fehler: 'window.__game fehlt' };
  try {
    for (const [k, w] of Object.entries(laden)) w === null ? localStorage.removeItem(k) : localStorage.setItem(k, String(w));
  } catch (e) { return { fehler: 'localStorage nicht schreibbar: ' + e } }
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Game', { stage: 1 });
  for (let i = 0; i < 40; i++) {
    await new Promise((f) => setTimeout(f, 250));
    const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
    if (!sz) continue;
    if (!sz.stageStarted && typeof sz.startStage === 'function') sz.startStage();
    if (sz.player && sz.slots) return { ok: true };
  }
  return { fehler: 'kommt nicht ins Gefecht' };
}, laden);

const lesen = (fn) => seite.evaluate((quelle) => {
  const g = window.__game;
  if (!g) return { fehler: 'window.__game fehlt' };
  const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
  if (!sz) return { fehler: 'Gefecht nicht aktiv' };
  try { return { wert: (new Function('sz', 'return (' + quelle + ')(sz)'))(sz) } }
  catch (e) { return { fehler: String(e) } }
}, fn);

// Den Kaufweg GEHEN, nicht nachbilden (Regel 49b): das Arsenal betreten,
// die Schaltflaeche am Namen der Ware suchen und druecken. Genau das hat
// den Fehler von v58 sichtbar gemacht — haette das Tor `secondary` und
// `up_sec` selbst gesetzt, waere er unsichtbar geblieben.
const kaufen = (wort, schluessel, sperre) => seite.evaluate(async ([wort, schluessel, sperre]) => {
  const g = window.__game;
  // GOLD NACH DEM HOCHLAUF setzen, nicht davor. Ein addInitScript vor
  // dem Laden haelt nicht: gemessen stand nach dem Hochlauf „gold: 0" da,
  // und der Kauf scheiterte still an spendGold(). Das Tor meldete
  // daraufhin „Laser gekauft → weapon=''" — ein Befund ueber das Spiel,
  // der in Wahrheit ueber das Werkzeug war. Und die Sperre wird entfernt,
  // damit wirklich der KAUFWEG gegangen wird und nicht der Waehlweg.
  let goldVor = 0;
  try {
    localStorage.setItem('gold', '999999');
    if (sperre) localStorage.removeItem(sperre);
    goldVor = Number(localStorage.getItem('gold') || 0);
  } catch (e) { return { fehler: 'localStorage nicht schreibbar' } }
  if (goldVor < 2000) return { fehler: 'Gold laesst sich nicht setzen — der Kauf waere gar nicht bezahlbar' };
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Arsenal');
  for (let i = 0; i < 40; i++) {
    await new Promise((f) => setTimeout(f, 250));
    const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Arsenal' && s.scene.isActive());
    if (!sz) continue;
    const flach = [];
    const geh = (arr) => { for (const o of arr) { flach.push(o); if (o.list) geh(o.list) } };
    geh(sz.children.list);
    const t = flach.find((o) => o.type === 'Text' && String(o.text || '').trim() === wort);
    if (!t) continue;
    const m = t.getBounds(), mx = m.x + m.width / 2, my = m.y + m.height / 2;
    // Die KLEINSTE Flaeche, die den Namen WIRKLICH ENTHAELT — nicht die
    // erste, und nicht eine mit Spielraum. Der erste Anlauf gab 40 Punkte
    // Spielraum nach oben und unten; die Waffenkarten stehen 82 Punkte
    // auseinander und sind 74 hoch, also lagen die Karte darueber und die
    // richtige beide im Fenster, beide gleich gross — gedrueckt wurde die
    // erste in der Liste. Das Tor meldete daraufhin „Laser gekauft →
    // weapon=focus" und haette einen Fehler behauptet, den es nicht gibt.
    // Spielraum gibt es jetzt nur, wenn STRENG nichts trifft.
    const kandidaten = flach.filter((o) => o.input && o.input.enabled);
    const trifft = (o, luft) => {
      const q = o.getBounds();
      return mx >= q.x - luft && mx <= q.x + q.width + luft && my >= q.y - luft && my <= q.y + q.height + luft;
    };
    let treffend = kandidaten.filter((o) => trifft(o, 0));
    if (!treffend.length) treffend = kandidaten.filter((o) => trifft(o, 40));
    treffend.sort((u, v) => (u.getBounds().width * u.getBounds().height) - (v.getBounds().width * v.getBounds().height));
    if (!treffend[0]) return { fehler: 'keine Schaltfläche an „' + wort + '"' };
    treffend[0].emit('pointerdown');
    await new Promise((f) => setTimeout(f, 1500));
    const raus = {};
    let goldNach = goldVor, frei = null;
    try {
      for (const k of schluessel) raus[k] = localStorage.getItem(k);
      goldNach = Number(localStorage.getItem('gold') || 0);
      frei = sperre ? localStorage.getItem(sperre) : null;
    } catch (e) {}
    return { stufe: Number(raus[schluessel[0]] || 0), gewaehlt: raus[schluessel[1]] || '', goldVor, goldNach, frei };
  }
  return { fehler: 'Arsenal nicht erreichbar' };
}, [wort, schluessel, sperre]);

// Hat der Kauf ueberhaupt stattgefunden? Wenn kein Gold abgeht, wurde
// nichts gekauft — und alles, was danach gemessen wird, sagt nichts.
// Drei von zehn Gegenproben sind in diesem Projekt schon daran
// gescheitert, dass der Eingriff nicht ankam und wie ein Ergebnis aussah.
const kaufAngekommen = (k, was) => {
  if (!(k.goldNach < k.goldVor)) { M.ungemessen(`${was}: es ist kein Gold abgegangen (${k.goldVor} → ${k.goldNach}) — der Kauf hat nicht stattgefunden, gemessen ist nichts.`); return false }
  return true;
};

console.log('Rüstung\n');
console.log('  gemessen am gebauten Spiel, 390 x 844 (iPhone hochkant), Layoutraum 540 x 960\n');

let gemessen = 0;

// ---- A  Beiflug: gezeichnet == feuernd == gekauft ----------------------
console.log('  A  Beiflug');
for (const gekauft of [0, 1, 2]) {
  const e = await betreten({ up_wingman: gekauft, secondary: 'none', up_sec: 0 });
  if (e.fehler) { M.ungemessen(`Beiflug ${gekauft}: ${e.fehler}`); continue }
  const r = await lesen(`(sz) => ({
    gezeichnet: sz.wingmen.filter((w) => w.img && w.img.visible).length,
    feuernd: sz.wingmen.filter((w) => w.fires && w.img && w.img.visible).length,
    gesamt: sz.wingmen.length
  })`);
  if (r.fehler) { M.ungemessen(`Beiflug ${gekauft}: ${r.fehler}`); continue }
  gemessen++;
  const w = r.wert;
  console.log(`     gekauft ${gekauft} → gezeichnet ${w.gezeichnet}, feuernd ${w.feuernd}`);
  if (w.gezeichnet !== gekauft) M.befund(`Beiflug: ${gekauft} gekauft, aber ${w.gezeichnet} gezeichnet. Wer mehr sieht als er hat, haelt den Kauf fuer wirkungslos.`);
  if (w.feuernd !== gekauft) M.befund(`Beiflug: ${gekauft} gekauft, aber ${w.feuernd} feuernd.`);
}

// ---- B  Sekundärwaffe: der Kauf allein muss reichen --------------------
console.log('\n  B  Sekundärwaffe (Kauf über den Weg des Ladens, ohne weiteren Ausbau)');
for (const art of ['side', 'seeker']) {
  // Frischer Stand, dann KAUFEN wie der Laden es tut. Nicht up_sec direkt
  // setzen — genau das haette den Fehler verdeckt, um den es geht.
  const e = await betreten({ secondary: 'none', up_sec: 0, ['unlks_' + art]: null, up_wingman: 0 });
  if (e.fehler) { M.ungemessen(`Sekundär ${art}: ${e.fehler}`); continue }
  // Den Kaufweg des Ladens nachbilden ist NICHT dasselbe wie ihn gehen.
  // Deshalb wird der Arsenal-Schirm wirklich betreten und der Knopf
  // wirklich gedrueckt — von dort aus zaehlt nur noch, was im Gefecht
  // ankommt.
  const gekauft = await kaufen({ side: 'Seitengeschütze', seeker: 'Suchraketen' }[art], ['up_sec', 'secondary'], 'unlks_' + art);
  if (gekauft.fehler) { M.ungemessen(`Sekundär ${art}: ${gekauft.fehler}`); continue }
  if (!kaufAngekommen(gekauft, `Sekundär ${art}`)) continue;
  gemessen++;
  console.log(`     ${art} gekauft für ${gekauft.goldVor - gekauft.goldNach} G → secondary="${gekauft.gewaehlt}", Stufe ${gekauft.stufe}`);
  if (gekauft.gewaehlt !== art) { M.befund(`Sekundär ${art}: nach dem Kauf steht "${gekauft.gewaehlt}" im Spielstand.`); continue }
  if (gekauft.stufe < 1) {
    M.befund(`Sekundär ${art}: nach dem Kauf steht Stufe ${gekauft.stufe}. Beide Feuerstellen verlangen Stufe > 0 — die gekaufte Waffe feuert nicht.`);
    continue;
  }
  // Und jetzt die Wirkung: einmal mit dem gekauften Stand, einmal mit
  // Stufe 0. Faellt die Zahl ohne die Waffe nicht, misst sie etwas
  // anderes (Regel 13).
  const messe = async (stufe) => {
    const e2 = await betreten({ up_sec: stufe });
    if (e2.fehler) return { fehler: e2.fehler };
    const r = await lesen(`(sz) => {
      const vorher = sz.bullets.countActive(true);
      let seeker = 0;
      if (sz.secondary === 'seeker') { sz.secNext = 0; }
      for (let i = 0; i < 6; i++) sz.fire();
      const nachher = sz.bullets.countActive(true);
      sz.bullets.getChildren().forEach((b) => { if (b.active && b.seek) seeker++ });
      return { vorher, nachher, seeker, secLevel: sz.secLevel, secondary: sz.secondary };
    }`);
    return r.fehler ? { fehler: r.fehler } : r.wert;
  };
  const an = await messe(gekauft.stufe), aus = await messe(0);
  if (an.fehler || aus.fehler) { M.ungemessen(`Sekundär ${art}: Wirkung nicht gemessen (${an.fehler || aus.fehler}).`); continue }
  if (art === 'side') {
    const dAn = an.nachher - an.vorher, dAus = aus.nachher - aus.vorher;
    console.log(`     Geschosse je 6 Salven: mit Stufe ${gekauft.stufe} → ${dAn}, mit Stufe 0 → ${dAus}`);
    if (dAn <= dAus) M.befund(`Sekundär side: mit der gekauften Waffe fliegen ${dAn} Geschosse, ohne sie ${dAus}. Die Waffe wirkt nicht.`);
  } else {
    // Die Suchraketen haengen an der SCHLEIFE, nicht an fire() — sie
    // brauchen laufende Bilder. Und sie brauchen den richtigen Zustand:
    // ein erster Anlauf zaehlte nach messe(an), messe(aus), also mit
    // Stufe 0 im Sektor, und meldete null Raketen fuer beide Seiten.
    // Zweimal dasselbe gemessen sieht aus wie ein Ergebnis.
    const zaehle = async (stufe) => {
      const e3 = await betreten({ up_sec: stufe });
      if (e3.fehler) return null;
      await seite.waitForTimeout(3500);
      const r = await lesen(`(sz) => sz.bullets.getChildren().filter((b) => b.active && b.seek).length`);
      return r.fehler ? null : r.wert;
    };
    const mitWaffe = await zaehle(gekauft.stufe), ohneWaffe = await zaehle(0);
    console.log(`     Suchraketen in der Luft: mit Stufe ${gekauft.stufe} → ${mitWaffe}, mit Stufe 0 → ${ohneWaffe}`);
    if (mitWaffe == null || ohneWaffe == null) M.ungemessen('Suchraketen: die Zahl ist nicht zustande gekommen.');
    else if (mitWaffe === 0) M.ungemessen('Suchraketen: in dieser Umgebung fliegt in der Messzeit keine — hier rechnet SwiftShader mit rund zwei Bildern je Sekunde. Nicht gemessen, kein Befund.');
    else if (mitWaffe <= ohneWaffe) M.befund(`Sekundär seeker: mit der gekauften Waffe ${mitWaffe} Raketen, ohne sie ${ohneWaffe}. Die Waffe wirkt nicht.`);
  }
}

// ---- C  Schild und Drohnen: wirken und zeigen, wie lange ---------------
console.log('\n  C  Spezial: wirkt es, und steht die Dauer am Knopf?');
for (const [gadget, frage] of [['shield', 'sz.player.isShielded(sz.time.now)'], ['drones', 'sz.drones.length > 0']]) {
  const e = await betreten({ gadget, ['unlkg_' + gadget]: 1, up_wingman: 0, secondary: 'none', up_sec: 0 });
  if (e.fehler) { M.ungemessen(`${gadget}: ${e.fehler}`); continue }
  const a = await lesen(`(sz) => {
    const s = sz.slots.find((s) => s.key === '${gadget}');
    if (!s) return { fehler: 'kein Steckplatz für ${gadget}' };
    s.readyAt = 0;
    sz.useGadget(s);
    return { wirkt: !!(${frage}), wirktBis: s.wirktBis - sz.time.now };
  }`);
  if (a.fehler || (a.wert && a.wert.fehler)) { M.ungemessen(`${gadget}: ${a.fehler || a.wert.fehler}`); continue }
  // Der Knopf beschriftet sich in der Schleife, nicht beim Ausloesen. Wer
  // sofort liest, liest den Stand VOR dem naechsten Bild — ein erster
  // Anlauf meldete deshalb fuer beide Knoepfe einen leeren Text.
  await seite.waitForTimeout(1200);
  const r = await lesen(`(sz) => {
    const s = sz.slots.find((s) => s.key === '${gadget}');
    return { dauerText: s && s.dauer ? String(s.dauer.text) : null, sichtbar: !!(s && s.dauer && s.dauer.visible) };
  }`);
  if (r.fehler) { M.ungemessen(`${gadget}: ${r.fehler}`); continue }
  r.wert.wirkt = a.wert.wirkt, r.wert.wirktBis = a.wert.wirktBis;
  gemessen++;
  const w = r.wert;
  console.log(`     ${gadget}: wirkt ${w.wirkt ? 'ja' : 'NEIN'}, noch ${Math.round(w.wirktBis)} ms, Knopf zeigt ${JSON.stringify(w.dauerText)} (sichtbar: ${w.sichtbar ? 'ja' : 'nein'})`);
  if (!w.wirkt) M.befund(`${gadget}: nach dem Ausloesen wirkt nichts.`);
  if (!(w.wirktBis > 0)) M.befund(`${gadget}: der Knopf weiss nicht, wie lange es noch wirkt (wirktBis ${Math.round(w.wirktBis)} ms) — der Balken zeigt dann nur die Abklingzeit.`);
  // Den TEXT zu lesen ist nicht dasselbe wie ihn zu SEHEN. Beim Bauen hat
  // mich genau das eine halbe Stunde gekostet: das Tor meldete
  // „Knopf zeigt 2.2 s", auf dem Bildschirmfoto war nichts — die Wirkung
  // war zwischen Messung und Abzug abgelaufen. Deshalb wird jetzt auch
  // die Sichtbarkeit verlangt, und der Abzug bleibt Pflicht (Regel 8).
  if (!/\d/.test(String(w.dauerText || '')) || !w.sichtbar) M.befund(`${gadget}: der Knopf zeigt keine sichtbare Restdauer (${JSON.stringify(w.dauerText)}, sichtbar ${w.sichtbar}) — ein laufendes Spezial sieht aus wie ein nachladendes.`);
}

// ---- D  Die Ausrüstungszeile ------------------------------------------
console.log('\n  D  Ausrüstungszeile');
{
  const e = await betreten({ up_wingman: 2, secondary: 'seeker', unlks_seeker: 1, up_sec: 2 });
  if (e.fehler) M.ungemessen(`Ausrüstungszeile: ${e.fehler}`);
  else {
    const r = await lesen(`(sz) => sz.children.list.filter((o) => o.type === 'Text' && o.scrollFactorX === 0 && /BEIFLUG|SUCHRAKETEN|SEITENGESCH/.test(String(o.text || ''))).map((o) => String(o.text))`);
    if (r.fehler) M.ungemessen(`Ausrüstungszeile: ${r.fehler}`);
    else {
      gemessen++;
      const t = (r.wert || []).join(' | ');
      console.log(`     ${t || '(nichts)'}`);
      if (!/BEIFLUG/.test(t)) M.befund('die Ausruestungszeile nennt den Beiflug nicht — zwei gekaufte Begleiter, und nirgends steht es.');
      if (!/SUCHRAKETEN/.test(t)) M.befund('die Ausruestungszeile nennt die Sekundaerwaffe nicht — gekauft, wirkt, und kein Wort davon auf dem Schirm.');
    }
  }
}

// ---- E  Hauptwaffe: der Kauf muss im Gefecht ankommen ------------------
console.log('\n  E  Hauptwaffe');
{
  // Der Laser ist die einzige Hauptwaffe mit Freischaltpreis — also der
  // einzige echte KAUF. Er geht ueber den Arsenal-Knopf.
  const e = await betreten({ weapon: '', unlkw_laser: null, up_wingman: 0, secondary: 'none', up_sec: 0, gear_inv: null });
  if (e.fehler) M.ungemessen(`Hauptwaffe: ${e.fehler}`);
  else {
    const k = await kaufen('Laser', ['weapon', 'weapon'], 'unlkw_laser');
    if (k.fehler) M.ungemessen(`Hauptwaffe: ${k.fehler}`);
    else if (kaufAngekommen(k, 'Hauptwaffe Laser')) {
      gemessen++;
      console.log(`     Laser gekauft für ${k.goldVor - k.goldNach} G → weapon="${k.gewaehlt}", freigeschaltet ${k.frei}`);
      if (k.gewaehlt !== 'laser') M.befund(`Hauptwaffe: nach dem Kauf des Lasers steht "${k.gewaehlt}" im Spielstand.`);
      if (k.frei !== '1') M.befund(`Hauptwaffe: der Laser ist nach dem Kauf nicht freigeschaltet (unlkw_laser=${k.frei}).`);
    }
  }
  // Und alle vier im Gefecht: kommt die gewaehlte Waffe wirklich an?
  for (const w of ['spread', 'focus', 'heavy', 'laser']) {
    const e2 = await betreten({ weapon: w, ['unlkw_' + w]: 1 });
    if (e2.fehler) { M.ungemessen(`Hauptwaffe ${w}: ${e2.fehler}`); continue }
    const r = await lesen(`(sz) => {
      const vor = sz.bullets.countActive(true);
      for (let i = 0; i < 4; i++) sz.fire();
      return { waffe: sz.weapon, textur: sz.bulletTex, bahnen: sz.bahnen, geschosse: sz.bullets.countActive(true) - vor, strahl: sz.strahlBreite };
    }`);
    if (r.fehler) { M.ungemessen(`Hauptwaffe ${w}: ${r.fehler}`); continue }
    gemessen++;
    const v = r.wert;
    console.log(`     ${w} → Waffe "${v.waffe}", Textur ${v.textur}, ${v.bahnen} Bahnen, ${v.geschosse} Geschosse`);
    if (v.waffe !== w) M.befund(`Hauptwaffe: "${w}" gewaehlt, im Gefecht laeuft "${v.waffe}".`);
    // Der Laser feuert keine Geschosse — er ist ein Strahl. Alle anderen
    // muessen etwas losschicken, sonst ist die gekaufte Waffe stumm.
    else if (w !== 'laser' && v.geschosse <= 0) M.befund(`Hauptwaffe ${w}: vier Salven, ${v.geschosse} Geschosse. Die gekaufte Waffe feuert nicht.`);
  }
}

// ---- F  Zweiter Spezial-Slot ------------------------------------------
console.log('\n  F  Zweiter Spezial-Slot');
for (const frei of [0, 1]) {
  const e = await betreten({ slot2: frei, gadget: 'emp', gadget2: 'shield', unlkg_shield: 1, unlkg_emp: 1 });
  if (e.fehler) { M.ungemessen(`Slot 2 (${frei}): ${e.fehler}`); continue }
  const r = await lesen(`(sz) => sz.slots.map((s) => s.key)`);
  if (r.fehler) { M.ungemessen(`Slot 2 (${frei}): ${r.fehler}`); continue }
  gemessen++;
  console.log(`     slot2=${frei} → Knoepfe ${JSON.stringify(r.wert)}`);
  if (frei === 1 && r.wert.length !== 2) M.befund(`Zweiter Spezial-Slot: freigeschaltet und ein zweites Spezial gewaehlt, aber ${r.wert.length} Knopf/Knoepfe im Gefecht.`);
  if (frei === 0 && r.wert.length !== 1) M.befund(`Zweiter Spezial-Slot: NICHT freigeschaltet, aber ${r.wert.length} Knoepfe im Gefecht.`);
}

// ---- G  Ein frisch gekauftes Spezial wirkt auf Grundstaerke -----------
//
// Derselbe Verdacht wie bei der Sekundaerwaffe: wirkt eine Sache auf
// Stufe 0 ueberhaupt? Bei den Spezialen ja — Ii(0) = 1 und vi(0) = 1 —,
// aber das ist eine Behauptung, bis es gemessen ist.
console.log('\n  G  Spezial frisch gekauft (Stufe 0) gegen ausgebaut (Stufe 2)');
{
  const zahlen = [];
  for (const stufe of [0, 2]) {
    const e = await betreten({ gadget: 'shield', unlkg_shield: 1, gadlv_shield: stufe, slot2: 0, gear_inv: null });
    if (e.fehler) { M.ungemessen(`Spezial Stufe ${stufe}: ${e.fehler}`); continue }
    const r = await lesen(`(sz) => {
      const s = sz.slots.find((s) => s.key === 'shield');
      if (!s) return { fehler: 'kein Steckplatz' };
      s.readyAt = 0; sz.useGadget(s);
      return { stufe: s.level, staerke: s.power, abkling: s.cdMs, wirkt: sz.player.isShielded(sz.time.now), dauer: Math.round(s.wirktBis - sz.time.now) };
    }`);
    if (r.fehler || (r.wert && r.wert.fehler)) { M.ungemessen(`Spezial Stufe ${stufe}: ${r.fehler || r.wert.fehler}`); continue }
    gemessen++;
    zahlen.push(r.wert);
    console.log(`     Stufe ${stufe} → wirkt ${r.wert.wirkt ? 'ja' : 'NEIN'}, ${r.wert.dauer} ms, Abklingzeit ${Math.round(r.wert.abkling/1e3)} s`);
    if (!r.wert.wirkt) M.befund(`Spezial auf Stufe ${stufe}: nach dem Ausloesen wirkt nichts — frisch gekauft und stumm.`);
  }
  // Und die Gegenprobe zur Stufe selbst: der Ausbau MUSS etwas aendern,
  // sonst misst die Pruefung die Stufe gar nicht (Regel 13).
  if (zahlen.length === 2 && !(zahlen[1].dauer > zahlen[0].dauer))
    M.befund(`Spezial: Stufe 2 wirkt ${zahlen[1].dauer} ms, Stufe 0 ${zahlen[0].dauer} ms. Der Ausbau aendert nichts.`);
}

// ---- H  Ein angelegtes Modul wirkt ------------------------------------
//
// Gemessen an der KRITCHANCE, nicht am Schaden: der Schaden wird gerundet
// (Grundwert 2, mit +10 % immer noch 2), und eine gerundete Zahl kann
// keine Wirkung bezeugen. Ein erster Anlauf hat genau das getan und fuer
// alle drei Faelle „2" gemeldet.
console.log('\n  H  Module');
{
  const modul = (id, eq, rar) => ({ id, eq, rarity: rar, type: 'weapon', set: 'brand', lvl: 0, stats: { crit: 20 } });
  const messe = async (inv, was) => {
    const e = await betreten({ gear_inv: JSON.stringify(inv), weapon: '', up_wingman: 0, secondary: 'none', up_sec: 0 });
    if (e.fehler) return null;
    const r = await lesen(`(sz) => ({ crit: sz.gearCrit, critMult: sz.gearCritMult })`);
    if (r.fehler) return null;
    console.log(`     ${was}: Kritchance ${(r.wert.crit * 100).toFixed(1)} %`);
    return r.wert;
  };
  const ohne = await messe([], 'nichts besessen        ');
  const eins = await messe([modul(1, 0, 'epic')], '1 angelegt, 0 im Sack  ');
  const sack = await messe([modul(1, 0, 'epic'), modul(2, -1, 'epic'), modul(3, -1, 'epic'), modul(4, -1, 'epic'), modul(5, -1, 'epic')], '1 angelegt, 4 im Sack  ');
  const nur = await messe([modul(1, -1, 'epic'), modul(2, -1, 'epic'), modul(3, -1, 'epic'), modul(4, -1, 'epic'), modul(5, -1, 'epic')], '0 angelegt, 5 im Sack  ');
  if (!ohne || !eins || !sack || !nur) M.ungemessen('Module: nicht alle vier Faelle gemessen.');
  else {
    gemessen++;
    // Der eine Satz, der unstrittig ist: ein ANGELEGTES Modul muss wirken.
    if (!(eins.crit > ohne.crit)) M.befund(`Modul: angelegt ${(eins.crit*100).toFixed(1)} %, ohne Modul ${(ohne.crit*100).toFixed(1)} % Kritchance. Das angelegte Modul wirkt nicht.`);
    // Und der, der es auch ist: was nur herumliegt, ist nicht angelegt.
    if (nur.crit > ohne.crit) M.befund(`Modul: fuenf NICHT angelegte Module heben die Kritchance auf ${(nur.crit*100).toFixed(1)} %. Was im Sack liegt, darf nicht wirken.`);
    // DER TIER-BONUS ZAEHLT DEN GANZEN BESTAND — vom Nutzer bestaetigt
    // („zählt mit"), also eine Zusicherung und keine Beobachtung mehr.
    // Wer sie entfernt, faellt hier auf. Bis v59 stand sie hier nur als
    // Hinweis; ein Hinweis schuetzt nichts.
    console.log(`     Tier-Bonus: vier Stuecke im Lager heben die Kritchance von ${(eins.crit*100).toFixed(1)} auf ${(sack.crit*100).toFixed(1)} %.`);
    if (!(sack.crit > eins.crit))
      M.befund(`Tier-Bonus: vier Module im Lager aendern die Kritchance nicht (${(eins.crit*100).toFixed(1)} % gegen ${(sack.crit*100).toFixed(1)} %). Der Bestand soll mitzaehlen.`);
  }
}

// ---- I  Steht die Sammelregel auf dem Modul-Schirm? -------------------
//
// Der Tier-Bonus zaehlt den ganzen Bestand. Das ist gewollt — aber bis v59
// stand es nirgends, und damit war das Zerlegen eine Falle: es bringt
// Gold und nimmt still Kraft. Ein Bonus, den niemand kennt, ist keiner.
console.log('\n  I  Steht die Sammelregel auf dem Modul-Schirm?');
{
  const r = await seite.evaluate(async () => {
    const g = window.__game;
    if (!g) return { fehler: 'window.__game fehlt' };
    try {
      localStorage.setItem('gear_inv', JSON.stringify([
        { id: 1, eq: 0, rarity: 'epic', type: 'weapon', set: 'brand', lvl: 0, stats: { crit: 20 } },
        { id: 2, eq: -1, rarity: 'epic', type: 'hull', set: 'brand', lvl: 0, stats: { crit: 20 } },
        { id: 3, eq: -1, rarity: 'epic', type: 'core', set: 'brand', lvl: 0, stats: { crit: 20 } },
      ]));
    } catch (e) { return { fehler: 'localStorage nicht schreibbar' } }
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Gear');
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 250));
      const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Gear' && s.scene.isActive());
      if (!sz) continue;
      const flach = [];
      const geh = (arr) => { for (const o of arr) { flach.push(o); if (o.list) geh(o.list) } };
      geh(sz.children.list);
      const texte = flach.filter((o) => o.type === 'Text').map((o) => String(o.text || ''));
      if (!texte.some((t) => /Tier-Bonus/.test(t))) continue;
      return { texte: texte.filter((t) => /Tier-Bonus|Komplett-Set/.test(t)) };
    }
    return { fehler: 'Modul-Schirm nicht erreichbar' };
  });
  if (r.fehler) M.ungemessen(`Modul-Schirm: ${r.fehler}`);
  else {
    gemessen++;
    for (const t of r.texte) console.log(`     ${JSON.stringify(t)}`);
    const alles = r.texte.join(' ');
    // Drei epische Stuecke besessen, eines angelegt — der Schirm muss die
    // DREI nennen, nicht die eine. Sonst sagt er nicht, was zaehlt.
    if (!/×3/.test(alles)) M.befund(`Modul-Schirm: der Tier-Bonus nennt die Stueckzahl im Bestand nicht (drei epische besessen, eines angelegt): ${JSON.stringify(alles)}`);
  }
}

await browser.close();
server.close();
console.log('');
if (!gemessen) M.ungemessen('nichts gemessen — es steht keine Zahl zur Verfuegung.');
M.urteil();
