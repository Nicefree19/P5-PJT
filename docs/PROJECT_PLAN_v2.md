# P5 복합동 구조 통합 관리 시스템 - 확장 기획안 v2.1

**작성일**: 2025-12-31
**버전**: 2.1
**작성자**: Claude Code (협의 기반)
**최종 수정**: 2025-12-31 (11층-8절주 구조 반영)

---

## 1. 개요

### 1.1 프로젝트 목표

P5 복합동 프로젝트의 설계-제작-SHOP 전 과정을 통합 관리하는 시스템으로,
센엔지니어링그룹 내부 관계자들의 역할별 권한 관리와 외부 관계자의 Viewer 접근을 지원합니다.

**설계담당자 핵심 목적**: 건축 및 발주처 설계변경 이슈를 빠르게 관계자들에게 공유하여,
제작 현황과 SHOP 진행현황에 대한 영향성 파악을 빠르게 하고 의사결정을 위한 플랫폼으로 활용

### 1.2 프로젝트 규모

| 항목 | 내용 |
|------|------|
| **프로젝트명** | P5 복합동 |
| **층 수** | 11개 층 |
| **절주 수** | 8개 절주 (시공 순서 기준) |
| **기둥 그리드** | 층당 12행 × 69열 = 828셀 |
| **전체 기둥** | 약 9,108개 (11층 × 828) |

### 1.3 핵심 요구사항 요약

| 항목 | 내용 |
|------|------|
| **인증 방식** | 별도 ID/Password 시스템 (관리자 배포) |
| **사용자 규모** | 10-30명 (내부) + 외부 Viewer |
| **계정 관리** | 시스템 관리자 1명이 전담 |
| **권한 구조** | 역할별 영역 분리 (설계/제작/SHOP) |
| **외부 접근** | 공개 URL + 비밀번호 (Viewer Only) |
| **이슈 시각화** | 영역 박스 + 범례 + 타임라인 |
| **구조 관리** | 층별 선택 + 절주별 입면 뷰어 |

---

## 2. 사용자 역할 및 권한 체계

### 2.1 역할 정의

```
┌─────────────────────────────────────────────────────────────────┐
│                    시스템 관리자 (Admin)                         │
│  - 모든 데이터 CRUD                                             │
│  - 사용자 계정 관리 (생성/수정/삭제)                              │
│  - 시스템 설정 관리                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  설계담당자    │     │  제작담당자    │     │  SHOP담당자   │
│  (Designer)   │     │  (Producer)   │     │   (Shop)      │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ • 설계 검토    │     │ • HMB제작     │     │ • 모델링 현황  │
│ • 설계 이슈   │     │ • 연조립      │     │ • 도면 현황   │
│   등록/관리   │     │ • 대조립      │     │ • 이슈 반영   │
│              │     │ • 폼(FORM)    │     │   현황 관리   │
│              │     │ • 앰베드      │     │ • 미반영 사항  │
│              │     │   제작현황    │     │   정리        │
└───────────────┘     └───────────────┘     └───────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   외부 관계자      │
                    │   (Viewer)        │
                    ├───────────────────┤
                    │ • 삼성E&A         │
                    │ • 삼우종합건축     │
                    │ • 이앤디몰        │
                    │                   │
                    │ ※ 읽기 전용       │
                    └───────────────────┘
```

### 2.2 권한 매트릭스

| 기능 | Admin | 설계담당자 | 제작담당자 | SHOP담당자 | Viewer |
|------|:-----:|:---------:|:---------:|:---------:|:------:|
| **Grid 조회** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **이슈 목록 조회** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **타임라인 조회** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **설계 검토 수정** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **설계 이슈 등록** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **제작현황 수정** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **SHOP 현황 수정** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **이슈 반영 상태** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **사용자 관리** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **시스템 설정** | ✅ | ❌ | ❌ | ❌ | ❌ |

### 2.3 데이터 영역 분리

#### 설계담당자 영역
```javascript
{
  "scope": "design",
  "permissions": {
    "designReview": ["create", "read", "update"],
    "designIssue": ["create", "read", "update", "delete"],
    "columnStatus": ["read"],  // 조회만
    "shopStatus": ["read"]     // 조회만
  },
  "dataFields": [
    "설계검토상태",
    "설계이슈",
    "설계변경사항",
    "검토의견"
  ]
}
```

#### 제작담당자 영역
```javascript
{
  "scope": "production",
  "permissions": {
    "productionStage": ["create", "read", "update"],
    "columnStatus": ["read", "update"],  // 제작 공정만
    "designIssue": ["read"]
  },
  "dataFields": [
    "HMB제작현황",
    "연조립현황",
    "대조립현황",
    "FORM현황",
    "앰베드현황"
  ],
  "allowedStages": ["hmb_fab", "soft_assembly", "hard_assembly", "form", "embed"]
}
```

#### SHOP담당자 영역
```javascript
{
  "scope": "shop",
  "permissions": {
    "modelingStatus": ["create", "read", "update"],
    "drawingStatus": ["create", "read", "update"],
    "issueReflection": ["read", "update"],
    "unreflectedItems": ["create", "read", "update", "delete"]
  },
  "dataFields": [
    "모델링현황",
    "도면작업현황",
    "납품현황",
    "이슈반영상태",
    "미반영사항"
  ]
}
```

---

## 3. 층-절주 구조 시스템

### 3.1 구조 개요

P5 복합동은 **11개 층**과 **8개 절주**로 구성된 대규모 구조물입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    P5 복합동 구조 개념도                          │
└─────────────────────────────────────────────────────────────────┘

                    [입면 뷰 - 절주 구분]

    11F  ┌────┬────┬────┬────┬────┬────┬────┬────┐
    10F  │    │    │    │    │    │    │    │    │
     9F  │ 절 │ 절 │ 절 │ 절 │ 절 │ 절 │ 절 │ 절 │
     8F  │ 주 │ 주 │ 주 │ 주 │ 주 │ 주 │ 주 │ 주 │
     7F  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │
     6F  │    │    │    │    │    │    │    │    │
     5F  │(시 │(시 │(시 │(시 │(시 │(시 │(시 │(시 │
     4F  │공  │공  │공  │공  │공  │공  │공  │공  │
     3F  │순  │순  │순  │순  │순  │순  │순  │순  │
     2F  │서) │서) │서) │서) │서) │서) │서) │서) │
     1F  │    │    │    │    │    │    │    │    │
         └────┴────┴────┴────┴────┴────┴────┴────┘

         ←───────── 시공 진행 방향 ─────────→
```

### 3.2 절주(節柱) 정의

**절주**는 시공 순서(시간)에 따른 기둥 그룹입니다.

```javascript
const JEOLJU_CONFIG = {
  count: 8,
  definition: "시공 순서(시간) 기준 분할",
  purpose: [
    "타워크레인 운용 효율화",
    "공정 관리 단위화",
    "자재 반입 순서 관리",
    "품질 검수 단위 설정"
  ],

  // 절주별 기둥 범위 (예시 - 실제 데이터 필요)
  mapping: {
    "절주1": { columns: "X1-X9", columnCount: 9, priority: 1 },
    "절주2": { columns: "X10-X18", columnCount: 9, priority: 2 },
    "절주3": { columns: "X19-X27", columnCount: 9, priority: 3 },
    "절주4": { columns: "X28-X36", columnCount: 9, priority: 4 },
    "절주5": { columns: "X37-X45", columnCount: 9, priority: 5 },
    "절주6": { columns: "X46-X54", columnCount: 9, priority: 6 },
    "절주7": { columns: "X55-X62", columnCount: 8, priority: 7 },
    "절주8": { columns: "X63-X69", columnCount: 7, priority: 8 }
  }
};
```

### 3.3 층 구조

각 층은 유사한 기둥 배치를 가지지만, 부분적인 차이가 있습니다.

```javascript
const FLOOR_CONFIG = {
  count: 11,
  gridSize: { rows: 12, columns: 69 },
  cellsPerFloor: 828,

  floors: [
    { id: "F01", label: "1층", hasVariation: false },
    { id: "F02", label: "2층", hasVariation: false },
    { id: "F03", label: "3층", hasVariation: false },
    { id: "F04", label: "4층", hasVariation: false },
    { id: "F05", label: "5층", hasVariation: true, note: "부분 차이" },
    { id: "F06", label: "6층", hasVariation: false },
    { id: "F07", label: "7층", hasVariation: false },
    { id: "F08", label: "8층", hasVariation: true, note: "부분 차이" },
    { id: "F09", label: "9층", hasVariation: false },
    { id: "F10", label: "10층", hasVariation: false },
    { id: "F11", label: "11층", hasVariation: true, note: "최상층 특수" }
  ]
};
```

### 3.4 평면 뷰어 UI 설계

```
┌─────────────────────────────────────────────────────────────────┐
│ P5 복합동 대시보드                                    [?] [⚙️] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
│  │ 🏢 층 선택   │  │              입면 절주 뷰어             │   │
│  ├─────────────┤  │                                         │   │
│  │ [x] 11층    │  │   11 ┌───┬───┬───┬───┬───┬───┬───┬───┐ │   │
│  │ [ ] 10층    │  │   10 │   │   │   │ ● │   │   │   │   │ │   │
│  │ [ ] 9층     │  │    9 │   │   │   │   │   │   │   │   │ │   │
│  │ [ ] 8층     │  │    8 │   │   │   │   │   │   │   │   │ │   │
│  │ [ ] 7층     │  │    7 │   │   │   │   │   │   │   │   │ │   │
│  │ [ ] 6층     │  │    6 │ ○ │   │   │   │   │   │   │   │ │   │
│  │ [ ] 5층     │  │    5 │   │   │   │   │   │   │   │   │ │   │
│  │ [ ] 4층     │  │    4 │   │ ○ │   │   │   │   │   │   │ │   │
│  │ [ ] 3층     │  │    3 │   │   │ ○ │   │   │   │   │   │ │   │
│  │ [ ] 2층     │  │    2 │   │   │   │ ○ │   │   │   │   │ │   │
│  │ [ ] 1층     │  │    1 └───┴───┴───┴───┴───┴───┴───┴───┘ │   │
│  └─────────────┘  │      J1  J2  J3  J4  J5  J6  J7  J8     │   │
│                   │                                         │   │
│                   │  ● 현재 선택 층  ○ 이슈 발생 층          │   │
│                   └─────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                      🔷 11층 평면 Grid                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │   X1  X2  X3  ...  X67 X68 X69                              ││
│  │ A ○───○───○─────────○───○───○                               ││
│  │ B ○───○───○─────────○───○───○                               ││
│  │ C ○───○───○─────────○───○───○                               ││
│  │ ...                                                         ││
│  │ L ○───○───○─────────○───○───○                               ││
│  │                                                             ││
│  │ [절주1][절주2][절주3][절주4][절주5][절주6][절주7][절주8]      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 뷰어 컴포넌트 구조

```javascript
// Alpine.js 데이터 구조 확장
const viewerData = {
  // 층 선택
  selectedFloor: 'F11',  // 현재 선택된 층
  floors: [],           // 전체 층 목록 (API에서 로드)

  // 절주 뷰어
  selectedJeolju: null,  // 선택된 절주 (필터링용)
  jeoljuList: [],       // 8개 절주 목록

  // 입면 뷰어 데이터
  elevationView: {
    show: true,
    issueFloors: [],    // 이슈가 있는 층 목록
    progressByJeolju: {} // 절주별 진행률
  },

  // 현재 층 데이터
  currentFloorData: {
    columns: [],        // 해당 층의 기둥 데이터
    issues: [],         // 해당 층 관련 이슈
    stats: {}           // 통계
  },

  // 메서드
  async selectFloor(floorId) {
    this.selectedFloor = floorId;
    await this.loadFloorData(floorId);
    this.updateElevationView();
  },

  filterByJeolju(jeoljuId) {
    this.selectedJeolju = jeoljuId;
    this.applyFilters();
  }
};
```

### 3.6 데이터 모델 확장 (층-절주)

#### Floors 시트 (신규)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| floorId | String | 층 ID | F11 |
| label | String | 표시명 | 11층 |
| order | Number | 정렬 순서 | 11 |
| hasVariation | Boolean | 표준층 대비 차이 | false |
| variationNote | String | 차이 설명 | null |
| totalColumns | Number | 기둥 수 | 828 |
| createdAt | DateTime | 생성일 | 2025-01-01 |

#### Jeolju 시트 (신규)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| jeoljuId | String | 절주 ID | J1 |
| label | String | 표시명 | 절주1 |
| startColumn | Number | 시작 X번호 | 1 |
| endColumn | Number | 종료 X번호 | 9 |
| columnCount | Number | 기둥 개수/행 | 9 |
| priority | Number | 시공 우선순위 | 1 |
| status | Enum | 전체 상태 | in_progress |
| note | String | 비고 | 1차 시공 구역 |

#### Columns 시트 확장

```diff
  기존 컬럼들...
+ floorId     | String | 층 ID (FK)      | F11
+ jeoljuId    | String | 절주 ID (FK)    | J1
  ...
```

### 3.7 층-절주 기반 UID 체계

```javascript
// 기존: A-X1 (Row-Column)
// 확장: F11-A-X1 (Floor-Row-Column)

const generateColumnUID = (floorId, row, column) => {
  return `${floorId}-${row}-X${column}`;
  // 예: "F11-A-X1", "F05-C-X45"
};

// 절주 정보는 X 좌표로부터 자동 추론
const getJeoljuFromColumn = (columnNumber) => {
  if (columnNumber >= 1 && columnNumber <= 9) return 'J1';
  if (columnNumber >= 10 && columnNumber <= 18) return 'J2';
  // ... 계속
  if (columnNumber >= 63 && columnNumber <= 69) return 'J8';
};
```

---

## 4. 인증 시스템 설계

### 4.1 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Dashboard)                       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐│
│  │ Login Page    │→ │ Auth Token    │→ │ Role-based UI         ││
│  │ (ID/PW 입력)  │  │ (LocalStorage)│  │ (권한별 메뉴 표시)    ││
│  └───────────────┘  └───────────────┘  └───────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (Apps Script)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ AuthAPI.gs                                                │  │
│  │  • login(id, password) → token                            │  │
│  │  • validateToken(token) → user info                       │  │
│  │  • logout(token)                                          │  │
│  │  • createUser(userData) [Admin only]                      │  │
│  │  • updateUser(userId, userData) [Admin only]              │  │
│  │  • deleteUser(userId) [Admin only]                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer (Google Sheets)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Users 시트                                                │  │
│  │  ID | 이름 | 이메일 | 비밀번호(해시) | 역할 | 상태 | 생성일 │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Sessions 시트                                             │  │
│  │  토큰 | 사용자ID | 생성시간 | 만료시간 | IP | UserAgent    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Users 시트 스키마

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| userId | String | 고유 ID | USR-001 |
| loginId | String | 로그인 ID | designer01 |
| name | String | 이름 | 홍길동 |
| email | String | 이메일 | hong@senkuzo.com |
| passwordHash | String | 비밀번호 (SHA-256) | a3f2e8... |
| role | Enum | 역할 | designer/producer/shop/viewer/admin |
| status | Enum | 상태 | active/inactive/pending |
| createdAt | DateTime | 생성일 | 2025-01-01T09:00:00 |
| lastLogin | DateTime | 최근 로그인 | 2025-12-31T14:30:00 |

### 4.3 로그인 플로우

```
1. 사용자가 ID/Password 입력
2. Frontend → Backend: login(id, password)
3. Backend:
   - Users 시트에서 loginId 검색
   - 비밀번호 해시 비교
   - 성공 시 세션 토큰 생성 (UUID + 만료시간)
   - Sessions 시트에 저장
4. Backend → Frontend: { token, user: { id, name, role } }
5. Frontend:
   - token을 LocalStorage에 저장
   - 역할에 따른 UI 렌더링
```

### 4.4 권한 검증 플로우

```javascript
// 모든 API 요청에 권한 검증 추가
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const token = payload.token;

  // 토큰 검증
  const user = validateToken_(token);
  if (!user) {
    return errorResponse_("UNAUTHORIZED", "유효하지 않은 토큰입니다.");
  }

  // 권한 검증
  const action = payload.action;
  if (!hasPermission_(user.role, action)) {
    return errorResponse_("FORBIDDEN", "권한이 없습니다.");
  }

  // 요청 처리
  switch(action) {
    case "updateProductionStage":
      if (!["admin", "producer"].includes(user.role)) {
        return errorResponse_("FORBIDDEN", "제작담당자만 수정 가능합니다.");
      }
      return updateProductionStage_(payload);
    // ...
  }
}
```

---

## 5. SHOP 상태 관리 워크플로우

### 5.1 SHOP 작업 단계 (통합)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHOP DWG 작업 워크플로우                      │
└─────────────────────────────────────────────────────────────────┘

  [모델링 단계]                      [도면 단계]
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  미작업   │ → │ 모델링중  │ → │ 모델링   │ → │ 도면작업  │
  │          │    │          │    │  완료    │    │   중     │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                       │
                                                       ▼
                                  ┌──────────┐    ┌──────────┐
                                  │  확인    │ ← │  납품    │
                                  │  완료    │    │  완료    │
                                  └──────────┘    └──────────┘
```

### 5.2 SHOP 상태 코드

```javascript
const SHOP_STATUS_CODES = {
  // 모델링 단계
  "shop_not_started": {
    label: "미작업",
    color: "#484f58",
    phase: "modeling",
    order: 0
  },
  "shop_modeling": {
    label: "모델링중",
    color: "#1f6feb",
    phase: "modeling",
    order: 1
  },
  "shop_modeling_done": {
    label: "모델링완료",
    color: "#238636",
    phase: "modeling",
    order: 2
  },

  // 도면 단계
  "shop_drawing": {
    label: "도면작업중",
    color: "#d29922",
    phase: "drawing",
    order: 3
  },
  "shop_delivered": {
    label: "납품완료",
    color: "#8957e5",
    phase: "drawing",
    order: 4
  },
  "shop_confirmed": {
    label: "확인완료",
    color: "#2ea043",
    phase: "drawing",
    order: 5
  }
};
```

### 5.3 이슈 반영 상태 관리

```javascript
const ISSUE_REFLECTION_STATUS = {
  "not_applicable": {
    label: "해당없음",
    color: "#484f58",
    badge: null
  },
  "pending": {
    label: "반영대기",
    color: "#d29922",
    badge: "⏳"
  },
  "in_progress": {
    label: "반영중",
    color: "#1f6feb",
    badge: "🔄"
  },
  "reflected": {
    label: "반영완료",
    color: "#238636",
    badge: "✅"
  },
  "not_reflected": {
    label: "미반영",
    color: "#da3633",
    badge: "⚠️"
  }
};
```

### 5.4 SHOP 데이터 스키마 확장

```javascript
// Column 스키마 확장
const ColumnSchema = {
  uid: "A-X1",
  location: { row: "A", column: 1, zoneId: "zone_a" },

  // 기존 필드
  status: { code: "installed", source: "admin" },

  // 제작 공정 (기존)
  productionStages: {
    hmb_fab: { status: "complete", updatedAt: "...", updatedBy: "..." },
    soft_assembly: { status: "in_progress", ... },
    // ...
  },

  // 🆕 SHOP 현황 (신규)
  shopStatus: {
    modeling: {
      status: "shop_modeling_done",
      updatedAt: "2025-12-30T10:00:00Z",
      updatedBy: "shop_user01"
    },
    drawing: {
      status: "shop_drawing",
      updatedAt: "2025-12-31T09:00:00Z",
      updatedBy: "shop_user01"
    }
  },

  // 🆕 이슈 반영 현황 (신규)
  issueReflection: [
    {
      issueId: "ISS-2025-0042",
      status: "reflected",
      reflectedAt: "2025-12-29T14:00:00Z",
      note: "Rev.D 도면 반영 완료"
    },
    {
      issueId: "ISS-2025-0045",
      status: "not_reflected",
      reason: "설계 확정 대기중",
      expectedDate: "2026-01-05"
    }
  ]
};
```

---

## 6. 이슈 시각화 시스템

### 6.1 시각화 레이어 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                       Grid View (Base)                          │
│  828개 셀 (12행 × 69열)                                         │
├─────────────────────────────────────────────────────────────────┤
│                    Layer 1: 기본 상태                            │
│  • 기둥별 상태 색상 (pending/active/installed/hold)              │
├─────────────────────────────────────────────────────────────────┤
│                    Layer 2: 이슈 영역 박스                       │
│  • 점선 박스로 이슈 영향 범위 표시                               │
│  • 이슈 타입별 색상 구분                                         │
│  • 클릭 시 이슈 상세 팝업                                        │
├─────────────────────────────────────────────────────────────────┤
│                    Layer 3: 미반영 표시                          │
│  • 미반영 기둥에 배지 (⚠️) 표시                                  │
│  • 주황/빨강 테두리 강조                                         │
│  • 호버 시 미반영 이슈 목록 툴팁                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Layer 4: 범례 패널                            │
│  • 우측 사이드바에 이슈 목록                                     │
│  • 심각도별 필터링                                               │
│  • 이슈 클릭 시 해당 영역 하이라이트                             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 이슈 영역 박스 디자인

```css
/* 이슈 타입별 색상 */
.issue-overlay {
  position: absolute;
  border: 2px dashed;
  border-radius: 4px;
  pointer-events: all;
  cursor: pointer;
  transition: all 0.2s ease;
}

.issue-overlay.type-tc {
  border-color: #da3633;  /* T/C 간섭 - 빨강 */
  background: rgba(218, 54, 51, 0.1);
}

.issue-overlay.type-design {
  border-color: #d29922;  /* 설계 변경 - 주황 */
  background: rgba(210, 153, 34, 0.1);
}

.issue-overlay.type-material {
  border-color: #8957e5;  /* 자재 이슈 - 보라 */
  background: rgba(137, 87, 229, 0.1);
}

/* 미반영 셀 표시 */
.cell.unreflected {
  position: relative;
}

.cell.unreflected::after {
  content: "⚠️";
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
}

.cell.unreflected {
  box-shadow: inset 0 0 0 2px #d29922;
}
```

### 6.3 범례 패널 UI

```html
<!-- 이슈 범례 패널 -->
<div class="issue-legend-panel">
  <div class="legend-header">
    <h3>🚨 활성 이슈</h3>
    <span class="issue-count">5건</span>
  </div>

  <div class="legend-filters">
    <button class="filter-btn active" data-severity="all">전체</button>
    <button class="filter-btn" data-severity="critical">Critical</button>
    <button class="filter-btn" data-severity="high">High</button>
  </div>

  <div class="legend-list">
    <div class="legend-item severity-critical"
         @click="highlightIssue('ISS-2025-0042')">
      <div class="legend-color" style="background: #da3633"></div>
      <div class="legend-info">
        <span class="legend-title">T/C #5 간섭</span>
        <span class="legend-meta">6개 기둥 영향 • Zone B</span>
      </div>
      <span class="legend-badge">Critical</span>
    </div>
    <!-- 추가 이슈들 -->
  </div>
</div>
```

### 6.4 미반영 표시 팝업

```javascript
// 미반영 기둥 호버 시 팝업 내용
const unreflectedPopup = {
  template: `
    <div class="unreflected-popup">
      <div class="popup-header">
        <span class="warning-icon">⚠️</span>
        <span>미반영 이슈</span>
      </div>
      <div class="popup-content">
        <div class="unreflected-issue" x-for="issue in unreflectedIssues">
          <span class="issue-id">{{ issue.id }}</span>
          <span class="issue-title">{{ issue.title }}</span>
          <span class="issue-reason">사유: {{ issue.reason }}</span>
          <span class="issue-expected">예상 반영일: {{ issue.expectedDate }}</span>
        </div>
      </div>
    </div>
  `
};
```

---

## 7. 타임라인 시스템

### 7.1 타임라인 이벤트 타입

```javascript
const TIMELINE_EVENT_TYPES = {
  // 이슈 관련
  "issue_created": { icon: "🆕", label: "이슈 생성", color: "#da3633" },
  "issue_updated": { icon: "✏️", label: "이슈 수정", color: "#d29922" },
  "issue_resolved": { icon: "✅", label: "이슈 해결", color: "#238636" },

  // 상태 변경
  "status_changed": { icon: "🔄", label: "상태 변경", color: "#1f6feb" },
  "stage_updated": { icon: "📊", label: "공정 업데이트", color: "#8957e5" },

  // SHOP 관련
  "shop_modeling": { icon: "🎨", label: "모델링 상태", color: "#1f6feb" },
  "shop_drawing": { icon: "📐", label: "도면 상태", color: "#d29922" },
  "shop_delivered": { icon: "📦", label: "납품 완료", color: "#238636" },

  // 반영 관련
  "issue_reflected": { icon: "🔗", label: "이슈 반영", color: "#238636" },
  "issue_not_reflected": { icon: "⚠️", label: "미반영 등록", color: "#da3633" }
};
```

### 7.2 타임라인 UI

```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 타임라인                                    [필터 ▼] [기간 ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  2025-12-31                                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  14:30  🔄 상태 변경                                            │
│         B-X25 ~ B-X30: pending → active                         │
│         by 제작담당자 (producer01)                               │
│                                                                  │
│  11:00  📐 도면 상태                                            │
│         C-X45 ~ C-X50: 도면작업중                               │
│         by SHOP담당자 (shop01)                                   │
│                                                                  │
│  09:15  🆕 이슈 생성                                            │
│         [ISS-2025-0048] Rev.E 설계 변경                         │
│         영향: Zone B (12개 기둥)                                 │
│         by 설계담당자 (designer01)                               │
│                                                                  │
│  2025-12-30                                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  17:00  ✅ 이슈 해결                                            │
│         [ISS-2025-0042] T/C #5 간섭 → 해결                      │
│         해결방법: X40 라인 우선 시공으로 우회                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 타임라인 데이터 스키마

```javascript
// History 시트 스키마
const HistorySchema = {
  id: "HIS-20251231-001",
  timestamp: "2025-12-31T14:30:00+09:00",
  eventType: "status_changed",

  // 변경 주체
  actor: {
    userId: "USR-003",
    name: "김제작",
    role: "producer"
  },

  // 변경 대상
  target: {
    type: "columns",  // columns | issue | shop
    ids: ["B-X25", "B-X26", "B-X27", "B-X28", "B-X29", "B-X30"],
    zone: "zone_b"
  },

  // 변경 내용
  change: {
    field: "status",
    from: "pending",
    to: "active"
  },

  // 메타데이터
  metadata: {
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0...",
    sessionId: "sess_abc123"
  }
};
```

---

## 8. 데이터 모델 확장

### 8.1 전체 시트 구조

| 시트명 | 용도 | 신규/기존 |
|--------|------|----------|
| **인증 관련** | | |
| Users | 사용자 계정 | 🆕 신규 |
| Sessions | 로그인 세션 | 🆕 신규 |
| **구조 관련** | | |
| Floors | 11개 층 정보 | 🆕 신규 |
| Jeolju | 8개 절주 정보 | 🆕 신규 |
| Zones | Zone 설정 | 기존 |
| **기둥 데이터** | | |
| Columns | 기둥 데이터 (층/절주 확장) | 확장 |
| **이슈 관련** | | |
| Issues | 이슈 목록 | 기존 |
| IssueReflection | 이슈 반영 현황 | 🆕 신규 |
| **SHOP 관련** | | |
| ShopStatus | SHOP 현황 | 🆕 신규 |
| **기록 관련** | | |
| History | 변경 이력 (확장) | 확장 |
| StatusCodes | 상태 코드 | 기존 |
| P5_메일_분석_DB | 메일 분석 | 기존 |
| 실행로그 | 배치 로그 | 기존 |

### 8.2 신규 시트: ShopStatus

| 컬럼 | 타입 | 설명 |
|------|------|------|
| uid | String | 기둥 UID (FK) |
| modelingStatus | Enum | 모델링 상태 코드 |
| modelingUpdatedAt | DateTime | 모델링 상태 수정일 |
| modelingUpdatedBy | String | 수정자 ID |
| drawingStatus | Enum | 도면 상태 코드 |
| drawingUpdatedAt | DateTime | 도면 상태 수정일 |
| drawingUpdatedBy | String | 수정자 ID |
| note | String | 비고 |

### 8.3 신규 시트: IssueReflection

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | String | 반영 ID |
| issueId | String | 이슈 ID (FK) |
| columnUid | String | 기둥 UID (FK) |
| status | Enum | 반영 상태 |
| reflectedAt | DateTime | 반영일 |
| reflectedBy | String | 반영자 ID |
| reason | String | 미반영 사유 |
| expectedDate | Date | 예상 반영일 |
| note | String | 비고 |

---

## 9. 구현 로드맵

### Phase 7: 층-절주 구조 시스템 (신규) ⭐ 우선순위

> **핵심**: 11개 층 × 8개 절주 구조 지원 - 모든 기능의 기반 인프라

| Task | 내용 | 예상 시간 |
|------|------|----------|
| 7.1 | Floors/Jeolju 시트 생성 및 데이터 입력 | 1시간 |
| 7.2 | Columns 시트 스키마 확장 (floorId, jeoljuId 추가) | 1시간 |
| 7.3 | FloorAPI.gs 구현 (층/절주 CRUD) | 1.5시간 |
| 7.4 | Frontend 층 선택기 컴포넌트 | 1.5시간 |
| 7.5 | 입면 절주 뷰어 컴포넌트 | 2시간 |
| 7.6 | Grid 데이터 층별 로딩 연동 | 1시간 |

### Phase 8: 인증 및 권한 시스템 (신규)

| Task | 내용 | 예상 시간 |
|------|------|----------|
| 8.1 | Users/Sessions 시트 생성 | 30분 |
| 8.2 | AuthAPI.gs 구현 (login/logout/validate) | 2시간 |
| 8.3 | Frontend 로그인 페이지 | 1.5시간 |
| 8.4 | 권한 미들웨어 적용 | 1시간 |
| 8.5 | 역할별 UI 분기 | 1시간 |

### Phase 9: SHOP 상태 관리 (신규)

| Task | 내용 | 예상 시간 |
|------|------|----------|
| 9.1 | ShopStatus 시트 생성 | 20분 |
| 9.2 | SHOP API 엔드포인트 추가 | 1.5시간 |
| 9.3 | SHOP 현황 편집 UI | 2시간 |
| 9.4 | 이슈 반영 관리 UI | 1.5시간 |

### Phase 10: 이슈 시각화 고도화 (신규)

| Task | 내용 | 예상 시간 |
|------|------|----------|
| 10.1 | 이슈 영역 박스 오버레이 | 1.5시간 |
| 10.2 | 미반영 표시 (배지/색상/팝업) | 1시간 |
| 10.3 | 범례 패널 구현 | 1시간 |
| 10.4 | 이슈-Grid 연동 인터랙션 | 1시간 |

### Phase 11: 타임라인 시스템 (신규)

| Task | 내용 | 예상 시간 |
|------|------|----------|
| 11.1 | History 스키마 확장 | 30분 |
| 11.2 | 이벤트 로깅 시스템 | 1시간 |
| 11.3 | 타임라인 UI 구현 | 2시간 |
| 11.4 | 필터/검색 기능 | 1시간 |

### 전체 구현 순서 요약

```
Phase 7: 층-절주 구조 ──┐
                       ├──→ Phase 8: 인증 ──→ Phase 9: SHOP
Phase 10: 이슈 시각화 ─┘
                       └──→ Phase 11: 타임라인
```

**추정 총 소요 시간**: 약 25-30시간

---

## 10. 보안 고려사항

### 10.1 인증 보안

- 비밀번호: SHA-256 해시 + Salt 적용
- 세션 토큰: UUID v4 + 24시간 만료
- 로그인 시도 제한: 5회 실패 시 30분 잠금
- HTTPS 필수 (Google Apps Script Web App)

### 10.2 권한 검증

- 모든 API 요청에 토큰 검증 필수
- 역할별 데이터 접근 범위 서버에서 검증
- 클라이언트 UI 숨김은 보안이 아님 (서버 검증 필수)

### 10.3 감사 추적

- 모든 데이터 변경 History 기록
- 사용자 ID, IP, 시간, 변경 내용 로깅
- 주기적 로그 백업

---

## 11. 다음 단계

### 11.1 즉시 진행 필요 사항

1. **층-절주 상세 정보 수집** ⏳
   - 사용자 제공 예정: 층별 평면도 이미지
   - 사용자 제공 예정: 절주 구분 입면도 이미지
   - 확인 필요: 각 층별 기둥 배치 차이점

2. **기획 확정**: 본 문서 내용 검토 및 피드백

### 11.2 구현 순서

1. **Phase 7 착수**: 층-절주 구조 시스템 (기반 인프라)
2. **Phase 8 진행**: 인증 시스템 구현
3. **테스트 계정 생성**: Admin 1명 + 역할별 테스트 계정
4. **단계별 배포**: Phase별 테스트 후 운영 적용

### 11.3 미결정 사항

| 항목 | 상태 | 비고 |
|------|------|------|
| 층별 기둥 배치 차이 상세 | ⏳ 대기중 | 이미지 제공 후 확정 |
| 절주별 X좌표 범위 | ⏳ 대기중 | 이미지 제공 후 확정 |
| 입면 뷰어 디자인 상세 | ⏳ 대기중 | 이미지 제공 후 확정 |

---

**문서 끝**

*최종 수정: 2025-12-31 (v2.1 - 11층/8절주 구조 반영)*
