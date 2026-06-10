import json, urllib.request

# Crear JSON válido
data = json.dumps({"email": "juan@ppam.org"}).encode()

req = urllib.request.Request(
    "http://127.0.0.1:3000/api/auth/forgot-password",
    data=data,
    headers={"Content-Type": "application/json"}
)

# Ignorar SSL verification para localhost
import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

resp = urllib.request.urlopen(req, context=ctx)
print(resp.read().decode())
