/**
 * 네이버 검색 API 유틸리티
 * 뉴스 검색 및 결과 반환
 */

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

export interface NewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface NewsSearchResult {
  success: boolean;
  items?: NewsItem[];
  total?: number;
  error?: string;
}

/**
 * 네이버 뉴스 검색 API 호출
 * @param query - 검색어
 * @param display - 검색 결과 개수 (기본 10, 최대 100)
 * @param sort - 정렬 방식 (sim: 유사도순, date: 날짜순)
 */
export async function searchNews(
  query: string,
  display: number = 10,
  sort: 'sim' | 'date' = 'date'
): Promise<NewsSearchResult> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return {
      success: false,
      error:
        '네이버 API 키가 설정되지 않았습니다. .env.local에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정하세요.',
    };
  }

  try {
    const encQuery = encodeURIComponent(query);
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encQuery}&display=${display}&sort=${sort}`;

    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API 오류 (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();

    // HTML 태그 제거 및 정리
    const cleanItems = data.items.map((item: any) => ({
      title: cleanHtml(item.title),
      originallink: item.originallink,
      link: item.link,
      description: cleanHtml(item.description),
      pubDate: formatDate(item.pubDate),
    }));

    return {
      success: true,
      items: cleanItems,
      total: data.total,
    };
  } catch (error: any) {
    console.error('네이버 API 호출 오류:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * HTML 태그 및 특수문자 제거
 */
function cleanHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}

/**
 * 날짜 포맷 변환
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * 블로그 검색 API (추가 기능)
 */
export async function searchBlog(
  query: string,
  display: number = 10
): Promise<NewsSearchResult> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return { success: false, error: 'API 키 없음' };
  }

  try {
    const encQuery = encodeURIComponent(query);
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encQuery}&display=${display}`;

    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API 오류 (${response.status})`,
      };
    }

    const data = await response.json();
    const cleanItems = data.items.map((item: any) => ({
      title: cleanHtml(item.title),
      originallink: item.link,
      link: item.link,
      description: cleanHtml(item.description),
      pubDate: formatDate(item.postdate),
    }));

    return { success: true, items: cleanItems, total: data.total };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
