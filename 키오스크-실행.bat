@echo off
chcp 65001 > nul
rem ============================================================
rem  예담 키오스크 실행
rem ------------------------------------------------------------
rem  이 파일을 더블클릭하면 크롬이 키오스크 전용 모드로 뜹니다.
rem    - 주소줄 · 탭 · 메뉴 없음
rem    - 화면 전체를 덮어 작업표시줄이 가려짐
rem    - 종료: Alt+F4  (또는 Ctrl+Alt+Del → 작업 관리자)
rem
rem  왜 이 파일이 필요한가
rem    웹페이지의 자바스크립트로는 윈도우 작업표시줄을 숨길 수 없습니다.
rem    브라우저는 OS 를 건드릴 권한이 없기 때문입니다.
rem    화면 안의 [전체화면으로 보기] 버튼은 크롬 창만 전체화면으로 만들 뿐,
rem    작업표시줄을 "자동 숨김" 으로 바꾸지는 못합니다.
rem    작업표시줄까지 확실히 없애려면 크롬을 --kiosk 로 띄워야 하고,
rem    그건 브라우저 밖(이 배치 파일)에서만 지정할 수 있습니다.
rem
rem  전원을 켜면 바로 뜨게 하려면 (권장 설정)
rem    1) Win+R → shell:startup → 열린 폴더에 이 파일의 "바로 가기"를 넣기
rem       (원본을 옮기지 말고 바로 가기를 넣으세요)
rem    2) Win+I → 계정 → 로그인 옵션 → 자동 로그인 켜기
rem       (키오스크 전용 계정을 따로 만들어 쓰는 편이 안전합니다)
rem
rem  더 강하게 잠그려면
rem    --kiosk 는 브라우저 화면만 덮을 뿐 윈도우 자체를 잠그지는 않습니다.
rem    Alt+F4 나 Ctrl+Alt+Del 을 아는 사람은 바탕화면으로 나갈 수 있습니다.
rem    사람이 많은 곳에 두는 기기라면 윈도우 "할당된 액세스(Assigned Access)"
rem    로 전용 계정을 한 앱에만 묶는 것을 검토하세요.
rem ============================================================

rem  주소 끝의 ?device=kiosk 를 지우지 마세요.
rem
rem  왜 필요한가 (2026-08-09 실측으로 확인한 문제)
rem    이 키오스크는 윈도우 PC + 터치모니터입니다. 마우스나 터치패드가 함께
rem    연결돼 있으면 브라우저가 "정밀 포인터가 있다"고 보고합니다.
rem    자동 판정은 "손가락만 있고 마우스는 없을 것"을 조건으로 삼기 때문에,
rem    이 경우 키오스크가 아니라 **데스크톱**으로 잡힙니다.
rem    그러면 키오스크 전용 기능이 통째로 안 붙습니다 —
rem      · 큰 글자·큰 버튼(kiosk.css)
rem      · 전체화면 진입 안내판과 [전체화면] 버튼
rem      · AI PIA 검사 화면을 한 화면에 맞추는 배율 조정
rem    실제로 이 주소에 ?device=kiosk 를 붙이니 안내판이 바로 나타났습니다.
rem
rem  아래에서 프로필 폴더를 매번 지우기 때문에 브라우저에 저장된 표시도
rem  같이 지워집니다. 그래서 주소에 매번 넣어 주어야 합니다.
rem
rem  참고 — 이 표시를 해제하려면 주소에 ?device=auto 를 한 번 붙여 열면 됩니다.
set "URL=https://yedam.kr/kiosk-home?device=kiosk"

rem 키오스크 전용 프로필. 일반 크롬 프로필과 분리해서
rem 개인 북마크·로그인·방문기록이 키오스크 화면에 노출되지 않게 합니다.
set "PROFILE=%LOCALAPPDATA%\YedamKiosk\ChromeProfile"

rem 설치 위치가 PC 마다 다르므로 순서대로 찾습니다.
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not defined CHROME (
  echo.
  echo  크롬을 찾지 못했습니다.
  echo  크롬이 설치돼 있는지 확인하거나, 이 파일의 CHROME 경로를 직접 지정해 주세요.
  echo.
  pause
  exit /b 1
)

rem 이전 사용자가 남긴 흔적(입력한 이름·학교, 결과 열람 코드 등)을 지우고
rem 시작합니다. 키오스크는 여러 사람이 번갈아 쓰기 때문에, 앞사람의 검사
rem 정보가 localStorage 에 남아 있으면 뒷사람이 볼 수 있습니다.
if exist "%PROFILE%" rd /s /q "%PROFILE%" 2>nul

rem --use-fake-ui-for-media-stream 에 대하여
rem   이름과 달리 가짜 마이크를 쓰는 게 아니라, 마이크 권한 팝업을 자동으로
rem   수락하게 하는 옵션입니다. AI PIA 자유대화에서 매번 "마이크를 허용
rem   하시겠습니까" 를 어르신·학생이 눌러야 하는 문제를 없앱니다.
rem   전용 프로필 + 고정 URL(yedam.kr)에서만 뜨므로 다른 사이트가 이 권한을
rem   가져갈 일은 없습니다. 마이크 자동 허용이 부담스러우면 이 줄을 지우세요.

start "" "%CHROME%" ^
  --kiosk "%URL%" ^
  --user-data-dir="%PROFILE%" ^
  --no-first-run ^
  --no-default-browser-check ^
  --noerrdialogs ^
  --disable-infobars ^
  --disable-session-crashed-bubble ^
  --disable-features=TranslateUI,Translate ^
  --overscroll-history-navigation=0 ^
  --disable-pinch ^
  --autoplay-policy=no-user-gesture-required ^
  --use-fake-ui-for-media-stream

exit /b 0
