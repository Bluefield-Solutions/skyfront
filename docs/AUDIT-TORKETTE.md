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

### Stufe 2 — `npm run check`, vor dem Push (**127 s gemessen**)

Alle acht Tore **ohne** das Bildtor, dazu Bau, Version und der Boot-Test
aller elf Varianten. Vorhergesagt hatte ich 90 s; gemessen sind es 127.
Die Zahl steht so, wie sie gemessen ist.

### Stufe 3 — `npm run torkette` / CI, unbeaufsichtigt (**291–293 s, drei Läufe**)

Alles, inklusive Bildtor, und **streng**: dort zählt „nicht gemessen" als
Fehlschlag. Läuft ohnehin nach jedem Push und kostet **keine Wartezeit**,
wenn man nicht davorsitzt.

### Die Gegenproben: nur bei Toränderungen

`npm run proben` läuft, wenn `tools/` angefasst wurde — nicht, wenn nur
`src/app.js` sich geändert hat. Ein Wächter kann das erzwingen, statt es der
Disziplin zu überlassen.

---

## 5. Was das bringt

| | heute | Vorschlag |
|---|---:|---:|
| bei jeder Änderung, lokal | ≈ 302 s | **48 s** |
| vor dem Push, lokal | ≈ 302 s | **127 s** |
| CI (unbeaufsichtigt) | ≈ 325 s | ≈ 325 s + Gegenproben daneben |
| Gegenproben je Spieländerung | 15–30 min | **0** |

Alle vier Zahlen der rechten Spalte sind gemessen, nicht gerechnet.

**Die Rückmeldeschleife beim Arbeiten geht von fünf Minuten auf unter eine.**
Vorhergesagt hatte ich 40 s; gemessen sind es 48 — die vier Tore laufen
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
  **Nachgetragen (v20): geprüft, und es hält.** Siehe Abschnitt 9.

---

## 8. Nachtrag v19 — umgesetzt und gegengeprobt

Der Vorschlag aus Abschnitt 4 ist gebaut. Was dabei zusätzlich gefunden
wurde, steht hier, weil es die Sorte Befund ist, die dieses Verzeichnis
teuer bezahlt hat: **Prüfungen, die nichts prüfen konnten.**

### Der dritte Ausgang

Sechs Tore kannten nur zwei Ausgänge, 0 und 1. Was dazwischen liegt — *der
Apparat hat gar keine Zahl geliefert* — landete je nach Tor auf der falschen
Seite, und zwar in **beide** Richtungen:

| Tor | was es meldete | was es ist |
|---|---|---|
| Formentor | „Textur für elite nicht gefunden" als **Befund** | ein Tor, das zu früh gemessen hat |
| Untergrund | neun von dreizehn Biomen, dann **GRÜN** | vier Biome unbeurteilt |
| Speicher | „nur N Texturen" als **Befund** | eine Messung, keine Aussage über das Spiel |
| Formationen | hängende Zeitereignisse als **Befund** | halb gestellte Bausteine |
| Rhythmus / Feuerkraft | fehlende Naht als **Befund** | die Prüfnaht ist weg, nicht das Spiel |

Beide Richtungen sind dieselbe Lücke. Ein Tor, das nichts geprüft hat, darf
weder aussehen wie eines, das bestanden hat, noch wie eines, das etwas
gefunden hat. `tools/messstelle.mjs` hält jetzt alle drei Ausgänge, und
jedes der sechs Tore nimmt sie.

### Zwei Befunde an den eigenen Toren

**Die Speicher-Grenze konnte nie fallen.** Sie verlangte weniger als 100
Texturen. Nachgemessen: im Menü 119, im Gefecht 125, und nur im allerersten
Augenblick nach `window.__game` waren es 99. Eine Grenze, die einen Wert von
99 fordert, wo der kleinste je beobachtete 119 ist, meldet nie etwas.
Ersetzt durch die Frage, auf die es ankommt: *ändert sich der Bestand noch?*

**Und deren erste Fassung war zu scharf.** Sie zählte Phasers Kachelpuffer
mit, und die schwanken im Gefecht von Bild zu Bild: 141, eine halbe Sekunde
später 139, bei unveränderten 63,0 MB. Der erste strenge Lauf meldete
deshalb „nicht gemessen" auf einem vollkommen gesunden Stand. Gezählt wird
jetzt der Bestand, den der Code lädt — 109, zweimal gleich.

### Die Gegenproben

`--ohne-naht` nimmt jedem Tor die Messstelle weg, an der es hängt. Das ist
kein nachgestellter Zustand, sondern derselbe, den ein zu früh oder auf
einem klemmenden Läufer messendes Tor antrifft.

Acht Modusproben, **alle acht greifen**, 230 s (ohne die zwei
Bildtor-Proben 41 s). Der strenge Zweig ist in beide Richtungen belegt:
`--nur=rhythmus --ohne-naht` ist **rot mit `--streng`** und **grün ohne**.

Dabei fiel ein Fehler auf, der ohne die Gegenprobe stehen geblieben wäre:
der Bericht schrieb „✅ bestanden", während der Lauf mit Rückgabe 1 endete.
Das Urteil wurde vor der Buchung gefällt.

### Was noch offen blieb

- Die 25 Fehlerinjektionen laufen weiterhin **nicht** in der CI — sie
  brauchen Neubauten. `npm run wache` sagt an, wann sie fällig sind.
- „Kommt nicht ins Gefecht" bleibt in allen Toren ein **Befund** und wurde
  bewusst *nicht* herabgestuft, obwohl es unter SwiftShader auch ein
  Zeitablauf sein kann. „Alle Tore grün, aber man kommt nicht ins Spiel" ist
  die teuerste Sorte Fehler, die es hier gibt.
- Ob die Parallelität auf dem CI-Läufer ebenso stabil ist, ist hier nicht zu
  prüfen.


---

## 9. Nachtrag v20 — auf dem CI-Läufer nachgemessen

Der zweite Job ist zweimal gelaufen (Läufe 39 und 40). Beide grün.

| | Dauer |
|---|---:|
| Job `check` (alles, streng) | 449 s, davon 410 s im Check-Schritt |
| Job `proben` (8 Modusproben) | **265 s, parallel** |
| Lauf insgesamt | 452 s |

**Der Gegenproben-Job liegt vollständig im Fenster des Checks.** Vorhergesagt
hatte ich 230 s für die Modusproben; auf dem Läufer sind es 227 s. Die
Parallelität kostet keine Wartezeit — das war die Behauptung, und sie hält.

### Eine Zahl aus Abschnitt 1 hält nicht

Dort steht „30 CI-Läufe, Median **325 s**". Nachgezählt an den Läufen, die
sich jetzt auslesen lassen (13 Läufe vor der Stufung):

**Median 443 s, Spanne 281 bis 463 s.**

Die Verteilung ist zweigipflig — sieben Läufe zwischen 443 und 463 s, drei
zwischen 281 und 351 s. Woher die 325 kamen, kann ich nicht mehr belegen;
möglicherweise habe ich Job- statt Laufdauer gemessen. **Die Zahl in
Abschnitt 1 ist damit nicht mehr zu halten**, und sie bleibt hier stehen,
statt still ausgetauscht zu werden.

Für die Aussage des Audits ändert das nichts — im Gegenteil: wenn die CI
443 s statt 325 s braucht, ist der Grund, sie unbeaufsichtigt laufen zu
lassen, stärker, nicht schwächer.

### Und was sie NICHT sagt

Die Stufung hat die CI nicht verlangsamt: 455 und 452 s liegen mitten in der
Spanne von vorher (281–463 s). Zwei Läufe sind aber kein Beweis für
Stabilität, sondern nur die Abwesenheit eines groben Fehlers.
