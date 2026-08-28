// Skyfront — Dienst-Arbeiter.
//
// Zwei Sorten Inhalt, zwei Verfahren:
//
// 1. Die Huelle (Seite, Manifest, Symbole) wird beim Einrichten fest abgelegt.
//    Sie ist klein und muss beim allerersten Start ohne Netz da sein.
//
// 2. Die ausgelagerten Bilder werden NICHT beim Einrichten geladen. Sie sind
//    zusammen 16 MB, und addAll ist alles oder nichts — ein einziger
//    Fehlschlag und es waere gar nichts abgelegt.
//    Stattdessen zweigleisig: jedes abgerufene Bild landet im Speicher, UND
//    die Seite stoesst nach dem Hochfahren ein Nachladen der uebrigen an.
//    Nur auf den Abruf zu warten reicht nicht — gemessen lagen danach 27 von
//    68 Bildern im Speicher, und ohne Netz fielen die Texturen von 127 auf 83.
//
// __MARKE__ wird beim Bau durch den Inhalts-Fingerabdruck ersetzt; eine neue
// Marke wirft den alten Speicher weg.
const MARKE = 'skyfront-__MARKE__';
const VORRAT = ['./', './manifest.webmanifest', './icon-180.png'];

// Wird beim Bau eingesetzt: die Liste der ausgelagerten Bilder.
const BILDER = __BILDER__;

// Und die drei Musikstuecke — getrennt gefuehrt, weil sie anders abgerufen
// werden: ein <audio>-Element fragt in Bereichen (Range), ein <img> nicht.
const MUSIK = __MUSIK__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(MARKE).then(c => c.addAll(VORRAT)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== MARKE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Ein Bereichsabruf, aus dem Speicher beantwortet.
//
// MUSS sein, sobald die Musik als Datei ausgeliefert wird: Safari auf iOS
// fragt jedes <audio> mit "Range: bytes=0-" an und verweigert den Dienst,
// wenn eine 200 mit dem ganzen Stueck zurueckkommt statt einer 206 mit dem
// verlangten Ausschnitt. Aus dem Netz kaeme die 206 vom Server — aus dem
// Speicher kommt sie nur, wenn sie hier gebaut wird.
async function ausBereich(anfrage, bereich) {
  const c = await caches.open(MARKE);
  const voll = await c.match(anfrage.url, { ignoreSearch: true });
  if (!voll) return fetch(anfrage);
  const puffer = await voll.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(bereich);
  const von = m && m[1] ? parseInt(m[1], 10) : 0;
  const bis = m && m[2] ? Math.min(parseInt(m[2], 10), puffer.byteLength - 1) : puffer.byteLength - 1;
  if (!(von >= 0 && von <= bis)) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${puffer.byteLength}` } });
  }
  return new Response(puffer.slice(von, bis + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': voll.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': String(bis - von + 1),
      'Content-Range': `bytes ${von}-${bis}/${puffer.byteLength}`,
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET') return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  const bereich = anfrage.headers.get('range');
  if (bereich) { e.respondWith(ausBereich(anfrage, bereich)); return; }

  // Jeder Seitenaufruf bekommt das eine abgelegte Spiel — sonst laege die
  // Seite doppelt im Speicher (einmal als './', einmal als './index.html').
  if (anfrage.mode === 'navigate') {
    e.respondWith(caches.match('./', { ignoreSearch: true }).then(r => r || fetch(anfrage)));
    return;
  }

  e.respondWith(
    caches.match(anfrage, { ignoreSearch: true }).then(gefunden => {
      if (gefunden) return gefunden;
      return fetch(anfrage).then(antwort => {
        // Nur ablegen, was auch angekommen ist. Eine 404 im Speicher waere
        // schlimmer als gar nichts: sie ueberlebt den naechsten Versuch.
        // Genau 200, nicht "ok": eine 206 ist ok, und cache.put wirft
        // bei einer 206. Bis hierher kommt zwar keine mehr (Bereiche
        // gehen oben ab), aber die Regel gehoert an die Stelle, die legt.
        if (antwort && antwort.status === 200 && antwort.type === 'basic') {
          const kopie = antwort.clone();
          caches.open(MARKE).then(c => c.put(anfrage, kopie)).catch(function () {});
        }
        return antwort;
      });
    })
  );
});

// Holt, was noch fehlt. Vier gleichzeitig — mehr bringt nichts und stiehlt
// dem Spiel die Bandbreite. Fehlschlaege werden uebergangen: beim naechsten
// Start wird es erneut versucht.
async function vorladen() {
  const c = await caches.open(MARKE);
  const offen = [];
  // Musik zuerst: sie ist das, was ohne Netz am ehesten auffaellt — ein
  // fehlendes Hintergrundbild sieht man nicht, eine stumme Partie hoert man.
  for (const pfad of MUSIK.concat(BILDER)) if (!(await c.match(pfad))) offen.push(pfad);
  let i = 0, fertig = 0;
  await melde(0, offen.length);
  async function arbeiter() {
    while (i < offen.length) {
      const pfad = offen[i++];
      try {
        const a = await fetch(pfad);
        if (a && a.ok) { await c.put(pfad, a.clone()); fertig++; await melde(fertig, offen.length); }
      } catch (e) { /* naechster Start versucht es wieder */ }
    }
  }
  await Promise.all([arbeiter(), arbeiter(), arbeiter(), arbeiter()]);
}

// Der Seite sagen, wie weit es ist. Sonst laedt das Telefon still 9 MB und
// niemand weiss, warum das Netz arbeitet.
async function melde(fertig, gesamt) {
  const klienten = await self.clients.matchAll();
  for (const k of klienten) k.postMessage({ typ: 'vorladen-stand', fertig, gesamt });
}

self.addEventListener('message', e => {
  if (e.data && e.data.typ === 'vorladen') e.waitUntil(vorladen());
});
