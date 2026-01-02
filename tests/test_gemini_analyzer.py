#!/usr/bin/env python3
"""
P5 Gmail-Gemini 분석 시스템 테스트
Google Apps Script 배포 전 로컬 테스트용

Usage:
    python test_gemini_analyzer.py

설정:
    1. .env.example을 .env로 복사
    2. .env 파일에 GEMINI_API_KEY 입력
    3. 테스트 실행
"""

import os
import sys
import json
import requests
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

# Load .env file
def load_dotenv():
    """Load environment variables from .env file"""
    # Find .env file (check current dir and parent dir)
    env_paths = [
        Path(__file__).parent.parent / ".env",  # Project root
        Path(__file__).parent / ".env",          # Tests folder
        Path.cwd() / ".env",                     # Current working dir
    ]

    env_file = None
    for path in env_paths:
        if path.exists():
            env_file = path
            break

    if not env_file:
        print("WARNING: .env 파일을 찾을 수 없습니다.")
        print("  .env.example을 .env로 복사하고 API 키를 입력하세요.")
        return False

    print(f"  .env 파일 로드: {env_file}")

    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value and not value.startswith('your_'):
                    os.environ[key] = value

    return True

# Load .env at module import
load_dotenv()

# ============================================================
# Configuration
# ============================================================

CONFIG = {
    "GEMINI_MODEL": "gemini-2.0-flash",
    "GEMINI_ENDPOINT": "https://generativelanguage.googleapis.com/v1beta/models/",
    "GEMINI_TEMPERATURE": 0.2,
    "GEMINI_MAX_TOKENS": 2048,
}

PERSONA_PROMPT = """
# 역할 설정
당신은 **PSRC(프리캐스트 철근 콘크리트 기둥)** 및 **HMB(하프 슬래브 보)** 공법의
총괄 엔지니어이자, 대형 반도체 FAB 프로젝트 구조 설계를 검토하는 전문가입니다.

# 분석 목표
다음 메일을 분석하여:
1. 공법적 리스크를 식별
2. 접합부 간섭 이슈를 추출
3. 설계 변경 사항을 파악
4. 이해관계자 간 책임 경계를 명확히

# 발생원 추론 규칙
| 이메일 패턴 | 발생원 |
|------------|--------|
| @samoo.com | 삼우(원설계) |
| @samsung.com | ENA(시공/PM) |
| vickysong1@naver.com | 이앤디몰(PC설계) |
| dhkim2630@naver.com | 이앤디몰(PC설계) |
| @senkuzo.com | 센코어(전환설계) |
| @senvex.net | 센코어(전환설계) |

# 긴급도 평가 기준
| 조건 | 긴급도 |
|------|--------|
| Shop Drawing 제작 완료 후 변경 요청 | **Showstopper** |
| 0.75fpu 인장 강도 오류 발견 | **Showstopper** |
| 변단면 상세 설계 오류 | **Critical** |
| 접합부 간섭 우려 | **High** |
| 설계 문의/질의 | **Medium** |
| 일반 행정 연락 | **Low** |

# 공법 구분 카테고리
- PSRC-PC접합
- PSRC-Steel접합
- HMB-PC접합
- 변단면 이슈
- 하중 검토
- 접합부 간섭
- 기타

# 출력 형식 (JSON)
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 출력:
{
  "발생원": "삼우(원설계)",
  "공법구분": "PSRC-PC접합",
  "긴급도": "Critical",
  "본문요약": "메일 내용을 2-3문장으로 요약",
  "AI분석": "공법적 관점에서 분석한 내용",
  "추천조치": "권장 후속 조치 사항",
  "키워드": ["PSRC", "접합부", "Shop Drawing"]
}
"""

# ============================================================
# Sample Test Emails
# ============================================================

SAMPLE_EMAILS = [
    {
        "id": "test_001",
        "from": "engineer@samoo.com",
        "to": "pm@samsung.com",
        "cc": "designer@senkuzo.com",
        "subject": "[P5 복합동] PSRC 기둥-PC보 접합부 간섭 검토 요청",
        "body": """
        안녕하세요, 삼우종합건축 구조팀입니다.

        P5 복합동 X23~X30열 구간의 PSRC 기둥과 PC보 접합부에서
        철근 간섭이 우려되어 검토 요청드립니다.

        현재 상황:
        - 기둥 주근 D32 8EA 배치
        - 보 주근 D25 6EA 배치
        - 접합부 내 철근 밀집으로 콘크리트 타설 우려

        검토 요청사항:
        1. 접합부 철근 간섭 해소 방안
        2. Shop Drawing 수정 필요 여부
        3. 대안 상세 검토

        회신 부탁드립니다.
        감사합니다.
        """,
        "date": datetime.now().isoformat(),
    },
    {
        "id": "test_002",
        "from": "vickysong1@naver.com",
        "to": "structural@samsung.com",
        "cc": "qc@samoo.com",
        "subject": "[긴급] P5 PC보 Shop Drawing 변경 요청 - 설계오류 발견",
        "body": """
        긴급 연락드립니다.

        P5 복합동 Zone B 구간 PC보 Shop Drawing 검토 중
        심각한 설계 오류를 발견하였습니다.

        문제사항:
        - HMB-350 접합부 상세에서 0.75fpu 인장력 계산 오류
        - 현재 도면: 1,200kN → 정확한 값: 1,850kN
        - 이미 제작 완료된 PC 부재 10개에 영향

        긴급 조치 필요:
        1. 제작 중단 요청
        2. 설계 검토회의 소집
        3. 보강 방안 검토

        금일 중 회신 부탁드립니다.
        """,
        "date": datetime.now().isoformat(),
    },
    {
        "id": "test_003",
        "from": "pm@samsung.com",
        "to": "all-team@samsung.com",
        "cc": "",
        "subject": "P5 복합동 주간 진행현황 공유",
        "body": """
        안녕하세요, P5 프로젝트 PM입니다.

        금주 진행현황 공유드립니다.

        1. Zone A 골조 공사: 80% 완료
        2. Zone B 설계 검토: 진행중
        3. Zone C 착공 준비: 자재 발주 완료

        다음 주 계획:
        - Zone A 마감 공사 착수
        - Zone B 설계 확정
        - Zone C 터파기 시작

        문의사항 있으시면 연락 주세요.
        감사합니다.
        """,
        "date": datetime.now().isoformat(),
    },
]


# ============================================================
# Gemini API Functions
# ============================================================

def get_api_key() -> str:
    """Get Gemini API key from environment"""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ValueError(
            "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.\n"
            "설정 방법:\n"
            "  Windows: set GEMINI_API_KEY=your_api_key\n"
            "  Linux/Mac: export GEMINI_API_KEY=your_api_key"
        )
    return key


def call_gemini_api(prompt: str) -> Dict[str, Any]:
    """Call Gemini API"""
    api_key = get_api_key()
    url = f"{CONFIG['GEMINI_ENDPOINT']}{CONFIG['GEMINI_MODEL']}:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": CONFIG["GEMINI_TEMPERATURE"],
            "maxOutputTokens": CONFIG["GEMINI_MAX_TOKENS"],
            "responseMimeType": "application/json",
        },
    }

    response = requests.post(url, json=payload, timeout=30)

    if response.status_code != 200:
        raise Exception(f"Gemini API 오류 ({response.status_code}): {response.text}")

    return response.json()


def extract_response_text(response: Dict) -> Optional[str]:
    """Extract text from API response"""
    try:
        return response["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        print(f"응답 텍스트 추출 실패: {e}")
        return None


def clean_json_response(text: str) -> str:
    """Clean JSON response (remove code blocks)"""
    if not text:
        return ""

    cleaned = text.strip()

    # Remove ```json ... ``` pattern
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return cleaned.strip()


def parse_analysis_response(response_text: str) -> Optional[Dict]:
    """Parse and validate analysis response"""
    cleaned = clean_json_response(response_text)

    try:
        parsed = json.loads(cleaned)

        # Validate required fields
        required_fields = ["발생원", "공법구분", "긴급도", "본문요약", "AI분석", "추천조치", "키워드"]

        for field in required_fields:
            if field not in parsed:
                raise ValueError(f"필수 필드 누락: {field}")

        # Ensure keywords is a list
        if not isinstance(parsed["키워드"], list):
            parsed["키워드"] = []

        return parsed

    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}")
        print(f"원본 응답: {response_text[:500]}...")
        return None
    except ValueError as e:
        print(f"검증 오류: {e}")
        return None


def build_analysis_prompt(email: Dict) -> str:
    """Build analysis prompt for email"""
    return f"""{PERSONA_PROMPT}

---
## 분석 대상 메일

**발신자**: {email['from']}
**수신자**: {email.get('to', '(없음)')}
**참조**: {email.get('cc', '없음')}
**일시**: {email['date']}
**제목**: {email['subject']}

**본문**:
{email['body']}
"""


def analyze_email(email: Dict) -> Dict:
    """Analyze a single email"""
    print(f"\n  분석 중: {email['subject'][:50]}...")

    prompt = build_analysis_prompt(email)
    response = call_gemini_api(prompt)
    text = extract_response_text(response)

    if not text:
        return get_default_analysis(email)

    analysis = parse_analysis_response(text)

    if not analysis:
        return get_default_analysis(email)

    return analysis


def get_default_analysis(email: Dict) -> Dict:
    """Return default analysis when API fails"""
    return {
        "발생원": "미분류",
        "공법구분": "기타",
        "긴급도": "Medium",
        "본문요약": email["subject"],
        "AI분석": "AI 분석 실패 - 수동 검토 필요",
        "추천조치": "담당자 수동 확인 필요",
        "키워드": [],
    }


# ============================================================
# Test Functions
# ============================================================

def test_api_connection():
    """Test Gemini API connection"""
    print("\n" + "=" * 60)
    print("1. Gemini API 연결 테스트")
    print("=" * 60)

    try:
        response = call_gemini_api('안녕하세요. "OK"라고만 응답하세요.')
        text = extract_response_text(response)

        print(f"  Status: SUCCESS")
        print(f"  Response: {text}")
        return True

    except Exception as e:
        print(f"  Status: FAILED")
        print(f"  Error: {e}")
        return False


def test_json_parsing():
    """Test JSON parsing"""
    print("\n" + "=" * 60)
    print("2. JSON 파싱 테스트")
    print("=" * 60)

    # Valid JSON
    valid_json = """{
        "발생원": "삼우(원설계)",
        "공법구분": "PSRC-PC접합",
        "긴급도": "High",
        "본문요약": "테스트 요약",
        "AI분석": "테스트 분석",
        "추천조치": "테스트 조치",
        "키워드": ["PSRC", "테스트"]
    }"""

    result1 = parse_analysis_response(valid_json)
    print(f"  [정상 JSON] {'SUCCESS' if result1 else 'FAILED'}")

    # With code block
    with_code_block = "```json\n" + valid_json + "\n```"
    result2 = parse_analysis_response(with_code_block)
    print(f"  [코드 블록 포함] {'SUCCESS' if result2 else 'FAILED'}")

    # Missing field
    missing_field = '{"발생원": "삼우"}'
    result3 = parse_analysis_response(missing_field)
    print(f"  [필드 누락] {'SUCCESS (예상: FAILED)' if result3 else 'FAILED (예상대로)'}")

    return result1 is not None and result2 is not None


def test_email_analysis():
    """Test email analysis with sample emails"""
    print("\n" + "=" * 60)
    print("3. 샘플 메일 분석 테스트")
    print("=" * 60)

    results = []

    for i, email in enumerate(SAMPLE_EMAILS, 1):
        print(f"\n[{i}/{len(SAMPLE_EMAILS)}] 메일: {email['subject'][:40]}...")

        try:
            analysis = analyze_email(email)

            print(f"  발생원: {analysis['발생원']}")
            print(f"  공법구분: {analysis['공법구분']}")
            print(f"  긴급도: {analysis['긴급도']}")
            print(f"  본문요약: {analysis['본문요약'][:50]}...")
            print(f"  키워드: {', '.join(analysis['키워드'][:5])}")

            results.append({"email_id": email["id"], "status": "success", "analysis": analysis})

        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"email_id": email["id"], "status": "failed", "error": str(e)})

    return results


def print_summary(results):
    """Print test summary"""
    print("\n" + "=" * 60)
    print("테스트 결과 요약")
    print("=" * 60)

    success = sum(1 for r in results if r["status"] == "success")
    failed = len(results) - success

    print(f"  총 {len(results)}건 분석")
    print(f"  성공: {success}건")
    print(f"  실패: {failed}건")

    if success > 0:
        print("\n[분석 결과 상세]")
        for r in results:
            if r["status"] == "success":
                a = r["analysis"]
                print(f"  - {r['email_id']}: {a['긴급도']} | {a['공법구분']} | {a['발생원']}")


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 60)
    print("  P5 Gmail-Gemini 분석 시스템 테스트")
    print("=" * 60)

    # Check API key
    try:
        api_key = get_api_key()
        print(f"  API Key: {api_key[:10]}...{api_key[-4:]}")
    except ValueError as e:
        print(f"\nERROR: {e}")
        return

    # Test 1: API Connection
    if not test_api_connection():
        print("\nAPI 연결 실패. 테스트를 중단합니다.")
        return

    # Test 2: JSON Parsing
    test_json_parsing()

    # Test 3: Email Analysis
    results = test_email_analysis()

    # Summary
    print_summary(results)

    print("\n" + "=" * 60)
    print("테스트 완료")
    print("=" * 60)


if __name__ == "__main__":
    main()
