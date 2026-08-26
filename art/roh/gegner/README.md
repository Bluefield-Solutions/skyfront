# Schwere Gegner — Rohbilder

Kein Boss, sondern der Gegner, der zwischendurch kommt: seltener als ein
Pulk, kleiner als ein Boss, und teuer genug, dass man ihn bemerkt.

## `gegner_lanzenwache.png` — die Begleitung des Lanzenträgers

| | gemessen | Soll |
|---|---:|---:|
| Blatt | 1024 × 1536 | — |
| Inhalt | 565 × 1481 | 225 × 590 |
| Seitenverhältnis | 0,38 | 0,38 |
| Detaildichte (Inhalt auf 650 px) | **0,1042** | mehr als 0,1025 |
| Licht oben links / unten rechts | **1,93** | grösser als 1 |
| durchsichtiger Rand | 230 / 24 / 229 / 31 | mindestens 6 |

`npm run bildpruefung` meldet keinen Befund.

**Woher die Zahlen kommen.** Die Breite ist gesetzt: 90 Weltpunkte im
Bild, also 180 im Puffer, mit dem Aufschlag von 1,25 sind es 225. Das ist
eine Entscheidung über die Größe im Spiel. Die Höhe folgt dem gelieferten
Bild — anders als beim Nurflügel gibt es hier keinen Grund, eine Tiefe
vorzuschreiben.

Die 1,93 sind die deutlichste Lichtrichtung aller bisherigen Bilder
(Sturmkanzel 1,58, Schwarmmutter 1,40). Sie passt zum Schattenversatz des
Spiels von (+7, +12).

**Warum kein Boss.** Als B-3 wäre das Bild mit 0,38 statt 0,65 um 41 %
daneben, und zwar in der Richtung, vor der der Auftrag ausdrücklich warnt:
zu schmal. Als schwerer Gegner ist genau das richtig — schmal und lang
liest sich auf dem Schirm anders als alles, was heute fliegt.

**Sie fliegt seit v34.** Textur 180 × 446 (`npm run einbau`, Platz 71 in
`assets.js`), im Bild 90 × 223 Weltpunkte, 100 Trefferpunkte, ab Sektor 4
bei 32 % des Sektors, ab Sektor 40 zwei. Sie schiesst `eb_lanze` — dasselbe
Geschoss wie der Lanzenträger, dessen Begleitung sie ist.

Auf dem Gerät sitzt sie mit **Faktor 1,00**: ein Texturpunkt ist ein
Bildpunkt. Das ist die einzige Grafik im Spiel, für die das gilt — alle
anderen Gegner werden zwischen 0,53× und 0,9× hochgerechnet.

Einzelheiten: `docs/AUDIT-2026-08.md`, SKY-232.
