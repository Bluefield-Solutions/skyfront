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

Jeder Block ist für sich vollständig: Formateinstellung, Prompt,
Negativprompt, Dateiname. Nichts davon muss zusammengesetzt werden.

**Drei Regeln, jede aus dem gescheiterten ersten Anlauf:**

1. **Zuerst das Format im Werkzeug einstellen, dann den Prompt einsetzen.**
   Die Pixelzahl im Prompttext setzt die Ausgabegröße nicht. Kennt das
   Werkzeug nur Seitenverhältnisse, steht das nächstliegende dabei — eine
   Abweichung bis 15 % lässt `npm run bildpruefung` durchgehen, ein
   Hochformat statt eines Querformats nicht.
2. **Jeder Prompt beschreibt seine Proportion in Worten.** Das ist die
   zweite Sicherung: geht die Formateinstellung verloren, zieht wenigstens
   der Text noch in die richtige Richtung. Beim ersten Anlauf fehlte beides,
   und alle fünf kamen im selben Hochformat.
3. **Eines nach dem anderen bestellen.** Fünf Bilder in einem Rutsch haben
   beim ersten Mal fünf Mal denselben Fehler ergeben.
4. **Der Rand wird ausdrücklich verlangt.** B-1 kam mit 4 Bildpunkten oben
   statt der nötigen 6 und musste von Hand nachgezogen werden. Seither steht
   in jedem Prompt, dass nichts die Bildkante berühren darf.

Nach der Lieferung: Dateien nach `art/roh/boss/` legen und

```
npm run bildpruefung
```

Das prüft Größe, Seitenverhältnis, durchsichtigen Rand und ob im Bild bei
seiner Größe wirklich Detail steckt — Letzteres, damit ein zu kleines Bild
nicht einfach aufgezogen und durchgewinkt wird.

---

### B-1 · STURMKANZEL → `boss_sturmkanzel.png`

> **Einstellung im Werkzeug, VOR dem Prompt:**
> Seitenverhältnis **1,36 : 1 quer** (nächstliegende Voreinstellung: **4:3**),
> Größe **850 × 625 px**.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: a heavy assault gunship, nose pointing DOWN toward the bottom
edge of the frame, engines and exhaust nozzles at the top edge.
Proportions: clearly wider than tall — the wingspan is about one and a third times the
length from nose to tail. A landscape composition.
Silhouette: a broad H — two large engine nacelles on the outer edges, joined by a short
stocky central fuselage and a thick wing box between them.
Armament: two chain cannons with ribbed, vented barrels slung under the nacelles and
pointing down-frame, one twin turret on the spine behind the armoured cockpit.
Surface: semi-realistic hard-surface military design, brushed gunmetal and blue-grey
armour plating, visible panel seams, rivet lines, hex bolt heads, chipped and worn edges,
soot streaks trailing back from the exhausts.
Accents: amber running lights along the nacelle tops, deep bronze-to-violet heat
discolouration around the exhaust nozzles.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, clear directional shading and self-shadowing across the plating, crisp
specular highlights on raised panel edges.
Framing: centred, occupying about 96 percent of the frame in its longest direction. Leave a
clear empty transparent margin of about 2 percent of the frame on all four sides — no part
of the subject, not even a barrel tip or an antenna, may touch or be cut off by a frame
edge.
Background: fully transparent, no ground shadow, no sky, no clouds, no ground, no
vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
portrait composition, tall narrow composition, cartoon, anime, cel shading, toy,
plastic toy, thick outline, comic book, photorealistic photograph, studio product render,
background, sky, clouds, ground, terrain, shadow on ground, vignette, frame, border,
text, watermark, signature, red fuselage, crimson hull, blurry, soft focus, upscaled,
low detail, tilted view, three-quarter view, side view
```

---

### B-2 · SCHWARMMUTTER → `boss_schwarmmutter.png`

> **Einstellung im Werkzeug, VOR dem Prompt:**
> Seitenverhältnis **2,05 : 1 sehr breit** (nächstliegende Voreinstellung: **2:1**),
> Größe **1075 × 525 px**.
> Gibt es kein 2:1, ist **16:9** (1,78) noch brauchbar — 13 % daneben, knapp innerhalb
> der Toleranz. **3:2** (1,50) ist es nicht mehr, und ein Hochformat schon gar nicht.
> Dies ist das einzige der fünf Formate, das ein Werkzeug wirklich haben muss.
>
> **Geliefert und angenommen (v30):** 1944 × 849, Inhalt 1882 × 739, also 2,55.
> Flacher als bestellt und damit ausdrücklich zugelassen — die Begründung steht in
> `art/roh/boss/README.md`. Nach oben ist dieses Format offen, nach unten nicht.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: a massive flying-wing drone carrier, nose pointing DOWN
toward the bottom edge of the frame, trailing edge and exhausts at the top edge.
Proportions: this is the single most important requirement. The wingspan is MORE THAN
TWICE the total depth from nose to trailing edge — an extremely wide, letterboxed,
panoramic composition. Think of a boomerang or a shallow arrowhead lying on its side, not
of a fighter jet. If it were placed inside a square frame it would fill only the middle
half of that square vertically.
Silhouette: one single blended flying wing — no separate tail, no fuselage break, no
cockpit bulge. The hull swells only slightly at the centre and stretches out into two very
long, gently swept wingtips that reach almost to the left and right frame edges. The
leading edge is a shallow arc, the trailing edge is nearly straight.
Armament: four rectangular drone launch bays set into the trailing edge with their hatches
half open, two small point-defence turrets flanking the central spine.
Surface: semi-realistic hard-surface military design, brushed gunmetal and slate blue
armour plating, visible panel seams, rivet lines, recessed intake grilles, weathered and
pitted leading edges.
Accents: amber navigation strips running along both wing edges, pale cyan light spilling
out of the open launch bays.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, clear directional shading across the wide plating, crisp specular
highlights on the leading edges.
Framing: centred, occupying about 96 percent of the frame in its longest direction. Leave a
clear empty transparent margin of about 2 percent of the frame on all four sides — no part
of the subject, not even a barrel tip or an antenna, may touch or be cut off by a frame
edge.
Background: fully transparent, no ground shadow, no sky, no clouds, no ground, no
vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
portrait composition, square composition, tall narrow composition, narrow wingspan,
delta wing, narrow delta, fighter jet, jet fighter, separate tail, tail fins, fuselage,
cockpit canopy, cropped wingtips, subject touching frame edge, cartoon, anime, cel shading, toy, plastic toy, thick outline, comic book, photorealistic
photograph, studio product render, background, sky, clouds, ground, terrain, shadow on
ground, vignette, frame, border, text, watermark, signature, red fuselage, crimson hull,
blurry, soft focus, upscaled, low detail, tilted view, three-quarter view, side view
```

---

### B-3 · LANZENTRÄGER → `boss_lanzentraeger.png`

> **Einstellung im Werkzeug, VOR dem Prompt:**
> Seitenverhältnis **0,65 : 1 hoch** (nächstliegende Voreinstellung: **2:3**),
> Größe **650 × 1000 px**.
> **Das ist das einzige Hochformat der fünf.** Nach zwei Querformaten hintereinander
> ist das die Stelle, an der eine Einstellung stehenbleibt — vor dem Absenden nachsehen,
> ob wirklich hoch eingestellt ist. **3:4** (0,75) geht auch, **9:16** (0,56) ist
> zu schmal.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: a narrow railgun frigate, nose pointing DOWN toward the
bottom edge of the frame, engine block at the top edge.
Proportions: a portrait composition — the ship is about one and a half times as long from
nose to stern as it is wide, and no more than that. Upright like a spearhead. It must NOT
become a needle, a pencil or a thin rod: this is a heavy, substantial warship that happens
to be narrow, not a sliver. Half the frame height is hull, and the hull has real bulk.
Silhouette: a lance-shaped hull, widest just behind the nose, tapering to a squared-off
engine block at the top. Two thin dorsal fins run along the aft third, and short stubby
sponsons bulge from the hull sides at mid-length — those sponsons and fins give the ship
its width and keep the silhouette from reading as a line.
Armament: one massive railgun rail running the entire length of the centreline, with
exposed copper coil segments, cooling fins and capacitor blocks; four small flanking
turrets sunk into recessed housings along the hull sides.
Surface: semi-realistic hard-surface military design, brushed gunmetal and cold grey
armour plating, visible panel seams, rivet lines, heat-stained plating around the rail,
worn edges.
Accents: amber status lights along the spine, faint blue-white glow between the copper
coil segments.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, clear directional shading and self-shadowing, crisp specular highlights
along the rail.
Framing: centred, occupying about 96 percent of the frame in its longest direction. Leave a
clear empty transparent margin of about 2 percent of the frame on all four sides — no part
of the subject, not even a barrel tip or an antenna, may touch or be cut off by a frame
edge.
Background: fully transparent, no ground shadow, no sky, no clouds, no ground, no
vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
landscape composition, wide composition, square composition, wide wingspan, large wings,
needle, pencil, thin rod, sliver, extremely elongated, spindly, fragile, cropped nose,
subject touching frame edge, cartoon, anime, cel shading, toy, plastic toy, thick outline, comic book, photorealistic
photograph, studio product render, background, sky, clouds, ground, terrain, shadow on
ground, vignette, frame, border, text, watermark, signature, red fuselage, crimson hull,
blurry, soft focus, upscaled, low detail, tilted view, three-quarter view, side view
```

---

### B-4 · RINGFESTUNG → `boss_ringfestung.png`

> **Einstellung im Werkzeug, VOR dem Prompt:**
> Seitenverhältnis **1 : 1 quadratisch**,
> Größe **1150 × 1150 px**.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: a circular orbital fortress platform seen from straight
above. It has no nose and no front — it is rotationally symmetric.
Proportions: exactly as wide as it is tall. A square composition, a perfect circle
inscribed in the frame.
Silhouette: a heavy armoured ring with an open centre; a smaller armoured core hangs in
the middle, held by four thin radial struts; the ring is segmented into eight armour
blocks with recessed maintenance channels between them.
Armament: eight identical turret emplacements spaced evenly around the ring, each with a
short stubby barrel pointing outward; a cluster of sensor domes on the central core.
Surface: semi-realistic hard-surface military structure, brushed gunmetal and dark
blue-grey armour plating, heavy panel seams, rivet rows, scorched and pitted plating,
exposed conduit runs along the struts.
Accents: amber warning lights on the turret housings, a pale cyan glow in the seams of the
central core.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, clear directional shading around the ring so the upper-left arc is bright
and the lower-right arc falls into shadow, the struts casting shadows onto the core.
Framing: centred, occupying about 96 percent of the frame in its longest direction. Leave a
clear empty transparent margin of about 2 percent of the frame on all four sides — no part
of the subject, not even a barrel tip or an antenna, may touch or be cut off by a frame
edge.
Background: fully transparent, the centre of the ring fully transparent as well, no ground
shadow, no sky, no clouds, no ground, no vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
portrait composition, landscape composition, oval, ellipse, filled centre, solid disc,
aircraft, wings, cartoon, anime, cel shading, toy, plastic toy, thick outline, comic book,
photorealistic photograph, studio product render, background, sky, clouds, ground,
terrain, shadow on ground, vignette, frame, border, text, watermark, signature, red hull,
crimson hull, blurry, soft focus, upscaled, low detail, tilted view, three-quarter view,
side view
```

---

### B-5 · AMBOSSKREUZER → `boss_ambosskreuzer.png`

> **Einstellung im Werkzeug, VOR dem Prompt:**
> Seitenverhältnis **1,30 : 1 quer** (nächstliegende Voreinstellung: **4:3**),
> Größe **1300 × 1000 px**.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: an enormous cruciform battlecruiser, nose pointing DOWN
toward the bottom edge of the frame, engine cluster at the top edge.
Proportions: slightly wider than tall — the cross arms span about one and a third times
the length of the spine. A landscape composition.
Silhouette: a cross — one long armoured spine with two wide cross arms reaching far to the
left and right at about one third of the length from the nose; the arms end in blunt
armoured caps, the stern in four recessed engine bells.
Armament: two large main gun batteries with twin barrels mounted on top of the cross arms,
three smaller hull turrets spaced along the spine, one heavy launcher tube set into the
nose.
Surface: semi-realistic hard-surface military design, brushed gunmetal and deep slate
armour plating in heavy overlapping layers, weld beams, exposed structural ribs, rivet
rows, armoured bulkheads, battle scarring and scorch marks.
Accents: amber floodlights in recessed wells along the spine, dull orange heat glow at the
engine bells.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, deep cast shadows between the armour layers and under the cross arms,
crisp specular highlights on the raised armour edges.
Framing: centred, occupying about 96 percent of the frame in its longest direction. Leave a
clear empty transparent margin of about 2 percent of the frame on all four sides — no part
of the subject, not even a barrel tip or an antenna, may touch or be cut off by a frame
edge.
Background: fully transparent, no ground shadow, no sky, no clouds, no ground, no
vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
portrait composition, tall narrow composition, cartoon, anime, cel shading, toy,
plastic toy, thick outline, comic book, photorealistic photograph, studio product render,
background, sky, clouds, ground, terrain, shadow on ground, vignette, frame, border,
text, watermark, signature, red fuselage, crimson hull, blurry, soft focus, upscaled,
low detail, tilted view, three-quarter view, side view
```

---

### Was `npm run bildpruefung` danach sagt

| Meldung | Bedeutung | Abhilfe |
|---|---|---|
| `Seitenverhaeltnis X statt Y` | Format war im Werkzeug nicht eingestellt | neu bestellen, Format zuerst |
| `Inhalt AxB, verlangt CxD` | zu klein geliefert, das Spiel rechnet hoch | in der Zielgroesse neu erzeugen |
| `selbst schon hochgerechnet` | kleines Bild aufgezogen statt gross erzeugt | nicht skalieren, neu erzeugen |
| `nur N Bildpunkte durchsichtiger Rand` | zu eng beschnitten | Leinwand ringsum vergroessern |
| `kein Alphakanal` | Hintergrund nicht durchsichtig | als PNG mit Transparenz ausgeben |

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
