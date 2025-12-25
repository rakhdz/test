self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // هنا يمكنك إضافة caching لاحقاً
});
