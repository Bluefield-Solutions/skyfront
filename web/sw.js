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

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET') return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

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
        if (antwort && antwort.ok && antwort.type === 'basic') {
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
  for (const pfad of BILDER) if (!(await c.match(pfad))) offen.push(pfad);
  let i = 0;
  async function arbeiter() {
    while (i < offen.length) {
      const pfad = offen[i++];
      try {
        const a = await fetch(pfad);
        if (a && a.ok) await c.put(pfad, a.clone());
      } catch (e) { /* naechster Start versucht es wieder */ }
    }
  }
  await Promise.all([arbeiter(), arbeiter(), arbeiter(), arbeiter()]);
}

self.addEventListener('message', e => {
  if (e.data && e.data.typ === 'vorladen') e.waitUntil(vorladen());
});
