import time
import pyperclip
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from urllib.parse import quote

def main():
    # --- 1. Entrada de Dados ---
    print("--- Automação de Contratos (Versão Estável + Correção Index) ---")
    usuario = input("Digite seu Usuário: ")
    senha = input("Digite sua Senha: ")
    fl_param = input("Digite o parâmetro FL (ex: 0050532877): ")
    skill_alvo = input("Digite o Skill ou parte dele (ex: CM): ").strip()

    # --- Codificação de Credenciais ---
    usuario_safe = quote(usuario, safe='')
    senha_safe = quote(senha, safe='')

    # Montagem da URL Segura
    url_inicial = f"https://{usuario_safe}:{senha_safe}@report.avaya.com/siebelreports/flentitlements.aspx?fl={fl_param}"

    print("\nIniciando navegador (Usando driver do sistema)...")

    options = webdriver.ChromeOptions()
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--start-maximized')

    # ESTRATÉGIA IMPORTANTE: Não esperar carregar imagens/scripts pesados
    options.page_load_strategy = 'eager'

    # Usa o driver local padrão (sem tentar baixar nada da internet)
    driver = webdriver.Chrome(options=options)

    # Timeout de 5 minutos
    driver.set_page_load_timeout(300)

    contrato_encontrado = False
    resultado_texto = f"Contract Not Found for {skill_alvo}"

    try:
        # --- 2. Acessar Lista de Contratos ---
        print(f"Acessando sistema...")

        try:
            driver.get(url_inicial)
        except TimeoutException:
            print("AVISO: Timeout de carregamento inicial (prosseguindo pois usamos modo 'eager')...")
        except Exception as e:
            print(f"Aviso de conexão: {e}")

        # Pausa extra para garantir renderização da tabela
        time.sleep(8)

        # Tenta pegar a tabela
        try:
            linhas_tabela = driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]")
        except:
            linhas_tabela = []

        links_ativos = []

        print(f"Analisando {len(linhas_tabela)} linhas na lista principal...")

        for linha in linhas_tabela:
            colunas = linha.find_elements(By.TAG_NAME, "td")

            if len(colunas) < 8:
                continue

            status_texto = colunas[7].text.strip()

            if "Active" in status_texto:
                try:
                    elemento_link = colunas[2].find_element(By.TAG_NAME, "a")
                    link_relativo = elemento_link.get_attribute("href")
                    links_ativos.append(link_relativo)
                except:
                    continue

        print(f"Encontrados {len(links_ativos)} contratos com status 'Active'.")

        # --- 3. Varrer Contratos Ativos ---
        for i, link in enumerate(links_ativos):
            if contrato_encontrado:
                break

            print(f"Verificando contrato {i+1}/{len(links_ativos)}...")

            try:
                driver.get(link)
            except TimeoutException:
                print(" -> Contrato demorou (prosseguindo)...")
            except Exception:
                pass

            time.sleep(3) # Tempo de segurança pós-carregamento

            linhas_detalhe = driver.find_elements(By.XPATH, "//table[@class='tableBorder']//tr[td]")

            for linha_det in linhas_detalhe:
                colunas_det = linha_det.find_elements(By.TAG_NAME, "td")

                if len(colunas_det) < 20:
                    continue

                # --- CORREÇÃO DO ÍNDICE (O PULO DO GATO) ---
                # Estava 20, mudamos para 19
                prod_skill_texto = colunas_det[19].text.strip()

                # DEBUG VISUAL (Para sabermos se está lendo certo)
                if prod_skill_texto:
                    print(f"   [Lendo]: {prod_skill_texto}")

                if skill_alvo.lower() in prod_skill_texto.lower():
                    asset_num = colunas_det[6].text.strip()

                    resultado_texto = (
                        f"Contract Found for {skill_alvo}\n"
                        f"Skill: {prod_skill_texto}\n"
                        f"Asset Number: {asset_num}"
                    )

                    contrato_encontrado = True
                    print("\n>>> ENCONTRADO! <<<")
                    break

    except Exception as e:
        print(f"\nERRO GERAL: {e}")
        resultado_texto = f"Erro na execução: {str(e)}"

    finally:
        # --- 4. Finalização ---
        pyperclip.copy(resultado_texto)
        print("\n" + "="*30)
        print("RESULTADO (Copiado para o Clipboard):")
        print("="*30)
        print(resultado_texto)
        print("="*30)

        input("Pressione ENTER para fechar o navegador...")
        driver.quit()

if __name__ == "__main__":
    main()