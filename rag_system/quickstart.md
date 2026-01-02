# 🚀 빠른 시작 가이드

**5분 안에 RAG 시스템 구축하기**

---

## Step 1: 환경 설정 (1분)

### 1.1 API 키 발급
```bash
# 1. https://aistudio.google.com/app/apikey 접속
# 2. "Create API Key" 클릭
# 3. API 키 복사
```

### 1.2 환경 변수 설정
```bash
# Windows
setx GEMINI_API_KEY "your-api-key-here"

# 새 터미널 열기 (환경 변수 적용)
```

### 1.3 패키지 설치
```bash
cd D:\00.Work_AI_Tool\11.P5_PJT\rag_system
pip install -r requirements.txt
```

---

## Step 2: 파일 업로드 (2분)

```bash
# P5 프로젝트 폴더 업로드 (테스트: 10개 파일만)
python upload_files.py "D:\00.Work_AI_Tool\11.P5_PJT" --max-files 10
```

**예상 출력:**
```
📂 디렉토리 스캔 중: D:\00.Work_AI_Tool\11.P5_PJT
✅ 발견된 파일: 127개
📊 업로드할 파일 수 제한: 10개

🚀 업로드 시작 (10개 파일)
============================================================

[1/10] ⬆️  업로드 중: README.md (text/markdown)
   ✅ 업로드 성공

...

============================================================
📊 업로드 결과 요약
============================================================
✅ 성공: 10개
❌ 실패: 0개
📦 Store: P5_Project_RAG_Store

📄 결과 보고서 저장: upload_report.json
```

---

## Step 3: RAG 검색 (1분)

```bash
# 대화형 모드 실행
python query_rag.py
```

**질문 예시:**
```
💬 질문: 프로젝트의 주요 목표는?

🔍 질문: 프로젝트의 주요 목표는?

💡 답변:
P5 복합동 구조 통합 관리 시스템의 주요 목표는 다음과 같습니다:

1. Gmail에서 P5 프로젝트 관련 메일을 자동으로 필터링하여 수집
2. Gemini 1.5 Flash AI를 활용한 메일 내용 분석 및 리스크 추출
3. 분석 결과를 Google Sheet에 자동으로 DB화
4. PSRC/HMB 공법 특화 페르소나를 통한 엔지니어링 리스크 평가
...

📚 인용 출처 (2개):
[1] docs/techspec.md
    Goals: G1 - Gmail에서 P5 프로젝트 관련 메일을 자동으로 필터링하여 수집...

[2] README.md
    핵심 기능: 📧 Gmail 자동 필터링, 🤖 Gemini AI 분석...
```

---

## Step 4: NotebookLM 연동 (1분)

```bash
# 지식 베이스 생성
python export_for_notebooklm.py --mode knowledge --topics "프로젝트 목표" "기술 스택"
```

**출력:**
```
📚 지식 베이스 생성 중...
📚 주제 처리 중: 프로젝트 목표
📚 주제 처리 중: 기술 스택
✅ 지식 베이스 생성: notebooklm_exports/knowledge_base.md

생성된 파일 (2개):
  📄 notebooklm_exports/knowledge_base.md
  📄 notebooklm_exports/NotebookLM_사용_가이드.md

💡 다음 단계:
   1. NotebookLM (https://notebooklm.google.com) 접속
   2. 생성된 Markdown 파일 업로드
```

### NotebookLM에서 확인

1. https://notebooklm.google.com 접속
2. "새 노트북" 클릭
3. `notebooklm_exports/knowledge_base.md` 업로드
4. 질문 입력: "프로젝트의 주요 목표는?"

---

## 🎉 완료!

이제 다음을 할 수 있습니다:

✅ **프로젝트 문서 자동 검색**
```bash
python query_rag.py --question "PSRC 공법이란?"
```

✅ **배치 질문 처리**
```bash
# questions.json 생성
echo ["질문1", "질문2", "질문3"] > questions.json

# 배치 실행
python query_rag.py --batch questions.json
```

✅ **NotebookLM에서 AI 노트 작성**
- 자동 요약
- 질의응답
- 오디오 개요 생성

---

## 다음 단계

### 전체 프로젝트 업로드
```bash
# 모든 파일 업로드 (제한 해제)
python upload_files.py "D:\00.Work_AI_Tool\11.P5_PJT"
```

### 전문 검색 활용
```python
from query_rag import P5ProjectRAG

rag = P5ProjectRAG()

# 키워드 검색
rag.search_by_keyword("PSRC")

# 이해관계자 검색
rag.search_by_stakeholder("삼우")

# 이슈 검색
rag.search_issues("접합부")
```

### 자동화 스크립트 작성
```bash
# daily_update.sh
python upload_files.py "D:\00.Work_AI_Tool\11.P5_PJT"
python query_rag.py --batch daily_questions.json
python export_for_notebooklm.py --mode both
```

---

## 문제 발생 시

### API 키 오류
```bash
# 환경 변수 확인
echo %GEMINI_API_KEY%  # Windows
# echo $GEMINI_API_KEY  # Linux/Mac

# 재설정
setx GEMINI_API_KEY "your-api-key-here"
```

### 업로드 실패
```bash
# 로그 확인
type upload_report.json

# 실패한 파일만 재업로드
python upload_files.py "D:\path\to\failed\files"
```

### 검색 결과 없음
```bash
# Store 확인
python -c "import google.generativeai as genai; genai.configure(api_key='YOUR_KEY'); print(list(genai.list_file_search_stores()))"

# Store 재생성
python upload_files.py "D:\00.Work_AI_Tool\11.P5_PJT" --store-name "New_Store"
```

---

**도움말:** `README.md`의 "문제 해결" 섹션 참조
