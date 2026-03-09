import json
with open('data_autogen.js') as f:
    t = f.read().replace('const DATA = ', '').rstrip(';')
    data = json.loads(t)
    
# Let's see the rules generated for Seniors
for k, v in data['product_rules'].items():
    if k in ["Adeslas Seniors", "Adeslas Plena Total Seniors", "Adeslas Plena Total", "Adeslas Plena Total Vital"]:
        print(f"--- {k} ---")
        print(f"  age_min: {v.get('age_min')}")
        print(f"  age_max: {v.get('age_max')}")
        print(f"  allow_partial: {v.get('allow_partial', False)}")
        
