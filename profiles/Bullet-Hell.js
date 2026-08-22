/* Skyfront — Profil „Bullet-Hell": viele, schnelle Kugeln – Ausweichen ist alles. */
export const BALANCE = {
  player: { maxHp: 140, fireEveryMs: 100, bulletSpeed: 900, bombStart: 2, bombMax: 4 },
  enemyGeneric: { touchDamage: 18, bulletDamage: 9, bulletSpeed: 430 },
  difficulty: {
    easy:   { enemyDmg: 0.9, enemyHp: 1.0, fireRate: 0.75 },
    normal: { enemyDmg: 1.1, enemyHp: 1.2, fireRate: 0.60 },
    hard:   { enemyDmg: 1.4, enemyHp: 1.5, fireRate: 0.45 },
  },
  curve: { waveBase: 34, waveSlope: 1.5, spacingBase: 1900, spacingSlope: 75 },
};
export const META = { title: "Bullet-Hell", tag: "Kugelhagel", accent: "#e06fae",
  desc: "Der Bildschirm füllt sich: viele und schnelle Gegner-Kugeln, dichte Wellen. Reaktion und Ausweichen zählen mehr als Feuerkraft – für Shmup-Profis." };
