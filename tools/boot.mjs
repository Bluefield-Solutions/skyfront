// Gemeinsamer Boot-Test: laedt eine gebaute Datei in Chromium und prueft, ob
// das Spiel wirklich hochkommt. Von build-variants.mjs UND von check.mjs
// benutzt — der Master wurde sonst nie gestartet, obwohl genau er ausgeliefert
// wird.
//
// Playwright ist optional: fehlt es, meldet startbar() null statt zu werfen,
// und der Aufrufer bleibt bei der Struktur-Pruefung.

export async function ladeChromium() {
  try { const { chromium } = await import('playwright'); return chromium; }
  catch { return null; }
}

// Prueft eine Datei. Gibt { gestartet, fehler } zurueck.
export async function startbar(browser, pfad) {
  const fehler = [];
  const seite = await browser.newPage();
  seite.on('pageerror', e => fehler.push(String(e)));
  seite.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  let gestartet = false;
  try {
    await seite.goto('file://' + pfad);
    for (let i = 0; i < 60; i++) {
      if (await seite.evaluate(() => !!(window.__game && window.__game.scene))) { gestartet = true; break; }
      await seite.waitForTimeout(500);
    }
  } catch (e) { fehler.push(e.message); }
  await seite.close();
  return { gestartet: gestartet && fehler.length === 0, fehler };
}
