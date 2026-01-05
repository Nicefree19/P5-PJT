import win32com.client
import os
import re
import base64
from pathlib import Path
from markdownify import markdownify as md


def sanitize_filename(name):
    """파일명에 사용할 수 없는 문자 제거"""
    if not name:
        return "Untitled"
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()


def get_base64_image(attachment):
    """Outlook 첨부파일 객체에서 이미지 데이터를 읽어 Base64 문자열로 반환"""
    try:
        # 임시 파일로 저장하지 않고 메모리에서 처리하려면 PropertyAccessor 등을 써야 하는데
        # 가장 안정적인 방법은 임시 폴더에 저장 후 읽는 것입니다.
        # 여기서는 임시 폴더에 저장 후 읽고 삭제하는 방식을 사용합니다.

        temp_dir = os.path.join(os.environ["TEMP"], "msg_convert_temp")
        os.makedirs(temp_dir, exist_ok=True)

        # 파일명 안전하게 처리
        safe_name = sanitize_filename(attachment.FileName)
        if not safe_name:
            safe_name = "image.png"

        temp_path = os.path.join(temp_dir, safe_name)

        # 저장
        attachment.SaveAsFile(temp_path)

        # 읽기 및 Base64 인코딩
        with open(temp_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")

        # 파일 확장자에 따른 MIME 타입 추론
        ext = os.path.splitext(safe_name)[1].lower()
        mime_type = "image/png"  # 기본값
        if ext in [".jpg", ".jpeg"]:
            mime_type = "image/jpeg"
        elif ext == ".gif":
            mime_type = "image/gif"
        elif ext == ".bmp":
            mime_type = "image/bmp"
        elif ext == ".webp":
            mime_type = "image/webp"

        # 임시 파일 삭제
        try:
            os.remove(temp_path)
        except:
            pass

        return f"data:{mime_type};base64,{encoded_string}"

    except Exception as e:
        print(f"⚠️ 이미지처리 실패: {e}")
        return None


def default_logger(message):
    print(message)


def convert_single_msg_to_md(msg_path, output_folder, logger=None):
    """단일 .msg 파일을 .md로 변환 (이미지 Base64 임베딩)"""
    if logger is None:
        logger = default_logger

    outlook = None
    msg = None
    try:
        outlook = win32com.client.Dispatch("Outlook.Application")
        msg = outlook.Session.OpenSharedItem(str(msg_path))

        # 1. 메타데이터 추출
        subject = msg.Subject or "No Subject"
        sender = msg.SenderName or "Unknown Sender"
        try:
            sent_on = msg.SentOn.strftime("%Y-%m-%d %H:%M:%S")
        except:
            sent_on = "Unknown Date"

        html_body = msg.HTMLBody

        # 2. 이미지 처리 (CID -> Base64)
        if msg.Attachments:
            for i in range(1, msg.Attachments.Count + 1):
                attachment = msg.Attachments.Item(i)
                try:
                    cid = attachment.PropertyAccessor.GetProperty(
                        "http://schemas.microsoft.com/mapi/proptag/0x3712001E"
                    )
                except:
                    cid = None

                if cid:
                    # logger(f"  - 이미지 처리: {attachment.FileName}")
                    # GUI 로그가 너무 빨라지는 것을 방지하기 위해 상세 로그 생략 가능
                    base64_img = get_base64_image(attachment)
                    if base64_img:
                        html_body = html_body.replace(f"cid:{cid}", base64_img)

        # 3. HTML -> Markdown 변환
        markdown_content = md(html_body, heading_style="atx")

        # 4. 최종 마크다운 조립
        final_md = f"""# {subject}

- **From**: {sender}
- **Date**: {sent_on}
- **Source**: {os.path.basename(msg_path)}

---

{markdown_content}
"""

        # 5. 파일 저장
        base_name = Path(msg_path).stem
        safe_name = sanitize_filename(base_name)
        output_path = os.path.join(output_folder, f"{safe_name}.md")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(final_md)

        logger(f"✅ 변환 완료: {os.path.basename(output_path)}")
        return True

    except Exception as e:
        logger(f"❌ 변환 실패 ({os.path.basename(msg_path)}): {e}")
        return False
    finally:
        msg = None
        outlook = None


def batch_convert(source_folder, output_folder, logger=None, merge_options=None):
    """폴더 내 모든 msg 파일 변환 및 선택적 병합"""
    if logger is None:
        logger = default_logger

    source_path = Path(source_folder)
    msg_files = list(source_path.rglob("*.msg"))

    if not msg_files:
        logger("MSG 파일이 없습니다.")
        return

    os.makedirs(output_folder, exist_ok=True)

    logger(f"총 {len(msg_files)}개의 파일을 변환합니다...")

    success = 0
    for idx, f in enumerate(msg_files, 1):
        # logger(f"[{idx}/{len(msg_files)}] {f.name}")
        if convert_single_msg_to_md(f, output_folder, logger):
            success += 1

    logger(f"\n완료: {success}/{len(msg_files)} 성공")
    logger(f"저장 폴더: {output_folder}")

    # 2단계: NotebookLM용 병합 실행 (옵션이 있거나 기본 실행)
    if merge_options:
        if merge_options.get("enabled", False):
            merger = NotebookLMMerger(
                output_folder,
                output_folder,
                max_size_mb=merge_options.get("max_size_mb", 10),
                max_count=merge_options.get("max_count", 50),
                logger=logger,
            )
            merger.merge_all()
    else:
        # Default behavior for CLI
        merger = NotebookLMMerger(output_folder, output_folder, logger=logger)
        merger.merge_all()


class NotebookLMMerger:
    """NotebookLM 최적화를 위한 마크다운 파일 병합기"""

    def __init__(
        self, source_dir, output_dir, max_size_mb=10, max_count=50, logger=None
    ):
        self.source_dir = Path(source_dir)
        self.output_dir = Path(output_dir) / "notebooklm_ready"
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.max_count = max_count
        self.logger = logger if logger else default_logger

    def merge_all(self):
        """폴더 내의 모든 .md 파일을 읽어 청크로 병합"""
        self.logger("\n[NotebookLM 최적화] 병합 시작...")

        md_files = [
            f
            for f in self.source_dir.glob("*.md")
            if "notebooklm_ready" not in str(f) and f.is_file()
        ]

        md_files.sort(key=lambda x: x.name)

        if not md_files:
            self.logger("병합할 마크다운 파일이 없습니다.")
            return

        self.output_dir.mkdir(parents=True, exist_ok=True)

        current_chunk = []
        current_size = 0
        chunk_index = 1

        total_files = len(md_files)
        self.logger(f"총 {total_files}개의 소스 파일을 처리합니다.")

        for idx, file_path in enumerate(md_files, 1):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                file_size = len(content.encode("utf-8"))

                is_size_limit = current_size + file_size > self.max_size_bytes
                is_count_limit = len(current_chunk) >= self.max_count

                if (is_size_limit and current_chunk) or is_count_limit:
                    self._write_chunk(chunk_index, current_chunk)
                    chunk_index += 1
                    current_chunk = []
                    current_size = 0

                formatted_content = self._format_entry(file_path.name, content)
                current_chunk.append(formatted_content)
                current_size += len(formatted_content.encode("utf-8"))

            except Exception as e:
                self.logger(f"⚠️ 파일 읽기 오류 ({file_path.name}): {e}")

        if current_chunk:
            self._write_chunk(chunk_index, current_chunk)

        self.logger(
            f"✅ 병합 완료: 총 {chunk_index}개의 파일이 "
            f"'{self.output_dir}'에 생성되었습니다."
        )

    def _format_entry(self, filename, content):
        return f"""
<!-- SOURCE_START: {filename} -->
---
# 📧 Source File: {filename}
---

{content}

<!-- SOURCE_END -->
"""

    def _write_chunk(self, index, content_list):
        filename = f"NotebookLM_Source_{index:03d}.md"
        filepath = self.output_dir / filename

        final_content = "\n".join(content_list)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# NotebookLM Source Chunk #{index}\n")
            f.write(f"Contains {len(content_list)} emails\n\n")
            f.write(final_content)

        size_mb = filepath.stat().st_size / (1024 * 1024)
        self.logger(
            f"  📦 생성됨: {filename} "
            f"({len(content_list)}개 메일, {size_mb:.2f} MB)"
        )


if __name__ == "__main__":
    # 설정
    SOURCE_DIR = r"d:\00.Work_AI_Tool\11.P5_PJT\emails"
    OUTPUT_DIR = r"d:\00.Work_AI_Tool\11.P5_PJT\converted_md"

    # 기본 실행 (NotebookLM 최적화 포함)
    batch_convert(SOURCE_DIR, OUTPUT_DIR)
