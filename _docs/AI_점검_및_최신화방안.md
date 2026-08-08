# AI 자유대화 실동작 점검 결과와 최신화 방안

작성 2026-08-08 · 실제 라이브(yedam.kr)에서 브라우저로 호출해 측정

---

## 1. 지금 무슨 일이 일어나고 있나

### 확인된 사실

`aipia/test.html`을 여는 순간, 자유대화를 시작하지도 않았는데
**AI 모델 파일을 자동으로 내려받기 시작한다.**

측정한 네트워크 순서:

```
← 200 cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3
← 307 huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/.../config.json
← 307 .../tokenizer.json
← 302 .../onnx/model...
← 200 us.aws.cdn.hf.co/xet-bridge-us/...     ← 여기서 가중치 파일
   (이 지점에서 브라우저가 죽음)
```

모델 실제 용량 (HuggingFace 조회):

| 파일 | 용량 |
|---|---|
| `model_q4.onnx` | **749 MB** |
| `model_q4f16.onnx` | **460 MB** |

### 왜 키오스크에서 특히 위험한가

코드의 기기 판정은 이렇다 (`aipia/test.html` 8861줄):

```js
function isMobile() {
  return /android|webos|iphone|.../i.test(navigator.userAgent)
    || window.innerWidth < 768;
}
```

키오스크는 1024×768 · 1280×1024이므로 **"데스크톱"으로 분류**된다.
그리고 데스크톱이면 모델 다운로드가 허용된다 (5171·5387·5421·5680줄
`_ondeviceAllowDL = !isMobile()`).

즉 **OLLSTAR POS·P2C 키오스크는 매번 460~749MB를 받으려 시도한다.**
POS급 하드웨어(저전력 CPU·4~8GB RAM)에서는

- 첫 실행 시 수 분간 다운로드
- WASM 추론이 매우 느림
- 최악의 경우 브라우저 종료 (테스트 환경에서 실제로 발생)

기본 엔진이 `ONDEVICE`로 되어 있어(3316줄) 설정을 건드리지 않은
키오스크는 전부 이 경로를 탄다.

### 그 밖에 확인된 것

| 항목 | 상태 |
|---|---|
| `api.yedam.kr` 결과 저장 | 정상 (ping 200, 없는코드 404, 빈비번 401) |
| pollinations POST | **402 Payment Required** — "legacy API deprecated" 명시 |
| pollinations GET | 타임아웃 |
| huggingface 직접 호출 | **CORS 차단** (브라우저에서 불가, 프록시 필수) |
| Gemini (키 없이) | 403 — 정상 (키만 넣으면 됨) |
| 커리어넷 키 | **소스에 하드코딩·공개 노출** (3316줄) |
| 음성 인식·마이크 | 지원 · 트랙 획득 성공 |
| 음성 합성(TTS) | API 지원. 목소리 수는 OS 의존 |

`callLLMFree`는 프록시 → pollinations POST → pollinations GET 3단
폴백인데, **3단 중 2단이 죽어 있다.**

---

## 2. 무료 한국어 AI — 무엇을 쓸 것인가

2026년 8월 기준 무료 티어를 조사한 결과.

| 공급자 | 무료 한도 | 속도 | 한국어 | 카드 |
|---|---|---|---|---|
| **Google Gemini 2.5 Flash** | 1,500 요청/일 · 컨텍스트 100만 | 빠름 | 우수 | 불필요 |
| **Groq (Llama 3.3 70B)** | 6K 토큰/분 | 300+ tok/s | 양호 | 불필요 |
| **Cerebras** | 100만 토큰/일 | 매우 빠름 | 양호 | 불필요 |
| GitHub Models | 계정 기반 | 보통 | 양호 | 불필요 |
| ~~pollinations~~ | ~~무제한~~ | — | — | **폐기 중** |

**추천 조합: Gemini 1순위 → Groq 2순위 → Cerebras 3순위**

- Gemini는 하루 1,500회로 키오스크 1대 기준 충분하고 한국어 품질이 가장 낫다
- Groq은 응답이 빨라 대화 체감이 좋다 (대기 시간이 짧을수록 어르신·학생 이탈이 준다)
- Cerebras는 토큰 한도가 커서 장문 결과 해설에 적합

세 곳 모두 신용카드 없이 발급되고, 한 곳이 막혀도 나머지로 넘어간다.

### 음성 (참고)

- **STT**: 현재 브라우저 Web Speech API로 충분히 동작 중. 정확도를 더
  올리려면 RTZR(리턴제로) 한국어 STT가 국내 벤치마크 상위이나 유료 구간이 있다.
- **TTS**: Windows 키오스크에는 한국어 음성이 기본 탑재되어 있어
  현재 방식(SpeechSynthesis)으로 충분하다. 별도 API 불필요.

---

## 3. 권하는 조치 — 세 단계

### 1단계 · 즉시 (위험 제거)

**키오스크에서 온디바이스 모델 자동 다운로드를 막는다.**

`isMobile()`이 화면 폭만 보므로 키오스크가 데스크톱으로 잡힌다.
키오스크 판정(`html.kiosk-on`)을 추가해 그 경우 다운로드를 끈다.

```js
// 키오스크는 POS급 저사양 기기다. 460~749MB 모델을 받아 WASM 으로
// 추론하는 것은 감당하지 못한다(실측에서 브라우저 종료).
// 화면이 커도 키오스크면 온디바이스를 쓰지 않는다.
function _isKioskDevice() {
  return document.documentElement.classList.contains('kiosk-on');
}
_ondeviceAllowDL = !isMobile() && !_isKioskDevice();
```

이 한 줄로 크래시 위험이 사라지고, 폴백인 무료 AI 경로로 내려간다.
**검사 문항·점수·API 계약은 건드리지 않는다.**

### 2단계 · 단기 (엔진 교체)

Cloudflare Worker(`_backup/cloudflare/worker.js`)에 이미 다중 공급자
폴백 구조가 있다. 여기에 키를 넣고 프론트는 프록시만 부른다.

```
프론트 → Worker(/chat) → Gemini → 실패 시 Groq → 실패 시 Cerebras
```

이렇게 하면
- 키가 브라우저에 노출되지 않는다 (지금 커리어넷 키가 노출된 것과 같은 사고를 막는다)
- CORS 문제가 사라진다 (huggingface 직접 호출이 막히는 문제 해결)
- 한 공급자가 죽어도 자동으로 넘어간다 (pollinations 402 같은 사고 대비)

Worker는 이미 `GEMINI_KEY`·`HF_KEY`·`GITHUB_KEY` 환경변수를 읽게
되어 있으므로, Groq·Cerebras 분기만 추가하면 된다.

### 3단계 · 정리 (보안)

**커리어넷 키를 재발급하고 Worker로 옮긴다.**

현재 `aipia/test.html` 3316줄에 평문으로 있고 공개 저장소라 그대로 노출된다.
Worker에는 이미 `CAREERNET_KEY`를 쓰는 코드가 있다(worker.js 44줄).

```
1. 커리어넷에서 키 재발급 (기존 키 폐기)
2. Worker 환경변수 CAREERNET_KEY 에 새 키 저장
3. aipia/test.html 의 careernet:'...' → careernet:'' 로 비우기
4. 커리어넷 호출을 Worker 경유로 변경
```

---

## 4. 결정이 필요한 것

| 항목 | 선택지 |
|---|---|
| 1단계 즉시 조치 | 지금 적용할지 |
| 기본 엔진 | Gemini / Groq / Cerebras 중 무엇을 1순위로 |
| Worker 프록시 | 새로 배포할지, 프론트 직접 호출로 갈지 |
| 커리어넷 키 | 재발급 시점 |

키 발급은 계정 소유자만 할 수 있어 대신 해 드릴 수 없다.
발급해 주시면 Worker 배포와 연동은 이어서 진행할 수 있다.

---

## 부록 · 측정 재현 방법

```bash
# 라이브에서 API 상태 확인 (브라우저 컨텍스트에서 호출해야 CORS 가 재현됨)
node /tmp/api.js

# 자유대화 진입 시 네트워크·크래시 관찰
node /tmp/crash.js
```

측정 환경: Chrome 151 headless · 1024×768 · 캐시 비활성 · 2026-08-08
