/**
 * PSRC 제작 현황 데이터 임포트 스크립트
 * 
 * 소스: 2-5. PSRC 제작 진행 현황도 (기 진행분)
 * 작성일: 2025-12-30
 * 
 * 핵심 개념:
 * - 기둥(Column) 기반 모듈 대시보드
 * - **층(Floor) 구분 필수**: 동일 UID가 다른 층에 존재
 * 
 * 층 구분:
 * - 1절주 (Floor: F1): X36~X57, 행 A~K
 * - 2절주 (Floor: F2): X42~X49, 행 A~K (코어제외)
 * 
 * UID 형식 (층 포함):
 * - 기존: "A-X36" 
 * - 확장: "F1-A-X36" (Floor-Row-Column)
 * 
 * 스테이지 매핑:
 * - 노랑(완료) = installed
 * - 초록(진행) = active  
 * - 흰색(대기) = pending
 * - 회색(제외) = excluded
 */

// =====================================================
// 층(Floor) 정의
// =====================================================
const FLOORS = {
  F1: { id: "F1", name: "1절주", description: "1절주 제작 현황", columnRange: "X36~X57" },
  F2: { id: "F2", name: "2절주", description: "2절주 제작 현황", columnRange: "X42~X49" },
};

// =====================================================
// 1절주 제작현황 데이터 (X36~X57, A~K)
// =====================================================

const PRODUCTION_STATUS_1JEOL = {
  // X36열
  "A-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "D-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "E-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "F-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "G-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "H-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "I-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "J-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X36": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  // X37열
  "A-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "D-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "E-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "F-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "G-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "H-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "I-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "J-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X37": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  // X38열
  "A-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "D-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "E-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "F-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "G-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "H-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "I-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "J-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X38": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  // X39열 (보라색 테두리 영역 시작 - PSRC+HMB 삽입 반제품)
  "A-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "B-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "C-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "F-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "G-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "H-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "K-X39": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },

  // X40열
  "A-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "B-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "C-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "K-X40": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },

  // X41열
  "A-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X41": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X42열 (FORM시공까지 진행 영역)
  "A-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X43열
  "A-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X44열
  "A-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X45열
  "A-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X46열
  "A-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X47열
  "A-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X48열
  "A-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X49열
  "A-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "B-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "C-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "D-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "E-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "I-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "J-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "K-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "pending", form: "pending", embed: "pending" },

  // X50열 (PSRC+HMB 삽입 반제품 영역)
  "A-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "B-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "C-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "F-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "G-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "H-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "K-X50": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },

  // X51열
  "A-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "B-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "C-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "F-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "G-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "H-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "K-X51": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },

  // X52~X57열 (우측 영역 - 대부분 설치 완료)
  "A-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "D-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "E-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "F-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "G-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "H-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "I-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "J-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X52": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  "A-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "active" },
  "D-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "active" },
  "E-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "active" },
  "F-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "active" },
  "G-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "active" },
  "H-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "active" },
  "I-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "active" },
  "J-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X53": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  "A-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "D-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "E-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "F-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "G-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "H-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "I-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "active", embed: "pending" },
  "J-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X54": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  "A-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "D-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "E-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "F-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "G-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "H-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "I-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "J-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X55": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  "A-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "D-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "E-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "F-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "G-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "H-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "I-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "J-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X56": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },

  "A-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "B-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "C-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "D-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "E-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "F-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "G-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "H-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "I-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "J-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
  "K-X57": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "installed", embed: "installed" },
};

// =====================================================
// 2절주 제작현황 데이터 (X42~X49, A~K) - 코어제외
// =====================================================

const PRODUCTION_STATUS_2JEOL = {
  // 2절주는 X42~X49 범위, 우측 이미지 기준
  // 이미지 분석: 대부분 HMB제작~대조립까지 완료, PSRC 삽입 진행 중
  
  // X42열 (2절주)
  "A-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X42": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },

  // X43열 (2절주)
  "A-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X43": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },

  // X44~X49열 (2절주) - 유사 패턴
  "A-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X44": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },

  "A-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X45": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },

  "A-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X46": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },

  "A-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X47": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },

  "A-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X48": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },

  "A-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "B-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "C-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "D-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "E-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "F-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "G-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "active", hmb_psrc: "pending", form: "pending", embed: "pending" },
  "H-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "I-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "active", form: "pending", embed: "pending" },
  "J-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
  "K-X49": { hmb_fab: "installed", pre_assem: "installed", main_assem: "installed", hmb_psrc: "installed", form: "pending", embed: "pending" },
};

// =====================================================
// 층별 통합 데이터
// =====================================================

const PRODUCTION_DATA_BY_FLOOR = {
  F1: PRODUCTION_STATUS_1JEOL,
  F2: PRODUCTION_STATUS_2JEOL,
};

// =====================================================
// Dashboard에 데이터 적용 함수
// =====================================================

/**
 * 특정 층의 프로덕션 현황 데이터를 Dashboard columns에 병합
 * @param {string} floorId - 층 ID ('F1' 또는 'F2')
 */
function applyProductionStatusByFloor(floorId) {
  const floorData = PRODUCTION_DATA_BY_FLOOR[floorId];
  if (!floorData) {
    console.error(`Invalid floor ID: ${floorId}`);
    return { success: false, error: `Invalid floor ID: ${floorId}` };
  }

  // Alpine.js 컨텍스트 확인
  if (typeof this.columns === 'undefined') {
    console.error('Dashboard columns not found. Call this from Alpine context.');
    return { success: false, error: 'Dashboard context not found' };
  }

  let updated = 0;
  for (const uid in floorData) {
    if (this.columns[uid]) {
      // stages 객체 병합
      this.columns[uid].stages = { ...floorData[uid] };
      // 층 정보 추가
      this.columns[uid].floor = floorId;
      updated++;
    }
  }

  const floorName = FLOORS[floorId]?.name || floorId;
  console.log(`[${floorName}] Production status applied: ${updated} columns updated`);
  this.showToast(`[${floorName}] ${updated}개 기둥 현황 업데이트 완료`, 'success');
  
  return { success: true, updated, floorId };
}

/**
 * 모든 층의 프로덕션 현황 데이터를 Dashboard columns에 병합
 */
function applyAllProductionStatus() {
  let totalUpdated = 0;
  
  for (const floorId in PRODUCTION_DATA_BY_FLOOR) {
    const result = applyProductionStatusByFloor.call(this, floorId);
    if (result.success) {
      totalUpdated += result.updated;
    }
  }
  
  console.log(`Total production status applied: ${totalUpdated} columns updated across all floors`);
  return { success: true, updated: totalUpdated };
}

/**
 * 층별 통계 계산
 * @param {string} floorId - 층 ID (선택사항, 없으면 전체)
 */
function getProductionStats(floorId) {
  const dataSource = floorId ? PRODUCTION_DATA_BY_FLOOR[floorId] : 
    { ...PRODUCTION_STATUS_1JEOL, ...PRODUCTION_STATUS_2JEOL };
  
  const stats = {
    floor: floorId || 'ALL',
    total: 0,
    hmb_fab: { installed: 0, active: 0, pending: 0 },
    pre_assem: { installed: 0, active: 0, pending: 0 },
    main_assem: { installed: 0, active: 0, pending: 0 },
    hmb_psrc: { installed: 0, active: 0, pending: 0 },
    form: { installed: 0, active: 0, pending: 0 },
    embed: { installed: 0, active: 0, pending: 0 },
  };

  for (const uid in dataSource) {
    stats.total++;
    const stages = dataSource[uid];
    for (const stage in stages) {
      const status = stages[stage];
      if (stats[stage] && stats[stage][status] !== undefined) {
        stats[stage][status]++;
      }
    }
  }

  return stats;
}

// =====================================================
// Dashboard 적용을 위한 인라인 스크립트 생성
// =====================================================

/**
 * Dashboard index.html에 삽입할 수 있는 인라인 코드 생성
 */
function generateDashboardInlineScript() {
  return `
// === Production Status Import (Auto-generated) ===
// 1절주 데이터: ${Object.keys(PRODUCTION_STATUS_1JEOL).length}개 기둥
// 2절주 데이터: ${Object.keys(PRODUCTION_STATUS_2JEOL).length}개 기둥

// Dashboard init() 함수 내에서 호출:
// this.loadProductionStatus('F1'); // 1절주
// this.loadProductionStatus('F2'); // 2절주
// this.loadProductionStatus('ALL'); // 전체
`;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    FLOORS,
    PRODUCTION_STATUS_1JEOL, 
    PRODUCTION_STATUS_2JEOL,
    PRODUCTION_DATA_BY_FLOOR,
    applyProductionStatusByFloor,
    applyAllProductionStatus,
    getProductionStats 
  };
}

