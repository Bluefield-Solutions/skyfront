// Batch-Build: jedes profiles/<Name>.js  ->  dist/Skyfront-<Name>.html
// und ein Launcher-Menü dist/index.html, das alle Varianten verlinkt.
// Aufruf:  node build-variants.mjs
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { loadParts, assemble } from './buildcore.mjs';

const DIR = 'profiles';
if (!existsSync(DIR)) {
  console.error(`Kein ${DIR}/-Ordner gefunden. Lege dort Profile ab (z. B. profiles/Master.js) — Format wie src/balance.js.`);
  process.exit(1);
}
const files = readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
if (!files.length) { console.error(`Keine *.js-Profile in ${DIR}/.`); process.exit(1); }
const BOOT = process.argv.includes('--boot');   // optionaler echter Boot-Test (braucht Playwright)
let bootRan = false;                             // wurde der Boot-Test wirklich ausgeführt?

const parts = loadParts();           // Assets/App nur EINMAL laden
mkdirSync('dist', { recursive: true });
console.log(`Baue ${files.length} Variante(n) aus ${DIR}/ …\n`);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Original-Referenzwerte (Fallback, falls ein Profil ein Feld auslässt).
const OREF = { player: { maxHp: 100, fireEveryMs: 135, bulletSpeed: 780, bombStart: 1 },
  enemyGeneric: { bulletSpeed: 300 },
  difficulty: { easy: { enemyDmg: 0.8 }, hard: { enemyDmg: 1.6, fireRate: 0.68 } },
  curve: { waveBase: 34, waveSlope: 1.1, spacingBase: 2150, spacingSlope: 45 } };
const pick = (o, p, d) => { const v = p.split('.').reduce((a, k) => a && a[k], o); return (typeof v === 'number') ? v : d; };
function pickVals(B) {
  return {
    maxHp: pick(B, 'player.maxHp', OREF.player.maxHp),
    fireEveryMs: pick(B, 'player.fireEveryMs', OREF.player.fireEveryMs),
    bulletSpeed: pick(B, 'player.bulletSpeed', OREF.player.bulletSpeed),
    bombStart: pick(B, 'player.bombStart', OREF.player.bombStart),
    dmgEasy: pick(B, 'difficulty.easy.enemyDmg', OREF.difficulty.easy.enemyDmg),
    dmgHard: pick(B, 'difficulty.hard.enemyDmg', OREF.difficulty.hard.enemyDmg),
    waveBase: pick(B, 'curve.waveBase', OREF.curve.waveBase),
    waveSlope: pick(B, 'curve.waveSlope', OREF.curve.waveSlope),
    ebSpeed: pick(B, 'enemyGeneric.bulletSpeed', OREF.enemyGeneric.bulletSpeed),
    hardFire: pick(B, 'difficulty.hard.fireRate', OREF.difficulty.hard.fireRate),
    bossEvery: pick(B, 'bossRush.every', 0),
    bossHpMult: pick(B, 'bossHp.mult', 1),
    corridorAll: !!B.corridorAll,
    bossBeamAlways: !!B.bossBeamAlways,
  };
}
// Struktur-Prüfung der fertigen HTML (ohne Browser): ist der Build vollständig & autark?
function checkHtml(html) {
  const notes = [];
  if (html.length < 20 * 1048576) notes.push('zu klein');
  if (!html.includes('.Game(')) notes.push('kein Spiel-Bundle');
  if (!html.includes('/*SKF_ASSETS*/')) notes.push('Assets fehlen');
  if (!html.includes('/*SKF_MODIFIER*/')) notes.push('Modifikator fehlt');
  return { ok: notes.length === 0, notes };
}

const built = [];
let ok = 0;
for (const f of files) {
  const name = f.replace(/\.js$/, '');
  try {
    const mod = await import(pathToFileURL(process.cwd() + '/' + DIR + '/' + f).href);
    const B = mod.BALANCE || mod.default;
    if (!B) throw new Error('kein export const BALANCE gefunden');
    const { html, changed } = assemble(parts, B);
    const out = `Skyfront-${name}.html`;
    writeFileSync('dist/' + out, html);
    const mb = (html.length / 1048576).toFixed(2);
    const chk = checkHtml(html);
    console.log(`  ${chk.ok ? '✓' : '⚠'} dist/${out}  (${mb} MB · ${changed} Werte${chk.ok ? '' : ' · Prüfung: ' + chk.notes.join(', ')})`);
    built.push({ file: out, mb, changed, meta: mod.META || { title: name }, vals: pickVals(B), chk });
    ok++;
  } catch (e) {
    console.error(`  ✗ ${f}: ${e.message}`);
  }
}

// Optionaler echter Boot-Test (nur mit --boot UND installiertem Playwright).
if (BOOT && built.length) {
  let chromium = null;
  try { ({ chromium } = await import('playwright')); }
  catch { console.log('\n  (—) --boot: Playwright nicht gefunden — bleibe bei der Struktur-Prüfung.'); }
  if (chromium) {
    console.log('\nBoot-Test (headless) …');
    const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
    for (const v of built) {
      const errs = [];
      const page = await browser.newPage();
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      let started = false;
      try {
        await page.goto('file://' + process.cwd() + '/dist/' + v.file);
        for (let i = 0; i < 60; i++) {
          if (await page.evaluate(() => !!(window.__game && window.__game.scene))) { started = true; break; }
          await page.waitForTimeout(500);
        }
      } catch (e) { errs.push(e.message); }
      await page.close();
      v.chk.booted = started && errs.length === 0;
      v.chk.bootErrs = errs.length;
      v.chk.mode = 'gestartet';
      console.log(`  ${v.chk.booted ? '✓' : '✗'} ${v.file} — ${v.chk.booted ? 'gestartet, 0 Fehler' : 'Boot fehlgeschlagen (' + errs.length + ' Fehler)'}`);
    }
    await browser.close();
    bootRan = true;
    // Prüfbericht schreiben.
    const okN = built.filter(v => v.chk.booted).length;
    const lines = built.map(v => `${v.chk.booted ? '✓' : '✗'} ${v.file} — ${v.chk.booted ? 'gestartet, 0 Fehler' : 'Boot fehlgeschlagen, ' + v.chk.bootErrs + ' Fehler'}`);
    const report = `Skyfront — Boot-Report (${new Date().toISOString().slice(0, 19).replace('T', ' ')})\n` +
      '='.repeat(46) + '\n' + lines.join('\n') + `\n\nErgebnis: ${okN}/${built.length} Variante(n) fehlerfrei gestartet.\n`;
    writeFileSync('dist/boot-report.txt', report);
    console.log('  ✓ dist/boot-report.txt geschrieben.');
  }
}

if (built.length) {
  writeFileSync('dist/index.html', genLauncher(built));
  console.log(`  ✓ dist/index.html  (Launcher für ${built.length} Variante(n))`);
}
console.log(`\nFertig: ${ok}/${files.length} Variante(n) in dist/.`);
if (ok < files.length) process.exit(1);
// Qualitäts-Gate: wenn der Boot-Test lief und eine Variante nicht startete → Fehlercode.
if (bootRan) {
  const failed = built.filter(v => !v.chk.booted);
  if (failed.length) {
    console.error(`✗ Qualitäts-Gate: ${failed.length} Variante(n) booten NICHT: ${failed.map(v => v.file).join(', ')}`);
    process.exit(3);
  }
  console.log('✓ Qualitäts-Gate: alle Varianten sind fehlerfrei gestartet.');
}

// ---------------------------------------------------------------------------
function genLauncher(list) {
  const bOf = T => T <= 50 ? T : 50 + (T - 50) * 0.5;
  const hardnessOf = x => {
    const w60 = x.waveBase + Math.floor(bOf(60) * x.waveSlope);
    const bulletP = (x.ebSpeed / 300) * (0.68 / x.hardFire);   // Kugeltempo × Feuerdichte
    const hp = x.bossHpMult || 1;
    const bossF = x.bossEvery >= 1 ? 1 + (3 / x.bossEvery) * hp : 1 + 0.15 * (hp - 1); // Häufigkeit × Zähigkeit
    const h = 30 * (w60 / 95) * (x.dmgHard / 1.6) * (100 / x.maxHp) * (x.fireEveryMs / 110) * bulletP * bossF;
    return Math.max(5, Math.min(99, Math.round(h)));
  };
  const cards = list.map(v => {
    const m = v.meta || {};
    const accent = m.accent || '#4cc6e0';
    const hard = hardnessOf(v.vals);
    const fx = [];
    if (v.vals.bossEvery >= 1) fx.push('🎯 Boss alle ' + v.vals.bossEvery);
    if (v.vals.bossHpMult !== 1) fx.push('🛡 Boss-HP ×' + (+v.vals.bossHpMult).toFixed(1).replace(/\.0$/, ''));
    if (v.vals.bossBeamAlways) fx.push('⚡ Boss-Beam');
    if (v.vals.corridorAll) fx.push('▮ Korridor');
    const fxHtml = fx.length ? `<div class="fx">${fx.map(t => `<span class="fc">${esc(t)}</span>`).join('')}</div>` : '';
    return `      <a class="card" href="${esc(v.file)}" style="--card:${esc(accent)}">
        <div class="ct">
          <span class="dot"></span>
          <h2>${esc(m.title || v.file)}</h2>
          ${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ''}
        </div>
        ${m.desc ? `<p class="desc">${esc(m.desc)}</p>` : ''}
        <div class="hard"><span class="hl">Härte</span><span class="hbar"><i style="width:${hard}%"></i></span><span class="hv">${hard}</span></div>
        ${fxHtml}
        <div class="foot"><span class="mb">${esc(v.mb)} MB ${v.chk && v.chk.booted ? '· <span class="chk">✓ gestartet</span>' : (v.chk && v.chk.ok ? '· <span class="chk">✓ Struktur geprüft</span>' : (v.chk ? '· <span class="bad">⚠ ' + esc(v.chk.notes.join(', ')) + '</span>' : ''))}</span><span class="play">Spielen ▸</span></div>
      </a>`;
  }).join('\n');

  // ---- Vergleich: Kurven-Overlay + Werte-Tabelle ----  (bOf oben definiert)
  const wv = (T, b, s) => b + Math.floor(bOf(T) * s);
  const num = (v, d) => d === 0 ? String(Math.round(v)) : (+v).toFixed(d).replace(/\.?0+$/, '');
  let cmpHtml = '';
  if (list.length >= 2) {
    // Chart
    const W = 680, H = 210, pl = 38, pr = 12, pt = 12, pb = 24, iw = W - pl - pr, ih = H - pt - pb, maxL = 120;
    let ymax = 0;
    for (const v of list) for (let T = 1; T <= maxL; T++) ymax = Math.max(ymax, wv(T, v.vals.waveBase, v.vals.waveSlope));
    ymax = Math.ceil(ymax / 20) * 20;
    const X = T => pl + (T - 1) / (maxL - 1) * iw, Y = val => pt + ih - (val / ymax) * ih;
    let grid = '';
    for (let g = 0; g <= ymax; g += Math.max(40, Math.round(ymax / 4 / 20) * 20))
      grid += `<line x1="${pl}" y1="${Y(g)}" x2="${W - pr}" y2="${Y(g)}" stroke="var(--edge)" stroke-width="1"/><text x="${pl - 6}" y="${Y(g) + 3.5}" text-anchor="end" font-size="9" fill="var(--muted)">${g}</text>`;
    let xl = ''; [1, 30, 60, 90, 120].forEach(T => { xl += `<text x="${X(T)}" y="${H - 7}" text-anchor="middle" font-size="9" fill="var(--muted)">${T}</text>`; });
    const lines = list.map(v => {
      let d = ''; for (let T = 1; T <= maxL; T++) d += (T === 1 ? 'M' : 'L') + X(T).toFixed(1) + ' ' + Y(wv(T, v.vals.waveBase, v.vals.waveSlope)).toFixed(1);
      return `<path d="${d}" fill="none" stroke="${esc(v.meta.accent || '#4cc6e0')}" stroke-width="2.5"/>`;
    }).join('');
    const legend = list.map(v => `<span class="lg"><i style="background:${esc(v.meta.accent || '#4cc6e0')}"></i>${esc(v.meta.title || v.file)}</span>`).join('');
    // Tabelle
    const metrics = [
      { k: 'maxHp', lab: 'Spieler-HP', d: 0 }, { k: 'fireEveryMs', lab: 'Feuertakt (ms)', d: 0 },
      { k: 'bulletSpeed', lab: 'Schusstempo', d: 0 }, { k: 'bombStart', lab: 'Start-Bomben', d: 0 },
      { k: 'dmgEasy', lab: 'Schaden Leicht ×', d: 2 }, { k: 'dmgHard', lab: 'Schaden Schwer ×', d: 2 },
      { k: 'waveBase', lab: 'Wellen-Basis', d: 0 }, { k: 'waveSlope', lab: 'Wellen-Anstieg', d: 2 },
    ];
    const thead = '<tr><th>Wert</th>' + list.map(v => `<th><span class="hd"><i style="background:${esc(v.meta.accent || '#4cc6e0')}"></i>${esc(v.meta.title || v.file)}</span></th>`).join('') + '</tr>';
    const hardVals = list.map(v => hardnessOf(v.vals));
    const hmax = Math.max(...hardVals);
    const hardRow = '<tr class="hrow"><td class="ml">Härte-Index</td>' +
      list.map((v, i) => `<td class="${hardVals[i] === hmax ? 'hi' : ''}">${hardVals[i]}</td>`).join('') + '</tr>';
    const rows = metrics.map(m => {
      const vals = list.map(v => v.vals[m.k]);
      const mx = Math.max(...vals);
      return '<tr><td class="ml">' + esc(m.lab) + '</td>' +
        list.map(v => `<td class="${v.vals[m.k] === mx ? 'hi' : ''}">${num(v.vals[m.k], m.d)}</td>`).join('') + '</tr>';
    }).join('');
    cmpHtml = `
  <section class="cmp">
    <h2>Varianten im Vergleich</h2>
    <div class="chartwrap"><div class="lgrow">${legend}</div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wellen pro Level je Variante">${grid}${xl}${lines}</svg>
      <div class="cap">Angriffswellen pro Level — je höher/steiler, desto härter.</div>
    </div>
    <div class="tblwrap"><table>${thead}${hardRow}${rows}</table></div>
    <p class="cmpnote">Je Zeile ist der höchste Wert hervorgehoben. Der <strong>Härte-Index</strong> (auf den Karten, 5–99) ist eine grobe Kennzahl aus Wellendichte, Gegner-Schaden, Kugeltempo &amp; -dichte, Spieler-HP und Feuertakt — kein exakter Schwierigkeitsgrad. Struktur-Prüfung bestätigt Vollständigkeit &amp; Autarkie der Datei, kein voller Spieltest.</p>
  </section>`;
  }

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Skyfront — Varianten</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=IBM+Plex+Sans:wght@400;500&display=swap">
<style>
:root{--bg:#eef1f6;--panel:#fff;--edge:#d3dae6;--ink:#16202e;--ink2:#4a5a70;--muted:#7a8aa0;
  --disp:'Chakra Petch',system-ui,sans-serif;--body:'IBM Plex Sans',system-ui,sans-serif;
  --shadow:0 1px 2px rgba(20,32,48,.06),0 10px 30px rgba(20,32,48,.07);}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b131f;--panel:#131f2e;--edge:#25384f;
  --ink:#e9eff7;--ink2:#a7b7cc;--muted:#7186a0;--shadow:0 1px 2px rgba(0,0,0,.3),0 12px 34px rgba(0,0,0,.4);}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);-webkit-font-smoothing:antialiased}
.wrap{max-width:960px;margin:0 auto;padding:44px clamp(16px,4vw,34px) 70px}
.eyebrow{font-family:var(--disp);text-transform:uppercase;letter-spacing:.24em;font-size:12px;color:#4cc6e0;font-weight:600}
h1{font-family:var(--disp);font-weight:700;font-size:clamp(28px,5vw,42px);margin:6px 0 8px;letter-spacing:.01em}
.lead{color:var(--ink2);max-width:60ch;margin:0 0 32px;font-size:15px;line-height:1.55}
.grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
.card{display:flex;flex-direction:column;gap:11px;text-decoration:none;color:inherit;
  background:var(--panel);border:1px solid var(--edge);border-radius:16px;padding:20px 20px 16px;
  box-shadow:var(--shadow);transition:transform .15s,border-color .15s;position:relative;overflow:hidden}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--card)}
.card:hover{transform:translateY(-3px);border-color:var(--card)}
.card:focus-visible{outline:2px solid var(--card);outline-offset:3px}
.ct{display:flex;align-items:center;gap:10px}
.ct .dot{width:9px;height:9px;border-radius:50%;background:var(--card);flex:none}
.ct h2{font-family:var(--disp);font-size:20px;font-weight:700;margin:0}
.tag{margin-left:auto;font-family:var(--disp);font-size:11px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;color:var(--card);border:1px solid var(--card);border-radius:20px;padding:2px 10px;opacity:.9}
.desc{margin:0;color:var(--ink2);font-size:13.5px;line-height:1.55;flex:1}
.hard{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;margin:2px 0}
.hard .hl{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted)}
.hard .hbar{height:6px;border-radius:4px;background:var(--edge);overflow:hidden}
.hard .hbar i{display:block;height:100%;border-radius:4px;background:var(--card)}
.hard .hv{font-family:var(--disp);font-weight:700;font-size:14px;color:var(--card);font-variant-numeric:tabular-nums}
.fx{display:flex;flex-wrap:wrap;gap:6px;margin:-2px 0 2px}
.fc{font-family:var(--disp);font-weight:600;font-size:10.5px;letter-spacing:.02em;
  border:1px solid var(--card);color:var(--card);border-radius:20px;padding:2px 8px;
  background:color-mix(in srgb,var(--card) 12%,transparent)}
.foot{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
.mb{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.play{font-family:var(--disp);font-weight:600;font-size:13px;color:var(--card);letter-spacing:.03em}
.note{margin-top:30px;font-size:12.5px;color:var(--muted);line-height:1.5}
@media(prefers-reduced-motion:reduce){.card{transition:none}}
.cmp{margin-top:38px}
.cmp>h2{font-family:var(--disp);font-size:15px;text-transform:uppercase;letter-spacing:.13em;margin:0 0 16px;font-weight:700}
.chartwrap{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:14px 16px 10px;box-shadow:var(--shadow)}
.lgrow{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:6px}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink2);font-weight:500}
.lg i{width:14px;height:3px;border-radius:2px;display:inline-block}
.chartwrap svg{display:block;width:100%;height:auto}
.cap{font-size:11.5px;color:var(--muted);margin-top:4px}
.tblwrap{margin-top:14px;overflow-x:auto;border:1px solid var(--edge);border-radius:14px;background:var(--panel);box-shadow:var(--shadow)}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:9px 14px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
th{font-family:var(--disp);font-weight:600;font-size:12px;letter-spacing:.02em;border-bottom:1px solid var(--edge)}
th:first-child,td.ml{text-align:left;color:var(--ink2);font-family:var(--body)}
td.ml{font-weight:500}
tbody tr:nth-child(even),table tr:nth-child(even){background:color-mix(in srgb,var(--edge) 22%,transparent)}
.hd{display:inline-flex;align-items:center;gap:6px}
.hd i{width:8px;height:8px;border-radius:50%;display:inline-block}
td.hi{font-weight:700;color:var(--ink);background:color-mix(in srgb,#4cc6e0 16%,transparent)}
tr.hrow td{border-bottom:2px solid var(--edge)} tr.hrow td.ml{font-weight:700;color:var(--ink)}
tr.hrow td{font-family:var(--disp);font-weight:600}
.chk{color:#2f9e6b;font-weight:500}
.bad{color:#c8543f;font-weight:500}
.cmpnote{font-size:11.5px;color:var(--muted);margin:8px 2px 0}
</style></head><body>
<div class="wrap">
  <div class="eyebrow">Skyfront</div>
  <h1>Varianten wählen</h1>
  <p class="lead">Jede Fassung ist eine eigenständige Datei — anklicken und direkt losfliegen. Diese Seite muss im selben Ordner wie die <code>Skyfront-*.html</code> liegen.</p>
  <div class="grid">
${cards}
  </div>
${cmpHtml}
  <p class="note">Erzeugt von <code>build-variants.mjs</code>. Neue Variante hinzufügen: eine Datei in <code>profiles/</code> ablegen (optional mit <code>export const META</code>) und <code>node build-variants.mjs</code> ausführen.</p>
</div>
</body></html>`;
}
