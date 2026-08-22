/* Skyfront — Balance-Overlay  (erzeugt mit der Balancing-Konsole)
 * Als src/balance.js speichern, dann:  node build.mjs
 * Die Zahlen werden beim Bauen gezielt in app.js eingespielt.
 */
export const BALANCE = {

  player: {
    maxHp: 110, fireEveryMs: 90, bulletSpeed: 1050,
    bombStart: 2, bombMax: 4, maxPower: 10,
  },

  enemyGeneric: {
    touchDamage: 20, bulletDamage: 11, bulletSpeed: 260,
  },

  difficulty: {
    easy:   { enemyDmg: 0.7, enemyHp: 0.75, fireRate: 1.2, reward: 1 },
    normal: { enemyDmg: 1, enemyHp: 0.9, fireRate: 1, reward: 1.6 },
    hard:   { enemyDmg: 1.3, enemyHp: 1.1, fireRate: 0.85, reward: 2.4 },
  },

  enemyHp: {
    grunt: 2, weaver: 4, kamikaze: 2, bomber: 14, gunship: 20,
    rocketeer: 8, elite: 36, strafer: 3, arcer: 14, sniper: 9,
    carrier: 44, rotor: 64,
  },

  enemyScore: {
    grunt: 140, weaver: 240, kamikaze: 300, bomber: 520, gunship: 680,
    rocketeer: 440, elite: 1300, strafer: 340, arcer: 560, sniper: 480,
    carrier: 2000, rotor: 3000,
  },

  gadgets: {
    emp:    { cd: 24000, unlock: 0 },
    shield: { cd: 32000, unlock: 600 },
    napalm: { cd: 28000, unlock: 800 },
    drones: { cd: 36000, unlock: 1000 },
    repair: { cd: 42000, unlock: 800 },
    chain:  { cd: 26000, unlock: 1200 },
  },

  weapons: {
    spread: { unlock: 0 },
    focus:  { unlock: 0 },
    heavy:  { unlock: 0 },
    laser:  { unlock: 1400 },
  },

  curve: {
    waveBase: 30, waveSlope: 1.2,
    spacingBase: 1800, spacingSlope: 70,
  },

};

export const META = {
  title: "Arcade-schnell",
  tag: "Schnell",
  accent: "#e5a24b",
  desc: "Schnelles Feuer, flinke Schüsse, dünnhäutige Gegner und viele Punkte – flott und treffer-freudig, ideal für lockere Runden.",
};
