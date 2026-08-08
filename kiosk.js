// yedam.kr 키오스크(대형 터치 모니터) 자동 감지 + 전체화면(Fullscreen API) 지원
// 가로·세로 모두 대응: 포인터가 손가락(터치)이고 화면이 크면 kiosk 모드로 간주해
// <html> 태그에 kiosk-on 클래스를 붙인다. kiosk.css가 이 클래스를 보고 확대 스타일을 적용.
// 키오스크 모드에서는 실제 브라우저 전체화면으로 전환하는 버튼을 우측 하단에 띄우고,
// 첫 터치/클릭 시(브라우저 정책상 사용자 제스처가 있어야 전체화면 진입 가능) 자동으로
// 전체화면 진입을 한 번 시도한다.
// iframe 안에 끼워진 페이지(예: kiosk-home.html의 4분할 타일)에서는 kiosk-on 감지만 하고
// 전체화면 버튼/자동진입은 만들지 않는다 (최상위 페이지에만 하나만 있으면 됨).
(function () {
  var isFramed = (function () {
    try {
      return window.top !== window.self;
    } catch (e) {
      return true;
    }
  })();

  /* kiosk-home(키오스크 메인 화면) 자기 자신에서는 "메인으로" 버튼이 필요 없다.
     예전 정규식은 `.html` 확장자가 붙은 주소만 인식했는데,
     GitHub Pages 가 /kiosk-home.html → /kiosk-home 으로 리다이렉트하기 때문에
     실제 운영 주소에서는 판별에 실패해 메인 화면에도 "메인으로" 버튼이
     떠서 하단 AI교육 배너를 가리고 있었다(실물 키오스크 사진에서 확인).
     확장자 유무를 모두 인식하도록 고친다. */
  var isKioskHomePage = /(^|\/)kiosk-home(\.html)?\/?$/.test(window.location.pathname);

  function detect() {
    try {
      var coarse = window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches;
      var big = Math.max(window.innerWidth, window.innerHeight) >= 900;
      var isKiosk = !!(coarse && big);
      document.documentElement.classList.toggle('kiosk-on', isKiosk);
      if (isKiosk) {
        ensureFullscreenUI();
        ensureHomeButton();
        ensureEnterOverlay();
        placeButtons();
      }
      return isKiosk;
    } catch (e) {
      return false;
    }
  }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function requestFS() {
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        var p = req.call(el);
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
  }

  function exitFS() {
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) {
      try {
        var p = exit.call(document);
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
  }

  function toggleFS() {
    if (isFullscreen()) exitFS();
    else requestFS();
  }

  var fsBtn = null;

  /* 자동 전체화면 진입.
     브라우저 정책상 사용자 제스처가 있어야 전체화면에 들어갈 수 있고,
     페이지를 이동하면 전체화면이 풀린다. 예전에는 autoTried 플래그 때문에
     한 번 시도한 뒤로는 다시 시도하지 않아서, 사용자가 [전체화면 종료]를
     눌렀거나 페이지 이동으로 풀린 뒤에는 주소줄·작업표시줄이 계속 보였다.
     이제는 "전체화면이 아닐 때 들어온 제스처"마다 다시 시도한다.
     단 사용자가 직접 종료 버튼을 누른 직후에는 잠시 시도하지 않는다
     (누르자마자 다시 들어가 버리면 종료가 불가능해지므로). */
  var suppressUntil = 0;

  function autoEnter(e) {
    if (isFullscreen()) return;
    if (Date.now() < suppressUntil) return;

    /* 누를 수 있는 것을 눌렀을 때는 전체화면에 들어가지 않는다.

       왜 이 예외가 필요한가
         예전에는 pointerdown 이 들어오면 무조건 전체화면에 들어갔다.
         그런데 전체화면 진입은 그 순간 화면 크기를 바꾼다. 손가락을 대는
         사이에 레이아웃이 움직여 버리니, 손가락을 뗄 때는 이미 그 자리에
         버튼이 없다. 브라우저는 "누른 요소"와 "뗀 요소"가 다르면 click 을
         만들지 않는다. 그래서 "메인으로"를 눌러도 아무 일이 안 일어나고,
         한 번 더 눌러야 했다(실사용에서 보고된 증상).

       이제 링크·버튼을 누를 때는 그 동작이 먼저 끝나게 두고,
       전체화면 복구는 빈 곳을 눌렀을 때만 한다.
       (키오스크 홈 진입 시에는 안내판이 첫 터치를 따로 받으므로
        전체화면 진입 자체는 그대로 보장된다.) */
    var t = e && e.target;
    if (t && t.closest && t.closest(
        'a, button, [role="link"], [role="button"], [data-kiosk-go], input, select, textarea, label')) {
      return;
    }
    requestFS();
  }

  /* 터치 후 링크에 포커스가 남아 있으면 브라우저가 화면 구석에 주소를
     말풍선으로 띄운다(사진 좌하단의 https://yedam.kr/... 표시).
     탭이 끝나면 포커스를 떼어 말풍선이 뜨지 않게 한다. */
  function blurLinkSoon() {
    setTimeout(function () {
      try {
        var el = document.activeElement;
        if (el && (el.tagName === 'A' || el.tagName === 'BUTTON') && el.id !== 'kiosk-fs-btn') {
          el.blur();
        }
      } catch (e) {}
    }, 60);
  }

  function ensureFullscreenUI() {
    if (isFramed) return;
    if (fsBtn) {
      updateFsBtn();
      return;
    }
    fsBtn = document.createElement('button');
    fsBtn.id = 'kiosk-fs-btn';
    fsBtn.type = 'button';
    fsBtn.setAttribute('aria-label', '전체화면 전환');
    document.body.appendChild(fsBtn);
    updateFsBtn();

    fsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      // 사용자가 직접 종료를 눌렀다면 3초 동안 자동 재진입을 막는다
      if (isFullscreen()) suppressUntil = Date.now() + 3000;
      toggleFS();
    });

    document.addEventListener('fullscreenchange', updateFsBtn);
    document.addEventListener('webkitfullscreenchange', updateFsBtn);

    /* 안내판 재등장 조건 보강.
       예전에는 fullscreenchange 때만 다시 확인해서, 사용자가 [전체화면 종료]
       를 누른 뒤 3초 억제 시간이 지나도 아무 이벤트가 없으면 안내판이
       영영 안 떴다. 창 크기 변화·탭 복귀·주기 확인을 함께 건다. */
    window.addEventListener('resize', function () { if (!isFullscreen()) ensureEnterOverlay(); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !isFullscreen()) ensureEnterOverlay();
    });
    setInterval(function () { if (!isFullscreen()) ensureEnterOverlay(); }, 4000);

    // 사용자 제스처가 들어올 때마다 전체화면 진입 시도(이미 전체화면이면 아무것도 안 함)
    document.addEventListener('pointerdown', autoEnter, true);
    document.addEventListener('click', autoEnter, true);
    document.addEventListener('touchstart', autoEnter, true);

    // 링크 탭 후 주소 말풍선이 남지 않도록 포커스 해제
    document.addEventListener('pointerup', blurLinkSoon, true);
    document.addEventListener('touchend', blurLinkSoon, true);

    /* 화면을 만지는 동안에는 고정 버튼을 흐리게 한다.
       검사 화면은 세로로 긴 폼이라 버튼이 어느 구석에 있든 선택지를 덮는데,
       사람이 화면을 보고 고르는 중에는 버튼이 시야를 가리지 않는 편이 낫다.
       버튼 자신을 누를 때는 흐려지면 안 되므로 그때는 제외한다.
       (실제 스타일은 kiosk.css 의 body.kiosk-touching 규칙이 담당) */
    var touchTimer = null;
    function markTouching(e) {
      var t = e && e.target;
      if (t && t.closest && t.closest('#kiosk-fs-btn, #kiosk-home-btn')) return;
      document.body.classList.add('kiosk-touching');
      clearTimeout(touchTimer);
      touchTimer = setTimeout(function () {
        document.body.classList.remove('kiosk-touching');
      }, 2500);
    }
    document.addEventListener('pointerdown', markTouching, true);
    document.addEventListener('touchstart', markTouching, true);
    document.addEventListener('scroll', function () { markTouching(null); }, true);
  }

  /* ── 진입 안내 오버레이 ──────────────────────────────────────────────
     "키오스크 홈에 들어가면 자동으로 전체화면" 요구에 대한 답.

     브라우저는 페이지가 열렸다는 이유만으로 전체화면에 들어가지 못하게
     막는다. 사용자의 실제 조작(터치·클릭·키입력) 안에서 호출해야만 허용된다.
     악성 사이트가 몰래 화면을 점령하는 걸 막는 규칙이라 우회할 수 없다.

     그래서 화면 전체를 덮는 안내판을 띄우고, 어디를 눌러도 그 터치를
     전체화면 진입에 쓴다. 키오스크는 사람이 와서 화면을 만지는 것으로
     시작하므로, 이용자 입장에서는 "들어가자마자 전체화면"과 같다.

     작업표시줄까지 완전히 없애려면 크롬을 --kiosk 로 띄워야 한다
     (저장소의 키오스크-실행.bat). 그 경우 이 안내판은 뜨지 않는다. */
  var enterOverlay = null;

  function removeOverlay() {
    if (!enterOverlay) return;
    enterOverlay.remove();
    enterOverlay = null;
  }

  function ensureEnterOverlay() {
    if (isFramed || !isKioskHomePage) return;   // 키오스크 홈에서만
    if (isFullscreen() || enterOverlay) return;
    // 이미 전체화면으로 실행 중(--kiosk)이면 브라우저 창과 화면 크기가 같다.
    // 이 경우 안내판은 방해만 되므로 띄우지 않는다.
    if (window.innerHeight >= screen.height - 2) return;

    enterOverlay = document.createElement('div');
    enterOverlay.id = 'kiosk-enter-overlay';
    enterOverlay.innerHTML =
      '<div class="kiosk-enter-inner">' +
      '<div class="kiosk-enter-ico" aria-hidden="true"></div>' +
      '<div class="kiosk-enter-t">화면을 터치해 주세요</div>' +
      '<div class="kiosk-enter-d">전체 화면으로 시작합니다</div>' +
      '</div>';
    enterOverlay.setAttribute('role', 'button');
    enterOverlay.setAttribute('tabindex', '0');
    enterOverlay.setAttribute('aria-label', '화면을 터치하면 전체 화면으로 시작합니다');

    function start(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      requestFS();
      removeOverlay();
    }
    enterOverlay.addEventListener('click', start);
    enterOverlay.addEventListener('touchstart', start, { passive: false });
    enterOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') start(e);
    });

    document.body.appendChild(enterOverlay);
    try { enterOverlay.focus(); } catch (e) {}
  }

  function updateFsBtn() {
    // 전체화면에서 빠져나오면 안내판을 다시 띄운다
    if (isFullscreen()) removeOverlay();
    else if (Date.now() >= suppressUntil) ensureEnterOverlay();

    /* 이미 전체화면이면 이 버튼은 할 일이 끝났다.
       그런데도 화면 구석을 계속 차지하고 콘텐츠를 가릴 이유가 없다.
       빠져나올 방법은 남겨야 하므로 아주 흐리게(kiosk.css 가 0.12) 두고,
       손을 대면 진해진다 — 관리자는 찾을 수 있고 이용자 눈에는 안 띈다. */
    document.body.classList.toggle('kiosk-is-fs', isFullscreen());

    if (!fsBtn) return;
    /* 아이콘을 이모지·기호 문자로 넣지 않는다.
       ⛶(U+26F6) · ⤢(U+2922) 는 Windows 키오스크 기본 폰트에 없어서
       두부(□)로 렌더링된다. 실제로 렌더링 검증에서 □ 로 나왔다.
       모양은 kiosk.css 의 ::before 가 순수 CSS 사각형으로 그린다. */
    if (isFullscreen()) {
      fsBtn.textContent = '전체화면 종료';
      fsBtn.classList.add('is-fs');
    } else {
      fsBtn.textContent = '전체화면으로 보기';
      fsBtn.classList.remove('is-fs');
    }
  }

  /* ── 버튼 자리 자동 선택 ────────────────────────────────────────────
     페이지마다 비어 있는 모서리가 다르다. 실제로 재 보면
       회사 홈      좌하=솔루션 보기  우하=도입 담당자  우상=빈자리
       AI PIA 검사  좌하=빈자리      우하=버튼        우상=음성 안내
       맘 검사      네 모서리 모두 콘텐츠
       키오스크 홈  네 모서리 모두 빈자리
     처럼 제각각이라 CSS 로 한 자리를 못 박으면 어딘가는 반드시 덮는다.
     그래서 화면을 열 때 네 모서리를 실제로 훑어 가장 빈 곳을 고른다. */
  /* 후보는 아래 두 모서리뿐이다.
     위쪽 두 모서리를 후보에 넣었더니 거의 모든 페이지에서 상단 헤더·홈 링크
     ("← yedam.kr 홈", 회사 홈의 메뉴 버튼)를 덮었다. 헤더는 어느 페이지에나
     있고 가장 자주 눌리는 곳이라, 자리 계산이 조금 어긋나도 사고가 크다.
     아래쪽은 본문 끝이라 최악의 경우에도 안내 문구를 가리는 정도다. */
  var CORNERS = ['bl', 'br'];               // 좌하 · 우하
  var chosenCorner = null;

  /* 두 버튼을 한 덩어리로 놓으면(높이 112px) 어느 모서리든 뭔가에 닿기
     쉽다. 그래서 각 버튼을 따로 재서 각자 가장 빈 모서리에 놓는다.
     같은 모서리를 고르면 세로로 쌓고, 다르면 각자 자리로 간다. */
  function cornerScore(corner, BW, BH) {
    var M = 14;
    var x = (corner === 'bl' || corner === 'tl') ? M : innerWidth - BW - M;
    var y = (corner === 'tl' || corner === 'tr') ? M : innerHeight - BH - M;
    var hits = 0;
    for (var i = 0; i <= 2; i++) {
      for (var j = 0; j <= 2; j++) {
        var els;
        try { els = document.elementsFromPoint(x + BW * i / 2, y + BH * j / 2); }
        catch (e) { continue; }
        for (var k = 0; k < els.length; k++) {
          var el = els[k];
          if (el.id === 'kiosk-fs-btn' || el.id === 'kiosk-home-btn') continue;
          if (getComputedStyle(el).position === 'fixed') continue;
          var tag = el.tagName;
          // 누를 수 있는 것을 덮는 건 글자를 덮는 것보다 훨씬 나쁘다
          if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT') { hits += 5; break; }
          if (!el.childElementCount && el.textContent.trim().length > 1) { hits += 1; break; }
        }
      }
    }
    return hits;
  }

  function bestCorner(BW, BH, skip) {
    var best = null, bestScore = Infinity;
    for (var i = 0; i < CORNERS.length; i++) {
      if (CORNERS[i] === skip) continue;
      var s = cornerScore(CORNERS[i], BW, BH);
      if (s < bestScore) { bestScore = s; best = CORNERS[i]; }
      if (s === 0) break;   // 완전히 빈 자리를 찾으면 더 볼 필요 없다
    }
    return { corner: best, score: bestScore };
  }

  function placeButtons() {
    if (isFramed) return;
    if (!document.body) return;
    if (!document.documentElement.classList.contains('kiosk-on')) return;
    /* 측정은 "그려진 뒤"에 해야 한다.
       예전에는 스크립트가 실행되는 즉시 쟀는데, 그때는 글꼴·이미지가 아직
       안 들어와 레이아웃이 확정되지 않은 상태라 빈 자리로 잘못 읽혔다
       (검증에서 "← yedam.kr 홈" 링크를 빈자리로 판정한 원인). */

    // 1) 두 버튼을 함께 놓을 수 있는 완전히 빈 모서리가 있으면 그게 최선이다
    var both = bestCorner(180, 112, null);
    if (both.score === 0) {
      applyCorner('kiosk-corner-', both.corner);
      applyCorner('kiosk-hcorner-', both.corner);
      return;
    }

    /* 2) 두 버튼을 함께 놓을 빈 모서리가 없으면 서로 다른 모서리로 흩어 놓는다.
       한 모서리에 세로로 쌓으면 높이가 112px 이 되어 위쪽 버튼이 상단 링크
       ("← yedam.kr 홈" 등)에 걸린다 — 검증에서 반복해서 잡힌 패턴이다.
       흩어 놓으면 각자 52px 만 차지하므로 훨씬 잘 들어간다. */
    var fs = bestCorner(180, 52, null);
    var home = bestCorner(180, 52, fs.corner);   // fs 가 쓴 모서리는 제외
    applyCorner('kiosk-corner-', fs.corner);
    applyCorner('kiosk-hcorner-', home.corner || fs.corner);
  }

  function applyCorner(prefix, corner) {
    if (!corner) return;
    CORNERS.forEach(function (c) { document.body.classList.remove(prefix + c); });
    document.body.classList.add(prefix + corner);
  }

  var homeBtn = null;

  function ensureHomeButton() {
    if (isFramed || isKioskHomePage || homeBtn) return;
    homeBtn = document.createElement('a');
    homeBtn.id = 'kiosk-home-btn';
    /* 확장자 없는 주소를 직접 쓴다.
       /kiosk-home.html 로 보내면 308 리다이렉트를 한 번 더 타서
       전체화면이 풀릴 여지가 생긴다. */
    homeBtn.href = window.location.origin + '/kiosk-home';
    homeBtn.textContent = '메인으로';   /* 집 아이콘은 kiosk.css 의 ::before 가 그린다 */
    homeBtn.setAttribute('aria-label', '키오스크 메인 화면으로 이동');
    document.body.appendChild(homeBtn);
  }

  detect();

  /* 자리 계산을 레이아웃이 확정된 뒤에 다시 한다.
       load        : 이미지·글꼴이 들어온 뒤
       fonts.ready : 웹폰트 적용으로 글자 크기가 바뀐 뒤
       +600ms      : 스크립트가 만드는 화면(검사 문항 등)이 그려진 뒤
     매번 자리를 새로 고르면 버튼이 튀어 보이므로, placeButtons() 안에서
     이미 같은 자리면 아무것도 하지 않는다. */
  window.addEventListener('load', function () { placeButtons(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { placeButtons(); });
  }
  setTimeout(placeButtons, 600);
  setTimeout(placeButtons, 1800);

  window.addEventListener('resize', detect);
  window.addEventListener('orientationchange', detect);
  window.isKioskMode = detect;
  window.kioskToggleFullscreen = toggleFS;
})();
