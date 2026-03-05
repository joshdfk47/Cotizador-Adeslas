import re

# Read Cotizador
with open("cotizador_comercial_cp_edades.html", "r", encoding="utf-8") as f:
    cot_html = f.read()
    
m_cot = re.search(r'const\s+DATA\s*=\s*(\{.*?\});', cot_html, re.DOTALL)
if m_cot:
    cot_data = m_cot.group(1)
    
# Read Patologias
with open("buscador patologias/buscador_patologias_base_interna_v2.html", "r", encoding="utf-8") as f:
    pat_html = f.read()

m_pat = re.search(r'const\s+PATHOLOGIES_BASE\s*=\s*(\{.*?\});', pat_html, re.DOTALL)
if m_pat:
    pat_data = m_pat.group(1)
    
script = f"""
// === AUTO-INJECTED ADESLAS DATA === //
const ADESLAS_COT_DATA = {cot_data};
const ADESLAS_PAT_DATA = {pat_data};
const PLATFORM_DATA_TEXT = `--- BASE DE DATOS DE PRECIOS, EDADES Y ZONAS (COTIZADOR) ---
Aplica esta tabla para calcular precios según producto, edad y zona postal. El formato incluye tramos de edades [min, max] y precios.
${{JSON.stringify(ADESLAS_COT_DATA)}}

--- DICCIONARIO MÉDICO (BUSCADOR DE PATOLOGÍAS) ---
Listado de patologías con su estado de contratación (ACEPTADO, EXCLUSIÓN, RECHAZO, EN VALORACIÓN MÉDICA) y comentarios.
${{JSON.stringify(ADESLAS_PAT_DATA)}}`;
// ================================== //
"""

with open("fackbot.html", "r", encoding="utf-8") as f:
    fack_html = f.read()

# Replace the old fetchPlatformData logic
fack_html = re.sub(
    r'let PLATFORM_DATA_TEXT = "";.*?fetchPlatformData\(\);\s*', 
    script, 
    fack_html, 
    flags=re.DOTALL
)

with open("fackbot.html", "w", encoding="utf-8") as f:
    f.write(fack_html)

print("Actualizado!")
