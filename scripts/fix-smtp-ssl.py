#!/usr/bin/env python3
import re

with open('/opt/ppamcosta.org/backend/src/services/email.ts', 'r') as f:
    content = f.read()
content = content.replace('secure: false', 'secure: true')
content = content.replace('Number(process.env.SMTP_PORT) || 587', 'Number(process.env.SMTP_PORT) || 465')
with open('/opt/ppamcosta.org/backend/src/services/email.ts', 'w') as f:
    f.write(content)
print('OK')
