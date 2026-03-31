function isProductAllowed(productName, ages) {
    if (!ages || ages.length === 0) return true;
    
    // Normalizar edades (limpiar invalidas)
    const validAges = ages.filter(a => typeof a === 'number');
    const countIf = (predicate) => validAges.filter(predicate).length;
    
    // Helper para lógica de suma (Go, Plena, etc.)
    const sumLogic = (maxAgeNormal, penaltyAge) => {
        let sum = 0;
        for (let age of validAges) {
            if (age > penaltyAge) sum += -3;
            else if (age > maxAgeNormal) sum += 0;
            else sum += 1;
        }
        return sum >= 0;
    };

    // Helper para lógica de ratio 3x (Plena Vital, NIF, etc)
    const ratioLogic = (triggerAge1, triggerAge2, youngAge) => {
        // e.g., >70 allowed if <60 >= 3* >70
        // Wait, the rule is: IF(COUNT(>70)>0, IF(COUNT(<60) < 3*COUNT(>70), -1, 1), 1)
        if (countIf(a => a > triggerAge1) > 0) {
            if (countIf(a => a < youngAge) < 3 * countIf(a => a > triggerAge2)) {
                return false; // -1
            }
        }
        return true;
    };

    const n = productName.toLowerCase();

    if (n.includes("go")) return sumLogic(59, 70);
    if (n.includes("plena plus") || n === "adeslas plena" || n === "plena" || n === "plena 2") return sumLogic(59, 70);
    if (n.includes("pymes total")) return sumLogic(59, 67);
    if (n === "adeslas plena total" || n === "plena total" || n === "plena total 2") return sumLogic(59, 62);
    
    if (n.includes("plena vital")) return ratioLogic(70, 70, 60);
    if (n.includes("cif") && !n.includes("extra")) return ratioLogic(67, 67, 60);
    if (n.includes("empresas") && !n.includes("extra")) return ratioLogic(67, 67, 60);
    if (n.includes("extra empresas")) return ratioLogic(67, 67, 60);
    if (n.includes("extra negocios nif")) return ratioLogic(69, 69, 60);
    if (n.includes("plena extra 150")) return ratioLogic(64, 64, 60);
    if (n.includes("plena total vital")) return ratioLogic(62, 62, 60);
    if (n.includes("negocios nif") || (n.includes("nif") && !n.includes("extra"))) {
        if (countIf(a => a > 70) > 0) {
            if (countIf(a => a <= 60) < 3 * countIf(a => a >= 70)) return false;
        }
        return true;
    }
    if (n.includes("extra negocios cif") || n.includes("extra cif")) {
        // =IF(COUNT(Cotizador!I6:I13)>4,-1,1)
        return validAges.length <= 4;
    }
    
    if (n === "adeslas seniors" || n === "seniors" || n === "seniors 2") {
        let count50plus = countIf(a => a >= 50);
        let count54plus = countIf(a => a > 54);
        let count55plus = countIf(a => a >= 55);
        let countUnder55 = countIf(a => a < 55);
        
        if ((count50plus - count54plus > 0) && (count55plus > 0)) {
            return true;
        } else {
            return (countUnder55 > 0) ? false : true;
        }
    }
    
    if (n === "adeslas plena total seniors" || n === "seniors total" || n === "seniors total 2") {
        if (countIf(a => a > 84) > 0) return false;
        
        // IF(AND(AND(COUNTIF(>=60),COUNTIF(<=62))>0,COUNTIF(>=63)>0,COUNTIF(<60)=0),1,-1)
        // This is weird in Excel. "AND(COUNTIF(>=60),COUNTIF(<=62))" evaluates to True if both are non-zero.
        let count60plus = countIf(a => a >= 60);
        let count62under = countIf(a => a <= 62);
        let cond1 = (count60plus > 0 && count62under > 0);
        // BUT actually COUNT(>=60) and COUNT(<=62) means there is someone >=60 AND there is someone <= 62.
        // It's meant to say: Is there someone between 60-62?
        // Wait, looking at the Excel literally:
        // AND(COUNTIF(>=60),COUNTIF(<=62))>0
        // Usually COUNTIF returns a number. AND(num1, num2) returns TRUE if both > 0.
        // TRUE in math is 1. 1 > 0 is TRUE.
        // So yes, it means AT LEAST ONE person >= 60 AND AT LEAST ONE person <= 62 must exist.
        // Wait, if Everyone is 65. COUNT(>=60)=n, COUNT(<=62)=0. AND is False.
        
        let count63plus = countIf(a => a >= 63);
        let countUnder60 = countIf(a => a < 60);
        
        if (cond1 && count63plus > 0 && countUnder60 === 0) return true;
        return false;
    }
    
    return true;
}

console.log("30,40,50,60,70,80")
console.log("Go", isProductAllowed("Go", [30,40,50,60,70,80]))
console.log("Plena Total", isProductAllowed("Plena Total", [30,40,50,60,70,80]))
console.log("Seniors", isProductAllowed("Adeslas Seniors", [30,40,50,60,70,80]))
console.log("Plena Total Seniors", isProductAllowed("Adeslas Plena Total Seniors", [30,40,50,60,70,80]))
console.log("Plena Vital", isProductAllowed("Plena Vital", [30,40,50,60,70,80]))

