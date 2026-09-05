# Skyfront — die vier offenen Bildaufträge

Stand v78. Fünf der neun Bilder sind geliefert und eingebaut; diese vier
fehlen. Jeder Block ist für sich vollständig.

---

## Warum diese vier fehlen

Vier Motive werden im Spiel derzeit **hochgerechnet**, weil das Quellbild zu
klein ist — und es sind ausgerechnet die zähesten, also die, die am längsten
im Bild stehen. Alles unter 0,6× gilt im Projekt als „weich im Bild".

| Auftrag | Quellbild heute | gebraucht | Faktor |
|---|---:|---:|---:|
| `e_elite` Elite-Jäger | 80 px | 216 px | **0,37×** — der schlimmste Fall im Spiel |
| `e_carrier` Schlachtträger | 125 px | 296 px | **0,42×** |
| `e_rotor` Rotor-Jäger | 71 px | 135 px | **0,53×** |
| `boss5` Ambosskreuzer | — | 1040 px | noch nie geliefert |
| *zum Vergleich:* `e_lanzenwache` | 180 px | 180 px | 1,00× |

---

## Blatt, Schiff, Rand — die Tabelle

Das **Schiff** trägt das Verhältnis, das **Blatt** darf leer bleiben.

| Auftrag | Blatt | Schiff im Bild | Verhältnis | Rand oben/unten |
|---|---|---|---:|---|
| `boss5` Ambosskreuzer | 1536 × 1024 | ca. 1444 × 802 | 1,80 | je ca. 111 px |
| `e_elite` Elite-Jäger | 1024 × 1024 | ca. 963 × 770 | 1,25 | je ca. 127 px |
| `e_carrier` Schlachtträger | 1536 × 1024 | ca. 1444 × 741 | 1,95 | je ca. 142 px |
| `e_rotor` Rotor-Jäger | 1024 × 1024 | ca. 963 × 868 | 1,11 | je ca. 78 px |

Links und rechts bleiben jeweils rund 3 % der Blattbreite leer.

---

## Was bisher abgelehnt wurde, und warum

Damit dieselben Fehler nicht wiederkommen.

**Ringfestung, erster Anlauf:** 325 × 570, Inhalt 313 px breit statt 904.
Zu klein (2,89× Hochrechnen), falsches Format (0,57 hoch statt 1,00
quadratisch), falsches Motiv (ein Rad mit Nabe statt eines Rings mit offener
Mitte). Am rechten Rand ein angeschnittenes zweites Objekt — das Bild war aus
einem Sammelblatt geschnitten.

**Ambosskreuzer, erster Anlauf:** 366 × 610, Inhalt 353 px statt 1024.
Zu klein, Format daneben (0,60 hoch statt quer).

**Ambosskreuzer, zweiter Anlauf:** Format diesmal **richtig** (gemessen 1,32
bei bestellten 1,30, Inhalt 1399 × 1061, Rand vorhanden). Trotzdem abgelehnt:
die Querarme trugen nur **24 %** der Höhe, der Rest war Rumpf — 34 % Heck,
42 % Bug. *Ein Seitenverhältnis sagt nur, wie das Rechteck steht, nichts über
die Verteilung innerhalb der Silhouette.*

**Ambosskreuzer, dritter Anlauf:** Arme auf geschätzte 39 %, Form deutlich
näher. Zwei Reste: der Bug lief als lange Spitze aus (geschätzt 37 % statt
höchstens 25 %), und der Hintergrund war weiß statt durchsichtig.

---

## Woran die Lieferung gemessen wird

`npm run bildpruefung` prüft vier Dinge am gelieferten PNG:

| Prüfung | Schwelle |
|---|---|
| Inhaltsgröße | ≥ Soll, sonst wird im Spiel hochgerechnet |
| Seitenverhältnis **des Inhalts** | ± 15 % — hoch statt quer fällt durch |
| echtes Detail | halbieren und wieder aufziehen; geht dabei zu wenig verloren, war das Bild schon hochgerechnet |
| durchsichtiger Rand | ≥ 6 Bildpunkte ringsum |
| Alphakanal | muss vorhanden sein — „freigestellt heißt durchsichtig, nicht weiß" |

Danach wird jede Lieferung **von Hand in voller Auflösung angesehen**,
Verdachtsstellen fünffach vergrößert, wegen der Hoheitszeichen.

---

# AUFTRAG 1 · boss5 · AMBOSSKREUZER

**Blatt 1536 × 1024 · Schiff ca. 1444 × 802 (1,80) · Rand oben und unten je ca. 111 px**

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: an enormous anvil-shaped cruciform battlecruiser, nose
pointing DOWN toward the bottom edge of the frame, engine block at the top edge.

PROPORTIONS — read this before anything else and let it override any instinct to draw a
long ship. This is a WIDE, LOW, MASSIVE slab. The ship is about one and four fifths as
wide as it is tall. Divide the ship's height into four equal parts from top to bottom:
  · the engine block occupies at most ONE part,
  · the cross arms occupy at least TWO parts — they are the dominant mass of the ship,
  · the nose occupies at most ONE part.
If in doubt, make the arms deeper and the nose shorter. There is no long fuselage.

THE NOSE is a blunt chisel, not a spearhead: a short broad wedge whose tip is cut off flat
across, so the bottom edge of the ship is a wide straight line, not a point. It must look
like a battering ram built to smash, never like a blade.

Silhouette: an ANVIL, and it must read as a broad anvil at a glance, even at thumbnail
size. Two enormously deep, thick armoured arms run straight out to the left and to the
right — perfectly horizontal, not swept, not tapering — each ending in a blunt squared-off
armoured cap as deep as the arm itself. Between them sits a broad slab-sided central hull.
The four notches where arms meet hull are shallow and square, just deep enough for the
cross to read, never deep cuts that leave a thin spine.

HOW TO MAKE IT LOOK MASSIVE AND HANDSOME — restraint, not more detail. Build it to read at
three distances: from far away one bold silhouette; at middle distance four or five large
armoured masses; only close up the seams and rivets. Use large calm armour plates separated
by few but very deep, almost black shadow gaps. Do NOT cover the hull in an even carpet of
small boxes, pipes and greebles — many small parts read busy and light, a few huge parts
read heavy. Give every major plate a wide chamfered bevel along its edge so the key light
catches a bright hard line there; those bright edges against the near-black gaps are what
make metal look solid.

Value and material: near-black in the recessed gaps, mid-tone cold rolled steel on the flat
plates, bright cool highlights on the top chamfers. Darker blued and burnt steel on the arm
caps, the armour belts and the engine block; lighter steel on the central hull plates.
Weathering restrained and purposeful: soot streaks trailing back from the engine bells,
rust bleeding from a few rivet lines, impact scoring on the leading armour, worn bare metal
on the chamfered edges.

Armament: two large main gun batteries with twin barrels mounted on top of the cross arms,
three smaller hull turrets spaced across the central hull, one heavy launcher tube set into
the blunt nose. Keep the barrels short and thick.

COLOUR RESTRICTION: no large glowing red or orange surface, and no glowing white or cyan
lines, strips or fields. Those two colour bands are reserved for projectiles in this game.
Glow is limited to a handful of small recessed amber point lights and a dull orange heat
ring deep inside the engine bells.

Lighting: one strong key light from the upper left at 45 degrees, soft cool ambient fill
from the lower right, deep cast shadows between the armour layers and under the cross arms,
crisp specular highlights on the raised armour edges.

Framing: the ship is centred and spans about 94 percent of the frame width. Above and below
the ship the frame stays empty and transparent. Nothing may touch or be cut off by a frame
edge — not a barrel tip, not an antenna.

OUTPUT: PNG with a real alpha channel, background fully transparent.

Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
white background, solid background, opaque background, filled background, grey background,
sky background, no alpha, flattened image, drop shadow on background,
long fuselage, long hull, elongated ship, long pointed nose, pointed prow, long tapering
bow, spearhead, arrowhead, dagger shape, sword shape, long stern, thin spine, narrow spine,
slender hull, tall cross, tall narrow composition, portrait composition, square composition,
thin arms, tapering arms, swept wings, delta wing, flying wing, wide wingspan, oval hull,
busy greebles, greeble carpet, uniform small detail, cluttered surface, tiny pipes,
low contrast, flat lighting, washed out,
glowing red panels, glowing orange panels, large red glow, neon strips, glowing white lines,
cyan glow, energy field,
subject touching frame edge, cropped barrel, cartoon, anime, cel shading, toy, plastic toy,
thick outline, comic book, photorealistic photograph, studio product render, ground,
terrain, clouds, vignette, frame, border, text, watermark, signature, stencil lettering,
serial number, insignia, emblem, badge, heraldry, crest, national marking, roundel,
swastika, hooked cross, iron cross, runes, military decal, painted symbol, logo on hull,
blurry, soft focus, upscaled, low detail, tilted view, three-quarter view, side view
```

---

# AUFTRAG 2 · e_elite · ELITE-JÄGER

**Blatt 1024 × 1024 · Schiff ca. 963 × 770 (1,25) · Rand oben und unten je ca. 127 px**
*Im Spiel 108 × 86 Weltpunkte. Eine Stufe schlichter als ein Boss.*

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: an elite heavy fighter, nose pointing DOWN toward the bottom
edge of the frame, engine nozzles at the top edge.
Proportions: the aircraft is about one and a quarter times as wide as it is long. A
compact, dense shape, not a long one.
Silhouette: an aggressive forward-swept arrowhead. A short broad fuselage with a narrow
armoured cockpit spine, two wings swept sharply forward from the tail toward the nose, and
two canted tail fins. The outline must read as one clean angular shape at a glance.
Armament: two cannon barrels flush in the wing roots, two missile rails under the wings.
Surface: semi-realistic hard-surface military design, brushed gunmetal and blue-grey
armour plating, visible panel seams, a few rivet lines, worn leading edges. Keep the detail
restrained — this is a fighter, not a capital ship. Large calm plates, few but deep dark
seams, chamfered edges catching the key light.
Accents: amber running lights at the wingtips, a deep bronze heat ring around each engine
nozzle.
COLOUR RESTRICTION: no large glowing red or orange surface, no glowing white or cyan lines
or strips. Those two colour bands are reserved for projectiles in this game.
Lighting: one strong key light from the upper left at 45 degrees, soft cool ambient fill
from the lower right, clear directional shading across the plating.
Framing: centred, spanning about 94 percent of the frame width, empty transparent frame
above and below. Nothing may touch or be cut off by a frame edge.
OUTPUT: PNG with a real alpha channel, background fully transparent.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
white background, solid background, opaque background, no alpha, flattened image,
portrait composition, tall narrow composition, long fuselage, airliner, bomber, capital
ship, over-detailed, busy greebles, greeble carpet, cluttered surface, low contrast,
glowing red panels, glowing orange panels, glowing white lines, cyan glow, neon strips,
subject touching frame edge, cartoon, anime, cel shading, toy, plastic toy, thick outline,
comic book, photorealistic photograph, studio product render, ground, terrain, clouds,
shadow on ground, vignette, frame, border, text, watermark, signature, stencil lettering,
insignia, emblem, badge, heraldry, crest, national marking, roundel, swastika, hooked
cross, iron cross, runes, military decal, painted symbol, logo on hull, red fuselage,
crimson hull, blurry, soft focus, upscaled, low detail, tilted view, three-quarter view,
side view
```

---

# AUFTRAG 3 · e_carrier · SCHLACHTTRÄGER

**Blatt 1536 × 1024 · Schiff ca. 1444 × 741 (1,95) · Rand oben und unten je ca. 142 px**
*Im Spiel 148 × 76 Weltpunkte. Eine Stufe schlichter als ein Boss.*

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: a battle carrier, nose pointing DOWN toward the bottom edge
of the frame, engine block at the top edge.
Proportions: nearly twice as wide as it is deep — a broad, flat, letterboxed shape. Wide
and shallow, never square.
Silhouette: a wide armoured slab with a blunt nose, two heavy outboard hull sponsons that
give it its width, and a low central superstructure. Two open launch bays are cut into the
rear face. The outline is boxy and heavy — it should read as a floating fortress, not as
an aircraft.
Armament: four short turret stubs along the front edge, two point-defence mounts on the
superstructure.
Surface: semi-realistic hard-surface military design, brushed gunmetal and slate grey
armour plating in large flat panels, visible seams, rivet rows, scorch marks near the
launch bays, worn edges. Large readable panels, not fine greebling — few but very deep dark
seams, wide chamfered edges catching the key light.
Accents: small amber deck lights along both long edges, dull orange glow deep inside the
launch bays.
COLOUR RESTRICTION: no large glowing red or orange surface, no glowing white or cyan lines
or strips. Those two colour bands are reserved for projectiles in this game.
Lighting: one strong key light from the upper left at 45 degrees, soft cool ambient fill
from the lower right, the sponsons casting shadow onto the hull.
Framing: centred, spanning about 94 percent of the frame width, empty transparent frame
above and below. Nothing may touch or be cut off by a frame edge.
OUTPUT: PNG with a real alpha channel, background fully transparent.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
white background, solid background, opaque background, no alpha, flattened image,
portrait composition, square composition, tall narrow composition, slender fighter,
swept wings, delta wing, over-detailed, busy greebles, greeble carpet, cluttered surface,
low contrast, glowing red panels, glowing orange panels, glowing white lines, cyan glow,
neon strips, subject touching frame edge, cartoon, anime, cel shading, toy, plastic toy,
thick outline, comic book, photorealistic photograph, studio product render, ground,
terrain, clouds, shadow on ground, vignette, frame, border, text, watermark, signature,
stencil lettering, insignia, emblem, badge, heraldry, crest, national marking, roundel,
swastika, hooked cross, iron cross, runes, military decal, painted symbol, logo on hull,
red hull, crimson hull, blurry, soft focus, upscaled, low detail, tilted view,
three-quarter view, side view
```

---

# AUFTRAG 4 · e_rotor · ROTOR-JÄGER

**Blatt 1024 × 1024 · Schiff ca. 963 × 868 (1,11) · Rand oben und unten je ca. 78 px**
*Im Spiel 67 × 61 Weltpunkte. Eine Stufe schlichter als ein Boss.*

```
Top-down orthographic view, camera directly overhead, no perspective distortion, no tilt,
no vanishing point. Subject: an armoured gunship helicopter, nose pointing DOWN toward the
bottom edge of the frame, tail boom at the top edge.
Proportions: almost as tall as it is wide — a compact, roughly square shape. The rotor is
what makes it square.
Silhouette: a stubby armoured fuselage with a short tail boom, and above it a four-blade
main rotor seen from directly overhead — four straight blades at right angles, drawn as
SOLID BLADES, never as a blur disc. The blades reach almost to the edges of the ship's
footprint and define the outline; the hull sits compactly in the middle.
Armament: a chin turret under the nose, two stub wings with rocket pods.
Surface: semi-realistic hard-surface military design, brushed gunmetal and olive-grey
armour plating, visible panel seams, rivet lines, exhaust staining behind the engine
housing, worn edges. Keep the detail restrained — large calm plates, few but deep dark
seams, chamfered edges catching the key light.
Accents: small amber navigation lights on the stub wings.
COLOUR RESTRICTION: no large glowing red or orange surface, no glowing white or cyan lines
or strips, and no red beacon. Those two colour bands are reserved for projectiles in this
game.
Lighting: one strong key light from the upper left at 45 degrees, soft cool ambient fill
from the lower right, the rotor blades casting soft shadows onto the hull below them.
Framing: centred, spanning about 94 percent of the frame width, empty transparent frame
above and below. No blade tip may touch or be cut off by a frame edge.
BACKGROUND: fully transparent — and the four gaps BETWEEN the rotor blades are background
too and must be fully transparent, not filled.
OUTPUT: PNG with a real alpha channel.
Rendering: sharp crisp native detail at full resolution, instantly readable as a
silhouette.
```

**Negativ:**
```
white background, solid background, opaque background, no alpha, flattened image,
filled rotor disc, motion blur, blurred rotor, rotor disc, translucent disc, spinning blur,
two blades, portrait composition, landscape composition, fixed-wing aircraft, jet,
over-detailed, busy greebles, greeble carpet, cluttered surface, low contrast,
cropped blades, glowing red panels, glowing orange panels, red beacon, glowing white lines,
cyan glow, neon strips, subject touching frame edge, cartoon, anime, cel shading, toy,
plastic toy, thick outline, comic book, photorealistic photograph, studio product render,
ground, terrain, clouds, shadow on ground, vignette, frame, border, text, watermark,
signature, stencil lettering, insignia, emblem, badge, heraldry, crest, national marking,
roundel, swastika, hooked cross, iron cross, runes, military decal, painted symbol,
logo on hull, blurry, soft focus, upscaled, low detail, tilted view, three-quarter view,
side view
```
