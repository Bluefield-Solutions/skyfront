/* Skyfront — Balance-Overlay  (erzeugt mit der Balancing-Konsole)
 * Als src/balance.js speichern, dann:  node build.mjs
 * Die Zahlen werden beim Bauen gezielt in app.js eingespielt.
 */
export const BALANCE = {

  player: {
    maxHp: 90, fireEveryMs: 140, bulletSpeed: 780,
    bombStart: 1, bombMax: 3, maxPower: 10,
  },

  enemyGeneric: {
    touchDamage: 26, bulletDamage: 15, bulletSpeed: 360,
  },

  difficulty: {
    easy:   { enemyDmg: 1, enemyHp: 1.3, fireRate: 0.95, reward: 1 },
    normal: { enemyDmg: 1.4, enemyHp: 1.7, fireRate: 0.78, reward: 1.6 },
    hard:   { enemyDmg: 2.2, enemyHp: 2.4, fireRate: 0.5, reward: 3 },
  },

  enemyHp: {
    grunt: 4, weaver: 8, kamikaze: 3, bomber: 28, gunship: 38,
    rocketeer: 8, elite: 70, strafer: 4, arcer: 14, sniper: 9,
    carrier: 100, rotor: 150,
  },

  enemyScore: {
    grunt: 100, weaver: 180, kamikaze: 220, bomber: 400, gunship: 520,
    rocketeer: 340, elite: 950, strafer: 260, arcer: 420, sniper: 360,
    carrier: 1500, rotor: 2200,
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
    waveBase: 32, waveSlope: 1.8,
    spacingBase: 2000, spacingSlope: 85,
  },

};

export const META = {
  title: "Hardcore",
  tag: "Brutal",
  accent: "#e0705f",
  desc: "Kompromisslos hart: zähe Gegner, brutaler Schwer-Grad, steile Wellen-Kurve schon ab Level 4. Nur für geübte Piloten.",
};
