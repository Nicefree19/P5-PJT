# Admin Module Design Review & Feedback

**Date**: 2025-12-29
**Review Target**: [admin_module_design.md](file:///d:/00.Work_AI_Tool/11.P5_PJT/docs/admin_module_design.md)

## 📊 1. 종합 평가

제안된 설계는 P5 프로젝트의 특성을 잘 반영하고 있으며, 특히 **구조적 계층(Zone-Column-Issue)**을 분리하여 관리하는 접근 방식은 매우 우수합니다. 그러나 **Google Apps Script 기반의 웹앱**이라는 환경적 제약을 고려할 때 실현 가능성과 성능 측면에서 몇 가지 **중대한 리스크**가 발견되었습니다.

| 평가 항목 | 점수 | 코멘트 |
|-----------|------|--------|
| **구조적 완성도** | ⭐️⭐️⭐️⭐️⭐️ | 데이터 모델과 컴포넌트 설계가 매우 체계적임 |
| **UX 편의성** | ⭐️⭐️⭐️⭐️ | 관리자/사용자 역할 분리와 편집 흐름이 직관적임 |
| **구현 난이도** | ⭐️⭐️ | 순수 Vanilla JS로 복잡한 상태 관리를 구현하기 어려움 |
| **성능/안정성** | ⭐️⭐️⭐️ | Sheet API 호출 빈도와 데이터 동기화 이슈 발생 가능성 |

---

## 🚨 2. 주요 리스크 및 분석

### 2.1 Google Sheet "Rate Limit" 및 성능 병목
- **문제점**: 828개의 기둥 정보와 수시로 발생하는 이슈 업데이트를 매번 `doPost`로 Sheet에 기록하면 **지연 시간(Latency)**이 발생합니다. Apps Script는 응답속도가 느린 편(1~3초)이라, 사용자가 "반응이 굼뜨다"고 느낄 수 있습니다.
- **분석**: "Zone 수정 -> 저장 -> 로딩 -> 렌더링" 사이클이 3초 이상 걸리면 UX가 붕괴됩니다.

### 2.2 다중 사용자 동시 편집 (Concurrency)
- **문제점**: 사용자 A가 X1 기둥을 "설치 완료"로 바꾸는 동안, 사용자 B가 X1 기둥에 "T/C 이슈"를 등록하면? Sheet는 마지막에 저장된 값으로 덮어써지며 **데이터 유실** 위험이 있습니다.
- **분석**: Apps Script는 실시간 DB가 아니므로 Lock 메커니즘이 없습니다.

### 2.3 AI 분석 시스템과의 충돌
- **문제점**: AI가 이메일을 분석해 "T/C 간섭" 이슈를 자동 등록했습니다. 그런데 관리자가 수동으로 해당 이슈를 "해제"했습니다. 다음 날 AI가 같은 메일 스레드를 다시 읽거나 유사한 메일이 오면 **수동 변경 사항을 덮어쓸(Overwrite)** 위험이 있습니다.

---

## 💡 3. 개선 및 최적화 제안

### 3.1 [Architecture] "Hybrid Sync" 전략 도입
모든 클릭마다 Sheet에 저장하지 말고, 로컬에서 먼저 반영 후 백그라운드 동기화를 수행합니다.

- **변경 전**: UI 클릭 -> API 호출 -> Sheet 저장 -> 응답 -> UI 업데이트
- **변경 후**: UI 클릭 -> **Local State 업데이트 (즉시 반영)** -> 백그라운드 큐(Queue) -> 배치(Batch) 저장
- **효과**: 체감 속도 0.1초 미만, API 호출 횟수 90% 감소

### 3.2 [Implementation] 경량 프레임워크 도입 (Alpine.js 또는 Vue 3 CDN)
순수 Vanilla JS로 DOM을 직접 조작하는 것(`document.getElementById...`)은 코드가 비대해지고 버그가 생기기 쉽습니다.
- **제안**: 별도 빌드 없이 HTML에 스크립트 태그로 바로 쓸 수 있는 **Alpine.js**나 **Petit-Vue** 사용을 권장합니다.
- **이유**: `Detail Panel`의 복잡한 상태 변화(열림/닫힘, 데이터 바인딩, 탭 전환)를 `x-data`, `v-if` 등으로 직관적으로 처리 가능합니다.

### 3.3 [Integration] "Master-Override" 필드 추가
AI와 사람의 충돌을 방지하기 위해 데이터 스키마에 **우선순위 플래그**를 추가해야 합니다.

```javascript
const ColumnSchema = {
    // ...
    status: {
        current: "installed",
        source: "admin",        // "ai" 또는 "admin"
        isLocked: true          // true면 AI가 업데이트하지 않음
    }
}
```
- **로직**: `isLocked: true`인 기둥은 AI가 파싱 결과를 가져와도 상태를 업데이트하지 않고 "권장 변경 사항" 로그만 남깁니다.

### 3.4 [UI] Bulk Edit (다중 선택 편집) 기능 필수
설계서에는 "개별 기둥 편집"만 명시되어 있습니다. 실제 현장에서는 "X1열 전체(12개)" 또는 "Zone A 전체"를 한 번에 "설치 완료"로 바꾸는 경우가 90%입니다.
- **추가 제안**: 그리드에서 **드래그로 다중 선택** 또는 `Shift+Click` 지원 필요.

---

## 🛠️ 4. 수정된 로드맵 제안

기존 4주 계획을 리스크를 고려하여 현실적으로 재조정했습니다.

### Phase 1: Dashboard Core & Local Mode (1주)
- 프레임워크 선정 (Alpine.js 권장)
- JSON 기반 데이터 모델링 구현
- 로컬 스토리지 CRUD 완벽 구현 (서버 없이 일단 잘 돌아가게)
- **Draft & Drop** 다중 선택 기능 구현

### Phase 2: Sheet Sync Adapter (1주)
- Apps Script `doGet`/`doPost` API 구축
- "Optimistic UI" 업데이트 로직 구현 (선 반영 후 동기화)
- 데이터 충돌 방지 로직 (TimeStamp 체크)

### Phase 3: AI & Issue Integration (1주)
- AI 분석 결과(Sheet)를 대시보드에 오버레이
- `isLocked` 필드 적용하여 사용자 수정 보호
- 이슈 시각화 (T/C, Design 변경 영역 표시)

### Phase 4: Admin Tools & Optimization (1주)
- Zone/Master Data 설정 UI
- CSV/Excel 대량 업로드
- 모바일 뷰 최적화 (현장에서 태블릿으로 볼 수 있게)

---

## 📝 결론
설계 자체는 훌륭하나, **"Sheet API의 느린 속도"**와 **"관리 편의성(다중 선택)"** 부분이 보강되어야 합니다. 특히 **프론트엔드 프레임워크**를 가볍게라도 도입하지 않으면 유지보수 지옥에 빠질 수 있습니다.

**승인 요청 사항**:
1. **Alpine.js** (경량 프레임워크) 도입을 허용하시겠습니까?
2. **다중 선택(Bulk Edit)** 기능을 Phase 1 핵심 기능으로 격상하시겠습니까?
3. **AI 데이터 덮어쓰기 방지 (Lock)** 로직을 승인하시겠습니까?
