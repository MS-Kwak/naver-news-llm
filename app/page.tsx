'use client';

import { useState } from 'react';

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  searchQuery?: string;
  keywords?: string[];
  news?: NewsItem[];
  newsCount?: number;
  error?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 예시 질문들
  const examples = [
    '오늘 주요 경제 뉴스 알려줘',
    '삼성전자 최신 뉴스',
    'AI 인공지능 관련 소식',
    '부동산 시장 동향',
    '비트코인 암호화폐 뉴스',
    '스타트업 투자 소식',
  ];

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || '응답을 생성했습니다.',
          searchQuery: data.searchQuery,
          keywords: data.keywords,
          news: data.news,
          newsCount: data.newsCount,
          error: data.error,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ 오류가 발생했습니다.', error: String(err) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">📰 뉴스 AI 어시스턴트</h1>
          <p className="text-blue-200 text-sm">
            네이버 뉴스 API + LLM 분석 PoC
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* 예시 질문 */}
        {messages.length === 0 && (
          <div className="mb-6">
            <p className="text-gray-400 mb-3 text-sm">💡 이런 질문을 해보세요:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(ex)}
                  className="px-3 py-2 bg-gray-800 rounded-full border border-gray-700
                           hover:border-blue-500 hover:bg-gray-700 text-gray-300 text-sm transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 채팅 영역 */}
        <div className="space-y-4 mb-24">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-20">
              <p className="text-5xl mb-4">📰</p>
              <p className="text-lg">뉴스에 대해 물어보세요!</p>
              <p className="text-sm mt-2 text-gray-600">
                실시간 네이버 뉴스를 검색하고 AI가 분석해드립니다
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {/* 검색 정보 표시 */}
                {msg.role === 'assistant' && msg.searchQuery && (
                  <div className="mb-3 pb-2 border-b border-gray-700 flex flex-wrap gap-2">
                    <span className="inline-block px-2 py-1 bg-blue-600 text-xs rounded">
                      🔍 {msg.searchQuery}
                    </span>
                    {msg.newsCount !== undefined && (
                      <span className="inline-block px-2 py-1 bg-green-600 text-xs rounded">
                        📊 {msg.newsCount}건 분석
                      </span>
                    )}
                  </div>
                )}

                {/* 메시지 내용 */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>

                {/* 뉴스 목록 */}
                {msg.news && msg.news.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">📌 관련 뉴스 링크</p>
                    <div className="space-y-2">
                      {msg.news.slice(0, 5).map((item, newsIdx) => (
                        <a
                          key={newsIdx}
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 bg-gray-900 rounded-lg hover:bg-gray-850 transition group"
                        >
                          <p className="text-sm text-blue-400 group-hover:underline line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{item.pubDate}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 에러 표시 */}
                {msg.error && (
                  <div className="mt-3 p-2 bg-red-900/50 text-red-300 rounded text-sm">
                    ⚠️ {msg.error}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 로딩 */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="text-gray-300 text-sm">뉴스 검색 및 분석 중...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 입력창 */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="뉴스에 대해 물어보세요..."
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-full border border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              검색
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-2">
            네이버 뉴스 API + OpenAI GPT-4o | LLM + 외부 데이터 연동 PoC
          </p>
        </div>
      </div>
    </main>
  );
}
