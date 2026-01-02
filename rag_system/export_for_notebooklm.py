"""
NotebookLM 통합 스크립트

Gemini File Search RAG 시스템의 검색 결과를 NotebookLM에서
읽을 수 있는 형식으로 변환합니다.

NotebookLM은 다음 형식을 지원합니다:
- PDF, DOCX, TXT, Markdown
- Google Docs, Google Slides
- 웹 URL
- 복사/붙여넣기 텍스트
"""

import os
import json
from typing import List, Dict
from datetime import datetime
import pathlib
from query_rag import P5ProjectRAG


class NotebookLMExporter:
    """NotebookLM용 데이터 내보내기 클래스"""

    def __init__(self, output_dir: str = "notebooklm_exports"):
        """
        Args:
            output_dir: 내보내기 파일 저장 디렉토리
        """
        self.output_dir = pathlib.Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def export_rag_results_to_markdown(self,
                                       results: List[Dict],
                                       filename: str = "rag_results.md") -> str:
        """
        RAG 검색 결과를 Markdown 형식으로 내보내기

        Args:
            results: RAG 쿼리 결과 리스트
            filename: 출력 파일명

        Returns:
            생성된 파일 경로
        """
        output_path = self.output_dir / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            # 헤더
            f.write(f"# P5 프로젝트 RAG 검색 결과\n\n")
            f.write(f"**생성 시간:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**총 질문 수:** {len(results)}\n\n")
            f.write("---\n\n")

            # 각 질문과 답변
            for idx, result in enumerate(results, 1):
                f.write(f"## {idx}. {result.get('question', 'Unknown Question')}\n\n")

                # 답변
                f.write("### 답변\n\n")
                f.write(f"{result.get('answer', 'No answer')}\n\n")

                # 인용 출처
                citations = result.get('citations', [])
                if citations:
                    f.write("### 출처 및 근거\n\n")
                    for cite_idx, citation in enumerate(citations, 1):
                        source = citation.get('source', 'Unknown')
                        text = citation.get('text', '')

                        f.write(f"**[{cite_idx}] {source}**\n\n")
                        if text:
                            f.write(f"> {text}\n\n")

                f.write("---\n\n")

        print(f"✅ Markdown 파일 생성: {output_path}")
        return str(output_path)

    def export_knowledge_base_to_markdown(self,
                                         topics: List[str],
                                         rag: P5ProjectRAG,
                                         filename: str = "knowledge_base.md") -> str:
        """
        주제별 지식 베이스를 Markdown으로 내보내기

        Args:
            topics: 주제 리스트
            rag: RAG 쿼리 인스턴스
            filename: 출력 파일명

        Returns:
            생성된 파일 경로
        """
        output_path = self.output_dir / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            # 헤더
            f.write(f"# P5 복합동 구조 프로젝트 지식 베이스\n\n")
            f.write(f"**생성 시간:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## 목차\n\n")
            for idx, topic in enumerate(topics, 1):
                f.write(f"{idx}. [{topic}](#{topic.replace(' ', '-').lower()})\n")
            f.write("\n---\n\n")

            # 각 주제별 내용
            for topic in topics:
                print(f"\n📚 주제 처리 중: {topic}")
                f.write(f"## {topic}\n\n")

                # RAG 검색
                result = rag.search_by_keyword(topic)

                if 'error' not in result:
                    f.write(f"{result.get('answer', 'No content')}\n\n")

                    # 출처
                    citations = result.get('citations', [])
                    if citations:
                        f.write("### 참고 문서\n\n")
                        for cite_idx, citation in enumerate(citations, 1):
                            source = citation.get('source', 'Unknown')
                            f.write(f"- {source}\n")
                        f.write("\n")

                else:
                    f.write(f"⚠️ 정보를 찾을 수 없습니다: {result['error']}\n\n")

                f.write("---\n\n")

        print(f"✅ 지식 베이스 생성: {output_path}")
        return str(output_path)

    def create_notebooklm_guide(self, markdown_files: List[str]) -> str:
        """
        NotebookLM 사용 가이드 생성

        Args:
            markdown_files: 생성된 Markdown 파일 경로 리스트

        Returns:
            가이드 파일 경로
        """
        guide_path = self.output_dir / "NotebookLM_사용_가이드.md"

        with open(guide_path, 'w', encoding='utf-8') as f:
            f.write("# NotebookLM 사용 가이드\n\n")
            f.write("## 1. NotebookLM에 데이터 가져오기\n\n")
            f.write("### 방법 1: Markdown 파일 업로드\n\n")
            f.write("1. NotebookLM (https://notebooklm.google.com) 접속\n")
            f.write("2. '새 노트북' 클릭\n")
            f.write("3. '소스 추가' 클릭\n")
            f.write("4. 다음 파일을 업로드:\n\n")

            for file_path in markdown_files:
                f.write(f"   - `{file_path}`\n")

            f.write("\n### 방법 2: 텍스트 복사/붙여넣기\n\n")
            f.write("1. Markdown 파일을 텍스트 에디터로 열기\n")
            f.write("2. 전체 내용 복사 (Ctrl+A, Ctrl+C)\n")
            f.write("3. NotebookLM에서 '소스 추가' → '텍스트' 선택\n")
            f.write("4. 복사한 내용 붙여넣기\n\n")

            f.write("## 2. NotebookLM에서 할 수 있는 작업\n\n")
            f.write("### ✅ 자동 요약\n")
            f.write("- 업로드된 문서의 핵심 내용을 자동으로 요약\n")
            f.write("- 주제별, 섹션별 요약 제공\n\n")

            f.write("### ✅ 질의응답\n")
            f.write("- 문서 내용에 대한 질문에 AI가 답변\n")
            f.write("- 출처 자동 표시 (인용 번호 클릭 시 원문 확인)\n\n")

            f.write("### ✅ 노트 작성\n")
            f.write("- 문서 기반 개인 노트 작성\n")
            f.write("- AI 제안 받기\n\n")

            f.write("### ✅ 오디오 개요 생성 (Audio Overview)\n")
            f.write("- 문서를 팟캐스트 형식의 오디오로 변환\n")
            f.write("- 두 사람이 대화하는 형식으로 내용 설명\n\n")

            f.write("## 3. P5 프로젝트 활용 예시\n\n")

            f.write("### 질문 예시:\n")
            f.write("- \"PSRC-PC 접합부 관련 주요 이슈는 무엇인가요?\"\n")
            f.write("- \"삼우로부터 받은 설계 변경 사항을 요약해주세요\"\n")
            f.write("- \"Shop Drawing 관련 Critical 이슈를 모두 찾아주세요\"\n")
            f.write("- \"변단면 구간에서 발생한 문제점들을 정리해주세요\"\n\n")

            f.write("## 4. 업데이트 방법\n\n")
            f.write("RAG 시스템에서 새로운 데이터를 수집한 후:\n\n")
            f.write("```bash\n")
            f.write("# 1. 새로운 검색 수행\n")
            f.write("python query_rag.py --batch questions.json --output new_results.json\n\n")
            f.write("# 2. NotebookLM용 Markdown 생성\n")
            f.write("python export_for_notebooklm.py --input new_results.json\n\n")
            f.write("# 3. NotebookLM에서 소스 업데이트\n")
            f.write("# (기존 소스 삭제 후 새 파일 업로드)\n")
            f.write("```\n\n")

            f.write("## 5. 팁 & 주의사항\n\n")
            f.write("- **파일 크기**: NotebookLM은 소스당 최대 500,000단어 지원\n")
            f.write("- **소스 개수**: 노트북당 최대 50개 소스\n")
            f.write("- **언어**: 한국어 완벽 지원\n")
            f.write("- **공유**: 다른 사용자와 노트북 공유 가능 (Google 계정 필요)\n\n")

        print(f"✅ 사용 가이드 생성: {guide_path}")
        return str(guide_path)


def main():
    """메인 실행 함수"""
    import argparse

    parser = argparse.ArgumentParser(description='NotebookLM용 데이터 내보내기')
    parser.add_argument('--mode', type=str, choices=['results', 'knowledge', 'both'],
                        default='both', help='내보내기 모드')
    parser.add_argument('--input', type=str, help='RAG 결과 JSON 파일 (results 모드)')
    parser.add_argument('--topics', type=str, nargs='+',
                        default=['PSRC', 'HMB', 'PC', '접합부', 'Shop Drawing', '설계 변경'],
                        help='지식 베이스 주제 (knowledge 모드)')
    parser.add_argument('--output-dir', type=str, default='notebooklm_exports',
                        help='출력 디렉토리')

    args = parser.parse_args()

    exporter = NotebookLMExporter(output_dir=args.output_dir)
    created_files = []

    print("🚀 NotebookLM 데이터 내보내기 시작")
    print("=" * 60)

    # Results 모드
    if args.mode in ['results', 'both'] and args.input:
        print("\n📄 RAG 결과 변환 중...")
        with open(args.input, 'r', encoding='utf-8') as f:
            results = json.load(f)

        md_file = exporter.export_rag_results_to_markdown(results)
        created_files.append(md_file)

    # Knowledge 모드
    if args.mode in ['knowledge', 'both']:
        print("\n📚 지식 베이스 생성 중...")
        rag = P5ProjectRAG()
        kb_file = exporter.export_knowledge_base_to_markdown(args.topics, rag)
        created_files.append(kb_file)

    # 사용 가이드 생성
    print("\n📖 사용 가이드 생성 중...")
    guide_file = exporter.create_notebooklm_guide(created_files)

    # 요약
    print("\n" + "=" * 60)
    print("✅ 내보내기 완료")
    print("=" * 60)
    print(f"\n생성된 파일 ({len(created_files) + 1}개):")
    for file_path in created_files + [guide_file]:
        print(f"  📄 {file_path}")

    print(f"\n📂 출력 디렉토리: {args.output_dir}")
    print("\n💡 다음 단계:")
    print("   1. NotebookLM (https://notebooklm.google.com) 접속")
    print("   2. 생성된 Markdown 파일 업로드")
    print(f"   3. '{guide_file}' 참조하여 활용")


if __name__ == '__main__':
    main()
