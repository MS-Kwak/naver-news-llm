/**
 * MySQL 데이터베이스 연결 유틸리티
 * Serverless 환경(Vercel)에 최적화
 */
import mysql from 'mysql2/promise';

// DB 연결 설정
const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Serverless 환경 최적화 설정
  waitForConnections: true,
  connectionLimit: 1, // Serverless에서는 1개로 제한
  queueLimit: 0,
  // 타임아웃 설정
  connectTimeout: 30000, // 30초
  // TCP Keep-Alive로 유휴 연결 유지
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10초마다 keep-alive
};

// 연결 풀 (Serverless에서는 매 요청마다 새로 생성될 수 있음)
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// 풀 재생성 (연결 에러 시 사용)
function resetPool(): void {
  if (pool) {
    pool.end().catch(() => {}); // 기존 풀 정리 (에러 무시)
    pool = null;
  }
}

/**
 * 프로시저 호출 함수 (재시도 로직 포함)
 * @param procedureName - 프로시저 이름
 * @param params - 파라미터 배열
 * @param retryCount - 재시도 횟수 (내부용)
 * @returns 프로시저 결과
 */
export async function callProcedure(
  procedureName: string,
  params: any[],
  retryCount: number = 0
): Promise<any[]> {
  const MAX_RETRIES = 2;

  // 파라미터 개수만큼 ? 생성
  const placeholders = params.map(() => '?').join(', ');
  const query = `CALL ${procedureName}(${placeholders})`;

  try {
    const currentPool = getPool();
    const [results] = await currentPool.execute(query, params);
    // 프로시저 결과는 배열의 첫 번째 요소에 있음
    return (results as any[])[0];
  } catch (error: any) {
    // 연결 관련 에러면 풀 재생성 후 재시도
    const isConnectionError =
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('Connection lost');

    if (isConnectionError && retryCount < MAX_RETRIES) {
      console.warn(
        `⚠️ DB 연결 에러, 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`
      );
      resetPool(); // 풀 재생성
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
      return callProcedure(procedureName, params, retryCount + 1);
    }

    console.error(`프로시저 호출 실패 [${procedureName}]:`, error);
    throw error;
  }
}

/**
 * SQL 쿼리 실행 함수 (재시도 로직 포함)
 * @param sql - SQL 쿼리
 * @param params - 파라미터 배열 (옵션)
 * @param retryCount - 재시도 횟수 (내부용)
 * @returns 쿼리 결과
 */
export async function executeQuery(
  sql: string,
  params: any[] = [],
  retryCount: number = 0
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const MAX_RETRIES = 2;

  try {
    const currentPool = getPool();
    const [rows] = await currentPool.execute(sql, params);
    return { success: true, data: rows as any[] };
  } catch (error: any) {
    // 연결 관련 에러면 풀 재생성 후 재시도
    const isConnectionError =
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'PROTOCOL_CONNECTION_LOST' ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('Connection lost');

    if (isConnectionError && retryCount < MAX_RETRIES) {
      console.warn(
        `⚠️ DB 연결 에러, 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`
      );
      resetPool(); // 풀 재생성
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
      return executeQuery(sql, params, retryCount + 1);
    }

    console.error('DB Query Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * DB 연결 테스트
 */
export async function testConnection(): Promise<boolean> {
  try {
    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    console.log('✅ DB 연결 성공!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ DB 연결 실패:', error);
    return false;
  }
}

// 기존 코드 호환을 위한 default export
const connPool = {
  query: async (...args: any[]) => {
    const currentPool = getPool();
    return currentPool.query(...args);
  },
  execute: async (...args: any[]) => {
    const currentPool = getPool();
    return currentPool.execute(...args);
  },
};

export default connPool;
