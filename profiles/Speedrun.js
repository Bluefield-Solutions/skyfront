/* Skyfront — Profil „Speedrun": schnell durchpflügen, Level enden zügig. */
export const BALANCE = {
  player: { maxHp: 120, fireEveryMs: 80, bulletSpeed: 1100, bombStart: 2, bombMax: 4 },
  enemyGeneric: { touchDamage: 16, bulletDamage: 9, bulletSpeed: 300 },
  difficulty: {
    easy:   { enemyDmg: 0.7,  enemyHp: 0.6, fireRate: 1.2 },
    normal: { enemyDmg: 0.95, enemyHp: 0.7, fireRate: 1.0 },
    hard:   { enemyDmg: 1.3,  enemyHp: 0.85, fireRate: 0.85 },
  },
  enemyHp: { grunt: 2, weaver: 4, kamikaze: 2, strafer: 3, gunship: 18, bomber: 12, elite: 30, carrier: 40, rotor: 55 },
  enemyScore: { gunship: 620, elite: 1150, carrier: 1900, rotor: 2900 },
  curve: { waveBase: 24, waveSlope: 1.05, spacingBase: 1700, spacingSlope: 55 },
};
export const META = { title: "Speedrun", tag: "Tempo", accent: "#f2c14e",
  desc: "Maximales Tempo: sehr schnelles Feuer, weiche Gegner, kurze straffe Wellen. Levels sind rasch geräumt – ideal, um durchzupflügen und Bestzeiten zu jagen." };
