import re

with open("fackbot.html", "r", encoding="utf-8") as f:
    text = f.read()

# Fix the syntax error in ADESLAS_PAT_DATA
# Change "const ADESLAS_PAT_DATA = { \n //...\n const PATHOLOGIES_BASE = {"
# To just start with the object
text = re.sub(
    r'const\s+ADESLAS_PAT_DATA\s*=\s*\{\s*//[^}]+const\s+PATHOLOGIES_BASE\s*=\s*\{',
    r'const ADESLAS_PAT_DATA = {',
    text
)

# And the ending `}; \n const PLATFORM_DATA_TEXT =` was correct because I replaced the entire PLATFORM_DATA_TEXT section.
with open("fackbot.html", "w", encoding="utf-8") as f:
    f.write(text)
    
print("Fixed")
