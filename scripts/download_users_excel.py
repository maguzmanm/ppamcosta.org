"""
Extrae datos detallados de todos los usuarios desde la web antigua de PPAM Costa
y los guarda en un archivo Excel.

Usa la cookie de sesión obtenida del navegador para autenticarse.
"""

import requests
import re
import json
import sys
import os
from datetime import datetime

try:
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess

    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "beautifulsoup4", "openpyxl"]
    )
    from bs4 import BeautifulSoup

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
except ImportError:
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl"])
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side


BASE_URL = "https://ppamcosta.org"
SESSION_COOKIE = "PHPSESSID=8qo03hfkjvcpultabh7ncge47v"
OUTPUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_FILE = os.path.join(OUTPUT_DIR, "usuarios_ppamcosta.xlsx")
JSON_FILE = os.path.join(OUTPUT_DIR, "usuarios_ppamcosta.json")

HEADERS = {
    "Cookie": SESSION_COOKIE,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


def fetch_user_ids():
    """Obtiene todos los IDs de usuario desde las páginas del admin."""
    ids = []
    for page in range(0, 32):  # User_page param is 0-indexed
        url = f"{BASE_URL}/index.php/user/admin?User_page={page}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                print(f"  Error pagina {page}: {resp.status_code}")
                continue
            # Extraer IDs de los links de actualización
            found = re.findall(r"/user/update/(\d+)", resp.text)
            ids.extend([int(x) for x in found])
            print(f"  Pagina {page+1}: {len(found)} IDs")
        except Exception as e:
            print(f"  Error pagina {page}: {e}")
    return sorted(set(ids))


def extract_user_data(html: str, user_id: int) -> dict:
    """Extrae los datos del formulario de edición de usuario."""
    soup = BeautifulSoup(html, "html.parser")
    data = {"id": user_id}

    # Función auxiliar para obtener valor de un campo
    def get_input_value(label_text: str) -> str:
        # Buscar el label que contiene el texto y luego el input asociado
        for label in soup.find_all(["label", "div"]):
            if label_text.lower() in (label.get_text() or "").lower():
                # Intentar encontrar el input en el mismo contenedor o siguiente
                parent = label.find_parent("div") or label.parent
                if parent:
                    inp = parent.find(["input", "select"])
                    if inp and inp.name == "input":
                        return inp.get("value", "").strip()
                    elif inp and inp.name == "select":
                        selected = inp.find("option", selected=True)
                        return selected.get_text().strip() if selected else ""
        return ""

    # Extraer campos específicos por nombre/atributo
    form = soup.find("form")
    if not form:
        print(f"    ⚠️ No se encontró formulario para ID {user_id}")
        return data

    # Extraer todos los inputs
    inputs = form.find_all("input")
    selects = form.find_all("select")

    input_data = {}
    for inp in inputs:
        name = inp.get("name", "")
        value = inp.get("value", "")
        input_data[name] = value

    for sel in selects:
        name = sel.get("name", "")
        selected = sel.find("option", selected=True)
        value = selected.get_text().strip() if selected else ""
        input_data[name] = value

    # Mapear a campos legibles (nombres reales del formulario Yii)
    data["usuario"] = input_data.get("User[username]", "")
    data["nombre"] = input_data.get("User[firstname]", "")
    data["apellido"] = input_data.get("User[lastname]", "")
    data["apellidoCasada"] = input_data.get("User[married_lastname]", "")
    data["telefono"] = input_data.get("User[telephone]", "")
    data["email"] = input_data.get("User[email]", "")
    data["genero"] = input_data.get("User[gender]", "")
    data["congregacion"] = input_data.get("User[congregation_id]", "")
    data["rol"] = input_data.get("User[role]", "")
    data["estado"] = input_data.get("User[user_state]", "")

    # Privilegios (checkboxes Yii: hidden input value=0 + checkbox value=1)
    priv_names = {
        "User[siervo_ministerial]": "siervoMinisterial",
        "User[anciano]": "anciano",
        "User[precursor_regular]": "precursorRegular",
        "User[precursor_auxiliar_indef]": "precursorAuxIndefinido",
        "User[precursor_auxiliar_ocas]": "precursorAuxMes",
        "User[precursor_especial]": "precursorEspecial",
        "User[superintendente]": "superintendenteCircuito",
        "User[misionero]": "misionero",
    }
    for name, key in priv_names.items():
        # Buscar el checkbox visible (type=checkbox), no el hidden
        cb = form.find("input", {"type": "checkbox", "name": name})
        # En Yii, si el checkbox tiene el atributo 'checked', está marcado
        if cb and cb.has_attr("checked"):
            data[key] = "Sí"
        else:
            data[key] = "No"

    # Si los campos están vacíos, intentar extraer del texto visible
    if not data.get("nombre"):
        labels_map = {
            "Usuario": "usuario",
            "Nombre": "nombre",
            "Apellido": "apellido",
            "Apellido de Casada": "apellidoCasada",
            "Teléfono": "telefono",
            "Correo Electrónico": "email",
        }
        for label_text, key in labels_map.items():
            if not data.get(key):
                val = get_input_value(label_text)
                if val:
                    data[key] = val

    return data


def main():
    print("🔍 Obteniendo lista de IDs de usuario...")
    ids = fetch_user_ids()
    print(f"\n📊 Total IDs encontrados: {len(ids)}")

    users = []
    errors = 0

    print("\n📥 Extrayendo datos detallados de cada usuario...")
    for i, uid in enumerate(ids):
        url = f"{BASE_URL}/index.php/user/update/{uid}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                print(f"  [{i+1}/{len(ids)}] ID {uid}: Error {resp.status_code}")
                errors += 1
                continue

            data = extract_user_data(resp.text, uid)
            users.append(data)

            if (i + 1) % 20 == 0 or i == len(ids) - 1:
                print(f"  [{i+1}/{len(ids)}] Procesados... ({errors} errores)")

        except Exception as e:
            print(f"  [{i+1}/{len(ids)}] ID {uid}: {e}")
            errors += 1

    print(f"\n✅ Extracción completa: {len(users)} usuarios, {errors} errores")

    # Guardar JSON
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)
    print(f"📁 JSON guardado: {JSON_FILE}")

    # ── Generar Excel ──
    print("📊 Generando Excel...")
    wb = Workbook()
    ws = wb.active
    ws.title = "Usuarios PPAM Costa"

    # Estilos
    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=10)
    header_fill = PatternFill(
        start_color="193C78", end_color="193C78", fill_type="solid"
    )
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell_alignment = Alignment(vertical="center")
    thin_border = Border(
        left=Side(style="thin", color="DDE1E6"),
        right=Side(style="thin", color="DDE1E6"),
        top=Side(style="thin", color="DDE1E6"),
        bottom=Side(style="thin", color="DDE1E6"),
    )
    header_border = Border(
        left=Side(style="thin", color="0F2440"),
        right=Side(style="thin", color="0F2440"),
        top=Side(style="thin", color="0F2440"),
        bottom=Side(style="thin", color="0F2440"),
    )

    # Cabeceras
    columns = [
        ("ID", 6),
        ("Usuario", 16),
        ("Nombre", 18),
        ("Apellido", 18),
        ("Apellido Casada", 18),
        ("Teléfono", 18),
        ("Email", 30),
        ("Género", 10),
        ("Congregación", 25),
        ("Rol", 22),
        ("Estado", 14),
        ("Anciano", 9),
        ("Siervo Ministerial", 11),
        ("Precursor Regular", 11),
        ("Precursor Aux. Indef.", 13),
        ("Precursor Aux. Mes", 12),
        ("Precursor Especial", 12),
        ("Superintendente Circuito", 15),
        ("Misionero", 10),
    ]

    for col_idx, (name, width) in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = header_border
        ws.column_dimensions[cell.column_letter].width = width

    # Datos
    alt_fill = PatternFill(start_color="F5F8FC", end_color="F5F8FC", fill_type="solid")
    for row_idx, user in enumerate(users, 2):
        values = [
            user.get("id", ""),
            user.get("usuario", ""),
            user.get("nombre", ""),
            user.get("apellido", ""),
            user.get("apellidoCasada", ""),
            user.get("telefono", ""),
            user.get("email", ""),
            user.get("genero", ""),
            user.get("congregacion", ""),
            user.get("rol", ""),
            user.get("estado", ""),
            user.get("anciano", ""),
            user.get("siervoMinisterial", ""),
            user.get("precursorRegular", ""),
            user.get("precursorAuxIndefinido", ""),
            user.get("precursorAuxMes", ""),
            user.get("precursorEspecial", ""),
            user.get("superintendenteCircuito", ""),
            user.get("misionero", ""),
        ]
        for col_idx, val in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.alignment = cell_alignment
            cell.border = thin_border
            if row_idx % 2 == 0:
                cell.fill = alt_fill

    # Auto-filtro
    ws.auto_filter.ref = ws.dimensions

    # Congelar primera fila
    ws.freeze_panes = "A2"

    wb.save(EXCEL_FILE)
    print(f"📁 Excel guardado: {EXCEL_FILE}")
    print(f"\n✅ ¡Listo! {len(users)} usuarios exportados.")


if __name__ == "__main__":
    main()
