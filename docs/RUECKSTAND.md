# Rückstand — was offen ist, und woran das geprüft wurde

**Dieses Dokument ist die einzige Stelle, an der der Stand steht.**
`docs/AUDIT-2026-08.md` ist das Archiv mit allen Befunden und Messungen.
Wer wissen will, *was als Nächstes*, liest hier.

**Geprüft ist am Code, nicht am Dokument.** Ein Audit sagt, was jemand
einmal gefunden hat; ob es noch gilt, sagt nur die Quelle.

Stand: v74.

> **Diese Datei stand vierzig Versionen lang auf „v28".** Nichts hat sie
> geprüft — der Rückstand des Rückstandsverzeichnisses fiel niemandem auf,
> weil kein Tor ihn ansah. Seit v70 vergleicht `npm run version` die
> Standzeile mit der Quelle und schlägt ab sechs Versionen an. Eine Regel,
> die nur aufgeschrieben ist, wird gebrochen.

---

## 1. Die zehn großen Befunde — Stand heute

| | Befund | Stand | woran geprüft |
|---|---|---|---|
| **B1** | Kernloop ohne Belohnung im Gefecht | ✅ | `npm run feuerkraft`, 120 Sektoren |
| **B2** | Level generiert statt gestaltet | ✅ | `npm run rhythmus`, `npm run formationen` |
| **B3** | Gegnerkugeln nicht als Gefahr lesbar | ✅ | `npm run farbtor`, 17 Projektile |
| **B4** | Kein Weg, Balance zu messen | ⚠️ **halb** | Messtafel liefert Gerätezahlen von Hand; **keine selbsttätige Telemetrie** |
| **B5** | Bildratenabhängige Bewegung | ✅ | `ZF = Clamp(delta,8,50)/16.667`, durchgängig |
| **B6** | Ton widerspricht der Zielrichtung | ⚠️ **halb** | `npm run klang` (4 Trefferklassen, Abschuss nach Größe), `npm run musik` (3 Modi) — gestuft ist es, ob es eine *Identität* ist, sagt keine Zahl |
| **B7** | Drei Bosse für 120 Level | ✅ **überholt** | fünf Bosse, `npm run bossmuster`: 5 Stufen × 3 Phasen, jede feuert anders |
| **B8** | Messung kann Ruckler nicht sehen | ✅ | `npm run messtafel`, zwölf Prüfungen A–L |
| **B9** | Stille Fehlerzustände | ✅ | jede Vorratsanfrage wird gezählt (`npm run sektor`, Prüfung F); ein voller Gegnervorrat verschiebt jetzt statt wegzuwerfen — 197 verlorene Gegner in Sektor 106 auf **1** |
| **B10** | Minifizierter Quelltext | ❌ **offen** | unverändert rund 3 MB |

---

## 2. Offen — nach Nutzen sortiert

### A · Bilder (blockiert, braucht Lieferung von außen)

`npm run bestellung` nennt bei jedem Lauf Format, Mindestgröße und Prompt.
**Neun im Auftrag, fünf geliefert, vier offen:**

| | Textur braucht | Prompt |
|---|---:|---|
| **B-5 Ambosskreuzer** | 1040 px Inhaltsbreite | `BILDAUFTRAEGE-BOSSE.md` |
| **G-1 Elite-Jäger** | 216 px | `BILDAUFTRAEGE-GEGNER.md` |
| **G-2 Schlachtträger** | 296 px | `BILDAUFTRAEGE-GEGNER.md` |
| **G-3 Rotor-Jäger** | 134 px | `BILDAUFTRAEGE-GEGNER.md` |

Zwei Lieferungen wurden abgelehnt und liegen mit Begründung unter
`art/roh/boss/verworfen`. Der wiederkehrende Grund: die Pixelzahl im
Prompttext setzt die Ausgabegröße nicht — sie kommt aus der
Formateinstellung des Werkzeugs.

**Dazu ohne Auftrag:** die **Beiflüge** sind bis heute eine eingefärbte,
auf 0,32 verkleinerte Kopie des Spielerflugzeugs.

### B · Die bemalte Fläche — **teilweise erledigt (v71), Rest offen**

Gemessen mit `npm run sektor`, in Bildschirmen je Bild. **Nicht mit der
Deckkraft gewichtet:** eine überblendete Fläche kostet die Grafikeinheit
dasselbe, ob sie zu vier Prozent deckt oder zu hundert.

| | bemalt je Bild | bildfüllende Ebenen |
|---|---|---|
| Sektor 3 | 8,30 → **6,31** | 7 → **5** |
| Sektor 106 | 13,61 → **11,69** | 10 → **8** |

Drei stehende Ebenen sind zu einer geworden (v71). **Nachgesehen (v72):**
was in Sektor 106 und 61 noch übereinanderliegt, kommt aus
`src/modifier.js` — Wetter und Stimmung, mit drei verschiedenen
Mischmodi (Multiply, Add, Normal). Nicht zusammenzubacken, ohne den
Effekt abzuschaffen.

**Neu gemessen und vorher nie gesehen: Sektor 61 (Gewitter) trägt zehn
bildfüllende Ebenen** — der schwerste Schirm im Spiel. Vier davon legt
der Regeneffekt übereinander (Dunkelung, Böe, Regen, Schwaden). Ob ein
Gewitter das wert ist, ist eine **gestalterische Frage** und keine, die
ein Tor beantwortet. Es hält jetzt fest, dass es zehn sind.

Was **keine** Hebel sind, ist gemessen und braucht keinen zweiten Anlauf:
der fx-Deckel (170 → 45 ändert nichts, v68), das Aufräumen der Vorräte
(Ordnung, keine Leistung, v67), die Zahl der Anzeigeobjekte (kein Leck,
v67).

### C · Der Effekt-Regler auf dem Gerät (zurückgestellt)

Zwei Fehler sind behoben (v64: totes Band; v69: ungebremstes Fallen), die
Bestätigung vom Gerät steht aus. Die Messtafel trägt seit v70 `Qab`,
`Qauf`, `seit…s` und `Sektor…s` — damit ist die Frage in einer Fahrt
entschieden. **Vom Nutzer zurückgestellt.**

### D · B4 · Selbsttätige Telemetrie

Solange nichts von allein zurückkommt, bleibt jede Zahl in der Balance
geschätzt — bei 120 Sektoren × 3 Graden × 5 Flugzeugen × 4 Waffen nicht
mehr durch Spielen zu prüfen. Die Messtafel ist der Handbetrieb davon.

### E · SKY-081 · Einweisung durch Spielen

Vorhanden ist ein Hinweistext: `Ziehen zum Fliegen · Auto-Feuer · 💣 Bombe`.
Steht als MUST-HAVE und ist nicht gebaut.

### F · Lesbarkeit auf hellen Biomen (aus v21, seither nicht neu gemessen)

Die Polarität kippt zwischen den Biomen: auf der Stadt ist der Flieger ein
helles Ding auf dunklem Grund (Abstand +66…+82), auf Frost ein dunkles auf
hellem (−19…−34). Richtung, noch nicht gemessen: auf hellen Biomen müsste
der **dunkle Saum** mehr tragen, nicht ein helles Streiflicht.

### G · Die Bilder sind gegen ihren eigenen Schatten beleuchtet (v25)

Gegner und Boss werden mit `setAngle(180)` gezeichnet; die eingebackene
Schattierung dreht sich mit. Am **Bild** zu beheben, nicht am Code — und
damit an dieselbe Lieferung gebunden wie Abschnitt A.

### I · Kleinigkeiten

- Der **Modul-Schirm** bleibt unter dem letzten Drittel leer, solange
  nichts erbeutet ist. Ehrlich, aber nicht schön.
- Das **Bildtor** kostet auf GitHub rund drei Minuten. Weiter runter ginge
  nur über weniger Modi oder weniger Bilder — beides kostet
  Empfindlichkeit.
- **B10 Erblast** (minifizierter Quelltext) und **SKY-060
  Levelabschnitte**: beides teuer, ohne unmittelbaren Gewinn.

---

## 3. Was seit v28 dazugekommen und wieder zugegangen ist

Damit niemand zweimal dasselbe aufmacht — alles im Audit belegt:

| | erledigt in |
|---|---|
| Levellänge messbar (`npm run zeitachse`) | v29 ff. |
| Kaufwege wirken (Sekundärwaffe, Beiflüge, Module) | v58–v60 |
| Kopfzeile trennt Pilot und Flugzeug | v57 |
| Messtafel: misst eingeklappt, überlebt Pause, bucht sich selbst | v62–v70 |
| Vier-Tipp-Ecke lag auf Pause und Ton | v69 |
| Combo-Anzeigen widersprachen sich | v69 |
| Menü brauchte fünfmal soviel Pufferwechsel wie ein Sektor | v66 |
| Anzeigeliste: kein Leck, Zusammensetzung bekannt | v67 |
| Ein Sektor rechnet sich in vier Sekunden durch (`npm run sektor`) | v67 |
| B9: stille Vorratsfehler gezählt, Gegner werden verschoben statt verworfen | v71 |
| Messung ist ein Schalter, kein Aufklapper | v73 |
| **Eine neue Fassung kam auf dem Gerät nie an** — der Dienst-Arbeiter legte die alte Seite unter der neuen Marke ab (`addAll` durch den Browser-Zwischenspeicher). Gemessen: vorher nach vier Starten nicht da, jetzt nach zwei | v74 |

---

## 4. Die Ticketnummern

Neun Nummern bezeichnen historisch zwei verschiedene Dinge (Teil Y gegen
Teil Z des Audits). **Nicht umnummeriert** — die Überschriften stehen in
Commits und Dokumenten. Festgehalten in `tools/nummern.mjs`.

> **Regel: neue Arbeit nimmt Nummern ab SKY-210.**
> `npm run nummern` setzt das durch.
