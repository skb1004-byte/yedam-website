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

  function detect() {
    try {
      var coarse = window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches;
      var big = Math.max(window.innerWidth, window.innerHeight) >= 900;
      var isKiosk = !!(coarse && big);
      document.documentElement.classList.toggle('kiosk-on', isKiosk);
      if (isKiosk) ensureFullscreenUI();
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
  var autoTried = false;

  function autoEnter() {
    if (autoTried || isFullscreen()) return;
    autoTried = true;
    requestFS();
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
      toggleFS();
    });

    document.addEventListener('fullscreenchange', updateFsBtn);
    document.addEventListener('webkitfullscreenchange', updateFsBtn);

    // 첫 사용자 제스처(터치/클릭) 시 자동으로 전체화면 진입 시도
    document.addEventListener('click', autoEnter, true);
    document.addEventListener('touchstart', autoEnter, true);
  }

  function updateFsBtn() {
    if (!fsBtn) return;
    if (isFullscreen()) {
      fsBtn.textContent = '⤢ 전체화면 종료';
      fsBtn.classList.add('is-fs');
    } else {
      fsBtn.textContent = '⛶ 전체화면으로 보기';
      fsBtn.classList.remove('is-fs');
    }
  }

  detect();
  window.addEventListener('resize', detect);
  window.addEventListener('orientationchange', detect);
  window.isKioskMode = detect;
  window.kioskToggleFullscreen = toggleFS;
})();
