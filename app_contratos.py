import tkinter as tk
from tkinter import messagebox, scrolledtext
import threading
import time
import re
import sys
import pyperclip
from urllib.parse import quote
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException

# --- Main Application Class ---
class ContractFinderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Avaya Contract Finder") # 1. Tradução
        self.root.geometry("500x450")

        # Variables to store credentials in memory
        self.stored_user = ""
        self.stored_pass = ""

        # Start with Login Screen
        self.create_login_screen()

    # --- SCREEN 1: LOGIN ---
    def create_login_screen(self):
        self.clear_window()

        frame = tk.Frame(self.root, padx=20, pady=20)
        frame.pack(expand=True)

        tk.Label(frame, text="System Access", font=("Arial", 14, "bold")).pack(pady=10) # 1. Tradução

        tk.Label(frame, text="Username:").pack(anchor="w")
        self.entry_user = tk.Entry(frame, width=40)
        self.entry_user.pack(pady=5)

        tk.Label(frame, text="Password:").pack(anchor="w")
        self.entry_pass = tk.Entry(frame, width=40, show="*")
        self.entry_pass.pack(pady=5)

        tk.Button(frame, text="Login / Next", command=self.save_login, bg="#0078D7", fg="white", font=("Arial", 10, "bold"), height=2, width=20).pack(pady=20)

    def save_login(self):
        user = self.entry_user.get().strip()
        password = self.entry_pass.get().strip()

        if not user or not password:
            messagebox.showwarning("Warning", "Please fill in username and password.") # 1. Tradução
            return

        # Save to memory
        self.stored_user = user
        self.stored_pass = password

        # Go to next screen
        self.create_search_screen()

    # --- SCREEN 2: SEARCH ---
    def create_search_screen(self):
        self.clear_window()

        frame = tk.Frame(self.root, padx=20, pady=10)
        frame.pack(expand=True, fill="both")

        # Header
        header = tk.Frame(frame)
        header.pack(fill="x", pady=5)
        tk.Label(header, text=f"Logged user: {self.stored_user}", fg="gray").pack(side="left") # 1. Tradução
        tk.Button(header, text="Logout / Change User", command=self.create_login_screen, font=("Arial", 8)).pack(side="right")

        tk.Label(frame, text="Search Parameters", font=("Arial", 12, "bold")).pack(pady=10)

        # Search Fields
        tk.Label(frame, text="FL Parameter (Ex: 0050532877):").pack(anchor="w")
        self.entry_fl = tk.Entry(frame, width=50)
        self.entry_fl.pack(pady=5)

        tk.Label(frame, text="Target Skill (Ex: CM):").pack(anchor="w")
        self.entry_skill = tk.Entry(frame, width=50)
        self.entry_skill.pack(pady=5)

        # Search Button
        self.btn_search = tk.Button(frame, text="Search Contract", command=self.start_search_thread, bg="#28a745", fg="white", font=("Arial", 10, "bold"), height=2)
        self.btn_search.pack(pady=15, fill="x")

        # Log Area
        tk.Label(frame, text="Execution Log / Result:").pack(anchor="w")
        self.log_area = scrolledtext.ScrolledText(frame, height=10, state='disabled', font=("Consolas", 9))
        self.log_area.pack(fill="both", expand=True)

    def log(self, message):
        """Helper to write logs safely"""
        self.log_area.config(state='normal')
        self.log_area.insert(tk.END, message + "\n")
        self.log_area.see(tk.END)
        self.log_area.config(state='disabled')

    def clear_window(self):
        """Clears all widgets to switch screens"""
        for widget in self.root.winfo_children():
            widget.destroy()

    def start_search_thread(self):
        """Starts selenium in a separate thread"""
        fl = self.entry_fl.get().strip()
        skill = self.entry_skill.get().strip()

        if not fl or not skill:
            messagebox.showwarning("Warning", "Please fill in FL and Skill.")
            return

        # Disable button
        self.btn_search.config(state="disabled", text="Searching... Please wait.")
        self.log_area.config(state='normal')
        self.log_area.delete(1.0, tk.END)
        self.log_area.config(state='disabled')

        # Run in background
        threading.Thread(target=self.run_selenium_logic, args=(fl, skill)).start()

    # --- ROBOT LOGIC (SELENIUM) ---
    def run_selenium_logic(self, fl_param, skill_alvo):
        driver = None
        try:
            self.log("--- Starting Process ---")
            self.log("Encoding credentials...")

            u_safe = quote(self.stored_user, safe='')
            p_safe = quote(self.stored_pass, safe='')

            url_inicial = f"https://{u_safe}:{p_safe}@report.avaya.com/siebelreports/flentitlements.aspx?fl={fl_param}"

            self.log("Opening browser...")

            options = webdriver.ChromeOptions()
            options.add_argument('--ignore-certificate-errors')

            # 3. ALTERAÇÃO DE TAMANHO DE TELA (Menor que maximized)
            # Removemos '--start-maximized' e colocamos tamanho fixo
            options.add_argument('--window-size=1024,768')

            options.page_load_strategy = 'eager'

            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(300)

            self.log("Accessing contract list...")

            try:
                driver.get(url_inicial)
            except Exception:
                pass

            time.sleep(8)

            self.log("Reading contract table...")
            links_ativos = []
            try:
                linhas = driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]")
                for linha in linhas:
                    cols = linha.find_elements(By.TAG_NAME, "td")
                    if len(cols) >= 8:
                        if "Active" in cols[7].text.strip():
                            try:
                                link = cols[2].find_element(By.TAG_NAME, "a").get_attribute("href")
                                links_ativos.append(link)
                            except:
                                pass
            except Exception as e:
                self.log(f"Error reading table: {e}")

            self.log(f"Active contracts found: {len(links_ativos)}")

            encontrado = False
            texto_final = f"Contract Not Found for {skill_alvo}"

            for i, link in enumerate(links_ativos):
                self.log(f"Checking contract {i+1}/{len(links_ativos)}...")

                try:
                    driver.get(link)
                except:
                    pass

                time.sleep(3)

                # Search logic
                try:
                    linhas_det = driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]")
                    for l_det in linhas_det:
                        c_det = l_det.find_elements(By.TAG_NAME, "td")

                        if len(c_det) >= 20:
                            skill_text = c_det[19].text.strip()

                            if skill_alvo.lower() in skill_text.lower():
                                asset = c_det[6].text.strip()

                                url_limpa = re.sub(r'https://[^@]+@', 'https://', link)

                                texto_final = (
                                    f"Contract Found\n"
                                    f"Skill: {skill_text}\n"
                                    f"Asset Number: {asset}\n"
                                    f"Contract URL: {url_limpa}"
                                )
                                encontrado = True
                                self.log(">>> SUCCESS! CONTRACT FOUND <<<")
                                break
                except:
                    pass

                if encontrado:
                    break

            # 2. FECHAMENTO IMEDIATO DO NAVEGADOR
            if driver:
                driver.quit()
                driver = None # Garante que não tente fechar de novo no finally

            # Copia resultado
            pyperclip.copy(texto_final)
            self.log("-" * 30)
            self.log("RESULT (Copied to Clipboard):")
            self.log(texto_final)
            self.log("-" * 30)

            # Exibe mensagem SÓ DEPOIS de fechar o navegador
            messagebox.showinfo("Done", "Search finished!\nResult copied to clipboard.")

        except Exception as e:
            self.log(f"CRITICAL ERROR: {str(e)}")
            messagebox.showerror("Error", str(e))

        finally:
            # Segurança extra caso tenha dado erro antes do driver.quit()
            if driver:
                driver.quit()

            # Reabilita o botão na interface
            self.root.after(0, lambda: self.btn_search.config(state="normal", text="Search Contract"))


# --- App Start ---
if __name__ == "__main__":
    root = tk.Tk()
    app = ContractFinderApp(root)
    root.mainloop()