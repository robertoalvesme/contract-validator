import os
import sys
import json
import threading
import webbrowser
import time
import re
from urllib.parse import quote
import customtkinter as ctk
from tkinter import messagebox
from selenium import webdriver
from selenium.webdriver.common.by import By

# Global visual configuration
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

EXTERNAL_SKILLS_FILE = "skills.json"

def get_resource_path(relative_path):
    """Returns the absolute path to the resource, handling PyInstaller's Temp folder."""
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def load_skills_data():
    """Loads the JSON, creating it from the default if it doesn't exist."""
    if not os.path.exists(EXTERNAL_SKILLS_FILE):
        default_path = get_resource_path("default_skills.json")
        try:
            with open(default_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Create the external file for the user to edit later
            with open(EXTERNAL_SKILLS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return data
        except Exception as e:
            print(f"Error loading bundled default_skills.json: {e}")
            return {}
    else:
        with open(EXTERNAL_SKILLS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)


class ContractExtractorApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Avaya Contract Finder")
        self.geometry("1000x650")

        self.raw_skills_data = load_skills_data()
        self.term_to_group_map = self.build_reverse_mapping()
        self.stop_event = threading.Event()

        # Variables to store credentials
        self.stored_user = ""
        self.stored_pass = ""

        self.login_screen()

    def build_reverse_mapping(self):
        """Creates a dictionary mapping both Skills AND Products back to the main Group Key."""
        mapping = {}
        for group_key, config in self.raw_skills_data.items():
            mapping[group_key] = group_key # Add the main group key
            for skill in config.get("relatedSkill", []): # Add related skills
                if skill:
                    mapping[skill] = group_key
            for material in config.get("relatedMaterial", []): # Add related materials
                if material:
                    mapping[material] = group_key
        return mapping

    def clear_screen(self):
        for widget in self.winfo_children():
            widget.destroy()

    # ==========================================
    # SCREEN 1: LOGIN
    # ==========================================
    def login_screen(self):
        self.clear_screen()

        login_frame = ctk.CTkFrame(self, width=400, height=350)
        login_frame.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(login_frame, text="System Access", font=ctk.CTkFont(size=20, weight="bold")).pack(pady=(30, 20))

        self.entry_user = ctk.CTkEntry(login_frame, placeholder_text="Username / Handle", width=250)
        self.entry_user.pack(pady=10)

        self.entry_password = ctk.CTkEntry(login_frame, placeholder_text="Password", show="*", width=250)
        self.entry_password.pack(pady=10)

        ctk.CTkButton(login_frame, text="Login", command=self.validate_login, width=250).pack(pady=30)

    def validate_login(self):
        user = self.entry_user.get().strip()
        password = self.entry_password.get().strip()
        if user and password:
            self.stored_user = user
            self.stored_pass = password
            self.main_screen()
        else:
            messagebox.showwarning("Warning", "Please enter both username and password.")

    # ==========================================
    # SCREEN 2: SEARCH & RESULTS
    # ==========================================
    def main_screen(self):
        self.clear_screen()

        # --- SIDEBAR (PARAMETERS) ---
        sidebar = ctk.CTkFrame(self, width=320, corner_radius=0)
        sidebar.pack(side="left", fill="y", padx=0, pady=0)

        header_frame = ctk.CTkFrame(sidebar, fg_color="transparent")
        header_frame.pack(fill="x", pady=(10, 5), padx=10)
        ctk.CTkLabel(header_frame, text=f"User: {self.stored_user}", text_color="gray", font=ctk.CTkFont(size=11)).pack(side="left")
        ctk.CTkButton(header_frame, text="Logout", width=60, height=24, command=self.login_screen).pack(side="right")

        ctk.CTkLabel(sidebar, text="Search Parameters", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(10, 20), padx=20)

        ctk.CTkLabel(sidebar, text="FL (Customer):").pack(anchor="w", padx=20)
        self.entry_fl = ctk.CTkEntry(sidebar, placeholder_text="e.g., 0051849434")
        self.entry_fl.pack(fill="x", padx=20, pady=(0, 15))

        ctk.CTkLabel(sidebar, text="Skill / Product:").pack(anchor="w", padx=20)
        dropdown_options = sorted(self.term_to_group_map.keys())
        self.combo_term = ctk.CTkComboBox(sidebar, values=dropdown_options, state="readonly")
        self.combo_term.pack(fill="x", padx=20, pady=(0, 15))

        ctk.CTkLabel(sidebar, text="Version (e.g., 8, 9, 10):").pack(anchor="w", padx=20)
        self.entry_version = ctk.CTkEntry(sidebar, placeholder_text="Optional")
        self.entry_version.pack(fill="x", padx=20, pady=(0, 25))

        self.btn_start = ctk.CTkButton(sidebar, text="Start Search", command=self.start_automation, fg_color="#28a745", hover_color="darkgreen")
        self.btn_start.pack(fill="x", padx=20, pady=5)

        self.btn_stop = ctk.CTkButton(sidebar, text="Stop Search", command=self.stop_automation, fg_color="#dc3545", hover_color="darkred", state="disabled")
        self.btn_stop.pack(fill="x", padx=20, pady=5)

        self.lbl_status = ctk.CTkLabel(sidebar, text="Waiting...", text_color="gray")
        self.lbl_status.pack(pady=20, padx=20)

        # --- MAIN PANEL (RESULTS) ---
        main_area = ctk.CTkFrame(self, fg_color="transparent")
        main_area.pack(side="right", fill="both", expand=True, padx=10, pady=10)

        ctk.CTkLabel(main_area, text="Contracts Found", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=10)

        self.scroll_results = ctk.CTkScrollableFrame(main_area)
        self.scroll_results.pack(fill="both", expand=True)

    def clear_results(self):
        for widget in self.scroll_results.winfo_children():
            widget.destroy()

    def start_automation(self):
        fl = self.entry_fl.get().strip()
        selected_term = self.combo_term.get()
        version_input = self.entry_version.get().strip()

        if not fl or not selected_term:
            messagebox.showwarning("Warning", "Please enter the FL and select a Skill/Product.")
            return

        self.clear_results()
        version_search = f"R{version_input}" if version_input else ""

        # target_group = self.term_to_group_map[selected_term] # No longer needed for direct search

        self.btn_start.configure(state="disabled")
        self.btn_stop.configure(state="normal")
        self.lbl_status.configure(text="Starting process...", text_color="orange")
        self.stop_event.clear()

        # Run Selenium in background, passing selected_term directly
        threading.Thread(target=self.run_bot, args=(fl, selected_term, version_search), daemon=True).start()

    def stop_automation(self):
        self.stop_event.set()
        self.lbl_status.configure(text="Search stopping...", text_color="red")
        self.btn_stop.configure(state="disabled")

    def add_result_item(self, skill, contract_num, description, url_contract):
        """Creates a modern UI card for each found contract."""

        clipboard_text = (
            f"Contract Found\n"
            f"Skill: {skill}\n"
            f"Asset Number:  {contract_num}\n"
            f"Contract URL:\n{url_contract}"
        )

        item_frame = ctk.CTkFrame(self.scroll_results, fg_color="#2b2b2b")
        item_frame.pack(fill="x", pady=5, padx=5)

        info_label = ctk.CTkLabel(item_frame, text=f"Asset: {contract_num} | Mat: {description}", justify="left", anchor="w", wraplength=450)
        info_label.pack(side="left", padx=10, pady=10, fill="x", expand=True)

        btn_copy = ctk.CTkButton(item_frame, text="Copy", width=70,
                                 command=lambda t=clipboard_text: self.copy_to_clipboard(t))
        btn_copy.pack(side="right", padx=5, pady=10)

        btn_link = ctk.CTkButton(item_frame, text="Open Link", width=80, fg_color="#1f538d",
                                 command=lambda u=url_contract: webbrowser.open(u))
        btn_link.pack(side="right", padx=5, pady=10)

    def copy_to_clipboard(self, text):
        self.clipboard_clear()
        self.clipboard_append(text)
        messagebox.showinfo("Copied", "Contract data copied to clipboard!")

    # ==========================================
    # WEB BOT LOGIC (SELENIUM IN BACKGROUND)
    # ==========================================
    def run_bot(self, fl, selected_term, version_search): # Changed target_group to selected_term
        # config_group = self.raw_skills_data.get(target_group, {}) # No longer needed
        # related_skills = config_group.get("relatedSkill", []) # No longer needed
        # related_materials = config_group.get("relatedMaterial", []) # No longer needed

        driver = None

        try:
            u_safe = quote(self.stored_user, safe='')
            p_safe = quote(self.stored_pass, safe='')

            url_inicial = f"https://{u_safe}:{p_safe}@report.avaya.com/siebelreports/flentitlements.aspx?fl={fl}"

            self.after(0, lambda: self.lbl_status.configure(text="Opening browser..."))

            options = webdriver.ChromeOptions()
            options.add_argument('--ignore-certificate-errors')
            options.add_argument('--window-size=1024,768')
            options.page_load_strategy = 'eager'

            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(300)

            try:
                driver.get(url_inicial)
            except Exception:
                pass

            time.sleep(8)

            self.after(0, lambda: self.lbl_status.configure(text="Reading contract list..."))

            # 1. CAPTURA OS CONTRATOS ATIVOS
            active_links = []
            try:
                linhas = driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]")
                for linha in linhas:
                    cols = linha.find_elements(By.TAG_NAME, "td")
                    if len(cols) >= 8:
                        if "Active" in cols[7].text.strip():
                            try:
                                link = cols[2].find_element(By.TAG_NAME, "a").get_attribute("href")
                                active_links.append(link)
                            except:
                                pass
            except Exception as e:
                print(f"Error reading table: {e}")

            # 2. NAVEGA EM CADA CONTRATO ATIVO
            for i, link in enumerate(active_links):
                if self.stop_event.is_set():
                    break

                self.after(0, lambda idx=i, total=len(active_links): self.lbl_status.configure(text=f"Checking contract {idx+1}/{total}..."))

                try:
                    driver.get(link)
                except:
                    pass

                time.sleep(3)

                try:
                    linhas_det = driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]")
                    for l_det in linhas_det:
                        c_det = l_det.find_elements(By.TAG_NAME, "td")

                        # Valida se a linha tem colunas suficientes
                        if len(c_det) >= 20:
                            material_desc_text = c_det[9].text.strip().upper()
                            prod_skill_text = c_det[19].text.strip()
                            contract_number = c_det[6].text.strip()

                            # --- VALIDAÇÃO DE MATCH ---
                            skill_match = False
                            # Check if selected_term is in Prod Skill OR Material Description
                            if selected_term.lower() in prod_skill_text.lower() or \
                               selected_term.lower() in material_desc_text.lower():
                                skill_match = True

                            version_match = False
                            if skill_match: # Only check version if skill matches
                                if version_search:
                                    if version_search.upper() in material_desc_text:
                                        version_match = True
                                else: # No version specified, so it's a match
                                    version_match = True

                            # If both skill/material and version match, add to results
                            if version_match:
                                clean_url = re.sub(r'https://[^@]+@', 'https://', link)
                                self.after(0, self.add_result_item, prod_skill_text, contract_number, material_desc_text, clean_url)
                except Exception as ex:
                    print(f"Error parsing details: {ex}")

            if not self.stop_event.is_set():
                self.after(0, lambda: self.lbl_status.configure(text="Search Completed!", text_color="green"))
            else:
                self.after(0, lambda: self.lbl_status.configure(text="Search Stopped.", text_color="red"))

        except Exception as e:
            self.after(0, lambda: messagebox.showerror("Automation Error", str(e)))
            self.after(0, lambda: self.lbl_status.configure(text="Error occurred.", text_color="red"))

        finally:
            if driver:
                driver.quit()
            self.after(0, lambda: self.btn_start.configure(state="normal"))
            self.after(0, lambda: self.btn_stop.configure(state="disabled"))


if __name__ == "__main__":
    app = ContractExtractorApp()
    app.mainloop()