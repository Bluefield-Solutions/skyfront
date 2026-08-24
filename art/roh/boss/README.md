# Bosse — Rohbilder, Stand v28

**Diese fünf Bilder sind noch NICHT im Spiel.** Sie liegen hier, weil die
Gestaltung stimmt und nichts davon verlorengehen soll — die Auflösung
stimmt aber nicht.

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
