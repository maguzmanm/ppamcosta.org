#!/usr/bin/env python3
import re

with open('/opt/ppamcosta.org/backend/src/controllers/auth.ts', 'r') as f:
    content = f.read()

# Add import after the last import line
content = content.replace(
    "import { signToken } from '../utils/jwt';",
    "import { signToken } from '../utils/jwt';\nimport { sendEmail } from '../services/email';"
)

# Replace the comment + demo code with actual email sending
old = """    // En producción, aquí se enviaría el código por email
    // Para la demo, lo devolvemos en la respuesta
    res.json({
      message: 'Código de recuperación generado. En producción se enviaría por email.',
      code, // Solo para desarrollo
      expiresAt: expires.toISOString(),
    });"""

new = """    // Enviar código por email
    await sendEmail(
      email,
      'Código de recuperación - PPAM Costa',
      '<div style="font-family: Arial; max-width: 400px; margin: auto;"><h2>PPAM Costa</h2><p>Tu código de recuperación es:</p><h1 style="text-align: center; letter-spacing: 8px;">' + code + '</h1><p style="color: #666;">Válido por 15 minutos.</p></div>'
    );

    res.json({
      message: 'Código enviado a tu email.',
      expiresAt: expires.toISOString(),
    });"""

content = content.replace(old, new)

with open('/opt/ppamcosta.org/backend/src/controllers/auth.ts', 'w') as f:
    f.write(content)

print('OK')
