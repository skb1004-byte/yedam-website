# vendor — 자체 호스팅 외부 라이브러리·웹폰트

외부 CDN이 끊기거나 폐쇄망에 들어가도 화면이 그대로 뜨게 하려고 옮겨 둔 것이다.
전부 **원본과 바이트 단위로 같은 파일**이며, 우리가 고친 것은 CSS 안의 경로뿐이다.

## 자바스크립트

| 파일 | 원본 | 크기 | 무결성 확인 |
|---|---|---:|---|
| `tailwind-3.4.17.js` | `cdn.tailwindcss.com` → 3.4.17 | 407 KB | — |
| `supabase-js-2.112.1.umd.js` | jsDelivr `@supabase/supabase-js@2.112.1` | 206 KB | **SRI 일치** |
| `chart-4.4.1.umd.js` | jsDelivr `chart.js@4.4.1` | 200 KB | **SRI 일치** |
| `qrcode-1.0.0.min.js` | cdnjs `qrcodejs@1.0.0` | 20 KB | — |

supabase-js와 chart.js는 기존 HTML에 박혀 있던 `integrity="sha384-..."` 값과
내려받은 파일의 SHA-384가 **정확히 일치**했다. 브라우저가 그동안 받아 쓰던 파일과
같은 것임이 증명된 셈이다.

```
supabase : sha384-0x8XPoHt08aHZj+RHs8ojmhZ5IDsTLjPgblgWdriayWriqv9dic3Vkv1K2+UqgZV
chart.js : sha384-dug+JxfBvklEQdJ4AYuBBAIScUz0bVN73xpy273gcAwHjb3qI0fXmuYNaNfdyYJG
```

**같은 출처 파일에는 `integrity` 속성을 다시 붙이지 않는다.** 붙이면 브라우저가
로드를 막는다. 이번 작업에서 HTML 12곳·JS 2곳의 SRI 속성을 함께 제거했다.

## 웹폰트

| 경로 | 내용 | 파일 수 | 크기 |
|---|---|---:|---:|
| `fonts/fonts.css` | Noto Sans KR(가변) · Poppins · Lora | @font-face 911개 | 660 KB |
| `fonts/*.woff2` | 위 CSS가 참조하는 서브셋 | 153 | 4.2 MB |
| `fonts/pretendard.css` | Pretendard Variable 1.3.9 | @font-face 92개 | 54 KB |
| `fonts/pretendard/*.woff2` | 위 CSS가 참조하는 서브셋 | 92 | 3.1 MB |

`unicode-range` 서브셋 구조를 그대로 유지했다. 파일 수는 많지만 브라우저는
화면에 실제로 쓰이는 조각만 내려받는다(보통 2~5개). 한글은 가변 폰트라
굵기가 여섯 종이어도 파일은 한 벌만 있으면 된다.

Pretendard는 jsDelivr가 동적 생성 파일이라 SRI를 쓰지 말라고 안내하던 것이라,
자체 호스팅이 무결성 측면에서도 낫다.

폰트 라이선스는 셋 다 **SIL Open Font License 1.1** — 자체 호스팅·재배포가 허용된다.

## 아직 외부에 남긴 것

| 대상 | 위치 | 이유 |
|---|---|---|
| `@huggingface/transformers@3.3.3` | `aipia/test.html:2698` 외 2곳 | 브라우저 내 추론용 ESM. 자기 자신이 다시 여러 파일을 불러오는 큰 트리라 통째로 옮기기 어렵다. 키오스크에서는 이 경로가 꺼져 있고(모델 자동 다운로드 차단), 안 되면 서버 AI로 넘어간다 |

## 확인 방법

로컬 정적 서버를 띄우고 **외부 요청을 전부 차단한 상태**에서 열어 본다.
10개 화면 중 9개가 외부 요청 0건·404 0건으로 정상 렌더링되는 것을 확인했다.
`aipia/test.html`만 외부 요청이 남는데, 전부 CDN이 아니라 실제 서비스다
(api.yedam.kr · Supabase · AI 폴백 · 위 transformers).
