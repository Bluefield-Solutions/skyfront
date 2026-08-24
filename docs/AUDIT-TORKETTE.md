# Audit: Ist die Torkette in dieser Form zielführend?

**Anlass:** die Kette erscheint bei jeder Änderung überdimensioniert. Frage:
lässt sie sich verschlanken, um mehr Geschwindigkeit und mehr entwickelte
Punkte zu bekommen?

**Methode:** gemessen, nicht geschätzt. Jedes Werkzeug einzeln gestoppt, die
CI-Historie ausgewertet, die roten Läufe auf ihre Ursache zurückverfolgt.
Wo ich eine Ursache nicht belegen konnte, steht es dabei.

**Messstelle:** dieser Rechner, 4 Kerne, Chromium unter SwiftShader (ohne
Grafikkarte). Die Verhältnisse übertragen sich, die absoluten Zahlen nicht.

---

## 1. Was es kostet

### Die Kette, Werkzeug für Werkzeug

| Werkzeug | Sekunden | Anteil |
|---|---:|---:|
| `build.mjs` | < 1 | — |
| `tools/version.mjs` | < 1 | — |
| `build-variants.mjs --boot` (11 Varianten) | 19 | 6 % |
| **`tools/bildtor.mjs`** | **174** | **58 %** |
| `tools/feuerkraft.mjs` | 34 | 11 % |
| `tools/speicher.mjs` | 19 | 6 % |
| `tools/formationen.mjs` | 17 | 6 % |
| `tools/farbtor.mjs` | 14 | 5 % |
| `tools/untergrund.mjs` | 13 | 4 % |
| `tools/formen.mjs` | 9 | 3 % |
| `tools/rhythmus.mjs` | 3 | 1 % |
| **Summe seriell** | **≈ 302** | |

**Ein Werkzeug frisst 58 % der Kette.**

### Die Gegenproben

25 Fehlerinjektionen + 2 Modusproben, Laufzeit **15 bis 30 Minuten**. Allein
die zwei Modusproben starten zweimal das Bildtor: 348 s, bevor eine einzige
Injektion gelaufen ist.

### Die Auslieferung

30 CI-Läufe, Median **325 s**, in Summe **253 Minuten** Rechenzeit.

### Was das je Änderung bedeutet

In dieser Sitzung typisch: Arbeit, dann Kette lokal (5 min), dann Gegenproben
(15–30 min, wenn ein Tor angefasst wurde), dann Push, dann CI abwarten
(5,5 min). **Die Prüfung dominiert die Arbeit**, oft im Verhältnis 2:1 oder
schlechter.

---

## 2. Was es einbringt

### Die roten Läufe

7 von 30 CI-Läufen waren nicht grün. Ursache belegt für vier:

| Lauf | Tor | Ursache |
|---|---|---|
| 18 | Bildtor | `snapshotArea antwortet nicht` — Umgebung |
| 27 (Wdh.) | Bildtor | Schnappschuss löst nicht aus — Umgebung |
| 28 | Bildtor | dieselbe Ursache |
| 31 | Bildtor | Ersatzweg erzeugte einen falschen Befund |

**Vier von vier belegbaren roten Läufen waren das Bildtor. Kein einziger war
ein Mangel am Spiel.** Läufe 12, 13 und 14 liegen innerhalb von 21 Minuten
während die Kette selbst gebaut wurde; ihre Ursache habe ich **nicht**
belegt.

### Das ist kein Urteil über den Wert der Tore

Sie haben reichlich gefunden — aber **beim Einbau**, nicht im Betrieb. Der
kaputte Nebel, die drei Gegnerkugeln mit weißem Mittelband, die tote
Vielfalt-Prüfung, die tote Wiederholungs-Prüfung, der erfundene
Querkanten-Befund: alle gefunden, als das jeweilige Tor entstand oder als
eine Gegenprobe zum ersten Mal fragte, *woran* es rot wird.

Das ist der entscheidende Unterschied: **die Tore sind beim Schreiben
wertvoll und im Wiederholen teuer.**

---

## 3. Fünf Befunde

**B1 — Das Bildtor kostet 58 % und hat nur die Umgebung gemeldet.**
Vier von vier belegbaren Ausfällen, keiner davon ein Spielfehler.

**B2 — Die Gegenproben prüfen die TORE, laufen aber bei jeder
SPIEL-Änderung.** Eine Änderung am Wellengenerator kann nicht beweisen oder
widerlegen, ob das Farbtor anschlägt. Das ist der größte Einzelposten und
bei reinen Spieländerungen ohne Aussage.

**B3 — Lokal und CI laufen dieselbe Kette.** Zweimal dieselbe Aussage,
zweimal bezahlt: ≈ 5 min lokal + ≈ 5,5 min CI je Änderung.

**B4 — Die Kette läuft seriell, obwohl die Tore unabhängige Prozesse sind.**
Gemessen: sieben Tore parallel **78–86 s** statt 109 s seriell, viermal
hintereinander grün. Auf 4 Kernen sind das nur 22 % — auf einem
CI-Läufer mit mehr Kernen mehr.

**B5 — Alles läuft bei jeder Änderung, obwohl die Tore sehr Verschiedenes
schützen.** Eine Änderung an der Wellenlogik kann das Farbtor nicht brechen;
eine an einer Projektilfarbe nicht den Rhythmus.

---

## 4. Vorschlag: drei Stufen statt einer Kette

### Stufe 1 — `npm run schnell`, bei jeder Änderung (49 s gemessen)

Bau · Version · Bootprüfung aller elf Varianten · und **parallel** Rhythmus,
Formentor, Untergrund, Farbtor.

Beantwortet: *Baut es? Startet es? Sind die Farbbänder und Silhouetten
intakt?* Das fängt alles, was ein Tippfehler oder eine verrutschte Konstante
anrichtet.

### Stufe 2 — `npm run check`, vor dem Push (≈ 90 s, gerechnet)

Stufe 1 **plus** Feuerkraft, Speicher, Formationen — parallel.
Ohne Bildtor.

### Stufe 3 — CI, unbeaufsichtigt (≈ 5 min)

Alles, inklusive Bildtor. Läuft ohnehin nach jedem Push und kostet **keine
Wartezeit**, wenn man nicht davorsitzt.

### Die Gegenproben: nur bei Toränderungen

`npm run proben` läuft, wenn `tools/` angefasst wurde — nicht, wenn nur
`src/app.js` sich geändert hat. Ein Wächter kann das erzwingen, statt es der
Disziplin zu überlassen.

---

## 5. Was das bringt

| | heute | Vorschlag |
|---|---:|---:|
| bei jeder Änderung, lokal | ≈ 302 s | **49 s** (gemessen) |
| vor dem Push, lokal | ≈ 302 s | ≈ 90 s |
| CI (unbeaufsichtigt) | ≈ 325 s | ≈ 325 s |
| Gegenproben je Spieländerung | 15–30 min | **0** |

**Die Rückmeldeschleife beim Arbeiten geht von fünf Minuten auf unter eine.**
Vorhergesagt hatte ich 40 s; gemessen sind es 49 — die vier Tore laufen
parallel langsamer als einzeln, weil sie sich vier Kerne teilen (Farbtor
14 → 29 s). Die Zahl steht so, wie sie gemessen ist.
Die Abdeckung vor der Auslieferung bleibt vollständig — sie verschiebt sich
nur dorthin, wo sie niemanden warten lässt.

---

### Gegengeprobt

Eine Runde, die nie rot wird, ist kein Beweis. `EIGEN` auf den Gefahrenwert
gesetzt: **rot nach 44 s**, mit den Befundzeilen direkt im Bild —
Prüfung A, F und H schlagen an.

---

## 6. Was ich NICHT empfehle

**Tore streichen.** Kein einziges ist nachweislich wertlos. Sie sind teuer im
*Wiederholen*, nicht falsch. Wer eines entfernt, verliert genau dann, wenn
er es braucht — und das ist selten und teuer.

**Das Bildtor billiger machen, indem man Stichproben reduziert.** Naheliegend
(5 Bilder je Modus → 3), aber die Empfindlichkeit ist nicht gemessen. Ohne
diese Messung wäre es eine Verschlechterung mit unbekanntem Preis — genau
die Sorte Änderung, die dieses Verzeichnis schon mehrfach teuer bezahlt hat.

**Die Gegenproben abschaffen.** Sie haben in dieser Sitzung zwei Prüfungen
als wirkungslos entlarvt, die vier Versionen lang grün gemeldet hatten. Sie
gehören nur an die richtige Stelle.

---

## 7. Offen

- Die Ursache der roten Läufe 12, 13 und 14 ist nicht belegt.
- Die Aufteilung der 174 s des Bildtors auf Menü- und Gefechtshälfte konnte
  ich nicht messen: Node puffert die Ausgabe, die Zeitstempel kamen alle am
  Ende an. Ohne diese Zahl ist nicht zu sagen, ob eine der beiden Hälften
  der eigentliche Kostentreiber ist.
- Ob die Parallelität auf dem CI-Läufer ebenso stabil ist, ist hier nicht zu
  prüfen — vier grüne Läufe auf 4 Kernen sind ein Anfang, kein Beweis.
