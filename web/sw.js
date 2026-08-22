// Skyfront — Dienst-Arbeiter. Legt das Spiel einmal ab und bedient es danach
// aus dem Zwischenspeicher: zweiter Start ohne Netz, ohne Wartezeit.
// __MARKE__ wird beim Bau durch den Inhalts-Fingerabdruck ersetzt; eine neue
// Marke wirft den alten Speicher weg. Ohne das haette man die alte Fassung
// fuer immer am Bein.
const MARKE = 'skyfront-__MARKE__';
const VORRAT = ['./', './manifest.webmanifest', './icon-180.png'];

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
  // Jeder Seitenaufruf bekommt das eine abgelegte Spiel — sonst laege die
  // 24-MB-Datei doppelt im Speicher (einmal als './', einmal als './index.html').
  if (anfrage.mode === 'navigate') {
    e.respondWith(caches.match('./', { ignoreSearch: true }).then(r => r || fetch(anfrage)));
    return;
  }
  e.respondWith(
    caches.match(anfrage, { ignoreSearch: true }).then(r => r || fetch(anfrage))
  );
});
