// Schirme: nimmt jeden Bildschirm des Spiels auf und misst ihn nach.
//
//   node tools/schirme.mjs            nur messen, Befunde auf stdout
//   node tools/schirme.mjs --bilder   zusaetzlich dist/schirme/*.png
//
// Der Anlass: HUD und Menue hatten beide Ueberlappungen, die kein Tor sah und
// niemand angesehen hatte. Zwoelf Szenen hat das Spiel — angesehen waren zwei.
//
// Gemessen wird im LAYOUTRAUM, beurteilt in ANZEIGEPUNKTEN auf dem Zielgeraet
// (390 breit). Eine Schrift von 9,5 Layoutpunkten ist auf dem Telefon 6,9
// Punkte gross und damit unlesbar — die Zahl allein sagt das nicht.
//
// ACHTUNG, hier steckt die Falle: der Puffer ist 1080 x 1920, die Kamera hat
// aber Zoom 2 — der Layoutraum ist also 540 x 960. getBounds() liefert
// Layoutpunkte. Wer mit 1080 rechnet, liegt um Faktor zwei daneben: die
// Schriftgrenze meldet dann jede zweite Zeile als unlesbar (300 Phantome),
// und die Randpruefung findet nie etwas, weil in den doppelt so grossen Raum
// alles hineinpasst. Beides ist genau so passiert.
import { mkdirSync, writeFileSync } from 'fs';

const BILDER = process.argv.includes('--bilder');
const ANZEIGE = 390;                 // Breite auf dem Zielgeraet
const SCHRIFT_MIN = 9;               // Anzeigepunkte, darunter unlesbar
const RAND = 6;                      // so weit darf etwas ueber den Rand ragen
const WINZIG = 4;                    // kleiner als das ist kein Layout, sondern ein Punkt
const UEBER_Y = 6;                   // so viel Hoehe braucht eine echte Zeilenkollision

// Reihenfolge wie im Spiel durchlaufen. Boot ist der Vorlader, Pause und Game
// brauchen ein laufendes Gefecht — die bleiben aussen vor.
const SZENEN = ['Menu', 'Options', 'Hangar', 'Workshop', 'Arsenal', 'Levels', 'Briefing', 'Loadout', 'Gear'];

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Schirme: Playwright nicht gefunden — uebersprungen.'); process.exit(0); }
if (BILDER) mkdirSync('dist/schirme', { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const seite = await ctx.newPage();
const laufFehler = [];
seite.on('pageerror', e => laufFehler.push(String(e)));
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
for (let i = 0; i < 100; i++) { if (await seite.evaluate(() => !!(window.__game && window.__game.scene))) break; await seite.waitForTimeout(250); }
await seite.waitForTimeout(2500);

const r = await seite.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
// Layoutbreite = Pufferbreite geteilt durch den Kamerazoom.
const layout = await seite.evaluate(() => {
  const g = window.__game, c = g.scene.scenes.find(s => s.scene.isActive()).cameras.main;
  return { W: g.renderer.width / (c.zoom || 1), H: g.renderer.height / (c.zoom || 1), zoom: c.zoom };
});
const massstab = ANZEIGE / layout.W;
console.log(`  Layoutraum ${layout.W} x ${layout.H} (Kamerazoom ${layout.zoom}) → ${massstab.toFixed(3)} Anzeigepunkte je Layoutpunkt\n`);

const befunde = [];   // das ist kaputt
const hinweise = [];  // das ist eine Entscheidung, kein Fehler
for (const key of SZENEN) {
  const vorher = laufFehler.length;
  const ok = await seite.evaluate((key) => {
    const g = window.__game;
    g.scene.scenes.forEach(s => { if (s.scene.isActive() && s.scene.key !== key) g.scene.stop(s.scene.key); });
    g.scene.start(key);
    return true;
  }, key);
  await seite.waitForTimeout(2200);

  const z = await seite.evaluate((key) => {
    const g = window.__game;
    const s = g.scene.getScene(key);
    if (!s || !s.scene.isActive()) return { fehlt: true };
    const stuecke = [];
    const geh = (liste, tiefe) => {
      for (const o of liste) {
        if (o.visible === false || (o.alpha !== undefined && o.alpha < 0.05)) continue;
        if (o.list && o.type === 'Container') { geh(o.list, tiefe + 1); continue; }
        let b = null;
        try { b = o.getBounds ? o.getBounds() : null; } catch (e) {}
        if (!b || !isFinite(b.x)) continue;
        stuecke.push({
          art: o.type,
          text: (typeof o.text === 'string' ? o.text : '').slice(0, 40),
          gr: o.style && o.style.fontSize ? parseFloat(o.style.fontSize) * (o.scaleY || 1) : 0,
          x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
        });
      }
    };
    geh(s.children.list, 0);
    const c = s.cameras.main;
    return { W: g.renderer.width / (c.zoom || 1), H: g.renderer.height / (c.zoom || 1), stuecke };
  }, key);

  if (z.fehlt) { befunde.push(`${key}: Szene laesst sich nicht starten`); continue; }
  const neu = laufFehler.slice(vorher);
  if (neu.length) befunde.push(`${key}: ${neu.length} Laufzeitfehler — ${neu[0].slice(0, 100)}`);

  // 1. Was ragt aus dem Bild?
  // Ein Bild von 1 x 1 Punkt ist kein Layout — das sind ausgeraeumte
  // Vorratseintraege und Partikelquellen, die ausserhalb sitzen duerfen.
  const raus = z.stuecke.filter(s => s.w >= WINZIG && s.h >= WINZIG &&
    (s.x < -RAND / massstab || s.y < -RAND / massstab || s.x + s.w > z.W + RAND / massstab || s.y + s.h > z.H + RAND / massstab));
  for (const s of raus.slice(0, 4)) {
    befunde.push(`${key}: ${s.art}${s.text ? ' „' + s.text + '"' : ''} ragt aus dem Bild (${s.x},${s.y} ${s.w}x${s.h}, Feld ${z.W}x${z.H})`);
  }

  // 2. Welche Schrift ist auf dem Telefon zu klein?
  // Kein Befund, sondern ein Hinweis: eine kleine Schrift kann Absicht sein
  // (Beschriftungen in Grossbuchstaben), eine ueberlappende nie.
  const winzig = z.stuecke.filter(s => s.gr > 0 && s.gr * massstab < SCHRIFT_MIN && s.text.trim());
  for (const s of winzig.slice(0, 3)) {
    hinweise.push(`${key}: „${s.text}" misst ${(s.gr * massstab).toFixed(1)} Anzeigepunkte (Richtwert ${SCHRIFT_MIN})`);
  }

  // 3. Welche Schriften liegen uebereinander? Nur Text gegen Text — Text auf
  //    einer Flaeche ist Absicht, Text auf Text ist es nie.
  const texte = z.stuecke.filter(s => s.art === 'Text' && s.text.trim() && s.w > 0 && s.h > 0);
  const paare = [];
  for (let i = 0; i < texte.length; i++) for (let j = i + 1; j < texte.length; j++) {
    const a = texte[i], b = texte[j];
    const ux = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const uy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    // Vier Punkte Hoehe sind Unterlaengen oder eine Tafel, die ueber einer
    // Hintergrundzeile liegt — beides Absicht. Die echten Kollisionen im
    // Modul-Schirm massen 8 Punkte Hoehe, die bleiben.
    if (ux > 3 && uy >= UEBER_Y) {
      const anteil = (ux * uy) / Math.min(a.w * a.h, b.w * b.h);
      if (anteil > 0.12) paare.push({ a, b, anteil, ux, uy });
    }
  }
  for (const p of paare.slice(0, 4)) {
    befunde.push(`${key}: „${p.a.text}" und „${p.b.text}" ueberlappen zu ${(p.anteil * 100).toFixed(0)} % (${p.ux}x${p.uy} Punkte)`);
  }

  console.log(`  ${key.padEnd(10)} ${String(z.stuecke.length).padStart(3)} Stuecke · ${raus.length} ueber den Rand · ${winzig.length} zu klein · ${paare.length} Ueberlappung(en)`);
  if (BILDER) writeFileSync(`dist/schirme/${key}.png`, await seite.screenshot({ clip: r }));
}

await browser.close();

if (hinweise.length) {
  console.log(`\n  ${hinweise.length} Zeile(n) unter dem Richtwert von ${SCHRIFT_MIN} Anzeigepunkten:`);
  hinweise.forEach(h => console.log('   – ' + h));
}
if (befunde.length) {
  console.error(`\n✗ Schirme: ${befunde.length} Befund(e)`);
  befunde.forEach(b => console.error('   · ' + b));
  process.exit(1);
}
console.log('✓ Schirme: nichts ragt heraus, nichts liegt uebereinander.');
