// yedam.kr 키오스크(대형 터치 모니터) 자동 감지 + 전체화면(Fullscreen API) 지원
// 가로·세로 모두 대응: 포인터가 손가락(터치)이고 화면이 크면 kiosk 모드로 간주해
// <html> 태그에 kiosk-on 클래스를 붙인다. kiosk.css가 이 클래스를 보고 확대 스타일을 적용.
// 키오스크 모드에서는 실제 브라우저 전체화면으로 전환하는 버튼을 우측 하단에 띄우고,
// 첫 터치/클릭 시(브라우저 정책상 사용자 제스처가 있어야 전체화면 진입 가능) 자동으로
// 전체화면 진입을 한 번 시도한다.
// iframe 안에 끼워진 페이지(예: kiosk-home.html의 4분할 타일)에서는 kiosk-on 감지만 하고
// 전체화면 버튼/자동진입은 만들지 않는다 (최상위 페이지에만 하나만 있으면 됨).
/* ── 기기 종류 판정 ───────────────────────────────────────────────

   조사해 보니(2026-08 기준) **태블릿과 터치 노트북을 100% 구분하는 방법은
   없다.** UA 문자열은 하드웨어가 아니라 브라우저·OS 를 알려 줄 뿐이라,
   같은 윈도우 태블릿과 윈도우 노트북이 똑같은 UA 를 낸다. 크기도 못 쓴다 —
   아이패드와 우리 키오스크가 둘 다 1024×768 이다.

   그래서 두 단계로 나눈다.

   1단계  명시 신호 — 추측하지 않는다
     키오스크는 **우리가 직접 설치한다.** 추측할 이유가 없다.
     주소 한 번만 열면 그 기기에 기록되고 이후로는 그대로 쓴다.
       ?device=kiosk | tablet | laptop | desktop | phone   설정
       ?device=auto                                        해제(자동판정으로)
     전송 토큰과 같이 넣을 수 있다.
       ?device=kiosk&settoken=<토큰>

   2단계  추론 — 표시가 없는 방문자 기기
     화면 폭 + 포인터 종류 + 터치점 수를 같이 본다. 어느 하나만 보면 틀린다.
       손가락만 있고 마우스가 없다      → 태블릿(또는 휴대폰)
       마우스가 있다                    → 노트북/데스크톱 (터치 노트북 포함)

   기존 키오스크가 멈추면 안 되므로, 예전 판정(손가락 + 긴 변 900px 이상)은
   폴백으로 남겨 둔다. 표시를 해 둔 기기만 그것을 건너뛴다.

   근거 — 실측(2026-08-08)에서 드러난 문제
     1366×768 노트북이 AI PIA 에서 세로 1,186px 넘쳤다. 글자 축소 규칙이
     max-width:1079px 이라 1366 이 안 걸려, 키오스크용 세로 1080×1920
     타이포그래피를 그대로 쓰고 있었기 때문이다. */
(function () {
  var KEY = 'yd_device';
  var VALID = { kiosk:1, tablet:1, laptop:1, desktop:1, phone:1 };

  function forced() {
    try {
      var v = (localStorage.getItem(KEY) || '').trim();
      return VALID[v] ? v : '';
    } catch (e) { return ''; }
  }

  /* 주소로 들어온 표시를 저장하고 주소에서는 지운다.
     뒤로가기 기록·화면 공유에 남지 않게 하려는 것이다. */
  function readFlag() {
    try {
      var sp = new URLSearchParams(window.location.search);
      if (!sp.has('device')) return;
      var v = (sp.get('device') || '').trim().toLowerCase();
      if (v === 'auto' || v === '') localStorage.removeItem(KEY);
      else if (VALID[v]) localStorage.setItem(KEY, v);
      else { console.error('알 수 없는 기기 표시:', v); return; }
      sp.delete('device');
      var q = sp.toString();
      window.history.replaceState(null, '',
        window.location.pathname + (q ? '?' + q : '') + window.location.hash);
    } catch (e) {
      console.error('기기 표시 처리 실패:', e);
    }
  }

  function infer() {
    var w = window.innerWidth, h = window.innerHeight;
    var mq = window.matchMedia;
    var coarse = mq && mq('(any-pointer: coarse)').matches;   /* 손가락 */
    var fine   = mq && mq('(any-pointer: fine)').matches;     /* 마우스·펜 */
    var touches = navigator.maxTouchPoints || 0;

    /* User-Agent Client Hints — 크로미움 계열이 주는 구조화된 힌트.
       UA 문자열 파싱보다 낫지만 사파리·파이어폭스에는 없어 보조로만 쓴다.
       mobile:false 이고 마우스가 있으면 노트북/데스크톱이 거의 확실하다. */
    try {
      var uad = navigator.userAgentData;
      if (uad && uad.mobile === false && fine) {
        return (w >= 1600 ? 'desktop' : 'laptop');
      }
    } catch (e) { }

    /* 세로로 긴 화면 + 손가락만 = 세로형 키오스크 가능성.
       다만 우리 키오스크는 가로(1024×768·1280×1024)라 이 신호로는 안 잡힌다.
       그래서 이것만 믿지 않고 태블릿으로 돌린다 — 키오스크는 표시로 정한다.
       세로 태블릿과 세로 키오스크는 브라우저가 주는 정보로 구별되지 않는다. */
    var portraitTouch = (h > w) && coarse && !fine;

    /* 아이패드는 iPadOS 13 부터 기본이 "데스크톱 사이트 요청" 이라
       스스로를 맥으로 소개한다(navigator.platform === 'MacIntel').
       진짜 맥은 터치를 못 하므로 터치점 수로 가른다. 널리 쓰이는 판별법이다. */
    try {
      if (/MacIntel/.test(navigator.platform || '') && touches > 1) return 'tablet';
    } catch (e) { }

    /* 안드로이드 태블릿은 UA 에 Android 가 있고 Mobile 이 없다.
       (휴대폰은 'Android ... Mobile', 태블릿은 'Mobile' 이 빠진다) */
    try {
      var ua = navigator.userAgent || '';
      if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet';
    } catch (e) { }

    if (w < 640) return 'phone';
    /* 마우스가 붙어 있으면 태블릿이 아니다. 터치 노트북도 여기로 온다 —
       화면을 만질 수 있어도 주 입력은 트랙패드다. */
    if (fine) return (w >= 1600 ? 'desktop' : 'laptop');
    /* 마우스가 없고 손가락만 있다 */
    if (coarse || touches >= 5 || portraitTouch) return 'tablet';

    /* 여기까지 왔으면 확신이 없다. 이때는 **넓은 쪽이 아니라 안전한 쪽**을
       고른다 — 터치 친화적인 태블릿 규칙이 마우스 사용자에게는 조금 클 뿐
       불편하지 않지만, 반대로 데스크톱 규칙을 터치 기기에 주면 못 누른다. */
    if (touches > 0) return 'tablet';
    return (w >= 1600 ? 'desktop' : 'laptop');
  }

  function classify() {
    try {
      var r = document.documentElement;
      var f = forced();
      var kind = f || infer();

      /* 표시가 kiosk 면 kiosk.css 가 그대로 받도록 클래스를 켠다.
         표시가 kiosk 가 아니면(태블릿 등) 예전 크기 추측이 가로채지 못하게 끈다. */
      if (f === 'kiosk') r.classList.add('kiosk-on');
      else if (f) r.classList.remove('kiosk-on');

      var isKiosk = r.classList.contains('kiosk-on');
      ['phone', 'tablet', 'laptop', 'desktop'].forEach(function (k) {
        r.classList.toggle('dev-' + k, !isKiosk && k === kind);
      });
      r.classList.toggle('dev-forced', !!f);

      /* 세로가 짧은 기기 — 가로 태블릿·보급형 노트북.
         "한 화면에 안 들어온다" 문제가 거의 전부 여기서 난다. */
      r.classList.toggle('screen-short', !isKiosk && window.innerHeight < 820);
    } catch (e) {
      console.error('기기 판정 실패:', e);
    }
  }

  readFlag();
  classify();
  window.addEventListener('resize', classify);
  window.addEventListener('orientationchange', function () { setTimeout(classify, 300); });
  /* 아래 detect() 가 kiosk-on 을 나중에 붙이므로 한 번 더 돌려 맞춘다 */
  window.addEventListener('load', function () { setTimeout(classify, 120); });
  window.piaClassifyDevice = classify;
  window.piaDeviceInfo = function () {
    var r = document.documentElement;
    return {
      표시: forced() || '(없음)',
      추론: infer(),
      적용: (r.className.match(/kiosk-on|dev-\w+|screen-short/g) || []).join(' '),
      화면: window.innerWidth + '×' + window.innerHeight,
      터치점: navigator.maxTouchPoints || 0
    };
  };
})();

/* ── 결과 전송 토큰을 이 기기에 심는 통로 ───────────────────────────
   키오스크는 윈도우 PC + 터치 모니터다. 화면 키보드로 긴 주소를 치는 것은
   현실적이지 않으므로, 주소 한 번만 열리면 저장되게 한다.

     https://yedam.kr/...?settoken=<토큰>     저장
     https://yedam.kr/...?settoken=           해제
     https://yedam.kr/...?checktoken=1        이 기기에 들어 있는지 확인

   저장한 뒤 주소에서 즉시 지운다. 뒤로가기 기록·화면 공유·어깨너머로
   토큰이 남지 않게 하려는 것이다.

   kiosk.js 는 전 페이지에 실려 있으므로 키오스크 시작 화면(kiosk-home)에서
   열어도 되고, 검사 화면에서 열어도 된다. localStorage 는 주소(오리진)
   단위라 어느 페이지에서 넣든 같은 값을 쓴다. */
(function () {
  function say(msg) {
    var d = document.createElement('div');
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);'
      + 'z-index:2147483647;background:#141413;color:#fff;padding:14px 20px;'
      + 'border-radius:12px;font:600 16px/1.5 system-ui,-apple-system,sans-serif;'
      + 'box-shadow:0 8px 28px rgba(0,0,0,.28);max-width:88vw;text-align:center';
    d.textContent = msg;
    function show() {
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 6000);
    }
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
  }

  try {
    var sp = new URLSearchParams(window.location.search);
    var touched = false;

    if (sp.has('settoken')) {
      var v = (sp.get('settoken') || '').trim();
      if (v) {
        localStorage.setItem('pia_ingest_token', v);
        say('이 기기에 전송 토큰을 저장했습니다.');
      } else {
        localStorage.removeItem('pia_ingest_token');
        say('이 기기의 전송 토큰을 지웠습니다.');
      }
      sp.delete('settoken');
      touched = true;
    }

    if (sp.has('checktoken')) {
      var cur = localStorage.getItem('pia_ingest_token') || '';
      say(cur
        ? '전송 토큰 있음 (끝 4자리 ' + cur.slice(-4) + ')'
        : '전송 토큰 없음 — 이 기기는 아직 설정되지 않았습니다.');
      sp.delete('checktoken');
      touched = true;
    }

    if (touched) {
      var q = sp.toString();
      window.history.replaceState(null, '',
        window.location.pathname + (q ? '?' + q : '') + window.location.hash);
    }
  } catch (e) {
    console.error('전송 토큰 처리 실패:', e);
  }
})();

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

  /* 회사 홈페이지 메인(index.html)에는 전용 "키오스크 홈" 버튼(#ydKioskEntry)이
     따로 있다. 여기는 일반 방문자도 보는 화면이므로
       · [전체화면으로 보기] 버튼을 두지 않는다
       · 빈 곳을 눌렀다고 전체화면에 들어가지 않는다
     전체화면은 [키오스크 홈]을 눌러 키오스크 모드로 들어갈 때부터 시작한다. */
  function isKioskEntryPage() {
    return !!document.getElementById('ydKioskEntry');
  }

  function detect() {
    try {
      /* 명시 표시(?device=)가 있으면 크기 추측을 하지 않는다.

         왜 필요한가 — 예전 추측은 "손가락 + 긴 변 900px 이상 = 키오스크"였다.
         그런데 아이패드(1024×768)·갤럭시탭이 정확히 그 조건에 걸린다.
         그래서 태블릿이 전부 키오스크로 잡히고, 태블릿용 규칙이 한 줄도
         적용되지 않았다(검증에서 확인). 표시가 있으면 그 말을 따른다. */
      var forcedKind = '';
      try { forcedKind = (localStorage.getItem('yd_device') || '').trim(); } catch (e) { }

      var isKiosk;
      if (forcedKind) {
        isKiosk = (forcedKind === 'kiosk');
      } else {
        var coarse = window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches;
        var fine = window.matchMedia && window.matchMedia('(any-pointer: fine)').matches;
        var big = Math.max(window.innerWidth, window.innerHeight) >= 900;
        /* 마우스가 붙어 있으면 키오스크가 아니다 — 터치 노트북을 걸러낸다.
           그래도 아이패드는 여전히 여기 걸린다. 그것이 표시를 두는 이유다. */
        isKiosk = !!(coarse && !fine && big);
      }
      document.documentElement.classList.toggle('kiosk-on', isKiosk);
      if (isKiosk) {
        ensureFullscreenUI();
        ensureHomeButton();
        ensureEnterOverlay();
        bindKioskEntry();
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

  /* ── 전체화면 상태를 페이지 이동 사이에 기억한다 ──────────────────────
     브라우저는 페이지를 옮기면 전체화면을 반드시 푼다. 표준 동작이라
     막을 방법이 없다(실측: 키오스크 홈에서 전체화면 진입 → 타일 터치 →
     /aipia/test 도착 시 fullscreenElement 가 null).

     그래서 "이 세션은 전체화면으로 쓰기로 했다"는 사실만 기억해 두고,
     새 페이지에서 사용자의 첫 조작이 들어오는 순간 조용히 다시 들어간다.
     안내판을 다시 띄우지 않으므로 이용자 눈에는 그냥 전체화면이 이어지는
     것처럼 보인다.

     sessionStorage 를 쓰는 이유: 탭을 닫으면 지워진다. 다음 이용자가
     "왜 전체화면이지?" 하는 일이 없도록 그 세션에만 남긴다. */
  var FS_WANT = 'kiosk_fs_wanted';
  function wantFullscreen(on) {
    try { on ? sessionStorage.setItem(FS_WANT, '1') : sessionStorage.removeItem(FS_WANT); }
    catch (e) {}
  }
  function isFullscreenWanted() {
    try { return sessionStorage.getItem(FS_WANT) === '1'; } catch (e) { return false; }
  }

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
    var onControl = !!(t && t.closest && t.closest(
      'a, button, [role="link"], [role="button"], [data-kiosk-go], input, select, textarea, label'));

    /* 누를 수 있는 것을 누른 경우
         pointerdown 단계에서는 들어가지 않는다(위 설명대로 클릭이 취소된다).
         대신 click 단계에서는 들어간다. 그때는 이미 클릭 처리가 끝난 뒤라
         레이아웃이 움직여도 취소될 것이 없고, 클릭은 브라우저가 인정하는
         사용자 제스처라 전체화면 진입이 허용된다.
       빈 곳을 누른 경우
         어느 단계든 바로 들어간다. */
    if (onControl && e && e.type !== 'click') return;

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

  /* 메인의 [키오스크 홈] 버튼 — 이 터치가 키오스크 모드의 시작점이다.
     여기서 "이 세션은 전체화면으로 쓴다"는 뜻을 남긴다.
     전체화면 자체는 페이지를 옮기면 브라우저가 반드시 풀기 때문에
     (실측: 이동 전 true → 이동 후 false) 여기서 켜 봐야 유지되지 않는다.
     대신 키오스크 홈에 도착하면 화면 전체가 안내판이 되어 첫 터치로 들어간다. */
  var entryBound = false;
  function bindKioskEntry() {
    if (entryBound) return;
    var btn = document.getElementById('ydKioskEntry');
    if (!btn) return;
    entryBound = true;
    btn.addEventListener('click', function () { wantFullscreen(true); }, true);
    btn.addEventListener('pointerdown', function () { wantFullscreen(true); }, true);
    /* 이 페이지는 ensureFullscreenUI 를 건너뛰므로 포커스 해제만 따로 건다
       (링크를 탭한 뒤 좌하단에 주소 말풍선이 남는 것을 막는다). */
    document.addEventListener('pointerup', blurLinkSoon, true);
    document.addEventListener('touchend', blurLinkSoon, true);
  }

  function ensureFullscreenUI() {
    if (isFramed) return;
    /* PC(마우스·트랙패드 등 fine 포인터가 있는 기기)에서는 전체화면 버튼·팝업을
       띄우지 않는다. 터치 전용 키오스크에서만 전체화면 UI를 쓴다. */
    if (window.matchMedia && window.matchMedia('(any-pointer: fine)').matches) return;
    /* 회사 홈페이지 메인에서는 전체화면 버튼도, 빈 곳 터치 자동 진입도 없다. */
    if (isKioskEntryPage()) return;
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
      /* 사용자가 직접 종료를 눌렀다면 3초 동안 자동 재진입을 막고,
         "전체화면으로 쓴다"는 기억도 지운다. 그러지 않으면 다음 터치에
         곧바로 다시 들어가 종료를 할 수 없게 된다. */
      if (isFullscreen()) { suppressUntil = Date.now() + 3000; wantFullscreen(false); }
      else wantFullscreen(true);
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
    if (window.matchMedia && window.matchMedia('(any-pointer: fine)').matches) return; // PC(마우스)엔 전체화면 팝업 없음
    if (isFullscreen() || enterOverlay) return;
    /* 사용자가 방금 [전체화면 종료]를 눌렀다면 잠시 띄우지 않는다.
       그러지 않으면 종료하자마자 안내판이 다시 떠서 종료를 할 수 없다. */
    if (Date.now() < suppressUntil) return;
    /* 예전에는 "이미 전체화면으로 쓰기로 한 세션"이면 안내판을 건너뛰었다.
       그런데 그 경우 키오스크 홈이 창 모드 그대로 보였다 — 작업표시줄과
       주소창이 노출된 실물 사진이 바로 그 상태다.
       키오스크 홈은 사람이 반드시 화면을 만지는 곳이므로, 전체화면이
       아니라면 언제나 안내판을 띄워 그 첫 터치를 전체화면 진입에 쓴다. */
    // 이미 전체화면으로 실행 중(--kiosk)이면 브라우저 창과 화면 크기가 같다.
    // 이 경우 안내판은 방해만 되므로 띄우지 않는다.
    if (window.innerHeight >= screen.height - 2) return;

    enterOverlay = document.createElement('div');
    enterOverlay.id = 'kiosk-enter-overlay';
    enterOverlay.innerHTML =
      '<div class="kiosk-enter-inner">' +
      '<div class="kiosk-enter-ico" aria-hidden="true"></div>' +
      '<div class="kiosk-enter-t">화면을 터치해 주세요</div>' +
      '<div class="kiosk-enter-d">' +
      (isFullscreenWanted() ? '전체 화면으로 이어서 진행합니다' : '전체 화면으로 시작합니다') +
      '</div>' +
      '</div>';
    enterOverlay.setAttribute('role', 'button');
    enterOverlay.setAttribute('tabindex', '0');
    enterOverlay.setAttribute('aria-label', '화면을 터치하면 전체 화면으로 시작합니다');

    function start(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      wantFullscreen(true);   /* 페이지를 옮겨도 이 뜻을 기억한다 */
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
