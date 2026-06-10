from PIL import Image

img = Image.open("web/public/logo.png")
for s in [32, 192, 512]:
    img.resize((s, s), Image.LANCZOS).save(f"web/public/icon-{s}.png")
    print(f"icon-{s}.png: {s}x{s}")
img.save("web/public/favicon.png")
print("favicon.png updated")
print("OK")
