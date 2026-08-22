/* Skyfront — Profil „Zen": entspannt, verzeihend – fliegen und genießen. */
export const BALANCE = {
  player: { maxHp: 160, fireEveryMs: 110, bulletSpeed: 820, bombStart: 3, bombMax: 5 },
  enemyGeneric: { touchDamage: 12, bulletDamage: 6, bulletSpeed: 220 },
  difficulty: {
    easy:   { enemyDmg: 0.5, enemyHp: 0.8, fireRate: 1.5 },
    normal: { enemyDmg: 0.7, enemyHp: 0.9, fireRate: 1.2 },
    hard:   { enemyDmg: 1.0, enemyHp: 1.1, fireRate: 1.0 },
  },
  curve: { waveBase: 22, waveSlope: 1.0, spacingBase: 2600, spacingSlope: 40 },
};
export const META = { title: "Zen", tag: "Entspannt", accent: "#48c0b0",
  desc: "Ruhiges Fliegen: robuster Flieger, milde und langsame Gegner, viel Luft zwischen den Wellen. Ideal zum Entspannen oder zum Kennenlernen des Spiels." };
