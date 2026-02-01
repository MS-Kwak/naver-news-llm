/**
 * YSPF Hybrid AI API (RAG + Text-to-SQL)
 * POST /api/chat
 *
 * 질문 유형에 따라 자동 라우팅:
 * - DB 조회 질문 → Text-to-SQL → 실제 DB 실행
 * - 시스템/업무 질문 → RAG (문서 검색)
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { executeQuery } from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXECUTE_SQL = process.env.EXECUTE_SQL === 'true';

// =============================================================================
// 1. RAG용 문서 컨텍스트 (개발 스펙 문서에서 추출)
// =============================================================================

const SYSTEM_DOCS = `
# YSPF 양계장 관리 시스템 - 개발 스펙 문서

## 시스템 접속 정보
- 웹: http://ys.yspf.co.kr (테스트: bonobo / 1026)
- HACCP관리자 테스트: bonobo2 / 1026

## 사용자 권한 (lev)
- 일반(0), 관리자(1), 경영자(2), 육성담당자(3), 사양담당자(4)
- GP담당자(5), 출고담당자(6), HACCP관리자(7), 방명록담당자(8)

## 주요 메뉴 구조

### 기초관리
- 부서관리: Part_Insert, Part_List, Part_Row, Part_Update, Part_Delete
- 사용자관리: Staff_Insert, Staff_List, Staff_Row, Staff_Update, Staff_Delete
  - 모바일권한(mlev): 주요일정^육성동관리^육성동설비^사양동관리^사양동설비^GP관리^GP설비관리^GP출하실^업체출고등록^출하실재고관리^현황관리^출하업체관리
  - HACCP담당(is_haccp): 0=No, 1=Yes
- 부화장관리: Home_Insert, Home_List, Home_Row, Home_Update, Home_Delete
- 품종관리: Chick_Insert, Chick_List, Chick_Row, Chick_Update, Chick_Delete
- 관리동관리: Fense_Insert, Fense_List, Fense_Row, Fense_Update, Fense_Delete
  - fkind(구분): 육성(1), 사양(2)
- 거래처관리: Comp_Insert, Comp_List, Comp_Row, Comp_Update, Comp_Delete
  - 거래처구분: 매출(1), 매입(2)
- 사료관리: Feed_Insert, Feed_List, Feed_Row, Feed_Update, Feed_Delete
- 팔레트관리: Palette_Insert, Palette_List, Palette_Row, Palette_Update, Palette_Delete
- 차량관리: Car_Insert, Car_List, Car_Row, Car_Update, Car_Delete
  - 차량구분(ckind): 지입(1), 사료(2)
- 약품관리: Drug_Insert, Drug_List2, Drug_Row, Drug_Update, Drug_Delete
  - 약품구분(dgkind): 백신(1), 영양제(2), 기타약품(3)
  - 접종자(dkind): 자가(0), 외주(1)
- 자재관리: Matrial_Insert, Matrial_List, Matrial_Row, Matrial_Update, Matrial_Delete
- 바코드약어: EggCode_Save, EggCode_Row

### 일정관리
- 일정관리: Sche_Insert, Sche_List, Sche_Row, Sche_Update, Sche_Delete
- 공지관리: Board_Insert, Board_List, Board_Row, Board_Update, Board_Delete
- 백신프로그램: DrugMain_Insert, DrugMain_List, DrugMain_Row, DrugMain_Update, DrugMain_Delete
  - 백신일정: DrugSub_Insert, DrugSub_List, DrugSub_Row, DrugSub_Update, DrugSub_Delete
- 백신관리: BreedMain_Drug_List(일자1, 일자2, 구분, 접종자)

### 육성관리
- 입추관리: BreedMain_Insert, BreedMain_List, BreedMain_Row, BreedMain_Update, BreedMain_Delete
- 육성관리: BreedHis_List, BreedHis_Row, BreedHis_Update12, BreedHis_Update22
- 입추현황: BreedMain_Daily_Sum, BreedMain_Week_Sum
- 백신일정: Breed_Drug_Month_List, Breed_Drug_Day_List
- 중추관리: Breed_Move_List, Breed_Move_Row, Breed_Move_Update
- 설비관리: Repair_Insert, Repair_List, Repair_Row, Repair_Update1, Repair_Update2, Repair_Delete
- 부화장현황: HomeHis_Insert, HomeHis_List, HomeHis_Row, HomeHis_Update, HomeHis_Delete
- 육성보고서: BreedHis_Fense1_List, BreedHis_Report1, BreedHis_Report1_Save2
- 육성보고서(월간): BreedHis_Month_Report1, BreedHis_Month_Drug1
- 육성현황: BreedHis_List2

### 사양관리
- 사양관리: BreedHis_List4, BreedHis_Row, BreedHis_Update2
  - 구분: 1단지(1동~7동), 3단지(8동~14동)
- 도태관리(노계출하): BreedOut_Insert, BreedOut_List, BreedOut_Row, BreedOut_Update, BreedOut_Delete
- 사양보고서: BreedHis_Fense2_List, BreedHis_Report2, BreedHis_Report2_Save2
- 사양보고서(월간): BreedHis_Month_Report2
- 사양현황: BreedHis_List2
- 사육성적: BreedHis_Fense_End_List, BreedHis_Result, BreedRst_Row, BreedRst_Save
- 산란율보고서: EggRate_Report, GpRpt_Save
- 설비관리: Repair_Insert3, Repair_List2, Repair_Update3

### 출하GP관리
- 출하관리: GpOut_SumList, GpOut_Insert, GpOut_Update, GpOut_Delete, GpOut_CompList
- 생산관리(GP관리): GpEgg_List, GpEgg_Row, GpEgg_Save, GpEgg_Delete
- GP바코드: GpOut_List2, GpBox_Insert, GpBox_Delete, GpBox_Fence_Insert, GpBox_Fence_Delete
  - 팔레트생성2: 2개 계란 동시 등록 가능
- GP출하관리: GpBox_List5, GpBox_Move, GpBox_Move_Cancel
- 출고업체관리(출하업체관리): GpBox_List6, GpBox_Fense_Out, GpBox_Fense_Out_Cancel
- 출고관리(업체출고관리): GpBox_List3, GpBox_SumList3
- 바코드관리: GpBox_List7, GpBox_Row, GpBox_Update
- GP생산일보(GP관리일보): GpEgg_List2, GpEgg_Real_List, GpBox_Out_List, GpBox_Jego_List, ReportGp_Save
- GP생산일보(월간): GpEgg_List_Sum2, GpEgg_Real_Sum_List, GpBox_Out_Sum_List
- 출하마감보고서: GpJego_Before_List, GpBox_In_List, GpBox_Out_List2, GpJego_Save
- 수동재고관리: GpBox_Manual_Insert, GpBox_Manual_List, GpBox_Manual_Row, GpBox_Manual_Update, GpBox_Manual_Delete
- 설비관리: Repair_Insert3, Repair_List3, Repair_Update3

### 문서관리 (HACCP)
- 중요관리점검표: MainCheck_Row, MainCheck_Save
- 저온창고일지: StoreDay_List, StoreDay_Row, StoreDay_Save, StoreDayEtc_Row, StoreDayEtc_Save
- 입추검사기록부: RptBreedMain_Insert, RptBreedMain_List, RptBreedMain_Row, RptBreedSub_Save, RptBreedMain_Sign
- 소독실시기록부: RptDrug_Insert, RptDrug_List, RptDrug_Row, RptDrug_Update, RptDrug_Delete
- 저수조점검일지: RptTank_Insert, RptTank_List, RptTank_Row, RptTank_Update, RptTank_Delete
- 사료입고검사: RptFeed_Insert, RptFeed_List, RptFeed_Row, RptFeed_Update, RptFeed_Delete, RptFeed_Sum
- 구역별일일점검표: RptArea_Insert, RptArea_List, RptArea_Row, RptArea_Update, RptArea_Delete
- 작업장일일점검표: RptWork_Insert, RptWork_List, RptWork_Row, RptWork_Update, RptWork_Delete
- 청소/소독점검표: RptCleanMain_Insert, RptClean_List, RptClean_Row, RptCleanSub_Save
- 사업장폐기물관리대장: RptOutMain_Insert, RptOut_List, RptOut_Row, RptOutSub_Save
- 공조및조도점검일지: RptLgtMain_Insert, RptLgt_Row, RptLgtSub_Save
- 계측기기관리대장: RptEquipMain_Insert, RptEquip_List, RptEquipMain_Row, RptEquipSub_Insert
- GP방충방서점검표: RptGpMain_Insert, RptGp_List, RptGpMain_Row, RptGpSub_Insert1, RptGpSub_Insert2
- 부자재입고대장: RptMtrMain_Insert, RptMtr_List, RptMtrSub_Insert, RptMtrSub_Delete
- 제조설비점검일지(1호기/2호기): RptPltMain_Insert, RptPlt_List, RptPltMain_Row, RptPltSub_Save
- 자가검교정일지: RptSelf_Insert, RptSelf_List, RptSelf_Row, RptSelf_Update, RptSelf_Delete
  - 구분(skind): 창고온도계(1), 세척수온도계(2)
- 소독실시(약품사용)기록부: RptDrugMain_Insert, RptDrugMain_List, RptDrugMain_Row, RptDrugSub_Save
- 약품재고관리대장: RptInOut_Insert, RptInOut_List, RptInOut_Row, RptInOut_Update, RptInOut_Delete
- 가금산물신고: ReportOut_Insert, ReportOut_List, ReportOut_Delete
- 자재입고관리: Matrial_IO_Insert, Matrial_IO_List, Matrial_IO_Row, Matrial_IO_Update, Matrial_IO_Delete
- 자재반출관리: (자재입고관리와 동일 SP, mkind=2)
- 자재대장: Matrial_IO_History
- 자재현황: Matrial_IO_Sum
- 근태대장: Attendance_DayList, Attendance_List, Attendance_Insert

### 현황관리
- 표준비교: BreedMain_Analysis_chick, BreedMain_Analysis_breed
- 영신비교: BreedMain_Analysis_breed2
- 사양비교: BreedMain_Analysis_breed2
- 다중비교: BreedMain_Analysis_breed3
- 폐기량/난중비교: GpEgg_Fense_List, GpEgg_SumList
- 생산현황: GpEgg_Fense_List2, GpEgg_SumList2
- 출고내역: GpBox_CompOut_List
- 생산내역: GpEgg_Product_List
- 생산출고내역: GpBox_PrdComp_List
- 사양기록부: BreedMain_Analysis_1 ~ BreedMain_Analysis_8

### 자료실
- Docu_Insert, Docu_List, Docu_Row, Docu_Update, Docu_Delete
- DocuFile_Insert, DocuFile_List, DocuFile_Delete
- 자료구분(dkind): 공통(0), 육성(1), 사양(2), GP(3), 관리(4)

### 방명록
- 방명록-영신(vkind=1), 방명록-계분(vkind=2)
- RptVisit_Insert, RptVisit_List, RptVisit_Row, RptVisit_Update, RptVisit_Delete

### 대시보드
- Dash_Save, Dash_Row
- 근태관리: Attendance_Off_List, Attendance_List, Attendance_Insert

## 주요 업무 흐름

### GP 출하 프로세스
1. 출하관리: 업체별 출고 등록 (GpOut_Insert)
2. GP바코드: 팔레트 생성 및 바코드 발행 (GpBox_Insert, GpBox_Fence_Insert)
3. GP출하관리: 출하실 이동 (GpBox_Move)
4. 출고업체관리: 업체 출고 등록 (GpBox_Fense_Out)
5. 출고관리: 최종 출고 확인 (GpBox_List3)

### 사료입고 프로세스
1. 사료입고검사 등록 (RptFeed_Insert)
2. 누적입고량 확인 (RptFeed_Sum)

### 문서 결재 프로세스
- 작성자 저장 → HACCP관리자(lev=7) 결재 (*_Sign SP 사용)
- sign_date가 NULL이면 미결재, NOT NULL이면 결재완료

## 계란 등급 코드
- 왕왕(1/01), 왕란(2/02), 특란(3/03), 대란(4/04), 중란(5/05), 소란(6/06)
- 신선W(11), 신선특(12), 신선대(13), 신선D(14)
- 등외란(7): 신선W~신선D 포함

## 관리동 구분
- 육성동: fkind=1 (육성1동, 육성2동, 육성3동, 육성4동)
- 사양동: fkind=2 (사양1동~사양14동)
  - 1단지: 사양1동~사양7동
  - 3단지: 사양8동~사양14동

## 날짜 형식
- 일자: yyyy-mm-dd (예: 2024-01-15)
- 년월: yyyy-mm (예: 2024-01)
- 시간: HH:MM (예: 09:30)
`;

// =============================================================================
// 2. DB 스키마 컨텍스트 (Text-to-SQL용)
// =============================================================================

const DB_SCHEMA = `
## YSPF 데이터베이스 스키마

### 핵심 테이블
1. BreedMain - 종계 입식 마스터 (bmsn PK, fncode, indate, chcode, in_cnt, isdel)
2. BreedHis - 일일 사육 기록 (bmsn FK, mdate, live_cnt, dead_cnt, egg_cnt, feed_amount)
3. Fense - 계사/시설 (fncode PK, fnname, fntype, fkind: 육성1/사양2)
4. GpEgg - 원란 입고 (mdate, fncode, egg_cnt)
5. GpBox - 선별/포장 (mdate, grade, box_cnt, barcode)
6. GpOut - 출하 (mdate, cpcode, grade, box_cnt, price)
7. Drug - 약품 마스터 (dgcode PK, dgname, dgkind: 백신1/영양제2/기타3)
8. DrugMain - 약품 입출고 (dgcode, iotype: 입고1/출고2, qty, lot_no)
9. Feed - 사료 관리 (fdcode, fdname, in_qty, out_qty)
10. Comp - 거래처 (cpcode PK, cpname, cptype: 매출1/매입2)
11. Staff - 직원 (sfcode PK, sfname, lev, is_haccp, mlev)
12. Part - 부서 (pcode PK, pname)
13. Chick - 병아리 품종 (chcode PK, chname)
14. Sche - 일정 (sdate PK, sch1, sch2, sch3)
15. Attendance - 근태 (sfcode, adate, akind: 결근1/조퇴2/연장3/휴가4, ahour)

### HACCP 문서 테이블
- RptWork: 작업장 일일점검표
- RptArea: 구역별 일일점검표
- RptFeed: 사료입고검사
- RptTank: 저수조점검일지
- RptDrug: 소독실시기록부
- RptSelf: 자가검교정일지
- RptEquipMain/Sub: 계측기기관리대장
- RptBreedMain/Sub: 입추검사기록부
- RptCleanMain/Sub: 청소/소독점검표
- RptOutMain/Sub: 사업장폐기물관리대장
- RptLgtMain/Sub: 공조및조도점검일지
- RptPltMain/Sub: 제조설비점검일지
- RptGpMain/Sub: GP방충방서점검표
- RptMtrMain/Sub: 부자재입고대장
- RptInOut: 약품재고관리대장
- RptVisit: 방명록

### 재고/자재 테이블
- Matrial: 자재 마스터 (mcode, mname, unit, pay)
- Matrial_IO: 자재 입출고 (mkind: 입고1/출고2, mdate, mcnt)
- GpJego: 재고 (mdate, grade, stock_cnt)
`;

// =============================================================================
// 3. 질문 분류 프롬프트
// =============================================================================

const ROUTER_PROMPT = `당신은 양계장 관리 시스템의 AI 어시스턴트입니다.
사용자 질문을 분석하여 적절한 처리 방식을 결정하세요.

분류 기준:
1. "sql" - 데이터 조회 질문 (수량, 통계, 현황, 목록 조회 등)
   예: "이번 달 산란량은?", "폐사율이 높은 계사는?", "재고 현황"

2. "rag" - 시스템/업무 관련 질문 (사용법, 절차, API, 권한 등)
   예: "사료입고검사 등록 방법", "GP출하 프로세스", "HACCP관리자 권한"

3. "chat" - 일반 대화 (인사, 감사, 간단한 질문)
   예: "안녕", "고마워", "뭘 할 수 있어?"

반드시 아래 JSON 형식으로만 응답:
{"type": "sql" | "rag" | "chat", "reason": "분류 이유"}`;

// =============================================================================
// 4. Text-to-SQL 프롬프트
// =============================================================================

const SQL_PROMPT = `당신은 양계장 관리 시스템의 SQL 전문가입니다.
사용자의 자연어 질문을 MySQL 쿼리로 변환하세요.

${DB_SCHEMA}

규칙:
1. SELECT 문만 생성 (INSERT, UPDATE, DELETE 금지)
2. 테이블명과 컬럼명은 스키마에 있는 것만 사용
3. 삭제된 데이터 제외: isdel=0 조건 포함
4. 날짜 형식: 'YYYY-MM-DD'

반드시 아래 JSON 형식으로만 응답:
{"sql": "SELECT ...", "explanation": "이 쿼리는 ... 를 조회합니다"}`;

// =============================================================================
// 5. RAG 프롬프트
// =============================================================================

const RAG_PROMPT = `당신은 양계장 관리 시스템의 업무 전문가입니다.
아래 시스템 문서를 참고하여 사용자 질문에 답변하세요.

${SYSTEM_DOCS}

규칙:
1. 문서에 있는 정보만 사용하여 답변
2. SP(저장 프로시저) 이름과 파라미터를 정확히 안내
3. 업무 흐름은 단계별로 설명
4. 모르는 내용은 "해당 정보를 찾을 수 없습니다"라고 답변

친절하고 명확하게 한국어로 답변하세요.`;

// =============================================================================
// 6. 결과 해석 프롬프트
// =============================================================================

const INTERPRET_PROMPT = `당신은 양계장 관리 시스템의 데이터 분석 전문가입니다.
SQL 쿼리 결과를 사용자가 이해하기 쉽게 설명해주세요.

규칙:
1. 숫자는 천 단위 콤마 사용 (예: 1,234,567)
2. 핵심 결과를 먼저 말하고 세부 내용은 그 다음에
3. 데이터가 없으면 "조회 결과가 없습니다"라고 안내
4. 전문 용어는 쉬운 말로 풀어서 설명

친절하고 명확하게 한국어로 답변하세요.`;

// =============================================================================
// API Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
    }

    // 1. 질문 분류
    const routerResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ROUTER_PROMPT },
        { role: 'user', content: question },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const routerResult = JSON.parse(routerResponse.choices[0]?.message?.content || '{}');
    const queryType = routerResult.type || 'chat';

    let response: any = { question, queryType };

    // 2. 타입별 처리
    if (queryType === 'sql') {
      // Text-to-SQL
      const sqlResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SQL_PROMPT },
          { role: 'user', content: question },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const sqlResult = JSON.parse(sqlResponse.choices[0]?.message?.content || '{}');
      const generatedSql = sqlResult.sql;

      response = {
        ...response,
        sql: generatedSql,
        explanation: sqlResult.explanation,
      };

      // SQL 실행 여부 확인
      if (EXECUTE_SQL && generatedSql) {
        const queryResult = await executeQuery(generatedSql);

        if (queryResult.success) {
          response.queryResult = queryResult.data;
          response.rowCount = queryResult.data?.length || 0;

          // 결과 해석
          const interpretResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: INTERPRET_PROMPT },
              {
                role: 'user',
                content: `질문: ${question}\n\nSQL: ${generatedSql}\n\n결과 (${response.rowCount}건):\n${JSON.stringify(queryResult.data, null, 2)}`
              },
            ],
            temperature: 0.3,
          });

          const interpretation = interpretResponse.choices[0]?.message?.content || '';

          response.answer = `📊 **조회 결과**\n\n${interpretation}\n\n---\n*실행된 SQL:*\n\`\`\`sql\n${generatedSql}\n\`\`\``;
        } else {
          response.answer = `⚠️ **쿼리 실행 오류**\n\n${queryResult.error}\n\n*생성된 SQL:*\n\`\`\`sql\n${generatedSql}\n\`\`\``;
          response.error = queryResult.error;
        }
      } else {
        // SQL 실행 안 함 (EXECUTE_SQL=false)
        response.answer = `📊 **SQL 쿼리 생성됨**\n\n${sqlResult.explanation}\n\n\`\`\`sql\n${generatedSql}\n\`\`\`\n\n> ℹ️ 실제 DB 조회를 원하시면 \`.env.local\`에서 \`EXECUTE_SQL=true\`로 설정하세요.`;
      }

    } else if (queryType === 'rag') {
      // RAG (문서 검색)
      const ragResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: RAG_PROMPT },
          { role: 'user', content: question },
        ],
        temperature: 0.3,
      });

      response = {
        ...response,
        answer: ragResponse.choices[0]?.message?.content || '답변을 생성할 수 없습니다.',
      };

    } else {
      // 일반 대화
      const chatResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 양계장 관리 시스템의 AI 어시스턴트입니다. 친절하게 한국어로 답변하세요. 데이터 조회나 시스템 사용법 질문도 가능하다고 안내해주세요.',
          },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
      });

      response = {
        ...response,
        answer: chatResponse.choices[0]?.message?.content || '안녕하세요!',
      };
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
