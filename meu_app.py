"""Launcher desktop do ERP da Drogaria Joncon.

Este módulo abre a versão web do ERP em uma janela nativa usando pywebview.
Ele foi mantido independente do front-end para não alterar funcionalidades do
projeto React que já está publicado.
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

import webview


# Configurações centralizadas para facilitar futuras manutenções.
APP_NAME = "ERP Drogaria Joncon"
ERP_URL = "https://drogariajoncon.lovable.app"
SPLASH_DURATION_SECONDS = 2
MINIMUM_WINDOW_SIZE = (1200, 700)
CONNECTION_TIMEOUT_SECONDS = 8


# HTML local usado apenas durante a inicialização e quando não há conexão.
SPLASH_HTML = """
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      align-items: center;
      background: linear-gradient(135deg, #0f766e, #064e3b);
      color: #ffffff;
      display: flex;
      font-family: "Segoe UI", Arial, sans-serif;
      height: 100vh;
      justify-content: center;
      margin: 0;
      text-align: center;
    }
    .content { padding: 32px; }
    h1 { font-size: 27px; margin: 0 0 10px; }
    p { color: #d1fae5; margin: 0; }
    .loader {
      animation: rotate 1s linear infinite;
      border: 4px solid rgba(255,255,255,.28);
      border-radius: 50%;
      border-top-color: #ffffff;
      height: 38px;
      margin: 24px auto 0;
      width: 38px;
    }
    @keyframes rotate { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <main class="content">
    <h1>Drogaria Joncon</h1>
    <p>Preparando o ERP...</p>
    <div class="loader" aria-label="Carregando"></div>
  </main>
</body>
</html>
"""

ERROR_HTML = """
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      align-items: center;
      background: #f8fafc;
      color: #1e293b;
      display: flex;
      font-family: "Segoe UI", Arial, sans-serif;
      height: 100vh;
      justify-content: center;
      margin: 0;
    }
    main { max-width: 520px; padding: 32px; text-align: center; }
    h1 { color: #b91c1c; margin-bottom: 12px; }
    p { font-size: 17px; line-height: 1.55; }
    small { color: #64748b; display: block; margin-top: 22px; }
  </style>
</head>
<body>
  <main>
    <h1>Não foi possível conectar ao ERP</h1>
    <p>Verifique sua conexão com a internet e abra o aplicativo novamente.</p>
    <small>O sistema não foi iniciado para evitar o uso de dados desatualizados.</small>
  </main>
</body>
</html>
"""


def configure_logging() -> None:
    """Configura logs úteis para diagnosticar falhas sem interromper o usuário."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def get_application_directory() -> Path:
    """Retorna a pasta da aplicação tanto no Python quanto no executável gerado."""
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).resolve().parent


def find_application_icon() -> Path | None:
    """Localiza o favicon preservando a organização atual do projeto."""
    application_directory = get_application_directory()
    possible_paths = (
        application_directory / "favicon.ico",
        application_directory / "public" / "favicon.ico",
        Path(__file__).resolve().parent / "public" / "favicon.ico",
    )

    for icon_path in possible_paths:
        if icon_path.is_file():
            return icon_path

    logging.warning("favicon.ico não foi encontrado; a janela usará o ícone padrão.")
    return None


def has_internet_connection() -> bool:
    """Valida a disponibilidade do ERP antes de abrir sua página na janela."""
    request = Request(ERP_URL, headers={"User-Agent": f"{APP_NAME}/1.0"})

    try:
        with urlopen(request, timeout=CONNECTION_TIMEOUT_SECONDS) as response:
            is_available = 200 <= response.status < 400
            logging.info("Verificação de conexão concluída: %s", is_available)
            return is_available
    except (URLError, TimeoutError, OSError) as error:
        logging.warning("Falha na verificação de conexão: %s", error)
        return False


def create_splash_window() -> webview.Window:
    """Cria a tela de abertura exibida por dois segundos."""
    return webview.create_window(
        title=APP_NAME,
        html=SPLASH_HTML,
        width=460,
        height=240,
        frameless=True,
        resizable=False,
        on_top=True,
        background_color="#0f766e",
    )


def create_main_window() -> webview.Window:
    """Cria a janela principal inicialmente oculta até a checagem de rede terminar."""
    return webview.create_window(
        title=APP_NAME,
        url=ERP_URL,
        width=MINIMUM_WINDOW_SIZE[0],
        height=MINIMUM_WINDOW_SIZE[1],
        min_size=MINIMUM_WINDOW_SIZE,
        resizable=True,
        confirm_close=True,
        hidden=True,
        background_color="#ffffff",
    )


def show_connection_error(main_window: webview.Window) -> None:
    """Exibe uma página de erro clara na janela principal quando não há internet."""
    main_window.load_html(ERROR_HTML)
    main_window.show()
    main_window.maximize()


def finish_startup(main_window: webview.Window, splash_window: webview.Window) -> None:
    """Finaliza a abertura: mantém a splash, verifica a rede e exibe o ERP."""
    try:
        # Mantém a splash visível pelo tempo solicitado antes da próxima tela.
        time.sleep(SPLASH_DURATION_SECONDS)
        is_connected = has_internet_connection()
        splash_window.destroy()

        if not is_connected:
            show_connection_error(main_window)
            return

        # A janela é redimensionável, respeita o mínimo e inicia maximizada.
        main_window.show()
        main_window.maximize()
    except Exception:
        # Um problema inesperado também resulta em uma mensagem compreensível ao usuário.
        logging.exception("Erro inesperado durante a inicialização do ERP.")
        try:
            splash_window.destroy()
            show_connection_error(main_window)
        except Exception:
            logging.exception("Não foi possível exibir a tela de erro.")


def run_application() -> None:
    """Inicializa todas as janelas do pywebview e inicia o ciclo do aplicativo."""
    icon_path = find_application_icon()
    splash_window = create_splash_window()
    main_window = create_main_window()

    # confirm_close=True, definido na janela principal, pede confirmação ao usuário ao sair.
    webview.start(
        finish_startup,
        args=(main_window, splash_window),
        icon=str(icon_path) if icon_path else None,
    )


def main() -> None:
    """Ponto de entrada protegido para registrar qualquer exceção não tratada."""
    configure_logging()

    try:
        run_application()
    except Exception:
        logging.exception("Não foi possível iniciar o aplicativo desktop.")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
