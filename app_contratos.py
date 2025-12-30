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

# --- Classe Principal da Aplicação ---
class ContractFinderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Busca de Contratos Avaya")
        self.root.geometry("500x450")

        # Variáveis para armazenar credenciais na memória
        self.stored_user = ""
        self.stored_pass = ""

        # Inicia com a tela de Login
        self.create_login_screen()

    # --- TELA 1: LOGIN ---
    def create_login_screen(self):
        self.clear_window()

        frame = tk.Frame(self.root, padx=20, pady=20)
        frame.pack(expand=True)

        tk.Label(frame, text="Acesso ao Sistema", font=("Arial", 14, "bold")).pack(pady=10)

        tk.Label(frame, text="Usuário:").pack(anchor="w")
        self.entry_user = tk.Entry(frame, width=40)
        self.entry_user.pack(pady=5)

        tk.Label(frame, text="Senha:").pack(anchor="w")
        self.entry_pass = tk.Entry(frame, width=40, show="*") # show="*" esconde a senha
        self.entry_pass.pack(pady=5)

        tk.Button(frame, text="Entrar / Próximo", command=self.save_login, bg="#0078D7", fg="white", font=("Arial", 10, "bold"), height=2, width=20).pack(pady=20)

    def save_login(self):
        user = self.entry_user.get().strip()
        password = self.entry_pass.get().strip()

        if not user or not password:
            messagebox.showwarning("Atenção", "Por favor, preencha usuário e senha.")
            return

        # Salva na memória da classe
        self.stored_user = user
        self.stored_pass = password

        # Vai para a próxima tela
        self.create_search_screen()

    # --- TELA 2: BUSCA ---
    def create_search_screen(self):
        self.clear_window()

        frame = tk.Frame(self.root, padx=20, pady=10)
        frame.pack(expand=True, fill="both")

        # Cabeçalho
        header = tk.Frame(frame)
        header.pack(fill="x", pady=5)
        tk.Label(header, text=f"Usuário logado: {self.stored_user}", fg="gray").pack(side="left")
        tk.Button(header, text="Sair / Trocar User", command=self.create_login_screen, font=("Arial", 8)).pack(side="right")

        tk.Label(frame, text="Parâmetros de Busca", font=("Arial", 12, "bold")).pack(pady=10)

        # Campos de busca
        tk.Label(frame, text="Parâmetro FL (Ex: 0050532877):").pack(anchor="w")
        self.entry_fl = tk.Entry(frame, width=50)
        self.entry_fl.pack(pady=5)

        tk.Label(frame, text="Skill Alvo (Ex: CM):").pack(anchor="w")
        self.entry_skill = tk.Entry(frame, width=50)
        self.entry_skill.pack(pady=5)

        # Botão de Busca
        self.btn_search = tk.Button(frame, text="Buscar Contrato", command=self.start_search_thread, bg="#28a745", fg="white", font=("Arial", 10, "bold"), height=2)
        self.btn_search.pack(pady=15, fill="x")

        # Área de Log/Resultado
        tk.Label(frame, text="Log de Execução / Resultado:").pack(anchor="w")
        self.log_area = scrolledtext.ScrolledText(frame, height=10, state='disabled', font=("Consolas", 9))
        self.log_area.pack(fill="both", expand=True)

    def log(self, message):
        """Função para escrever na tela de log de forma segura"""
        self.log_area.config(state='normal')
        self.log_area.insert(tk.END, message + "\n")
        self.log_area.see(tk.END) # Rola para o final
        self.log_area.config(state='disabled')

    def clear_window(self):
        """Limpa todos os widgets da janela para trocar de tela"""
        for widget in self.root.winfo_children():
            widget.destroy()

    def start_search_thread(self):
        """Inicia a busca em uma thread separada para não travar a janela"""
        fl = self.entry_fl.get().strip()
        skill = self.entry_skill.get().strip()

        if not fl or not skill:
            messagebox.showwarning("Atenção", "Preencha o FL e o Skill.")
            return

        # Desabilita botão para evitar cliques duplos
        self.btn_search.config(state="disabled", text="Buscando... Aguarde.")
        self.log_area.config(state='normal')
        self.log_area.delete(1.0, tk.END) # Limpa log anterior
        self.log_area.config(state='disabled')

        # Roda o selenium em background
        threading.Thread(target=self.run_selenium_logic, args=(fl, skill)).start()

    # --- LÓGICA DO ROBÔ (SELENIUM) ---
    def run_selenium_logic(self, fl_param, skill_alvo):
        driver = None
        try:
            self.log("--- Iniciando Processo ---")
            self.log("Codificando credenciais...")

            u_safe = quote(self.stored_user, safe='')
            p_safe = quote(self.stored_pass, safe='')

            url_inicial = f"https://{u_safe}:{p_safe}@report.avaya.com/siebelreports/flentitlements.aspx?fl={fl_param}"

            self.log("Abrindo navegador...")

            options = webdriver.ChromeOptions()
            options.add_argument('--ignore-certificate-errors')
            options.add_argument('--start-maximized')
            options.page_load_strategy = 'eager'

            # Cria o driver
            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(300)

            self.log("Acessando lista de contratos...")

            try:
                driver.get(url_inicial)
            except Exception:
                pass # Ignora timeout do eager

            time.sleep(8)

            self.log("Lendo tabela de contratos...")
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
                self.log(f"Erro ao ler tabela: {e}")

            self.log(f"Contratos ativos encontrados: {len(links_ativos)}")

            encontrado = False
            texto_final = f"Contract Not Found for {skill_alvo}"

            for i, link in enumerate(links_ativos):
                self.log(f"Verificando contrato {i+1}/{len(links_ativos)}...")

                try:
                    driver.get(link)
                except:
                    pass

                time.sleep(3)

                # Busca skill
                try:
                    linhas_det = driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]")
                    for l_det in linhas_det:
                        c_det = l_det.find_elements(By.TAG_NAME, "td")

                        # Coluna 19 é o Skill
                        if len(c_det) >= 20:
                            skill_text = c_det[19].text.strip()

                            if skill_alvo.lower() in skill_text.lower():
                                asset = c_det[6].text.strip()

                                # Limpa URL para segurança
                                url_limpa = re.sub(r'https://[^@]+@', 'https://', link)

                                texto_final = (
                                    f"Contract Found\n"
                                    f"Skill: {skill_text}\n"
                                    f"Asset Number: {asset}\n"
                                    f"Contract URL: {url_limpa}"
                                )
                                encontrado = True
                                self.log(">>> SUCESSO! CONTRATO LOCALIZADO <<<")
                                break
                except:
                    pass

                if encontrado:
                    break

            # Finalização
            pyperclip.copy(texto_final)
            self.log("-" * 30)
            self.log("RESULTADO (Copiado para Clipboard):")
            self.log(texto_final)
            self.log("-" * 30)

            messagebox.showinfo("Concluído", "Busca finalizada!\nResultado copiado para a área de transferência.")

        except Exception as e:
            self.log(f"ERRO CRÍTICO: {str(e)}")
            messagebox.showerror("Erro", str(e))

        finally:
            if driver:
                driver.quit()
            # Reabilita o botão
            self.root.after(0, lambda: self.btn_search.config(state="normal", text="Buscar Contrato"))


# --- Inicialização ---
if __name__ == "__main__":
    root = tk.Tk()
    app = ContractFinderApp(root)
    root.mainloop()