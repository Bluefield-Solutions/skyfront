/* Skyfront — Level-Modifikator — v5
 * Additive Zusatz-Schicht fuer den fertigen (minifizierten) Build.
 * Nur STABILE Phaser-APIs + vorhandene Texturen (rain, fog, spark, gradeTop/Bot, cloudsLayer).
 * Voraussetzung: window.__game.
 *
 * Auswahl (Taste "N" / Knopf unten links):
 *   Aus · 🎚 Auto · 🎲 Zufall · 🌙 Nacht · ⛈ Sturm · 🌅 Daemmerung · 🌫 Nebel
 *   - Auto:   Stimmung automatisch aus dem Biom (stageDef.bg), wechselt mit dem Level.
 *   - Zufall: pro Level eine zufaellige Stimmung.
 * Zweite Einstellung (Taste "M" / Knopf darueber), je nach aktivem Effekt:
 *   Nacht=Dunkelheit · Sturm=Regen · Daemmerung=Glut · Nebel=Sicht (Eng/Normal/Weit)
 */
(function () {
  'use strict';
  var MODES = ['Aus', '🎚 Auto', '🎲 Zufall', '🌙 Nacht', '⛈ Sturm', '🌅 Dämmerung', '🌫 Nebel'];
  var NMODES = MODES.length;
  // Effekt-IDs: 0 Aus · 1 Nacht · 2 Sturm · 3 Daemmerung · 4 Nebel ; -1 Auto ; -2 Zufall
  var SEL_EFF = [0, -1, -2, 1, 2, 3, 4];
  var EFF_LABEL = ['Aus', '🌙 Nacht', '⛈ Sturm', '🌅 Dämmerung', '🌫 Nebel'];
  var BIOME_EFF = {
    ocean: 0, fields: 0, city: 1, station: 1, biolum: 1,
    alps: 2, thunder: 2, desert: 3, dune: 3, lava: 3, snow: 4, frost: 4, jungle: 4,
  };
  // Zweit-Einstellung je Effekt.
  var SEC = {
    1: { k: 'skf_l1', lab: '🌙 Dunkelheit', nm: ['Hell', 'Normal', 'Dunkel'], dark: [0.50, 0.62, 0.72] },
    2: { k: 'skf_l2', lab: '⛈ Regen', nm: ['Leicht', 'Normal', 'Stark'], rain: [0.35, 0.55, 0.80] },
    3: { k: 'skf_l3', lab: '🌅 Glut', nm: ['Sanft', 'Normal', 'Intensiv'], warm: [0.22, 0.30, 0.40], sky: [0.40, 0.55, 0.72] },
    4: { k: 'skf_l4', lab: '🌫 Sicht', nm: ['Eng', 'Normal', 'Weit'], fog: [1.85, 2.40, 3.05] },
  };

  var mode = 1;   // Standard AUTO beim ersten Start
  try { var _s = localStorage.getItem('skf_mod'); if (_s !== null) mode = parseInt(_s, 10); } catch (e) {}
  if (isNaN(mode) || mode < 0 || mode >= NMODES) mode = 1;

  var lvl = { 1: 1, 2: 1, 3: 1, 4: 1 };
  [1, 2, 3, 4].forEach(function (e) {
    try { var v = localStorage.getItem(SEC[e].k); if (v !== null) lvl[e] = parseInt(v, 10); } catch (x) {}
    if (isNaN(lvl[e]) || lvl[e] < 0 || lvl[e] > 2) lvl[e] = 1;
  });

  var activeEff = 0;
  function rnd(seed) { var x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

  // ---- UI ----
  var btn, btn2, toast, toastT = 0;
  function ensureUI() {
    if (btn || !document.body) return;
    btn = document.createElement('button'); btn.type = 'button';
    btn.style.cssText = 'position:fixed;left:calc(10px + env(safe-area-inset-left));bottom:calc(10px + env(safe-area-inset-bottom));z-index:99999;'
      + 'font:600 13px/1.2 sans-serif;color:#dfe;background:rgba(10,16,26,.72);'
      + 'border:1px solid #2a4c6a;border-radius:10px;padding:8px 10px;'
      + 'backdrop-filter:blur(2px);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent';
    btn.addEventListener('click', function (e) { e.preventDefault(); cycle(); });
    document.body.appendChild(btn);
    btn2 = document.createElement('button'); btn2.type = 'button';
    btn2.style.cssText = 'position:fixed;left:calc(10px + env(safe-area-inset-left));bottom:calc(48px + env(safe-area-inset-bottom));z-index:99999;display:none;'
      + 'font:600 12px/1.2 sans-serif;color:#cfe;background:rgba(10,16,26,.66);'
      + 'border:1px solid #2a4c6a;border-radius:9px;padding:6px 9px;'
      + 'cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent';
    btn2.addEventListener('click', function (e) { e.preventDefault(); if (SEC[activeEff]) cycleSec(activeEff); });
    document.body.appendChild(btn2);
    toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:99999;'
      + 'font:700 20px/1.2 sans-serif;color:#eaf6ff;text-shadow:0 2px 6px #000;'
      + 'background:rgba(6,10,20,.55);padding:8px 16px;border-radius:12px;'
      + 'opacity:0;transition:opacity .25s;pointer-events:none';
    document.body.appendChild(toast);
    setzeLage();
    // Beim Drehen und beim Groessenwechsel rechnet Phaser die Leinwand erst
    // NACH unserem Zuhoerer neu. Wer nur einmal misst, misst die alte Lage:
    // gemessen bei 390x800 legte der Knopf sich danach auf die Leinwand,
    // obwohl der Balken 80 Punkte hatte. Deshalb dreimal — und zusaetzlich
    // ein Beobachter, der genau dann meldet, wenn die Leinwand sich wirklich
    // geaendert hat.
    var nachtragen = function () { setzeLage(); setTimeout(setzeLage, 80); setTimeout(setzeLage, 320); };
    addEventListener('resize', nachtragen);
    addEventListener('orientationchange', function () { setTimeout(nachtragen, 300); });
    try {
      var lw0 = document.querySelector('canvas');
      if (lw0 && window.ResizeObserver) new ResizeObserver(setzeLage).observe(lw0);
    } catch (e) {}
    updateBtn();
  }

  // Die beiden Knoepfe lagen unten links — und verdeckten dort die
  // Beschriftung der Faehigkeitsknoepfe. Nachgemessen bei 390x844:
  // "Dunkelheit: Normal" belegte y 768..796, "EMP" und "STURM" standen bei
  // y 767..779. Genau uebereinander.
  //
  // Der zweite Anlauf schob sie in den schwarzen Balken UEBER der Leinwand
  // und fragte dafuer eine einzige Zahl ab: ist dort mindestens 72 Punkte
  // Platz? Auf dem Telefon des Nutzers war er es nicht — dort liegt die
  // Statusleiste im oberen Balken, und uebrig bleiben vier Punkte. Also
  // fiel es auf den alten Platz zurueck, und der Modus-Knopf lag wieder
  // ueber "‹ Weltkarte". Genau das steht auf dem Bildschirmfoto.
  //
  // Der Fehler war nicht die Zahl 72, sondern dass nur EIN Balken gefragt
  // wurde. Es gibt zwei: ueber und unter der Leinwand. Und beide sind um
  // ihre Systemraender (Statusleiste, Home-Anzeige) kleiner, als sie
  // aussehen — deshalb werden die auch gemessen und nicht geraten.
  //
  // Genommen wird der GROESSERE nutzbare Balken. Bleibt keiner gross genug
  // — ein Geraet mit fast genau 9:16 —, gehen sie zurueck ueber die
  // Leinwand: ein Knopf ausserhalb des Bildschirms waere schlimmer.
  function raender() {
    var p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;'
      + 'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(p);
    var cs = getComputedStyle(p);
    var o = parseFloat(cs.paddingTop) || 0, u = parseFloat(cs.paddingBottom) || 0;
    p.remove();
    return { oben: o, unten: u };
  }

  var H1 = 36, H2 = 32;   // Hoehe der beiden Knoepfe samt Luft
  function setzeLage() {
    if (!btn || !btn2) return;
    var lw = document.querySelector('canvas');
    if (!lw) return;
    var k = lw.getBoundingClientRect();
    var sicht = window.innerHeight || document.documentElement.clientHeight;
    var s = raender();
    var oben = Math.max(0, k.top - s.oben);
    var unten = Math.max(0, sicht - k.bottom - s.unten);
    var untenBesser = unten >= oben;
    var platz = untenBesser ? unten : oben;
    if (platz < H1) {
      btn.style.top = 'auto';  btn.style.bottom = 'calc(10px + env(safe-area-inset-bottom))';
      btn2.style.top = 'auto'; btn2.style.bottom = 'calc(48px + env(safe-area-inset-bottom))';
      return;
    }
    if (untenBesser) {
      btn.style.top = 'auto';  btn.style.bottom = 'calc(2px + env(safe-area-inset-bottom))';
      btn2.style.top = 'auto'; btn2.style.bottom = 'calc(' + (2 + H1) + 'px + env(safe-area-inset-bottom))';
    } else {
      btn.style.bottom = 'auto';  btn.style.top = (s.oben + oben - H1) + 'px';
      btn2.style.bottom = 'auto'; btn2.style.top = (s.oben + oben - H1 - H2) + 'px';
    }
    // Passt nur EINER in den Balken, bleibt der zweite weg. Er traegt eine
    // Feineinstellung, die es auch auf der Taste M gibt — der Modus-Knopf
    // ist der, ohne den man nicht auskommt.
    btn2.dataset.balken = platz >= H1 + H2 ? 'passt' : 'eng';
  }
  function updateBtn() { if (btn) btn.textContent = 'Modus: ' + MODES[mode]; }
  function updateBtn2(eff) { if (btn2 && SEC[eff]) btn2.textContent = SEC[eff].lab + ': ' + SEC[eff].nm[lvl[eff]]; }
  function showToast(txt) {
    if (!toast) return;
    toast.textContent = txt; toast.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(function () { toast.style.opacity = '0'; }, 1200);
  }
  function cycle() {
    mode = (mode + 1) % NMODES;
    try { localStorage.setItem('skf_mod', String(mode)); } catch (e) {}
    updateBtn();
    var sel = SEL_EFF[mode];
    if (sel === -1) { var g = gameScene(); var e0 = g ? biomeToEff(g) : -1; showToast('🎚 Auto' + (e0 >= 0 ? ' · ' + EFF_LABEL[e0] : '')); }
    else showToast(MODES[mode]);
    teardownAll();
  }
  function cycleSec(eff) {
    if (!SEC[eff]) return;
    lvl[eff] = (lvl[eff] + 1) % 3;
    try { localStorage.setItem(SEC[eff].k, String(lvl[eff])); } catch (e) {}
    updateBtn2(eff);
    showToast(SEC[eff].lab.replace(/^\S+\s/, '') + ': ' + SEC[eff].nm[lvl[eff]]);
    var gs = gameScene(); if (gs && effOf(gs) === eff) applySec(gs, eff);
  }
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.key === 'n' || e.key === 'N') cycle();
    else if ((e.key === 'm' || e.key === 'M') && SEC[activeEff]) cycleSec(activeEff);
  });

  // ---- Szenen-Hilfen ----
  function gameScene() {
    try {
      var g = window.__game;
      if (!g || !g.scene || !g.scene.isActive || !g.scene.isActive('Game')) return null;
      return g.scene.getScene('Game');
    } catch (e) { return null; }
  }
  function valid(o, gs) { return o && o.scene === gs && o.active !== false; }
  function teardownAll() {
    var gs = null; try { gs = window.__game.scene.getScene('Game'); } catch (e) {}
    if (gs && gs.__skf) { try { gs.__skf.forEach(function (o) { try { o.destroy(); } catch (e) {} }); } catch (e) {} }
    if (gs) { gs.__skf = null; gs.__skfEff = -99; }
  }
  function biomeToEff(gs) {
    try {
      var bg = gs.stageDef && gs.stageDef.bg ? String(gs.stageDef.bg) : '';
      var key = bg.replace(/^bg_/, '').replace(/_\d+$/, '');
      return BIOME_EFF.hasOwnProperty(key) ? BIOME_EFF[key] : 0;
    } catch (e) { return 0; }
  }
  function effOf(gs) {
    var sel = SEL_EFF[mode];
    if (sel === -1) return biomeToEff(gs);
    if (sel === -2) {   // Zufall: pro Level (bg) einmal wuerfeln, dann stabil halten
      var sig = (gs.stageDef && gs.stageDef.bg) ? String(gs.stageDef.bg) : 'x';
      if (gs.__skfRandSig !== sig) {
        gs.__skfRandSig = sig;
        gs.__skfRandEff = 1 + Math.floor(Math.random() * 4);
        gs.__skfRandFresh = true;
      }
      return gs.__skfRandEff | 0;
    }
    return sel | 0;
  }

  var GW = 540, GH = 960;

  // Das Nebelloch muss den Schirm IMMER decken, egal wo die Maschine steht.
  // Im schlimmsten Fall sitzt sie in einer Ecke, also braucht es den
  // doppelten Bildschirmdiagonal — plus etwas Luft fuers Pulsieren.
  var DECKUNG = Math.round(2 * Math.sqrt(GW * GW + GH * GH) * 1.06);

  // Frueher wurde das Bild in Sichtweite-Groesse gezeigt (540 * 1,85 bis 3,05)
  // und deckte den Schirm damit nicht. Wo es endete, sprang die Deckkraft von
  // 0,96 auf den Grundnebel darunter — eine harte Kante, die beim Steigen und
  // Sinken durchs Bild wanderte. Genau das war der "weisse Balken".
  // Nachgemessen bei Sicht "Normal": Bild 1296 breit, Maschine bei y=749, also
  // von 101 bis 1397 — die obersten 101 Punkte blieben unbedeckt. In 17 von 17
  // Bildern eines Zuges hoch und runter fand sich ein Helligkeitssprung von
  // 140 bis 180 Stufen.
  //
  // Jetzt deckt das Bild immer, und die Sichtweite steckt stattdessen in den
  // Radien des Verlaufs. Sie werden auf die neue Bildgroesse umgerechnet,
  // damit der freie Kreis genau so gross bleibt wie vorher.
  function ensureFogHole(gs, stufe) {
    try {
      var name = 'skf_fog_hole_' + stufe;
      if (gs.textures.exists(name)) return name;
      var frueher = GW * SEC[4].fog[stufe];      // die frühere Bildgroesse
      var umrechnung = frueher / DECKUNG;
      var S = 512, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      var c = cv.getContext('2d');
      var g = c.createRadialGradient(S / 2, S / 2, S * 0.12 * umrechnung,
                                     S / 2, S / 2, S * 0.5 * umrechnung);
      g.addColorStop(0.0, 'rgba(200,208,220,0)'); g.addColorStop(0.55, 'rgba(200,208,220,0.20)');
      g.addColorStop(0.85, 'rgba(198,206,220,0.75)'); g.addColorStop(1.0, 'rgba(196,204,218,0.96)');
      // Ausserhalb des aeusseren Radius fuellt der Verlauf mit der letzten
      // Farbe weiter — die ganze Flaeche wird also deckend.
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      gs.textures.addCanvas(name, cv); return name;
    } catch (e) { return null; }
  }

  function applySec(gs, eff) {
    try {
      var s = SEC[eff], L = lvl[eff]; if (!s) return;
      if (eff === 1) { gs.__skfNightBase = s.dark[L]; if (gs.__skfDark) gs.__skfDark.setAlpha(s.dark[L]); }
      else if (eff === 2) { if (gs.__skfRainObj) gs.__skfRainObj.setAlpha(s.rain[L]); }
      else if (eff === 3) { if (gs.__skfWarm) gs.__skfWarm.setAlpha(s.warm[L]); if (gs.__skfSky) gs.__skfSky.setAlpha(s.sky[L]); }
      // eff 4 (Nebel-Sicht) wird live in tick aus SEC[4].fog[lvl[4]] gesetzt
    } catch (e) {}
  }

  function build(gs, eff) {
    var made = [];
    var ADD = (window.Phaser && Phaser.BlendModes) ? Phaser.BlendModes.ADD : 1;
    var MUL = (window.Phaser && Phaser.BlendModes) ? Phaser.BlendModes.MULTIPLY : 3;
    var now = gs.time ? gs.time.now : 0;
    gs.__skfDark = gs.__skfRainObj = gs.__skfWarm = gs.__skfSky = null;
    function rect(color, alpha, depth, blend) {
      var r = gs.add.rectangle(-60, -60, GW + 120, GH + 120, color, alpha).setOrigin(0, 0)
        .setScrollFactor(0).setDepth(depth);
      if (blend != null) r.setBlendMode(blend);
      made.push(r); return r;
    }
    function tile(key, alpha, depth, blend) {
      if (!gs.textures || !gs.textures.exists(key)) return null;
      var t = gs.add.tileSprite(0, 0, GW, GH, key).setOrigin(0, 0)
        .setScrollFactor(0).setDepth(depth).setAlpha(alpha);
      if (blend != null) t.setBlendMode(blend);
      made.push(t); return t;
    }
    if (eff === 1) {
      gs.__skfDark = rect(0x04060d, 0.62, 120);
      if (gs.textures.exists('spark')) {
        for (var i = 0; i < 26; i++) {
          var sx = 16 + rnd(i + 1) * (GW - 32), sy = 22 + rnd(i + 7.3) * (GH * 0.5);
          var st = gs.add.image(sx, sy, 'spark').setBlendMode(ADD).setDepth(121)
            .setScale(0.16 + rnd(i + 2.1) * 0.18).setTint(0xe6f0ff).setScrollFactor(0);
          st.__skfStar = true; st.__ph = rnd(i + 5.5) * 6.28; st.__sp = 0.002 + rnd(i + 9.1) * 0.004;
          st.__base = 0.42 + rnd(i + 3.7) * 0.4; st.setAlpha(st.__base); made.push(st);
        }
        var aura = gs.add.image(GW / 2, GH * 0.78, 'spark').setBlendMode(ADD)
          .setDepth(122).setScale(9.5).setTint(0x9fc8ff).setAlpha(0.18).setScrollFactor(0);
        aura.__skfAura = true; made.push(aura);
      }
      gs.__skfNextBolt = now + 6000 + rnd(now * 0.001 + 1) * 6000;
    } else if (eff === 2) {
      rect(0x0a1220, 0.46, 120);
      var gust = tile('cloudsLayer', 0.10, 122, ADD); if (gust) gust.__skfGust = true;
      var rain = tile('rain', 0.55, 123, ADD); if (rain) { rain.__skfRain = true; gs.__skfRainObj = rain; }
      var mist2 = tile('fog', 0.16, 121, ADD); if (mist2) mist2.__skfScroll = 0.35;
      gs.__skfNextBolt = now + 900;
    } else if (eff === 3) {
      gs.__skfWarm = rect(0xffc98a, 0.30, 120, MUL);
      gs.__skfSky = tile('gradeTop', 0.55, 121, ADD); if (gs.__skfSky) gs.__skfSky.setTint(0xff9a3a);
      var botv = tile('gradeBot', 0.30, 121, null); if (botv) botv.setTint(0x241205);
      if (gs.textures.exists('spark')) {
        var sun = gs.add.image(GW * 0.74, GH * 0.03, 'spark').setBlendMode(ADD).setDepth(122)
          .setScale(24).setTint(0xffcf7a).setAlpha(0.22).setScrollFactor(0);
        sun.__skfSun = true; made.push(sun);
      }
    } else if (eff === 4) {
      tile('fog', 0.5, 120, null);
      var haze = tile('fog', 0.28, 121, null); if (haze) haze.__skfScroll = 0.5;
      var lochName = ensureFogHole(gs, lvl[4]);
      if (lochName) {
        var hole = gs.add.image(GW / 2, GH * 0.78, lochName).setDepth(123).setScrollFactor(0);
        hole.setDisplaySize(DECKUNG, DECKUNG);
        hole.__skfHole = true; hole.__skfStufe = lvl[4]; made.push(hole);
      }
    }
    gs.__skf = made; gs.__skfEff = eff;
    applySec(gs, eff);   // gespeicherte Zweit-Einstellung anwenden
  }

  function strike(gs, storm) {
    try {
      if (storm) {
        var flash = function (dur, r, g2, b2) { gs.cameras.main.flash(dur, r, g2, b2, false); };
        var kind = rnd((gs.time ? gs.time.now : 0) * 0.0007);
        flash(150, 150, 172, 220);
        if (kind < 0.5) setTimeout(function () { flash(120, 140, 165, 215); }, 120);
        if (kind < 0.22) setTimeout(function () { flash(90, 130, 155, 205); }, 260);
      } else {
        var d = gs.__skfDark, base = gs.__skfNightBase || 0.62;
        if (d && d.setAlpha) { d.setAlpha(Math.max(0.30, base - 0.20)); setTimeout(function () { try { if (d.scene) d.setAlpha(base); } catch (e) {} }, 180); }
      }
    } catch (e) {}
  }

  function tick() {
    try {
      ensureUI();
      var gs = gameScene(), curEff = 0;
      if (gs) {
        var eff = effOf(gs); curEff = eff;
        if (gs.__skfRandFresh) { gs.__skfRandFresh = false; if (SEL_EFF[mode] === -2) showToast('🎲 ' + (EFF_LABEL[eff] || '')); }
        var need = (gs.__skfEff !== eff) || (eff !== 0 && (!gs.__skf || !gs.__skf.length || !valid(gs.__skf[0], gs)));
        if (need) { teardownAll(); if (eff !== 0) build(gs, eff); else { gs.__skfEff = 0; gs.__skf = null; } }
        if (eff !== 0 && gs.__skf) {
          var now = gs.time ? gs.time.now : 0;
          var px = Number(gs.registry ? gs.registry.get('px') : GW / 2);
          var py = Number(gs.registry ? gs.registry.get('py') : GH * 0.78);
          if (!isFinite(px)) px = GW / 2; if (!isFinite(py)) py = GH * 0.78;
          for (var i = 0; i < gs.__skf.length; i++) {
            var o = gs.__skf[i]; if (!valid(o, gs)) continue;
            if (o.__skfAura) { o.setPosition(px, py); o.setAlpha(0.14 + Math.sin(now * 0.006) * 0.03); }
            else if (o.__skfStar) { o.setAlpha(o.__base + Math.sin(now * o.__sp + o.__ph) * 0.12); }
            else if (o.__skfRain) { o.tilePositionY -= 22; o.tilePositionX -= 6; }
            else if (o.__skfGust) { o.tilePositionX -= 3.2; o.tilePositionY -= 0.6; }
            else if (o.__skfSun) { o.setAlpha(0.26 + Math.sin(now * 0.0016) * 0.06); }
            else if (o.__skfHole) {
              // Sicht umgestellt? Dann die passende Textur nachziehen.
              if (o.__skfStufe !== lvl[4]) {
                var neuName = ensureFogHole(gs, lvl[4]);
                if (neuName) { o.setTexture(neuName); o.__skfStufe = lvl[4]; }
              }
              o.setPosition(px, py);
              var f = DECKUNG * (1 + Math.sin(now * 0.0016) * 0.025);
              o.setDisplaySize(f, f);
            }
            else if (o.__skfScroll) { o.tilePositionY -= o.__skfScroll * 4; }
          }
          if (now >= (gs.__skfNextBolt || 0)) {
            if (eff === 2) { strike(gs, true); gs.__skfNextBolt = now + 1500 + rnd(now * 0.0013) * 5000; }
            else if (eff === 1) { strike(gs, false); gs.__skfNextBolt = now + 7000 + rnd(now * 0.0009) * 8000; }
          }
        }
      }
      activeEff = curEff;
      if (btn2) {
        // Nur zeigen, wenn er auch in den Balken passt — sonst laege er
        // wieder auf der Leinwand, und genau davon kommen wir gerade weg.
        if (SEC[curEff] && btn2.dataset.balken !== 'eng') { btn2.style.display = 'block'; updateBtn2(curEff); }
        else btn2.style.display = 'none';
      }
    } catch (e) { /* nie das Spiel stoeren */ }
    requestAnimationFrame(tick);
  }

  var waitT = setInterval(function () {
    if (window.__game && window.__game.scene) { clearInterval(waitT); requestAnimationFrame(tick); }
  }, 120);
  if (document.readyState !== 'loading') ensureUI();
  else document.addEventListener('DOMContentLoaded', ensureUI);
})();
