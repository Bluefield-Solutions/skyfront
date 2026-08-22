/* Skyfront — Profil „Boss-Rush": auf JEDEM Level ein Boss (Code-Ebene).
 * `every` steuert die Kadenz: 1 = jeder Level, 2 = jeder zweite … */
export const BALANCE = {
  player: { maxHp: 160, fireEveryMs: 95, bulletSpeed: 1000, bombStart: 3, bombMax: 6 },
  difficulty: {
    easy:   { enemyDmg: 0.85, enemyHp: 1.1 },
    normal: { enemyDmg: 1.05, enemyHp: 1.3 },
    hard:   { enemyDmg: 1.30, enemyHp: 1.5 },
  },
  curve: { waveBase: 16, waveSlope: 0.9, spacingBase: 2600, spacingSlope: 40 },
  bossRush: { every: 1 },
};
export const META = { title: "Boss-Rush", tag: "Boss-Rush", accent: "#e08a2b",
  desc: "Kaum Verschnaufpausen: auf jedem Level wartet ein Boss. Deutlich weniger Kleinkram, dafür Dauer-Duelle – robuster, bombenreicher Flieger für die Brocken." };
