# Bildaufträge — fünf neue Bosse

**Alle Maße hier sind gemessen, nicht geschätzt.** Die Messstellen stehen
dabei. Wer eine Zahl ändert, misst nach.

---

## 1. Warum überhaupt neue Bilder

Die drei vorhandenen Bosse werden auf dem Gerät **hochgerechnet** — und zwar
der größte am stärksten:

| | Quellbild | im Bild (Welt) | Anteil der Breite | im Puffer | Faktor |
|---|---|---|---|---|---|
| `boss1` | 325 × 260 | 325 × 260 | 60 % | 650 × 520 | **0,50×** |
| `boss2` | 377 × 260 | 430 × 296 | 80 % | 860 × 593 | **0,44×** |
| `boss3` | 425 × 260 | 527 × 322 | 98 % | 1054 × 645 | **0,40×** |

Zum Vergleich: das Formentor nennt alles unter **0,6×** „weich im Bild". Der
Elite liegt bei 0,37× und gilt als der schlimmste Fall im Spiel — `boss3`
liegt bei 0,40×, und er ist **das größte Ding auf dem Schirm.**

Gemessen an: Kamera-Zoom 2, Welt 540 × 960, Puffer 1080 × 1920, iPhone
393 × 852 @3x.

---

## 1b. Erster Anlauf (v28) — was schiefging

Die fünf gelieferten Bilder treffen die Gestaltung, aber nicht die Maße.
Alle kamen im **selben Hochformat** (0,47 bis 0,60), verlangt waren fünf
verschiedene (0,65 bis 2,05). Gemessen ist die Detaildichte danach
**gleich hoch wie bei den alten Bossen** — kein Gewinn an Schärfe.

> **Die Pixelzahl im Prompttext setzt die Ausgabegröße nicht.**
> Sie kommt aus der **Format- oder Größeneinstellung des Werkzeugs** und
> muss dort je Bild einzeln gesetzt werden.

Beim nächsten Anlauf zuerst das Format einstellen, dann den Prompt
einsetzen. Die Zahlen unten sind die Zielmaße; wenn das Werkzeug nur
Seitenverhältnisse kennt, steht das passende in der Tabelle daneben.

Einzelheiten und Zahlen: `art/roh/boss/README.md`.

---

## 1c. Zum Kopieren — fünf Bestellungen, eine nach der anderen

Jeder Block ist für sich vollständig. **Die Größe kommt aus der Einstellung
des Werkzeugs, nicht aus dem Prompttext** — deshalb steht sie über dem
Prompt und nicht darin.

Nach der Lieferung: Dateien nach `art/roh/boss/` legen und

```
npm run bildpruefung
```

Das prüft Größe, Seitenverhältnis, durchsichtigen Rand und ob im Bild bei
seiner Größe wirklich Detail steckt — Letzteres, damit ein zu kleines Bild
nicht einfach aufgezogen und durchgewinkt wird.

### B-1 · STURMKANZEL → `boss_sturmkanzel.png`

**Zuerst im Werkzeug einstellen:** Seitenverhältnis **1,36 : 1 (quer, etwa 4:3)**, Größe **850 × 625 px**.
Erst danach den Prompt einsetzen.

```
Top-down orthographic view of a heavy assault gunship, nose pointing DOWN toward the bottom of
the frame. Wide H-shaped silhouette: two large engine nacelles on the outer edges connected by a stocky central fuselage. Two chain cannons with ribbed barrels mounted on the nacelles, one twin turret on the spine. Semi-realistic hard-surface military design, brushed
gunmetal and blue-grey armour plating with visible panel seams, rivet lines
and worn edges. Amber running lights, heat discoloration around the exhaust
nozzles. Lit from the upper left at a 45-degree angle, strong directional
light, soft ambient fill, clear cast shading across the plating. The subject
fills the frame edge to edge with only a thin empty margin. Isolated on a
fully transparent background, no ground shadow, no background elements, no
text, no logos. Sharp, crisp detail throughout.
```

**Negativ:**
```
cartoon, anime, cel shading, toy, plastic toy, outline, comic book,
photorealistic photograph, studio render, background, sky, clouds, ground,
shadow on ground, text, watermark, red fuselage, crimson hull, blurry,
soft focus, upscaled, low detail
```

### B-2 · SCHWARMMUTTER → `boss_schwarmmutter.png`

**Zuerst im Werkzeug einstellen:** Seitenverhältnis **2,05 : 1 (sehr breit, etwa 2:1)**, Größe **1075 × 525 px**.
Erst danach den Prompt einsetzen.

```
Top-down orthographic view of a massive flying-wing drone carrier, nose pointing DOWN toward the bottom of
the frame. Very wide and very shallow blended flying-wing silhouette, no separate tail, wingspan more than twice the depth. Four rectangular drone launch bays along the trailing edge, two small point-defence turrets near the centre. Semi-realistic hard-surface military design, brushed
gunmetal and blue-grey armour plating with visible panel seams, rivet lines
and worn edges. Amber running lights, heat discoloration around the exhaust
nozzles. Lit from the upper left at a 45-degree angle, strong directional
light, soft ambient fill, clear cast shading across the plating. The subject
fills the frame edge to edge with only a thin empty margin. Isolated on a
fully transparent background, no ground shadow, no background elements, no
text, no logos. Sharp, crisp detail throughout.
```

**Negativ:**
```
cartoon, anime, cel shading, toy, plastic toy, outline, comic book,
photorealistic photograph, studio render, background, sky, clouds, ground,
shadow on ground, text, watermark, red fuselage, crimson hull, blurry,
soft focus, upscaled, low detail
```

### B-3 · LANZENTRÄGER → `boss_lanzentraeger.png`

**Zuerst im Werkzeug einstellen:** Seitenverhältnis **0,65 : 1 (hoch, etwa 2:3)**, Größe **650 × 1000 px**.
Erst danach den Prompt einsetzen.

```
Top-down orthographic view of a narrow railgun frigate, nose pointing DOWN toward the bottom of
the frame. Tall narrow silhouette, clearly longer than wide, like a spearhead. A single massive railgun rail runs the full length of the centreline with exposed copper coil segments and cooling fins. Four small flanking turrets in recessed housings. Semi-realistic hard-surface military design, brushed
gunmetal and blue-grey armour plating with visible panel seams, rivet lines
and worn edges. Amber running lights, heat discoloration around the exhaust
nozzles. Lit from the upper left at a 45-degree angle, strong directional
light, soft ambient fill, clear cast shading across the plating. The subject
fills the frame edge to edge with only a thin empty margin. Isolated on a
fully transparent background, no ground shadow, no background elements, no
text, no logos. Sharp, crisp detail throughout.
```

**Negativ:**
```
cartoon, anime, cel shading, toy, plastic toy, outline, comic book,
photorealistic photograph, studio render, background, sky, clouds, ground,
shadow on ground, text, watermark, red fuselage, crimson hull, blurry,
soft focus, upscaled, low detail
```

### B-4 · RINGFESTUNG → `boss_ringfestung.png`

**Zuerst im Werkzeug einstellen:** Seitenverhältnis **1 : 1 (quadratisch)**, Größe **1150 × 1150 px**.
Erst danach den Prompt einsetzen.

```
Top-down orthographic view of a circular orbital fortress platform, nose pointing DOWN toward the bottom of
the frame. Perfectly circular ring-shaped silhouette with an open centre; a smaller armoured core floats in the middle connected by four thin struts. Eight identical turret emplacements spaced evenly around the ring, each with a short stubby barrel. Semi-realistic hard-surface military design, brushed
gunmetal and blue-grey armour plating with visible panel seams, rivet lines
and worn edges. Amber running lights, heat discoloration around the exhaust
nozzles. Lit from the upper left at a 45-degree angle, strong directional
light, soft ambient fill, clear cast shading across the plating. The subject
fills the frame edge to edge with only a thin empty margin. Isolated on a
fully transparent background, no ground shadow, no background elements, no
text, no logos. Sharp, crisp detail throughout.
```

**Negativ:**
```
cartoon, anime, cel shading, toy, plastic toy, outline, comic book,
photorealistic photograph, studio render, background, sky, clouds, ground,
shadow on ground, text, watermark, red fuselage, crimson hull, blurry,
soft focus, upscaled, low detail
```

### B-5 · AMBOSSKREUZER → `boss_ambosskreuzer.png`

**Zuerst im Werkzeug einstellen:** Seitenverhältnis **1,30 : 1 (quer)**, Größe **1300 × 1000 px**.
Erst danach den Prompt einsetzen.

```
Top-down orthographic view of an enormous cruciform battlecruiser, nose pointing DOWN toward the bottom of
the frame. Cruciform silhouette: a long armoured spine with two wide cross arms reaching far to the left and right. Two large main gun batteries with twin barrels on the cross arms, three smaller hull turrets along the spine, one heavy launcher at the nose. Semi-realistic hard-surface military design, brushed
gunmetal and blue-grey armour plating with visible panel seams, rivet lines
and worn edges. Amber running lights, heat discoloration around the exhaust
nozzles. Lit from the upper left at a 45-degree angle, strong directional
light, soft ambient fill, clear cast shading across the plating. The subject
fills the frame edge to edge with only a thin empty margin. Isolated on a
fully transparent background, no ground shadow, no background elements, no
text, no logos. Sharp, crisp detail throughout.
```

**Negativ:**
```
cartoon, anime, cel shading, toy, plastic toy, outline, comic book,
photorealistic photograph, studio render, background, sky, clouds, ground,
shadow on ground, text, watermark, red fuselage, crimson hull, blurry,
soft focus, upscaled, low detail
```

---

## 2. Vorgaben, die für ALLE fünf gelten

### 2.1 Auflösung — die einzige Rechnung, die man kennen muss

> **Quellbreite in Bildpunkten = Breite im Bild (Weltpunkte) × 2**

Der Puffer ist doppelt so breit wie die Welt (Zoom 2). Ein Boss, der
400 Weltpunkte breit im Bild steht, braucht **800 Bildpunkte** Quellbreite.
Weniger heißt hochgerechnet.

Geliefert wird **1,25× davon**, damit ein späteres iPad oder ein
Nachschärfen nicht sofort wieder am Anschlag ist. Die Maße unten enthalten
diesen Aufschlag schon.

### 2.2 Ausrichtung — **Nase nach UNTEN**

Die vorhandenen Bilder sind mit der Nase nach oben gezeichnet, und das Spiel
dreht sie um 180°. Das hat einen gemessenen Nebeneffekt: die eingebackene
Schattierung dreht sich mit. Elite, Carrier und Gunship sind in der Textur
von oben links beleuchtet (Gunship 131,5 gegen 81,8 — Faktor 1,6), auf dem
Schirm kommt dieses Licht also von **unten rechts** — gegen den Schatten,
der nach unten rechts fällt.

**Die neuen Bosse werden mit der Nase nach unten gezeichnet.** Dann entfällt
die Drehung, und Licht und Schatten stimmen überein. Am Code ist dafür beim
Einbau `setAngle(180)` für den Boss zu streichen (eine Zeile).

### 2.3 Licht

**Von oben links**, 40–50° Einfallswinkel. Der Schatten des Spiels fällt um
(+7, +12) Weltpunkte nach unten rechts; jede andere Lichtrichtung
widerspricht ihm.

Kein Bodenschatten im Bild — den wirft das Spiel selbst, und er passt sich
seit v23 dem Biom an (Deckkraft 0,31 auf der Stadt bis 0,60 auf der Wüste).

### 2.4 Dateiform

- **PNG mit Alphakanal**, freigestellt, **kein** Hintergrund, keine Vignette
- **6–10 Bildpunkte durchsichtiger Rand** ringsum — das Spiel backt einen
  dunklen Saum und ein Kantenlicht auf, beides braucht Platz
- keine Schrift, keine Logos, keine Wasserzeichen, keine Rahmen
- Ablage: `art/roh/boss/<name>.png`

### 2.5 Stil — verbindlich

Halbrealistisch, leicht stilisiert, **plastisch und dreidimensional
wirkend**, technisch glaubwürdig, modern, erwachsen. Gebürstetes Metall mit
sichtbaren Panelfugen, Nietenreihen, Hitzeverfärbung an den Düsen,
abgenutzte Kanten.

**Ausdrücklich nicht:** Comic, Anime, Kinderspiel, Spielzeug, Cel-Shading,
Umrisslinien im Bild, Fotorealismus, Renderaufnahme mit Studiolicht.

Alle fünf müssen wie **eine Flotte** aussehen — dieselbe Materialsprache,
dieselbe Lichtrichtung, dieselbe Abnutzung. Kein Nachbau vorhandener
Vorbilder aus anderen Spielen.

### 2.6 Silhouette — das Formentor prüft es

`npm run formen` misst, ob zwei Silhouetten zugleich flächengleich und
profilgleich sind. Die fünf sind deshalb bewusst **verschieden gebaut**:
breit-H, flacher Flügel, schmal-hoch, rund, kreuzförmig. Wer davon abweicht,
riskiert einen Befund.

### 2.7 Farbe

Rumpf in kühlem Graustahl bis Blaugrau. Akzente in Ocker/Bernstein.

**Verboten am Rumpf:** ein kräftiges Rot im Bereich `#ff3a2a` ± 25° Farbton.
Das ist die Gefahrenfarbe der Gegnergeschosse (`GEFAHR`), und das Farbtor
schlägt an, wenn ein Rumpf sie führt. Glühende Triebwerke dürfen warm sein,
solange sie nicht in dieses Band fallen.

---

## 3. Die fünf Bosse

Reihenfolge nach Schwierigkeit. Jeder hat eine eigene Silhouette, eigene
Kanonen und eine eigene Geschossart.

---

### B-1 · STURMKANZEL — schwerer Sturmgleiter

| | |
|---|---|
| Silhouette | **H-Form** — zwei Triebwerksgondeln außen, gedrungener Rumpf mittig |
| im Bild | 340 × 250 Weltpunkte (63 % der Breite) |
| **Quellbild** | **850 × 625 px** · Seitenverhältnis **1,36 : 1** (quer) |
| Kanonen | 2 Kettenkanonen an den Gondeln, 1 Doppelturm mittig |
| Geschoss | `eb_bolzen` — kurzer, dicker Bolzen mit Leuchtspur |

**Prompt (englisch — Bildmodelle verstehen englische Bildbeschreibungen
zuverlässiger als deutsche):**

```
Top-down orthographic view of a heavy assault gunship, nose pointing DOWN
toward the bottom of the frame. Semi-realistic hard-surface military
aircraft, brushed gunmetal and blue-grey armour plating with visible panel
seams, rivet lines and worn edges. Wide H-shaped silhouette: two large
engine nacelles on the outer edges connected by a stocky central fuselage.
Two chain cannons with ribbed barrels mounted on the nacelles, one twin
turret on the spine. Amber running lights. Heat discoloration around the
exhaust nozzles at the top of the frame. Lit from the upper left at a
45-degree angle, strong directional light, soft ambient fill, clear cast
shading across the plating. Isolated on a fully transparent background, no
ground shadow, no background elements, no text, no logos. Sharp, crisp
detail. 850 x 625 pixels.
```

**Negativ:** `cartoon, anime, cel shading, toy, plastic toy, outline, comic
book, photorealistic photograph, studio render, background, sky, clouds,
ground, shadow on ground, text, watermark, red fuselage, crimson hull`

---

### B-2 · SCHWARMMUTTER — Trägerflügel

| | |
|---|---|
| Silhouette | **flacher, breiter Nurflügel** — sehr breit, sehr flach |
| im Bild | 430 × 210 Weltpunkte (80 % der Breite) |
| **Quellbild** | **1075 × 525 px** · Seitenverhältnis **2,05 : 1** (sehr breit) |
| Kanonen | 4 Abwurfschächte an der Hinterkante, 2 Punktverteidigungstürme |
| Geschoss | `eb_brut` — kleine Drohnenkapsel, die sich im Flug öffnet |

```
Top-down orthographic view of a massive flying-wing drone carrier, nose
pointing DOWN. Semi-realistic hard-surface military aircraft, brushed
gunmetal and slate blue armour with visible panel seams and rivet lines,
weathered leading edges. Very wide and very shallow blended flying-wing
silhouette, no separate tail. Four rectangular drone launch bays along the
trailing edge, two small point-defence turrets near the centre. Recessed
intake grilles. Amber navigation strips along the wing edges. Lit from the
upper left at a 45-degree angle, strong directional light, clear cast
shading across the plating. Isolated on a fully transparent background, no
ground shadow, no background, no text. Sharp, crisp detail.
1075 x 525 pixels.
```

**Negativ:** wie B-1.

---

### B-3 · LANZENTRÄGER — Bahnkanonen-Fregatte

| | |
|---|---|
| Silhouette | **schmal und hoch** — die einzige, die höher als breit ist |
| im Bild | 260 × 400 Weltpunkte (48 % der Breite) |
| **Quellbild** | **650 × 1000 px** · Seitenverhältnis **0,65 : 1** (hoch) |
| Kanonen | 1 durchgehende Bahnkanone auf der Mittelachse, 4 Flankentürme |
| Geschoss | `eb_lanze` — sehr langer, dünner Strahlstab |

```
Top-down orthographic view of a narrow railgun frigate, nose pointing DOWN.
Semi-realistic hard-surface military spacecraft, brushed gunmetal and cold
grey armour with visible panel seams, rivet lines and heat-stained plating.
Tall narrow silhouette, much longer than wide, like a spearhead. A single
massive railgun rail runs the full length of the centreline with exposed
copper coil segments and cooling fins. Four small flanking turrets in
recessed housings along the hull. Amber status lights along the spine. Lit
from the upper left at a 45-degree angle, strong directional light, clear
cast shading. Isolated on a fully transparent background, no ground shadow,
no background, no text. Sharp, crisp detail. 650 x 1000 pixels.
```

---

### B-4 · RINGFESTUNG — Ringplattform

| | |
|---|---|
| Silhouette | **kreisrund mit offener Mitte** — als einzige rotationssymmetrisch |
| im Bild | 460 × 460 Weltpunkte (85 % der Breite) |
| **Quellbild** | **1150 × 1150 px** · Seitenverhältnis **1 : 1** (quadratisch) |
| Kanonen | 8 Türme gleichmäßig auf dem Ring, 1 Kern in der Mitte |
| Geschoss | `eb_scherbe` — dreieckige Scherbe, die sich im Flug dreht |

```
Top-down orthographic view of a circular orbital fortress platform, seen
from directly above. Semi-realistic hard-surface military structure,
brushed gunmetal and dark blue-grey armour with heavy panel seams, rivet
rows and scorched plating. Ring-shaped silhouette with an open centre; a
smaller armoured core floats in the middle connected by four thin struts.
Eight identical turret emplacements spaced evenly around the ring, each with
a short stubby barrel. Recessed maintenance channels. Amber warning lights
on the turret housings. Lit from the upper left at a 45-degree angle, strong
directional light, clear cast shading across the ring. Isolated on a fully
transparent background, no ground shadow, no background, no text. Sharp,
crisp detail. 1150 x 1150 pixels.
```

---

### B-5 · AMBOSSKREUZER — Schlachtkreuzer

| | |
|---|---|
| Silhouette | **kreuzförmig** — langer Rumpf mit weit ausladenden Querarmen |
| im Bild | 520 × 400 Weltpunkte (96 % der Breite) |
| **Quellbild** | **1300 × 1000 px** · Seitenverhältnis **1,30 : 1** (quer) |
| Kanonen | 2 Hauptbatterien auf den Querarmen, 3 Rumpftürme, 1 Bugwerfer |
| Geschoss | `eb_hammer` — schwerer, langsamer Klotz mit Aufschlagsring |

```
Top-down orthographic view of an enormous cruciform battlecruiser, nose
pointing DOWN. Semi-realistic hard-surface military spacecraft, brushed
gunmetal and deep slate armour with heavy layered panel seams, rivet rows,
weld beams and battle scarring. Cruciform silhouette: a long armoured spine
with two wide cross arms reaching far to the left and right. Two large main
gun batteries with twin barrels on the cross arms, three smaller hull
turrets along the spine, one heavy launcher at the nose. Exposed structural
ribs and armoured bulkheads. Amber floodlights in recessed wells. Lit from
the upper left at a 45-degree angle, strong directional light, deep cast
shadows between the armour layers. Isolated on a fully transparent
background, no ground shadow, no background, no text. Sharp, crisp detail.
1300 x 1000 pixels.
```

---

## 4. Die Geschosse

### 4.1 Der Befund dazu

Der Boss hat heute **drei** Geschossarten für alle Stufen — und alle drei
sind von Gegnern geliehen:

```
this.ebStyle = E.tier >= 3 ? "star" : E.tier >= 2 ? "ring" : "diamond"
```

`star`, `ring` und `diamond` gehören dem Bogenschützen, dem Bomber und dem
Elite. Ein Boss, der schießt wie ein Bomber, ist kein Boss.

Bei den Gegnern ist es besser als gedacht: **zehn von dreizehn** führen eine
eigene Art. Die drei ohne (`scout`, `kamikaze`, `rocketeer`) schießen
konventionell gar nicht — Späher und Kamikaze rammen, der Raketenschütze
verschießt `missile`. Der Rückfall auf `orb` greift dort nie.

### 4.2 Was jedes neue Geschoss braucht

| | |
|---|---|
| Größe | 28–48 px lang, 14–34 px breit (die vorhandenen liegen zwischen 14×44 und 34×34) |
| Ausrichtung | Flugrichtung **nach unten** |
| Farbe | Kern im Gefahrenband `#ff3a2a` ± 25° Farbton, Sättigung mindestens wie die vorhandenen |
| Rand | **dunkler Rand** ringsum — er trägt die Lesbarkeit über hellem Grund |
| Mitte | **kein weißes Mittelband.** Das war der Fehler von `eb_needle`: bei zuviel Weiß bleibt von der Kennfarbe nichts übrig, und das Farbtor schlägt an |

```
Top-down game projectile sprite, <FORM>, pointing DOWN. Glowing hot orange-
red core (#ff3a2a) with a darker crimson rim and a thin near-black outline.
Semi-realistic energy-projectile look, slight inner glow, no white centre.
Isolated on a fully transparent background, no background, no text.
<BREITE> x <HOEHE> pixels.
```

| Geschoss | `<FORM>` | Maß |
|---|---|---|
| `eb_bolzen` (B-1) | `a short thick bolt with a tapered tip and a short motion trail` | 22 × 40 |
| `eb_brut` (B-2) | `a small armoured drone pod with two folded fins` | 26 × 30 |
| `eb_lanze` (B-3) | `a very long thin lance of focused energy` | 12 × 56 |
| `eb_scherbe` (B-4) | `an angular triangular shard with sharp facets` | 30 × 30 |
| `eb_hammer` (B-5) | `a heavy blunt slug with a wide impact ring around it` | 36 × 34 |

---

## 5. Was am Code nachzuziehen ist, sobald die Bilder da sind

1. `setAngle(180)` für den Boss streichen (die Bilder sind nasenunten).
2. `EB_STYLE` um die fünf neuen Arten erweitern, je mit `hit`-Radius.
3. Den Boss die Geschossart aus seiner eigenen Kennung nehmen lassen statt
   aus `tier`.
4. `BILDBODEN` in `tools/formen.mjs` um die Bosse erweitern — dann hält der
   Boden auch für sie.
5. `npm run formen` prüft die Silhouetten gegeneinander; `npm run farbtor`
   prüft die Geschossfarben. Beide laufen in der Torkette.
