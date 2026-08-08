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

  function autoEnter() {
    if (isFullscreen()) return;
    if (Date.now() < suppressUntil) return;
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

    // 사용자 제스처가 들어올 때마다 전체화면 진입 시도(이미 전체화면이면 아무것도 안 함)
    document.addEventListener('pointerdown', autoEnter, true);
    document.addEventListener('click', autoEnter, true);
    document.addEventListener('touchstart', autoEnter, true);

    // 링크 탭 후 주소 말풍선이 남지 않도록 포커스 해제
    document.addEventListener('pointerup', blurLinkSoon, true);
    document.addEventListener('touchend', blurLinkSoon, true);
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
  window.addEventListener('resize', detect);
  window.addEventListener('orientationchange', detect);
  window.isKioskMode = detect;
  window.kioskToggleFullscreen = toggleFS;
})();
