// Service worker do Escalou: só mostra uma página "Sem conexão" quando a navegação falha.
// Não guarda em cache rodadas, escalações, pontos nem rankings, para nunca exibir
// trava ou pontuação desatualizada. Troque OFFLINE_CACHE ao mudar a página offline.
const OFFLINE_CACHE = "escalou-offline-v1";
const OFFLINE_ASSETS = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // O ícone da página offline vem do cache; qualquer outra requisição segue direto para a rede.
  if (new URL(request.url).pathname === "/icons/icon-192.png") {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
  }
});

self.addEventListener("push", (event) => {
  const { title, body, tag, url } = event.data.json();
  event.waitUntil(self.registration.showNotification(title, { body, tag, icon: "/icons/icon-192.png", data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).pathname === url);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
