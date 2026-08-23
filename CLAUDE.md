# Skyfront

Senkrecht scrollender Shmup, deutsch, Phaser 3. Aus dem ausgelieferten
Single-File-Build zurueckgewonnener, wieder baubarer Quellcode — kein
Original-TypeScript mehr, aber voll editier- und baubar.

**Diese Datei wird zu Beginn jeder Sitzung gelesen. Sie ist kurz gehalten, weil
eine lange Datei nicht gelesen wird. Alles Ausfuehrliche steht in `README.md`,
`HANDOVER.md` und `docs/`.**

**Das ist NICHT Towerfront.** Beide Projekte laufen in derselben Sitzung, und
ein Befund aus Towerfronts Doku ist hier schon einmal als Skyfront-Befund
gelandet (die „Infanterie mit 0,22 statt 0,35 Bildpunkten je Weltpunkt" — die
gibt es hier nicht, ebensowenig einen Genre-Abgleich). Wer eine Zahl nennt,
nennt die Datei, aus der sie stammt.

---

## Zwei Auslieferungen, ein Quellcode

|  | `dist/Skyfront.html` | `dist/pages/` |
|---|---|---|
| Was | eine Datei, alles inline | Web-App mit Nachbardateien |
| Groesse | 14,98 MB | index.html 2,93 MB + 68 Bilder (9,2 MB) + 11 Startbilder (2,2 MB) |
| Wofuer | weitergeben, Mail, USB | GitHub Pages, iPhone-Startbildschirm, offline |
| Befehl | `npm run build` | `npm run pages` |

Autark heisst autark: in der Einzeldatei sind alle 71 Bilder weiterhin
`data:`-Adressen. Das prueft der Bau selbst.

---

## Befehle

```
npm run check      die Torkette: bauen, alle zwoelf starten, Bildtor
                   ~2,5 min oertlich, ~4 min auf GitHub
npm run build      Einzeldatei
npm run pages      Web-App (Manifest, Symbol, Startbilder, Dienst-Arbeiter)
npm run bildtor    sieht das Spiel so aus, wie es soll?  (-- --bilder legt sie ab)
npm run schirme    zehn Schirme nachmessen: Rand, Ueberlappung, Schriftgroesse
npm run symbol     App-Symbol + 11 iOS-Startbilder aus web/icon.svg backen
npm run bilder     WebP-Bahnen neu codieren (q78)
npm run variants   alle Profile + Launcher
npm run package    verteilbares Skyfront-dist.zip
```

Die Torkette: `build` → `build-variants --boot` (elf Dateien) → `bildtor` →
Boot-Test des Masters → `dist/check-report.md`.

Zwei Workflows: `check.yml` bei jedem Push, `pages.yml` bei Push auf `main`.

---

## Eiserne Regeln

Jede hat mindestens eine Runde gekostet.

1. **Erst einchecken, dann gegenproben.** Die Gegenproben bauen absichtlich
   Fehler ein und stellen mit `git checkout` wieder her — sie loeschen sonst
   die frische Arbeit.
2. **Grenzen anteilig, nie absolut.** Eine feste Bildtor-Schwelle von 45 hat
   die Hauptlinie **drei Mal rot gemacht**: auf GitHub misst dieselbe heile
   Szene deutlich hoeher als hier (anderer Chromium, andere Rasterung). Bezug
   ist jetzt der Modus „Aus", zweimal gemessen. Die Schirmpruefung fiel
   **danach noch einmal** derselben Falle zum Opfer (Streuung 3 gesetzt,
   GitHub misst am heilen Menue 4,8); dort ist der Median der acht Schirme
   der Bezug. Wer hier eine Zahl hinschreibt, hat schon verloren.
   Ausnahme: eine Notgrenze fuer den Fall, dass ALLES kaputt ist und kein
   gesunder Bezug mehr existiert — weit weg von allem je Gemessenen.
3. **Phasers Schleife kann schlafen.** `renderer.snapshot*` loest den Rueckruf
   am Ende des naechsten Bildes ein. Steht die Schleife (verlorener Fokus auf
   einem CI-Laeufer), kommt nie eins, und der Aufruf haengt fuer immer. Vor
   jeder Aufnahme `loop.wake()`. Nachgestellt mit `loop.sleep()`: ohne Wecken
   haengt es, mit Wecken 922 ms.
4. **Eine Pruefung, die nie etwas meldet, ist kein Beweis.** Jedes Tor hier ist
   mit einem absichtlich eingebauten Fehler gegengeprobt. Steht das nicht in
   der Commit-Nachricht, ist es nicht passiert.
5. **Wer eine Wirkung misst, schaltet sie zuerst ab.** Das Bildtor misst „Aus"
   zweimal; der Abstand beider ist das Rauschen. Liegt kein Modus darueber,
   hat das Tor fuenf Mal dasselbe gemessen und nichts bezeugt — dann schlaegt
   es an.
6. **Jede Zahl traegt ihre Messstelle mit.** Gemessen woran, in welcher
   Aufloesung, in welcher Umgebung. Vier Fehlmessungen kosteten genau das:
   das Nebelloch am ganzen Bild statt im mittleren Band, der Nachlade-Verkehr
   inklusive meines eigenen Vorladens (9,2 MB behauptet, 702 KB gemessen), die
   Schriftgroesse am Puffer statt am Layoutraum (Faktor zwei), und ein
   Befund aus dem falschen Projekt.
7. **Der Layoutraum ist 540 x 960, der Puffer 1080 x 1920.** Die Kameras haben
   Zoom 2. `getBounds()` liefert Layoutpunkte. Wer sie mit `renderer.width`
   vergleicht, misst doppelt so gross — das erzeugte einmal 300
   Phantom-Befunde und machte die Randpruefung wirkungslos.
8. **Kein Tor ersetzt den Blick.** Die Torkette prueft, dass etwas
   funktioniert, nicht ob es gut aussieht. Der zu schwache HUD-Untergrund
   (Deckkraft 0,46 ueber heller Stadtkulisse) fiel bei keinem Tor auf,
   sondern beim Ansehen einer Aufnahme.
9. **`src/assets.js` ist auto-generiert.** Ein Eintrag darf **geleert**, aber
   nie **entfernt** werden — die Nummern sind Positionen, die `app.js` direkt
   anspringt.
10. **Schriftboden 13 Layoutpunkte** (9,4 Anzeigepunkte bei 390 px Breite).
   Darunter ist auf dem Telefon nichts mehr zu lesen. `npm run schirme`
   meldet jede Unterschreitung.
11. **`intensity` im Stage-Array ist wirkungslos.** Die echte Schwierigkeit
   steckt in der Wellen-Formel `tn` bzw. der `curve` in `balance.js`.

---

## Aufbau

```
src/balance.js     ★ Kernwerte an EINER Stelle (HP, Feuerrate, Kurve, Preise)
src/app.js         der Spielcode, ~2,8 MB, minifiziert-aber-lesbar
src/modifier.js    Level-Modifikator (Nacht/Sturm/Daemmerung/Nebel), lebende Schicht
src/assets.js      AUTO-GENERIERT, 71 Base64-Blobs

index.head.html    <head> UND Rumpfanfang (#game, #splash, #diag)
pages.mjs          baut die Web-App aus der fertigen Einzeldatei
tools/             boot · bildtor · schirme · symbol · bilder
web/icon.svg       ★ QUELLE des App-Symbols (#grund / #maschine / #schleier)
profiles/          je eine Spielvariante
```

Szenen: Boot · Menu · Options · Hangar · Workshop · Arsenal · Levels ·
Briefing · Loadout · Gear · Game · Pause.

Bezeichner sind minifiziert (`tt`, `pe`, `bt`, `J`=540, `rt`=960). Werte und
Texte sind lesbar; grosse Umbauten sind muehsam. Der Build spielt
`balance.js` **anker-basiert** ein und bricht ab, wenn er einen Anker nicht
findet — statt still das Falsche zu bauen.

---

## Stand

Einzeldatei 14,98 MB, Web-App auf GitHub Pages, auf dem iPhone-Startbildschirm
ablegbar, offline spielbar (68 von 68 Bildern im Speicher).

Zehn Schirme nachgemessen: 0 ueber den Rand, 0 unter 9 Anzeigepunkten, 0
Ueberlappungen. Bildtor prueft acht Menue-Schirme plus fuenf
Modifikator-Modi im Gefecht.

**Offen:**
- Der Modul-Schirm bleibt auch mit der neuen Tafel unter dem letzten Drittel
  leer, solange nichts erbeutet ist. Das ist ehrlich, aber nicht schoen.
- Die Sprites sind nachgemessen und in Ordnung (33 Texturen, alle ≥ 0,92
  Schaerfe ausser dem erzeugten `spark`-Partikel — der ist Bauart, kein
  Mangel). Hier ist nichts zu holen.
- Das Bildtor kostet auf GitHub rund drei Minuten. Weiter runter ginge nur
  ueber weniger Modi oder weniger Bilder — beides kostet Empfindlichkeit.

---

## Was der Nutzer erwartet

- Deutsch, auch im Quelltext (Kommentare, Bezeichner, Ausgaben) und in
  Commit-Nachrichten.
- **Nach jeder Runde: vier naechste Schritte, sortiert, davon mindestens
  einer technisch und einer grafisch.** Grafik ist ihm wichtig.
- Getestet wird auf dem **iPhone hochkant**, 390 px breit. Das ist das
  Zielgeraet, nicht der Schreibtisch.
- Gepusht wird auf `main`; die Web-App aktualisiert sich danach von selbst.
