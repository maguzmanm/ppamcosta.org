"""
Descarga todos los datos de la API de PPAM Costa (ppamcosta.org).
Requiere credenciales de un usuario con rol COORDINADOR o AUXILIAR.

Uso:
  .venv\Scripts\python.exe scripts\download_db.py
  .venv\Scripts\python.exe scripts\download_db.py --email juan@ppam.org --password 123456
"""

import json
import os
import sys
import argparse
from datetime import datetime
from getpass import getpass

try:
    import requests
except ImportError:
    print("Instalando requests...")
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

BASE_URL = "https://ppamcosta.org/api"
OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backup"
)


def login(email: str, password: str) -> str:
    """Inicia sesion y devuelve el token JWT."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    if resp.status_code != 200:
        print(f"❌ Error de login ({resp.status_code}): {resp.text}")
        sys.exit(1)
    data = resp.json()
    token = data.get("token")
    if not token:
        print("❌ No se recibio token en la respuesta")
        sys.exit(1)
    print(f"✅ Login exitoso como: {email}")
    return token


def fetch_all(endpoint: str, token: str, params: dict = None) -> list:
    """Obtiene todos los registros de un endpoint paginado o lista."""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(
        f"{BASE_URL}{endpoint}", headers=headers, params=params, timeout=30
    )
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "data" in data:
            return data["data"]
        elif isinstance(data, dict):
            return [data]
        return []
    else:
        print(f"  ⚠️ {endpoint}: {resp.status_code} - {resp.text[:100]}")
        return []


def fetch_by_ids(endpoint_template: str, ids: list, token: str) -> list:
    """Obtiene datos para cada ID (ej: /publishers/{id}/availability)."""
    headers = {"Authorization": f"Bearer {token}"}
    results = []
    for obj_id in ids:
        try:
            resp = requests.get(
                f"{BASE_URL}{endpoint_template.format(id=obj_id)}",
                headers=headers,
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    results.extend(data)
                elif isinstance(data, dict):
                    results.append(data)
        except Exception as e:
            print(f"  ⚠️ Error fetching {endpoint_template.format(id=obj_id)}: {e}")
    return results


def main():
    parser = argparse.ArgumentParser(description="Descargar datos de PPAM Costa")
    parser.add_argument("--email", help="Correo del usuario coordinador")
    parser.add_argument("--password", help="Contrasena")
    args = parser.parse_args()

    email = args.email or input("Email: ").strip()
    password = args.password or getpass("Contrasena: ")

    print(f"\n🔌 Conectando a {BASE_URL}...")
    token = login(email, password)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_data = {}
    total_records = 0

    # ── Recursos principales (listas) ──
    resources = [
        ("circuits", "/circuits"),
        ("congregations", "/congregations"),
        ("publishers", "/publishers"),
        ("timeSlots", "/timeslots"),
        ("locations", "/locations"),
        ("shifts", "/shifts"),
        ("experiences", "/experiences"),
        ("announcements", "/announcements"),
        ("notifications", "/notifications"),
        ("incidents", "/incidents"),
        ("users", "/auth/users"),
    ]

    print("\n📥 Descargando datos...")
    for name, endpoint in resources:
        data = fetch_all(endpoint, token)
        all_data[name] = data
        count = len(data) if isinstance(data, list) else 0
        total_records += count
        print(f"  {name}: {count} registros")

    # ── Disponibilidad y ausencias por publicador ──
    if "publishers" in all_data and isinstance(all_data["publishers"], list):
        pub_ids = [p.get("id") for p in all_data["publishers"] if p.get("id")]
        if pub_ids:
            print("\n📥 Descargando disponibilidad por publicador...")
            avail = fetch_by_ids("/publishers/{id}/availability", pub_ids, token)
            all_data["availability"] = avail
            total_records += len(avail)
            print(f"  availability: {len(avail)} registros")

            print("📥 Descargando ausencias por publicador...")
            absences = fetch_by_ids("/publishers/{id}/absences", pub_ids, token)
            all_data["absences"] = absences
            total_records += len(absences)
            print(f"  absences: {len(absences)} registros")

    # ── Reportes ──
    print("📥 Descargando reportes...")
    reports = fetch_all("/reports", token)
    all_data["reports"] = reports
    total_records += len(reports) if isinstance(reports, list) else 0
    print(f"  reports: {len(reports) if isinstance(reports, list) else 0} registros")

    # ── Guardar ──
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    json_file = os.path.join(OUTPUT_DIR, f"data_{timestamp}.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(
        f"\n✅ Descarga completa: {total_records} registros en {len(all_data)} colecciones"
    )
    print(f"📁 Archivo: {json_file}")

    # Resumen por coleccion
    print("\n📊 Resumen:")
    for name, data in all_data.items():
        count = len(data) if isinstance(data, list) else 1
        print(f"  {name}: {count}")


if __name__ == "__main__":
    main()
