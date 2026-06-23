"""
Genera un PDF con la estructura de la base de datos de PPAM Costa.
Incluye un diagrama ER visual generado con matplotlib.
Usa Python 3.14 (.venv314) para tener soporte Pillow.
"""

import os
from datetime import date
from fpdf import FPDF
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

OUTPUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ER_DIAGRAM_PATH = os.path.join(OUTPUT_DIR, "er_diagram.png")
PDF_PATH = os.path.join(OUTPUT_DIR, "ppamcosta_db_structure.pdf")

PRIMARY = "#193C78"
TABLE_COLORS = {
    "core": "#2563A0",
    "people": "#3B7CB8",
    "scheduling": "#5A9CC9",
    "notification": "#7DB8D8",
    "other": "#A0C8E0",
}


class DBStructurePDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(100, 100, 100)
            self.cell(0, 6, "PPAM Costa - Estructura de Base de Datos", align="C")
            self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(
            0,
            10,
            f"Generado: {date.today().strftime('%d/%m/%Y')}  |  Pagina {self.page_no()}/{{nb}}",
            align="C",
        )

    def section_title(self, title: str):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(25, 60, 120)
        self.set_fill_color(230, 238, 250)
        self.cell(0, 8, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def table_header(self, cols):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(70, 130, 180)
        self.set_text_color(255, 255, 255)
        for name, w in cols:
            self.cell(w, 6, name, border=1, fill=True)
        self.ln()
        self.set_text_color(0, 0, 0)

    def table_row(self, cells, striped=False):
        self.set_font("Helvetica", "", 8)
        if striped:
            self.set_fill_color(245, 248, 252)
        else:
            self.set_fill_color(255, 255, 255)
        for text, w in cells:
            self.cell(w, 5.5, f" {text}", border=1, fill=True)
        self.ln()

    def sub_title(self, title: str):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(50, 90, 150)
        self.cell(0, 7, title)
        self.ln(5)

    def body_text(self, text: str):
        self.set_font("Helvetica", "", 8)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 4.5, text)
        self.ln(1)

    def add_image_centered(
        self, path: str, max_width: float = 190, max_height: float = 250
    ):
        if not os.path.exists(path):
            self.body_text(f"[Imagen no encontrada: {path}]")
            return
        from PIL import Image

        with Image.open(path) as img:
            img_w, img_h = img.size
        scale = min(
            max_width / (img_w * 0.264583), max_height / (img_h * 0.264583), 1.0
        )
        w = img_w * 0.264583 * scale
        h = img_h * 0.264583 * scale
        x = (210 - w) / 2
        self.image(path, x=x, w=w, h=h)


# ═══════════════════════════════════
# GENERAR DIAGRAMA ER CON MATPLOTLIB
# ═══════════════════════════════════


def generate_er_diagram():
    fig, ax = plt.subplots(1, 1, figsize=(24, 15))
    ax.set_xlim(0, 24)
    ax.set_ylim(0, 15)
    ax.axis("off")
    ax.set_facecolor("#F7F9FC")

    entities = [
        ("Circuit", 0.3, 11.0, 3.0, 2.0, "core"),
        ("Congregation", 5.0, 11.0, 3.2, 2.0, "core"),
        ("Publisher", 10.5, 11.0, 3.4, 2.8, "people"),
        ("User", 10.5, 6.2, 3.4, 2.8, "people"),
        ("Location", 0.3, 6.5, 3.0, 2.5, "scheduling"),
        ("TimeSlot", 5.0, 1.8, 3.0, 1.8, "scheduling"),
        ("Shift", 0.3, 2.5, 3.0, 2.5, "scheduling"),
        ("ShiftAssignment", 5.0, 6.0, 3.5, 2.2, "scheduling"),
        ("Experience", 16.0, 11.0, 3.3, 2.5, "notification"),
        ("Announcement", 16.0, 7.0, 3.3, 2.2, "notification"),
        ("Incident", 16.0, 3.0, 3.3, 2.2, "notification"),
        ("Availability", 10.5, 1.8, 3.0, 1.8, "other"),
        ("Absence", 21.0, 11.0, 2.6, 1.8, "other"),
        ("LocationAssign.", 5.0, 9.2, 3.5, 1.4, "other"),
        ("DeviceToken", 0.3, 0.2, 2.6, 1.6, "notification"),
        ("PushSubscript.", 3.2, 0.2, 3.0, 1.6, "notification"),
        ("NotifPreference", 6.5, 0.2, 3.2, 1.6, "notification"),
        ("Notification", 10.0, 0.2, 3.0, 1.6, "notification"),
    ]

    for name, x, y, w, h, cat in entities:
        color = TABLE_COLORS.get(cat, "#888888")
        shadow = FancyBboxPatch(
            (x + 0.07, y - 0.07),
            w,
            h,
            boxstyle="round,pad=0.08",
            facecolor="#00000018",
            edgecolor="none",
            zorder=1,
        )
        ax.add_patch(shadow)
        box = FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle="round,pad=0.1",
            facecolor=color,
            edgecolor="white",
            linewidth=1.5,
            zorder=2,
        )
        ax.add_patch(box)
        fontsize = 8.5 if len(name) < 13 else 7.2
        ax.text(
            x + w / 2,
            y + h / 2,
            name,
            ha="center",
            va="center",
            fontsize=fontsize,
            fontweight="bold",
            color="white",
            zorder=3,
        )

    relations = [
        ("Circuit", "Congregation", "1:N"),
        ("Congregation", "Publisher", "1:N"),
        ("Publisher", "User", "1:1"),
        ("Publisher", "Availability", "1:N"),
        ("Publisher", "Absence", "1:N"),
        ("Publisher", "Experience", "1:N"),
        ("Publisher", "ShiftAssignment", "1:N"),
        ("Location", "Shift", "1:N"),
        ("Shift", "ShiftAssignment", "1:N"),
        ("Location", "LocationAssign.", "1:N"),
        ("User", "LocationAssign.", "1:N"),
        ("User", "Shift", "1:N"),
        ("User", "Announcement", "1:N"),
        ("User", "DeviceToken", "1:1"),
        ("User", "PushSubscript.", "1:N"),
        ("User", "NotifPreference", "1:1"),
        ("User", "Notification", "1:N"),
        ("User", "Incident", "1:N"),
        ("TimeSlot", "Shift", "1:N"),
        ("TimeSlot", "Availability", "1:N"),
    ]

    ent_pos = {e[0]: (e[1], e[2], e[3], e[4]) for e in entities}

    for src, dst, label in relations:
        if src not in ent_pos or dst not in ent_pos:
            continue
        sx, sy, sw, sh = ent_pos[src]
        dx, dy, dw, dh = ent_pos[dst]
        scx, scy = sx + sw / 2, sy + sh / 2
        dcx, dcy = dx + dw / 2, dy + dh / 2

        def best_conn(cx, cy, w, h, tx, ty):
            candidates = [
                (cx, cy + h / 2 + 0.05),
                (cx, cy - h / 2 - 0.05),
                (cx + w / 2 + 0.05, cy),
                (cx - w / 2 - 0.05, cy),
            ]
            return min(candidates, key=lambda c: (c[0] - tx) ** 2 + (c[1] - ty) ** 2)

        p1 = best_conn(scx, scy, sw, sh, dcx, dcy)
        p2 = best_conn(dcx, dcy, dw, dh, scx, scy)

        if label == "1:1":
            line_color = "#E07030"
            lw = 1.2
            ls = "dashed"
        else:
            line_color = "#5A7FA5"
            lw = 0.9
            ls = "solid"

        mid_x = (p1[0] + p2[0]) / 2
        mid_y = (p1[1] + p2[1]) / 2
        curve_x = mid_x + (p2[1] - p1[1]) * 0.12
        curve_y = mid_y - (p2[0] - p1[0]) * 0.12

        ax.plot(
            [p1[0], curve_x, p2[0]],
            [p1[1], curve_y, p2[1]],
            color=line_color,
            linewidth=lw,
            linestyle=ls,
            zorder=1,
            alpha=0.75,
        )
        ax.text(
            curve_x,
            curve_y,
            label,
            ha="center",
            va="center",
            fontsize=5.2,
            color=line_color,
            fontweight="bold",
            bbox=dict(
                boxstyle="round,pad=0.12",
                facecolor="#FFFFFFE8",
                edgecolor="none",
                alpha=0.85,
            ),
            zorder=4,
        )

    legend_items = [
        ("Core organizacional", TABLE_COLORS["core"]),
        ("Personas", TABLE_COLORS["people"]),
        ("Planificacion", TABLE_COLORS["scheduling"]),
        ("Notificaciones", TABLE_COLORS["notification"]),
        ("Otros", TABLE_COLORS["other"]),
    ]
    legend_patches = [mpatches.Patch(color=c, label=l) for l, c in legend_items]
    ax.legend(
        handles=legend_patches,
        loc="upper right",
        fontsize=7,
        framealpha=0.9,
        edgecolor="#DDDDDD",
        title="Categorias",
        title_fontsize=8,
    )

    ax.text(
        0.3,
        14.65,
        "---  1:N (uno a muchos)    - - -  1:1 (uno a uno)",
        fontsize=7,
        color="#666666",
        ha="left",
        va="center",
    )

    ax.text(
        12,
        14.65,
        "Diagrama Entidad-Relacion - PPAM Costa",
        ha="center",
        va="center",
        fontsize=13,
        fontweight="bold",
        color=PRIMARY,
    )

    fig.savefig(
        ER_DIAGRAM_PATH,
        dpi=180,
        bbox_inches="tight",
        facecolor=fig.get_facecolor(),
        edgecolor="none",
    )
    plt.close(fig)
    print(f"Diagrama ER generado: {ER_DIAGRAM_PATH}")
    return ER_DIAGRAM_PATH


# ═══════════════════════════════════
# CONSTRUIR PDF
# ═══════════════════════════════════


def build_pdf():
    er_path = generate_er_diagram()

    pdf = DBStructurePDF("P", "mm", "A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(True, 18)

    # ── Portada ──
    pdf.add_page()
    pdf.set_fill_color(25, 60, 120)
    pdf.rect(0, 30, 210, 50, style="F")
    pdf.set_xy(0, 38)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 24)
    pdf.cell(210, 12, "PPAM Costa", align="C")
    pdf.set_xy(0, 52)
    pdf.set_font("Helvetica", "", 14)
    pdf.cell(210, 8, "Sistema de Planificacion de Predicacion", align="C")

    pdf.set_y(95)
    pdf.set_text_color(25, 60, 120)
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, "Estructura de la Base de Datos", align="C")
    pdf.ln(16)

    pdf.set_fill_color(240, 245, 252)
    pdf.set_text_color(80, 80, 80)
    pdf.set_font("Helvetica", "", 10)
    info_lines = [
        f"Proveedor: MySQL    |    ORM: Prisma (prisma-client-js)",
        f"Fecha de generacion: {date.today().strftime('%d de %B de %Y')}",
        "Total de modelos: 18    |    Clave primaria: UUID en todas las tablas",
    ]
    for line in info_lines:
        pdf.cell(0, 8, line, align="C")
        pdf.ln(8)

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 6, "Documentacion tecnica generada automaticamente", align="C")

    # ── Página 2: Diagrama ER ──
    pdf.add_page()
    pdf.section_title("1. Diagrama Entidad-Relacion (Visual)")
    pdf.body_text(
        "El siguiente diagrama muestra las entidades principales de la base de datos "
        "y sus relaciones. Los colores agrupan las tablas por categoria funcional."
    )
    pdf.ln(1)
    pdf.add_image_centered(er_path, max_width=190, max_height=245)
    pdf.ln(2)
    pdf.body_text(
        "Azul oscuro = Core organizacional | Azul medio = Personas | "
        "Azul claro = Planificacion | Azul pastel = Notificaciones | Gris-azulado = Otros."
    )

    # ── 2. Resumen de tablas ──
    pdf.add_page()
    pdf.section_title("2. Resumen de Tablas")
    pdf.ln(1)
    col = [("Tabla", 54), ("Mapeo SQL", 54), ("Descripcion", 82)]
    pdf.table_header(col)
    rows = [
        ("circuits", "circuits", "Circuitos de congregaciones"),
        ("congregations", "congregations", "Congregaciones"),
        ("publishers", "publishers", "Publicadores"),
        ("users", "users", "Usuarios (1:1 con publisher)"),
        ("locations", "locations", "Puntos / ubicaciones (carritos)"),
        ("time_slots", "time_slots", "Franjas horarias"),
        ("shifts", "shifts", "Turnos"),
        ("shift_assignments", "shift_assignments", "Publicadores asignados a turnos"),
        ("availability", "availability", "Disponibilidad semanal"),
        ("absences", "absences", "Ausencias / vacaciones"),
        ("experiences", "experiences", "Experiencias enviadas"),
        ("announcements", "announcements", "Anuncios"),
        ("location_assignments", "location_assignments", "Encargados de puntos"),
        ("incidents", "incidents", "Incidentes reportados"),
        ("device_tokens", "device_tokens", "Tokens push (movil)"),
        ("push_subscriptions", "push_subscriptions", "Suscripciones push (web)"),
        (
            "notification_preferences",
            "notification_preferences",
            "Preferencias de notificacion",
        ),
        ("notifications", "notifications", "Historial de notificaciones"),
    ]
    for i, (a, b, c) in enumerate(rows):
        pdf.table_row([(a, 54), (b, 54), (c, 82)], striped=(i % 2 == 0))

    # ── 3. Jerarquia organizacional ──
    pdf.add_page()
    pdf.section_title("3. Jerarquia Organizacional (Relaciones)")
    pdf.body_text(
        "Se describen las relaciones principales entre los modelos. "
        "Las claves foraneas se indican con FK."
    )
    pdf.ln(2)
    pdf.sub_title("Estructura principal:")
    relations_text = [
        "Circuit (1)  ---<  Congregation (N)",
        "  Congregation (1)  ---<  Publisher (N)",
        "    Publisher (1)  ---  User (1)           [relacion 1:1]",
        "",
        "Publisher (1)  ---<  Availability (N)     [disponibilidad semanal]",
        "Publisher (1)  ---<  Absence (N)           [ausencias]",
        "Publisher (1)  ---<  Experience (N)        [experiencias]",
        "Publisher (1)  ---<  ShiftAssignment (N)   [asignado a turnos]",
        "",
        "Location (1)  ---<  Shift (N)              [turnos en punto]",
        "  Shift (1)  ---<  ShiftAssignment (N)  >---  Publisher (1)",
        "  Shift (N)  >---  TimeSlot (1)            [franja horaria]",
        "",
        "Location (1)  ---<  LocationAssignment (N)  >---  User (1)",
        "",
        "User (1)  ---<  Shift (N)                  [turnos creados]",
        "User (1)  ---<  Announcement (N)           [anuncios]",
        "User (1)  ---  DeviceToken (1)             [token movil]",
        "User (1)  ---<  PushSubscription (N)       [push web]",
        "User (1)  ---  NotificationPreference (1)  [prefs]",
        "User (1)  ---<  Notification (N)           [historial]",
        "User (1)  ---<  Incident (N)               [reporta]",
        "User (1)  ---<  Incident (N)               [responde]",
    ]
    for line in relations_text:
        if line == "":
            pdf.ln(2)
        else:
            pdf.set_font("Courier", "", 7.5)
            pdf.set_text_color(40, 40, 40)
            pdf.cell(0, 4, line)
            pdf.ln()

    # ── 4. Detalle de modelos ──
    models = [
        {
            "name": "Circuit",
            "table": "circuits",
            "desc": "Circuitos que agrupan congregaciones.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("name", "String (unique)", "Nombre del circuito"),
                ("createdAt", "DateTime", "Fecha de creacion"),
            ],
            "relations": ["Congregation (1:N)"],
        },
        {
            "name": "Congregation",
            "table": "congregations",
            "desc": "Congregaciones dentro de un circuito.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("name", "String", "Nombre de la congregacion"),
                ("circuitId", "String", "FK -> circuits.id"),
                ("createdAt", "DateTime", "Fecha de creacion"),
            ],
            "relations": ["Circuit (N:1)", "Publisher (1:N)"],
        },
        {
            "name": "TimeSlot",
            "table": "time_slots",
            "desc": "Franjas horarias para organizar turnos.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("name", "String (unique)", 'Ej: "Manana 9-12"'),
                ("startTime", "String", 'Ej: "09:00"'),
                ("endTime", "String", 'Ej: "12:00"'),
                ("sortOrder", "Int", "Orden de visualizacion"),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["Availability (1:N)", "Shift (1:N)"],
        },
        {
            "name": "Publisher",
            "table": "publishers",
            "desc": "Publicadores. Pertenece a una congregacion y opcionalmente a un punto.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("firstName", "String", "Nombre"),
                ("lastName", "String", "Apellido"),
                ("marriedLastName", "String?", "Apellido de casado/a"),
                (
                    "designations",
                    "String? (JSON)",
                    'Ej: ["ANCIANO","PRECURSOR_REGULAR"]',
                ),
                ("gender", "String?", '"M" o "F"'),
                (
                    "maritalStatus",
                    "String?",
                    "CASADO|SOLTERO|DIVORCIADO|SEPARADO|VIUDO",
                ),
                ("spouseId", "String?", "ID del conyuge en PPAM"),
                ("spouseIsExternal", "Boolean?", "Conyuge no participa en PPAM"),
                ("spouseName", "String?", "Nombre del conyuge externo"),
                ("congregationId", "String", "FK -> congregations.id"),
                ("locationId", "String?", "FK -> locations.id"),
                ("phone", "String?", "Telefono"),
                ("email", "String?", "Correo electronico"),
                ("isActive", "Boolean", "Esta activo?"),
                ("notes", "String?", "Notas"),
                ("createdAt", "DateTime", ""),
                ("updatedAt", "DateTime", ""),
            ],
            "relations": [
                "Congregation (N:1)",
                "Location (N:1, opcional)",
                "User (1:1, opcional)",
                "Availability (1:N)",
                "Absence (1:N)",
                "ShiftAssignment (1:N)",
                "Experience (1:N)",
            ],
        },
        {
            "name": "User",
            "table": "users",
            "desc": "Usuario de la aplicacion. Vinculado 1:1 con Publisher.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("email", "String (unique)", "Correo de acceso"),
                ("passwordHash", "String", "Hash de contrasena"),
                ("role", "String", "Rol del usuario"),
                ("publisherId", "String (unique)", "FK -> publishers.id"),
                ("resetToken", "String?", "Token para reset"),
                ("resetTokenExp", "DateTime?", "Expiracion del token"),
                ("createdAt", "DateTime", ""),
            ],
            "relations": [
                "Publisher (1:1)",
                "Shift-creador (1:N)",
                "LocationAssignment (1:N)",
                "Announcement (1:N)",
                "DeviceToken (1:1)",
                "PushSubscription (1:N)",
                "NotificationPreference (1:1)",
                "Notification (1:N)",
                "Incident-reporta (1:N)",
                "Incident-responde (1:N)",
            ],
        },
        {
            "name": "Availability",
            "table": "availability",
            "desc": "Disponibilidad semanal de un publicador por franja y dia.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("publisherId", "String", "FK -> publishers.id"),
                ("timeSlotId", "String", "FK -> time_slots.id"),
                ("dayOfWeek", "Int", "0=Dom, 1=Lun..6=Sab"),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["Publisher (N:1)", "TimeSlot (N:1)"],
            "constraints": ["@@unique([publisherId, timeSlotId, dayOfWeek])"],
        },
        {
            "name": "Absence",
            "table": "absences",
            "desc": "Ausencias o vacaciones de un publicador.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("publisherId", "String", "FK -> publishers.id"),
                ("startDate", "DateTime", "Inicio"),
                ("endDate", "DateTime", "Fin"),
                ("reason", "String?", "Vacaciones|Enfermedad|Otro"),
                ("notes", "String?", ""),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["Publisher (N:1)"],
        },
        {
            "name": "Location",
            "table": "locations",
            "desc": "Puntos o ubicaciones (carritos) donde se realizan turnos.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("name", "String", "Nombre del punto"),
                ("address", "String", "Direccion"),
                ("latitude", "Float?", "Latitud GPS"),
                ("longitude", "Float?", "Longitud GPS"),
                ("notes", "String?", "Notas"),
                ("isActive", "Boolean", "Activo?"),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["Shift (1:N)", "LocationAssignment (1:N)", "Publisher (1:N)"],
        },
        {
            "name": "LocationAssignment",
            "table": "location_assignments",
            "desc": "Asignacion de encargados/auxiliares a puntos.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("userId", "String", "FK -> users.id"),
                ("locationId", "String", "FK -> locations.id"),
                ("roleAtLocation", "String", 'Rol (ej: "ENCARGADO")'),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["User (N:1)", "Location (N:1)"],
            "constraints": ["@@unique([userId, locationId])"],
        },
        {
            "name": "Shift",
            "table": "shifts",
            "desc": "Turno en un punto, fecha y franja horaria concretos.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("locationId", "String", "FK -> locations.id"),
                ("date", "DateTime", "Fecha del turno"),
                ("timeSlotId", "String", "FK -> time_slots.id"),
                ("maxPublishers", "Int", "Max publicadores (default 2)"),
                ("status", "String", "ABIERTO|CERRADO|..."),
                ("createdById", "String", "FK -> users.id"),
                ("notes", "String?", ""),
                ("createdAt", "DateTime", ""),
            ],
            "relations": [
                "Location (N:1)",
                "TimeSlot (N:1)",
                "User (N:1)",
                "ShiftAssignment (1:N)",
            ],
        },
        {
            "name": "ShiftAssignment",
            "table": "shift_assignments",
            "desc": "Asignacion de un publicador a un turno concreto.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("shiftId", "String", "FK -> shifts.id"),
                ("publisherId", "String", "FK -> publishers.id"),
                ("status", "String", "PENDIENTE|CONFIRMADO|RECHAZADO"),
                ("assignedAt", "DateTime", "Fecha de asignacion"),
                ("respondedAt", "DateTime?", "Fecha de respuesta"),
            ],
            "relations": ["Shift (N:1)", "Publisher (N:1)"],
            "constraints": ["@@unique([shiftId, publisherId])"],
        },
        {
            "name": "Experience",
            "table": "experiences",
            "desc": "Experiencias enviadas por publicadores para revision.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("publisherId", "String", "FK -> publishers.id"),
                ("title", "String", "Titulo"),
                ("content", "String", "Contenido"),
                ("status", "String", "PENDIENTE|APROBADO|RECHAZADO"),
                ("reviewedBy", "String?", "Revisado por (userId)"),
                ("reviewNotes", "String?", "Notas de revision"),
                ("createdAt", "DateTime", ""),
                ("updatedAt", "DateTime", ""),
            ],
            "relations": ["Publisher (N:1)"],
        },
        {
            "name": "Announcement",
            "table": "announcements",
            "desc": "Anuncios publicados en la plataforma.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("title", "String", "Titulo"),
                ("content", "String", "Contenido"),
                ("authorId", "String", "FK -> users.id"),
                ("publishedAt", "DateTime", "Fecha de publicacion"),
                ("expiresAt", "DateTime?", "Fecha de expiracion"),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["User (N:1, autor)"],
        },
        {
            "name": "DeviceToken",
            "table": "device_tokens",
            "desc": "Token de dispositivo para notificaciones push moviles.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("userId", "String (unique)", "FK -> users.id"),
                ("token", "String", "Token del dispositivo"),
                ("platform", "String", '"android" | "ios"'),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["User (1:1)"],
        },
        {
            "name": "PushSubscription",
            "table": "push_subscriptions",
            "desc": "Suscripciones push para la PWA (Web Push API).",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("userId", "String", "FK -> users.id (onDelete: Cascade)"),
                ("endpoint", "String (unique)", "Endpoint"),
                ("p256dh", "String", "Clave p256dh"),
                ("auth", "String", "Clave auth"),
                ("userAgent", "String?", "User-Agent"),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["User (N:1)"],
        },
        {
            "name": "NotificationPreference",
            "table": "notification_preferences",
            "desc": "Preferencias de notificacion del usuario.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("userId", "String (unique)", "FK -> users.id"),
                ("pushEnabled", "Boolean", "Push (default true)"),
                ("emailEnabled", "Boolean", "Email (default true)"),
                ("createdAt", "DateTime", ""),
                ("updatedAt", "DateTime", ""),
            ],
            "relations": ["User (1:1)"],
        },
        {
            "name": "Notification",
            "table": "notifications",
            "desc": "Historial de notificaciones in-app.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("userId", "String", "FK -> users.id"),
                ("type", "String", "turno_asignado|recordatorio|..."),
                ("title", "String", ""),
                ("body", "String", ""),
                ("data", "String? (JSON)", "Metadatos"),
                ("readAt", "DateTime?", "Fecha de lectura"),
                ("createdAt", "DateTime", ""),
            ],
            "relations": ["User (N:1)"],
        },
        {
            "name": "Incident",
            "table": "incidents",
            "desc": "Incidentes reportados por usuarios.",
            "fields": [
                ("id", "String (UUID)", "PK"),
                ("title", "String", "Titulo"),
                ("description", "String", "Descripcion"),
                ("status", "String", "ABIERTO|RESPONDIDO|CERRADO"),
                ("reportedById", "String", "FK -> users.id"),
                ("response", "String?", "Respuesta"),
                ("respondedById", "String?", "FK -> users.id"),
                ("createdAt", "DateTime", ""),
                ("updatedAt", "DateTime", ""),
            ],
            "relations": ["User (N:1, reporta)", "User (N:1, responde)"],
        },
    ]

    for m in models:
        pdf.add_page()
        pdf.section_title(f"Modelo: {m['name']}  ->  tabla `{m['table']}`")
        pdf.body_text(m["desc"])
        pdf.sub_title("Campos:")
        cols = [("Campo", 50), ("Tipo", 50), ("Descripcion", 90)]
        pdf.table_header(cols)
        for i, (field, ftype, fdesc) in enumerate(m["fields"]):
            pdf.table_row([(field, 50), (ftype, 50), (fdesc, 90)], striped=(i % 2 == 0))
        pdf.ln(3)
        if m.get("relations"):
            pdf.sub_title("Relaciones:")
            for r in m["relations"]:
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(60, 60, 60)
                pdf.cell(5, 5, "-")
                pdf.cell(0, 5, r)
                pdf.ln()
        if m.get("constraints"):
            pdf.ln(1)
            pdf.sub_title("Restricciones:")
            for c in m["constraints"]:
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(60, 60, 60)
                pdf.cell(5, 5, "-")
                pdf.cell(0, 5, c)
                pdf.ln()
        pdf.ln(2)

    # ── 5. Enumerados ──
    pdf.add_page()
    pdf.section_title("5. Valores Enumerados (ENUMs implicitos)")
    enums = [
        ("Rol de usuario", "role (users)", "Definido en la logica de negocio"),
        (
            "Designaciones",
            "designations (publishers)",
            'JSON: ["ANCIANO","PRECURSOR_REGULAR",...]',
        ),
        ("Genero", "gender (publishers)", '"M" | "F"'),
        (
            "Estado civil",
            "maritalStatus (publishers)",
            "CASADO | SOLTERO | DIVORCIADO | SEPARADO | VIUDO",
        ),
        ("Estado de turno", "status (shifts)", "ABIERTO | CERRADO"),
        (
            "Estado asignacion",
            "status (shift_assignments)",
            "PENDIENTE | CONFIRMADO | RECHAZADO",
        ),
        (
            "Estado experiencia",
            "status (experiences)",
            "PENDIENTE | APROBADO | RECHAZADO",
        ),
        ("Estado incidente", "status (incidents)", "ABIERTO | RESPONDIDO | CERRADO"),
        (
            "Tipo notificacion",
            "type (notifications)",
            "turno_asignado | recordatorio | turno_respuesta | experiencia_pendiente | anuncio | cambio_turno",
        ),
        ("Plataforma", "platform (device_tokens)", '"android" | "ios"'),
    ]
    cols = [("Concepto", 35), ("Campo", 45), ("Valores", 110)]
    pdf.table_header(cols)
    for i, (concept, field, values) in enumerate(enums):
        pdf.table_row([(concept, 35), (field, 45), (values, 110)], striped=(i % 2 == 0))

    pdf.ln(8)
    pdf.section_title("6. Notas Tecnicas")
    notes = [
        "- ORM: Prisma Client (prisma-client-js).",
        "- Base de datos: MySQL. URL de conexion en variable DATABASE_URL.",
        "- Todas las PK son UUIDs generados con @default(uuid()).",
        "- Timestamps: createdAt usa @default(now()), updatedAt usa @updatedAt.",
        "- Nombres de columna en MySQL: snake_case (@map).",
        "- Nombres de modelos en Prisma: PascalCase.",
        "- Campos JSON: designations (Publisher) y data (Notification).",
        "- Relacion User <-> Publisher: 1:1 mediante publisherId (unique).",
        "- El diagrama ER visual fue generado con matplotlib.",
    ]
    for note in notes:
        pdf.body_text(note)

    pdf.output(PDF_PATH)
    print(f"\nPDF generado correctamente: {PDF_PATH}")
    return PDF_PATH


if __name__ == "__main__":
    build_pdf()
