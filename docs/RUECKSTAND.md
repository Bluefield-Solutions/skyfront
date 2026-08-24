# Rückstand — was offen ist, und woran das geprüft wurde

**Dieses Dokument ist die einzige Stelle, an der der Stand steht.**
`docs/AUDIT-2026-08.md` ist das Archiv: 4.700 Zeilen mit den Befunden und
allem, was seither gemessen wurde. Wer wissen will, *was als Nächstes*,
liest hier.

**Geprüft ist am Code, nicht am Dokument.** Ein Audit sagt, was jemand
einmal gefunden hat; ob es noch gilt, sagt nur die Quelle. Wo unten „✅"
steht, ist im Quelltext nachgesehen worden und die Stelle ist genannt.

Stand: v24.

---

## 1. Die zehn großen Befunde

| | Befund | Typ · P | Stand | woran geprüft |
|---|---|---|---|---|
| **B1** | Kernloop ohne Belohnung im Gefecht | DESIGN · P0 | ✅ | `pwrProPunkt`, `powerLevel` wächst; `tools/feuerkraft.mjs` über 120 Sektoren |
| **B2** | Level generiert statt gestaltet | VERIFIED · P0 | ✅ | `Bausteine[]` mit `druck`/`teile`; `tools/rhythmus.mjs`, `tools/formationen.mjs` |
| **B3** | Gegnerkugeln nicht als Gefahr lesbar | VERIFIED · P0 | ✅ | `GEFAHR = "#ff3a2a"`; `tools/farbtor.mjs`, 17 Projektile |
| **B4** | Kein Weg, Balance zu messen | MISSING · P0 | ⚠️ halb | Feuerkraft und Rhythmus rechnen 120 Sektoren durch — **aber keine Telemetrie** (0 Treffer im Quelltext) |
| **B5** | Bildratenabhängige Bewegung | VERIFIED · P1 | ✅ | `ZF = Clamp(delta,8,50)/16.667`, durchgängig angewandt |
| **B6** | Ton widerspricht der Zielrichtung | DESIGN · P1 | ❌ **offen** | kein Beleg für eine neue Klangidentität |
| **B7** | Drei Bosse für 120 Level | DESIGN · P1 | ❌ **offen** | keine modularen Bosse gefunden; die `kind:`-Einträge sind Kulissen je Biom |
| **B8** | Messung kann Ruckler nicht sehen | VERIFIED · P1 | ✅ | `echteBildzeit`, `rawDelta`, Messtafel mit p50/p95/längster Lücke |
| **B9** | Stille Fehlerzustände | VERIFIED · P2 | ❌ **offen** | keine Zähler, kein Logging gefunden |
| **B10** | Minifizierter Quelltext | DESIGN · P2 | ❌ **offen** | unverändert 3,0 MB |

**Sieben von zehn P0/P1-Befunden sind zu**, darunter alle drei P0-Befunde,
die das Spielgefühl tragen.

---

## 2. Priorisiert — was den größten Nutzen bringt

### 1. B7 · Bosse aus Teilen
Der Boss ist der einzige *gestaltete* Moment im Spiel und wiederholt sich
alle drei bis vier Level identisch, nur mit anderer Färbung und mehr HP.
Nach B1/B2/B3 der größte verbliebene Hebel auf „will ich weiterspielen".
**Braucht keine neuen Bilder**, wenn die Bosse aus vorhandenen Teilen
zusammengesetzt werden.

### 2. B6 · Klangidentität
Läuft in jeder Sekunde mit. Kein Asset ist teurer zu ersetzen, je später es
kommt — es hängt an jedem Ereignis im Spiel.

### 3. Die drei weichen Bilder — **blockiert**
`elite` 216 px, `carrier` 295 px, `rotor` 135 px Quellbreite. Der Formentor
druckt die Anforderung bei jedem Lauf mit und hält mit `BILDBODEN` die
heutigen Breiten fest, damit es nicht schlechter wird.

**Vier Wege, es im Code zu lösen, sind gemessen:**

| Weg | Ergebnis |
|---|---|
| Schärfemaske (v16b) | verworfen — hebt in Flächen wie an Kanten (+9,4 % gegen +9,6 %) |
| steilere Deckkraft-Rampe (v19b) | verworfen — wirkt bei 1,3×, bei 2,7× gar nicht |
| Saum in Anzeigeauflösung (v19b) | verworfen — +1,1 %, also Rauschen |
| gerichtetes Kantenlicht (v21) | **eingebaut** — fügt Form hinzu, ersetzt aber keine Auflösung |

Skyfront hat keinen Rohbildvorrat. Höher aufgelöste Fassungen müssen von
außen kommen.

### 4. Die Gerätemessung — **erste Zahl da, die entscheidende fehlt**

Vom iPhone (iOS 18.7, Safari 26.6, 393×852@3x, Puffer 1080×1920):

| | |
|---|---|
| Bildrate | **58,8/s** — das Gerät läuft mit 60 Hz |
| Bildzeit | p50 **17,0 ms**, p95 **23,0 ms** |
| Phaser | geglättet 16,3 / roh 17,0 — hier verbirgt die Glättung nichts |
| längste Lücke | 7295 ms — **mit hoher Wahrscheinlichkeit die App im Hintergrund**, nicht das Spiel |

**Gemessen im Menü.** Über das Gefecht sagt sie nichts. Seit v24 fängt die
Tafel beim Betreten des Gefechts von vorn an und bucht Pausen getrennt.

Offen bleibt: 90,3 s auf 4596 Bilder sind 50,9/s im Mittel gegen 58,8 aus
dem Median — auch ohne die Pause 55,4. Es gab langsame Strecken, die der
Median nicht zeigt. Und p95 23,0 ms heißt, jedes zwanzigste Bild reißt das
Budget — **im Menü.**

### 4b. Die Messung im Gefecht — **braucht den Nutzer**
Alle Leistungszahlen hier entstehen unter SwiftShader, also **ohne
Grafikkarte**. Der JavaScript-Anteil überträgt auf ein Telefon, Rastern und
Zusammensetzen nicht.

Auf dem iPhone: Seite laden → **Spielen** → 📊 rechts oben → die Zeile
`SKYFRONT-MESSUNG v24 …` kopieren. Die Tafel sagt selbst, wann sie reif ist
(„noch zu wenig gemessen — N von 60").

### 5. Lesbarkeit auf hellen Biomen — **neu, v21**
Die Polarität kippt zwischen den Biomen. Mittlere Helligkeit in
Anzeigegröße, über dem *beruhigten* Grund gemessen:

| Grund | Sprite | Grund | Abstand |
|---|---:|---:|---:|
| Stadt (dunkel) | 101–113 | 30 | **+66 … +82** |
| Wüste | 100–114 | 118–120 | −5 … −21 |
| Frost | 99–114 | 132–134 | **−19 … −34** |
| Schnee | 100–115 | 127–129 | −14 … −29 |

Auf der Stadt ist der Flieger ein **helles** Ding auf dunklem Grund, auf
Frost ein **dunkles** auf hellem — und der Abstand ist nur ein Drittel so
groß. Das Kantenlicht ist daran unschuldig: mit und ohne unterscheiden sich
Spitze und dunkelste Stelle um höchstens 7 Einheiten. Der Befund ist älter
als das Licht.

Richtung, noch nicht gemessen: auf hellen Biomen müsste der **dunkle Saum**
mehr tragen, nicht ein helles Streiflicht.

### 6. B4 · Telemetrie
Solange nichts vom Gerät zurückkommt, bleibt jede Zahl in `balance.js`
geraten — bei 120 Leveln × 3 Graden × 5 Flugzeugen × 4 Waffen nicht mehr
durch Spielen zu prüfen.

### 7. SKY-081 · Onboarding durch Spielen
Vorhanden ist ein Hinweistext („Ziehen zum Fliegen · Auto-Feuer · Bombe").
Steht als MUST-HAVE und ist nicht gebaut.

### 8. B9 · Stille Fehlerzustände
Erschöpfte Pools verwerfen ohne Meldung. Kostet erst, wenn im Feld etwas
schiefgeht — und dann viel.

### 9. SKY-060 Levelabschnitte · 10. B10 Erblast
Beides teuer, ohne unmittelbaren Gewinn.

---

## 3. Die Ticketnummern

**Es gibt zwei Ticketquellen im Audit**, und die Nachträge haben an beiden
vorbei weitergezählt:

- **Teil Y** — eine Tabelle mit 55 Nummern (SKY-001 bis SKY-152)
- **Teil Z** — zehn ausformulierte Tickets

Neun Nummern bezeichnen dadurch **zwei verschiedene Dinge**:

| Nummer | im Register | im Nachtrag |
|---|---|---|
| SKY-031 | Schlachtträger stößt keine Gegner aus | Formationentafel (v9) |
| SKY-032 | Bomber und Kanonenboot zahlenverschieden | zwei tote Prüfungen (v9b) |
| SKY-041 | Verbindliches Größensystem | Messtafel (v15) |
| SKY-042 | Kein Auflösungsstandard | die Kolonne (v16) |
| SKY-043 | Begleitflieger sind Spielerkopien | B1 geschärft (v16b) |
| SKY-044 | Keine Art Bible | Kennleuchten auf hellen Biomen (v17) |
| SKY-050 | Modulare Bosse | Bildboden im Formentor (v19b) |
| SKY-051 | Kein sichtbarer Schadenszustand | App-Symbol (v20) |
| SKY-052 | Kein Boss-Intro | Kantenlicht und Ladeschirm (v21) |

**Nicht umnummeriert.** Die Überschriften stehen in Commits und Dokumenten;
sie zu ändern hieße, Verweise ins Leere laufen zu lassen. Stattdessen sind
sie in `tools/nummern.mjs` festgehalten.

> **Regel: neue Arbeit nimmt Nummern ab SKY-210.**
> Darunter ist alles vergeben. `npm run nummern` setzt das durch.

Die Prüfung urteilt **nicht** selbst darüber, ob zwei Beschreibungen dasselbe
meinen — ihr erster Anlauf tat das und meldete sechs Fehlalarme, weil die
Tabelle das Problem nennt („Chiptune widerspricht der Zielrichtung") und die
Überschrift die Lösung („Klangidentität"). Sie hält nur fest, was einmal
entschieden wurde.

---

## 4. Zwei Zahlen, die ich nicht mehr benutze

**„55/100, Potenzial 82"** aus Teil X. Sie stammt von vor achtzehn Versionen
und ist seither nicht nachgerechnet worden.

**„CI-Median 325 s"** aus `docs/AUDIT-TORKETTE.md`. Nachgezählt an 13
auslesbaren Läufen sind es 443 s, Spanne 281 bis 463. Korrigiert in
Abschnitt 9 jenes Dokuments.
