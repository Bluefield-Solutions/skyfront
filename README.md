# Skyfront – rekonstruierter Quellcode

Dieses Projekt ist der aus dem ausgelieferten Single-File-Build
(`Skyfront.html`) **zurückgewonnene, wieder baubare Quellcode**.
Es ist kein Original-TypeScript-Projekt mehr, sondern der entpackte,
lesbar formatierte JavaScript-Stand des Builds – aber: **man kann ihn
bearbeiten und wieder zu einer autarken HTML-Datei zusammenbauen.**

## Schnellstart (nach einer Pause in 30 Sekunden wieder drin)

Voraussetzung: Node.js (v18+). Keine npm-Installation nötig.

| Ich will … | Befehl / Datei |
|---|---|
| **Master bauen** | `node build.mjs` → `dist/Skyfront.html` |
| **Alle Varianten + Launcher** | `node build-variants.mjs` → `dist/Skyfront-*.html` + `dist/index.html` |
| **Beides auf einmal** | `node build-all.mjs` |
| **Verteilbares Paket** | `node build-all.mjs --zip` → `Skyfront-dist.zip` (Launcher + alle Varianten) |
| **Nur Master (klein)** | `node build-all.mjs --zip=master` → `Skyfront-master.zip` (~16 MB, eine Datei) |
| **Paket mit Qualitäts-Gate** | `node build-all.mjs --zip --boot` → Zip nur, wenn jede Variante fehlerfrei startet (braucht Playwright) |
| **CI-Check (nur prüfen)** | `node check.mjs` → baut + bootet, Exit-Code + `dist/check-report.md` (Markdown-Tabelle, z. B. für PR-Kommentar) |
| **Balance visuell einstellen** | `Skyfront-Balance-Editor.html` im Browser öffnen → Werte schieben → `balance.js` exportieren |
| **Balance im Code ändern** | Zahl in `src/balance.js` ändern, dann `node build.mjs` |
| **Neue Variante** | Profil in `profiles/<Name>.js` ablegen (Format wie `balance.js`, optional `export const META`), dann `node build-variants.mjs` |
| **Tiefer im Spielcode** | `src/app.js` – Orientierung: `Skyfront-Code-Landkarte.md` |

Merksätze: `intensity` im Stage-Array ist **wirkungslos** (die echte
Schwierigkeit steckt in der Wellen-Formel `tn` bzw. `curve` in `balance.js`);
`src/assets.js` ist **auto-generiert**, nie von Hand editieren; jeder Build ist
**autark** (0 externe Referenzen).

## Ordnerstruktur

```
project/
├─ src/
│  ├─ balance.js    ← ★ Kernwerte an EINER Stelle (HP, Feuerrate, Schwierigkeit …)
│  ├─ app.js        ← DER Spielcode (bearbeiten!)  ~2,8 MB, ~65k Zeilen
│  ├─ modifier.js   ← Level-Modifikator (Nacht/Sturm/…), fest eingebaut, gut lesbar
│  └─ assets.js     ← AUTO-GENERIERT, nicht editieren (71 Base64-Assets)
├─ index.head.html  ← HTML-Kopf vor dem Script (Doctype, <head>, Canvas)
├─ index.tail.html  ← HTML-Ende nach dem Script (</body></html>)
├─ .modopen         ← die <script type="module">-Startzeile
├─ buildcore.mjs    ← gemeinsame Build-Logik (von beiden Skripten genutzt)
├─ build.mjs        ← Einzel-Build (src/balance.js → Skyfront.html)
├─ build-variants.mjs ← Batch-Build (profiles/*.js → mehrere Skyfront-<Name>.html + Launcher)
├─ build-all.mjs    ← baut Master + alle Varianten (--zip = verteilbares Paket)
├─ check.mjs        ← CI-Check: baut + bootet + Exit-Code (kein Paket)
├─ zip.mjs          ← reiner-Node ZIP-Writer (für --zip, keine npm-Abhängigkeit)
├─ profiles/        ← ein Profil je Variante (Format wie src/balance.js)
│  ├─ Master.js · Arcade.js · Hardcore.js
└─ dist/
   └─ Skyfront.html, Skyfront-Master.html, Skyfront-Arcade.html … (Ergebnisse)
```

## Bauen

Voraussetzung: Node.js (getestet mit v18+). Keine npm-Installation nötig,
`build.mjs` nutzt nur die Node-Standardbibliothek.

```bash
node build.mjs
```

Erzeugt `dist/Skyfront.html` – eine einzelne, komplett eigenständige Datei
(0 externe Referenzen, alle Assets inline als Base64). Genau wie der Master.

### Mehrere Varianten auf einmal (Batch)

```bash
node build-variants.mjs
```

Baut aus **jedem** `profiles/<Name>.js` eine fertige `dist/Skyfront-<Name>.html`.
Die großen Assets werden dabei nur EINMAL geladen, das ist deutlich schneller
als jede Variante einzeln zu bauen. Der ZIP-Writer nutzt die höchste DEFLATE-Stufe;
weil die eingebetteten Assets (Base64 von bereits komprimierten Bildern/Tönen) kaum
weiter schrumpfen, ist der eigentliche Größen-Hebel `--zip=master` (nur eine Datei). Eine neue Variante = eine neue Datei in
`profiles/` (Format wie `src/balance.js`, am einfachsten aus der Balancing-
Konsole exportieren). Beispiel-Ausgabe:

```
Baue 3 Variante(n) aus profiles/ …
  ✓ dist/Skyfront-Arcade.html   (24.18 MB · 38 Werte geändert)
  ✓ dist/Skyfront-Hardcore.html (24.18 MB · 24 Werte geändert)
  ✓ dist/Skyfront-Master.html   (24.18 MB · 19 Werte geändert)
Fertig: 3/3 Variante(n) in dist/.
```

Schlägt ein Profil fehl (z. B. Tippfehler), meldet das Skript die Datei mit
`✗` und baut die übrigen trotzdem fertig.

Jede Variante wird **strukturell geprüft** (vollständig & autark) und trägt im
Launcher „✓ Struktur geprüft". Optionaler **echter Boot-Test**:

```bash
node build-variants.mjs --boot
```

startet jede Variante headless (nur wenn **Playwright** installiert ist:
`npm i playwright`) und macht aus „Struktur geprüft" ein „✓ gestartet". Fehlt
Playwright, bleibt es ohne Fehler bei der Struktur-Prüfung.

**Qualitäts-Gate:** Kombiniert mit dem Paket-Bau (`node build-all.mjs --zip --boot`)
wird das `Skyfront-dist.zip` **nur geschrieben, wenn zuvor jede Variante headless
fehlerfrei gestartet ist**. Bootet eine nicht (oder schlägt ein Build fehl), bricht
der Lauf mit Fehlermeldung ab und es entsteht kein Paket — so verlässt nie ein
kaputter Build das Haus. Ohne installiertes Playwright kann das Gate nicht prüfen
und der Bau läuft (mit Struktur-Prüfung) normal durch.

Lief der Boot-Test, schreibt er zusätzlich `dist/boot-report.txt` (welche Variante
mit wie vielen Fehlern startete) — und legt ihn dem Release-Paket bei.

### CI (GitHub Actions)

`.github/workflows/check.yml` ist ein fertiger Workflow: bei jedem Push/PR
installiert er Node + Playwright, führt `node check.mjs` aus und hängt den
Markdown-Bericht (`dist/check-report.md`) an die Job-Zusammenfassung. Wird der
Check rot, ist der Build/Boot nicht sauber. Voraussetzung: die Projektdateien
liegen im Repo-Wurzelverzeichnis (sonst `working-directory` in der YAML anpassen).

Zusätzlich schreibt der Batch ein **Launcher-Menü** `dist/index.html`, das alle
gebauten Varianten mit Namen, Kurzbeschreibung und „Spielen"-Link auflistet —
`dist/index.html` öffnen und direkt losfliegen. Die Beschreibung/Farbe je Karte
kommt aus einem optionalen `export const META = { title, tag, accent, desc }`
im jeweiligen Profil (fehlt es, wird der Dateiname genommen).

## Balance einstellen ohne Code-Suche (src/balance.js)

`src/balance.js` sammelt die **wichtigsten Spielwerte an einer Stelle** –
Spieler (HP, Feuertakt, Bomben …), Gegner allgemein (Schaden, Kugeltempo), die
Schwierigkeits-Multiplikatoren, **HP und Score aller 12 Gegnertypen**, die
**Gadget-Cooldowns und -Freischaltkosten** (EMP, Schild, Napalm, Drohnen,
Reparatur, Blitz), die **Waffen-Freischaltkosten**, die **Schwierigkeits-Kurve**
sowie die **Spieler-Upgrade-Preise und -Obergrenzen** (`upgrades`: Feuerkraft/
Hülle/Bombe/Wingman) und die **Panzerungs-Preise und -Obergrenzen** (`armor`:
Front/Heck/Flügel/Kern). Optional zusätzlich `bossRush: { every: N }` (Code-Ebene):
`every: 1` setzt auf **jedem** Level einen Boss, `2` auf jedem zweiten usw. Weitere
Code-Ebene-Optionen: `bossHp: { mult: 1.5 }` macht Bosse zäher (Basis-HP 260 × mult),
`corridorAll: true` erzwingt den engen Korridor-Modus auf allen Leveln, und
`bossBeamAlways: true` lässt Bosse ihren Dauer-Laser immer feuern (unabhängig vom
Grad). Ohne die jeweiligen Blöcke bleibt alles normal. Die Zahlen dort sind die **aktuellen Werte**;
baust du ohne Änderung, kommt exakt dasselbe Spiel heraus.

Ablauf: Zahl in `balance.js` ändern → `node build.mjs`. Der Build spielt die
Werte **gezielt in `app.js` ein** (anker-basiert, nicht global) und meldet
jede Änderung als `alt -> neu`. Nur wirklich geänderte Werte werden ersetzt;
findet der Build einen Anker nicht, **bricht er mit Fehler ab** (statt still
das Falsche zu bauen).

```
$ node build.mjs
  balance: player.maxHp  100 -> 250
  balance: enemyHp.grunt  3 -> 9
dist/Skyfront.html geschrieben: 24.18 MB +Modifikator (2 Balance-Werte geändert)
```

Für alles jenseits dieser Kernwerte editierst du weiter direkt in `app.js`
(siehe Code-Landkarte). `balance.js` löschen = Build ohne Overlay, nur die
Werte aus `app.js`.

## Was ist bearbeitbar – und was nicht

**Bearbeitbar:** `src/app.js` ist der komplette Spiel- + Phaser-Code,
schön formatiert (js-beautify). Werte, Balance, Logik, Text – alles lässt
sich hier ändern. Danach `node build.mjs` → neue HTML.

**Ehrliche Einschränkung:** Der Build war *minifiziert*. Das heißt:
- Bezeichner sind **kryptisch** (`tt`, `et`, `a`, `n` …) – die
  ursprünglichen sprechenden Namen sind technisch **nicht** wiederherstellbar.
- Kommentare aus dem Original sind weg.
- Der eingebaute Phaser-Kern liegt mit im `app.js` (das ist normal für den
  Single-File-Build und stört das Bauen nicht).

Für kleine, gezielte Änderungen (Zahlenwerte, Texte, einzelne Funktionen)
ist das gut handhabbar. Für große Umbauten bleibt der **Modifikator-Layer**
(siehe Projekt-Doku `Skyfront-Modifikator.js`) der robustere Weg, weil er
nur stabile Phaser-APIs benutzt und minifizierungssicher ist.

## Der Level-Modifikator (src/modifier.js)

Der Modifikator ist jetzt **fest ins Projekt eingebaut** – kein Injizieren in
die fertige HTML mehr nötig. `build.mjs` hängt ihn automatisch als klassisches
`<script>` hinter das Spielmodul (er braucht nur `window.__game`, das `app.js`
global bereitstellt).

Er ist bewusst klein und lesbar gehalten – das ist die Datei, in der die
optischen Stimmungen live weiterentwickelt werden:
- Modi: Aus · 🎚 Auto · 🎲 Zufall · 🌙 Nacht · ⛈ Sturm · 🌅 Dämmerung · 🌫 Nebel
- Im Spiel umschalten: Taste **N** (Modus) und **M** (Zweit-Einstellung) oder
  die zwei Knöpfe unten links.
- **Auto** wählt die Stimmung automatisch aus dem Biom, **Zufall** pro Level.

Modifikator abschalten: `src/modifier.js` löschen (oder umbenennen) und neu
bauen – `build.mjs` lässt ihn dann einfach weg.

## Hinweis zu assets.js

`assets.js` wird beim Zerlegen automatisch erzeugt: Alle langen
`data:...;base64,...`-Blobs aus dem Build wurden in das Array `__SKFA[]`
ausgelagert, damit `app.js` klein und editierbar bleibt. In `app.js` stehen
an diesen Stellen `__SKFA[0]`, `__SKFA[1]` … Diese Datei **nicht** von Hand
bearbeiten – sie enthält nur die Rohdaten (Bilder/Audio) und keine Logik.
