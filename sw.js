// yedam.kr 서비스워커 - 오프라인 캐시 + PWA 설치 조건 충족용
// v2: HTML 문서는 네트워크 우선(항상 최신 반영), 정적 자원만 캐시 우선
const CACHE_NAME = 'yedam-cache-v2';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/images/favicon_256.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const accept = event.request.headers.get('accept') || '';
  const isHTML = event.request.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // 문서(페이지)는 네트워크 우선 - 배포 즉시 최신 내용이 보이도록 함. 오프라인일 때만 캐시 사용.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 이미지/CSS 등 정적 자원은 캐시 우선(빠른 로딩) + 백그라운드 갱신
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
