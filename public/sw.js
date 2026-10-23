// Service worker mínimo: permite instalar la app en Android/Chrome.
// No cachea nada: los datos del club siempre vienen de la red.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
