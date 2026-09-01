#!/usr/bin/env node
/*
  Messtafel — laeuft die Messung auch dann, wenn niemand hinsieht?

    node tools/messtafel.mjs

  DER ANLASS, woertlich vom Nutzer:

    „Kannst du mir für die Messung zuerstens im Spiel oben einen kleinen
     Button einbauen, ‚Messungen anschalten‘ … Dann soll die Messung im
     Hintergrund laufen, oder ich mach es mit einem Aufklappmechanismus,
     um dann ablesen zu können. Da vielleicht noch ein Button rein, wo ich
     dann alles mit rauskopieren kann."

  Knopf, Aufklappen und Kopieren gab es schon. Was es NICHT gab, ist der
  Kern der Bitte: die Schleife stieg bei geschlossener Tafel sofort aus —

      if (!an) { vorher = t; return; }

  Wer die Tafel zuklappte, um zu spielen, hat damit die Messung
  abgeschaltet. Und der Fall, in dem man misst, ist genau der: spielen und
  dabei messen.

  WAS GEMESSEN WIRD, an der gebauten Datei im Browser, bei 390 x 844:

    A  aus       nichts zu sehen, keine Kopierzeile
    B  an        der Streifen steht da, die Messung laeuft
    C  eingeklappt  die Bilderzahl STEIGT weiter — der eigentliche Punkt
    D  aufklappen   setzt NICHT zurueck (sonst wirft das Ablesen weg,
                    was man ablesen wollte)
    E  Kopieren  die Zeile traegt Version und Zahlen
    F  Neuladen  der Schalter ueberlebt es

  UND DER TAKT. Bis v61 schaetzte die Tafel den Bildschirmtakt aus dem
  MEDIAN, also aus dem, was das Spiel gerade schafft. Hier laeuft es unter
  SwiftShader mit rund drei Bildern je Sekunde — daraus wurde „~3 Hz", das
  Budget 533 ms, und ein p95 von 350 ms stand GRUEN da. Eine Tafel, die
  bei einem Einbruch mitgeht, bezeugt ihn, statt ihn zu melden. Der Takt
  kommt jetzt aus den SCHNELLSTEN Bildern; reicht auch das nicht, sagt sie
  „unbekannt" und misst gegen 60 Hz. Genau das wird hier geprueft — und es
  ist die einzige Pruefung dieses Projekts, der die lahme Umgebung NUETZT.

      J  Umbau    Auf-/Zuklappen und Kopieren kosten selbst ein Bild. Es
              wird getrennt gebucht, sonst misst "laengste" die Messung.
    K  Ecke     Die Vier-Tipp-Ecke liegt auf Pause und Ton. Im Gefecht
              darf sie nicht zaehlen, ausserhalb muss sie es.
    L  Pause    Eine Pause darf die Messung nicht wegwerfen, ein neuer
              Lauf muss es.

  `--ohne-naht` nimmt `__SKF_MESSZEILE` weg und verlangt die Rueckgabe 2.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Messtafel', 'die Messung laeuft auch eingeklappt, und das Aufklappen wirft sie nicht weg.');

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
// NICHT bei jedem Laden zuruecksetzen: addInitScript laeuft auch beim
// Neuladen, und Pruefung G will gerade wissen, ob der Schalter das
// ueberlebt. Ein erster Anlauf hat sich so selbst einen Befund gebaut.
await seite.addInitScript(() => { try { localStorage.setItem('seen_tut', '1'); } catch (e) {} });
await seite.goto(adresse);
await seite.waitForFunction(() => window.__game && window.__bootStats && window.__bootStats.totalMs, null, { timeout: 90000 });
await seite.waitForTimeout(1200);
if (OHNE_NAHT) await seite.evaluate(() => { delete window.__SKF_MESSZEILE; });

// Ins Gefecht, gerufen statt getippt (Regel 46). Im Menue laeuft nichts,
// was zu messen waere.
const drin = await seite.evaluate(async () => {
  const g = window.__game;
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Game', { stage: 3 });
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
await seite.waitForTimeout(1500);

const stand = () => seite.evaluate(() => {
  const t = document.getElementById('messung'), w = document.getElementById('messwerte');
  return {
    an: typeof window.__SKF_MESSAN === 'function' ? window.__SKF_MESSAN() : null,
    klasse: t ? t.className : null,
    text: w ? String(w.textContent || '') : '',
    knoepfe: [...document.querySelectorAll('#messknoepfe .knopf')].map((k) => k.textContent.trim()),
    zeile: typeof window.__SKF_MESSZEILE === 'function' ? String(window.__SKF_MESSZEILE()) : null,
  };
});
const tippen = (tat) => seite.evaluate((tat) => {
  const k = document.querySelector('[data-tat="' + tat + '"]');
  if (!k) return false;
  k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  return true;
}, tat);
// Ueber die Naht, nicht ueber den Schirm: eingeklappt steht die
// Bilderzahl nirgends, und gerade eingeklappt soll sie geprueft werden.
const bilder = () => seite.evaluate(() => typeof window.__SKF_MESSBILDER === 'function' ? window.__SKF_MESSBILDER() : null);

console.log('Messtafel\n');
console.log('  gemessen am gebauten Spiel, 390 x 844 (iPhone hochkant)\n');
let gemessen = 0;

// ---- A  aus ------------------------------------------------------------
{
  const s = await stand();
  if (s.an === null) M.ungemessen('__SKF_MESSAN fehlt — der Schalter ist nicht abzufragen.');
  else {
    gemessen++;
    console.log(`  A  aus            an=${s.an}  Klasse=${JSON.stringify(s.klasse)}`);
    if (s.an) M.befund('die Messtafel ist von selbst an — sie soll ausgeschaltet starten.');
    if (s.klasse) M.befund(`die Tafel ist sichtbar, obwohl nicht gemessen wird (Klasse ${JSON.stringify(s.klasse)}).`);
  }
}

// ---- B  anschalten -----------------------------------------------------
await seite.evaluate(() => { window.__SKF_MESSTAFEL && window.__SKF_MESSTAFEL(); });
await seite.waitForTimeout(6000);
{
  const s = await stand();
  gemessen++;
  console.log(`  B  an             an=${s.an}  Klasse=${JSON.stringify(s.klasse)}  Knöpfe ${JSON.stringify(s.knoepfe)}`);
  if (!s.an) M.befund('der Knopf schaltet die Messung nicht an.');
  if (!/klein/.test(String(s.klasse))) M.befund(`angeschaltet steht die Tafel nicht als Streifen da (Klasse ${JSON.stringify(s.klasse)}) — sie soll das Spiel nicht zudecken.`);
  if (!s.knoepfe.some((k) => /Aufklappen/.test(k))) M.befund(`eingeklappt fehlt der Knopf zum Aufklappen (${JSON.stringify(s.knoepfe)}).`);
}

// ---- C  eingeklappt weitermessen — DER PUNKT --------------------------
// GEWARTET WIRD AUF DIE BEDINGUNG, NICHT AUF DIE UHR.
//
// Erst standen hier neun Sekunden, dann fuenfzehn — beide an DIESER
// Umgebung geeicht. Auf dem Laeufer von GitHub reichten auch fuenfzehn
// nicht: die Tafel gibt erst ab 60 Proben eine Zahl heraus, und dort
// kommen noch weniger Bilder zusammen. Ergebnis: „nicht gemessen", und
// im strengen Lauf ist das ein Fehlschlag. Eine feste Sekundenzahl ist
// eine absolute Grenze in Verkleidung (Regel 2).
//
// Gefragt wird jetzt die TAFEL SELBST, ob sie reif ist — ihr eigenes
// Kriterium, nicht ein hier nachgebautes (Regel 17). Die Obergrenze ist
// nur eine Reissleine.
const vorher = await bilder();
// Und ein zweites Abbruchkriterium: STEHT die Bilderzahl, ist die Messung
// kaputt — dann muss das Tor das melden und nicht anderthalb Minuten
// darauf warten, dass eine tote Messung reif wird. Genau diesen Fall
// stellt die Gegenprobe „misst nur, solange sie offen ist" her.
const reifWarten = async (grenzeMs) => {
  const bis = Date.now() + grenzeMs;
  let letzte = await bilder(), steht = 0;
  while (Date.now() < bis) {
    await seite.waitForTimeout(1000);
    const z = await seite.evaluate(() => typeof window.__SKF_MESSZEILE === 'function' ? String(window.__SKF_MESSZEILE()) : null);
    if (z === null) return false;                     // ohne Naht: nicht wartbar
    if (!/NOCH NICHTS GEMESSEN/.test(z)) return true;
    const jetzt = await bilder();
    steht = (jetzt != null && letzte != null && jetzt > letzte) ? 0 : steht + 1;
    letzte = jetzt;
    if (steht >= 8) return false;                     // die Messung steht
  }
  return false;
};
const reif = await reifWarten(90000);
const nachher = await bilder();
{
  gemessen++;
  console.log(`  C  eingeklappt    Bilder ${vorher} → ${nachher}   (Tafel reif: ${reif ? 'ja' : 'nein'})`);
  if (vorher == null || nachher == null) M.ungemessen('die Bilderzahl steht nicht in der Tafel — nicht gemessen.');
  else if (!(nachher > vorher)) M.befund(`eingeklappt steigt die Bilderzahl nicht (${vorher} → ${nachher}). Die Messung laeuft nur, solange man hinsieht — und der Fall, in dem man misst, ist genau der andere.`);
}

// ---- D  aufklappen setzt nicht zurueck --------------------------------
if (!await tippen('auf')) M.ungemessen('der Knopf „Aufklappen" ist nicht da.');
else {
  await seite.waitForTimeout(1500);
  const s = await stand(), nach = await bilder();
  gemessen++;
  console.log(`  D  aufgeklappt    Klasse=${JSON.stringify(s.klasse)}  Bilder ${nach}  Knöpfe ${JSON.stringify(s.knoepfe)}`);
  if (/klein/.test(String(s.klasse))) M.befund('das Aufklappen wirkt nicht — die Tafel bleibt ein Streifen.');
  if (nach != null && nachher != null && nach < nachher) M.befund(`das Aufklappen setzt die Messung zurueck (${nachher} → ${nach} Bilder). Dann wirft das Ablesen weg, was man ablesen wollte.`);
  for (const w of ['Kopieren', 'Einklappen', 'Messung aus'])
    if (!s.knoepfe.some((k) => k.includes(w))) M.befund(`aufgeklappt fehlt der Knopf „${w}" (${JSON.stringify(s.knoepfe)}).`);
}

// ---- E  die Kopierzeile ------------------------------------------------
{
  const s = await stand();
  if (s.zeile === null) M.ungemessen('__SKF_MESSZEILE fehlt — die Kopierzeile ist nicht zu lesen.');
  else {
    gemessen++;
    console.log(`  E  Kopierzeile    ${s.zeile.slice(0, 96)}…`);
    if (!/^SKYFRONT-MESSUNG v\d+/.test(s.zeile)) M.befund(`die Kopierzeile nennt die Version nicht: ${JSON.stringify(s.zeile.slice(0, 60))}`);
    // „Noch nichts gemessen" ist hier KEIN Befund: unter SwiftShader kommen
    // in der Messzeit nicht immer 60 Bilder zusammen. Es ist aber auch kein
    // bestandener Satz — also nicht gemessen.
    if (/NOCH NICHTS GEMESSEN/.test(s.zeile)) M.ungemessen('die Kopierzeile ist noch nicht reif — in dieser Umgebung kommen zu wenige Bilder zusammen.');
    else if (!/p50 .* p95 /.test(s.zeile)) M.befund(`die Kopierzeile traegt keine Bildzeiten: ${JSON.stringify(s.zeile.slice(0, 90))}`);
  }
}

// ---- F  der Takt darf beim Einbruch nicht mitgehen --------------------
//
// Hier rechnet SwiftShader mit rund drei Bildern je Sekunde. Genau dann
// muss die Tafel sagen, dass sie den Bildschirmtakt NICHT kennt — und
// darf ein p95 von 350 ms nicht gruen faerben.
{
  const s = await stand();
  gemessen++;
  const zeileTakt = (s.text.match(/Anzeige[^\n]*/) || ['(keine)'])[0];
  console.log(`  F  Takt           ${zeileTakt.trim()}`);
  const langsam = /(\d+[.,]\d)\/s/.test(s.text) ? parseFloat(s.text.match(/([\d.,]+)\/s/)[1].replace(',', '.')) < 20 : false;
  if (langsam && !/unbekannt/.test(s.text) && !/—/.test(zeileTakt))
    M.befund(`bei ${s.text.match(/([\d.,]+)\/s/)[1]} Bildern je Sekunde behauptet die Tafel einen Bildschirmtakt: ${JSON.stringify(zeileTakt.trim())}. Der Takt gehoert zum Bildschirm, nicht zur Leistung.`);
}

// ---- G  der Schalter ueberlebt ein Neuladen ---------------------------
await seite.reload();
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
await seite.waitForTimeout(2500);
{
  const s = await stand();
  gemessen++;
  console.log(`  G  nach Neuladen  an=${s.an}  Klasse=${JSON.stringify(s.klasse)}`);
  if (s.an === null) M.ungemessen('nach dem Neuladen ist __SKF_MESSAN nicht da.');
  else if (!s.an) M.befund('nach einem Neuladen ist die Messung aus. Eine Messung, die beim Nachladen still ausgeht, ist keine.');
}

// ---- H  Der Streifen darf keine Finger fangen -------------------------
//
// DER ANLASS, woertlich: „der Aufklapper stoert total das Fliegen, man
// kann das Flugzeug kaum sauber steuern." Seit v62 steht die Tafel
// eingeklappt WAEHREND DES SPIELS da, und ein festes Element ueber der
// Leinwand schluckt jeden Zug, der auf ihm beginnt — genau dort, wo der
// Daumen liegt.
//
// Gemessen wird BEIDES: was an der Stelle liegt (elementFromPoint) und
// was passiert, wenn man dort zu ziehen anfaengt. Das erste ist die
// Mechanik, das zweite die Wirkung — und nur das zweite ist die Frage
// des Nutzers.
console.log('\n  H  Faengt der Streifen Finger?');
{
  // Nach Pruefung G steht die Seite frisch geladen im Menue — dort gibt es
  // kein Flugzeug zu steuern. Erst wieder ins Gefecht, sonst misst die
  // Zugprobe nur, dass es keine Szene gibt (und meldet das als „null",
  // was wie ein Befund aussieht und keiner ist).
  await seite.evaluate(async () => {
    const g = window.__game;
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Game', { stage: 3 });
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 250));
      const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
      if (!sz) continue;
      if (!sz.stageStarted && typeof sz.startStage === 'function') sz.startStage();
      if (sz.player) return;
    }
  });
  await seite.waitForTimeout(2000);
  // Zurueck in den eingeklappten Zustand: darum geht es.
  await tippen('zu');
  await seite.waitForTimeout(1200);
  const punkte = await seite.evaluate(() => {
    const t = document.getElementById('messung');
    if (!t) return { fehler: 'keine Tafel' };
    const r = t.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return { fehler: 'der Streifen hat keine Flaeche' };
    const mitte = { x: Math.round(r.left + r.width * 0.5), y: Math.round(r.top + r.height * 0.5) };
    const links = { x: Math.round(r.left + r.width * 0.85), y: Math.round(r.top + r.height * 0.35) };
    const treffer = (p) => { const e = document.elementFromPoint(p.x, p.y); return e ? (e.id || e.tagName + (e.className ? '.' + e.className : '')) : null; };
    return { rahmen: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
             mitte, links, wasMitte: treffer(mitte), wasLinks: treffer(links) };
  });
  if (punkte.fehler) M.ungemessen(`Streifen: ${punkte.fehler}`);
  else {
    gemessen++;
    console.log(`     Streifen ${punkte.rahmen.join(',')} — an (${punkte.mitte.x},${punkte.mitte.y}) liegt ${JSON.stringify(punkte.wasMitte)}`);
    if (/messung|messwerte/.test(String(punkte.wasMitte)))
      M.befund(`der eingeklappte Streifen faengt Beruehrungen ab: an (${punkte.mitte.x},${punkte.mitte.y}) liegt ${JSON.stringify(punkte.wasMitte)} statt der Leinwand. Wer dort zu ziehen anfaengt, steuert nicht das Flugzeug.`);

    // Und die Wirkung: auf dem Streifen zu ziehen anfangen und nachsehen,
    // ob das Spiel den Zug bekommt.
    const zieht = async (x, y) => {
      await seite.evaluate(() => {
        const g = window.__game;
        const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
        if (sz) sz.dragging = false;
      });
      await seite.mouse.move(x, y);
      await seite.mouse.down();
      await seite.mouse.move(x, y - 60, { steps: 4 });
      const d = await seite.evaluate(() => {
        const g = window.__game;
        const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
        return sz ? !!sz.dragging : null;
      });
      await seite.mouse.up();
      return d;
    };
    // Erst eine Stelle, an der sicher die Leinwand liegt — sonst misst die
    // Probe nur, dass Ziehen ueberhaupt nicht ankommt (Regel 13).
    const frei = await zieht(195, 500);
    const drauf = await zieht(punkte.mitte.x, punkte.mitte.y);
    console.log(`     Ziehen auf freier Fläche: ${frei}   ·   auf dem Streifen: ${drauf}`);
    if (frei !== true) M.ungemessen('das Ziehen kommt selbst auf freier Flaeche nicht an — die Wirkung ist nicht gemessen.');
    else if (drauf !== true) M.befund('ein Zug, der auf dem Streifen beginnt, erreicht das Spiel nicht — das Flugzeug laesst sich dort nicht steuern.');
  }
}

// ---- I  Kommt die Effekt-Absenkung je zurueck? ------------------------
//
// GEMESSEN AM GERAET, Sektor 106: 55,6 Bilder je Sekunde, Effektbudget
// 0,35 nach 88 Sekunden. Der Regler senkte unter 46 und hob erst ueber
// 56 — dazwischen ein totes Band von zehn Bildern, und genau darin lebt
// ein 60-Hz-Telefon in einem vollen Sektor. Er konnte nicht mehr
// hochkommen und blieb den ganzen Sektor unten, auch wenn es laengst
// wieder ruhig war.
//
// Gefragt wird die REGEL, nicht die Umgebung: hier laeuft SwiftShader mit
// drei Bildern je Sekunde, da kaeme jeder Regler an den Boden. Die Naht
// __SKF_QREGEL gibt die Entscheidung heraus, ohne dass jemand achtzig
// Sekunden spielen muss.
console.log('\n  I  Effekt-Absenkung: kommt sie zurück?');
{
  const faelle = [
    { name: 'tiefer Einbruch  30/s bei 60 Hz', q: 1, fps: 30, takt: 60, soll: 'runter' },
    { name: 'knapp am Takt    55,6/s bei 60 Hz', q: .35, fps: 55.6, takt: 60, soll: 'hoch' },
    { name: 'satt am Takt     59/s bei 60 Hz', q: .5, fps: 59, takt: 60, soll: 'hoch' },
    { name: 'schon oben       59/s, q=1', q: 1, fps: 59, takt: 60, soll: 'bleibt' },
    { name: 'Grauzone         50/s bei 60 Hz', q: .5, fps: 50, takt: 60, soll: 'bleibt' },
    { name: '120 Hz, 111/s', q: .35, fps: 111, takt: 120, soll: 'hoch' },
    { name: '120 Hz, 80/s', q: 1, fps: 80, takt: 120, soll: 'runter' },
    // UND DAS FALLEN BRAUCHT DIESELBE BREMSE WIE DAS STEIGEN.
    // Gemessen auf dem Geraet, SEKTOR 1: 58,8 Bilder je Sekunde, 89 % der
    // Bilder unter 17 ms — und trotzdem `Q 0.15`. Ein Ruckler von 90 ms
    // hat gereicht: die Regel laeuft dreimal je Sekunde und schob den
    // Regler ungebremst auf den Boden.
    { name: 'kurzer Ruckler, eben erst gefallen', q: 1, fps: 30, takt: 60, b: 1000, I: 700, soll: 'bleibt' },
    { name: 'anhaltend langsam, Bremse abgelaufen', q: 1, fps: 30, takt: 60, b: 2000, I: 700, soll: 'runter' },
  ];
  const r = await seite.evaluate((faelle) => {
    if (typeof window.__SKF_QREGEL !== 'function') return { fehler: '__SKF_QREGEL fehlt' };
    return {
      raus: faelle.map((f) => {
        const e = window.__SKF_QREGEL(f.q, f.fps, f.takt, f.b == null ? 100000 : f.b, f.I == null ? 0 : f.I);
        return { name: f.name, soll: f.soll, vor: f.q, nach: e.q,
                 tat: e.q > f.q ? 'hoch' : e.q < f.q ? 'runter' : 'bleibt' };
      }),
    };
  }, faelle);
  if (r.fehler) M.ungemessen(`Q-Regler: ${r.fehler}`);
  else {
    gemessen++;
    for (const f of r.raus) {
      console.log(`     ${f.name.padEnd(34)} ${f.vor.toFixed(2)} → ${f.nach.toFixed(2)}   ${f.tat}`);
      if (f.tat !== f.soll)
        M.befund(`Effekt-Absenkung, „${f.name.trim()}": erwartet ${f.soll}, tatsaechlich ${f.tat} (${f.vor.toFixed(2)} → ${f.nach.toFixed(2)}).`
          + (f.soll === 'hoch' ? ' Ein Regler, der nur faellt, laesst den Rest des Sektors ohne Schmuck laufen.' : ''));
    }
  }
}

// ---- J  Bucht die Tafel ihre eigene Arbeit getrennt? ------------------
//
// DER ANLASS: die dritte Geraetemessung meldete als laengste Bildluecke
// 115,0 ms bei 121,8 s — bei 122,5 s Gesamtlauf. Der Ausschlag lag im
// letzten Prozent des Laufs, also genau dort, wo aufgeklappt und kopiert
// wird. Ob das Aufklappen ihn erzeugt hat, war NICHT zu entscheiden: hier
// unter SwiftShader dauert jedes Bild 350 ms, darin ist ein Umbau von
// 30 ms unsichtbar. Statt zu raten, bucht die Tafel es getrennt — und
// die naechste Geraetemessung sagt es selbst.
//
// Geprueft wird nach Regel 13 in BEIDE Richtungen: ohne Umbau darf der
// Zaehler nicht steigen, sonst zaehlt er etwas anderes mit.
console.log('\n  J  Bucht die Tafel ihre eigene Arbeit getrennt?');
{
  const eigen = () => seite.evaluate(() => typeof window.__SKF_MESSEIGEN === 'function' ? window.__SKF_MESSEIGEN() : null);
  const a = await eigen();
  if (a === null) M.ungemessen('__SKF_MESSEIGEN fehlt — was die Tafel sich selbst zuschreibt, ist nicht abzufragen.');
  else {
    // Erst die Gegenprobe: NICHTS tun. Steigt der Zaehler auch dann, misst
    // er nicht den Umbau, sondern irgendetwas.
    await seite.waitForTimeout(3000);
    const b = await eigen();
    console.log(`     nichts getan      Umbauten ${a.umbauten} → ${b.umbauten}`);
    if (b.umbauten !== a.umbauten)
      M.befund(`der Umbau-Zaehler steigt, ohne dass etwas umgebaut wurde (${a.umbauten} → ${b.umbauten}). Dann bucht die Tafel gewoehnliche Bilder als eigene Arbeit und rechnet sich die Zahlen schoen.`);

    // Und jetzt mit Umbau: aufklappen ist genau EIN Formwechsel.
    await tippen('auf');
    await seite.waitForTimeout(2000);
    const c = await eigen();
    console.log(`     aufgeklappt       Umbauten ${b.umbauten} → ${c.umbauten}   laengster ${c.max.toFixed(1)} ms`);
    if (c.umbauten !== b.umbauten + 1)
      M.befund(`das Aufklappen wird nicht als genau ein eigenes Bild gebucht (${b.umbauten} → ${c.umbauten}). Dann steht die Aufklapp-Bildluecke als Ruckler des Spiels in „laengste" — und die Messung misst die Messung.`);

    await tippen('kopieren');
    await seite.waitForTimeout(2000);
    const d = await eigen();
    console.log(`     kopiert           Umbauten ${c.umbauten} → ${d.umbauten}   Vergleichsbilder ${d.mitZeichnen}/${d.ohne}`);
    if (!(d.umbauten > c.umbauten))
      M.befund(`das Kopieren wird nicht als eigenes Bild gebucht (${c.umbauten} → ${d.umbauten}).`);
    if (d.umbauten > 0 && !(d.max > 0))
      M.befund('es sind eigene Bilder gebucht, aber keins hat eine Dauer — dann ist die Buchung eine Zaehlung ohne Messung.');
    gemessen++;
  }
}

// ---- K  Faengt die Vier-Tipp-Ecke die Spielknoepfe ab? ----------------
//
// DER ANLASS, woertlich vom Nutzer: „Der Pause Button ging gerade nicht."
// GEMESSEN an 393 x 852: die Leinwand liegt bei y 115..814, die Ecke ist
// 71 px gross — und darin liegen PAUSE (370, 138) und TON (335, 138).
// Vier Mal auf Pause tippen schaltete die Messung um und setzte sie
// zurueck. Die vier Tipps sind seit v62 nur der Notweg fuer den Fall,
// dass die Spielszene nicht hochkommt; im Gefecht duerfen sie nicht
// zaehlen.
//
// Geprueft wird BEIDES (Regel 13): im Gefecht darf sich nichts aendern,
// im Menue muss sich etwas aendern. Sonst hiesse „nichts passiert"
// womoeglich nur, dass die Tipps ueberhaupt nicht ankommen.
console.log('\n  K  Faengt die Vier-Tipp-Ecke Pause und Ton ab?');
{
  const insGefecht = () => seite.evaluate(async () => {
    const g = window.__game;
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Game', { stage: 1 });
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 200));
      const s = (g.scene.scenes || []).find((x) => x.scene.key === 'Game' && x.scene.isActive());
      if (!s) continue;
      if (!s.stageStarted && typeof s.startStage === 'function') s.startStage();
      if (s.player) return true;
    }
    return false;
  });
  if (!await insGefecht()) M.ungemessen('kommt fuer die Eckenprobe nicht ins Gefecht.');
  else {
    await seite.waitForTimeout(1500);
    const ort = await seite.evaluate(() => {
      const g = window.__game;
      const sp = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
      const lw = document.querySelector('canvas').getBoundingClientRect();
      const kam = sp.cameras.main, W = kam.width / kam.zoom, H = kam.height / kam.zoom;
      const auf = (p) => ({ x: Math.round(lw.left + p.x / W * lw.width), y: Math.round(lw.top + p.y / H * lw.height) });
      const ecke = Math.max(56, Math.min(lw.width, lw.height) * 0.18);
      const drin = (p) => p.x >= lw.right - ecke && p.y >= lw.top && p.y <= lw.top + ecke;
      const namen = ['pauseBtn', 'mute', 'messBtn'].filter((k) => sp[k] && drin(auf(sp[k])));
      return { pause: sp.pauseBtn ? auf(sp.pauseBtn) : null, ecke: Math.round(ecke), namen };
    });
    if (!ort.pause) M.ungemessen('der Pauseknopf ist nicht zu verorten.');
    else {
      const vierMal = async (p) => {
        for (let i = 0; i < 4; i++) { await seite.mouse.click(p.x, p.y); await seite.waitForTimeout(150); }
        await seite.waitForTimeout(600);
        return seite.evaluate(() => window.__SKF_MESSAN());
      };
      const vor = await seite.evaluate(() => window.__SKF_MESSAN());
      const nachSpiel = await vierMal(ort.pause);
      console.log(`     im Gefecht     Pause bei (${ort.pause.x},${ort.pause.y}), Ecke ${ort.ecke} px, darin: ${ort.namen.join(', ') || '—'}`);
      console.log(`                    Messung ${vor} → ${nachSpiel}`);
      gemessen++;
      if (nachSpiel !== vor)
        M.befund(`vier Tipps auf den PAUSEKNOPF schalten die Messung um (${vor} → ${nachSpiel}). In der oberen rechten Ecke liegen ${ort.namen.join(' und ')} — wer dort pausiert, schaltet nach dem vierten Mal die Messtafel und wirft die laufende Messung weg.`);

      // Und die Gegenrichtung: ausserhalb des Gefechts MUSS die Ecke wirken.
      await seite.evaluate(() => {
        const g = window.__game;
        (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
        g.scene.start('Menu');
      });
      await seite.waitForTimeout(1500);
      const vor2 = await seite.evaluate(() => window.__SKF_MESSAN());
      const nachMenue = await vierMal(ort.pause);
      console.log(`     im Menue       Messung ${vor2} → ${nachMenue}`);
      if (nachMenue === vor2)
        M.befund(`ausserhalb des Gefechts wirken die vier Tipps nicht mehr (${vor2} → ${nachMenue}). Dann ist der Notweg zu, und wenn die Spielszene nicht hochkommt, ist die Tafel gar nicht mehr zu erreichen.`);
    }
  }
}

// ---- L  Ueberlebt die Messung eine PAUSE? -----------------------------
//
// DER ANLASS: die v69-Zeile vom Geraet meldete `Q 0.15` bei „2,4 s /
// 144 Bilder" in Sektor 111. Aus ihr war NICHT zu entscheiden, ob der
// Regler zu schnell gefallen ist — denn die 2,4 s waren nicht das Alter
// des Sektors. Bis v69 hing das Zuruecksetzen an `scene.isActive()`, und
// beim PAUSIEREN ist die Spielszene nicht aktiv. Gemessen: 8 Bilder vor
// der Pause, 4 danach. Wer pausiert, wirft seine Messung weg — und die
// Zeile behauptet danach eine Laufzeit, die es nicht gab.
//
// Zurueckgesetzt wird jetzt, wenn der Sektor einen NEUEN LAUF zaehlt.
// Geprueft wird beides (Regel 13): die Pause darf nichts wegwerfen, ein
// neuer Lauf muss es.
console.log('\n  L  Ueberlebt die Messung eine Pause?');
{
  const insGefecht = () => seite.evaluate(async () => {
    const g = window.__game;
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Game', { stage: 1 });
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 200));
      const s = (g.scene.scenes || []).find((x) => x.scene.key === 'Game' && x.scene.isActive());
      if (!s) continue;
      if (!s.stageStarted && typeof s.startStage === 'function') s.startStage();
      if (s.player) return true;
    }
    return false;
  });
  if (!await insGefecht()) M.ungemessen('kommt fuer die Pausenprobe nicht ins Gefecht.');
  else {
    await seite.evaluate(() => { if (!window.__SKF_MESSAN()) window.__SKF_MESSTAFEL(); });
    await seite.waitForTimeout(6000);
    const vor = await bilder();
    await seite.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.pauseGame(); });
    await seite.waitForTimeout(2000);
    await seite.evaluate(() => { const g = window.__game; g.scene.stop('Pause'); g.scene.resume('Game'); });
    await seite.waitForTimeout(3000);
    const nach = await bilder();
    console.log(`     Pause          Bilder ${vor} → ${nach}`);
    gemessen++;
    if (vor == null || nach == null) M.ungemessen('die Bilderzahl ist um die Pause herum nicht abzufragen.');
    else if (nach < vor)
      M.befund(`eine Pause setzt die Messung zurueck (${vor} → ${nach} Bilder). Wer pausiert, wirft seine Messung weg — und die kopierte Zeile behauptet danach eine Laufzeit, die es nicht gab. Genau daran war die v69-Messung nicht zu lesen.`);

    // Und die Gegenrichtung: ein NEUER Lauf muss zuruecksetzen, sonst
    // stehen Menuebilder und zwei Sektoren in einem Topf.
    const vor2 = await bilder();
    await insGefecht();
    await seite.waitForTimeout(2500);
    const nach2 = await bilder();
    console.log(`     neuer Lauf     Bilder ${vor2} → ${nach2}`);
    if (vor2 != null && nach2 != null && nach2 >= vor2)
      M.befund(`ein neuer Sektor setzt die Messung NICHT zurueck (${vor2} → ${nach2} Bilder). Dann stehen zwei Laeufe in einer Zahl.`);
  }
}

await browser.close();
server.close();
console.log('');
if (!gemessen) M.ungemessen('nichts gemessen — es steht keine Zahl zur Verfuegung.');
M.urteil();
