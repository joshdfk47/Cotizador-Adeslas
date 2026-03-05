import re

with open("fackbot.html", "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(
    r'const\s+ADESLAS_PAT_DATA\s*=\s*\{\s*//\s*"HELVETIA".*?const\s+PATHOLOGIES_BASE\s*=\s*\{',
    r'const ADESLAS_PAT_DATA = {',
    text,
    flags=re.DOTALL
)

with open("fackbot.html", "w", encoding="utf-8") as f:
    f.write(text)
    
print("Fixed")
