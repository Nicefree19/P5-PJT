import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
import threading
import sys
import os
from pathlib import Path

# Add current directory to path to import converter
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

import convert_msg_to_md


class MsgConverterApp(ttk.Window):
    def __init__(self):
        super().__init__(themename="cosmo")
        self.title("Outlook MSG to Markdown Converter")
        self.geometry("600x650")

        # Variables
        self.source_path = tk.StringVar()
        self.output_path = tk.StringVar()

        # NotebookLM Options
        self.merge_enabled = tk.BooleanVar(value=True)
        self.max_size_mb = tk.IntVar(value=10)
        self.max_count = tk.IntVar(value=50)

        self.is_running = False

        self._create_widgets()

        # Set default paths if they exist
        default_source = os.path.join(current_dir, "emails")
        default_output = os.path.join(current_dir, "converted_md")

        if os.path.exists(default_source):
            self.source_path.set(default_source)
        if os.path.exists(default_output):
            self.output_path.set(default_output)

    def _create_widgets(self):
        main_frame = ttk.Frame(self, padding="20")
        main_frame.pack(fill=BOTH, expand=YES)

        # Title
        title_lbl = ttk.Label(
            main_frame, text="MSG to Markdown Converter", font=("Helvetica", 16, "bold")
        )
        title_lbl.pack(pady=(0, 20))

        # 1. Path Selection
        path_frame = ttk.Labelframe(main_frame, text="경로 설정", padding=10)
        path_frame.pack(fill=X, pady=5)

        # Source
        ttk.Label(path_frame, text="MSG 파일 폴더:").pack(anchor=W)
        src_box = ttk.Frame(path_frame)
        src_box.pack(fill=X, pady=(0, 10))
        ttk.Entry(src_box, textvariable=self.source_path).pack(
            side=LEFT, fill=X, expand=YES, padx=(0, 5)
        )
        ttk.Button(
            src_box, text="선택", command=self._select_source, style="secondary.TButton"
        ).pack(side=RIGHT)

        # Output
        ttk.Label(path_frame, text="저장 폴더:").pack(anchor=W)
        out_box = ttk.Frame(path_frame)
        out_box.pack(fill=X)
        ttk.Entry(out_box, textvariable=self.output_path).pack(
            side=LEFT, fill=X, expand=YES, padx=(0, 5)
        )
        ttk.Button(
            out_box, text="선택", command=self._select_output, style="secondary.TButton"
        ).pack(side=RIGHT)

        # 2. Options
        opt_frame = ttk.Labelframe(
            main_frame, text="NotebookLM 최적화 옵션", padding=10
        )
        opt_frame.pack(fill=X, pady=10)

        ttk.Checkbutton(
            opt_frame,
            text="자동 병합 (Smart Merging)",
            variable=self.merge_enabled,
            bootstyle="round-toggle",
        ).pack(anchor=W, pady=5)

        # Grid for numeric inputs
        grid_frame = ttk.Frame(opt_frame)
        grid_frame.pack(fill=X, pady=5)

        ttk.Label(grid_frame, text="최대 파일 크기 (MB):").grid(
            row=0, column=0, padx=5, sticky=W
        )
        ttk.Spinbox(
            grid_frame, from_=1, to=100, textvariable=self.max_size_mb, width=10
        ).grid(row=0, column=1, padx=5)

        ttk.Label(grid_frame, text="최대 메일 개수:").grid(
            row=0, column=2, padx=5, sticky=W
        )
        ttk.Spinbox(
            grid_frame, from_=10, to=500, textvariable=self.max_count, width=10
        ).grid(row=0, column=3, padx=5)

        # 3. Action
        self.btn_convert = ttk.Button(
            main_frame,
            text="변환 시작 (Start Conversion)",
            command=self._start_conversion,
            style="success.TButton",
        )
        self.btn_convert.pack(fill=X, pady=10)

        # 4. Log
        log_frame = ttk.Labelframe(main_frame, text="로그 (Log)", padding=10)
        log_frame.pack(fill=BOTH, expand=YES)

        self.log_area = scrolledtext.ScrolledText(
            log_frame, height=10, state="disabled", font=("Consolas", 9)
        )
        self.log_area.pack(fill=BOTH, expand=YES)

    def _select_source(self):
        path = filedialog.askdirectory()
        if path:
            self.source_path.set(path)

    def _select_output(self):
        path = filedialog.askdirectory()
        if path:
            self.output_path.set(path)

    def log(self, message):
        self.log_area.config(state="normal")
        self.log_area.insert(tk.END, message + "\n")
        self.log_area.see(tk.END)
        self.log_area.config(state="disabled")

    def _start_conversion(self):
        if self.is_running:
            return

        src = self.source_path.get()
        out = self.output_path.get()

        if not src or not os.path.isdir(src):
            messagebox.showerror("Error", "유효한 MSG 폴더를 선택해주세요.")
            return

        if not out:
            messagebox.showerror("Error", "저장 폴더를 선택해주세요.")
            return

        self.is_running = True
        self.btn_convert.config(state="disabled", text="변환 중... (Running)")
        self.log_area.config(state="normal")
        self.log_area.delete(1.0, tk.END)
        self.log_area.config(state="disabled")

        merge_opts = {
            "enabled": self.merge_enabled.get(),
            "max_size_mb": self.max_size_mb.get(),
            "max_count": self.max_count.get(),
        }

        # Threading to keep GUI responsive
        thread = threading.Thread(target=self._run_process, args=(src, out, merge_opts))
        thread.daemon = True
        thread.start()

    def _run_process(self, src, out, merge_opts):
        try:
            # GUI logging callback
            def gui_logger(msg):
                self.after(0, lambda: self.log(msg))

            convert_msg_to_md.batch_convert(
                src, out, logger=gui_logger, merge_options=merge_opts
            )

            self.after(
                0, lambda: messagebox.showinfo("완료", "모든 작업이 완료되었습니다!")
            )

        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Error", f"오류 발생: {str(e)}"))
            self.after(0, lambda: self.log(f"CRITICAL ERROR: {e}"))

        finally:
            self.is_running = False
            self.after(
                0,
                lambda: self.btn_convert.config(
                    state="normal", text="변환 시작 (Start Conversion)"
                ),
            )


if __name__ == "__main__":
    app = MsgConverterApp()
    app.mainloop()
