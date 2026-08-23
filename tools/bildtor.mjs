// Bildtor: prueft nicht, ob etwas funktioniert, sondern ob es aussieht wie
// vorgesehen. Genau dafuer gab es bisher kein Tor — der Nebel war seit jeher
// kaputt, alle Tore meldeten gruen.
//
//   node tools/bildtor.mjs [--bilder]     (--bilder legt die Aufnahmen ab)
//
// Geprueft wird:
//   1. Harte Querkanten im mittleren Band, je Modifikator-Modus, waehrend die
//      Maschine hoch und runter gezogen wird. Das ist der Nebelfehler: ein
//      Bild, das den Schirm nicht deckt, hinterlaesst eine wandernde Kante.
//   2. JEDER Schirm darf keine einfarbige Flaeche sein und muss in einem
//      vernuenftigen Helligkeitsband liegen — faengt schwarze Schirme und
//      nicht dekodierte Bilder. Bis dahin sah das Tor nur ins Gefecht: ein
//      Hangar, dessen Kulisse nicht laedt, waere durch alle Tore gefallen.
//
// ZWEI MAL BILLIGER GEMACHT, beide Male an einer Messung, nicht an einem
// Bauchgefuehl. Der Lauf kostete acht Minuten je Push:
//   a) Je Bild ein Playwright-Screenshot: 2500 ms Aufnahme, 50 ms Auswertung.
//      Jetzt fragt das Tor das Spiel selbst (`renderer.snapshotArea`, 850 ms)
//      und schneidet gleich nur das Band heraus, das beurteilt wird.
//   b) Je Modus ein eigener Seitenaufbau: laden, Menue, antippen, warten —
//      elf Sekunden, fuenf Mal. Der Modifikator ist aber eine LEBENDE Schicht
//      (Taste "N"), er braucht keinen Neustart. Jetzt: einmal laden, einmal
//      ins Spiel, dann durchschalten. Genau so, wie der Fehler gemeldet wurde
//      ("wenn man da hin wechselt").
// Gemessen hier: 254 s → 148 s → 55 s.
//
// Weil jetzt alle Modi in EINEM Gefecht liegen, wird "Aus" zwei Mal gemessen,
// am Anfang und nach der vollen Runde. Der Abstand zwischen beiden ist das
// Rauschen — und nur was deutlich darueber liegt, ist ueberhaupt eine Wirkung.
//
// Geurteilt wird ueber den SCHLIMMSTEN der fuenf Zuege, nicht ueber den
// mittleren. Das ist gemessen: der kaputte Nebel zeigte sich mit
// 21 · 24,6 · 132 · 25,7 · 22,8 — in genau EINEM von fuenf Bildern, naemlich
// am oberen Anschlag, wo die Unterkante des Nebellochs ins Band faellt. Ein
// Median haette das Tor still getoetet.
import { existsSync, mkdirSync, writeFileSync } from 'fs';

// Grenzen anteilig, nie absolut. Eine feste Schwelle von 45 hat auf GitHub
// alles rot gemeldet, obwohl nichts kaputt war: dort misst schon die
// Grundlinie "Aus" deutlich hoeher als hier. Anderer Chromium, andere
// Rasterung — die ganze Umgebung liegt hoeher.
//
// Deshalb ist "Aus" die Bezugsgroesse: kein Modus darf deutlich ueber dem
// liegen, was ohne Modifikator ohnehin im Bild ist.
//
// Bezug ist der MITTELWERT beider "Aus"-Messungen, nicht die erste. Gemessen
// ueber sechs Laeufe: "Aus" am Anfang 29..32, "Aus (2)" am Ende 25..52 — das
// spaete Gefecht ist schlicht voller, Explosionen sind echte Helligkeits-
// spruenge. Wer nur die erste nimmt, meldet irgendwann die zweite selbst rot.
// Deshalb sind beide zusammen der Bezug und keine von beiden ein Prueflinge.
const FAKTOR = 2.5;        // so viel darf ein Modus ueber der Grundlinie liegen
// Gemessen ueber sechs Laeufe: heile Modi 9,5 bis 42,6 — der kaputte Nebel
// 132 bis 145. Der Boden liegt dazwischen und naeher am Heilen.
const KANTE_MIN = 55;      // aber nie strenger als das
const KANTE_MAX = 200;     // und nie lockerer als das
// Auch hier: anteilig, nie absolut. Die feste Schwelle 3 fuer "praktisch
// einfarbig" war oertlich gemessen (heiles Menue 6,8 bis 9,1) — auf GitHub
// misst dasselbe heile Menue 4,8. Anderthalb mal Abstand ist kein Abstand,
// und die naechste Auflage von Chromium haette den Lauf rot gemacht.
//
// Bezug sind jetzt die acht Schirme untereinander: einer, der praktisch
// einfarbig ist, faellt gegen die anderen sieben auf, ganz gleich wie hoch
// die Umgebung insgesamt misst.
const STREUUNG_ANTEIL = 0.35;   // so weit darf ein Schirm unter den Median
const HELL_ANTEIL_UNTEN = 0.4, HELL_ANTEIL_OBEN = 2.6;
// Und ein letzter Halt fuer den Fall, dass ALLE Schirme kaputt sind — dann
// gibt es keinen gesunden Median mehr, gegen den sich messen liesse. Diese
// beiden sind absichtlich weit weg von allem je Gemessenen (oertlich 6,8..9,1,
// auf GitHub 4,8; schwarz gedeckt 0,0 bei Helligkeit 5,7).
const STREUUNG_NOT = 1.5, HELL_NOT = 8;
const BILDER = process.argv.includes('--bilder');

// Das beurteilte Band. Oben sitzt das HUD, unten die Faehigkeitsknoepfe; deren
// feste Kanten haben mit dem Bild nichts zu tun.
const BAND_VON = 0.22, BAND_BIS = 0.80;
// Auf diese Breite wird heruntergerechnet, bevor gemessen wird — die Zahlen
// sollen an der ANZEIGEGROESSE haengen (390 px auf dem Zielgeraet), nicht am
// internen Puffer von 1080. Sonst misst dasselbe Bild je nach Aufloesung
// anders. (Eiserne Regel: jede Zahl traegt ihre Messstelle mit.)
const MESSBREITE = 390;
// So viele Bilder je Modus, waehrend die Maschine von unten nach oben und
// zurueck gezogen wird. Jedes kostet 0,7 bis 1,5 s — das ist inzwischen der
// ganze Lauf. Gegengeprobt mit dem kaputten Nebel: bei fuenf Bildern schlaegt
// das Tor weiterhin an (siehe unten), bei sieben ist es nicht empfindlicher.
const BILDERJEMODUS = 5;

// Reihenfolge der Modifikator-Auswahl im Spiel:
//   0 Aus · 1 Auto · 2 Zufall · 3 Nacht · 4 Sturm · 5 Daemmerung · 6 Nebel
// Auto und Zufall werden uebersprungen — was sie zeigen, haengt vom Biom ab
// und ist damit nicht vergleichbar.
const MODI = [
  [0, 'Aus'], [3, 'Nacht'], [4, 'Sturm'], [5, 'Dämmerung'], [6, 'Nebel'], [0, 'Aus (2)'],
];
const NMODI = 7;

// Die Menue-Schirme. Sie werden nur angesehen, nicht gespielt: ein Bild je
// Schirm, gefragt wird nach Helligkeit und Streuung. Gemessen kostet das
// zusammen 12 Sekunden.
const SCHIRME = ['Menu', 'Hangar', 'Workshop', 'Arsenal', 'Levels', 'Briefing', 'Loadout', 'Gear'];

if (!existsSync('dist/Skyfront.html')) { console.error('✗ dist/Skyfront.html fehlt — erst bauen.'); process.exit(1); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Bildtor: Playwright nicht gefunden — uebersprungen.'); process.exit(0); }

if (BILDER) mkdirSync('dist/bildtor', { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });

// Fragt das Spiel selbst nach seinem Bild und wertet es an Ort und Stelle aus.
// Zurueck kommen nur Zahlen — und, wenn verlangt, das heruntergerechnete Bild.
// nurBand=false nimmt den ganzen Schirm (fuer Helligkeit und Streuung),
// nurBand=true nur das beurteilte Band (fuer die Querkante).
// Fasst einmal nach, bevor sie aufgibt. Ein verpasstes Bild ist ein
// verpasstes Bild, kein Befund am Spiel — zwei verpasste sind einer.
async function messen(seite, nurBand, mitBild) {
  for (let versuch = 0; versuch < 2; versuch++) {
    const m = await rohMessen(seite, nurBand, mitBild);
    if (!m.fehlt) return m;
    if (versuch === 0) { console.log(`      (…) Schnappschuss verpasst (${m.zustand}) — noch einmal`); await seite.waitForTimeout(2500); }
    else return m;
  }
}

function rohMessen(seite, nurBand, mitBild) {
  return seite.evaluate(([nurBand, mitBild, VON, BIS, BREIT]) => new Promise((fertig, scheitern) => {
    const g = window.__game, W = g.renderer.width, H = g.renderer.height;
    if (typeof g.renderer.snapshotArea !== 'function') return scheitern(new Error('snapshotArea fehlt'));
    const von = nurBand ? Math.round(H * VON) : 0;
    const hoch = nurBand ? Math.round(H * (BIS - VON)) : H;
    // Phasers Schnappschuss wird am Ende des NAECHSTEN Bildes eingeloest.
    // Steht die Schleife still, kommt dieses Bild nie — und der Rueckruf
    // auch nicht. Auf GitHub ist genau das passiert.
    if (g.loop && g.loop.running === false && g.loop.wake) g.loop.wake();
    const wecker = setTimeout(() => fertig({
      fehlt: true,
      zustand: `Schleife ${g.loop ? (g.loop.running ? 'laeuft' : 'steht') + ', ' + Math.round(g.loop.actualFps) + ' B/s' : '?'}` +
               `, aktiv: ${g.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key).join('+') || 'keine'}`,
    }), 25000);
    g.renderer.snapshotArea(0, von, W, hoch, (bild) => {
      clearTimeout(wecker);
      const hochAus = Math.round(hoch * BREIT / W);
      const c = document.createElement('canvas'); c.width = BREIT; c.height = hochAus;
      const x = c.getContext('2d');
      x.drawImage(bild, 0, 0, BREIT, hochAus);
      const px = x.getImageData(0, 0, BREIT, hochAus).data;
      const zeilen = []; let summe = 0, n = 0;
      for (let y = 0; y < hochAus; y++) {
        let s = 0, m = 0;
        for (let i = 0; i < BREIT; i += 5) {
          const j = (y * BREIT + i) * 4;
          s += (px[j] + px[j + 1] + px[j + 2]) / 3; m++;
        }
        zeilen.push(s / m); summe += s; n += m;
      }
      const mittel = summe / n;
      let quad = 0;
      for (const z of zeilen) quad += (z - mittel) ** 2;
      const streuung = Math.sqrt(quad / zeilen.length);
      let sprung = 0, bei = -1;
      for (let y = 3; y < zeilen.length - 3; y++) {
        const d = Math.abs(zeilen[y + 3] - zeilen[y - 3]);
        if (d > sprung) { sprung = d; bei = y; }
      }
      fertig({
        sprung: +sprung.toFixed(1), bei, hell: +mittel.toFixed(1), streuung: +streuung.toFixed(1),
        bild: mitBild ? c.toDataURL('image/png') : null,
      });
    });
  }), [nurBand, mitBild, BAND_VON, BAND_BIS, MESSBREITE]);
}

const befunde = [];
const gemessen = [];

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await ctx.addInitScript(`try{localStorage.setItem('skf_mod','0')}catch(e){}`);
const seite = await ctx.newPage();
const fehler = [];
seite.on('pageerror', e => fehler.push(String(e)));
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');

let da = false;
for (let i = 0; i < 100; i++) { if (await seite.evaluate(() => !!(window.__game && window.__game.scene))) { da = true; break; } await seite.waitForTimeout(250); }
if (!da) { console.error('✗ Bildtor: Spiel startet nicht.'); await browser.close(); process.exit(1); }
await seite.waitForTimeout(2500);

const r = await seite.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });

// Jeder Schirm: darf nicht einfarbig und nicht schwarz sein. Erst alle
// messen, dann urteilen — die Schirme sind einander der Massstab.
const schirme = [];
for (const key of SCHIRME) {
  if (key !== 'Menu') {
    const da = await seite.evaluate((key) => {
      const g = window.__game;
      if (!g.scene.getScene(key)) return false;
      g.scene.scenes.forEach(s => { if (s.scene.isActive() && s.scene.key !== key) g.scene.stop(s.scene.key); });
      g.scene.start(key);
      return true;
    }, key);
    if (!da) { befunde.push(`${key}: Szene fehlt`); continue; }
    // Nicht blind warten, sondern bis die Szene wirklich laeuft. Auf einem
    // langsamen Laeufer reichten 1600 ms nicht.
    let steht = false;
    for (let i = 0; i < 40; i++) {
      if (await seite.evaluate((key) => window.__game.scene.isActive(key), key)) { steht = true; break; }
      await seite.waitForTimeout(250);
    }
    if (!steht) { befunde.push(`${key}: Szene startet nicht`); continue; }
    await seite.waitForTimeout(1200);   // Einblendung laeuft aus
  }
  const m = await messen(seite, false, false);
  if (m.fehlt) { befunde.push(`${key}: kein Bild zu bekommen — ${m.zustand}`); continue; }
  schirme.push({ key, ...m });
  console.log(`    ${key.padEnd(10)} Helligkeit ${String(m.hell).padStart(5)}  Streuung ${m.streuung}`);
}

// Urteil: gegen den Median der Schirme, nicht gegen eine feste Zahl.
if (schirme.length >= 4) {
  const med = (f) => { const w = schirme.map(f).sort((a, b) => a - b); return w[Math.floor(w.length / 2)]; };
  const mStreu = med(s => s.streuung), mHell = med(s => s.hell);
  const gStreu = mStreu * STREUUNG_ANTEIL;
  console.log(`\n  Median Streuung ${mStreu} → Grenze ${gStreu.toFixed(1)} · Median Helligkeit ${mHell}`);
  if (mStreu < STREUUNG_NOT || mHell < HELL_NOT) {
    befunde.push(`ALLE Schirme praktisch leer (Median Streuung ${mStreu}, Helligkeit ${mHell}) — da stimmt nichts mehr`);
  } else {
    for (const g of schirme) {
      const schlecht = [];
      if (g.streuung < gStreu) schlecht.push(`praktisch einfarbig (Streuung ${g.streuung}, Median ${mStreu})`);
      if (g.hell < mHell * HELL_ANTEIL_UNTEN || g.hell > mHell * HELL_ANTEIL_OBEN) schlecht.push(`Helligkeit ${g.hell} weit weg vom Median ${mHell}`);
      if (schlecht.length) { befunde.push(`${g.key}: ` + schlecht.join(' · ')); console.log(`  ✗ ${g.key}`); }
    }
  }
} else {
  befunde.push(`nur ${schirme.length} von ${SCHIRME.length} Schirmen gemessen — kein Massstab`);
}

// Zurueck ins Menue, von dort geht es ins Gefecht.
await seite.evaluate(() => {
  const g = window.__game;
  g.scene.scenes.forEach(s => { if (s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Menu');
});
await seite.waitForTimeout(2000);

// Ins Spiel. Nicht neun Sekunden blind warten, sondern warten bis die
// Spielszene laeuft — auf einem langsamen Laeufer war die feste Frist knapp,
// hier verschenkte sie drei Sekunden.
await seite.touchscreen.tap(r.x + 0.5 * r.w, r.y + 0.711 * r.h);
const imSpiel = async () => seite.evaluate(() => !!(window.__game.scene.scenes || []).some(s => s.scene.key === 'Game' && s.scene.isActive()));
let losGehts = false;
for (let i = 0; i < 60; i++) { if (await imSpiel()) { losGehts = true; break; } await seite.waitForTimeout(250); }
if (!losGehts) { console.error('✗ Bildtor: kommt nicht ins Spiel.'); await browser.close(); process.exit(1); }
await seite.waitForTimeout(1500);   // die Welle setzt sich, das Bild steht

const cx = r.x + r.w * 0.5, unten = r.y + r.h * 0.82, oben = r.y + r.h * 0.22;

// Schaltet den Modifikator per Taste "N" weiter, bis der gewuenschte Modus
// steht — und prueft, dass der Eingriff auch angekommen ist. Ein nicht
// angekommener Eingriff sieht aus wie ein bestandenes Tor.
async function stelle(ziel) {
  for (let i = 0; i < NMODI + 1; i++) {
    const ist = await seite.evaluate(() => parseInt(localStorage.getItem('skf_mod') || '0', 10));
    if (ist === ziel) return true;
    await seite.keyboard.press('n');
    await seite.waitForTimeout(120);
  }
  return false;
}

for (const [nr, name] of MODI) {
  if (!await stelle(nr)) { befunde.push(`${name}: Modus liess sich nicht einstellen`); continue; }
  await seite.waitForTimeout(700);          // Abbau der alten Schicht, Aufbau der neuen
  if (!await imSpiel()) { befunde.push(`${name}: Gefecht vorzeitig beendet — nicht gemessen`); continue; }

  let schlimmster = { sprung: 0, bei: -1 }, schlimmstesBild = null, hellSumme = 0, streuSumme = 0;
  await seite.mouse.move(cx, unten); await seite.mouse.down();
  for (let i = 0; i <= BILDERJEMODUS - 1; i++) {
    const t = i / (BILDERJEMODUS - 1), y = t < 0.5 ? unten + (oben - unten) * (t * 2) : oben + (unten - oben) * ((t - 0.5) * 2);
    await seite.mouse.move(cx, y); await seite.waitForTimeout(90);
    const m = await messen(seite, true, BILDER);
    hellSumme += m.hell; streuSumme += m.streuung;
    if (m.sprung > schlimmster.sprung) { schlimmster = { sprung: m.sprung, bei: m.bei }; schlimmstesBild = m.bild; }
  }
  await seite.mouse.up();

  const eintrag = { name, ...schlimmster, hell: +(hellSumme / BILDERJEMODUS).toFixed(1), streuung: +(streuSumme / BILDERJEMODUS).toFixed(1) };
  gemessen.push(eintrag);
  console.log(`    ${name.padEnd(10)} groesster Sprung ${String(eintrag.sprung).padStart(5)} (y=${eintrag.bei})  Band-Helligkeit ${eintrag.hell}`);
  if (BILDER && schlimmstesBild) writeFileSync(`dist/bildtor/${name.replace(/[^\wÄÖÜäöü]/g, '_')}.png`, Buffer.from(schlimmstesBild.split(',')[1], 'base64'));
}

if (fehler.length) befunde.push(`${fehler.length} Laufzeitfehler — ${String(fehler[0]).slice(0, 90)}`);
await browser.close();

// Urteil, mit "Aus" als Bezug.
const grund = gemessen.find(g => g.name === 'Aus');
const grund2 = gemessen.find(g => g.name === 'Aus (2)');
if (!grund) {
  befunde.push('Grundlinie "Aus" wurde nicht gemessen — ohne sie ist kein Urteil moeglich.');
} else {
  const basis = grund2 ? (grund.sprung + grund2.sprung) / 2 : grund.sprung;
  const grenze = Math.min(KANTE_MAX, Math.max(KANTE_MIN, basis * FAKTOR));
  console.log(`\n  Grundlinie "Aus" ${grund.sprung}${grund2 ? ' und ' + grund2.sprung : ''} → Bezug ${basis.toFixed(1)} → Grenze ${grenze.toFixed(1)}`);
  // Geurteilt wird nur ueber die Modi. Die beiden "Aus" sind der Massstab —
  // ein Massstab misst sich nicht selbst.
  for (const g of gemessen.filter(g => g !== grund && g !== grund2)) {
    if (g.sprung > grenze) {
      befunde.push(`${g.name}: harte Querkante, Sprung ${g.sprung} bei y=${g.bei} (Grenze ${grenze.toFixed(1)})`);
      console.log(`  ✗ ${g.name}`);
    }
  }
  // Wer eine Wirkung misst, schaltet sie zuerst ab: der Abstand der beiden
  // "Aus"-Messungen ist das Rauschen. Liegt KEIN Modus darueber, hat das Tor
  // fuenf Mal dasselbe gemessen und nichts bezeugt.
  if (grund2) {
    const rauschen = Math.abs(grund.hell - grund2.hell);
    const wirkung = gemessen
      .filter(g => g.name !== 'Aus' && g.name !== 'Aus (2)')
      .map(g => ({ name: g.name, ab: +Math.abs(g.hell - grund.hell).toFixed(1) }));
    console.log(`  Rauschen (Aus gegen Aus) ${rauschen.toFixed(1)} · Wirkung ` + wirkung.map(w => `${w.name} ${w.ab}`).join(' · '));
    const stumm = wirkung.filter(w => w.ab <= rauschen);
    if (stumm.length === wirkung.length) {
      befunde.push('Kein Modus veraendert das Bild mehr als das blosse Rauschen — das Tor misst hier nichts.');
    } else if (stumm.length) {
      console.log(`  (i) unter der Rauschgrenze, sagt also nichts: ${stumm.map(s => s.name).join(', ')}`);
    }
  }
}

if (befunde.length) {
  console.error('\n✗ Bildtor: ' + befunde.length + ' Befund(e)');
  befunde.forEach(b => console.error('   · ' + b));
  process.exit(1);
}
console.log('✓ Bildtor bestanden — keine harten Querkanten, Menü nicht einfarbig.');
