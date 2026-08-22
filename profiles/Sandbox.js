/* Skyfront — Profil „Sandbox": alles billig, großzügig – zum Ausprobieren. */
export const BALANCE = {
  player: { maxHp: 200, fireEveryMs: 90, bulletSpeed: 1000, bombStart: 3, bombMax: 6, maxPower: 10 },
  difficulty: {
    easy:   { enemyDmg: 0.6, enemyHp: 0.8 },
    normal: { enemyDmg: 0.9, enemyHp: 1.0 },
    hard:   { enemyDmg: 1.2, enemyHp: 1.3 },
  },
  curve: { waveBase: 30, waveSlope: 1.2, spacingBase: 2200, spacingSlope: 55 },
  upgrades: {
    power:   { max: 10 },
    hp:      { max: 4, costBase: 10, costStep: 0 },
    bomb:    { max: 2, costBase: 10, costStep: 0 },
    wingman: { max: 2, costBase: 10, costStep: 0 },
  },
  armor: {
    front: { max: 4, costBase: 10, costStep: 0 },
    rear:  { max: 4, costBase: 10, costStep: 0 },
    wing:  { max: 4, costBase: 10, costStep: 0 },
    core:  { max: 3, costBase: 10, costStep: 0 },
  },
  weapons: { spread: { unlock: 0 }, focus: { unlock: 0 }, heavy: { unlock: 0 }, laser: { unlock: 0 } },
  gadgets: { emp:{cd:24000,unlock:0}, shield:{cd:32000,unlock:0}, napalm:{cd:28000,unlock:0}, drones:{cd:36000,unlock:0}, repair:{cd:42000,unlock:0}, chain:{cd:26000,unlock:0} },
};
export const META = { title: "Sandbox", tag: "Billig", accent: "#2f9e6b",
  desc: "Alles günstig und großzügig: starker Flieger, milde Gegner, Upgrades/Waffen quasi geschenkt. Ideal zum Ausprobieren und Herumspielen." };
