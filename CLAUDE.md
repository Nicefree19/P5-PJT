# P5 복합동 구조 통합 관리 시스템

## 프로젝트 개요

Gmail-Gemini-Google Sheet 통합 + Live Grid Dashboard 시스템
PSRC/HMB 공법 기반 반도체 FAB 프로젝트 구조 이슈 관리

## 문서 구조

```
docs/
├── assets/
│   └── psrc_production_status.png  # 기존 양식 이미지
├── techspec.md                     # 기술 스펙 (SSOT)
├── plan.md                         # 초기 계획
├── design_review.md                # 설계 리뷰
├── admin_module_design.md          # Admin 모듈 설계
├── deep_dive_review.md             # 심층 리뷰 (의미적 정합성)
├── development_roadmap.md          # 개발 로드맵 (Phase 5-6)
├── task_list.md                    # 태스크 목록 및 진행현황
└── DEPLOYMENT.md                   # 배포 가이드
```

## 코드 구조

```
src/
├── Code.gs              # 메인 엔트리포인트, 트리거 관리
├── Config.gs            # 전역 설정, 환경변수
├── GmailFilter.gs       # Gmail 필터링 로직
├── GeminiAnalyzer.gs    # AI 분석 엔진 (프롬프트)
├── SheetWriter.gs       # 메일분석 DB 기록
├── Utils.gs             # 유틸리티 함수
├── Tests.gs             # 테스트 함수
└── dashboard/
    ├── DashboardAPI.gs  # REST API (doGet/doPost)
    ├── index.html       # Alpine.js SPA Dashboard
    └── data/
        └── master_config.json  # Zone/상태코드 마스터데이터
```

## 현재 진행 상태

| Phase | 상태 | 설명 |
|-------|------|------|
| Phase 0-4 | ✅ 완료 | 기초설정, Dashboard Core, Sync, AI통합, Admin |
| Phase 5-8 | 🚀 진행중 | **8절주 정합성 & 마스터 스냅샷 (Antigravity)** |
| Future | 📋 진행예정 | 모바일 UX, 이슈 핀 시각화, 보고서 (Claude) |

## 구현 시 마스터 참조
1. **SSOT**: `project_master_snapshot.json` (전체 상태 백업/복구의 기준)
2. **Strategy**: `docs/master_strategy.md` (AI 협업 및 연동 로직 가이드)

## Phase 5 우선순위 (권장 순서)

1. **Task 3**: LockService 동시성 제어 (20분)
2. **Task 4**: Urgency→Severity 매핑 (10분)
3. **Task 1**: 시맨틱 프롬프트 강화 (30분)
4. **Task 2**: 데이터 스키마 통합 (45분)
5. **Task 5**: 비동기 분석 트리거 (40분)

## 핵심 의존성

- Google Apps Script
- Gemini 2.0 Flash API
- Google Sheets API
- Alpine.js 3.x (Dashboard)

## 환경 설정

```bash
# .env 파일 필요
GEMINI_API_KEY=AIzaSy...
SHEET_ID=110X375tt...
DEBUG_MODE=true
```

## 주요 규칙

1. **문서 우선**: docs/ 폴더 문서 기반 작업
2. **SSOT 원칙**: techspec.md가 최상위 스펙
3. **Phase 순서**: 의존성 체인 준수 (Task 3→4→1→2→5)
4. **테스트 필수**: 각 Task 완료 후 검증

## 외부 참조

- implementation_plan.md: `C:\Users\user\.gemini\antigravity\brain\0d3246f9-9e8f-4b6b-b03e-23910e2243ee\`
