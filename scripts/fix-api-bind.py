#!/usr/bin/env python3
with open('/opt/ppamcosta.org/backend/src/index.ts', 'r') as f:
    content = f.read()
content = content.replace("'0.0.0.0'", "'127.0.0.1'")
with open('/opt/ppamcosta.org/backend/src/index.ts', 'w') as f:
    f.write(content)
print('OK')
