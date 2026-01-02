"""
Gemini File Search RAG System - 파일 업로드 스크립트

이 스크립트는 프로젝트 폴더의 모든 파일을 Gemini File Search Store에 업로드하여
RAG 시스템을 구축합니다.

지원 파일 형식: PDF, Office 문서, 코드 파일, Markdown, JSON, SQL 등 120+ 형식
"""

import os
import pathlib
import mimetypes
from typing import List, Dict, Optional
import google.generativeai as genai
from google.generativeai.types import file_types
import time
import json
from datetime import datetime

# 설정
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY 환경 변수를 설정해주세요")

genai.configure(api_key=GEMINI_API_KEY)

# 지원 파일 확장자 (Gemini File Search API 지원 형식)
SUPPORTED_EXTENSIONS = {
    # 문서
    '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
    '.txt', '.md', '.markdown', '.rtf', '.odt', '.ods', '.odp',

    # 코드
    '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h',
    '.cs', '.rb', '.go', '.rs', '.php', '.swift', '.kt', '.scala',
    '.r', '.m', '.sh', '.bash', '.ps1', '.bat',

    # 데이터
    '.json', '.xml', '.yaml', '.yml', '.csv', '.tsv', '.sql',

    # 마크업
    '.html', '.htm', '.css', '.scss', '.sass', '.less',

    # 설정
    '.toml', '.ini', '.conf', '.config', '.env',

    # 기타
    '.log', '.tex', '.bib'
}

# 제외할 디렉토리
EXCLUDE_DIRS = {
    'node_modules', '.git', '__pycache__', 'venv', 'env',
    '.venv', 'dist', 'build', '.next', '.cache', 'coverage'
}

class GeminiRAGUploader:
    """Gemini File Search Store에 파일을 업로드하는 클래스"""

    def __init__(self, store_name: str = "P5_Project_RAG_Store"):
        """
        Args:
            store_name: File Search Store 이름
        """
        self.store_name = store_name
        self.store = None
        self.uploaded_files = []
        self.failed_files = []

    def create_or_get_store(self) -> None:
        """File Search Store 생성 또는 기존 Store 가져오기"""
        try:
            # 기존 Store 목록 확인
            stores = genai.list_file_search_stores()

            for store in stores:
                if store.display_name == self.store_name:
                    self.store = store
                    print(f"✅ 기존 Store 발견: {self.store_name}")
                    print(f"   Store ID: {store.name}")
                    return

            # 새 Store 생성
            print(f"📦 새 File Search Store 생성 중: {self.store_name}")
            self.store = genai.create_file_search_store(
                config={'display_name': self.store_name}
            )
            print(f"✅ Store 생성 완료: {self.store.name}")

        except Exception as e:
            print(f"❌ Store 생성/조회 실패: {e}")
            raise

    def scan_directory(self, directory: str) -> List[pathlib.Path]:
        """
        디렉토리를 스캔하여 업로드 가능한 파일 목록 반환

        Args:
            directory: 스캔할 디렉토리 경로

        Returns:
            업로드 가능한 파일 경로 리스트
        """
        files_to_upload = []
        directory_path = pathlib.Path(directory).resolve()

        print(f"\n📂 디렉토리 스캔 중: {directory_path}")

        for file_path in directory_path.rglob('*'):
            # 디렉토리는 스킵
            if file_path.is_dir():
                continue

            # 제외 디렉토리 체크
            if any(excluded in file_path.parts for excluded in EXCLUDE_DIRS):
                continue

            # 확장자 체크
            if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue

            # 파일 크기 체크 (100MB 제한)
            if file_path.stat().st_size > 100 * 1024 * 1024:
                print(f"⚠️  파일 크기 초과 (>100MB): {file_path.name}")
                continue

            files_to_upload.append(file_path)

        print(f"✅ 발견된 파일: {len(files_to_upload)}개")
        return files_to_upload

    def upload_file(self, file_path: pathlib.Path) -> Optional[Dict]:
        """
        단일 파일을 File Search Store에 업로드

        Args:
            file_path: 업로드할 파일 경로

        Returns:
            업로드 결과 정보 (성공 시) 또는 None (실패 시)
        """
        try:
            # MIME 타입 추정
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                mime_type = 'application/octet-stream'

            # 파일 메타데이터
            metadata = {
                'file_path': str(file_path),
                'file_name': file_path.name,
                'file_type': file_path.suffix[1:],  # .py -> py
                'upload_time': datetime.now().isoformat()
            }

            print(f"⬆️  업로드 중: {file_path.name} ({mime_type})")

            # File Search Store에 직접 업로드
            with open(file_path, 'rb') as f:
                operation = genai.upload_to_file_search_store(
                    file=f,
                    file_search_store_name=self.store.name,
                    config={
                        'display_name': file_path.name,
                        'metadata': metadata
                    }
                )

            # 업로드 완료 대기
            while operation.metadata.state == 'STATE_PENDING':
                time.sleep(1)
                operation = genai.get_operation(operation.name)

            if operation.metadata.state == 'STATE_SUCCEEDED':
                result = {
                    'file_path': str(file_path),
                    'file_name': file_path.name,
                    'operation_name': operation.name,
                    'status': 'success'
                }
                self.uploaded_files.append(result)
                print(f"   ✅ 업로드 성공")
                return result
            else:
                raise Exception(f"Operation failed: {operation.metadata.state}")

        except Exception as e:
            print(f"   ❌ 업로드 실패: {e}")
            self.failed_files.append({
                'file_path': str(file_path),
                'error': str(e)
            })
            return None

    def upload_directory(self, directory: str, max_files: Optional[int] = None) -> None:
        """
        디렉토리의 모든 파일을 업로드

        Args:
            directory: 업로드할 디렉토리 경로
            max_files: 최대 업로드 파일 수 (None이면 전체)
        """
        # Store 생성
        self.create_or_get_store()

        # 파일 스캔
        files = self.scan_directory(directory)

        if max_files:
            files = files[:max_files]
            print(f"📊 업로드할 파일 수 제한: {max_files}개")

        # 업로드 시작
        print(f"\n🚀 업로드 시작 ({len(files)}개 파일)")
        print("=" * 60)

        for idx, file_path in enumerate(files, 1):
            print(f"\n[{idx}/{len(files)}]", end=" ")
            self.upload_file(file_path)

            # Rate limiting 고려 (초당 60 requests)
            if idx % 50 == 0:
                print("\n⏸️  Rate limit 대기 (60초)...")
                time.sleep(60)

        # 결과 요약
        self.print_summary()
        self.save_report()

    def print_summary(self) -> None:
        """업로드 결과 요약 출력"""
        print("\n" + "=" * 60)
        print("📊 업로드 결과 요약")
        print("=" * 60)
        print(f"✅ 성공: {len(self.uploaded_files)}개")
        print(f"❌ 실패: {len(self.failed_files)}개")
        print(f"📦 Store: {self.store_name}")
        print(f"🔗 Store ID: {self.store.name}")

        if self.failed_files:
            print("\n❌ 실패한 파일:")
            for failed in self.failed_files[:10]:  # 최대 10개만 표시
                print(f"   - {failed['file_path']}: {failed['error']}")
            if len(self.failed_files) > 10:
                print(f"   ... 외 {len(self.failed_files) - 10}개")

    def save_report(self, output_file: str = "upload_report.json") -> None:
        """업로드 결과를 JSON 파일로 저장"""
        report = {
            'store_name': self.store_name,
            'store_id': self.store.name,
            'upload_time': datetime.now().isoformat(),
            'total_files': len(self.uploaded_files) + len(self.failed_files),
            'successful': len(self.uploaded_files),
            'failed': len(self.failed_files),
            'uploaded_files': self.uploaded_files,
            'failed_files': self.failed_files
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\n📄 결과 보고서 저장: {output_file}")


def main():
    """메인 실행 함수"""
    import argparse

    parser = argparse.ArgumentParser(description='Gemini File Search RAG 시스템 - 파일 업로드')
    parser.add_argument('directory', type=str, help='업로드할 디렉토리 경로')
    parser.add_argument('--store-name', type=str, default='P5_Project_RAG_Store',
                        help='File Search Store 이름')
    parser.add_argument('--max-files', type=int, default=None,
                        help='최대 업로드 파일 수')
    parser.add_argument('--report', type=str, default='upload_report.json',
                        help='결과 보고서 파일명')

    args = parser.parse_args()

    # 업로더 생성 및 실행
    uploader = GeminiRAGUploader(store_name=args.store_name)
    uploader.upload_directory(args.directory, max_files=args.max_files)
    uploader.save_report(args.report)


if __name__ == '__main__':
    main()
