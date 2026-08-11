@echo off
chcp 65001 > nul
rem ============================================================
rem  예담 키오스크 자동 시작 설치 (한 번만 실행)
rem ------------------------------------------------------------
rem  이 파일을 키오스크 PC 에서 한 번 더블클릭하면
rem    · 크롬이 지금 바로 전체화면 키오스크로 뜨고
rem    · 앞으로 이 PC 를 켤 때마다 자동으로 전체화면 키오스크가 뜹니다.
rem
rem  왜 이게 필요한가
rem    "키오스크 홈에 들어가면 전체화면" 은 웹페이지만으로는 안 됩니다.
rem    브라우저는 페이지가 열렸다는 이유만으로 전체화면에 못 들어가게
rem    막습니다(사용자의 실제 터치·클릭 안에서만 허용). 악성 사이트가
rem    몰래 화면을 덮는 걸 막는 규칙이라 우회할 수 없습니다.
rem    그래서 작업표시줄·주소창 없이 처음부터 전체화면이려면 크롬을
rem    --kiosk 로 띄워야 하고, 그건 브라우저 밖(이 배치)에서만 됩니다.
rem
rem  같은 폴더에 "키오스크-실행.bat" 이 함께 있어야 합니다.
rem ============================================================

setlocal
set "HERE=%~dp0"
set "LAUNCHER=%HERE%키오스크-실행.bat"

if not exist "%LAUNCHER%" (
  echo.
  echo  "키오스크-실행.bat" 을 찾지 못했습니다.
  echo  이 설치 파일과 실행 파일을 같은 폴더에 두고 다시 실행해 주세요.
  echo  (지금 폴더: %HERE%)
  echo.
  pause
  exit /b 1
)

rem ── 시작 프로그램에 바로 가기 등록 ──────────────────────────
rem   원본을 옮기지 않고 shell:startup 폴더에 "바로 가기"만 넣습니다.
rem   그래야 실행 파일을 수정해도 자동 시작이 계속 최신본을 가리킵니다.
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP%\예담키오스크.lnk"

rem   바로 가기는 배치로 직접 못 만들어 PowerShell 한 줄을 빌립니다.
powershell -NoProfile -Command ^
  "$w = New-Object -ComObject WScript.Shell;" ^
  "$s = $w.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = '%LAUNCHER%';" ^
  "$s.WorkingDirectory = '%HERE%';" ^
  "$s.WindowStyle = 7;" ^
  "$s.Description = '예담 키오스크 자동 시작';" ^
  "$s.Save()"

if exist "%SHORTCUT%" (
  echo.
  echo  [완료] 자동 시작에 등록했습니다.
  echo         이제 이 PC 를 켤 때마다 전체화면 키오스크가 자동으로 뜹니다.
  echo.
) else (
  echo.
  echo  [실패] 자동 시작 등록에 실패했습니다.
  echo         수동으로 등록하려면:
  echo           1) Win+R → shell:startup 입력 → 확인
  echo           2) 열린 폴더에 "키오스크-실행.bat" 의 바로 가기를 넣기
  echo.
)

rem ── 자동 로그인 안내 ────────────────────────────────────────
echo  ─────────────────────────────────────────────────────────
echo   전원만 켜면 바로 키오스크가 뜨게 하려면 자동 로그인도 켜세요.
echo     Win+I → 계정 → 로그인 옵션
echo     (키오스크 전용 계정을 따로 만들어 쓰는 편이 안전합니다)
echo  ─────────────────────────────────────────────────────────
echo.

rem ── 지금 바로 한 번 띄우기 ──────────────────────────────────
echo  지금 키오스크를 실행합니다. (종료: Alt+F4)
timeout /t 2 > nul
call "%LAUNCHER%"

endlocal
exit /b 0
