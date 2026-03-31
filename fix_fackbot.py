import re

def extract_obj(content, var_name):
    pattern = rf'\n\s*const\s+{var_name}\s*=\s*\{{'
    match = re.search(pattern, content)
    if not match:
        return None
    
    start_idx = match.start() + content[match.start():].find('{')
    count = 0
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            count += 1
        elif content[i] == '}':
            count -= 1
            if count == 0:
                return content[start_idx:i+1]
    return None

with open("cotizador_comercial_cp_edades.html", "r", encoding="utf-8") as f:
    cot_html = f.read()

cot_data = extract_obj(cot_html, "DATA")

with open("buscador patologias/buscador_patologias_base_interna_v2.html", "r", encoding="utf-8") as f:
    pat_html = f.read()

pat_data = extract_obj(pat_html, "PATHOLOGIES_BASE")

if not cot_data or not pat_data:
    print("Error extracting data")
    exit(1)

script = f"""// === AUTO-INJECTED ADESLAS DATA === //
const ADESLAS_COT_DATA = {cot_data};
const ADESLAS_PAT_DATA = {pat_data};
const PLATFORM_DATA_TEXT = `--- BASE DE DATOS DE PRECIOS, EDADES Y ZONAS (COTIZADOR) ---
Aplica esta tabla para calcular precios según producto, edad y zona postal. El formato incluye tramos de edades [min, max] y precios.
${{JSON.stringify(ADESLAS_COT_DATA)}}

--- DICCIONARIO MÉDICO (BUSCADOR DE PATOLOGÍAS) ---
Listado de patologías con su estado de contratación (ACEPTADO, EXCLUSIÓN, RECHAZO, EN VALORACIÓN MÉDICA) y comentarios.
${{JSON.stringify(ADESLAS_PAT_DATA)}}`;
// ================================== //"""

with open("fackbot.html", "r", encoding="utf-8") as f:
    fack_html = f.read()

fack_html = re.sub(
    r'// === AUTO-INJECTED ADESLAS DATA === //.*?// ================================== //',
    lambda m: script,
    fack_html,
    flags=re.DOTALL
)

with open("fackbot.html", "w", encoding="utf-8") as f:
    f.write(fack_html)

print("Fix applied successfully with robust extraction")
