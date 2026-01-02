"""
Gemini File Search RAG System - 쿼리 인터페이스

업로드된 파일들을 대상으로 의미 기반 검색(Semantic Search)을 수행하고
관련 정보를 검색하는 인터페이스입니다.
"""

import os
import json
from typing import List, Dict, Optional
import google.generativeai as genai
from google.generativeai.types import content_types

# 설정
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY 환경 변수를 설정해주세요")

genai.configure(api_key=GEMINI_API_KEY)


class GeminiRAGQuery:
    """Gemini File Search를 활용한 RAG 쿼리 클래스"""

    def __init__(self, store_name: str = "P5_Project_RAG_Store",
                 model_name: str = "gemini-2.0-flash-exp"):
        """
        Args:
            store_name: File Search Store 이름
            model_name: 사용할 Gemini 모델
        """
        self.store_name = store_name
        self.model_name = model_name
        self.store = None
        self.model = None
        self._initialize()

    def _initialize(self) -> None:
        """Store와 Model 초기화"""
        # Store 찾기
        stores = genai.list_file_search_stores()
        for store in stores:
            if store.display_name == self.store_name:
                self.store = store
                print(f"✅ Store 연결: {self.store_name}")
                print(f"   Store ID: {store.name}")
                break

        if not self.store:
            raise ValueError(f"Store를 찾을 수 없습니다: {self.store_name}")

        # Model 초기화 (File Search Tool 활성화)
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            tools=[
                genai.protos.Tool(
                    file_search=genai.protos.FileSearchTool(
                        file_search_store_name=self.store.name
                    )
                )
            ]
        )
        print(f"✅ Model 초기화: {self.model_name}")

    def query(self, question: str,
              system_instruction: Optional[str] = None,
              max_output_tokens: int = 2048,
              temperature: float = 0.2) -> Dict:
        """
        RAG 쿼리 실행

        Args:
            question: 질문
            system_instruction: 시스템 지시사항 (페르소나 등)
            max_output_tokens: 최대 출력 토큰 수
            temperature: 생성 온도

        Returns:
            쿼리 결과 딕셔너리
        """
        try:
            print(f"\n🔍 질문: {question}")
            print("=" * 60)

            # 생성 설정
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_output_tokens
            )

            # 시스템 지시사항 설정
            if system_instruction:
                model_with_instruction = genai.GenerativeModel(
                    model_name=self.model_name,
                    system_instruction=system_instruction,
                    tools=[
                        genai.protos.Tool(
                            file_search=genai.protos.FileSearchTool(
                                file_search_store_name=self.store.name
                            )
                        )
                    ]
                )
                response = model_with_instruction.generate_content(
                    question,
                    generation_config=generation_config
                )
            else:
                response = self.model.generate_content(
                    question,
                    generation_config=generation_config
                )

            # 응답 파싱
            result = self._parse_response(response, question)
            self._print_result(result)

            return result

        except Exception as e:
            print(f"❌ 쿼리 실패: {e}")
            return {'error': str(e)}

    def _parse_response(self, response, question: str) -> Dict:
        """응답 파싱"""
        result = {
            'question': question,
            'answer': response.text,
            'grounding_metadata': None,
            'citations': []
        }

        # Grounding Metadata 추출
        if hasattr(response, 'grounding_metadata'):
            metadata = response.grounding_metadata
            result['grounding_metadata'] = {
                'grounding_support': str(metadata.grounding_support) if hasattr(metadata, 'grounding_support') else None
            }

            # 인용 정보 추출
            if hasattr(metadata, 'grounding_chunks'):
                for chunk in metadata.grounding_chunks:
                    citation = {
                        'text': chunk.grounding_chunk.text if hasattr(chunk, 'grounding_chunk') else None,
                        'source': chunk.grounding_chunk.source if hasattr(chunk, 'grounding_chunk') else None
                    }
                    result['citations'].append(citation)

        return result

    def _print_result(self, result: Dict) -> None:
        """결과 출력"""
        print(f"\n💡 답변:")
        print(result['answer'])

        if result['citations']:
            print(f"\n📚 인용 출처 ({len(result['citations'])}개):")
            for idx, citation in enumerate(result['citations'][:5], 1):  # 최대 5개만 표시
                print(f"\n[{idx}] {citation.get('source', 'Unknown')}")
                if citation.get('text'):
                    text_preview = citation['text'][:200] + "..." if len(citation['text']) > 200 else citation['text']
                    print(f"    {text_preview}")

    def batch_query(self, questions: List[str],
                    system_instruction: Optional[str] = None) -> List[Dict]:
        """
        여러 질문을 배치로 처리

        Args:
            questions: 질문 리스트
            system_instruction: 시스템 지시사항

        Returns:
            결과 리스트
        """
        results = []
        for idx, question in enumerate(questions, 1):
            print(f"\n{'='*60}")
            print(f"질문 {idx}/{len(questions)}")
            result = self.query(question, system_instruction)
            results.append(result)

        return results

    def save_results(self, results: List[Dict], output_file: str) -> None:
        """결과를 JSON 파일로 저장"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 결과 저장: {output_file}")


class P5ProjectRAG(GeminiRAGQuery):
    """P5 프로젝트 특화 RAG 인터페이스"""

    def __init__(self):
        # P5 프로젝트 전용 시스템 지시사항
        self.system_instruction = """
당신은 P5 복합동 구조 프로젝트의 전문 엔지니어입니다.

**전문 분야:**
- PSRC (프리캐스트 철근 콘크리트 기둥)
- HMB (하프 슬래브 보)
- PC (프리캐스트 콘크리트 거더)
- Steel (철골 코어)

**주요 임무:**
1. 프로젝트 문서에서 공법적 정보 검색
2. 설계 변경, Shop Drawing 이슈 분석
3. 접합부 간섭 및 리스크 평가
4. 이해관계자별 커뮤니케이션 내용 추적

**응답 원칙:**
- 항상 문서의 정확한 내용을 기반으로 답변
- 출처를 명확히 제시
- 공법적 리스크는 구체적으로 설명
- 불확실한 경우 명시적으로 언급
"""
        super().__init__(store_name="P5_Project_RAG_Store")

    def search_by_keyword(self, keyword: str) -> Dict:
        """키워드 기반 검색"""
        question = f"프로젝트 문서에서 '{keyword}'와 관련된 모든 내용을 찾아주세요. 관련 파일명과 구체적인 내용을 포함해주세요."
        return self.query(question, system_instruction=self.system_instruction)

    def search_by_stakeholder(self, stakeholder: str) -> Dict:
        """이해관계자별 검색"""
        question = f"{stakeholder}와 관련된 모든 커뮤니케이션, 이슈, 결정 사항을 요약해주세요."
        return self.query(question, system_instruction=self.system_instruction)

    def search_issues(self, issue_type: str = "접합부") -> Dict:
        """이슈 유형별 검색"""
        question = f"{issue_type} 관련 이슈를 모두 찾아서 긴급도 순으로 정리해주세요."
        return self.query(question, system_instruction=self.system_instruction)


def main():
    """메인 실행 함수"""
    import argparse

    parser = argparse.ArgumentParser(description='Gemini File Search RAG 시스템 - 쿼리')
    parser.add_argument('--store-name', type=str, default='P5_Project_RAG_Store',
                        help='File Search Store 이름')
    parser.add_argument('--model', type=str, default='gemini-2.0-flash-exp',
                        help='사용할 Gemini 모델')
    parser.add_argument('--question', type=str, help='질문')
    parser.add_argument('--batch', type=str, help='배치 질문 JSON 파일')
    parser.add_argument('--output', type=str, default='query_results.json',
                        help='결과 저장 파일')

    args = parser.parse_args()

    # P5 프로젝트 특화 RAG 사용
    rag = P5ProjectRAG()

    if args.question:
        # 단일 질문
        result = rag.query(args.question, system_instruction=rag.system_instruction)
        rag.save_results([result], args.output)

    elif args.batch:
        # 배치 질문
        with open(args.batch, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        results = rag.batch_query(questions, system_instruction=rag.system_instruction)
        rag.save_results(results, args.output)

    else:
        # 대화형 모드
        print("🤖 P5 프로젝트 RAG 시스템")
        print("=" * 60)
        print("종료하려면 'exit' 입력")
        print()

        while True:
            question = input("💬 질문: ").strip()
            if question.lower() in ['exit', 'quit', '종료']:
                break
            if question:
                rag.query(question, system_instruction=rag.system_instruction)


if __name__ == '__main__':
    main()
