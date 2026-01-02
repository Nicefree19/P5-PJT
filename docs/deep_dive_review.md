# P5 통합 프레임워크 심층 리뷰

**작성일**: 2025-12-30  
**버전**: 1.0

---

## 🎯 리뷰 개요

본 리뷰는 데이터의 **의미적 정합성(Semantic Integrity)**과 **운영 거버넌스** 관점에서 시스템을 분석한 결과입니다.

---

## 🔍 핵심 발견 및 비평

### 1. 시맨틱 매핑의 단절 (Critical)
- **문제**: `GeminiAnalyzer.gs`가 "X23~X30열" 같은 텍스트를 Dashboard UID(`A-X23`)로 변환하는 로직 부재
- **영향**: 그리드 위 정확한 오버레이 자동 생성 불가능
- **해결**: Zone 매핑 정보를 AI 프롬프트에 주입

### 2. 데이터 베이스의 파편화
- **문제**: AI 분석 시트와 Dashboard ISSUES 시트 이원화
- **영향**: 사용자가 두 곳을 오가며 데이터 확인 필요
- **해결**: ISSUES 시트를 SSOT(Single Source of Truth)로 통합

### 3. 상태 머신 및 용어 불일치
- **문제**: AI Urgency(`Showstopper`) ≠ Dashboard Severity(`critical`)
- **영향**: 런타임 오류 또는 데이터 누락 가능성
- **해결**: 매핑 테이블 추가

---

## 🛠️ 전략적 개선 제안

### Phase A: 시맨틱 맵 구축 (최우선)
```javascript
const ZONE_CONTEXT = `
| Zone | X축 범위 |
|------|---------|
| ZONE A (FAB) | X1 ~ X23 |
| ZONE B (CUB) | X24 ~ X45 |
| ZONE C (COMPLEX) | X46 ~ X69 |
`;
```

### Phase B: 통합 데이터 스키마
- `createIssue` 확장하여 AI 메타데이터 수용
- `source`, `emailId`, `aiSummary` 컬럼 추가

### Phase C: 거버넌스 자동화
- AI 이슈 생성 시 `isLocked: true` 자동 부여
- 데이터 신뢰도 확보

---

## 💡 최종 결론

현재의 통합 계획은 '기술적 연결'에는 성공했으나 '실질적 자동화'에는 도달하지 못했습니다. **시맨틱 매핑** 작업을 생략할 경우, AI 도입 효용성이 50% 이상 감소할 것으로 판단됩니다.
