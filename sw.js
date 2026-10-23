// Lưu sẵn trang để mở nhanh khi sóng yếu; hồ sơ nghiệm thu luôn lấy bản mới nhất nếu có mạng
const V = 'onehub-ar-v13';
const FILES = ['./', 'index.html', 'lib/three.min.js', 'lib/OrbitControls.js', 'lib/jsQR.js', 'data/model_data.js', 'data/du_lieu.js',
  'js/rebar_core.js', 'js/bs_core.js', 'js/alform.js', 'js/app.js', 'js/qr_worker.js', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.pathname.endsWith('nghiem_thu.json') || u.pathname.includes('/ho_so/')) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
  } else e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});
