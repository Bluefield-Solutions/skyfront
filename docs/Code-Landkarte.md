# Skyfront — Code-Landkarte für `src/app.js`

So findest du dich im rekonstruierten Spielcode zurecht. Der Code ist
minifiziert (kryptische Namen wie `tt`, `pe`, `en`), aber die **Werte,
Tabellen und deutschen Texte sind vollständig lesbar** — und genau da wird
Balance und Inhalt eingestellt.

> **Wichtig zur Bedienung:** Zeilennummern verschieben sich, sobald du
> editierst. Nutze deshalb immer den **Suchtext** (die „Anker") zum Springen,
> nicht die Nummer. Nummern sind nur die grobe Orientierung (Stand: aktueller
> Build). Nach jeder Änderung: `node build.mjs` → neue `Skyfront.html`.

> **Zuerst `src/balance.js` probieren.** Die häufigsten Kernwerte (Spieler-HP,
> Feuertakt, Gegner-Schaden, Schwierigkeit, Gegner-HP) lassen sich dort an
> EINER Stelle einstellen — der Build spielt sie automatisch in `app.js` ein.
> Diese Landkarte brauchst du für alles darüber hinaus.

---

## Der zentrale Konfig-Block (ca. Zeile 54310–54700)

Fast alle Stellschrauben liegen dicht beieinander in einer großen
`const …, … , … =` -Kette. Reihenfolge von oben nach unten:

| Anker (Suchtext) | Was es ist | Wichtige Felder |
|---|---|---|
| `J = 540,` / `rt = 960` | Spielfeld-Maße (logisch) | Breite 540, Höhe 960 |
| `Ft = {` | **Spieler-Flugzeug Basiswerte** | `fireEveryMs:135`, `bulletSpeed:780`, `maxHp:100`, `hitInvulnMs:1000`, `shieldMs:6000`, `bombStart:1`, `bombMax:3`, `maxPower:10` |
| `_t = {` | **Gegner-Generik** | `touchDamage:20`, `bulletSpeed:300`, `bulletDamage:11` |
| `pe = {` | **Spieler-Upgrade-Bahnen** (Hangar) | `power` (Feuerkraft, max 10), `hp` (Hülle, +25/Stufe), `bomb`, `wingman` — je mit `base`/`step` (Goldkosten) |
| `We = (T,R)=>` | **Kostenformel** für pe-Upgrades | Feuerkraft = `120·1.5^R`, sonst `base + step·R` |
| `bt = {` | **Panzerung** (Workshop) | `front` (−Kugelschaden), `rear` (−Kollision), `wing` (+30 HP), `core` (−Boss-Laser) |
| `Qt = {` | **Schwierigkeitsgrade** | easy/normal/hard mit `enemyDmg`, `enemyHp`, `fireRate`, `reward`, `firstClear` |
| `Xe = {` | **Schwierigkeit → Spawn** | `countMul`, `gapMul`, `extraWaves`, `bossBeam`, `bossExtraBullets`, `bossBeamGap` |
| `Jt = {` | **Hauptwaffen** | Streufächer, Fokus-Strahl, Schwere Kanone, Laser (`unlockCost`) |
| `It = {` | **Spezial-Systeme (Gadgets)** | EMP, Schild, Napalm, Drohnen, Reparatur, Ketten-Blitz — je `cd` (Cooldown ms), `unlockCost` |
| `Fe = {` | **Sekundär-Systeme** | Keine, Seitengeschütze … (aufrüstbarer Zweitschuss) |

Merksätze:
- **Spieler leichter/stärker machen:** `Ft.maxHp` hoch, `Ft.fireEveryMs`
  runter (kleiner = schneller feuern).
- **Spiel insgesamt leichter:** in `Qt` die `enemyDmg`/`enemyHp` senken oder
  in `Xe` `countMul` senken.
- **Preise im Shop:** `pe.*.base`/`step` (Upgrades) und die `unlockCost` in
  `Jt`/`It`/`Fe`.

---

## Gegnertypen — Werte (Anker: `grunt: {`, ca. Zeile 54698)

Objekt mit allen Gegnertypen. Jeder Eintrag:
`hp`, `speed`, `scale`, `tint`, `score`, `fireEvery` (ms, 0 = feuert nicht),
`pattern` (Schussmuster: `aim1`, `side2`, `spread3`, `burst3`, `none` …),
`drop` (Item-Chance), `cls` (S/M/L), `role` (dt. Anzeigename), `bullet`
(Geschosstyp).

Vorhandene Typen: `grunt, weaver, kamikaze, bomber, gunship, rocketeer,
elite, strafer, arcer, sniper, scout, carrier, rotor` u. a.

Beispiel — Standard-Gegner zäher machen: bei `grunt:` das `hp: 3` erhöhen.

**Einflug-/Anflug-Verhalten** (Anker: zweites `grunt: {`, ca. Zeile 60798):
separate Tabelle mit `dur`, `vy0`, `style` (`straight`/`bank`/`swoop`/`arc`),
`amp` — steuert, *wie* der Typ ins Bild fliegt (nicht seine Kampfwerte).

---

## Level-/Stage-Tabelle (Anker: `const en = [{`, ca. Zeile 56271)

Das Herz des Leveldesigns: **120 Level in 12 Biom-Gruppen à 10** (Stadt,
Felder, Wüste, Alpen, Gewitter, Wüstenplanet, Lavaplanet, Schnee, Eisplanet,
Regenwald, Weltraumstation, Biolumineszenz). Reihenfolge im Array = Spiel-
Reihenfolge; erstes Level „Stadt 1".

Felder je Level:

| Feld | Bedeutung |
|---|---|
| `label` | Anzeigename („Gewitter 3") |
| `bg` | Hintergrund-Textur-Key (`bg_thunder_03`) → siehe Farbpaletten unten |
| `sky` / `skyAlpha` | Himmelsfarbe + Deckkraft |
| `cloud` | Wolkendichte |
| `boss` | Boss-Variante (0 = keiner) |
| `intensity` | ⚠️ **wird beim Aufbau ignoriert/überschrieben** — siehe Kasten unten |
| `pool` | **Liste der erlaubten Gegnertypen** in diesem Level |
| `corridor` | (optional) enger Korridor-Modus |

> **Wichtig — was die Level-Schwierigkeit WIRKLICH steuert:** Nicht das
> `intensity`-Feld! Beim Aufbau (`const Ut = en.map((T, R) => …)`, ca. Zeile
> 57454) setzt das Spiel `intensity: E` mit `E = R + 1` — also schlicht die
> **Position im Array (Level-Nummer)**. Ein von Hand gesetztes `intensity`
> hat keinen Effekt. Der echte Schwierigkeits-Hebel ist die **Wellen-Funktion
> `tn`** (siehe eigener Abschnitt unten) bzw. die **Kurve in `balance.js`**.

Beispiel — Level früher einfacher: bei „Stadt 1…5" den `pool` auf wenige
leichte Typen kürzen (das wirkt, da `pool` echt genutzt wird). `intensity`
zu ändern bringt dagegen nichts.

---

## Wie Wellen entstehen — `tn` und `Si` (entschlüsselt)

Der Angriff eines Levels wird in zwei Schritten gebaut. Beide bekommen als
Schwierigkeits-Zahl den **Level-Index** (nicht das `intensity`-Feld).

### 1) `tn(T, pool)` — die Grund-Wellen (Anker: `function tn(`, ca. Zeile 57224)

Baut die Basis-Wellenliste eines Levels. `T` = Level-Nummer, `pool` = die
erlaubten Gegnertypen. Die wichtigsten Zeilen:

- **Anzahl der Wellen:** `I = 34 + Math.floor(b * 1.1)` mit
  `b = T <= 50 ? T : 50 + (T - 50) * .5` (oberhalb Level 50 wächst es langsamer).
  Mehr Wellen = härteres Level. **Das ist der Haupt-Schwierigkeitshebel.**
- **Abstand zwischen Wellen:** `n = Math.max(1050, 2150 - T * 45 - …)` —
  höheres `T` = engere Abstände = hektischer.
- **Gegner pro Welle:** skaliert mit `T` (z. B. `elite` erst ab Level 8 zu zweit).
- **Formation:** aus der Liste `Ti` (`row, vWedge, arc, sideSweep, stream`).

> Beide Formeln (`34 + Math.floor(b * 1.1)` und `2150 - T * 45`) sind über den
> **`curve`-Block in `balance.js`** einstellbar — der Build ersetzt sie beim
> Bauen. So formst du die „früh leichter, spät härter"-Kurve, ohne app.js
> anzufassen.

### 2) `Si(waves, gradMods, E)` — die Schwierigkeits-Schicht (Anker: `function Si(`, ca. Zeile 56188)

Nimmt die Grund-Wellen und legt den **Schwierigkeitsgrad** darüber
(`gradMods` = ein Eintrag aus `Xe`, siehe Konfig-Block):

- **Typen-Tausch:** `mix: "light"` ersetzt Gegner über die Tabelle `xi` durch
  leichtere, `mix: "heavy"` über `yi` durch schwerere.
- **Menge/Tempo:** `count * countMul`, Abstände `* gapMul`.
- **Zusatzwellen:** `extraWaves` hängt weitere an; ihre Stärke wächst mit dem
  Level (`count = 2 + Math.floor(E / 4)`).

Zusammengesetzt werden beide in `const Ut = en.map(…)` (ca. 57454):
`waves = tn(E, pool)`, danach zur Laufzeit `Si(waves, gradMods, E)`.

---

## Hintergrund-Farbpaletten (Anker: `const pi = {`, ca. Zeile 55932)

Objekt `bg_ocean`, `bg_storm`, `bg_night`, `bg_volcano`, `bg_ice` … mit je
`top`/`mid`/`bot` (Verlaufsfarben als Hex-String), `wave`, `foam`. Hier
änderst du das **Aussehen eines Bioms** (z. B. Wüste wärmer tönen). Der
`bg`-Key eines Levels verweist auf den Präfix dieser Paletten.

---

## Menü, Shop & Upgrade-Logik

| Anker | Ort |
|---|---|
| `label: "Hangar"` / `"Weltkarte"` / `"Optionen"` (ca. 58556) | Hauptmenü-Struktur |
| `Ve = {` (ca. 60295) | **Modul-Kategorien** Waffe/Panzer/System |
| `je = {` (ca. 60320) | **Modul-Sets** (Brandsatz-Set …) mit Boni |
| `yn = ["common","rare","epic","legendary"]` | Modul-Seltenheiten |
| `label: "Feuerkraft +1"` / `"Hülle +25 HP"` (ca. 59024) | **Upgrade-Empfehlungs-Logik** im Hangar (welches Upgrade vorgeschlagen wird) |

---

## Der Level-Modifikator (`src/modifier.js`)

Separate, gut lesbare Datei (v5) — die optischen Stimmungen (Nacht, Sturm,
Dämmerung, Nebel, Auto, Zufall). Wird von `build.mjs` automatisch als
`<script>` hinter das Spiel gehängt. Für rein optische Weiterentwicklung ist
das der bequeme, minifizierungssichere Ort. Details siehe Kopf der Datei.

---

## Zwei Kürzel, die man kennen sollte

- **`tt`** (definiert bei `tt = Nt(Li)`, ca. Zeile 54311) = das **Phaser-
  Modul**. `new tt.Game(...)` erzeugt das Spiel (dort ist auch der
  `window.__game=`-Patch für den Modifikator).
- **`__SKFA[n]`** = die **ausgelagerten Assets** (Bilder/Sounds) aus
  `src/assets.js`. Im Code stehen an Bild-/Ton-Stellen `__SKFA[0]`, `__SKFA[1]`
  … — nicht anfassen, wird beim Zerlegen automatisch erzeugt.

---

## Schnell-Rezepte

| Ziel | Wo | Handgriff |
|---|---|---|
| Spieler startet mit mehr HP | `Ft = {` | `maxHp: 100` erhöhen |
| Schneller feuern | `Ft = {` | `fireEveryMs: 135` senken |
| Standard-Gegner zäher | `grunt: {` (54698) | `hp` erhöhen |
| Level früh leichter | `const en` → „Stadt 1…5" | `pool` auf leichte Typen kürzen |
| Kurve „früh leicht, spät hart" | `balance.js` → `curve` | `waveBase`/`waveSlope` anpassen |
| Gadget billiger freischalten | `It = {` | `unlockCost` senken |
| Biom-Farbe ändern | `const pi` | `top`/`mid`/`bot` anpassen |
| Schwierigkeit „Schwer" entschärfen | `Qt = {` → `hard` | `enemyDmg`/`enemyHp` senken |

Die mit ★ häufigen Werte (HP, Feuerrate, Schwierigkeit, Gegner-HP) gehen auch
bequem über **`src/balance.js`** — dann muss man `app.js` gar nicht erst
öffnen. Nach jeder Änderung: **`node build.mjs`** → neue `Skyfront.html`.

---

## Ehrliche Grenzen

Werte, Tabellen, Texte, Pools, Farben, Preise, Schussmuster-Auswahl: alles
gut editierbar. Was **nicht** einfach ist: neue *Systeme* oder *Mechaniken*
schreiben, die auf minifizierte Funktions-/Feldnamen zugreifen müssen — dafür
müsste man den betreffenden Codeteil erst mühsam entschlüsseln. Für solche
Fälle ist entweder der Modifikator-Layer (optisch) oder der saubere Vite-
Neuaufbau (Option 4 aus dem letzten Bericht) der bessere Weg.
