/* Skyfront — Profil „Belagerung": enger Korridor, zähe Bosse im Wechsel. */
export const BALANCE = {
  player: { maxHp: 150, fireEveryMs: 100, bulletSpeed: 1000, bombStart: 3, bombMax: 5 },
  difficulty: {
    easy:   { enemyDmg: 0.9, enemyHp: 1.2 },
    normal: { enemyDmg: 1.1, enemyHp: 1.3 },
    hard:   { enemyDmg: 1.4, enemyHp: 1.6 },
  },
  curve: { waveBase: 18, waveSlope: 1.0, spacingBase: 2400, spacingSlope: 45 },
  bossRush: { every: 2 },     // jeder zweite Level ein Boss
  bossHp: { mult: 1.5 },      // Bosse 50 % zäher
  corridorAll: true,          // enger Korridor auf allen Leveln
  bossBeamAlways: true,       // Bosse feuern immer ihren Dauer-Laser
};
export const META = { title: "Belagerung", tag: "Belagerung", accent: "#b8763a",
  desc: "Enger Korridor auf jedem Level, zähere Bosse im Wechsel: wenig Ausweichraum, lange Duelle. Ein robuster, bombenreicher Flieger gegen die Belagerung." };
