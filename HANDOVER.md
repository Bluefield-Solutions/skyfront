# Skyfront — Übergabe für Claude Code

Dieses Projekt in Claude Code (oder jeder lokalen Node-Umgebung) produktiv machen.
In 5 Minuten drin.

## Was das ist

Der aus dem ausgelieferten Single-File-Build zurückgewonnene, **wieder baubare
Quellcode** von Skyfront (Phaser-Shmup). Ein Befehl macht daraus eine autarke,
offline lauffähige `Skyfront.html` (alle Assets als Base64 inline). Es ist kein
Original-TypeScript mehr, aber voll editier- und baubar.

## Voraussetzungen

- **Node.js 18+** (keine npm-Abhängigkeiten für den Bau selbst).
- **Optional Playwright** für den echten Boot-Test:
  `npm install playwright && npx playwright install chromium`

## Schnellstart

```bash
node build.mjs                     # src/balance.js -> dist/Skyfront.html (Master)
node build-variants.mjs            # profiles/*.js  -> dist/Skyfront-<Name>.html + dist/index.html (Launcher)
node build-all.mjs                 # beides
node build-all.mjs --zip           # + verteilbares Skyfront-dist.zip (Launcher + alle Varianten, ~200 MB)
node build-all.mjs --zip=master    # + kleines Skyfront-master.zip (nur Master, ~16 MB)
node build-all.mjs --zip --boot    # Paket NUR, wenn jede Variante fehlerfrei bootet (Qualitäts-Gate)
node check.mjs                     # CI: baut + bootet, Exit-Code + dist/check-report.md
```

Alternativ per npm (`package.json` liegt bei):

```bash
npm run build | variants | all | package | package:master | release | check
```

> Hier in Claude Code gibt es **kein 30-MB-Ausliefer-Limit** — das große
> `Skyfront-dist.zip` liegt einfach in deinem Verzeichnis.

## Balance ändern (zwei Wege)

1. **Visuell:** `Balance-Editor.html` (liegt im Projekt) im Browser öffnen →
   Regler → „balance.js kopieren/herunterladen" → als `src/balance.js` speichern
   → `node build.mjs`.
2. **Direkt:** Zahl in `src/balance.js` ändern → `node build.mjs`.

`balance.js` deckt ab: Spieler, Gegner allgemein, Schwierigkeit, HP+Score aller
12 Gegner, Gadgets (CD+Kosten), Waffenkosten, **Kurve** (waveBase/waveSlope …),
**Upgrades**/**Panzerung** (max + Preise) sowie die **Code-Optionen**
`bossRush {every}`, `bossHp {mult}`, `corridorAll`, `bossBeamAlways`.

## Neue Variante

Datei `profiles/<Name>.js` anlegen (Format wie `src/balance.js`, optional
`export const META = { title, tag, accent, desc }`) → `node build-variants.mjs`.
Sie erscheint automatisch im Launcher und in der Vergleichstabelle.

## Datei-Landkarte

```
src/balance.js        ★ Kernwerte an EINER Stelle (bearbeiten)
src/app.js            der Spielcode (~2,8 MB, minifiziert-aber-lesbar)
src/modifier.js       optischer Level-Modifikator (Nacht/Sturm/…), fest eingebaut
src/assets.js         AUTO-GENERIERT (71 Base64-Blobs) — NIE von Hand editieren
Balance-Editor.html   visuelle Balancing-Konsole (im Browser öffnen)
buildcore.mjs         gemeinsame Build-Logik (Patcher + Code-Transforms)
build.mjs / build-variants.mjs / build-all.mjs / check.mjs / zip.mjs
profiles/*.js         je eine Variante
package.json          npm-Scripts (build/variants/all/package/check)
.gitignore            ignoriert dist/, node_modules/, *.zip
docs/                 Code-Landkarte · Werkzeugkette · Wiederherstellung-und-Weiterbau
.github/workflows/check.yml   CI: baut + bootet bei Push/PR
index.head.html / index.tail.html / .modopen   HTML-Hüllen
dist/                 Ergebnisse (nicht eingecheckt)
```

## Drei Fakten, die man kennen muss

- **Minifiziert:** Bezeichner sind kryptisch (`tt`, `pe`, `bt`). Werte/Texte
  sind lesbar; große Umbauten sind mühsam.
- **`intensity` im Stage-Array ist wirkungslos** — die echte Schwierigkeit
  steckt in der Wellen-Formel `tn` bzw. der `curve` in `balance.js`.
- **`src/assets.js` ist auto-generiert.** Bei Bedarf neu aus einem Build
  erzeugen (Verfahren siehe unten), aber nie von Hand anfassen.

## Git / CI

- Repo initialisieren, alles committen (auch `src/assets.js`, ~21 MB). Eine
  `.gitignore` liegt bei (ignoriert `dist/`, `node_modules/`, `*.zip`).
- `.github/workflows/check.yml` läuft dann bei jedem Push/PR (installiert
  Playwright, führt `check.mjs` aus, zeigt den Bericht in der Job-Summary).
- Voraussetzung: Projektdateien liegen im Repo-Wurzelverzeichnis.

## Weiterführend (im Ordner `docs/`)

- **docs/Code-Landkarte.md** — wo im `app.js` welche Stelle sitzt (Balance,
  Gegner, Level, Wellen-Funktionen `tn`/`Si`).
- **docs/Werkzeugkette.md** — Kurzüberblick der Werkzeuge.
- **docs/Wiederherstellung-und-Weiterbau.md** — wie `assets.js`/`app.js` aus einem
  Build neu gewonnen werden und wie die Code-Ebene-Transforms funktionieren.

## Empfohlener nächster Qualitätsschritt

Für kleinere, „echte" Pakete: weg von der Single-File-Autarkie hin zu einem
sauberen Web-Projekt (Vite + Phaser aus npm, getrennte Asset-Dateien). Das ist
der eigentliche Qualitätshebel und in Claude Code natürlich umsetzbar.
