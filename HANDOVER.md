# Skyfront — Übergabe

Dieses Projekt in Claude Code (oder jeder lokalen Node-Umgebung) produktiv
machen. In 5 Minuten drin.

## Was das ist

Der aus dem ausgelieferten Single-File-Build zurückgewonnene, **wieder baubare
Quellcode** von Skyfront (Phaser-Shmup, senkrecht scrollend). Ein Befehl macht
daraus eine autarke, offline lauffähige `Skyfront.html`. Ein zweiter macht
daraus eine **Web-App, die auf dem iPhone-Startbildschirm liegt**.

Es ist kein Original-TypeScript mehr, aber voll editier- und baubar.

## Zwei Auslieferungen, ein Quellcode

|  | `dist/Skyfront.html` | `dist/pages/` |
|---|---|---|
| Was | eine Datei, alles inline | Web-App mit Nachbardateien |
| Größe | 14,95 MB | index.html 2,93 MB + 68 Bilder (9,2 MB) + 11 Startbilder (2,2 MB) |
| Wofür | weitergeben, per Mail, USB-Stick | GitHub Pages, Startbildschirm, offline |
| Befehl | `npm run build` | `npm run pages` |

**Autark heißt autark:** in der Einzeldatei sind weiterhin alle 71 Bilder
`data:`-Adressen, keine einzige Datei-Adresse. Das prüft der Bau selbst.

## Voraussetzungen

- **Node.js 18+**
- `npm install` — für den reinen Einzeldatei-Bau nicht nötig, aber für
  Boot-Test (playwright 1.56.0, festgenagelt) und Bildwerkzeuge (sharp).
- `npx playwright install chromium`

## Schnellstart

```bash
npm run build       # -> dist/Skyfront.html (Master, autark)
npm run pages       # -> dist/pages/ (Web-App: Manifest, Symbol, Dienst-Arbeiter)
npm run variants    # -> dist/Skyfront-<Name>.html je Profil + dist/index.html
npm run all         # beides
npm run check       # die Torkette: bauen, alle zwölf starten, Bildtor, Farbtor  (~3 min)
npm run bildtor     # nur das Bildtor
npm run farbtor     # nur das Farbtor  (-- --nurstatisch: ohne Browser, ~2 s)
npm run farbproben  # fünfzehn Gegenproben zu allen Toren  (-- --alle: mit Neubau)
npm run formen      # Silhouettenabstand der Gegnerprojektile
npm run untergrund  # Kantenenergie der 13 Biome und die Beruhigungsschicht
npm run feuerkraft  # Feuerkraft-Leiter: 120 Sektoren + Mechanik im Gefecht
npm run speicher    # Texturen im Gefecht, mit Grenze
npm run rhythmus    # Druckkurve, Atemzüge, Vielfalt über 120 Sektoren
npm run schirme     # jeden Bildschirm aufnehmen und nachmessen
npm run symbol      # App-Symbol und die elf iOS-Startbilder neu backen
npm run bilder      # Hintergrundbahnen neu codieren (verkleinert assets.js)
npm run bildpruefung # gelieferte Rohbilder gegen den Auftrag messen
npm run einbau      # geprueftes Rohbild in Zielgroesse nach assets.js backen
npm run zeitachse   # wie lange ein Sektor mindestens dauert (Wellen + Boss)
npm run bossmuster  # feuert jede Bossphase anders, oder nur mehr vom Gleichen
npm run package     # verteilbares Skyfront-dist.zip
```

## Die Web-App auf dem Startbildschirm

`pages.mjs` baut aus der fertigen Einzeldatei `dist/pages/`. Es rührt den
Einzeldatei-Bau nicht an, sondern nimmt sein Ergebnis auseinander:

- **68 der 71 Bilder** werden zu echten Dateien in `bilder/`. Drei bleiben
  drin: `__SKFA[0]` und `[2]` sind Bruchstücke, die Phaser im Code
  aneinanderhängt, `[1]` ist Phasers weißes Ersatzbild, gebraucht bevor ein
  Lader läuft. Erkannt wird das am Bild selbst (PNG endet auf `IEND`, JPEG auf
  `FFD9`, WebP beginnt mit `RIFF`/`WEBP`), nicht am Präfix.
- **Manifest** (`standalone`, hochkant verriegelt) und **ein**
  `apple-touch-icon` auf eine Datei — den `data:`-Verweis ignoriert iOS.
- **Elf `apple-touch-startup-image`** für die gängigen iPhone-Größen. Sie
  entstehen aus **derselben Hülle** wie das Spiel, nur in Gerätegröße; deshalb
  ist der Übergang unsichtbar.
- **Dienst-Arbeiter** (`web/sw.js`): legt jedes abgerufene Bild ab und lädt
  den Rest nach — aber **nur, wenn die Seite vom Startbildschirm gestartet
  wurde** (`display-mode: standalone` bzw. `navigator.standalone`). Wer nur im
  Browser vorbeischaut, zieht nicht ungefragt 9 MB.
- **Speichermarke** aus Inhalts-Prüfsumme UND Bilder-Prüfsumme. Ohne den
  zweiten Teil blieb sie beim Verkleinern der Bilder unverändert — auf dem
  Telefon wären für immer die alten Bilder geblieben.

Ausgeliefert wird über `.github/workflows/pages.yml` bei jedem Push auf `main`.
**Einmalig von Hand nötig:** Settings → Pages → Source auf „GitHub Actions".

## Was geprüft wird

`npm run check` (und damit die CI bei jedem Push, ~4 min auf GitHub):

1. Master bauen, elf Varianten bauen
2. jede der zwölf Dateien headless starten, Laufzeitfehler zählen
3. **Bildtor** — siehe unten
4. Bericht nach `dist/check-report.md` und in die Job-Zusammenfassung

Dazu, nicht in der Torkette, weil es Urteil verlangt statt Schwellen:

- **Die Version steht unten im Bild**, klein und mittig, im Menü wie im
  Gefecht. Eine Quelle: `SKF_VERSION` in `src/app.js`; der Bau stempelt sie
  in die HTML-Hülle und verweigert den Dienst, wenn Konstante oder
  Platzhalter fehlen. `npm run version` vergleicht Quelle, Auditbericht
  (höchster Nachtrag) und **Bau** — ein nicht ersetzter Platzhalter sieht in
  der Quelle in Ordnung aus. Wer einen Nachtrag schreibt, hebt die Version
  mit `npm run version -- --setzen`.
- **Rückgabe 2 heißt „nicht gemessen“.** 0 = gemessen und ohne Befund, 2 =
  nicht (vollständig) gemessen (Kette bleibt grün, Bericht zeigt
  „⚠ nicht gemessen“), alles andere = Befund.
- `npm run formationen` — misst, ob die zwölf Begegnungsbausteine im Bild
  zwölf Dinge sind. Lässt `spawnWave()` im laufenden Gefecht jeden Teil
  wirklich stellen und schreibt mit, wo abgesetzt wird; verglichen wird in
  den Schrittweiten des Spiels (62 quer, 46 tief, 400 ms). Treibt die Uhr
  des Spiels selbst an — `delayedCall` zählt in Delta-Zeit, und die geht
  ohne Fensterfokus anders als `time.now`.
- `npm run schirme` — startet jede der neun Menü-Szenen einzeln, misst was aus
  dem Bild ragt, was übereinanderliegt, was auf dem Telefon zu klein ist.
- `npm run bildtor -- --bilder` — legt die schlimmste Aufnahme je Modus ab.
- `npm run farbtor` — die drei reservierten Farbbänder. Gefahr `#ff3a2a`,
  Eigenfeuer `#bfefff`, Aufsammler alles außerhalb beider. Die Konstanten
  `GEFAHR` / `EIGEN` in `src/app.js` sind die einzige Quelle; das Tor liest
  sie von dort und meldet rot, wenn es sie nicht findet. Prüfung G zählt
  außerdem, was additiv über den Gegnerkugeln liegt (Tiefe 20…59) — erlaubt
  ist nur, was `TIEFE_UEBER_GEFAHR` beim Namen nennt. H und H2 nehmen sich die
  beiden **Kennleuchten** vor (`LEUCHTE_FARBE`): Abstand zu allen neun
  belegten Farben aus Farbton plus halbem Graustufenabstand (Grenze 45), kein
  Gefahrenband, Sättigung deutlich über EIGEN, Graustufe über 110 — und in H2,
  am gebauten Spiel, die Größe gegen den kleinsten Aufsammler (Faktor 2,5).
  H2 wartet auf **Stillstand** der Texturliste, nicht auf die Uhr: nach 3 s
  fehlten fünf von dreizehn Gegnerbildern.
- **Messtafel auf dem Gerät** — Adresse mit `#messung`, oder **vier Mal** in
  die obere rechte Ecke tippen (für die App auf dem Startbildschirm). Der
  Knopf **Kopieren** legt alles als eine Zeile in die Zwischenablage. Im
  GEFECHT messen, nicht im Menü — die Zeile sagt es selbst, wenn man es
  falsch macht.
- `npm run untergrund` — die Beruhigungsschicht. Sie nimmt dem Untergrund
  Kontrast gegen seine **Mittelfarbe**, nicht Helligkeit: Abdunkeln würde der
  Gegnerkugel den dunklen Rand nehmen, der gerade über hellem Grund trägt.
  Die Tafel ruft `window.__SKF_UNTERGRUND` auf — die Funktion des Spiels,
  nicht eine nachgebaute Formel.

### Das Bildtor

Alle anderen Tore prüfen, dass Dateien da sind und das Spiel startet — nie,
wie es aussieht. Der Nebel-Modus war deshalb seit jeher kaputt, bei grüner
Torkette.

Das Bildtor startet ein Gefecht, zieht die Maschine hoch und runter und sucht
den größten Helligkeitssprung zwischen benachbarten Zeilen im mittleren Band
(oben HUD, unten die Fähigkeitsknöpfe — deren feste Kanten haben mit dem Bild
nichts zu tun). Dann schaltet es die fünf Modifikator-Modi durch.

Zwei Dinge sind daran wichtig und beide teuer erkauft:

- **Die Grenze ist anteilig, nie absolut.** Auf GitHub misst dieselbe heile
  Szene deutlich höher als hier. Eine feste Schwelle hat dreimal die
  Hauptlinie rot gemacht. Bezug ist jetzt der Modus „Aus", zweimal gemessen.
- **Geurteilt wird über das Maximum, nicht den Median.** Der kaputte Nebel
  zeigt sich in genau einem von fünf Bildern — am oberen Anschlag.

## Balance ändern (zwei Wege)

1. **Visuell:** `Balance-Editor.html` im Browser öffnen → Regler →
   „balance.js kopieren" → als `src/balance.js` speichern → `npm run build`.
2. **Direkt:** Zahl in `src/balance.js` ändern → `npm run build`.

`balance.js` deckt ab: Spieler, Gegner allgemein, Schwierigkeit, HP+Score
aller 12 Gegner, Gadgets (CD+Kosten), Waffenkosten, **Kurve**
(waveBase/waveSlope …), **Upgrades**/**Panzerung** (max + Preise) sowie die
**Code-Optionen** `bossRush {every}`, `bossHp {mult}`, `corridorAll`,
`bossBeamAlways`.

Der Build spielt die Werte **anker-basiert** in `app.js` ein und **bricht ab**,
wenn er einen Anker nicht findet — statt still das Falsche zu bauen.

## Neue Variante

Datei `profiles/<Name>.js` anlegen (Format wie `src/balance.js`, optional
`export const META = { title, tag, accent, desc }`) → `npm run variants`.
Sie erscheint automatisch im Launcher.

## Datei-Landkarte

```
src/balance.js        ★ Kernwerte an EINER Stelle (bearbeiten)
src/app.js            der Spielcode (~2,8 MB, minifiziert-aber-lesbar)
src/modifier.js       optischer Level-Modifikator (Nacht/Sturm/…), gut lesbar
src/assets.js         AUTO-GENERIERT (71 Base64-Blobs) — NIE von Hand editieren

index.head.html       <head> UND Rumpfanfang: #game, #splash (Ladeschirm mit
                      Balken), #diag. Das Spiel kommt danach — deshalb ist der
                      Ladeschirm nach 287 ms da statt nach 5261 ms.
index.tail.html       nur noch </body></html>
.modopen              die <script type="module">-Startzeile

buildcore.mjs         gemeinsame Build-Logik (Patcher + Code-Transforms)
build.mjs             Einzeldatei
build-variants.mjs    alle Profile + Launcher
build-all.mjs         beides (--zip = verteilbares Paket)
pages.mjs             die Web-App (Bilder auslagern, Manifest, Startbilder, SW)
check.mjs             die Torkette
zip.mjs               reiner-Node ZIP-Writer

tools/boot.mjs        gemeinsamer Boot-Test (von check.mjs benutzt)
tools/bildtor.mjs     sieht das Spiel so aus, wie es soll?
tools/farbtor.mjs     drei Farbbänder: Gefahr, Eigenfeuer, Aufsammler
tools/formen.mjs      Silhouettenabstand der Gegnerprojektile
tools/untergrund.mjs  Kantenenergie der 13 Biome, misst die Funktion des Spiels
tools/feuerkraft.mjs  Feuerkraft-Leiter: Erreichbarkeit und Mechanik
tools/speicher.mjs    Texturspeicher im Gefecht
tools/rhythmus.mjs    Druckkurve und Vielfalt der 120 Sektoren
tools/farbproben.mjs  fünfzehn Gegenproben zu allen Toren
tools/schirme.mjs     jeden Bildschirm aufnehmen und nachmessen
tools/symbol.mjs      icon.svg -> App-Symbole + 11 iOS-Startbilder
tools/bilder.mjs      WebP-Bahnen neu codieren (q78)

web/icon.svg          QUELLE des Symbols, gegliedert in #grund/#maschine/#schleier
web/sw.js             Dienst-Arbeiter (Vorlage, __MARKE__/__BILDER__ werden ersetzt)
web/icon-*.png        gebacken, eingecheckt
web/start/            die elf Startbilder, gebacken, eingecheckt

profiles/*.js         je eine Variante
docs/                 Code-Landkarte · Werkzeugkette · Wiederherstellung
.github/workflows/    check.yml (jeder Push) · pages.yml (main -> Pages)
dist/                 Ergebnisse (nicht eingecheckt)
```

## Vier Fakten, die man kennen muss

- **Minifiziert:** Bezeichner sind kryptisch (`tt`, `pe`, `bt`). Werte und
  Texte sind lesbar; große Umbauten sind mühsam.
- **`intensity` im Stage-Array ist wirkungslos** — die echte Schwierigkeit
  steckt in der Wellen-Formel `tn` bzw. der `curve` in `balance.js`.
- **`src/assets.js` ist auto-generiert.** Nie von Hand anfassen; die Nummern
  im Array sind Positionen, die `app.js` direkt anspringt. Ein Eintrag darf
  geleert, aber nicht entfernt werden — sonst verschiebt sich jeder Verweis.
- **Der Layoutraum ist 540 × 960, der Puffer 1080 × 1920.** Die Kameras haben
  Zoom 2. Wer Bildschirmkoordinaten mit der Puffergröße vergleicht, liegt um
  Faktor zwei daneben — das ist einmal passiert und hat 300 Phantom-Befunde
  erzeugt. `getBounds()` liefert Layoutpunkte.

## Wie hier gearbeitet wird

Jede Zahl trägt ihre Messstelle mit: gemessen woran, in welcher Auflösung, in
welcher Umgebung. Und **wer eine Wirkung misst, schaltet sie zuerst ab** — eine
Prüfung ist erst dann eine, wenn die Zahl ohne die Sache messbar fällt. Jedes
Tor in diesem Projekt ist mit einem absichtlich eingebauten Fehler gegengeprobt
worden; steht das nicht in der Commit-Nachricht, ist es nicht passiert.

**Erst einchecken, dann gegenproben.** Die Gegenproben arbeiten mit
`git checkout` und löschen sonst die frische Arbeit.

## Weiterführend (im Ordner `docs/`)

- **docs/Code-Landkarte.md** — wo im `app.js` welche Stelle sitzt.
- **docs/Werkzeugkette.md** — Kurzüberblick der Werkzeuge.
- **docs/Wiederherstellung-und-Weiterbau.md** — wie `assets.js`/`app.js` aus
  einem Build neu gewonnen werden.
