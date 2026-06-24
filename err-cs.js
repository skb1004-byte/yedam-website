/*! AI PIA · 공용 에러 수집 + CS 문의 (err-cs.js)
 * - 전역 JS 에러/Promise 거부를 잡아 파일·줄·스택까지 Supabase(error_logs)에 저장
 * - 오류 시 작은 코드 토스트, 우측 하단 "문의" 버튼 → 문의 폼 → Supabase(inquiries)
 * 모든 페이지에서 <script src="err-cs.js" defer></script> 한 줄로 사용.
 */
(function () {
  'use strict';
  if (window.__errcs) return; window.__errcs = true;

  var SUPABASE_URL = 'https://ushtyxnmqclzgdnynusm.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_3PiMntSUB0kufZ9Wrvp0mA_a1Ump102';

  var APP = (location.pathname.split('/').pop() || 'index.html');
  var sent = 0, MAX = 20, lastSig = '', lastTime = 0;
  var _sb = null, _sbTry = false;

  function ensureSB(cb) {
    if (_sb) return cb(_sb);
    function make() {
      try { _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) { _sb = null; }
      cb(_sb);
    }
    if (window.supabase && window.supabase.createClient) return make();
    if (_sbTry) { // already loading; poll briefly
      var n = 0, t = setInterval(function () {
        n++; if (window.supabase && window.supabase.createClient) { clearInterval(t); make(); }
        else if (n > 40) { clearInterval(t); cb(null); }
      }, 100);
      return;
    }
    _sbTry = true;
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = make; s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }

  function code() {
    var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }

  function curUser(cb) {
    ensureSB(function (sb) {
      if (!sb) return cb(null);
      try {
        sb.auth.getSession().then(function (r) {
          var u = r && r.data && r.data.session && r.data.session.user;
          cb(u ? { id: u.id, email: u.email || null } : null);
        }).catch(function () { cb(null); });
      } catch (e) { cb(null); }
    });
  }

  function curStep() {
    try {
      if (window.__piaStep) return String(window.__piaStep).slice(0, 120);
      var h = document.querySelector('h1,h2');
      return (h ? h.textContent : document.title || '').trim().slice(0, 120);
    } catch (e) { return ''; }
  }

  function logError(o) {
    var sig = (o.message || '') + '|' + (o.source || '') + '|' + (o.lineno || '');
    var now = Date.now();
    if (sig === lastSig && now - lastTime < 4000) return null; // 중복·연속 폭주 방지
    lastSig = sig; lastTime = now;
    if (sent >= MAX) return null; sent++;
    var cd = code();
    curUser(function (u) {
      ensureSB(function (sb) {
        if (!sb) return;
        try {
          sb.from('error_logs').insert({
            code: cd, app: APP, page: location.pathname, step: curStep(),
            message: (o.message || '').slice(0, 2000),
            source: (o.source || '').slice(0, 500),
            lineno: o.lineno || null, colno: o.colno || null,
            stack: (o.stack || '').slice(0, 6000),
            user_id: u ? u.id : null, user_email: u ? u.email : null,
            user_agent: navigator.userAgent.slice(0, 400), url: location.href.slice(0, 800)
          }).then(function () {}, function () {});
        } catch (e) {}
      });
    });
    return cd;
  }

  // ---- 전역 에러 후킹 ----
  window.addEventListener('error', function (e) {
    if (e && e.message) {
      var st = e.error && e.error.stack ? e.error.stack : '';
      var cd = logError({ message: e.message, source: e.filename, lineno: e.lineno, colno: e.colno, stack: st });
      if (cd) toast(cd);
    }
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    var msg = (r && (r.message || r.toString())) || 'Unhandled promise rejection';
    var st = (r && r.stack) || '';
    var cd = logError({ message: String(msg), source: location.pathname, stack: st });
    if (cd) toast(cd);
  });
  // 페이지에서 직접 부를 수 있는 수동 기록 API
  window.reportError2 = function (msg, extra) {
    return logError(Object.assign({ message: String(msg), source: location.pathname, stack: (new Error()).stack }, extra || {}));
  };

  // ---- UI (스타일 주입) ----
  function css() {
    if (document.getElementById('errcs-css')) return;
    var s = document.createElement('style'); s.id = 'errcs-css';
    s.textContent =
      '.errcs-fab{position:fixed;right:16px;bottom:16px;z-index:99998;background:#141413;color:#fff;border:0;border-radius:999px;padding:11px 16px;font:600 13px/1 "Noto Sans KR",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.18);cursor:pointer;display:flex;align-items:center;gap:6px}' +
      '.errcs-fab:hover{background:#2a2a27}' +
      '.errcs-toast{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:99999;background:#fff5e8;color:#7a5b00;border:1px solid #f0d98a;border-radius:12px;padding:11px 14px;font:500 13px/1.5 "Noto Sans KR",sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.12);max-width:90vw}' +
      '.errcs-toast b{font-weight:800;letter-spacing:.5px}' +
      '.errcs-toast a{color:#c4623f;font-weight:700;text-decoration:none;margin-left:8px;cursor:pointer}' +
      '.errcs-mask{position:fixed;inset:0;z-index:100000;background:rgba(20,20,19,.45);display:flex;align-items:center;justify-content:center;padding:18px}' +
      '.errcs-modal{background:#fff;border-radius:16px;max-width:420px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:"Noto Sans KR",sans-serif}' +
      '.errcs-modal h3{font-size:17px;font-weight:800;margin:0 0 4px;color:#141413}' +
      '.errcs-modal p{font-size:12.5px;color:#3d3d3a;margin:0 0 14px}' +
      '.errcs-modal label{display:block;font-size:12px;font-weight:700;color:#3d3d3a;margin:10px 0 4px}' +
      '.errcs-modal input,.errcs-modal textarea{width:100%;border:1px solid #e3e0d6;border-radius:10px;padding:10px;font:inherit;font-size:14px;box-sizing:border-box}' +
      '.errcs-modal textarea{min-height:96px;resize:vertical}' +
      '.errcs-row{display:flex;gap:8px;margin-top:16px}' +
      '.errcs-row button{flex:1;border:0;border-radius:10px;padding:11px;font:700 14px "Noto Sans KR",sans-serif;cursor:pointer}' +
      '.errcs-send{background:#d97757;color:#fff}.errcs-cancel{background:#f3f1ea;color:#141413}' +
      '.errcs-msg{font-size:12.5px;margin-top:10px;min-height:16px}';
    document.head.appendChild(s);
  }

  var lastCode = '';
  function toast(cd) {
    lastCode = cd; css();
    var old = document.querySelector('.errcs-toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'errcs-toast';
    t.innerHTML = '문제가 발생했어요 · 코드 <b>' + cd + '</b><a>문의하기</a>';
    t.querySelector('a').onclick = function () { openForm(cd); };
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 9000);
  }

  function openForm(prefCode) {
    css();
    var mask = document.createElement('div'); mask.className = 'errcs-mask';
    mask.innerHTML =
      '<div class="errcs-modal" role="dialog" aria-modal="true">' +
        '<h3>문의하기</h3>' +
        '<p>불편을 드려 죄송해요. 내용을 남겨주시면 확인 후 도와드릴게요.</p>' +
        '<label>이름</label><input id="errcs-name" placeholder="이름 또는 닉네임">' +
        '<label>연락처(이메일·전화)</label><input id="errcs-contact" placeholder="회신받을 연락처">' +
        '<label>문의 내용</label><textarea id="errcs-text" placeholder="어떤 상황이었는지 알려주세요"></textarea>' +
        (prefCode ? '<label>오류 코드</label><input id="errcs-code" value="' + prefCode + '" readonly>' : '<input id="errcs-code" type="hidden" value="">') +
        '<div class="errcs-msg" id="errcs-fmsg"></div>' +
        '<div class="errcs-row"><button class="errcs-cancel" id="errcs-x">취소</button><button class="errcs-send" id="errcs-go">보내기</button></div>' +
      '</div>';
    document.body.appendChild(mask);
    var close = function () { mask.remove(); };
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('#errcs-x').onclick = close;
    mask.querySelector('#errcs-go').onclick = function () {
      var name = (mask.querySelector('#errcs-name').value || '').trim();
      var contact = (mask.querySelector('#errcs-contact').value || '').trim();
      var text = (mask.querySelector('#errcs-text').value || '').trim();
      var cd = (mask.querySelector('#errcs-code').value || '').trim();
      var fm = mask.querySelector('#errcs-fmsg');
      if (!text) { fm.style.color = '#c0392b'; fm.textContent = '문의 내용을 입력해 주세요.'; return; }
      fm.style.color = '#3d3d3a'; fm.textContent = '보내는 중…';
      curUser(function (u) {
        ensureSB(function (sb) {
          if (!sb) { fm.style.color = '#c0392b'; fm.textContent = '연결 오류 — 잠시 후 다시 시도해 주세요.'; return; }
          sb.from('inquiries').insert({
            name: name || null, contact: contact || null, message: text.slice(0, 4000),
            error_code: cd || null, page: location.pathname,
            user_id: u ? u.id : null, user_email: u ? u.email : null
          }).then(function (r) {
            if (r && r.error) { fm.style.color = '#c0392b'; fm.textContent = '전송 실패: ' + r.error.message; }
            else { mask.querySelector('.errcs-modal').innerHTML = '<h3>접수되었습니다 ✅</h3><p>확인 후 빠르게 도와드릴게요. 감사합니다.</p><div class="errcs-row"><button class="errcs-send" id="errcs-ok">닫기</button></div>'; mask.querySelector('#errcs-ok').onclick = close; }
          }, function (e) { fm.style.color = '#c0392b'; fm.textContent = '전송 오류 — 잠시 후 다시 시도해 주세요.'; });
        });
      });
    };
  }
  window.openInquiry = function () { openForm(lastCode || ''); };

  // 우측 하단 문의 버튼
  function fab() {
    css();
    if (document.querySelector('.errcs-fab')) return;
    var b = document.createElement('button'); b.className = 'errcs-fab';
    b.innerHTML = '💬 문의';
    b.onclick = function () { openForm(lastCode || ''); };
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fab);
  else fab();
})();
