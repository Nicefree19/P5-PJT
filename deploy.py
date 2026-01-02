#!/usr/bin/env python3
"""
P5 Google Apps Script 배포 도우미
=================================
Google Apps Script 프로젝트에 코드를 배포하기 위한 도우미 스크립트

사용법:
    python deploy.py
"""

import os
import webbrowser
import time

# 프로젝트 경로
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(PROJECT_DIR, "src")
DEPLOY_DIR = os.path.join(PROJECT_DIR, "deploy")

# .env 파일 로드
def load_env():
    """Load environment variables from .env file"""
    env_path = os.path.join(PROJECT_DIR, ".env")
    env_vars = {}

    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()

    return env_vars

# GS 파일 순서 (의존성 순서)
GS_FILE_ORDER = [
    "Config.gs",
    "Utils.gs",
    "GeminiAnalyzer.gs",
    "GmailFilter.gs",
    "SheetWriter.gs",
    "Code.gs",
    "Tests.gs"
]

def consolidate_gs_files():
    """모든 .gs 파일을 하나의 파일로 통합"""

    # deploy 디렉토리 생성
    os.makedirs(DEPLOY_DIR, exist_ok=True)

    consolidated = []
    consolidated.append("// " + "=" * 60)
    consolidated.append("// P5 복합동 메일 분석 시스템 - 통합 배포 파일")
    consolidated.append("// " + "=" * 60)
    consolidated.append("// 생성일: " + time.strftime("%Y-%m-%d %H:%M:%S"))
    consolidated.append("// ")
    consolidated.append("// 이 파일은 배포 편의를 위해 자동 생성되었습니다.")
    consolidated.append("// 개별 파일 수정 시 다시 deploy.py를 실행하세요.")
    consolidated.append("// " + "=" * 60)
    consolidated.append("")

    for filename in GS_FILE_ORDER:
        filepath = os.path.join(SRC_DIR, filename)
        if os.path.exists(filepath):
            consolidated.append("")
            consolidated.append("// " + "=" * 60)
            consolidated.append(f"// FILE: {filename}")
            consolidated.append("// " + "=" * 60)
            consolidated.append("")

            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                consolidated.append(content)

    # 통합 파일 저장
    output_path = os.path.join(DEPLOY_DIR, "P5_MailAnalyzer_Combined.gs")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(consolidated))

    print(f"  통합 파일 생성: {output_path}")
    return output_path

def copy_individual_files():
    """개별 .gs 파일을 deploy 폴더에 복사"""
    os.makedirs(DEPLOY_DIR, exist_ok=True)

    copied = []
    for filename in GS_FILE_ORDER:
        src_path = os.path.join(SRC_DIR, filename)
        dst_path = os.path.join(DEPLOY_DIR, filename)

        if os.path.exists(src_path):
            with open(src_path, 'r', encoding='utf-8') as f:
                content = f.read()
            with open(dst_path, 'w', encoding='utf-8') as f:
                f.write(content)
            copied.append(filename)

    print(f"  개별 파일 복사: {len(copied)}개")
    return copied

def main():
    print("""
============================================================
      P5 Google Apps Script 배포 도우미
============================================================
""")

    # 환경 변수 로드
    env = load_env()
    sheet_id = env.get('SHEET_ID', '')
    api_key = env.get('GEMINI_API_KEY', '')

    if not sheet_id:
        print("[!] 경고: .env 파일에 SHEET_ID가 설정되지 않았습니다.")
        sheet_id = input("Google Sheet ID를 입력하세요: ").strip()

    if not api_key:
        print("[!] 경고: .env 파일에 GEMINI_API_KEY가 설정되지 않았습니다.")

    print("\n[1/4] 배포 파일 준비 중...")
    consolidate_gs_files()
    copy_individual_files()

    print("\n[2/4] Google Sheet 열기...")
    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
    print(f"  URL: {sheet_url}")

    # 브라우저에서 시트 열기
    try:
        webbrowser.open(sheet_url)
        print("  브라우저에서 시트를 열었습니다.")
    except Exception as e:
        print(f"  브라우저 열기 실패: {e}")
        print(f"  위 URL을 직접 브라우저에 붙여넣으세요.")

    print("""
[3/4] Apps Script 에디터 열기
============================================================

다음 단계를 따라하세요:

  1. Google Sheet 상단 메뉴에서:
     [확장 프로그램] > [Apps Script] 클릭

  2. Apps Script 에디터가 열리면:
     - 기존 코드 전체 삭제
     - deploy/P5_MailAnalyzer_Combined.gs 내용 복사하여 붙여넣기

     또는 개별 파일로 추가:
     - [+] 버튼 > [스크립트] 선택
     - 각 .gs 파일 내용을 개별 스크립트로 추가

============================================================
""")

    input("Apps Script 에디터에 코드를 붙여넣은 후 Enter를 누르세요...")

    print(f"""
[4/4] Script Properties 설정
============================================================

Apps Script 에디터에서:

  1. 왼쪽 메뉴 [프로젝트 설정] (톱니바퀴 아이콘) 클릭

  2. 하단 [스크립트 속성] 섹션에서 [스크립트 속성 추가] 클릭

  3. 다음 속성들을 추가:

     +------------------+----------------------------------------+
     | 속성             | 값                                     |
     +------------------+----------------------------------------+
     | GEMINI_API_KEY   | {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '****'} |
     | SHEET_ID         | {sheet_id[:20]}... |
     | DEBUG_MODE       | true                                   |
     +------------------+----------------------------------------+

  4. [저장] 버튼 클릭

============================================================
""")

    input("Script Properties 설정 완료 후 Enter를 누르세요...")

    print("""
[완료] 초기화 함수 실행
============================================================

Apps Script 에디터에서:

  1. 상단 드롭다운에서 함수 선택:
     [initializeDashboardSheets] 선택

  2. [실행] 버튼 클릭

  3. 권한 요청 시:
     - [권한 검토] 클릭
     - Google 계정 선택
     - [고급] > [프로젝트명(안전하지 않음)으로 이동]
     - [허용] 클릭

  4. 실행 로그 확인:
     - [실행 로그 보기] 클릭
     - "Dashboard 시트 초기화 완료" 메시지 확인

============================================================

추가 테스트 함수:
  - testGeminiConnection_  : Gemini API 연결 테스트
  - testSingleEmail_       : 단일 메일 분석 테스트
  - runDashboardTest       : 전체 시스템 테스트

============================================================
""")

    print("\n배포 프로세스 완료!")
    print(f"\n배포 파일 위치: {DEPLOY_DIR}")
    print("""
다음 단계:
  1. initializeDashboardSheets() 실행하여 시트 초기화
  2. testGeminiConnection_() 실행하여 API 연결 확인
  3. 실제 메일 분석 테스트

문제 발생 시:
  - docs/DEPLOYMENT.md 참조
  - 실행 로그에서 오류 메시지 확인
""")

if __name__ == "__main__":
    main()
