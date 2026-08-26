# Bildaufträge — die drei weichen Gegner

**Alle Maße hier sind gemessen, nicht geschätzt.** Die Messstelle ist
`npm run formen`, Zielgerät iPhone 390 × 844 bei 2,77 Bildpunkten je
Anzeigepunkt.

---

## 1. Warum diese drei

Von vierzehn Gegnerarten werden drei auf dem Gerät **hochgerechnet** — und
es sind ausgerechnet die drei zähesten, also die, die am längsten im Bild
stehen. Seit v36 sind sie noch zäher: 78, 104 und 156 Trefferpunkte.

| | Quellbild | gebraucht | Faktor | |
|---|---:|---:|---:|---|
| `elite` Elite-Jäger | 80 px | 216 px | **0,37×** | der schlimmste Fall im Spiel |
| `carrier` Schlachtträger | 125 px | 295 px | **0,42×** | |
| `rotor` Rotor-Jäger | 71 px | 135 px | **0,53×** | |
| *zum Vergleich:* `lanzenwache` | 180 px | 180 px | **1,00×** | seit v34 |

Das Formentor nennt alles unter **0,6×** „weich im Bild". Die Lanzenwache
steht mit 1,00× daneben und macht den Abstand sichtbar.

Das ist der letzte offene Punkt aus SKY-050, und er ist seit Monaten
blockiert — nicht am Code, sondern an den Bildern.

---

## 2. Was für alle drei gilt

Dieselben Regeln wie bei den Bossen, sie haben sich bewährt:

1. **Zuerst das Format im Werkzeug einstellen**, dann den Prompt einsetzen.
   Die Pixelzahl im Prompttext setzt die Ausgabegröße nicht.
2. **Nase nach UNTEN.** `npm run einbau` dreht das Bild beim Einbacken, das
   Spiel dreht es zurück — das eingebackene Licht landet wieder oben links,
   wo der Schattenversatz (+7, +12) es verlangt.
3. **Licht von oben links**, 40–50°.
4. **PNG mit Alphakanal**, freigestellt, Rand ringsum, keine Schrift.
5. **Groß bestellen.** Die Zielgröße macht `npm run einbau`; wer klein
   liefert, wird von der Sperre abgewiesen (seit SKY-233).

Ablage: `art/roh/gegner/`. Danach `npm run bildpruefung`, dann
`npm run einbau`.

**Stil — verbindlich, wie bei den Bossen:** halbrealistisch, leicht
stilisiert, plastisch und dreidimensional wirkend, technisch glaubwürdig,
modern, erwachsen. Gebürstetes Metall mit sichtbaren Panelfugen,
Nietenreihen, Hitzeverfärbung an den Düsen, abgenutzten Kanten.

**Aber eine Stufe schlichter als die Bosse.** Ein Gegner, der so viel
Detail trägt wie ein Boss, nimmt dem Boss den Auftritt — und bei 78
Anzeigepunkten Breite ist die Hälfte davon ohnehin nicht zu sehen. Die
Silhouette muss auf einen Blick lesbar sein, nicht die Nietenreihe.

---

## G-1 · ELITE-JÄGER → `gegner_elite.png`

> **Erst im Werkzeug einstellen:** Seitenverhältnis **1,25 : 1 quer**
> (nächstliegende Voreinstellung: **4:3**), Größe **1280 × 960 px**.
> Im Spiel: 108 × 86 Weltpunkte, Textur 216 × 173.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: an elite heavy fighter, nose pointing DOWN toward the bottom
edge of the frame, engine nozzles at the top edge.
Proportions: slightly wider than tall — the wingspan is about one and a quarter times the
length from nose to tail. A compact, dense shape, not a long one.
Silhouette: an aggressive forward-swept arrowhead. A short broad fuselage with a narrow
armoured cockpit spine, two wings swept sharply forward from the tail toward the nose, and
two canted tail fins. The outline must read as one clean angular shape at a glance.
Armament: two cannon barrels flush in the wing roots, two missile rails under the wings.
Surface: semi-realistic hard-surface military design, brushed gunmetal and blue-grey
armour plating, visible panel seams, a few rivet lines, worn leading edges. Keep the
detail restrained — this is a fighter, not a capital ship.
Accents: amber running lights at the wingtips, a deep bronze heat ring around each engine
nozzle.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, clear directional shading across the plating.
Framing: centred, occupying about 96 percent of the frame in its longest direction. Leave
a clear empty transparent margin of about 2 percent on all four sides — nothing may touch
or be cut off by a frame edge.
Background: fully transparent, no ground shadow, no sky, no clouds, no ground, no
vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
portrait composition, tall narrow composition, long fuselage, airliner, bomber, capital
ship, over-detailed, busy greebles, subject touching frame edge, cartoon, anime,
cel shading, toy, plastic toy, thick outline, comic book, photorealistic photograph,
studio product render, background, sky, clouds, ground, terrain, shadow on ground,
vignette, frame, border, text, watermark, signature, red fuselage, crimson hull, blurry,
soft focus, upscaled, low detail, tilted view, three-quarter view, side view
```

---

## G-2 · SCHLACHTTRÄGER → `gegner_carrier.png`

> **Erst im Werkzeug einstellen:** Seitenverhältnis **1,95 : 1 sehr breit**
> (nächstliegende Voreinstellung: **2:1**), Größe **1200 × 600 px**.
> Im Spiel: 148 × 76 Weltpunkte, Textur 295 × 151.
> Nach einem Querformat ist das der Punkt, an dem eine Einstellung
> stehenbleibt — vor dem Absenden nachsehen.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: a battle carrier, nose pointing DOWN toward the bottom edge
of the frame, engine block at the top edge.
Proportions: nearly twice as wide as it is deep — a broad, flat, letterboxed shape. Wide
and shallow, not square.
Silhouette: a wide armoured slab with a blunt nose, two heavy outboard hull sponsons that
give it its width, and a low central superstructure. Two open launch bays are cut into the
rear face. The outline is boxy and heavy — it should read as a floating fortress, not as
an aircraft.
Armament: four short turret stubs along the front edge, two point-defence mounts on the
superstructure.
Surface: semi-realistic hard-surface military design, brushed gunmetal and slate grey
armour plating in large flat panels, visible seams, rivet rows, scorch marks near the
launch bays, worn edges. Keep the detail restrained — large readable panels, not fine
greebling.
Accents: amber deck lights along both long edges, dull orange glow inside the launch bays.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, clear directional shading, the sponsons casting shadow onto the hull.
Framing: centred, occupying about 96 percent of the frame width. Leave a clear empty
transparent margin of about 2 percent on all four sides — nothing may touch or be cut off
by a frame edge.
Background: fully transparent, no ground shadow, no sky, no clouds, no ground, no
vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
portrait composition, square composition, tall narrow composition, slender fighter,
swept wings, delta wing, over-detailed, busy greebles, subject touching frame edge,
cartoon, anime, cel shading, toy, plastic toy, thick outline, comic book, photorealistic
photograph, studio product render, background, sky, clouds, ground, terrain, shadow on
ground, vignette, frame, border, text, watermark, signature, red hull, crimson hull,
blurry, soft focus, upscaled, low detail, tilted view, three-quarter view, side view
```

---

## G-3 · ROTOR-JÄGER → `gegner_rotor.png`

> **Erst im Werkzeug einstellen:** Seitenverhältnis **1,11 : 1, also fast
> quadratisch** (nächstliegende Voreinstellung: **1:1**), Größe
> **1024 × 1024 px**.
> Im Spiel: 67 × 61 Weltpunkte, Textur 135 × 121.

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: an armoured gunship helicopter, nose pointing DOWN toward the
bottom edge of the frame, tail boom at the top edge.
Proportions: almost as tall as it is wide — a compact, roughly square shape. The rotor
disc is what makes it square.
Silhouette: a stubby armoured fuselage with a short tail boom, and above it a four-blade
main rotor seen from directly overhead — four straight blades at right angles, drawn as
solid blades, not as a blur disc. The blades reach almost to the frame edges and define
the outline; the hull sits compactly in the middle.
Armament: a chin turret under the nose, two stub wings with rocket pods.
Surface: semi-realistic hard-surface military design, brushed gunmetal and olive-grey
armour plating, visible panel seams, rivet lines, exhaust staining behind the engine
housing, worn edges. Keep the detail restrained.
Accents: amber navigation lights on the stub wings, a small red beacon on the spine.
Lighting: one strong key light from the upper left at 45 degrees, soft ambient fill from
the lower right, the rotor blades casting soft shadows onto the hull below them.
Framing: centred, occupying about 96 percent of the frame. Leave a clear empty transparent
margin of about 2 percent on all four sides — no blade tip may touch or be cut off by a
frame edge.
Background: fully transparent — the gaps between the four rotor blades are background too
and must be fully transparent. No ground shadow, no sky, no clouds, no ground, no
vignette, no frame, no text, no logos.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
motion blur, blurred rotor, rotor disc, translucent disc, spinning blur, two blades,
portrait composition, landscape composition, fixed-wing aircraft, jet, over-detailed,
busy greebles, cropped blades, subject touching frame edge, cartoon, anime, cel shading,
toy, plastic toy, thick outline, comic book, photorealistic photograph, studio product
render, background, sky, clouds, ground, terrain, shadow on ground, vignette, frame,
border, text, watermark, signature, blurry, soft focus, upscaled, low detail, tilted view,
three-quarter view, side view
```

---

## 3. Nach der Lieferung

```
npm run bildpruefung    Seitenverhältnis, Rand, Detail, offene Mitte
npm run einbau          auf Zielgröße backen, in assets.js
npm run formen          der Faktor muss auf 1,00 stehen
```

`npm run einbau` braucht für die drei je einen Eintrag mit Platz und
Weltbreite (108, 148, 67). Die Plätze hängen hinten an — eiserne Regel 9:
ein Eintrag in `assets.js` darf geleert, aber nie entfernt werden.

**Der Bildboden in `tools/formen.mjs` muss mit.** Heute stehen dort die
alten Werte (80, 125, 71). Wer die Bilder tauscht und den Boden stehen
lässt, hat ein Tor, das den alten Stand als Soll führt — genau der Fehler,
der bis v19 unbemerkt blieb.
