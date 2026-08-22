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
  },

  // ---- Gegner allgemein -----------------------------------------------------
  enemyGeneric: {
    touchDamage: 20,   // Schaden bei Kollision mit Gegner
    bulletDamage: 11,  // Schaden pro Gegner-Kugel
    bulletSpeed: 300,  // Geschwindigkeit Gegner-Kugeln
  },

  // ---- Schwierigkeitsgrade (Multiplikatoren) --------------------------------
  difficulty: {
    easy:   { enemyDmg: 0.65, enemyHp: 1.0,  fireRate: 1.30, reward: 1 },   // Runde: milder
    normal: { enemyDmg: 1.15, enemyHp: 1.4,  fireRate: 0.92, reward: 1.6 }, // Anker, unverändert
    hard:   { enemyDmg: 1.85, enemyHp: 2.0,  fireRate: 0.60, reward: 2.4 }, // Runde: härter
  },

  // ---- Gegner-HP je Typ (Basis-Lebenspunkte) --------------------------------
  enemyHp: {
    grunt: 3,     weaver: 6,   kamikaze: 3,  bomber: 21,  gunship: 29,
    rocketeer: 8, elite: 60,   strafer: 4,   arcer: 14,   sniper: 9,
    carrier: 80,  rotor: 120,   // Runde: Schwergegner (spätes Spiel) zäher
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
    waveBase:     26,   // (orig 34)  Wellen-Basiszahl früh — kleiner = leichterer Einstieg
    waveSlope:    1.4,  // (orig 1.1) Zuwachs pro Level — größer = härteres Spätspiel
    spacingBase:  2350, // (orig 2150) Basis-Wellenabstand ms — größer = früh lockerer
    spacingSlope: 60,   // (orig 45)  Verdichtung pro Level — größer = spät hektischer
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
