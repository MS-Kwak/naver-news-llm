/**
 * 네이버 뉴스 AI 어시스턴트 API
 * POST /api/news
 *
 * 기능:
 * - 뉴스 검색 + LLM 요약/분석
 * - 키워드 추출 및 관련 뉴스 검색
 * - 뉴스 기반 Q&A
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchNews, NewsItem } from '@/lib/naver';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================================================================
// 프롬프트 정의
// =============================================================================

const KEYWORD_EXTRACT_PROMPT = `당신은 검색 키워드 추출 전문가입니다.
사용자의 질문에서 뉴스 검색에 적합한 키워드를 추출하세요.

규칙:
1. 핵심 키워드 1~3개 추출
2. 불필요한 조사, 어미 제거
3. 검색에 효과적인 단어 선택

반드시 JSON 형식으로만 응답:
{"keywords": ["키워드1", "키워드2"], "searchQuery": "검색에 사용할 쿼리"}`;

const NEWS_ANALYSIS_PROMPT = `당신은 뉴스 분석 전문가입니다.
검색된 뉴스 기사들을 바탕으로 사용자 질문에 답변하세요.

규칙:
1. 뉴스 내용을 종합하여 핵심 정보 전달
2. 출처(기사 제목)를 명시
3. 최신 정보 우선
4. 객관적이고 사실에 기반한 답변
5. 뉴스에 없는 내용은 추측하지 않음

답변 형식:
- 핵심 요약을 먼저 제시
- 세부 내용은 그 다음에
- 관련 기사 목록 포함`;

const SUMMARY_PROMPT = `당신은 뉴스 요약 전문가입니다.
여러 뉴스 기사를 종합하여 핵심 내용을 요약하세요.

규칙:
1. 3~5문장으로 핵심 요약
2. 중복 내용 제거
3. 시간순 또는 중요도순 정리
4. 객관적 사실만 포함`;

// =============================================================================
// API Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { question, mode = 'search' } = await request.json();

    if (!question) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
    }

    // 1. 검색 키워드 추출
    const keywordResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: KEYWORD_EXTRACT_PROMPT },
        { role: 'user', content: question },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const keywordResult = JSON.parse(keywordResponse.choices[0]?.message?.content || '{}');
    const searchQuery = keywordResult.searchQuery || question;

    // 2. 네이버 뉴스 검색
    const newsResult = await searchNews(searchQuery, 10, 'date');

    if (!newsResult.success) {
      return NextResponse.json({
        question,
        error: newsResult.error,
        answer: `⚠️ 뉴스 검색 중 오류가 발생했습니다: ${newsResult.error}`,
      });
    }

    if (!newsResult.items || newsResult.items.length === 0) {
      return NextResponse.json({
        question,
        searchQuery,
        answer: `🔍 "${searchQuery}"에 대한 뉴스를 찾을 수 없습니다. 다른 키워드로 검색해보세요.`,
        newsCount: 0,
      });
    }

    // 3. 뉴스 컨텍스트 생성
    const newsContext = newsResult.items
      .map((item: NewsItem, idx: number) =>
        `[${idx + 1}] ${item.title}\n발행: ${item.pubDate}\n내용: ${item.description}\n링크: ${item.link}`
      )
      .join('\n\n');

    // 4. LLM으로 분석/요약
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: mode === 'summary' ? SUMMARY_PROMPT : NEWS_ANALYSIS_PROMPT },
        {
          role: 'user',
          content: `사용자 질문: ${question}\n\n검색된 뉴스 (${newsResult.items.length}건):\n\n${newsContext}`,
        },
      ],
      temperature: 0.3,
    });

    const analysis = analysisResponse.choices[0]?.message?.content || '';

    // 5. 응답 구성
    const response = {
      question,
      searchQuery,
      keywords: keywordResult.keywords,
      newsCount: newsResult.items.length,
      totalFound: newsResult.total,
      news: newsResult.items.slice(0, 5), // 상위 5개만 반환
      answer: `📰 **"${searchQuery}" 관련 뉴스 분석**\n\n${analysis}\n\n---\n*${newsResult.items.length}건의 뉴스를 분석했습니다.*`,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
