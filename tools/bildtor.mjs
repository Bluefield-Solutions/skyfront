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
//   2. Menue und Spiel duerfen keine einfarbige Flaeche sein und muessen in
//      einem vernuenftigen Helligkeitsband liegen — faengt schwarze Schirme
//      und nicht dekodierte Bilder.
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
import { existsSync, mkdirSync, writeFileSync } from 'fs';

// Grenzen anteilig, nie absolut. Eine feste Schwelle von 45 hat auf GitHub
// alles rot gemeldet, obwohl nichts kaputt war: dort misst schon die
// Grundlinie "Aus" deutlich hoeher als hier. Anderer Chromium, andere
// Rasterung — die ganze Umgebung liegt hoeher.
//
// Deshalb ist "Aus" die Bezugsgroesse: kein Modus darf deutlich ueber dem
// liegen, was ohne Modifikator ohnehin im Bild ist.
const FAKTOR = 2.5;        // so viel darf ein Modus ueber der Grundlinie liegen
const KANTE_MIN = 45;      // aber nie strenger als das
const KANTE_MAX = 200;     // und nie lockerer als das
// Gegengeprobt: heiles Menue 6,8 bis 7,9 — einfarbige Flaeche darueber 0,0,
// gleich ob schwarz, grau oder weiss. Die alte Schwelle 7 lag MITTEN im
// heilen Band und haette einen gesunden Lauf rot gemeldet.
const STREUUNG_MIN = 3;    // darunter ist das Bild praktisch einfarbig
const HELL_MIN = 12, HELL_MAX = 210;   // schwarz gedeckt misst 5,7
const BILDER = process.argv.includes('--bilder');

// Das beurteilte Band. Oben sitzt das HUD, unten die Faehigkeitsknoepfe; deren
// feste Kanten haben mit dem Bild nichts zu tun.
const BAND_VON = 0.22, BAND_BIS = 0.80;
// Auf diese Breite wird heruntergerechnet, bevor gemessen wird — die Zahlen
// sollen an der ANZEIGEGROESSE haengen (390 px auf dem Zielgeraet), nicht am
// internen Puffer von 1080. Sonst misst dasselbe Bild je nach Aufloesung
// anders. (Eiserne Regel: jede Zahl traegt ihre Messstelle mit.)
const MESSBREITE = 390;

// Reihenfolge der Modifikator-Auswahl im Spiel:
//   0 Aus · 1 Auto · 2 Zufall · 3 Nacht · 4 Sturm · 5 Daemmerung · 6 Nebel
// Auto und Zufall werden uebersprungen — was sie zeigen, haengt vom Biom ab
// und ist damit nicht vergleichbar.
const MODI = [
  [0, 'Aus'], [3, 'Nacht'], [4, 'Sturm'], [5, 'Dämmerung'], [6, 'Nebel'], [0, 'Aus (2)'],
];
const NMODI = 7;

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
function messen(seite, nurBand, mitBild) {
  return seite.evaluate(([nurBand, mitBild, VON, BIS, BREIT]) => new Promise((fertig, scheitern) => {
    const g = window.__game, W = g.renderer.width, H = g.renderer.height;
    if (typeof g.renderer.snapshotArea !== 'function') return scheitern(new Error('snapshotArea fehlt'));
    const von = nurBand ? Math.round(H * VON) : 0;
    const hoch = nurBand ? Math.round(H * (BIS - VON)) : H;
    const wecker = setTimeout(() => scheitern(new Error('snapshotArea antwortet nicht')), 15000);
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

// Menue: darf nicht einfarbig und nicht schwarz sein.
const menue = await messen(seite, false, false);
if (menue.streuung < STREUUNG_MIN) befunde.push(`Menü: praktisch einfarbig (Streuung ${menue.streuung}, Grenze ${STREUUNG_MIN})`);
if (menue.hell < HELL_MIN || menue.hell > HELL_MAX) befunde.push(`Menü: Helligkeit ${menue.hell} ausserhalb ${HELL_MIN}..${HELL_MAX}`);
console.log(`    Menü       Helligkeit ${menue.hell}  Streuung ${menue.streuung}`);

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
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, y = t < 0.5 ? unten + (oben - unten) * (t * 2) : oben + (unten - oben) * ((t - 0.5) * 2);
    await seite.mouse.move(cx, y); await seite.waitForTimeout(90);
    const m = await messen(seite, true, BILDER);
    hellSumme += m.hell; streuSumme += m.streuung;
    if (m.sprung > schlimmster.sprung) { schlimmster = { sprung: m.sprung, bei: m.bei }; schlimmstesBild = m.bild; }
  }
  await seite.mouse.up();

  const eintrag = { name, ...schlimmster, hell: +(hellSumme / 7).toFixed(1), streuung: +(streuSumme / 7).toFixed(1) };
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
  const grenze = Math.min(KANTE_MAX, Math.max(KANTE_MIN, grund.sprung * FAKTOR));
  console.log(`\n  Grundlinie "Aus" ${grund.sprung} → Grenze ${grenze.toFixed(1)}`);
  for (const g of gemessen) {
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
      console.log(`  (i) ohne messbare Wirkung auf die Helligkeit: ${stumm.map(s => s.name).join(', ')}`);
    }
  }
}

if (befunde.length) {
  console.error('\n✗ Bildtor: ' + befunde.length + ' Befund(e)');
  befunde.forEach(b => console.error('   · ' + b));
  process.exit(1);
}
console.log('✓ Bildtor bestanden — keine harten Querkanten, Menü nicht einfarbig.');
