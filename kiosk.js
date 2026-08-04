// yedam.kr 키오스크(대형 터치 모니터) 자동 감지
// 가로·세로 모두 대응: 포인터가 손가락(터치)이고 화면이 크면 kiosk 모드로 간주해
// <html> 태그에 kiosk-on 클래스를 붙인다. kiosk.css가 이 클래스를 보고 확대 스타일을 적용.
(function () {
  function detect() {
    try {
      var coarse = window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches;
      var big = Math.max(window.innerWidth, window.innerHeight) >= 900;
      var isKiosk = !!(coarse && big);
      document.documentElement.classList.toggle('kiosk-on', isKiosk);
      return isKiosk;
    } catch (e) {
      return false;
    }
  }
  detect();
  window.addEventListener('resize', detect);
  window.addEventListener('orientationchange', detect);
  window.isKioskMode = detect;
})();
