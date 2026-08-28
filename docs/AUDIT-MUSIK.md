# Musik-Audit — was da läuft, was fehlt, und was es kostet

**Anlass:** *„Musik soll einfach passend sein für so ein Spiel. Bitte mach
mal selber ein Audit, was passend kann und was sich professionell anhört.
Nicht einfach so kleines Rumgedudel. Anständige Musik. Richtige, frei
verfügbare Lieder."*

---

## 1. Was heute läuft — gemessen, nicht beurteilt

`npm run musik` liest den Taktgeber und die Notentabellen aus `src/app.js`:

```
  Taktgeber:      140 ms je Schritt  →  107 Schläge je Minute
  Schleife:       64 Schritte        →  8,96 s bis zur Wiederholung
  Schlagzeug:     kick, snare, hat

  Modus     Stimmen   Töne gesetzt   verschiedene Tonhöhen   Umfang
  normal          5             60                      12   53–79
  boss            5             68                      15   44–74

  In einem Sektor von 78 s:   8,7 Wiederholungen
  In einem Sektor von 139 s: 15,5 Wiederholungen
```

**Das ist der ganze Befund, und er braucht kein Ohr:** ein Achttakter von
neun Sekunden, der sich in einem Sektor bis zu **sechzehn Mal** wiederholt.
Zwölf verschiedene Tonhöhen. Zwei Melodie-Stimmen über einem
Dreiteile-Schlagzeug, erzeugt aus Rechteck-, Sinus- und Dreieckschwingungen
— also genau das, was ein Oszillator hergibt und keinen Deut mehr.

Es ist handwerklich sauber gebaut: es gibt einen Kompressor, eine eigene
Musikspur mit eigener Lautstärke, eine Variation (eine Oktave höher in
jeder zweiten Runde) und einen Wechsel auf einen anderen Satz Noten beim
Boss. Für erzeugten Klang ist das ordentlich.

**Aber es ist erzeugter Klang, und das hört man.** Kein Instrument hat
einen Anschlag, kein Ton eine Hülle, die von einem Körper kommt. „Kleines
Rumgedudel" ist als Urteil hart und als Beschreibung zutreffend.

---

## 2. Was das Genre macht

Vertikale Shmups dieser Bauart — der genannte Vergleich ist *1945 Air
Force* — arbeiten mit **fertig produzierter Musik**, nicht mit
Klangsynthese zur Laufzeit:

- **Länge:** 60 bis 120 Sekunden je Stück, damit die Naht nicht auffällt.
  Bei unseren Sektorlängen (78 bis 139 s) hieße das ein bis zwei
  Durchläufe statt sechzehn.
- **Besetzung:** orchestral-elektronisch. Streicher oder Blech für die
  Linie, Synthesizer-Flächen darunter, ein echtes oder gut gesampeltes
  Schlagzeug. Der Bass trägt, er piept nicht.
- **Schichten:** ruhiger Grundzustand, dichter im Gefecht, eigenes Stück
  beim Boss. Der Wechsel ist eine Blende, kein Schnitt.
- **Tempo:** 120 bis 140 Schläge, nicht 107. Der jetzige Wert ist für ein
  Spiel mit Autofeuer alle 100 ms auffällig gemächlich.

Das ist keine Geschmacksfrage, sondern die Bauform, gegen die verglichen
wird.

---

## 3. Der Haken, und er ist architektonisch

Skyfront ist **eine autarke HTML-Datei**, heute 16,17 MB. Alles steckt als
base64 darin. Musik macht daran zwei Rechnungen auf, und die zweite ist
die gefährliche.

### Platz in der Datei

| | 90 s Stereo | drei Stücke |
|---|---:|---:|
| Opus 96 kbps | 1,08 MB | 3,2 MB |
| als base64 (+33 %) | **1,44 MB** | **4,3 MB** |

16,17 → rund 20,5 MB. Unangenehm, aber tragbar.

### Speicher beim Abspielen — hier liegt die Falle

Wer Musik über `decodeAudioData` in einen `AudioBuffer` legt, hält sie
**vollständig entpackt** im Arbeitsspeicher:

```
90 s × 48 000 Hz × 2 Kanäle × 4 Byte  =  34,6 MB   je Stück
```

Drei Stücke sind **über 100 MB**. Genau davor steht seit v9 eine Warnung im
Torwerk: *„Auf iOS beendet Safari eine Seite, die zu viel Speicher hält,
ohne Vorwarnung."* Das Spiel wäre auf dem Zielgerät nicht mehr stabil.

**Der Ausweg ist bekannt und einfach:** ein `<audio>`-Element mit
`data:`-Quelle statt `decodeAudioData`. Der Browser streamt dann und
dekodiert häppchenweise; der Speicher bleibt im einstelligen
Megabyte-Bereich. Über `createMediaElementSource` hängt das Element
trotzdem am vorhandenen Kompressor und an der Musik-Lautstärke, das
Ducking beim Boss funktioniert weiter.

Der Preis: `loop` auf einem `<audio>`-Element ist nicht bruchfrei — an der
Naht kann ein Zucken von wenigen Millisekunden stehen. Bei einem Stück,
das ohnehin ausklingt und neu anfängt, fällt das nicht auf; bei einem
durchlaufenden Rhythmus schon. Deshalb: **Stücke wählen, die mit einer
Blende enden**, nicht mitten im Takt.

---

## 4. Woher die Musik kommen kann

Recherchiert, mit Blick auf die Lizenz — „frei verfügbar" heißt nicht
dasselbe wie „darf ich einbauen".

| Quelle | Lizenz | Namensnennung | Für uns |
|---|---|---|---|
| **FreePD** | CC0 / Public Domain | **nein** | erste Wahl |
| **Kenney** | CC0 | **nein** | Klangeffekte stark, Musik knapp |
| **Pixabay Music** | Pixabay-Lizenz | **nein** | groß, Qualität schwankt |
| **OpenGameArt** | gemischt, nach CC0 filterbar | je nach Titel | brauchbar, prüfen |
| **Incompetech** (Kevin MacLeod) | CC-BY | **ja** | nur mit Nennung im Spiel |

**Empfehlung: CC0.** Nicht weil CC-BY schlecht wäre, sondern weil eine
Namensnennung, die im Spiel stehen muss, ein Bildschirm ist, den es noch
nicht gibt — und eine Pflicht, die man vergessen kann. CC0 hat diese
Pflicht nicht.

Was in jedem Fall gilt und im Projekt schon einmal teuer war (SKY-241):
**jede Datei wird vor dem Einbau angehört und ihre Lizenzseite gelesen.**
Kein Werkzeug hört, ob in einem Stück ein Sample steckt, das jemand
anderem gehört.

---

## 5. Was ich empfehle

**Drei Stücke, CC0, als Streaming-Element.**

| | Länge | Charakter |
|---|---:|---|
| Menü / Hangar | 60–90 s | ruhig, getragen, Fläche mit wenig Rhythmus |
| Gefecht | 90–120 s | 120–140 Schläge, treibend, Blech oder Synth-Linie |
| Boss | 60–90 s | schwerer, tiefer, deutlich dichter |

Damit fällt die Wiederholung von sechzehn auf ein bis zwei je Sektor. Das
ist die Zahl, die den Unterschied macht — mehr als jede Frage nach dem
Musikstil.

Der erzeugte Klang bleibt **als Rückfall** im Code. Er ist der Grund,
warum das Spiel heute in jeder Umgebung Musik hat, und er kostet nichts.

### Was ich dafür brauche

Eine Entscheidung und drei Dateien. Ich kann Musik nicht selbst
heraussuchen und einbauen: welches Stück zu einem Spiel passt, ist Ihr
Urteil, und die Lizenz einer Datei kann ich nicht dadurch prüfen, dass ich
sie herunterlade.

**Der Weg wäre:** Sie suchen bei FreePD oder Pixabay drei Stücke aus, legen
sie unter `art/musik/` ab (als `.ogg` oder `.mp3`, egal welche Länge), und
`npm run musikeinbau` rechnet sie auf Zielgröße, prüft Länge und Lautheit
und schreibt sie in den Vorrat — dieselbe Bauform wie `npm run einbau` für
die Bilder.

Diese Vorrichtung gibt es noch nicht. Sie zu bauen ist eine Runde, und sie
lohnt erst, wenn die Richtung steht.
