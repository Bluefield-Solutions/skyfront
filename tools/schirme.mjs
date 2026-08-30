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
//
// SEIT v61 HAENGT DIESES TOR IN DER TORKETTE. Bis dahin war es ein
// Handbefehl — und damit das einzige Tor, das die Pause misst, ohne je von
// selbst zu laufen. Ein Tor, das niemand aufruft, schuetzt nichts; es ist
// eine Behauptung mit Ablaufdatum. Dafuer musste es zuerst die drei
// Ausgaenge lernen (Regel 40/42): 0 gemessen und ohne Befund, 1 Befund,
// 2 NICHT gemessen. Vorher sagte es bei fehlendem Playwright „0" — also
// „bestanden" ueber etwas, das nie angesehen wurde.
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Schirme', 'auf elf Schirmen ragt nichts heraus, ist nichts zu klein und liegt nichts uebereinander.');
const BILDER = process.argv.includes('--bilder');
const ANZEIGE = 390;                 // Breite auf dem Zielgeraet
const SCHRIFT_MIN = 9;               // Anzeigepunkte, darunter unlesbar
const RAND = 6;                      // so weit darf etwas ueber den Rand ragen
const WINZIG = 4;                    // kleiner als das ist kein Layout, sondern ein Punkt
const UEBER_Y = 6;                   // so viel Hoehe braucht eine echte Zeilenkollision

// ZWOELF SZENEN HAT DAS SPIEL: Boot · Menu · Options · Hangar · Workshop ·
// Arsenal · Levels · Briefing · Loadout · Gear · Game · Pause. Boot ist der
// Vorlader und hat keinen Schirm; die uebrigen elf werden hier gemessen.
//
// Bis v60 waren es NEUN. Im Kommentar stand „Pause braucht ein laufendes
// Gefecht" — als Begruendung fuer eine Ausnahme, und dann kam niemand
// zurueck. Genau das meint Regel 47: ein Tor, das eine von zwei Tueren
// prueft, meldet gruen ueber ein Haus, aus dem man nicht herauskommt. Der
// Pausenschirm hat drei Knoepfe (Fortsetzen, Level neu starten, Zum
// Hangar) und wurde von KEINEM Tor je angesehen.
//
// Das Gefecht laeuft hier ohnehin — von dort ist die Pause einen Tipp weit
// entfernt. Die Ausrede war also nie eine.
const SZENEN = ['Menu', 'Options', 'Hangar', 'Workshop', 'Arsenal', 'Levels', 'Briefing', 'Loadout', 'Gear'];
const SZENEN_GESAMT = SZENEN.length + 2;   // + Gefecht + Pause
// Das Gefecht laesst sich nicht einfach starten wie ein Menue — es muss
// gespielt werden. Und darin zaehlt nur der HUD: Schadenszahlen und
// Aufsammel-Texte fliegen durchs Bild und duerfen sich ueberlappen, das ist
// ihre Art. Der HUD liegt auf Tiefe 95 und darueber, gemessen.
const HUD_TIEFE = 90;

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }
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

// DIE NAHT, und sie wird erst JETZT gesetzt: `getScene` haengt auch der
// Szenenverwaltung von Phaser an. Vor dem Hochlauf entfernt, kommt gar
// keine Szene hoch und das Werkzeug stuerzt beim Ausmessen des
// Layoutraums ab — ein Absturz ist keine Rueckgabe 2, sondern ein Tor,
// das nichts sagt und dabei laut ist.
if (OHNE_NAHT) await seite.evaluate(() => {
  const echt = window.__game.scene.getScene.bind(window.__game.scene);
  window.__game.scene.getScene = (k) => (typeof k === 'string' ? null : echt(k));
});

// Beurteilt eine aufgenommene Szene. Drei Fragen, in dieser Reihenfolge:
// was ragt aus dem Bild, was ist zu klein, was liegt uebereinander.
let gemessen = 0;

function pruefe(key, z, neueFehler) {
  gemessen++;
  if (neueFehler.length) befunde.push(`${key}: ${neueFehler.length} Laufzeitfehler — ${neueFehler[0].slice(0, 100)}`);

  // 1. Was ragt aus dem Bild? Ein Stueck von 1 x 1 Punkt ist kein Layout —
  //    das sind ausgeraeumte Vorratseintraege und Partikelquellen, die
  //    ausserhalb sitzen duerfen.
  // Was den ganzen Schirm ueberdeckt, ragt nicht heraus, sondern deckt —
  // Blenden und Vignetten sind mit Absicht groesser als das Feld.
  const deckend = (s) => s.x <= 0 && s.y <= 0 && s.x + s.w >= z.W && s.y + s.h >= z.H;
  const raus = z.stuecke.filter(s => s.w >= WINZIG && s.h >= WINZIG && !deckend(s) &&
    (s.x < -RAND / massstab || s.y < -RAND / massstab || s.x + s.w > z.W + RAND / massstab || s.y + s.h > z.H + RAND / massstab));
  for (const s of raus.slice(0, 4)) {
    befunde.push(`${key}: ${s.art}${s.text ? ' „' + s.text + '"' : ''} ragt aus dem Bild (${s.x},${s.y} ${s.w}x${s.h}, Feld ${z.W}x${z.H})`);
  }

  // 2. Welche Schrift ist auf dem Telefon zu klein? Kein Befund, sondern ein
  //    Hinweis: eine kleine Schrift kann Absicht sein, eine ueberlappende nie.
  const winzig = z.stuecke.filter(s => s.gr > 0 && s.gr * massstab < SCHRIFT_MIN && s.text.trim());
  for (const s of winzig) {
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
    // Vier Punkte Hoehe sind Unterlaengen oder eine Tafel ueber einer
    // Hintergrundzeile — beides Absicht. Die echten Kollisionen im
    // Modul-Schirm massen 8 Punkte Hoehe, die bleiben.
    if (ux > 3 && uy >= UEBER_Y) {
      const anteil = (ux * uy) / Math.min(a.w * a.h, b.w * b.h);
      if (anteil > 0.12) paare.push({ a, b, anteil, ux, uy });
    }
  }
  for (const p of paare.slice(0, 4)) {
    befunde.push(`${key}: „${p.a.text}" und „${p.b.text}" ueberlappen zu ${(p.anteil * 100).toFixed(0)} % (${p.ux}x${p.uy} Punkte)`);
  }

  const kleinste = winzig.reduce((m, s) => Math.min(m, s.gr * massstab), 99);
  console.log(`  ${key.padEnd(10)} ${String(z.stuecke.length).padStart(3)} Stuecke · ${raus.length} ueber den Rand · ${String(winzig.length).padStart(2)} unter ${SCHRIFT_MIN} Punkten${winzig.length ? ' (kleinste ' + kleinste.toFixed(1) + ')' : ''} · ${paare.length} Ueberlappung(en)`);
}

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

  // Einmalige Einweisungen wegtippen. Solange eine steht, ist der Schirm
  // darunter nicht sichtbar — und alles, was das Werkzeug dann an
  // "Ueberlappungen" faende, waere in Wahrheit verdeckter Hintergrund.
  const knopf = await seite.evaluate((key) => {
    const s = window.__game.scene.getScene(key);
    if (!s || !s.scene.isActive()) return null;
    let treffer = null;
    const geh = (l) => l.forEach(o => {
      if (o.list && o.type === 'Container') return geh(o.list);
      if (o.type === 'Text' && /^(Verstanden|Alles klar|OK)$/.test((o.text || '').trim())) {
        const b = o.getBounds();
        treffer = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }
    });
    geh(s.children.list);
    return treffer;
  }, key);
  if (knopf) {
    const c = await seite.evaluate(() => { const g = window.__game, k = g.canvas.getBoundingClientRect(); return { x: k.x, y: k.y, m: k.width / (g.renderer.width / (g.scene.scenes.find(s => s.scene.isActive()).cameras.main.zoom || 1)) }; });
    await seite.touchscreen.tap(c.x + knopf.x * c.m, c.y + knopf.y * c.m);
    await seite.waitForTimeout(900);
    console.log(`  (i) ${key}: Einweisung weggetippt, gemessen wird der Schirm darunter`);
  }

  const z = await seite.evaluate((key) => {
    const g = window.__game;
    const s = g.scene.getScene(key);
    // ZWEI VERSCHIEDENE DINGE, und bis v61 hiessen sie beide „Szene laesst
    // sich nicht starten": die Szene LAEUFT NICHT (dann sagt das Spiel
    // etwas Falsches — Befund), oder sie ist fuer das Werkzeug NICHT
    // LESBAR (dann hat der Apparat keine Zahl geliefert — Rueckgabe 2).
    // Die Gegenprobe --ohne-naht hat genau diesen Unterschied aufgedeckt:
    // sie nimmt die Lesbarkeit weg, und das Tor meldete neun Befunde
    // ueber ein voellig gesundes Spiel (Regel 42).
    // Wenn die Szene gar nicht zu HOLEN ist, kann das Werkzeug auch nicht
    // sagen, ob sie laeuft — `isActive` geht durch dieselbe Verwaltung.
    // Also: nicht holbar = nicht gemessen, ohne Umweg ueber eine Vermutung.
    if (!s) return { unlesbar: true };
    if (!s.scene.isActive()) return { fehlt: true };
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

  if (z.unlesbar) { M.ungemessen(`${key}: die Szene ist nicht auslesbar — nicht gemessen.`); continue; }
  if (z.fehlt) { befunde.push(`${key}: Szene laesst sich nicht starten`); continue; }
  pruefe(key, z, laufFehler.slice(vorher));
  if (BILDER) writeFileSync(`dist/schirme/${key}.png`, await seite.screenshot({ clip: r }));
}

// Und jetzt das Gefecht. Es wird gespielt, nicht gestartet.
{
  const vorher = laufFehler.length;
  await seite.evaluate(() => {
    const g = window.__game;
    g.scene.scenes.forEach(s => { if (s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Menu');
  });
  await seite.waitForTimeout(2200);
  await seite.touchscreen.tap(r.x + 0.5 * r.width, r.y + 0.711 * r.height);
  let drin = false;
  for (let i = 0; i < 60; i++) {
    if (await seite.evaluate(() => window.__game.scene.scenes.some(s => s.scene.key === 'Game' && s.scene.isActive()))) { drin = true; break; }
    await seite.waitForTimeout(250);
  }
  if (!drin) OHNE_NAHT ? M.ungemessen('Gefecht: ohne Messstelle nicht erreichbar — nicht gemessen.') : befunde.push('Gefecht: kommt nicht ins Spiel');
  else {
    // Die Einblendung "ENDLOS-MODUS" steht die ersten Sekunden ueber allem.
    // Sie ist Absicht und ginge sonst als Ueberlappung durch.
    await seite.waitForTimeout(6000);
    const z = await seite.evaluate((tiefe) => {
      const g = window.__game, s = g.scene.getScene('Game');
      if (!s) return null;
      const c = s.cameras.main;
      const stuecke = [];
      const geh = (liste) => {
        for (const o of liste) {
          if (o.visible === false || (o.alpha !== undefined && o.alpha < 0.05)) continue;
          if (o.list && o.type === 'Container') { geh(o.list); continue; }
          if ((o.depth || 0) < tiefe) continue;
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
      geh(s.children.list);
      return { W: g.renderer.width / (c.zoom || 1), H: g.renderer.height / (c.zoom || 1), stuecke };
    }, HUD_TIEFE);
    if (!z) M.ungemessen('Gefecht: die Szene ist nicht auslesbar — nicht gemessen.');
    else {
      pruefe('Gefecht', z, laufFehler.slice(vorher));
      if (BILDER) writeFileSync('dist/schirme/Gefecht.png', await seite.screenshot({ clip: r }));
    }

    // Und aus dem laufenden Gefecht heraus die PAUSE. Sie liegt UEBER dem
    // Gefecht: gemessen wird nur, was zu ihr gehoert — sonst zaehlte der
    // ganze Schirm darunter als Ueberlappung.
    const vorherP = laufFehler.length;
    await seite.evaluate(() => {
      const g = window.__game, s = g.scene.getScene('Game');
      s && typeof s.pauseGame === 'function' && s.pauseGame();
    });
    await seite.waitForTimeout(1800);
    const zp = await seite.evaluate(() => {
      const g = window.__game, s = g.scene.getScene('Pause'), spiel = g.scene.getScene('Game');
      if (!s || !spiel || !s.scene.isActive()) return null;
      const c = spiel.cameras.main;
      const stuecke = [];
      const geh = (liste) => {
        for (const o of liste) {
          if (o.visible === false || (o.alpha !== undefined && o.alpha < 0.05)) continue;
          if (o.list && o.type === 'Container') { geh(o.list); continue; }
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
      geh(s.children.list);
      return { W: g.renderer.width / (c.zoom || 1), H: g.renderer.height / (c.zoom || 1), stuecke };
    });
    if (!zp) OHNE_NAHT ? M.ungemessen('Pause: ohne Messstelle nicht auslesbar — nicht gemessen.') : befunde.push('Pause: der Schirm kommt aus dem laufenden Gefecht nicht hoch');
    else {
      pruefe('Pause', zp, laufFehler.slice(vorherP));
      if (BILDER) writeFileSync('dist/schirme/Pause.png', await seite.screenshot({ clip: r }));
    }
  }
}

await browser.close();

if (hinweise.length) {
  console.log(`\n  ${hinweise.length} Zeile(n) unter dem Richtwert von ${SCHRIFT_MIN} Anzeigepunkten:`);
  hinweise.forEach(h => console.log('   – ' + h));
}
for (const b of befunde) M.befund(b);
if (gemessen < SZENEN_GESAMT) M.ungemessen(`nur ${gemessen} von ${SZENEN_GESAMT} Schirmen gemessen.`);
M.urteil(`\n  ${gemessen} von ${SZENEN_GESAMT} Schirmen gemessen.`);
