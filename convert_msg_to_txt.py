import win32com.client
import os
import re
from pathlib import Path

def sanitize_filename(name):
    """파일명에 사용할 수 없는 문자 제거"""
    return re.sub(r'[\\/*?:"<>|]', "", name)

def convert_msg_to_txt(msg_file_path, output_folder):
    """단일 .msg 파일을 .txt로 변환"""
    try:
        outlook = win32com.client.Dispatch("Outlook.Application")
        msg = outlook.Session.OpenSharedItem(msg_file_path)

        # 메일 정보 추출
        subject = msg.Subject or "No Subject"
        sender = msg.SenderName or "Unknown Sender"
        date = msg.ReceivedTime.strftime("%Y-%m-%d %H:%M") if hasattr(msg, 'ReceivedTime') else "No Date"
        body = msg.Body or "No Content"

        # 출력 파일명 생성 (원본 파일명 기반)
        base_name = Path(msg_file_path).stem
        safe_name = sanitize_filename(base_name)
        output_file = os.path.join(output_folder, f"{safe_name}.txt")

        # 텍스트 파일로 저장
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"Subject: {subject}\n")
            f.write(f"From: {sender}\n")
            f.write(f"Date: {date}\n")
            f.write(f"{'-'*60}\n\n")
            f.write(body.strip())
            f.write(f"\n\n{'='*60}\n")

        print(f"✅ 변환 완료: {base_name}.msg → {safe_name}.txt")
        return True

    except Exception as e:
        print(f"❌ 변환 실패: {msg_file_path} - {e}")
        return False

def batch_convert_msg_to_txt(source_folder, output_folder=None, recursive=True):
    """폴더 내 모든 .msg 파일을 .txt로 일괄 변환

    Args:
        source_folder: .msg 파일이 있는 폴더 경로
        output_folder: 변환된 .txt 파일을 저장할 폴더 (None이면 원본 폴더에 저장)
        recursive: 하위 폴더까지 검색할지 여부
    """

    # 출력 폴더 설정
    if output_folder is None:
        output_folder = source_folder

    # 출력 폴더 생성
    os.makedirs(output_folder, exist_ok=True)

    # .msg 파일 찾기
    if recursive:
        msg_files = list(Path(source_folder).rglob("*.msg"))
    else:
        msg_files = list(Path(source_folder).glob("*.msg"))

    total = len(msg_files)

    if total == 0:
        print(f"⚠️  '{source_folder}' 폴더에서 .msg 파일을 찾을 수 없습니다.")
        return

    print(f"📂 {total}개의 .msg 파일 발견")
    print(f"📁 출력 폴더: {output_folder}")
    print(f"{'-'*60}")

    success_count = 0
    fail_count = 0

    for idx, msg_file in enumerate(msg_files, 1):
        print(f"[{idx}/{total}] 처리 중: {msg_file.name}")

        if convert_msg_to_txt(str(msg_file), output_folder):
            success_count += 1
        else:
            fail_count += 1

    print(f"\n{'='*60}")
    print(f"🎉 변환 완료!")
    print(f"   성공: {success_count}개")
    print(f"   실패: {fail_count}개")
    print(f"   저장 위치: {output_folder}")

    return output_folder

def merge_txt_files(txt_folder, output_folder=None, files_per_merge=1000):
    """변환된 .txt 파일들을 N개 단위로 병합

    Args:
        txt_folder: .txt 파일이 있는 폴더 경로
        output_folder: 병합된 파일을 저장할 폴더 (None이면 txt_folder/merged 생성)
        files_per_merge: 하나의 파일로 병합할 txt 개수 (기본 1000개)
    """

    # 출력 폴더 설정
    if output_folder is None:
        output_folder = os.path.join(txt_folder, "merged")

    os.makedirs(output_folder, exist_ok=True)

    # .txt 파일 찾기 (merged 폴더 제외)
    txt_files = [f for f in Path(txt_folder).glob("*.txt")
                 if "merged" not in str(f)]
    txt_files.sort()  # 파일명 순 정렬

    total = len(txt_files)

    if total == 0:
        print(f"⚠️  '{txt_folder}' 폴더에서 .txt 파일을 찾을 수 없습니다.")
        return

    # 필요한 병합 파일 개수 계산
    num_merged_files = (total + files_per_merge - 1) // files_per_merge

    print(f"\n📂 {total}개의 .txt 파일 발견")
    print(f"📦 {files_per_merge}개씩 병합 → {num_merged_files}개의 파일 생성")
    print(f"📁 출력 폴더: {output_folder}")
    print(f"{'-'*60}")

    # 파일 병합
    for batch_num in range(num_merged_files):
        start_idx = batch_num * files_per_merge
        end_idx = min(start_idx + files_per_merge, total)
        batch_files = txt_files[start_idx:end_idx]

        # 병합 파일명
        merged_filename = os.path.join(output_folder, f"merged_{batch_num+1:03d}.txt")

        print(f"\n[{batch_num+1}/{num_merged_files}] 병합 중: {len(batch_files)}개 파일")

        with open(merged_filename, "w", encoding="utf-8") as outfile:
            for idx, txt_file in enumerate(batch_files, 1):
                try:
                    # 파일 내용 읽기
                    with open(txt_file, "r", encoding="utf-8") as infile:
                        content = infile.read()

                    # 파일 구분자 추가
                    outfile.write(f"\n{'#'*80}\n")
                    outfile.write(f"# 파일 {start_idx + idx}/{total}: {txt_file.name}\n")
                    outfile.write(f"{'#'*80}\n\n")
                    outfile.write(content)
                    outfile.write("\n\n")

                    if idx % 100 == 0:
                        print(f"  - {idx}/{len(batch_files)}개 처리 완료...")

                except Exception as e:
                    print(f"  ⚠️  건너뜀: {txt_file.name} - {e}")

        print(f"  ✅ 생성 완료: {merged_filename}")

    print(f"\n{'='*60}")
    print(f"🎉 병합 완료!")
    print(f"   총 {total}개 파일 → {num_merged_files}개 병합 파일")
    print(f"   저장 위치: {output_folder}")

# ===== 실행 예시 =====
if __name__ == "__main__":
    # ========================================
    # 방법 1: .msg 변환 + 1000개 단위 자동 병합
    # ========================================
    source = r"D:\00.Work_AI_Tool\11.P5_PJT\emails"  # .msg 파일이 있는 폴더
    output = r"D:\00.Work_AI_Tool\11.P5_PJT\converted_txt"  # 변환 결과 저장 폴더

    # Step 1: .msg → .txt 변환
    print("=" * 60)
    print("STEP 1: .msg 파일 변환 시작")
    print("=" * 60)
    txt_folder = batch_convert_msg_to_txt(source, output)

    # Step 2: 변환된 .txt 파일 1000개씩 병합
    print("\n" + "=" * 60)
    print("STEP 2: 텍스트 파일 병합 시작")
    print("=" * 60)
    merge_txt_files(txt_folder, files_per_merge=1000)

    # ========================================
    # 방법 2: 이미 변환된 .txt 파일만 병합
    # ========================================
    # txt_folder = r"D:\00.Work_AI_Tool\11.P5_PJT\converted_txt"
    # merge_txt_files(txt_folder, files_per_merge=1000)

    # ========================================
    # 방법 3: 500개 단위로 병합
    # ========================================
    # txt_folder = r"D:\00.Work_AI_Tool\11.P5_PJT\converted_txt"
    # merge_txt_files(txt_folder, files_per_merge=500)

    # ========================================
    # 방법 4: 하위 폴더 검색 안 함 (현재 폴더만)
    # ========================================
    # batch_convert_msg_to_txt(source, output, recursive=False)
