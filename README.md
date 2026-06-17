py -m pip install pyinstaller

pyinstaller app_contratos.spec --noconfirm

py -m PyInstaller --noconsole --onefile --noconfirm app_contratos.py

py extrator_contratos.py -u alves153 -p




Remove-Item .\dist -Recurse -Force -ErrorAction SilentlyContinue


Remove-Item .\build -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .\skills.json -Force -ErrorAction SilentlyContinue
Remove-Item .\cf_debug.log -Force -ErrorAction SilentlyContinue

py -3 -m PyInstaller --clean --noconfirm --noconsole --onefile --add-data "default_skills.json;." app.py



#Somente Rodar
## Instalar
py -3 -m pip install customtkinter selenium
## Executar
py -3 app.py
