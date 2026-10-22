/*
 * Service worker de la app de Finanzas.
 *
 * Qué hace: guarda una copia de la app (index.html) en el teléfono para que abra aunque no
 * haya señal. Tus datos no pasan por aquí: ya se guardan en el teléfono y se suben a tu hoja
 * de Google cuando vuelve la conexión.
 *
 * Cómo decide:
 *   - Con señal: pide la versión más nueva a GitHub y actualiza la copia guardada.
 *   - Sin señal o con señal muy débil (más de 3 segundos sin respuesta): abre la copia guardada.
 *   - Las llamadas a tu hoja de Google (script.google.com) no se tocan nunca.
 *
 * Va en la misma carpeta de GitHub que index.html.
 */
var CACHE = 'finanzas-v2';
var APP = ['./', './index.html'];
var ESPERA_MS = 3000;

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(APP); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

function copiaGuardada(req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (r) {
      return r || c.match('./index.html') || c.match('./');
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                                   // los envíos a tu hoja pasan directo
  if (new URL(req.url).origin !== self.location.origin) return;       // Google Apps Script y otros sitios: no se tocan
  if (req.mode !== 'navigate' && !/\/(index\.html)?$/.test(new URL(req.url).pathname)) return;

  e.respondWith(new Promise(function (resolver) {
    var listo = false;
    function dar(r) { if (!listo && r) { listo = true; resolver(r); } }

    // si la red tarda, se abre la copia guardada
    var t = setTimeout(function () { copiaGuardada(req).then(dar); }, ESPERA_MS);

    fetch(req, { cache: 'no-cache' }).then(function (r) {
      clearTimeout(t);
      if (r && r.ok) {
        var copia1 = r.clone(), copia2 = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia1); c.put('./index.html', copia2); });
        dar(r);
      } else {
        copiaGuardada(req).then(function (g) { dar(g || r); });
      }
    }).catch(function () {
      clearTimeout(t);
      copiaGuardada(req).then(function (g) { dar(g || Response.error()); });
    });
  }));
});
