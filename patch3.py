import json
with open('data_autogen.js') as f:
    t = f.read().replace('const DATA = ', '').rstrip(';')
    data = json.loads(t)

for k, v in data['product_rules'].items():
    print(f"{k}: k8_applies = {v.get('k8_applies')}")
