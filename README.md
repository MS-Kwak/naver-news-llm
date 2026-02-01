# 📰 뉴스 AI 어시스턴트

네이버 뉴스 API + LLM 분석 PoC

## 🎯 주요 기능

- **실시간 뉴스 검색**: 네이버 뉴스 API 연동
- **키워드 자동 추출**: LLM이 질문에서 검색어 추출
- **AI 분석/요약**: GPT-4o로 뉴스 내용 종합 분석
- **출처 링크 제공**: 원본 기사 바로가기

## 🚀 빠른 시작

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일 편집 (아래 환경변수 참고)

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 http://localhost:3000 접속
```

## ⚙️ 환경변수

| 변수                  | 설명                 | 발급처                                               |
| --------------------- | -------------------- | ---------------------------------------------------- |
| `OPENAI_API_KEY`      | OpenAI API 키        | [platform.openai.com](https://platform.openai.com)   |
| `NAVER_CLIENT_ID`     | 네이버 Client ID     | [developers.naver.com](https://developers.naver.com) |
| `NAVER_CLIENT_SECRET` | 네이버 Client Secret | [developers.naver.com](https://developers.naver.com) |

### 네이버 API 발급 방법

1. [네이버 개발자 센터](https://developers.naver.com) 접속
2. 애플리케이션 등록
3. 사용 API: **검색** 선택
4. 환경: `WEB` → `http://localhost:3000`
5. Client ID / Secret 복사

## 📁 프로젝트 구조

```
nextjs-news-ai-poc/
├── app/
│   ├── api/
│   │   └── news/
│   │       └── route.ts    # 뉴스 AI API (메인 로직)
│   ├── page.tsx            # 채팅 UI
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── naver.ts            # 네이버 API 유틸리티
├── .env.example
├── package.json
└── README.md
```

## 🔄 동작 흐름

```
사용자 질문
    ↓
1️⃣ 키워드 추출 (GPT-4o-mini)
    "삼성전자 최신 뉴스" → "삼성전자"
    ↓
2️⃣ 네이버 뉴스 API 호출
    검색어로 최신 뉴스 10건 조회
    ↓
3️⃣ AI 분석/요약 (GPT-4o)
    뉴스 내용 종합하여 답변 생성
    ↓
응답 + 뉴스 링크
```

## 💬 예시 질문

- "오늘 주요 경제 뉴스 알려줘"
- "삼성전자 최신 소식"
- "AI 인공지능 관련 뉴스"
- "부동산 시장 동향"
- "비트코인 암호화폐 뉴스"
- "스타트업 투자 소식"

## 🛠 기술 스택

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4o, GPT-4o-mini
- **Data**: 네이버 검색 API

## 📝 API 제한

- 네이버 API: 일 25,000회 호출 제한
- 1회 최대 100건 검색 가능

## 🎯 PoC 목적

**LLM + 외부 데이터 연동** 데모

| 구성요소    | 역할                 |
| ----------- | -------------------- |
| 네이버 API  | 실시간 데이터 소스   |
| GPT-4o-mini | 키워드 추출 (라우팅) |
| GPT-4o      | 데이터 분석/요약     |

→ 이 패턴을 **ERP, CRM, 내부 DB** 등에 적용 가능!

## 🚀 확장 아이디어

1. **Text-to-SQL**: DB 연동하여 자연어 쿼리
2. **RAG**: 사내 문서 검색 + 답변
3. **멀티 소스**: 뉴스 + 주식 + 날씨 통합
4. **슬랙/팀즈 봇**: 메신저 연동
