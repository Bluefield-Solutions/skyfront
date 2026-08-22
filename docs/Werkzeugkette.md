# Skyfront — Werkzeugkette (Schnelleinstieg)

Kurzüberblick der Werkzeuge. Details im `README.md` des Projekts.

## Die Dateien
- **dist/Skyfront.html** — spielbarer Master (autark, ~24 MB).
- **Balance-Editor.html** — visuelle Balancing-Konsole (Regler, Wellen-Diagramm,
  Diff, Vorlagen, Kostenkurve, Härte-Index, `balance.js`-Import/-Export).
- **dist/index.html** — Varianten-Launcher mit Vergleichstabelle; muss neben den
  `dist/Skyfront-*.html` liegen.

## Bauen (Node v18+, kein npm nötig)
- `node build.mjs` → `dist/Skyfront.html` (aus `src/balance.js`)
- `node build-variants.mjs` → alle `profiles/*.js` → `dist/Skyfront-<Name>.html` + `dist/index.html`
- `node build-all.mjs` → beides;  `--zip` / `--zip=master` / `--boot` siehe README
- `node check.mjs` → CI-Check (baut + bootet + `dist/check-report.md`)
- Oder per npm: `npm run build | variants | all | package | check`

## Balance ändern (zwei Wege)
1. **Konsole**: `Balance-Editor.html` öffnen → Regler → „balance.js
   kopieren/herunterladen" → als `src/balance.js` speichern → `node build.mjs`.
2. **Direkt**: Zahl in `src/balance.js` ändern → `node build.mjs`.

`balance.js` deckt ab: Spieler, Gegner allgemein, Schwierigkeit, HP+Score aller
12 Gegner, Gadgets (CD+Kosten), Waffenkosten, **Kurve** (waveBase/waveSlope …),
**Upgrades**/**Panzerung** (max + Preise) und die **Code-Optionen**
`bossRush`, `bossHp`, `corridorAll`, `bossBeamAlways`.

## Wichtige Fakten
- Der Build ist **minifiziert** → Bezeichner kryptisch (`tt`, `pe`, `bt`).
- `intensity` im Stage-Array ist **wirkungslos**; echte Schwierigkeit = Wellen-
  Formel `tn` bzw. `curve` in `balance.js`.
- `src/assets.js` ist **auto-generiert** (71 Base64-Blobs) — nie editieren.
- `src/modifier.js` = optischer Level-Modifikator (Nacht/Sturm/Nebel/Auto/
  Zufall), fest eingebaut; Tasten N/M im Spiel.
- Code-Orientierung: `docs/Code-Landkarte.md`.

## Fassungen (Profile in profiles/)
Master (Wunsch-Set), Arcade, Hardcore, Roguelite, Sandbox, Bullet-Hell, Zen,
Speedrun, Glaskanone, Boss-Rush, Belagerung.
