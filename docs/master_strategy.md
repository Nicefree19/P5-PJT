# Master Strategy - P5 복합동 AI 협업 전략

> 이 문서는 Claude Code와 Antigravity 간 AI 협업을 위한 마스터 전략 문서입니다.
> 최종 업데이트: 2026-01-03 09:15 KST

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정보
- **프로젝트명**: P5 복합동 구조 통합 관리 시스템
- **목적**: PSRC/HMB 공법 기반 반도체 FAB 프로젝트 구조 이슈 관리
- **기술 스택**: Google Apps Script, Alpine.js 3.x, Vite, GitHub Pages

### 1.2 데이터 규모
- **총 데이터 포인트**: ~9,108개 (11층 × 69열 × 8절주 기반)
- **층 구성**: 1F ~ RF (총 11개 층)
- **절주 구성**: 1절주 ~ 8절주 (수직 분절)
- **존 구성**: Zone A, B, C (수평 분절)

---

## 2. 아키텍처 구조

### 2.1 프로젝트 구조
```
D:\00.Work_AI_Tool\11.P5_PJT\
├── src/
│   ├── Code.gs              # 메인 엔트리포인트
│   ├── Config.gs            # 전역 설정
│   ├── GmailFilter.gs       # Gmail 필터링
│   ├── GeminiAnalyzer.gs    # AI 분석
│   ├── SheetWriter.gs       # 시트 기록
│   └── dashboard/
│       ├── DashboardAPI.gs  # REST API (v2.2)
│       ├── index.html       # Alpine.js SPA (~480KB)
│       └── data/
│           ├── project_master_snapshot.json  # 상태 스냅샷
│           ├── master_config.json           # 설정 마스터
│           └── migration_script.js          # 데이터 이관
├── docs/
│   ├── techspec.md          # 기술 스펙 (SSOT)
│   ├── CLAUDE_SYNC.md       # AI 동기화 파일
│   └── master_strategy.md   # 이 문서
└── dist/                    # 빌드 출력
```

### 2.2 절주(Jeolju) 매핑 구조
| 절주 | 층 범위 | 높이 범위 | 기둥 크기 |
|------|---------|----------|----------|
| 1절주 | F1, F2 | 1F~2F | 1600×1600 |
| 2절주 | F3 | 3F | 1600×1600 |
| 3절주 | F4 | 4F | 1500×1500 |
| 4절주 | F5 | 5F | 1500×1500 |
| 5절주 | F6, F7 | 6F~7F | 1300×1300 |
| 6절주 | F8 | 8F | 1300×1300 |
| 7절주 | F9 | 9F | 1300×1300 |
| 8절주 | F10, RF | 10F~RF | 1200×1200 |

### 2.3 구간(Segment) 구성
| 구간 | 기둥 범위 |
|------|----------|
| 1구간 | 1~9 |
| 2구간 | 10~18 |
| 3구간 | 19~27 |
| 4구간 | 28~36 |
| 5구간 | 37~45 |
| 6구간 | 46~54 |
| 7구간 | 55~62 |
| 8구간 | 63~69 |

---

## 3. AI 에이전트 역할 분담

### 3.1 Claude Code 담당 영역
| 영역 | 작업 내용 | 우선순위 |
|------|----------|:--------:|
| Frontend UI | Alpine.js 컴포넌트, 반응형 디자인 | 🔥 |
| 접근성 | ARIA, 키보드 내비게이션, WCAG 2.1 AA | 🔥 |
| Export 기능 | PDF, Excel, CSV 내보내기 | ✅ 완료 |
| 알림 시스템 | Slack Webhook, Email 통합 | ✅ 완료 |
| 테스트 | UAT 시나리오, E2E 테스트 스펙 | ✅ 완료 |
| 배포 | GitHub Pages, Vite 빌드 | ✅ 완료 |

### 3.2 Antigravity 담당 영역
| 영역 | 작업 내용 | 우선순위 |
|------|----------|:--------:|
| 데이터 구조 | 절주-층 매핑, 스냅샷 시스템 | ✅ 완료 |
| 전수 데이터 | 8,280개 데이터 초기화 | 🔥 |
| Backend 로직 | GAS API, 인증, RBAC | ✅ 완료 |
| 보안 | 토큰 검증, CSP, 입력 검증 | ✅ 완료 |
| 인프라 | CI/CD, GCS 배포, 롤백 | ✅ 완료 |

### 3.3 협업 작업
| 작업 | Claude Code | Antigravity |
|------|------------|-------------|
| Lock UI | 함수, HTML 구조 | CSS, 한글화 |
| 모바일 UX | UI 컴포넌트 | 로직 최적화 |
| 이슈 핀 | 시각화 | 라이프사이클 |

---

## 4. 데이터 흐름

### 4.1 상태 관리
```
[Frontend Alpine.js]
       ↓
  x-data 상태
       ↓
[LocalStorage 캐시]
       ↓
[Google Apps Script API]
       ↓
[Google Sheets DB]
```

### 4.2 동기화 전략
1. **Optimistic Update**: UI 즉시 반영 후 백엔드 동기화
2. **Conflict Resolution**: 타임스탬프 기반 최신 데이터 우선
3. **Offline Support**: LocalStorage 캐싱으로 오프라인 지원
4. **Batch Operations**: 대량 작업 시 배치 처리

### 4.3 스냅샷 시스템
```json
{
  "projectInfo": {
    "name": "P5 Complex Construction",
    "version": "1.0.0",
    "snapshotAt": "2026-01-02T23:15:00Z"
  },
  "configurations": {
    "floors": [...],      // 11개 층
    "jeoljuConfig": [...], // 8개 절주
    "columnSegments": [...] // 8개 구간
  }
}
```

---

## 5. 구현 로드맵

### 5.1 완료된 Phase
| Phase | 작업 | 담당 | 상태 |
|-------|------|------|:----:|
| Phase 0-4 | Core Dashboard, Admin | Both | ✅ |
| Phase 5-7 | AI 통합, Legacy UX | Both | ✅ |
| Phase 8 | 접근성, 마이그레이션 | Claude Code | ✅ |
| Phase 9 | 알림 시스템 | Claude Code | ✅ |
| Phase 10 | Export 기능 | Claude Code | ✅ |

### 5.2 진행 중 / 대기 작업
| Step | 작업 | 담당 | 상태 |
|------|------|------|:----:|
| Step 1 | 모바일 시공 입력 인터페이스 | Claude Code | 🟡 대기 |
| Step 2 | Virtual Scrolling UI (8,000셀) | Claude Code | 🟡 대기 |
| Step 3 | 이슈 핀 시각화 & 라이프사이클 | 협업 | 🟡 대기 |
| Step 4 | 전수 데이터 초기화 (8,280개) | Antigravity | 🔥 진행 |

---

## 6. API 참조

### 6.1 DashboardAPI.gs Endpoints
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `?action=getColumns` | 기둥 데이터 조회 |
| GET | `?action=getIssues` | 이슈 목록 조회 |
| POST | `action=saveColumn` | 기둥 상태 저장 |
| POST | `action=bulkUpdate` | 대량 업데이트 |
| POST | `action=createIssue` | 이슈 생성 |
| POST | `action=resolveIssue` | 이슈 해결 |
| POST | `action=sendNotification` | 알림 전송 |

### 6.2 알림 시스템
```javascript
// Slack Webhook
sendSlackNotification({
  type: 'issue_created',
  data: { issueId, severity, assignee }
});

// Email 알림
sendEmailNotification({
  recipients: ['pm@company.com'],
  template: 'daily_summary',
  data: { date, stats, issues }
});
```

---

## 7. 협업 프로토콜

### 7.1 핸드오프 절차
1. **발신 에이전트**: 작업 완료 후 `CLAUDE_SYNC.md` 업데이트
2. **수신 확인**: `/collab:handoff --receive` 실행
3. **작업 시작**: 관련 문서 참조 후 작업 착수
4. **완료 보고**: 통신 로그에 결과 기록

### 7.2 파일 Claim
```
/collab:claim <file>              # 60분 배타적 접근
/collab:claim <file> --duration 30 # 30분 접근
/collab:claim --release           # claim 해제
```

### 7.3 충돌 방지
- 동일 파일 동시 수정 금지
- Claim 시스템 활용
- 작업 전 CLAUDE_SYNC.md 확인

---

## 8. 품질 기준

### 8.1 코드 품질
- **번들 크기**: index.html < 500KB
- **빌드 시간**: < 2초
- **Lighthouse 점수**: 90+

### 8.2 성능 기준
- **초기 로드**: < 3초 (3G)
- **API 응답**: < 500ms (p95)
- **렌더링**: < 16ms (60fps)

### 8.3 접근성 기준
- **WCAG 2.1 AA** 준수
- **키보드 내비게이션** 완전 지원
- **스크린 리더** 호환

---

## 9. 외부 의존성

### 9.1 Frontend Libraries
| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| Alpine.js | 3.x | 반응형 UI |
| jsPDF | 2.5.1 | PDF 생성 |
| jspdf-autotable | 3.8.2 | PDF 테이블 |
| SheetJS (xlsx) | 0.20.0 | Excel 처리 |

### 9.2 Backend Services
| 서비스 | 용도 |
|--------|------|
| Google Apps Script | API 서버 |
| Google Sheets | 데이터베이스 |
| Gmail | 메일 알림 |
| Slack Webhook | 실시간 알림 |

---

## 10. 연락 및 참조

### 10.1 문서 참조
- **기술 스펙**: `docs/techspec.md`
- **동기화 파일**: `docs/CLAUDE_SYNC.md`
- **태스크 목록**: `docs/task_list.md`
- **배포 가이드**: `docs/DEPLOYMENT.md`

### 10.2 Antigravity Brain Thread
- **Thread ID**: `0d3246f9-9e8f-4b6b-b03e-23910e2243ee`
- **경로**: `C:\Users\user\.gemini\antigravity\brain\...`

### 10.3 GitHub Repository
- **URL**: https://github.com/nicefree19/P5-PJT
- **배포 URL**: https://nicefree19.github.io/P5-PJT/

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2026-01-03 09:15 KST
**작성자**: Claude Code
