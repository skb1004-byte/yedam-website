// yedam.kr 서비스워커
// v4: 배포 즉시 반영 최우선. 오래된 서비스워커/캐시가 남아 옛 화면이 보이던 문제를 해결한다.
//  - 활성화 시 이전 캐시를 전부 비우고 열려 있는 창을 강제로 새로고침한다.
//  - HTML은 물론 CSS/JS도 네트워크 우선으로 가져오고, 오프라인일 때만 캐시를 쓴다.
//  - 이미지·폰트만 캐시 우선으로 두어 로딩 속도를 지킨다.
const CACHE_NAME = 'yedam-cache-v12';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/images/favicon_256.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // 이전 버전 캐시를 남기지 않고 모두 삭제한다
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)).catch(() => {}))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        // 이미 열려 있는 화면(키오스크 포함)을 새 버전으로 즉시 교체
        clients.forEach((c) => {
          try { c.navigate(c.url); } catch (e) {
            try { c.postMessage({ type: 'SW_UPDATED' }); } catch (e2) {}
          }
        });
      })
      .catch(() => {})
  );
});

// 페이지에서 강제 갱신을 요청할 수 있는 통로
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const accept = event.request.headers.get('accept') || '';
  const isHTML = event.request.mode === 'navigate' || accept.includes('text/html');
  // 이미지·폰트만 캐시 우선 (자주 바뀌지 않고 용량이 큼)
  const isStaticMedia = /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname);

  if (isHTML || !isStaticMedia) {
    // HTML·CSS·JS = 네트워크 우선(HTTP 캐시 무시). 오프라인일 때만 캐시 사용.
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 이미지·폰트 = 캐시 우선 + 백그라운드 갱신
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
