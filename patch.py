import json

with open("data_autogen.js", "r") as f:
    t = f.read().replace("const DATA = ", "").rstrip(";")
    d = json.loads(t)

print("Excepciones:")
for k,v in d['excepciones'].items():
    print(f"  {k}: {v}")
    
# Wait, if Excepciones is correctly loaded in JS, why did Plena Total show up in HTML?
# HTML screenshot: Plena Total = 1003.50.
# Excepciones: "Plena Total" = 0.
# VLOOKUP(...Excepciones)>=0 is True for 0!
# Why did Plena Total NOT show up in the USER's EXCEL screenshot?
# Let's count ages in Plena Total again:
# Plena Total: 0-24=85, 25-44=103, 45-54=124, 55-59=176, 60-62=217, 63-120=284.
# (85 * 0 + 103 * 2 + 124 * 1 + 176 * 0 + 217 * 1 + 284 * 2) = 1115. 
# 1115 * 0.9 = 1003.50.
# So Plena Total has NO "No asegurable" people.
# WHY DID EXCEL HIDE PLENA TOTAL IN USER'S SCREENSHOT?
