from PIL import Image
img = Image.open('web/public/favicon.png')
for size, name in [(32, 'icon-32.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(f'web/public/{name}')
    print(f'{name}: {size}x{size}')
print('OK')
