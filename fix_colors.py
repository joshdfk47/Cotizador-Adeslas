import os
import re

files_to_update = [
    "/Users/josh/Desktop/CotizadorAdeslas/cotizador_comercial_cp_edades.html",
    "/Users/josh/Desktop/CotizadorAdeslas/calculadoraIMC.html",
    "/Users/josh/Desktop/CotizadorAdeslas/fackbot.html",
    "/Users/josh/Desktop/CotizadorAdeslas/buscador patologias/buscador_patologias_base_interna_v2.html",
    "/Users/josh/Desktop/CotizadorAdeslas/login.html"
]

for fpath in files_to_update:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change header background
    content = re.sub(
        r'(header\.main-header\s*\{[^}]*?background:\s*)linear-gradient\([^)]+\)',
        r'\1#ffffff',
        content
    )
    content = content.replace('box-shadow: 0 14px 34px rgba(11, 43, 76, .18);', 'box-shadow: 0 4px 10px rgba(0, 0, 0, .05);')
    content = content.replace('border-bottom: 1px solid rgba(255, 255, 255, .14);', 'border-bottom: 1px solid rgba(0, 0, 0, .08);')

    # Default btn-nav
    content = re.sub(
        r'(\.btn-nav\s*\{.*?)background:\s*rgba\(255,\s*255,\s*255,\s*\.08\)',
        r'\1background: linear-gradient(135deg, var(--brand), var(--brand2))',
        content,
        flags=re.DOTALL
    )
    content = content.replace('border: 1px solid rgba(255, 255, 255, .18);', 'border: 1px solid var(--brand2);')
    content = content.replace('box-shadow: 0 10px 24px rgba(0, 0, 0, .16);', 'box-shadow: 0 4px 10px rgba(0, 85, 165, .16);')
    content = content.replace('text-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);', 'text-shadow: none;')

    # Hover btn-nav
    content = re.sub(
        r'(\.btn-nav:hover\s*\{[^}]*?background:\s*)rgba\(255,\s*255,\s*255,\s*\.15\)',
        r'\1linear-gradient(135deg, var(--brand2), var(--brand))',
        content,
        flags=re.DOTALL
    )
    content = content.replace('box-shadow: 0 14px 30px rgba(0, 0, 0, .22);', 'box-shadow: 0 6px 14px rgba(0, 85, 165, .22);')

    # Remove individual gradients
    content = re.sub(r'\.btn-nav\.cotizador:not\(\.active\)[^}]+}', '', content)
    content = re.sub(r'\.btn-nav\.patologias:not\(\.active\)[^}]+}', '', content)
    content = re.sub(r'\.btn-nav\.imc:not\(\.active\)[^}]+}', '', content)
    content = re.sub(r'\.btn-nav\.chatbot:not\(\.active\)[^}]+}', '', content)
    content = re.sub(r'\.btn-nav\.admin:not\(\.active\)[^}]+}', '', content)

    # Active btn-nav. Inverted to be clean
    content = re.sub(
        r'(\.btn-nav\.active\s*\{[^}]*?background:\s*)#ffffff(\s*!important;[^}]*?color:\s*)var\(--brand\)(\s*!important;[^}]*?border-color:\s*)#ffffff(\s*!important;)',
        r'\1var(--brand2)\2#ffffff\3var(--brand2)\4',
        content,
        flags=re.DOTALL
    )

    # Text color of links in header right logout btn just in case
    # The user didn't ask about logout, leave it alone.
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done updating files")
