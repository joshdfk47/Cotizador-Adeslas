import json

with open("data_autogen.js", "r") as f:
    t = f.read().replace("const DATA = ", "").rstrip(";")
    data = json.loads(t)

def isProductAllowed(productName, ages):
    validAges = [a for a in ages if a is not None]
    if not validAges: return True
    
    def countIf(predicate): return len([a for a in validAges if predicate(a)])
    
    def sumLogic(maxAgeNormal, penaltyAge):
        s = 0
        for age in validAges:
            if age > penaltyAge: s += -3
            elif age > maxAgeNormal: s += 0
            else: s += 1
        return s >= 0

    def ratioLogic(triggerAge1, triggerAge2, youngAge):
        if countIf(lambda a: a > triggerAge1) > 0:
            if countIf(lambda a: a < youngAge) < 3 * countIf(lambda a: a > triggerAge2):
                return False
        return True

    n = productName.lower()
    if "go" in n: return sumLogic(59, 70)
    if "plena plus" in n or n in ["adeslas plena", "plena", "plena 2"]: return sumLogic(59, 70)
    if "pymes total" in n: return sumLogic(59, 67)
    if n in ["adeslas plena total", "plena total", "plena total 2"]: return sumLogic(59, 62)
    
    if "plena vital" in n: return ratioLogic(70, 70, 60)
    if "cif" in n and "extra" not in n: return ratioLogic(67, 67, 60)
    if "empresas" in n and "extra" not in n: return ratioLogic(67, 67, 60)
    if "extra empresas" in n: return ratioLogic(67, 67, 60)
    if "extra negocios nif" in n: return ratioLogic(69, 69, 60)
    if "plena extra 150" in n: return ratioLogic(64, 64, 60)
    if "plena total vital" in n: return ratioLogic(62, 62, 60)
    if "negocios nif" in n or ("nif" in n and "extra" not in n):
        if countIf(lambda a: a > 70) > 0:
            if countIf(lambda a: a <= 60) < 3 * countIf(lambda a: a >= 70): return False
        return True
    if "extra negocios cif" in n or "extra cif" in n: return len(validAges) <= 4
    if n in ["adeslas seniors", "seniors", "seniors 2", "adeslas senior"]:
        c50 = countIf(lambda a: a >= 50)
        c54 = countIf(lambda a: a > 54)
        c55 = countIf(lambda a: a >= 55)
        cUnder55 = countIf(lambda a: a < 55)
        if (c50 - c54 > 0) and (c55 > 0): return True
        return False if cUnder55 > 0 else True
    if n in ["adeslas plena total seniors", "seniors total", "seniors total 2"]:
        if countIf(lambda a: a > 84) > 0: return False
        cond1 = (countIf(lambda a: a >= 60) > 0 and countIf(lambda a: a <= 62) > 0)
        if cond1 and countIf(lambda a: a >= 63) > 0 and countIf(lambda a: a < 60) == 0: return True
        return False
    return True

ages = [30, 40, 50, 60, 70]
n = len(ages)
z = 2
def get_p(prod, zone, age):
    for r in data['price_table'].get(prod, {}).get(str(zone), []):
        if age >= r['min'] and age <= r['max']: return r['price']
    return None

for prod, rules in sorted(data['product_rules'].items()):
    lookup = rules.get('base_name', prod)
    if prod == "Adeslas Extra NIF":
        lookup = "Extra Negocios NIF_3_plus"
        
    if not isProductAllowed(prod, ages): 
        print(f"{prod}: NO CUMPLE CONDICIONES")
        continue

    bases = []
    for a in ages:
        p = get_p(lookup, z, a)
        if p is not None: bases.append(p)
        
    if not bases: 
        print(f"{prod}: SIN BASES VÁLIDAS")
        continue
    
    raw_sum = sum(bases)
    factor = 1.0
    md = rules.get('multi_discount')
    if md:
        if 'threshold' in md:
            if n >= md['threshold']: factor = md['factor'] # n = total ages entered
        elif 'graduated' in md:
            for level in md['graduated']:
                if n >= level['min_count']:
                    factor = level['factor']
                    break
                    
    sin = raw_sum * factor
    dp = data['dental_per_person'].get(str(n), 0)
    
    if rules.get('only_con_dental'):
        sin = None
        con = raw_sum * factor
    elif rules.get('dental_mode') == 'total_at_end':
        dt = data['dental_total'].get(str(n), 0)
        con = sin + dt
    elif rules.get('dental_mode') == 'none':
        con = None
    elif rules.get('dental_mode') == 'per_person_direct':
        con = sum(b + dp for b in bases)
    else:
        con = sin + dp * len(bases)

    print(f"{prod}: SIN={sin}, CON={con}")

