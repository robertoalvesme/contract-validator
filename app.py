import os
import sys
import json
import threading
import webbrowser
import time
import re
from urllib.parse import quote
import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


# ─────────────────────────────────────────────────────────────────────────────
# Resource / data helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


def load_skills_data():
    default_path = get_resource_path("default_skills.json")
    try:
        with open(default_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        fallback_path = os.path.join(os.path.abspath("."), "default_skills.json")
        try:
            with open(fallback_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            raise RuntimeError(
                f"Unable to load default_skills.json from '{default_path}' or '{fallback_path}': {e}"
            )
    if isinstance(data, dict):
        return [
            {
                "skillName": k,
                "relatedSkills": v.get("relatedSkill", []),
                "relatedMaterials": v.get("relatedMaterial", []),
            }
            for k, v in data.items()
        ]
    return data


# ─────────────────────────────────────────────────────────────────────────────
# UI helpers
# ─────────────────────────────────────────────────────────────────────────────

def _section_label(parent, text: str):
    ctk.CTkLabel(
        parent, text=text.upper(),
        font=ctk.CTkFont(size=10, weight="bold"),
        text_color="#6272a4",
    ).pack(anchor="w", padx=16, pady=(12, 3))


def _divider(parent):
    ctk.CTkFrame(parent, height=1, fg_color="#252540").pack(fill="x", padx=12, pady=4)


# ─────────────────────────────────────────────────────────────────────────────
# Searchable combo-box
# ─────────────────────────────────────────────────────────────────────────────

class SearchableComboBox(ctk.CTkFrame):
    """
    Entry widget with a live-filtered floating listbox.
    Supports mouse-wheel scroll, keyboard navigation (↓ / Enter / Esc).
    API is compatible with CTkComboBox: .get(), .set(), .configure(values=, state=).
    """

    _ITEM_H  = 22
    _MAX_VIS = 12

    def __init__(self, parent, values=None, placeholder="Type to filter…", **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self._all_values = sorted(values or [])
        self._popup  = None
        self._lb     = None          # tk.Listbox inside popup
        self._disabled = False

        self._var = tk.StringVar()
        self._var.trace_add("write", self._on_text_change)

        self._entry = ctk.CTkEntry(
            self, textvariable=self._var,
            placeholder_text=placeholder, height=36,
        )
        self._entry.pack(fill="x", expand=True)

        self._entry.bind("<FocusIn>",  self._show_popup)
        self._entry.bind("<FocusOut>", self._schedule_hide)
        self._entry.bind("<Down>",     self._focus_list)
        self._entry.bind("<Escape>",   self._hide_popup)
        self._entry.bind("<Return>",   self._pick_first)

    # ── public API ────────────────────────────────────────────────────────────

    def get(self) -> str:
        return self._var.get()

    def set(self, value: str):
        self._var.set(value)

    def configure(self, **kwargs):
        if "values" in kwargs:
            self._all_values = sorted(kwargs.pop("values"))
            if self._popup:
                self._refresh_list()
        if "state" in kwargs:
            state = kwargs.pop("state")
            self._disabled = (state == "disabled")
            self._entry.configure(state=state)
        if kwargs:
            super().configure(**kwargs)

    # ── popup lifecycle ───────────────────────────────────────────────────────

    def _show_popup(self, _=None):
        if self._disabled or (self._popup and self._popup.winfo_exists()):
            return
        self._build_popup()

    def _build_popup(self):
        self._popup = tk.Toplevel(self)
        self._popup.wm_overrideredirect(True)
        self._popup.configure(bg="#0d0d1a")

        border = tk.Frame(self._popup, bg="#3c4070", bd=0)
        border.pack(fill="both", expand=True, padx=1, pady=1)

        sb = tk.Scrollbar(border, orient="vertical", width=10,
                          bg="#2b2b3b", troughcolor="#0d0d1a", activebackground="#3a3a5a")
        self._lb = tk.Listbox(
            border,
            yscrollcommand=sb.set,
            bg="#16162a", fg="#cdd6f4",
            selectbackground="#1f538d", selectforeground="#ffffff",
            activestyle="none",
            borderwidth=0, highlightthickness=0,
            font=("Segoe UI", 10),
        )
        sb.config(command=self._lb.yview)
        self._lb.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        self._lb.bind("<MouseWheel>",
                      lambda e: self._lb.yview_scroll(-int(e.delta / 120), "units"))
        self._lb.bind("<<ListboxSelect>>", self._on_select)
        self._lb.bind("<Return>",          self._on_select)
        self._lb.bind("<FocusOut>",        self._schedule_hide)
        self._lb.bind("<Escape>",          self._hide_popup)

        self._refresh_list()
        self._position_popup()

    def _position_popup(self):
        if not (self._popup and self._popup.winfo_exists()):
            return
        self.update_idletasks()
        x = self.winfo_rootx()
        y = self.winfo_rooty() + self.winfo_height() + 2
        w = self.winfo_width()
        count = self._lb.size() if self._lb else 0
        h = min(self._MAX_VIS, max(1, count)) * self._ITEM_H + 8
        self._popup.geometry(f"{w}x{h}+{x}+{y}")
        self._popup.lift()

    def _refresh_list(self):
        if not (self._popup and self._popup.winfo_exists()):
            return
        query = self._var.get().lower()
        filtered = [v for v in self._all_values if query in v.lower()]
        self._lb.delete(0, "end")
        for v in filtered:
            self._lb.insert("end", v)
        self._position_popup()

    def _hide_popup(self, _=None):
        if self._popup and self._popup.winfo_exists():
            self._popup.destroy()
        self._popup = None
        self._lb = None

    def _schedule_hide(self, _=None):
        self.after(180, self._check_hide)

    def _check_hide(self):
        try:
            if self._lb and self.focus_get() == self._lb:
                return
        except Exception:
            pass
        self._hide_popup()

    # ── interactions ──────────────────────────────────────────────────────────

    def _on_text_change(self, *_):
        if self._popup and self._popup.winfo_exists():
            self._refresh_list()
        elif not self._disabled:
            self._show_popup()

    def _on_select(self, _=None):
        if self._lb:
            sel = self._lb.curselection()
            if sel:
                self._var.set(self._lb.get(sel[0]))
        self._hide_popup()
        self._entry.focus_set()

    def _focus_list(self, _=None):
        if not (self._popup and self._popup.winfo_exists()):
            self._build_popup()
        if self._lb and self._lb.size():
            self._lb.focus_set()
            self._lb.selection_set(0)
            self._lb.activate(0)

    def _pick_first(self, _=None):
        if self._lb and self._lb.size():
            self._var.set(self._lb.get(0))
        self._hide_popup()


# ─────────────────────────────────────────────────────────────────────────────
# Main application
# ─────────────────────────────────────────────────────────────────────────────

class ContractExtractorApp(ctk.CTk):

    def __init__(self):
        super().__init__()
        self.title("Avaya Contract Finder")
        self.geometry("1120x700")
        self.minsize(920, 580)

        self.raw_skills_data = load_skills_data()
        self.skills_list, self.products_list, self.skill_to_related_map = self._build_search_data()
        self.stop_event  = threading.Event()
        self.stored_user = ""
        self.stored_pass = ""
        self._result_count = 0

        self.login_screen()

    # ── data ──────────────────────────────────────────────────────────────────

    def _build_search_data(self):
        skills, products, skill_map = set(), set(), {}

        def _norm(p):
            if not isinstance(p, str):
                return None
            p = re.sub(r"\s+", " ", p.strip())
            return p or None

        for item in self.raw_skills_data:
            name = item.get("skillName")
            if not name:
                continue
            skills.add(name)
            related = {
                rs for rs in (item.get("relatedSkills", []) or item.get("relatedSkill", []))
                if isinstance(rs, str) and rs.strip()
            }
            related.add(name)
            skill_map[name] = sorted(related)
            mats = item.get("relatedMaterials", []) or item.get("relatedMaterial", [])
            for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
                n = _norm(m)
                if n:
                    products.add(n)

        return sorted(skills), sorted(products), skill_map

    # ── screens ───────────────────────────────────────────────────────────────

    def clear_screen(self):
        for w in self.winfo_children():
            w.destroy()

    # ── login ─────────────────────────────────────────────────────────────────

    def login_screen(self):
        self.clear_screen()
        card = ctk.CTkFrame(self, width=400, height=380, corner_radius=18)
        card.place(relx=0.5, rely=0.5, anchor="center")
        card.pack_propagate(False)

        ctk.CTkLabel(
            card, text="Avaya Contract Finder",
            font=ctk.CTkFont(size=22, weight="bold"),
        ).pack(pady=(36, 4))
        ctk.CTkLabel(
            card, text="Sign in to continue",
            font=ctk.CTkFont(size=12), text_color="gray",
        ).pack(pady=(0, 28))

        self.entry_user = ctk.CTkEntry(
            card, placeholder_text="Username / Handle", width=290, height=40)
        self.entry_user.pack(pady=6)

        self.entry_password = ctk.CTkEntry(
            card, placeholder_text="Password", show="*", width=290, height=40)
        self.entry_password.pack(pady=6)
        self.entry_password.bind("<Return>", lambda _: self.validate_login())

        ctk.CTkButton(
            card, text="Login", command=self.validate_login,
            width=290, height=42,
            font=ctk.CTkFont(size=14, weight="bold"),
        ).pack(pady=28)

    def validate_login(self):
        user = self.entry_user.get().strip()
        pw   = self.entry_password.get().strip()
        if user and pw:
            self.stored_user = user
            self.stored_pass = pw
            self.main_screen()
        else:
            messagebox.showwarning("Warning", "Please enter both username and password.")

    # ── main screen ───────────────────────────────────────────────────────────

    def main_screen(self):
        self.clear_screen()
        self._result_count = 0

        # ── sidebar ───────────────────────────────────────────────────────────
        sidebar = ctk.CTkFrame(self, width=295, corner_radius=0, fg_color="#13131f")
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)

        # Header strip
        hdr = ctk.CTkFrame(sidebar, fg_color="#1c1c2e", corner_radius=0, height=50)
        hdr.pack(fill="x")
        hdr.pack_propagate(False)
        ctk.CTkLabel(
            hdr, text="Contract Finder",
            font=ctk.CTkFont(size=15, weight="bold"), text_color="#7aa2f7",
        ).pack(side="left", padx=16)
        ctk.CTkButton(
            hdr, text="Logout", width=64, height=28,
            fg_color="#252540", hover_color="#35355a",
            font=ctk.CTkFont(size=11),
            command=self.login_screen,
        ).pack(side="right", padx=10)
        ctk.CTkLabel(
            hdr, text=self.stored_user,
            font=ctk.CTkFont(size=10), text_color="#6272a4",
        ).pack(side="right", padx=4)

        # ── FL ────────────────────────────────────────────────────────────────
        _section_label(sidebar, "Customer FL")
        self.entry_fl = ctk.CTkEntry(sidebar, placeholder_text="e.g. 0051849434", height=38)
        self.entry_fl.pack(fill="x", padx=14, pady=(0, 6))

        self.search_parent_var = ctk.IntVar(value=0)
        ctk.CTkCheckBox(
            sidebar, text="Also search Parent FLs",
            variable=self.search_parent_var,
            font=ctk.CTkFont(size=12),
        ).pack(anchor="w", padx=16, pady=(0, 4))

        _divider(sidebar)

        # ── Search type ───────────────────────────────────────────────────────
        _section_label(sidebar, "Search Type")
        self.search_type = ctk.StringVar(value="Skill")
        radio_row = ctk.CTkFrame(sidebar, fg_color="transparent")
        radio_row.pack(fill="x", padx=14, pady=(0, 8))
        ctk.CTkRadioButton(
            radio_row, text="Skill", variable=self.search_type, value="Skill",
            command=self._update_search_options,
        ).pack(side="left")
        ctk.CTkRadioButton(
            radio_row, text="Product", variable=self.search_type, value="Product",
            command=self._update_search_options,
        ).pack(side="left", padx=24)

        self._search_content = ctk.CTkFrame(sidebar, fg_color="transparent")
        self._search_content.pack(fill="x")

        self.combo_term = SearchableComboBox(
            self._search_content,
            values=self.skills_list,
            placeholder="Type to filter skills…",
        )
        self.combo_term.pack(fill="x", padx=14, pady=(0, 6))
        if self.skills_list:
            self.combo_term.set(self.skills_list[0])

        self.custom_product_var = ctk.IntVar(value=0)
        self.check_custom = ctk.CTkCheckBox(
            self._search_content, text="Enter custom product name",
            variable=self.custom_product_var,
            command=self._toggle_custom,
            font=ctk.CTkFont(size=12),
        )
        self.entry_custom = ctk.CTkEntry(
            self._search_content, placeholder_text="Product name…", height=36)

        _divider(sidebar)

        # ── Version filter ────────────────────────────────────────────────────
        _section_label(sidebar, "Version Filter")
        self.entry_version = ctk.CTkEntry(
            sidebar, placeholder_text="e.g. 8, 9, 10  (optional)", height=36)
        self.entry_version.pack(fill="x", padx=14, pady=(0, 4))

        _divider(sidebar)

        # ── Action buttons ────────────────────────────────────────────────────
        self.btn_start = ctk.CTkButton(
            sidebar, text="▶  Start Search", command=self.start_automation,
            fg_color="#1a5c35", hover_color="#22764a",
            font=ctk.CTkFont(size=13, weight="bold"), height=42,
        )
        self.btn_start.pack(fill="x", padx=14, pady=(10, 4))

        self.btn_stop = ctk.CTkButton(
            sidebar, text="■  Stop Search", command=self.stop_automation,
            fg_color="#7a1a2e", hover_color="#962336",
            font=ctk.CTkFont(size=13, weight="bold"), height=42, state="disabled",
        )
        self.btn_stop.pack(fill="x", padx=14, pady=4)

        self.btn_clear = ctk.CTkButton(
            sidebar, text="✕  Clear Results", command=self.clear_search,
            fg_color="#252540", hover_color="#35355a",
            font=ctk.CTkFont(size=12), height=36,
        )
        self.btn_clear.pack(fill="x", padx=14, pady=(4, 6))

        _divider(sidebar)

        # ── Execution Logs ────────────────────────────────────────────────────
        _section_label(sidebar, "Execution Logs")
        self.txt_log = ctk.CTkTextbox(
            sidebar, font=ctk.CTkFont(size=11),
            text_color="#a0b4d0", fg_color="#1a1a2e",
            wrap="word", height=150
        )
        self.txt_log.pack(fill="both", expand=True, padx=14, pady=(0, 10))
        self.txt_log.insert("end", "Ready\n")
        self.txt_log.configure(state="disabled")

        # ── Results area ──────────────────────────────────────────────────────
        main_area = ctk.CTkFrame(self, fg_color="#0e0e1a", corner_radius=0)
        main_area.pack(side="right", fill="both", expand=True)

        results_bar = ctk.CTkFrame(main_area, fg_color="#1a1a2e", corner_radius=0, height=46)
        results_bar.pack(fill="x")
        results_bar.pack_propagate(False)
        self.lbl_result_count = ctk.CTkLabel(
            results_bar, text="No results yet",
            font=ctk.CTkFont(size=13, weight="bold"), text_color="#a0b4d0",
        )
        self.lbl_result_count.pack(side="left", padx=20, pady=12)

        self.scroll_results = ctk.CTkScrollableFrame(main_area, fg_color="#0e0e1a")
        self.scroll_results.pack(fill="both", expand=True, padx=6, pady=6)

    # ── search option helpers ─────────────────────────────────────────────────

    def _update_search_options(self):
        mode = self.search_type.get()
        if mode == "Skill":
            self.combo_term.configure(values=self.skills_list, state="normal")
            self.combo_term.set(self.skills_list[0] if self.skills_list else "")
            self.check_custom.pack_forget()
            self.entry_custom.pack_forget()
        else:
            self.combo_term.configure(values=self.products_list, state="normal")
            self.combo_term.set(self.products_list[0] if self.products_list else "")
            self.check_custom.pack(anchor="w", padx=16, pady=(0, 4))
            self._toggle_custom()

    def _toggle_custom(self):
        if self.custom_product_var.get():
            self.entry_custom.pack(fill="x", padx=14, pady=(4, 6))
            self.combo_term.configure(state="disabled")
        else:
            self.entry_custom.pack_forget()
            self.combo_term.configure(state="normal")

    # ── logging (Thread-Safe) ─────────────────────────────────────────────────

    def write_log(self, message):
        """Escreve a mensagem no console de logs com thread-safety."""
        def update_ui():
            self.txt_log.configure(state="normal")
            self.txt_log.insert("end", f"{message}\n")
            self.txt_log.see("end")
            self.txt_log.configure(state="disabled")
        self.after(0, update_ui)
        print(message)

    # ── results ───────────────────────────────────────────────────────────────

    def clear_results(self):
        for w in self.scroll_results.winfo_children():
            w.destroy()

    def clear_search(self):
        self.clear_results()
        self._result_count = 0
        self.lbl_result_count.configure(text="No results yet")

        self.txt_log.configure(state="normal")
        self.txt_log.delete("1.0", "end")
        self.txt_log.insert("end", "Ready\n")
        self.txt_log.configure(state="disabled")

    def add_result_item(self, fl, skill, contract_num, description, url_contract):
        self._result_count += 1
        s = "s" if self._result_count != 1 else ""
        self.lbl_result_count.configure(text=f"{self._result_count} contract{s} found")

        clipboard_text = (
            f"Contract Found\n"
            f"FL: {fl}\n"
            f"Skill: {skill}\n"
            f"Asset Number: {contract_num}\n"
            f"Contract URL:\n{url_contract}"
        )

        card = ctk.CTkFrame(self.scroll_results, fg_color="#16162a", corner_radius=10)
        card.pack(fill="x", pady=3, padx=4)

        ctk.CTkFrame(card, width=4, fg_color="#1f538d", corner_radius=3).pack(
            side="left", fill="y", padx=(8, 0), pady=10)

        info = ctk.CTkFrame(card, fg_color="transparent")
        info.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        r1 = ctk.CTkFrame(info, fg_color="transparent")
        r1.pack(fill="x", anchor="w")
        ctk.CTkLabel(
            r1, text=f"  FL {fl}  ",
            fg_color="#1a3a5c", corner_radius=4,
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color="#7aa2f7", height=22,
        ).pack(side="left", padx=(0, 8))
        ctk.CTkLabel(
            r1, text=skill,
            font=ctk.CTkFont(size=11), text_color="#8892a4", anchor="w",
        ).pack(side="left")

        r2 = ctk.CTkFrame(info, fg_color="transparent")
        r2.pack(fill="x", anchor="w", pady=(4, 0))
        ctk.CTkLabel(
            r2, text=f"Asset  #{contract_num}",
            font=ctk.CTkFont(size=12, weight="bold"), text_color="#e2e8f0",
        ).pack(side="left", padx=(0, 12))
        ctk.CTkLabel(
            r2, text=description,
            font=ctk.CTkFont(size=11), text_color="#6272a4",
            anchor="w", wraplength=420,
        ).pack(side="left")

        btns = ctk.CTkFrame(card, fg_color="transparent")
        btns.pack(side="right", padx=10, pady=10)
        ctk.CTkButton(
            btns, text="Open ↗", width=88, height=32,
            fg_color="#1f538d", hover_color="#2863a8",
            font=ctk.CTkFont(size=11),
            command=lambda u=url_contract: webbrowser.open(u),
        ).pack(pady=(0, 5))
        ctk.CTkButton(
            btns, text="Copy", width=88, height=32,
            fg_color="#252540", hover_color="#35355a",
            font=ctk.CTkFont(size=11),
            command=lambda t=clipboard_text: self.copy_to_clipboard(t),
        ).pack()

    def copy_to_clipboard(self, text):
        self.clipboard_clear()
        self.clipboard_append(text)
        messagebox.showinfo("Copied", "Contract data copied to clipboard!")

    # ── search control ────────────────────────────────────────────────────────

    def start_automation(self):
        fl   = self.entry_fl.get().strip()
        mode = self.search_type.get()
        ver  = self.entry_version.get().strip()
        search_parent = self.search_parent_var.get() == 1

        term = (
            self.entry_custom.get().strip()
            if mode == "Product" and self.custom_product_var.get()
            else self.combo_term.get().strip()
        )

        if not fl or not term:
            messagebox.showwarning("Warning", "Please fill in the FL and a search term.")
            return

        self.clear_results()
        self._result_count = 0
        self.lbl_result_count.configure(text="Searching…")
        version_search = f"R{ver}" if ver else ""

        self.btn_start.configure(state="disabled")
        self.btn_stop.configure(state="normal")

        self.txt_log.configure(state="normal")
        self.txt_log.delete("1.0", "end")
        self.txt_log.insert("end", "Starting search...\n")
        self.txt_log.configure(state="disabled")

        self.stop_event.clear()

        threading.Thread(
            target=self.run_bot,
            args=(fl, mode, term, version_search, search_parent),
            daemon=True,
        ).start()

    def stop_automation(self):
        self.stop_event.set()
        self.write_log("Stopping automation... Waiting for current task to finish.")
        self.btn_stop.configure(state="disabled")

    # ── bot / scraping / helpers ──────────────────────────────────────────────

    def _get_active_contract_links(self, driver, url):
        for attempt in range(3):
            try:
                driver.get(url)
                # Força a espera até a tabela aparecer na tela (Evita falha silenciosa de página não carregada)
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.XPATH, "//table[@class='tableBorder']"))
                )
                time.sleep(2) # Pequena pausa para garantir renderização de dados dinâmicos

                links = []
                for row in driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]"):
                    cols = row.find_elements(By.TAG_NAME, "td")
                    if len(cols) >= 8 and "Active" in cols[7].text.strip():
                        try:
                            links.append(cols[2].find_element(By.TAG_NAME, "a").get_attribute("href"))
                        except Exception:
                            pass
                return links
            except Exception as e:
                self.write_log(f"Aguardando carregamento da tabela de contratos (Tentativa {attempt + 1}/3)...")
                time.sleep(3)

        self.write_log("A tabela de contratos não carregou ou a página estava em branco/vazia.")
        return []

    def _get_parent_active_fls(self, driver, fl, u_safe, p_safe):
        url_drill = f"https://{u_safe}:{p_safe}@report.avaya.com/siebelreports/fldrill.aspx?site_id={fl}"
        parent_id = ""

        for attempt in range(3):
            try:
                driver.get(url_drill)
                lbl = WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.ID, "lblParentId"))
                )
                parent_id = lbl.text.strip()
                break
            except Exception:
                self.write_log(f"Buscando Parent ID na página (Tentativa {attempt + 1}/3)...")
                time.sleep(3)

        if not parent_id:
            self.write_log(f"Nenhum Parent ID encontrado para a FL {fl}.")
            return []

        self.write_log(f"Parent ID encontrado: {parent_id}. Carregando FLs filhas...")

        url_lookup = (
            f"https://{u_safe}:{p_safe}@report.avaya.com"
            f"/details/LookupTool.aspx?siebel_parent={parent_id}"
        )

        active_fls = []
        for attempt in range(3):
            try:
                driver.get(url_lookup)
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.XPATH, "//table[@class='tableBorder']"))
                )
                time.sleep(2)
                for row in driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]"):
                    cols = row.find_elements(By.TAG_NAME, "td")
                    if len(cols) >= 14 and cols[8].text.strip().lower() == "active" and cols[13].text.strip().upper() == "Y":
                        sid = cols[0].text.strip()
                        if sid and sid != fl:
                            active_fls.append(sid)
                self.write_log(f"Encontradas {len(active_fls)} FL(s) irmãs ativas com Agreement=Y.")
                break
            except Exception as e:
                self.write_log(f"Aguardando carregamento da lista de filhas (Tentativa {attempt + 1}/3)...")
                time.sleep(3)

        return active_fls

    def run_bot(self, fl, search_mode, search_term, version_search, search_parent):
        driver = None
        try:
            u_safe = quote(self.stored_user, safe="")
            p_safe = quote(self.stored_pass, safe="")

            self.write_log("Opening browser...")

            opts = webdriver.ChromeOptions()
            opts.add_argument("--ignore-certificate-errors")
            opts.add_argument("--window-size=1024,768")
            opts.page_load_strategy = "eager"
            driver = webdriver.Chrome(options=opts)
            driver.set_page_load_timeout(300)

            fl_urls = [(
                fl,
                f"https://{u_safe}:{p_safe}@report.avaya.com/siebelreports/flentitlements.aspx?fl={fl}",
            )]

            if search_parent and not self.stop_event.is_set():
                self.write_log(f"Looking up parent FLs for {fl}...")
                parent_fls = self._get_parent_active_fls(driver, fl, u_safe, p_safe)
                for pfl in parent_fls:
                    fl_urls.append((
                        pfl,
                        f"https://{u_safe}:{p_safe}@report.avaya.com/siebelreports/flentitlements.aspx?fl={pfl}",
                    ))

            self.write_log(f"Total FLs to query: {len(fl_urls)}")

            fl_links = []
            for fl_id, url in fl_urls:
                if self.stop_event.is_set():
                    break
                self.write_log(f"Reading contracts for FL {fl_id}...")
                new_links = self._get_active_contract_links(driver, url)
                self.write_log(f"Found {len(new_links)} active contracts in FL {fl_id}.")
                for link in new_links:
                    fl_links.append((fl_id, link))

            total = len(fl_links)
            self.write_log(f"Total active contracts across all queried FLs: {total}")

            for i, (fl_id, link) in enumerate(fl_links):
                if self.stop_event.is_set():
                    break
                self.write_log(f"Evaluating contract {i + 1}/{total} (FL {fl_id})...")

                success = False
                for attempt in range(3):
                    try:
                        driver.get(link)
                        WebDriverWait(driver, 15).until(
                            EC.presence_of_element_located((By.XPATH, "//table[@class='tableBorder']"))
                        )
                        time.sleep(1)
                        success = True
                        break
                    except Exception:
                        self.write_log(f"Recarregando detalhes do contrato (Tentativa {attempt + 1}/3)...")
                        time.sleep(3)

                if not success:
                    self.write_log("Falha ao carregar os detalhes do contrato após 3 tentativas. Pulando.")
                    continue

                try:
                    for row in driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]"):
                        cols = row.find_elements(By.TAG_NAME, "td")
                        if len(cols) < 20:
                            continue

                        mat_code   = cols[8].text.strip().upper()
                        mat_desc   = cols[9].text.strip().upper()
                        nickname   = cols[12].text.strip().upper()
                        prod_skill = cols[19].text.strip().upper()
                        minor_mat  = cols[20].text.strip().upper() if len(cols) > 20 else ""
                        contract_num = cols[6].text.strip()

                        match = False
                        if search_mode == "Skill":
                            checks = self.skill_to_related_map.get(search_term, [search_term])
                            if any(s.lower() in prod_skill.lower() for s in checks):
                                match = True
                        else:
                            blob = " ".join([mat_code, mat_desc, nickname, prod_skill, minor_mat])
                            if search_term.lower() in blob.lower():
                                match = True

                        if match and (not version_search or version_search.upper() in mat_desc):
                            clean_url = re.sub(r"https://[^@]+@", "https://", link)
                            self.after(0, self.add_result_item,
                                       fl_id, prod_skill, contract_num, mat_desc, clean_url)
                except Exception as ex:
                    self.write_log(f"Error parsing details: {ex}")

            if not self.stop_event.is_set():
                self.write_log("Search completed successfully!")
            else:
                self.write_log("Search was stopped by the user.")

        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Automation Error", str(e)))
            self.write_log(f"Error occurred: {e}")
        finally:
            if driver:
                driver.quit()
            self.after(0, lambda: self.btn_start.configure(state="normal"))
            self.after(0, lambda: self.btn_stop.configure(state="disabled"))


if __name__ == "__main__":
    app = ContractExtractorApp()
    app.mainloop()