/* Skyfront — Balance-Overlay
 * ---------------------------------------------------------------------------
 * HIER stellst du die wichtigsten Spielwerte ein — an EINER Stelle, ohne im
 * 65.000-Zeilen-Code zu suchen. `node build.mjs` spielt diese Werte beim Bauen
 * gezielt in src/app.js ein und erzeugt die fertige Skyfront.html.
 *
 * Die Zahlen unten sind die AKTUELLEN Werte des Spiels. Baust du ohne etwas zu
 * ändern, kommt exakt dasselbe Spiel heraus. Ändere einzelne Zahlen und baue
 * neu — nur die geänderten werden ersetzt, jede Änderung wird beim Bauen als
 * "alt → neu" protokolliert.
 *
 * Kleiner = schneller feuern (fireEveryMs). Multiplikatoren bei difficulty:
 * enemyDmg/enemyHp/fireRate wirken auf ALLE Gegner des jeweiligen Grades.
 * Cooldowns (cd) und Freischaltkosten (unlock) sind in ms bzw. Gold.
 * Eine Zeile ganz weglassen (auskommentieren) = Wert bleibt unverändert.
 * ---------------------------------------------------------------------------
 */
export const BALANCE = {

  // ---- Spieler-Flugzeug -----------------------------------------------------
  player: {
    maxHp: 120,        // Start-Maximal-HP  (Runde: +20 für sanfteren Einstieg)
    fireEveryMs: 100,  // Feuertakt in ms (kleiner = schneller)  (Wunsch-Set: Arcade-Tempo)
    bulletSpeed: 950,  // Geschossgeschwindigkeit Spieler  (Wunsch-Set: schnellere Schüsse)
    bombStart: 2,      // Bomben bei Start  (Wunsch-Set: großzügiger)
    bombMax: 4,        // Bomben-Maximum  (Wunsch-Set: +1)
    maxPower: 10,      // maximales Feuerlevel

    // ---- Steuergefühl ------------------------------------------------------
    // speedLerp: wie schnell die Maschine dem Finger nachzieht, je Bild bei
    //   60 Hz. 1 = springt sofort (bis v34, fühlte sich hart und zittrig an),
    //   0.5 = weich in rund 25 ms. Kleiner = weicher und träger.
    // zugFaktor: wie weit die Maschine je Fingerweg geht. Größer = direkter,
    //   aber auch nervöser.
    // Beides zusammen macht „schnell UND weich": der Zug ist groß, die
    // Nachführung glättet. Nachmessen mit `npm run steuerung`.
    speedLerp: 0.5,    // (orig 1)    Nachführung je Bild bei 60 Hz
    zugFaktor: 2.1,    // (orig 1.95) Fingerweg → Flugweg
  },

  // ---- Gegner allgemein -----------------------------------------------------
  enemyGeneric: {
    touchDamage: 20,   // Schaden bei Kollision mit Gegner
    bulletDamage: 11,  // Schaden pro Gegner-Kugel
    // 360 statt 300 (v46). Ein schnelleres Geschoss ist KUERZER im Bild —
    // Flugzeit 2,67 statt 3,20 Sekunden —, also sind weniger gleichzeitig
    // unterwegs, ohne dass ein Gegner seltener schiesst. Das ist der
    // Hebel aus „ein paar weniger Geschosse, die aber auch ein bisschen
    // schneller sind". Nachmessen: npm run geschossdichte.
    bulletSpeed: 360,  // Geschwindigkeit Gegner-Kugeln
  },

  // ---- Schwierigkeitsgrade (Multiplikatoren) --------------------------------
  difficulty: {
    easy:   { enemyDmg: 0.65, enemyHp: 1.0,  fireRate: 1.30, reward: 1 },   // Runde: milder
    normal: { enemyDmg: 1.15, enemyHp: 1.4,  fireRate: 0.92, reward: 1.6 }, // Anker, unverändert
    hard:   { enemyDmg: 1.85, enemyHp: 2.0,  fireRate: 0.60, reward: 2.4 }, // Runde: härter
  },

  // ---- Gegner-HP je Typ (Basis-Lebenspunkte) --------------------------------
  // Runde v36: alle Werte um 30 % angehoben, auf Rückmeldung vom Gerät
  // („die anderen Gegner können auch noch ein bisschen mehr Power vertragen").
  // scout und lanzenwache stehen jetzt mit hier — vorher lagen sie allein in
  // app.js, und wer die Gegner-HP drehen wollte, hätte sie übersehen.
  enemyHp: {
    scout: 3,     grunt: 4,    weaver: 8,    kamikaze: 4,  bomber: 27,
    gunship: 38,  rocketeer: 10, elite: 78,  strafer: 5,   arcer: 18,
    sniper: 12,   carrier: 104, rotor: 156,  lanzenwache: 130,
  },

  // ---- Gegner-Punkte je Typ (Score bei Abschuss) ----------------------------
  enemyScore: {
    grunt: 100,     weaver: 180,  kamikaze: 220, bomber: 400, gunship: 520,
    rocketeer: 340, elite: 1100,  strafer: 260,  arcer: 420,  sniper: 360,
    carrier: 1800,  rotor: 2600,  // Runde: mehr Punkte für die härteren Bocken
  },

  // ---- Spezial-Systeme (Gadgets): cd = Cooldown ms, unlock = Gold -----------
  gadgets: {
    emp:    { cd: 24000, unlock: 0 },
    shield: { cd: 32000, unlock: 600 },
    napalm: { cd: 28000, unlock: 800 },
    drones: { cd: 36000, unlock: 1000 },
    repair: { cd: 42000, unlock: 800 },
    chain:  { cd: 26000, unlock: 1200 },
  },

  // ---- Hauptwaffen: unlock = Freischaltkosten in Gold ------------------------
  weapons: {
    spread: { unlock: 0 },
    focus:  { unlock: 0 },
    heavy:  { unlock: 0 },
    laser:  { unlock: 1400 },
  },

  // ---- Schwierigkeits-KURVE über die Level (Pro-Level, echte Wellen-Formel) --
  // Steuert, wie die Zahl der Angriffswellen und ihr Abstand mit dem Level
  // wachsen. Das ist die einzige Stelle, an der sich "früh leichter, spät
  // härter" WIRKLICH pro Level formen lässt (die intensity im Stage-Array wird
  // vom Spiel ignoriert). Original-Werte in Klammern.
  curve: {
    waveBase:     37,   // (orig 34)  Wellen-Basiszahl früh — kleiner = leichterer Einstieg
    waveSlope:    1.0,  // (orig 1.1) Zuwachs pro Level — größer = härteres Spätspiel
    spacingBase:  2650, // (orig 2150) Basis-Wellenabstand ms — größer = früh lockerer
    spacingSlope: 60,   // (orig 45)  Verdichtung pro Level — größer = spät hektischer

    // Der BODEN unter dem Abstand — und die Zahl, die in 96 von 120
    // Sektoren wirklich regiert. Der Abstand ist
    // `max(spacingFloor, spacingBase - Sektor*spacingSlope - …)`; bei 2650
    // und 60 ist die Klammer schon ab Sektor 25 kleiner als 1150. Ab dort
    // hat spacingSlope keine Wirkung mehr, und das Wellenfenster wächst
    // allein daran, dass mehr Wellen in denselben Abstand gehängt werden:
    // 70,6 s im ersten Sektor, 95,7 s im hundertzwanzigsten.
    //
    // Bis v39 stand die Zahl als nacktes Literal in app.js und war von
    // hier aus nicht erreichbar. Gemessen wird mit `npm run fenstereichen`.
    spacingFloor: 850,  // (orig 1150) kleinster Wellenabstand ms — kleiner = spät dichter

    // Die Bosse. bossGrund ist das Leben des ERSTEN Bosses (Stufe 1,
    // Sektor 1, vor dem Schwierigkeitsgrad). bossZuwachs ist der Aufschlag
    // je Sektor: bei 0.0125 hat der Boss in Sektor 120 das 2,49-fache.
    // Obendrauf kommt die Bossstufe mit 1,0 / 1,25 / 1,5.
    //
    // Diese beiden Zahlen sind die Stellschraube für „der Boss ist zu
    // leicht". Nachmessen mit `npm run zeitachse`: dort steht, wie viele
    // Sekunden ein Boss MINDESTENS hält — bei voller Feuerkraft und wenn
    // jeder Schuss trifft. Auf dem Gerät dauert es länger.
    bossGrund:    7020,   // (orig 160) Leben des ersten Bosses
    bossZuwachs:  0.005,  // (orig ---) Aufschlag je Sektor
  },

  // ---- Spieler-Upgrades (Hangar): max = Stufen-Obergrenze, cost* = Goldpreise --
  // Kosten je Stufe R:  costBase + costStep · R  (Ausnahme power: fest 120·1.5^R).
  upgrades: {
    power:   { max: 10 },                              // Feuerkraft-Obergrenze
    hp:      { max: 4, costBase: 220, costStep: 220 }, // Hülle (+25 HP je Stufe)
    bomb:    { max: 2, costBase: 420, costStep: 420 }, // Start-Bombe +1
    wingman: { max: 2, costBase: 560, costStep: 560 }, // Begleitflieger +1
  },

  // ---- Panzerung (Workshop): max = Obergrenze, cost* = Goldpreise --------------
  armor: {
    front: { max: 4, costBase: 260, costStep: 240 },   // −Kugelschaden
    rear:  { max: 4, costBase: 240, costStep: 220 },   // −Kollisionsschaden
    wing:  { max: 4, costBase: 220, costStep: 200 },   // +30 Max-HP je Stufe
    core:  { max: 3, costBase: 340, costStep: 320 },   // −Boss-Laser/schwere Treffer
  },

};
