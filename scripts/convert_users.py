"""
Convierte usuarios_ppamcosta.xlsx → plantilla_importar_publicadores.xlsx
Mapea campos del sistema antiguo al nuevo formato de importación.
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import json, re, subprocess, sys


# ─── Obtener congregaciones reales de la BD ───
def get_congregations():
    try:
        result = subprocess.run(
            [
                "mysql",
                "-u",
                "ppam_user",
                "-pPpamCosta2026",
                "ppamcosta_db",
                "-e",
                "SELECT id, name FROM congregations ORDER BY name",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = result.stdout.strip().split("\n")[1:]
        return [(l.split("\t")[0], l.split("\t")[1]) for l in lines if "\t" in l]
    except:
        # Fallback: usar lista hardcodeada
        return [
            ("1f63a7fc-6940-4999-9bf5-728d502620f0", "Alto Mirador - San Antonio"),
            ("b3ef5456-4122-41a5-9486-ab55d5ee0306", "Barrancas - San Antonio"),
            ("b9b15417-66ad-43c7-b306-c51f1332572b", "Barrio Oriente - Melipilla"),
            ("49cb3f18-f908-493d-89eb-677fb21cb637", "Brisas de Culiprán - Melipilla"),
            ("64ec34cf-5292-4bf0-ae6b-f9f4b0feda94", "Centenario - San Antonio"),
            ("4927859c-5c7b-4168-b516-db90a9364bfe", "Central - Melipilla"),
            ("c54e0fae-d37b-4240-8589-1ac18cd43ae5", "Costa Azul - Cartagena"),
            ("3e758822-2970-4dff-816c-cf8e885881e6", "Costanera - El Quisco"),
            ("029db583-9714-40f9-8e2d-4898f735372a", "Criollo Haitiano Melipilla"),
            ("636ecf00-fb62-417d-b7ba-1624785abcea", "Criollo Haitiano San Antonio"),
            ("c034fade-08e7-417d-b35d-47149cdb686e", "El Canelo - Algarrobo"),
            ("cad483fd-00f1-49cf-905b-24b2754ca75a", "El Tabo"),
            ("88f76fe2-8382-48fa-be53-9d5b7d7edf25", "El Totoral - El Quisco"),
            ("63f475ad-a6cb-48a4-bdf5-34ad86170f37", "El Tranque - Llolleo"),
            ("05af16f6-e994-4543-80b8-e824bbc90963", "Isla Negra"),
            ("6d939a38-7654-411f-9501-6578dbc91ad9", "Litoral - Cartagena"),
            ("38db7727-4738-487e-a804-243e66c41b45", "Lo Abarca - Cartagena"),
            ("186a1977-9cb2-4e5c-860d-3515b139cd2e", "Lomas - Llolleo"),
            ("10e45fca-0c7e-4ad6-944e-eb37606606e4", "Los Boldos - Bollenar"),
            ("258ad838-9d8b-4d5b-bef8-70861140e7ec", "Mirasol - Algarrobo"),
            ("44ff763e-a1e2-4e88-be2e-41817eea1c7c", "Pabellón - Melipilla"),
            ("bcd9e619-f7ac-4555-8bc6-b0fbbdde115d", "Pomaire"),
            (
                "104b70da-463c-4343-b79b-79510f75b061",
                "Riberas del Maipo - Santo Domingo",
            ),
            ("095fcf42-e128-49f1-9b2a-a618204918e2", "Sol Poniente - Melipilla"),
            ("b4380cad-4ec6-47ae-b7ad-52867e824c7f", "Valle de Mallarauco - Bollenar"),
            ("32c7c1a1-cc9a-4b90-b153-7a27164c5493", "Villa Alhué"),
        ]


DB_CONGS = get_congregations()


def match_congregation(name):
    """Busca la congregación real por coincidencia de nombre."""
    if not name:
        return ""
    name = name.strip()
    # Quitar número entre paréntesis al final: "El Tabo (6957)" → "El Tabo"
    clean = re.sub(r"\s*\(\d+\)\s*$", "", name).strip()

    # Mapeos especiales que no coinciden exactamente
    SPECIAL = {
        "Criollo San Antonio": "Criollo Haitiano San Antonio",
        "Criollo Haitiano Melipilla": "Criollo Haitiano Melipilla",
    }
    search = SPECIAL.get(clean, clean)

    # Buscar coincidencia exacta
    for cid, cname in DB_CONGS:
        if cname == search:
            return cid

    # Buscar por "empieza con"
    search_lower = search.lower()
    for cid, cname in DB_CONGS:
        if cname.lower().startswith(search_lower) or search_lower.startswith(
            cname.lower()
        ):
            return cid

    # Buscar por "contiene"
    for cid, cname in DB_CONGS:
        if search_lower in cname.lower() or cname.lower() in search_lower:
            return cid

    return ""


# ─── Leer archivo origen ───
src = openpyxl.load_workbook("usuarios_ppamcosta.xlsx")
ws_src = src.active

# ─── Crear plantilla ───
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Publicadores"

hf = Font(bold=True, color="FFFFFF", size=11)
hfill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
red_font = Font(color="FF0000", size=9)

HEADERS = [
    "firstName",
    "lastName",
    "marriedLastName",
    "gender",
    "email",
    "phone",
    "maritalStatus",
    "spouseEmail",
    "congregationId",
    "designations",
    "notes",
]
WIDTHS = [16, 18, 18, 8, 28, 20, 12, 28, 40, 30, 20]

for col, (h, w) in enumerate(zip(HEADERS, WIDTHS), 1):
    c = ws.cell(row=1, column=col, value=h)
    c.font = hf
    c.fill = hfill
    c.alignment = Alignment(horizontal="center")
    ws.column_dimensions[get_column_letter(col)].width = w

# ─── Procesar filas ───
DESIGNATIONS_MAP = {
    "Anciano": "ANCIANO",
    "Siervo Ministerial": "SIERVO_MINISTERIAL",
    "Precursor Regular": "PRECURSOR_REGULAR",
    "Precursor Especial": "PRECURSOR_ESPECIAL",
    "Misionero": "MISIONERO",
    "Superintendente Circuito": "FAMILIA_BETEL",  # aproximación
}

not_found = set()
row_num = 1  # fila en Excel (sin contar header)

for src_row in ws_src.iter_rows(min_row=2, values_only=True):
    nombre, apellido, ap_casada, telefono, email, genero, congregacion = src_row[:7]
    anciano, siervo, prec_reg, prec_indef, prec_mes, prec_esp, super_circ, misionero = (
        src_row[7:15]
    )

    if not nombre and not apellido:
        continue

    row_num += 1

    # Mapeo de género
    gen_map = {"Hombre": "M", "Mujer": "F", "Masculino": "M", "Femenino": "F"}
    gender = gen_map.get(str(genero).strip() if genero else "", "")

    # Designaciones
    des = []
    if str(anciano).strip().lower() in ("sí", "si"):
        des.append("ANCIANO")
    if str(siervo).strip().lower() in ("sí", "si"):
        des.append("SIERVO_MINISTERIAL")
    if str(prec_reg).strip().lower() in ("sí", "si"):
        des.append("PRECURSOR_REGULAR")
    if str(prec_esp).strip().lower() in ("sí", "si"):
        des.append("PRECURSOR_ESPECIAL")
    if str(misionero).strip().lower() in ("sí", "si"):
        des.append("MISIONERO")

    des_str = json.dumps(des) if des else ""

    # Congregación
    cong_id = match_congregation(congregacion)
    if not cong_id and congregacion:
        not_found.add(str(congregacion).strip())

    # Calcular maritalStatus
    marital = ""
    if ap_casada and str(ap_casada).strip():
        marital = "CASADO"

    # Escribir fila
    vals = [
        str(nombre).strip() if nombre else "",
        str(apellido).strip() if apellido else "",
        str(ap_casada).strip() if ap_casada else "",
        gender,
        str(email).strip() if email else "",
        str(telefono).strip() if telefono else "",
        marital,
        "",  # spouseEmail - no disponible en origen
        cong_id,
        des_str,
        "",  # notes
    ]

    for col, val in enumerate(vals, 1):
        cell = ws.cell(row=row_num, column=col, value=val)
        # Marcar en rojo si falta congregación
        if col == 9 and not cong_id and congregacion:
            cell.font = red_font

# ─── Hoja Congregaciones ───
ws3 = wb.create_sheet("Congregaciones")
ws3.column_dimensions["A"].width = 40
ws3.column_dimensions["B"].width = 40
for col, t in enumerate(["ID", "Nombre"], 1):
    c = ws3.cell(row=1, column=col, value=t)
    c.font = hf
    c.fill = hfill
for i, (cid, name) in enumerate(DB_CONGS, 2):
    ws3.cell(row=i, column=1, value=cid)
    ws3.cell(row=i, column=2, value=name)

wb.save("plantilla_importar_publicadores.xlsx")

print(f"✅ Convertidos {row_num - 1} publicadores")
if not_found:
    print(f"\n⚠️  Congregaciones no encontradas ({len(not_found)}):")
    for n in sorted(not_found):
        print(f"   - {n}")
else:
    print("✅ Todas las congregaciones coincidieron")
