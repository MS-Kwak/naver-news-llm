# 🐔 YSPF Text-to-SQL PoC

양계장 관리 시스템 - 자연어로 데이터베이스 조회

## 🚀 빠른 시작

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일에서 OPENAI_API_KEY 입력

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 http://localhost:3000 접속
```

## 📁 프로젝트 구조

```
nextjs-text2sql-poc/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts    # Text-to-SQL API
│   ├── page.tsx            # 채팅 UI
│   ├── layout.tsx
│   └── globals.css
├── .env.example
├── package.json
└── README.md
```

## ⚙️ 환경변수

| 변수             | 설명          | 예시             |
| ---------------- | ------------- | ---------------- |
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-...`         |
| `DB_HOST`        | DB 호스트     | `localhost`      |
| `DB_PORT`        | DB 포트       | `3306`           |
| `DB_USER`        | DB 사용자     | `root`           |
| `DB_PASSWORD`    | DB 비밀번호   | `yourpassword`   |
| `DB_NAME`        | DB 이름       | `yspf`           |
| `EXECUTE_SQL`    | SQL 실행 여부 | `true` / `false` |

## 💬 예시 질문

- "이번 달 총 산란량은?"
- "1동 계사의 현재 사육수수는?"
- "폐사율이 가장 높은 계사는?"
- "특란 등급 출하량을 거래처별로"
- "백신 재고 현황"
- "오늘 방문자 목록"

## 🔒 보안

- SELECT 쿼리만 허용
- DROP, DELETE, UPDATE 등 위험 키워드 차단
- SQL 인젝션 방지를 위한 검증

## 📝 Claude API 사용시

`app/api/chat/route.ts`에서 OpenAI를 Anthropic으로 교체:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// completion 호출부 수정
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: SYSTEM_PROMPT + '\n\n' + question },
  ],
});
```

## 🎯 다음 단계

1. **RAG 추가**: 매뉴얼/문서 검색 기능
2. **차트 시각화**: 조회 결과 그래프로 표시
3. **권한 관리**: 사용자별 조회 가능 테이블 제한
4. **히스토리**: 질문/응답 기록 저장
