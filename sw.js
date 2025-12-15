// sw.js
self.addEventListener('install', event => {
  self.skipWaiting(); // يجعل الخدمة تعمل فوراً
});

self.addEventListener('fetch', event => {
  // هذا الجزء يتحكم في كيفية التعامل مع طلبات الإنترنت
});
