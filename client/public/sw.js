// Service Worker for Push Notifications
console.log('🔧 Service Worker yüklendi');

self.addEventListener('push', function(event) {
  console.log('📨 Push event alındı:', event);
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.message || 'Yeni bildirim',
    icon: '/fikret-petrol-logo.png',
    badge: '/fikret-petrol-logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'open', title: 'Aç', icon: '/fikret-petrol-logo.png' },
      { action: 'close', title: 'Kapat' }
    ],
    requireInteraction: false,
    silent: false,
    tag: 'task-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '🔔 Fikret Petrol - Yeni Görev', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('🖱️ Bildirime tıklandı:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

self.addEventListener('install', function(event) {
  console.log('✅ Service Worker yüklendi');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker aktif');
  event.waitUntil(clients.claim());
});






