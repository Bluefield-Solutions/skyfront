/* Skyfront — Profil „Glaskanone": brutale Feuerkraft, hauchdünne Hülle. */
export const BALANCE = {
  player: { maxHp: 40, fireEveryMs: 80, bulletSpeed: 1150, bombStart: 1, bombMax: 3 },
  enemyGeneric: { touchDamage: 25, bulletDamage: 12, bulletSpeed: 320 },
  difficulty: {
    easy:   { enemyDmg: 0.9, enemyHp: 0.7, fireRate: 1.1 },
    normal: { enemyDmg: 1.2, enemyHp: 0.8, fireRate: 0.95 },
    hard:   { enemyDmg: 1.6, enemyHp: 0.9, fireRate: 0.8 },
  },
  enemyHp: { grunt: 2, weaver: 4, gunship: 20, elite: 34, carrier: 44, rotor: 60 },
  curve: { waveBase: 28, waveSlope: 1.3, spacingBase: 2100, spacingSlope: 60 },
};
export const META = { title: "Glaskanone", tag: "Hochrisiko", accent: "#e0533a",
  desc: "Alles auf Angriff: rasend schnelles Feuer zerlegt Gegner im Nu – aber ein, zwei Treffer und du bist hin. Nur mit sauberem Ausweichen zu meistern." };
