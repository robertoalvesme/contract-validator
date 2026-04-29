py -m pip install pyinstaller

pyinstaller app_contratos.spec --noconfirm

py -m PyInstaller --noconsole --onefile --noconfirm app_contratos.py

py extrator_contratos.py -u alves153 -p 