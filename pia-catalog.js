var OFFLINE_ITEMS = [
  'Rosenberg 자존감 척도(RSES)','WHO-5 웰빙 지수','Brief Resilience Scale(BRS)','일반적 자기효능감(GSE)',
  'IPIP Item Pool','Open Source Psychometrics','openpsychometrics 데이터셋','five-factor-e (IPIP-NEO)',
  'Big Five Aspect Scales (BFAS)','HEXACO-PI-R 공개 문항','PHQ / GAD 스크리너','CES-D 우울 척도',
  'AI Hub 청소년 감정 데이터','MeloTTS Korean','Kokoro Web TTS',
  'IPIP Big5-50','openpsychometrics RIASEC','VIA Youth Strengths',
  'LG EXAONE (오픈웨이트)','NCSOFT VARCO','KoBERT / KoELECTRA'
];
const FREE_API_CATALOG = [
  { category:'⚡ 자동 연동 — 키 불필요·브라우저 직접(CORS, 웹검증)', items:[
    { name:'위키백과 REST (한국어)', url:'https://ko.wikipedia.org/api/rest_v1/', limit:'무료·무인증', models:'직업·개념 요약(summary)', notes:'CORS ✓ — 결과지 진로 섹션에 자동 연동됨', auto:true, ping:'https://ko.wikipedia.org/api/rest_v1/page/summary/%EC%8B%AC%EB%A6%AC%ED%95%99' },
    { name:'Wikipedia REST (English)', url:'https://en.wikipedia.org/api/rest_v1/', limit:'무료·무인증', models:'영문 요약(폴백)', notes:'CORS ✓ — ko 미존재 시 자동 폴백', auto:true, ping:'https://en.wikipedia.org/api/rest_v1/page/summary/Psychology' },
    { name:'Wikidata / Wikimedia', url:'https://www.wikidata.org/w/rest.php', limit:'무료·무인증', models:'구조화 지식', notes:'CORS ✓ — 키 없이 호출', auto:true, ping:'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=psychology&language=en&format=json&origin=*' },
    { name:'MyMemory 번역', url:'https://mymemory.translated.net/', limit:'무료·무인증(~5천 단어/일)', models:'EN↔KO 등 번역', notes:'CORS ✓ — AI 요약 영어 번역에 사용', auto:true, ping:'https://api.mymemory.translated.net/get?q=hello&langpair=en%7Cko' },
    { name:'Free Dictionary', url:'https://dictionaryapi.dev/', limit:'무료·무인증', models:'영어 단어 뜻·발음', notes:'CORS ✓ — 용어 풀이', auto:true, ping:'https://api.dictionaryapi.dev/api/v2/entries/en/test' },
    { name:'Datamuse (연관어)', url:'https://www.datamuse.com/api/', limit:'무료·무인증(~10만/일)', models:'관심사·키워드 연관어 확장', notes:'CORS ✓ — 흥미 키워드 확장에 사용', auto:true, ping:'https://api.datamuse.com/words?ml=career&max=1' },
    { name:'Open Library', url:'https://openlibrary.org/', limit:'무료·무인증', models:'직업·주제 도서·추천', notes:'CORS ✓ — 진로 독서추천에 활용', auto:true, ping:'https://openlibrary.org/search.json?q=psychology&limit=1' },
    { name:'ConceptNet (개념 연관망)', url:'https://conceptnet.io/', limit:'무료·무인증', models:'개념·흥미 의미 연관', notes:'CORS ✓ — 관심사 의미망 확장', auto:true, ping:'https://api.conceptnet.io/c/en/career?limit=1' },
    { name:'Wiktionary REST', url:'https://en.wiktionary.org/api/rest_v1/', limit:'무료·무인증', models:'어휘 정의·뜻풀이', notes:'CORS ✓ — 용어 풀이 보강', auto:true, ping:'https://en.wiktionary.org/api/rest_v1/page/definition/test' }
  ]},
  { category:'🧩 확장 가능 오픈 검사도구 — 청소년·무료/공개 (웹검증 2026)', items:[
    { name:'Rosenberg 자존감 척도(RSES)', url:'https://www.testable.org/scale/rses-rosenberg-self-esteem-scale', limit:'퍼블릭 도메인', models:'자존감 10문항(역채점 5)', notes:'무료·공개 — 출처표기 권장' },
    { name:'WHO-5 웰빙 지수', url:'https://www.psykiatri-regionh.dk/who-5/Pages/default.aspx', limit:'무료(WHO)', models:'정서적 웰빙 5문항', notes:'9세+ 검증·한국어판 존재' },
    { name:'Brief Resilience Scale(BRS)', url:'https://ogg.osu.edu/media/documents/MB%20Stream/Brief%20Resilience%20Scale.pdf', limit:'무료(연구·교육)', models:'회복탄력성 6문항', notes:'Smith 2008 · 출처표기' },
    { name:'일반적 자기효능감(GSE)', url:'https://userpage.fu-berlin.de/~health/faq_gse.pdf', limit:'무료(연구·교육)', models:'자기효능감 10문항', notes:'Schwarzer & Jerusalem' },
    { name:'커리어넷 진로심리검사(6종)', url:'https://www.career.go.kr/cnet/front/examen/examenMain.do', limit:'무료(정부)', models:'직업흥미·적성·가치관·진로성숙도', notes:'무상 응시·해석(KRIVET)' },
    { name:'워크넷 청소년 직업심리검사', url:'https://www.work.go.kr/consltJobCarpa/jobPsyExam/jobPsyExamIntro.do', limit:'무료(정부)', models:'흥미·적성·가치관·진로발달', notes:'무상 응시·해석(고용정보원)' }
  ]},
  { category:'🧪 인적성·심리검사 구현용 오픈소스 (웹검증 2026)', items:[
    { name:'IPIP Item Pool', url:'https://ipip.ori.org/', limit:'퍼블릭 도메인', models:'Big5 등 3,300+ 문항', notes:'저작권 無 · 상업·연구 자유 이용' },
    { name:'Open Source Psychometrics', url:'https://openpsychometrics.org/', limit:'무료', models:'Big5·RIASEC·다크트라이어드 등', notes:'문항·채점 공개 — 직접 구현 가능' },
    { name:'openpsychometrics 데이터셋', url:'https://github.com/haghish/openpsychometrics', limit:'무료(연구용)', models:'RIASEC 48문항+응답 데이터', notes:'GitHub 익명 설문 raw 데이터' },
    { name:'five-factor-e (IPIP-NEO)', url:'https://github.com/NeuroQuestAi/five-factor-e', limit:'오픈소스', models:'IPIP-NEO 120/300 자동 채점', notes:'Python 라이브러리 · 백엔드 채점' },
    { name:'Sentino Personality API', url:'https://sentino.org/api/', limit:'프리티어', models:'Big5 NLP 추론', notes:'텍스트→성격 추정 REST' },
    { name:'Big Five Aspect Scales (BFAS)', url:'https://www.colby.edu/psych/personality-lab/', limit:'공개 문항', models:'Big5 10측면 100문항', notes:'DeYoung 2007 · 공개·자체구현(출처표기)' },
    { name:'HEXACO-PI-R 공개 문항', url:'https://hexaco.org/', limit:'공개 문항', models:'HEXACO 6요인', notes:'Lee & Ashton · 비상업 공개·자체구현' }
  ]},
  { category:'🧠 정서 스크리닝 척도 (퍼블릭 도메인, 웹검증)', items:[
    { name:'PHQ / GAD 스크리너', url:'https://www.phqscreeners.com/', limit:'무료 · 저작권 無', models:'PHQ-9 · PHQ-A · GAD-7', notes:'2010 Pfizer 공개 — 번역·배포 허가 불필요' },
    { name:'CES-D 우울 척도', url:'https://en.wikipedia.org/wiki/Center_for_Epidemiologic_Studies_Depression_Scale', limit:'무료(공개 척도)', models:'우울 선별 10/20문항', notes:'참고용 선별 도구' }
  ]},
  { category:'🇰🇷 국내 진로·심리검사 OpenAPI (웹검증)', items:[
    { name:'커리어넷 진로심리검사 API', url:'https://www.career.go.kr/cnet/front/openapi/openApiTestCenter.do', limit:'무료(인증키)', models:'검사 문항·결과 요청', notes:'중·고등 진로심리검사 · CORS 차단(백엔드 프록시)' },
    { name:'워크넷 심리검사결과', url:'https://www.data.go.kr/data/15026112/openapi.do', limit:'무료(인증키)', models:'직업심리검사 결과', notes:'한국고용정보원 · data.go.kr' },
    { name:'커리어넷 직업정보', url:'https://www.data.go.kr/data/15056641/openapi.do', limit:'무료(인증키)', models:'직업 사전·상세', notes:'진로 추천 연동' }
  ]},
  { category:'😊 감정·문장 분석 모델 (HuggingFace, 웹검증)', items:[
    { name:'multilingual-sentiment', url:'https://huggingface.co/tabularisai/multilingual-sentiment-analysis', limit:'무료(rate-limited)', models:'23개 언어 감정분류', notes:'한국어 포함 · Inference API' },
    { name:'bert-multilingual-sentiment', url:'https://huggingface.co/nlptown/bert-base-multilingual-uncased-sentiment', limit:'무료', models:'1~5 별점 감정', notes:'다국어 BERT' },
    { name:'multilingual go_emotions', url:'https://huggingface.co/AnasAlokla/multilingual_go_emotions_V1.1', limit:'무료', models:'다중 감정 라벨(28종)', notes:'104개 언어 지원' }
  ]},
  { category:'LLM (브라우저 직접 호출 가능)', items:[
    { name:'OpenRouter Free', url:'https://openrouter.ai/keys', limit:'20 RPM · 200 RPD', models:'Gemma 3, Llama 3.3 70B, Qwen3', notes:'CORS ✓ — API 키 발급 후 즉시' },
    { name:'Groq Free', url:'https://console.groq.com', limit:'30 RPM · 14.4K RPD', models:'Llama 3.3 70B, Qwen, DeepSeek', notes:'CORS ✓ — 가장 빠른 추론' },
    { name:'Google AI Studio', url:'https://aistudio.google.com/app/apikey', limit:'15 RPM · 1.5K RPD', models:'Gemini 2.0 Flash', notes:'CORS ✓ — 무료 한도 큼' },
    { name:'Anthropic Claude', url:'https://console.anthropic.com', limit:'유료 (Free trial 크레딧)', models:'Claude Haiku 4.5', notes:'브라우저 직접 호출(헤더 필요)' }
  ]},
  { category:'공공 데이터 (백엔드 프록시 권장)', items:[
    { name:'커리어넷 OpenAPI', url:'https://www.career.go.kr/cnet/front/openapi/openApiMainCenter.do', limit:'무료', models:'직업·학과·진로 정보', notes:'data.go.kr 인증키 필요, CORS 차단' },
    { name:'워크넷 OpenAPI', url:'https://openapi.work.go.kr/', limit:'무료', models:'직업·채용·자격증', notes:'data.go.kr 인증키 필요' },
    { name:'한국산업인력공단', url:'https://openapi.hrdkorea.or.kr/main', limit:'무료', models:'국가기술자격 정보', notes:'CORS 차단 — 백엔드 필요' }
  ]},
  { category:'NLP·감정 분석', items:[
    { name:'HuggingFace Inference', url:'https://huggingface.co/inference-api', limit:'무료(rate-limited)', models:'BERT-emotion, multilingual-sentiment', notes:'일부 CORS 제약' },
    { name:'AI Hub 청소년 감정 데이터', url:'https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=263', limit:'무료(승인 필요)', models:'3,000h 감정 음성', notes:'학습용 다운로드' }
  ]},
  { category:'음성 (브라우저 내장)', items:[
    { name:'Web Speech API', url:'https://developer.mozilla.org/docs/Web/API/Web_Speech_API', limit:'무제한', models:'ko-KR STT/TTS', notes:'CORS 무관 — 이미 통합' },
    { name:'MeloTTS Korean', url:'https://huggingface.co/myshell-ai/MeloTTS-Korean', limit:'무료(자체호스팅)', models:'고품질 한국어 TTS', notes:'CPU 실시간 가능' },
    { name:'Kokoro Web TTS', url:'https://github.com/eduardolat/kokoro-web', limit:'무료(자체호스팅)', models:'Apache 2.0', notes:'OpenAI API 호환' }
  ]},
  { category:'검증된 검사 (이미 v3 내장)', items:[
    { name:'IPIP Big5-50', url:'https://ipip.ori.org/', limit:'공유저작', models:'50문항', notes:'v3 내장 완료' },
    { name:'openpsychometrics RIASEC', url:'https://openpsychometrics.org/tests/RIASEC/', limit:'무료', models:'30문항', notes:'v3 내장 완료' },
    { name:'VIA Youth Strengths', url:'https://www.viacharacter.org/', limit:'무료 등록', models:'24강점', notes:'v3 내장 완료' }
  ]},
  { category:'해외 LLM (무료 티어·트라이얼)', items:[
    { name:'Mistral La Plateforme', url:'https://console.mistral.ai/', limit:'무료 티어', models:'Mistral Small/Large, Nemo', notes:'OpenAI 호환 · 일부 CORS 제약' },
    { name:'Cohere', url:'https://dashboard.cohere.com/api-keys', limit:'트라이얼 키 무료', models:'Command R/R+', notes:'한국어 지원 · 백엔드 권장' },
    { name:'Together AI', url:'https://api.together.xyz/', limit:'$ 무료 크레딧', models:'Llama·Qwen·DeepSeek 다수', notes:'OpenAI 호환' },
    { name:'Cerebras', url:'https://cloud.cerebras.ai/', limit:'무료(rate-limited)', models:'Llama 3.3 70B 초고속', notes:'추론 속도 최상위권' },
    { name:'GitHub Models', url:'https://github.com/marketplace/models', limit:'무료(미리보기)', models:'GPT-4o·Llama·Phi 등', notes:'GitHub 계정 토큰' },
    { name:'NVIDIA NIM', url:'https://build.nvidia.com/', limit:'무료 크레딧', models:'Llama·Nemotron 등', notes:'백엔드 프록시 권장' }
  ]},
  { category:'국내 LLM·플랫폼', items:[
    { name:'네이버 CLOVA Studio', url:'https://www.ncloud.com/product/aiService/clovaStudio', limit:'체험/유료', models:'HyperCLOVA X (HCX-005)', notes:'한국어 최적 · 백엔드 필요 · 엔진설정 지원' },
    { name:'Upstage Console', url:'https://console.upstage.ai/', limit:'무료 체험 크레딧', models:'SOLAR Pro/Mini', notes:'OpenAI 호환 · 엔진설정 지원' },
    { name:'LG EXAONE (오픈웨이트)', url:'https://huggingface.co/LGAI-EXAONE', limit:'무료(자체호스팅)', models:'EXAONE 3.5', notes:'연구·비상업 라이선스 확인' },
    { name:'Kakao Kanana / KoGPT', url:'https://developers.kakao.com/', limit:'제한적', models:'한국어 생성', notes:'사업자/심사 필요' },
    { name:'NCSOFT VARCO', url:'https://huggingface.co/NCSOFT', limit:'무료(자체호스팅)', models:'VARCO LLM', notes:'오픈웨이트' }
  ]},
  { category:'국내 공공·교육 데이터 (data.go.kr)', items:[
    { name:'공공데이터포털', url:'https://www.data.go.kr/', limit:'무료(인증키)', models:'수만 종 공공 API', notes:'통합 인증키 발급처' },
    { name:'KOSIS 국가통계포털', url:'https://kosis.kr/openapi/', limit:'무료(인증키)', models:'교육·청소년 통계', notes:'통계 자료 인용' },
    { name:'학교알리미', url:'https://www.schoolinfo.go.kr/', limit:'무료', models:'학교 공시정보', notes:'data.go.kr 연계' },
    { name:'한국교육학술정보원(KERIS)', url:'https://www.keris.or.kr/', limit:'무료/승인', models:'에듀넷·교육데이터', notes:'교육 콘텐츠' },
    { name:'한국직업능력연구원', url:'https://www.krivet.re.kr/', limit:'무료', models:'진로·직업 연구자료', notes:'커리어넷 운영기관' }
  ]},
  { category:'한국어 NLP·감정·음성 (국내)', items:[
    { name:'ETRI 오픈 AI API', url:'https://aiopen.etri.re.kr/', limit:'무료(키 신청)', models:'형태소·개체명·감정분석', notes:'한국어 특화 · 백엔드 필요' },
    { name:'네이버 CLOVA Sentiment/Speech', url:'https://www.ncloud.com/product/aiService', limit:'체험/유료', models:'감정분석·STT/TTS', notes:'백엔드 프록시' },
    { name:'KoBERT / KoELECTRA', url:'https://huggingface.co/monologg', limit:'무료(오픈모델)', models:'한국어 BERT 계열', notes:'감정·분류 파인튜닝' },
    { name:'카카오 i (번역/음성)', url:'https://developers.kakao.com/', limit:'제한적', models:'번역·음성', notes:'사업자 심사' }
  ]}
];
