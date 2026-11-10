// Service worker: guarda os arquivos do app (e o SDK do Firebase) para abrir offline.
// Arquivos do app são atualizados em segundo plano: a versão nova aparece na abertura seguinte.
const CACHE = 'financas-v3';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const mesmaOrigem = url.origin === self.location.origin;
  const sdk = url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
  // Login e banco de dados (Google/Firebase) passam direto, sem cache.
  if (!mesmaOrigem && !sdk) return;

  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const emCache = await c.match(e.request);
      const rede = fetch(e.request).then((r) => {
        if (r && r.ok) c.put(e.request, r.clone());
        return r;
      }).catch(() => null);
      if (emCache) return emCache;
      const r = await rede;
      if (r) return r;
      if (e.request.mode === 'navigate') {
        const home = await c.match('./index.html');
        if (home) return home;
      }
      return Response.error();
    })
  );
});
