// Gemeinsame Build-Logik für build.mjs (Einzel) und build-variants.mjs (Batch).
import { readFileSync, existsSync } from 'fs';

export function collectPatches(B) {
  const P = [];
  const add = (anchor, field, value, path) => {
    if (value !== undefined && value !== null) P.push({ anchor, field, value, path });
  };
  const p = B.player || {};
  for (const f of ['maxHp', 'fireEveryMs', 'bulletSpeed', 'bombStart', 'bombMax', 'maxPower', 'speedLerp', 'zugFaktor'])
    add('Ft = {', f, p[f], 'player.' + f);
  const g = B.enemyGeneric || {};
  for (const f of ['touchDamage', 'bulletDamage', 'bulletSpeed'])
    add('_t = {', f, g[f], 'enemyGeneric.' + f);
  const d = B.difficulty || {};
  const dAnchor = { easy: 'label: "Leicht"', normal: 'label: "Normal"', hard: 'label: "Schwer"' };
  for (const k of Object.keys(dAnchor)) {
    const dd = d[k] || {};
    for (const f of ['enemyDmg', 'enemyHp', 'fireRate', 'reward'])
      add(dAnchor[k], f, dd[f], `difficulty.${k}.${f}`);
  }
  const eh = B.enemyHp || {};
  for (const k of Object.keys(eh)) add(k + ': {', 'hp', eh[k], `enemyHp.${k}`);
  const es = B.enemyScore || {};
  for (const k of Object.keys(es)) add(k + ': {', 'score', es[k], `enemyScore.${k}`);
  const gd = B.gadgets || {};
  for (const k of Object.keys(gd)) {
    add(k + ': {', 'cd', gd[k].cd, `gadgets.${k}.cd`);
    add(k + ': {', 'unlockCost', gd[k].unlock, `gadgets.${k}.unlock`);
  }
  const wp = B.weapons || {};
  for (const k of Object.keys(wp)) add(k + ': {', 'unlockCost', wp[k].unlock, `weapons.${k}.unlock`);
  // Spieler-Upgrades (pe): power via eindeutiges Label, Rest via Key-Anker.
  const up = B.upgrades || {};
  if (up.power) add('"Feuerkraft"', 'max', up.power.max, 'upgrades.power.max');
  for (const k of ['hp', 'bomb', 'wingman']) {
    const t = up[k]; if (!t) continue;
    add(k + ': {', 'max', t.max, `upgrades.${k}.max`);
    add(k + ': {', 'base', t.costBase, `upgrades.${k}.costBase`);
    add(k + ': {', 'step', t.costStep, `upgrades.${k}.costStep`);
  }
  // Panzerung (bt).
  const ar = B.armor || {};
  for (const k of ['front', 'rear', 'wing', 'core']) {
    const t = ar[k]; if (!t) continue;
    add(k + ': {', 'max', t.max, `armor.${k}.max`);
    add(k + ': {', 'base', t.costBase, `armor.${k}.base`);
    add(k + ': {', 'step', t.costStep, `armor.${k}.step`);
  }
  return P;
}

export function applyBalance(src, patches, log = () => {}) {
  let changed = 0;
  const errors = [];
  for (const { anchor, field, value, path } of patches) {
    const aIdx = src.indexOf(anchor);
    if (aIdx < 0) { errors.push(`Anker nicht gefunden: "${anchor}" (${path})`); continue; }
    const re = new RegExp('(' + field + '\\s*:\\s*)(-?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)');
    const rest = src.slice(aIdx);
    const m = re.exec(rest);
    if (!m) { errors.push(`Feld "${field}" nach "${anchor}" nicht gefunden (${path})`); continue; }
    const oldVal = m[2], newVal = String(value);
    if (Number(oldVal) === Number(newVal)) continue;
    const at = aIdx + m.index;
    src = src.slice(0, at) + m[1] + newVal + src.slice(at + m[0].length);
    log(`  balance: ${path}  ${oldVal} -> ${newVal}`);
    changed++;
  }
  if (errors.length) throw new Error('Balance-Patch fehlgeschlagen:\n  ' + errors.join('\n  '));
  return { src, changed };
}

export function applyCurve(src, C, log = () => {}) {
  if (!C) return { src, changed: 0 };
  const subs = [
    { from: '34 + Math.floor(b * 1.1)', to: `${C.waveBase} + Math.floor(b * ${C.waveSlope})`, path: 'curve.wave' },
    { from: '2150 - T * 45', to: `${C.spacingBase} - T * ${C.spacingSlope}`, path: 'curve.spacing' },
    // Der Boden unter dem Abstand. Die elf Profile kennen ihn nicht und
    // sollen sich nicht aendern — deshalb faellt er auf 1150 zurueck, den
    // Wert, der bis v39 als Literal in app.js stand.
    { from: 'Math.max(1150,', to: `Math.max(${C.spacingFloor ?? 1150},`, path: 'curve.spacingFloor' },
    // Die Bosskurve steht in derselben Form: ein Literal in src/app.js, das
    // beim Bauen ersetzt wird. Gemessen wird sie mit npm run zeitachse.
    { from: '1450 * (1 + (sektor - 1) * .0125)', to: `${C.bossGrund} * (1 + (sektor - 1) * ${C.bossZuwachs})`, path: 'curve.boss' },
  ];
  let changed = 0;
  const errors = [];
  for (const { from, to, path } of subs) {
    const n = src.split(from).length - 1;
    if (n !== 1) { errors.push(`Kurven-Fragment nicht eindeutig (${n}×): "${from}" (${path})`); continue; }
    if (from === to) continue;
    src = src.replace(from, to);
    log(`  curve: ${path}  "${from}" -> "${to}"`);
    changed++;
  }
  if (errors.length) throw new Error('Kurven-Patch fehlgeschlagen:\n  ' + errors.join('\n  '));
  return { src, changed };
}

// Boss-Rush: setzt im Stage-Aufbau die Boss-Kadenz hoch (Code-Ebene, eindeutiges Fragment).
export function applyBoss(src, cfg, log = () => {}) {
  if (!cfg || !cfg.every || cfg.every < 1) return { src, changed: 0 };
  const every = Math.round(cfg.every);
  const from = 'boss: T.boss,';
  const to = `boss: ((R + 1) % ${every} === 0 ? Math.max(1, T.boss) : T.boss),`;
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`Boss-Anker nicht eindeutig (${n}×): "${from}"`);
  src = src.replace(from, to);
  log(`  boss-rush: mindestens alle ${every} Level ein Boss`);
  return { src, changed: 1 };
}

// Boss-HP-Multiplikator (Code-Ebene): Basis-Boss-HP 260 × mult.
export function applyBossHp(src, cfg, log = () => {}) {
  if (!cfg || cfg.mult == null || cfg.mult === 1) return { src, changed: 0 };
  const hp = Math.round(260 * cfg.mult);
  const from = 'this.maxHp = 260, this.hp = 260';
  const to = `this.maxHp = ${hp}, this.hp = ${hp}`;
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`Boss-HP-Anker nicht eindeutig (${n}×)`);
  src = src.replace(from, to);
  log(`  boss-hp: 260 -> ${hp} (×${cfg.mult})`);
  return { src, changed: 1 };
}

// Boss-Beam immer an (unabhängig vom Schwierigkeitsgrad).
export function applyBossBeam(src, on, log = () => {}) {
  if (!on) return { src, changed: 0 };
  const from = 'this.bossBeamOn = b.bossBeam';
  const to = 'this.bossBeamOn = true';
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`Boss-Beam-Anker nicht eindeutig (${n}×)`);
  src = src.replace(from, to);
  log('  boss-beam: immer an');
  return { src, changed: 1 };
}

// Korridor-Modus auf ALLEN Leveln erzwingen (Code-Ebene).
export function applyCorridor(src, on, log = () => {}) {
  if (!on) return { src, changed: 0 };
  const from = 'corridor: T.corridor,';
  const to = 'corridor: true,';
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`Korridor-Anker nicht eindeutig (${n}×)`);
  src = src.replace(from, to);
  log('  korridor: auf allen Leveln aktiv');
  return { src, changed: 1 };
}

// Liest die unveränderlichen Teile EINMAL (Assets 21 MB nur einmal laden).
export function loadParts() {
  return {
    head: readFileSync('index.head.html', 'utf8'),
    tail: readFileSync('index.tail.html', 'utf8'),
    modopen: readFileSync('.modopen', 'utf8'),
    assets: readFileSync('src/assets.js', 'utf8'),
    // Die Musik liegt getrennt von den Bildern: dort sind die Nummern
    // Positionen, hier sind es Namen. Fehlt die Datei, faellt das Spiel
    // auf den erzeugten Klang zurueck — es ist kein Baufehler.
    musik: existsSync('src/musik.js') ? readFileSync('src/musik.js', 'utf8') : '',
    appBase: readFileSync('src/app.js', 'utf8'),
    modifier: existsSync('src/modifier.js')
      ? '\n<script>/*SKF_MODIFIER*/\n' + readFileSync('src/modifier.js', 'utf8') + '\n</script>\n'
      : '',
  };
}

// Baut die fertige HTML für ein Balance-Objekt B (oder null = unverändert).
export function assemble(parts, B, log = () => {}) {
  let app = parts.appBase, changed = 0;
  if (B) {
    const r1 = applyBalance(app, collectPatches(B), log); app = r1.src; changed += r1.changed;
    const r2 = applyCurve(app, B.curve, log); app = r2.src; changed += r2.changed;
    const r3 = applyBoss(app, B.bossRush, log); app = r3.src; changed += r3.changed;
    const r4 = applyBossHp(app, B.bossHp, log); app = r4.src; changed += r4.changed;
    const r5 = applyCorridor(app, B.corridorAll, log); app = r5.src; changed += r5.changed;
    const r6 = applyBossBeam(app, B.bossBeamAlways, log); app = r6.src; changed += r6.changed;
  }
  // Die Version wird aus src/app.js gelesen und in die Huelle gestempelt.
  // EINE Quelle, kein Abgleich noetig — und beides fehlt zu lassen ist ein
  // Baufehler, kein stiller Ruecklauf: eine Versionszeile, die leer bleibt
  // oder eine alte Zahl zeigt, ist schlimmer als gar keine.
  const mv = /\bSKF_VERSION = "([^"]+)"/.exec(app);
  if (!mv) throw new Error('SKF_VERSION nicht in src/app.js gefunden — die Versionszeile haette keine Quelle.');
  let head = parts.head;
  if (!head.includes('%%SKF_VERSION%%'))
    throw new Error('Platzhalter %%SKF_VERSION%% fehlt in index.head.html — die Version kaeme nirgends an.');
  head = head.split('%%SKF_VERSION%%').join(mv[1]);

  const html = head + '<script>/*SKF_ASSETS*/\n' + parts.assets + '\n</script>\n' +
    (parts.musik ? '<script>/*SKF_MUSIK*/\n' + parts.musik + '\n</script>\n' : '') +
    parts.modopen + '\n' + app + '\n</script>' + parts.modifier + parts.tail;
  return { html, changed, hasModifier: !!parts.modifier, version: mv[1] };
}
