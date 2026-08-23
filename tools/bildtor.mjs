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
// Die Schwellen sind gemessen, nicht geraten. Grundlinie ohne Modifikator:
// 22,8. Alle heilen Modi: 10 bis 24. Der kaputte Nebel: 148,8. KANTE=45 liegt
// dazwischen, mit Abstand nach beiden Seiten.
import { existsSync, mkdirSync, writeFileSync } from 'fs';

// Grenzen anteilig, nie absolut. Eine feste Schwelle von 45 hat auf GitHub
// alles rot gemeldet, obwohl nichts kaputt war: dort misst schon die
// Grundlinie "Aus" 75,7 statt 22,8 wie hier. Anderer Chromium, andere
// Rasterung — die ganze Umgebung liegt hoeher.
//
// Deshalb ist "Aus" jetzt die Bezugsgroesse: kein Modus darf deutlich ueber
// dem liegen, was ohne Modifikator ohnehin im Bild ist.
//
//   hier, heil        Aus 22,1 → Grenze 55   alle Modi 12..18   bestanden
//   hier, Nebel kaputt Aus 22,9 → Grenze 57   Nebel 159,2        schlaegt an
//   GitHub, heil      Aus 75,7 → Grenze 189   alle Modi 40..71   bestanden
const FAKTOR = 2.5;        // so viel darf ein Modus ueber der Grundlinie liegen
const KANTE_MIN = 45;      // aber nie strenger als das
const KANTE_MAX = 200;     // und nie lockerer als das
const STREUUNG_MIN = 7;    // darunter ist das Bild praktisch einfarbig
const HELL_MIN = 12, HELL_MAX = 210;
const BILDER = process.argv.includes('--bilder');

const MODI = [
  [0, 'Aus'], [3, 'Nacht'], [4, 'Sturm'], [5, 'Dämmerung'], [6, 'Nebel'],
];

if (!existsSync('dist/Skyfront.html')) { console.error('✗ dist/Skyfront.html fehlt — erst bauen.'); process.exit(1); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Bildtor: Playwright nicht gefunden — uebersprungen.'); process.exit(0); }

if (BILDER) mkdirSync('dist/bildtor', { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const rechner = await browser.newPage();
await rechner.goto('data:text/html,<canvas id=c></canvas>');

// Wertet ein Bild aus: groesster Querkanten-Sprung im mittleren Band, dazu
// Helligkeit und Streuung ueber das ganze Bild.
async function messen(base64) {
  return rechner.evaluate(async (d) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
    const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, img.width, img.height).data;
    const zeilen = []; let summe = 0, n = 0;
    for (let y = 0; y < img.height; y++) {
      let s = 0, m = 0;
      for (let i = 0; i < img.width; i += 5) {
        const j = (y * img.width + i) * 4;
        const h = (px[j] + px[j + 1] + px[j + 2]) / 3;
        s += h; m++; summe += h; n++;
      }
      zeilen.push(s / m);
    }
    const mittel = summe / n;
    let quad = 0;
    for (const z of zeilen) quad += (z - mittel) ** 2;
    const streuung = Math.sqrt(quad / zeilen.length);
    // Oben sitzt das HUD, unten die Faehigkeitsknoepfe. Deren feste Kanten
    // haben mit dem Bild nichts zu tun, deshalb nur das mittlere Band.
    let sprung = 0, bei = -1;
    const von = Math.round(zeilen.length * 0.22), bis = Math.round(zeilen.length * 0.80);
    for (let y = von; y < bis; y++) {
      const d2 = Math.abs(zeilen[y + 3] - zeilen[y - 3]);
      if (d2 > sprung) { sprung = d2; bei = y; }
    }
    return { sprung: +sprung.toFixed(1), bei, hell: +mittel.toFixed(1), streuung: +streuung.toFixed(1) };
  }, base64);
}

const befunde = [];
const gemessen = [];
for (const [nr, name] of MODI) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(`try{localStorage.setItem('skf_mod','${nr}')}catch(e){}`);
  const seite = await ctx.newPage();
  const fehler = [];
  seite.on('pageerror', e => fehler.push(String(e)));
  await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
  let da = false;
  for (let i = 0; i < 100; i++) { if (await seite.evaluate(() => !!(window.__game && window.__game.scene))) { da = true; break; } await seite.waitForTimeout(250); }
  if (!da) { befunde.push(`${name}: Spiel startet nicht`); await ctx.close(); continue; }
  await seite.waitForTimeout(2500);

  const r = await seite.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });

  // Menue: darf nicht einfarbig und nicht schwarz sein.
  const menue = await messen((await seite.screenshot({ clip: { x: r.x, y: r.y + 14, width: r.w, height: r.h - 28 } })).toString('base64'));
  if (nr === 0) {
    if (menue.streuung < STREUUNG_MIN) befunde.push(`Menü: praktisch einfarbig (Streuung ${menue.streuung})`);
    if (menue.hell < HELL_MIN || menue.hell > HELL_MAX) befunde.push(`Menü: Helligkeit ${menue.hell} ausserhalb ${HELL_MIN}..${HELL_MAX}`);
  }

  await seite.touchscreen.tap(r.x + 0.5 * r.w, r.y + 0.711 * r.h);
  await seite.waitForTimeout(9000);

  const cx = r.x + r.w * 0.5, unten = r.y + r.h * 0.82, oben = r.y + r.h * 0.22;
  let schlimmster = { sprung: 0, bei: -1 }, schlimmstesBild = null;
  await seite.mouse.move(cx, unten); await seite.mouse.down();
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, y = t < 0.5 ? unten + (oben - unten) * (t * 2) : oben + (unten - oben) * ((t - 0.5) * 2);
    await seite.mouse.move(cx, y); await seite.waitForTimeout(90);
    const roh = await seite.screenshot({ clip: { x: r.x, y: r.y + 14, width: r.w, height: r.h - 28 } });
    const m = await messen(roh.toString('base64'));
    if (m.sprung > schlimmster.sprung) { schlimmster = m; schlimmstesBild = roh; }
  }
  await seite.mouse.up();

  gemessen.push({ name, ...schlimmster });
  console.log(`    ${name.padEnd(10)} groesster Sprung ${String(schlimmster.sprung).padStart(5)} (y=${schlimmster.bei})  Helligkeit ${menue.hell}  Streuung ${menue.streuung}`);
  if (fehler.length) befunde.push(`${name}: ${fehler.length} Laufzeitfehler — ${String(fehler[0]).slice(0, 90)}`);
  if (BILDER && schlimmstesBild) writeFileSync(`dist/bildtor/${name}.png`, schlimmstesBild);
  await ctx.close();
}

await browser.close();

// Jetzt urteilen, mit "Aus" als Bezug.
const grund = gemessen.find(g => g.name === 'Aus');
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
}

if (befunde.length) {
  console.error('\n✗ Bildtor: ' + befunde.length + ' Befund(e)');
  befunde.forEach(b => console.error('   · ' + b));
  process.exit(1);
}
console.log('✓ Bildtor bestanden — keine harten Querkanten, Menü nicht einfarbig.');
