# Skyfront — Wiederherstellung & Weiterbau

Wie der baubare Quellcode aus dem fertigen Single-File-Build zurückgewonnen wird
— für den Fall, dass `src/app.js` oder `src/assets.js` neu erzeugt werden müssen.

## Ausgangslage
- Der ursprüngliche TypeScript-Quellcode existiert nicht mehr. **Vollständig &
  aktuell ist nur der fertige Build `Skyfront.html`** (autark, alle Grafiken als
  Base64 eingebettet, aber MINIFIZIERT).
- Dieses Projekt ist der daraus zurückgewonnene, wieder baubare JS-Stand.

## Rekonstruktions-Technik (falls erneut nötig)
1. Aus dem Build das einzige `<script type="module">`-Bündel extrahieren.
2. Alle `data:...;base64,...`-Literale per Regex herausziehen → Array `__SKFA[]`
   (`src/assets.js`), im Code durch `__SKFA[n]` ersetzen → `app.js` schrumpft von
   ~22,7 MB auf ~1,7 MB reinen Code.
3. Rest mit js-beautify formatieren → `src/app.js`.
4. `build.mjs` fügt wieder zusammen: head + `<script>`assets`</script>` +
   `.modopen` + app + `</script>` + modifier + tail → `dist/Skyfront.html`.

## Modifikator (fest eingebaut)
- `app.js` wurde einmalig gepatcht: `new tt.Game(` → `window.__game=new tt.Game(`.
- `src/modifier.js` wird von `build.mjs` automatisch als klassisches `<script>`
  hinter das Modul gehängt (wenn die Datei existiert).
- Modifikator entfernen = `src/modifier.js` löschen und neu bauen.
- Er nutzt nur **stabile Phaser-APIs** (`scene.getScene('Game')`, `scene.add.*`,
  `cameras.main.flash`, `registry.get('px'/'py')`) → robust gegen Minifizierung.

## Code-Ebene-Transforms (in buildcore.mjs)
Zusätzlich zu den Werten patcht der Build gezielt eindeutige Code-Fragmente:
- **Kurve** (`curve`): `34 + Math.floor(b*1.1)` und `2150 - T*45` in `tn()`.
- **Boss-Rush** (`bossRush.every`): `boss: T.boss,` → Kadenz-Ausdruck.
- **Boss-HP** (`bossHp.mult`): `this.maxHp = 260, this.hp = 260`.
- **Korridor** (`corridorAll`): `corridor: T.corridor,` → `corridor: true,`.
- **Boss-Beam** (`bossBeamAlways`): `this.bossBeamOn = b.bossBeam` → `= true`.
Jeder Transform prüft, dass sein Fragment **genau einmal** vorkommt, sonst bricht
der Build ab (kein stilles Danebenpatchen).

## Ehrliche Grenzen
- Minifiziert ⇒ Bezeichner kryptisch, Original-Namen/Kommentare nicht
  wiederherstellbar. Gut für gezielte Änderungen; für große Umbauten ist der
  saubere Vite-/Phaser-Neuaufbau der bessere Weg.
