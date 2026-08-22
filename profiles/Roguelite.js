/* Skyfront — Profil „Roguelite": teure Progression, jede Stufe zählt. */
export const BALANCE = {
  player: { maxHp: 100, fireEveryMs: 120 },
  difficulty: {
    easy:   { enemyDmg: 0.9,  enemyHp: 1.2 },
    hard:   { enemyDmg: 1.9,  enemyHp: 2.0 },
  },
  curve: { waveBase: 28, waveSlope: 1.45, spacingBase: 2200, spacingSlope: 60 },
  upgrades: {
    power:   { max: 10 },
    hp:      { max: 4, costBase: 600, costStep: 500 },
    bomb:    { max: 2, costBase: 900, costStep: 700 },
    wingman: { max: 2, costBase: 1200, costStep: 900 },
  },
  armor: {
    front: { max: 4, costBase: 600, costStep: 460 },
    rear:  { max: 4, costBase: 560, costStep: 420 },
    wing:  { max: 4, costBase: 520, costStep: 400 },
    core:  { max: 3, costBase: 800, costStep: 640 },
  },
  weapons: { spread: { unlock: 0 }, focus: { unlock: 800 }, heavy: { unlock: 1200 }, laser: { unlock: 2600 } },
};
export const META = { title: "Roguelite", tag: "Teuer", accent: "#9b7fe0",
  desc: "Teure Progression: Upgrades, Panzerung und Waffen kosten deutlich mehr Gold. Jede Kaufentscheidung zählt – für Spieler, die sich alles hart erarbeiten wollen." };
