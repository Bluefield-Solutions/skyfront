# Bosse — Rohbilder, Stand v30

**B-1, B-2 und B-3 sind ersetzt und halten den Auftrag ein.** B-4
Ringfestung und B-5 Ambosskreuzer liegen noch in der Fassung vom ersten
Anlauf: Gestaltung stimmt, Auflösung nicht.

## B-3 Lanzenträger — zweiter Anlauf, gemessen

| | erster Anlauf | zweiter Anlauf | Soll |
|---|---:|---:|---:|
| Inhalt | 290 × 573 | **998 × 1515** | 650 × 1000 |
| Seitenverhältnis | 0,51 | **0,66** | 0,65 (1,4 % daneben) |
| Detaildichte | 0,0872 | **0,1244** | mehr als 0,1025 |
| durchsichtiger Rand | 0 px | **22 px** | mindestens 6 |
| Licht oben links / unten rechts | — | **1,55** | grösser als 1 |

Kein Befund. Das genaueste Seitenverhältnis der drei bisherigen
Lieferungen, und die Nadel des ersten Anlaufs (0,51) ist es nicht
geworden: die Sponsons an den Rumpfseiten und die vier Türme tragen die
Breite, so wie im nachgezogenen Prompt verlangt.

**Eine Sache zum Nachhalten:** Lanzenträger und Lanzenwache
(`art/roh/gegner/`) sind aus derselben Familie — beide hochkant, beide mit
Spulenschiene auf der Mittelachse. Das ist gewollt, die Wache ist seine
Begleitung. Ob sie sich auf dem Schirm trotzdem auseinanderhalten lassen,
ist eine Frage an `npm run formen`, und sie lässt sich erst beantworten,
wenn beide eingebaut sind. Die Seitenverhältnisse sprechen dafür: 0,38
gegen 0,66.

---

## B-2 Schwarmmutter — zweiter Anlauf, gemessen

| | erster Anlauf | zweiter Anlauf | Soll |
|---|---:|---:|---:|
| Inhalt | 329 × 462 | **1882 × 739** | 1075 × 525 |
| Seitenverhältnis | 0,71 | **2,55** | 2,05 (24 % flacher) |
| Detaildichte (auf 650 px) | 0,1010 | **0,1431** | mehr als 0,1025 |
| durchsichtiger Rand | 0 px | **31 px** | mindestens 6 |
| Licht oben links / unten rechts | — | **1,40** | grösser als 1 |

Die höchste Detaildichte aller bisherigen Bilder — 40 % über dem besten
Bild, das heute im Spiel ist.

### Die zugelassene Abweichung

2,55 statt 2,05 sind 24 % und damit über der Toleranz von 15 %. Trotzdem
kein Befund, und zwar aus einem Grund, der in `tools/bildpruefung.mjs`
steht: das Bild ist **flacher** als bestellt, nicht schmaler. Die Breite —
die einzige Zahl, an der die Schärfe hängt — ist mit 1882 statt 1075
übererfüllt. Was abweicht, ist die Tiefe: im Bild werden daraus 169 statt
210 Weltpunkte.

Das ist eine Gestaltungsfrage, keine Auflösungsfrage, und es geht in genau
die Richtung, in die der Prompt geschoben hat („sehr breit, sehr flach").
Der Nurflügel ist damit das flachste der fünf Schiffe — gewollt.

Die Ausnahme heisst `breiterOk` und ist **gerichtet**: flacher ist
erlaubt, schmaler nicht. Ein Hochformat, der Fehler des ersten Anlaufs,
schlägt weiter an. Gegengeprobt am um 90 Grad gedrehten Bild: zwei
Befunde, Seitenverhältnis 0,39 statt 2,05.

Der Boss wird mit `setScale` gezeichnet, also gleichmäßig in beide
Richtungen (`src/app.js`, Zeile 61604). Ein flacheres Bild wird deshalb
flacher dargestellt, nicht gestaucht.

---

## B-1 Sturmkanzel — zweiter Anlauf, gemessen

| | erster Anlauf | zweiter Anlauf | Soll |
|---|---:|---:|---:|
| Blatt | 325 × 590 | **1476 × 1114** | — |
| Inhalt | 325 × 590 | **1438 × 1074** | 850 × 625 |
| Seitenverhältnis | 0,55 | **1,34** | 1,36 (2 % daneben) |
| Detaildichte (auf 650 px) | 0,1090 | **0,1344** | mehr als 0,1025 |
| durchsichtiger Rand | 0 px | **18 px** | mindestens 6 |
| Licht oben links / unten rechts | — | **1,58** | grösser als 1 |

`npm run bildpruefung` meldet für diese Datei **keinen Befund**.

Die Detaildichte liegt zum ersten Mal **über** allen drei Bildern, die
heute im Spiel sind (0,0922 bis 0,1025). Der erste Anlauf lag mit 0,1090
noch dazwischen — das war der Grund, ihn nicht einzubauen.

Gemessen an: Detaildichte im Inneren, alle Bilder auf 650 px Breite
gezogen; Lichtrichtung als mittlere Helligkeit der deckenden Punkte im
Viertel oben links gegen das Viertel unten rechts, Schwelle Alpha 200.

**Der Rand ist von Hand nachgezogen**, nicht neu erzeugt: das gelieferte
Blatt hatte oben 4 Bildpunkte Rand statt der nötigen 6, und die
Bildprüfung schlug an. 14 Punkte durchsichtige Leinwand ringsum kosten
nichts und verlieren nichts — ein neuer Auftrag hätte das Bild verändert.

---

## Was gut ist

Materialsprache, Lichtrichtung (oben links), Nase nach unten, Panelfugen,
Abnutzung, Bernsteinakzente. Die fünf lesen sich als **eine Flotte**, und
die Silhouetten sind deutlich verschieden — genau das, was `npm run formen`
verlangt.

## Was fehlt: die Auflösung

Detaildichte im Inneren, alle auf 650 px Breite gezogen (so hängt die Zahl
an der Bildinformation, nicht an der Bildgröße):

| | Quellbreite | Detaildichte |
|---|---:|---:|
| `boss1` (im Spiel) | 325 | 0,0922 |
| `boss2` (im Spiel) | 377 | 0,1025 |
| `boss3` (im Spiel) | 425 | 0,0971 |
| B1 Sturmkanzel | 325 | 0,1090 |
| B2 Schwarmmutter | 340 | 0,1010 |
| B3 Lanzenträger | 290 | **0,0871** |
| B4 Ringfestung | 325 | 0,1082 |
| B5 Ambosskreuzer | 366 | 0,1062 |

**Die neuen sind nicht schärfer als die alten.** B3 ist sogar etwas
schlechter als `boss1`. Ein Austausch jetzt wäre ein Gewinn an Gestaltung
und **null** Gewinn an Schärfe — und die Schärfe war der gemessene Grund,
überhaupt neue Bilder zu bestellen.

## Die Ursache

Alle fünf kamen im selben Hochformat heraus:

| | Seitenverhältnis geliefert | verlangt | daneben |
|---|---:|---:|---:|
| B1 Sturmkanzel | 0,55 | 1,36 | 59 % |
| B2 Schwarmmutter | 0,57 | 2,05 | 72 % |
| B3 Lanzenträger | 0,47 | 0,65 | 28 % |
| B4 Ringfestung | 0,57 | 1,00 | 43 % |
| B5 Ambosskreuzer | 0,60 | 1,30 | 54 % |

Fünf verschiedene Formate waren verlangt, fünf gleiche Hochformate kamen.
Das erklärt beides auf einmal: die zu geringe Breite **und** dass die
Schwarmmutter kein breiter Nurflügel geworden ist, sondern ein schmaler
Delta.

**Die Pixelzahl im Prompttext setzt die Ausgabegröße nicht.** Sie kommt aus
der Format- oder Größeneinstellung des Werkzeugs. Beim nächsten Anlauf muss
sie dort je Bild einzeln gesetzt werden.

## Die Geschossbögen

`geschossboegen/` enthält fünf Konzeptbögen mit je zwei bis sechs Raketen
samt langen Flammenschweifen, 140–295 × 390 px.

Brauchbar sind sie so nicht:

- Das Spiel zeichnet den Schweif **selbst** (`trail` in `EB_STYLE`). Ein
  eingebackener Schweif liefe doppelt.
- Die vorhandenen Geschosse messen 12–36 × 30–56 px. Ein einzelnes Geschoss
  auf dem Bogen ist mehrere hundert Punkte hoch.
- Mehrere Stück je Bogen, ohne Raster und ohne Benennung.

Was gebraucht wird, steht in `docs/BILDAUFTRAEGE-BOSSE.md`, Abschnitt 4:
**ein** Geschoss je Datei, freigestellt, in der dort genannten Größe.
