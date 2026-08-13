// ============================================================
// pricing-engine.js — Motor de precios COMPARTIDO (navegador + Node)
// Fuente de verdad única: replica la lógica de computeProduct del cotizador.
// Se alimenta de DATA (data_autogen.js) y, opcionalmente, de las promos
// (para aplicar el descuento de campaña, igual que la web).
// ============================================================
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.PricingEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const PAY_DISCOUNT = { mensual: 0, trimestral: 2, semestral: 4, anual: 6 };

  function roundPrice(val) { return Math.round((val + Number.EPSILON) * 100) / 100; }
  function applyDiscount(value, discountPct) { const d = (discountPct || 0) / 100; return value * (1 - d); }
  function isGOProduct(p) { const s = String(p || "").trim().toLowerCase(); return s === "go" || s.startsWith("go "); }

  function getProvCodeFromCP(cp5) { if (!/^[0-9]{5}$/.test(cp5)) return ""; return cp5.slice(0, 2); }
  function resolveZone(DATA, cp5) {
    const provCode = getProvCodeFromCP(cp5);
    if (!provCode) return null;
    const rec = DATA.cp_map[provCode];
    if (!rec) return null;
    return { provCode, provincia: rec.provincia, zonaRaw: rec.zona, zona: (rec.zona === 0 ? 1 : rec.zona), fallback: (rec.zona === 0) };
  }

  function getPrice(DATA, base, zone, age) {
    const key = base + " " + zone;
    const rows = DATA.price_table[key] || null;
    if (!rows) return "No asegurable";
    for (const r of rows) { if (age >= r.min && age <= r.max) return r.price; }
    return "No asegurable";
  }

  function getProductConstraints(DATA, product) {
    let rules = DATA.product_rules[product];
    if (!rules) {
      if (product.includes("Extra Negocios NIF")) rules = DATA.product_rules["Extra Negocios NIF"];
      else rules = { age_min: 0, age_max: 120, multi_discount: null, annual_discount: 0, payment: "any", ratio_rule: null, k6_applies: false, pensionista_excluded: false, pensionista_discount: false };
    }
    return { minAge: rules.age_min, maxAge: rules.age_max, onlyMonthly: rules.payment === "monthly_only", label: product, rawRules: rules };
  }

  // --- Reglas de contratación (verbatim del cotizador) ---
  function isProductAllowed(productName, ages) {
    if (!ages || ages.length === 0) return true;
    const validAges = ages.filter(a => typeof a === "number");
    const countIf = (predicate) => validAges.filter(predicate).length;

    const sumLogic = (maxAgeNormal, penaltyAge) => {
      let sum = 0;
      for (let age of validAges) {
        if (age > penaltyAge) sum += -3;
        else if (age > maxAgeNormal) sum += 0;
        else sum += 1;
      }
      if (sum < 0) return { ok: false, reason: `Apto si hay 3 menores de ${maxAgeNormal + 1} años por cada mayor de ${penaltyAge}` };
      return { ok: true };
    };

    const ratioLogic = (triggerAge1, triggerAge2, youngAge) => {
      if (countIf(a => a > triggerAge1) > 0) {
        if (countIf(a => a < youngAge) < 3 * countIf(a => a > triggerAge2)) {
          return { ok: false, reason: `Apto si hay 3 menores de ${youngAge} años por cada mayor de ${triggerAge2}` };
        }
      }
      return { ok: true };
    };

    const n = productName.toLowerCase();
    if (n.includes("go")) return sumLogic(59, 70);
    if (n.includes("plena plus") || n === "adeslas plena" || n === "plena" || n === "plena 2") return sumLogic(59, 70);
    if (n.includes("pymes total")) return sumLogic(59, 67);
    if (n === "adeslas plena total" || n === "plena total" || n === "plena total 2") return sumLogic(59, 62);

    if (n === "plena vital" || n === "adeslas plena vital") return ratioLogic(70, 70, 60);
    if (n.includes("cif") && !n.includes("extra")) return ratioLogic(67, 67, 60);
    if (n.includes("empresas") && !n.includes("extra")) return ratioLogic(67, 67, 60);
    if (n.includes("extra empresas")) return ratioLogic(67, 67, 60);
    if (n.includes("extra negocios nif")) return ratioLogic(70, 70, 60);
    if (n.includes("plena extra 150")) return ratioLogic(64, 64, 60);
    if (n.includes("plena total vital")) return ratioLogic(62, 62, 60);

    if (n.includes("negocios nif") || (n.includes("nif") && !n.includes("extra"))) {
      if (countIf(a => a > 70) > 0) {
        if (countIf(a => a <= 60) < 3 * countIf(a => a > 70)) {
          return { ok: false, reason: "Apto si hay 3 menores de 60 por cada mayor de 70 años" };
        }
      }
      return { ok: true };
    }

    if (n.includes("extra negocios cif") || n.includes("extra cif")) {
      if (validAges.length > 4) return { ok: false, reason: "Máximo 4 personas en total" };
      return { ok: true };
    }

    const isSeniorsTotal = n.includes("seniors total") || n.includes("plena total seniors");
    const isSeniorsNormal = n.includes("seniors") && !isSeniorsTotal;

    if (isSeniorsNormal) {
      let cUnder50 = countIf(a => a < 50);
      if (cUnder50 > 0) return { ok: false, reason: "No apto: Seniors no permite menores de 50 años" };
      let c55 = countIf(a => a >= 55), cUnder55 = countIf(a => a < 55);
      if (c55 === 0) return { ok: false, reason: "Apto si hay al menos una persona con 55 años o más" };
      if (cUnder55 > 1) return { ok: false, reason: "Solo se permite un acompañante menor de 55 años" };
      return { ok: true };
    }

    if (isSeniorsTotal) {
      if (countIf(a => a < 60) > 0) return { ok: false, reason: "No apto: Seniors Total no permite menores de 60 años" };
      if (countIf(a => a > 84) > 0) return { ok: false, reason: "Edad máxima permitida: 84 años" };
      let has63plus = countIf(a => a >= 63 && a <= 84) > 0;
      if (!has63plus) return { ok: false, reason: "Seniors Total requiere al menos un asegurado entre 63 y 84 años" };
      return { ok: true };
    }

    return { ok: true };
  }

  // --- Campaña (solo el % de descuento; la parte de meses gratis es display) ---
  function isPromoValidForEffectiveDate(promo, effectiveDateStr) {
    if (!promo) return false;
    const start = promo.startDate || "", end = promo.endDate || "";
    if (!start && !end) return true;
    if (!effectiveDateStr) return true;
    if (start && effectiveDateStr < start) return false;
    if (end && effectiveDateStr > end) return false;
    return true;
  }
  function loadActiveCampaign(promos, effectiveDate) {
    const active = (promos || []).filter(p => p && p.active).filter(p => isPromoValidForEffectiveDate(p, effectiveDate));
    return active.find(p => p.type === "campaign" && p.campaign) || null;
  }
  function mapProductToCampaignCategory(product, withDental) {
    const p = (product || "").toLowerCase();
    if (p === "go" || p.startsWith("go ")) return "go";
    if (p.includes("nif")) return "nif";
    if (p.includes("pymes total")) return "pymes_total";
    if (p.includes("plena total seniors")) return "plena_total_seniors";
    if (p.includes("plena total")) return "plena_total";
    return withDental ? "gama_con_dental" : "gama_sin_dental";
  }
  function getCampaignBucket(n) { if (n <= 1) return "1"; if (n === 2) return "2"; return "3+"; }
  function getCampaignRule(campaign, product, numInsured, withDental) {
    if (!campaign || !campaign.campaign || !campaign.campaign.rules) return null;
    const cat = mapProductToCampaignCategory(product, withDental);
    if (!cat) return null;
    if (cat === "go") return { category: "go", bucket: "all", months: 0, discount: 0 };
    if (cat === "nif") { const discount = numInsured <= 3 ? 5 : 10; return { category: "nif", bucket: numInsured <= 3 ? "1-3" : "4+", months: 0, discount }; }
    if (cat === "pymes_total") { const discount = numInsured <= 3 ? 5 : 15; return { category: "pymes_total", bucket: numInsured <= 3 ? "1-3" : "4+", months: 0, discount }; }
    const rules = campaign.campaign.rules[cat];
    if (!rules) return null;
    const bucket = getCampaignBucket(numInsured);
    const r = rules[bucket] || { months: 0, discount: 0 };
    return { category: cat, bucket, months: r.months || 0, discount: r.discount || 0 };
  }

  // --- Núcleo: replica computeProduct del cotizador ---
  function computeProduct(DATA, product, state) {
    if (!state.ages.length) return { ok: false, reason: "Faltan datos", product };

    const numAseguradosTotal = state.ages.length;
    const constraints = getProductConstraints(DATA, product);
    const rules = constraints.rawRules;

    const k6_val = (DATA.discounts && DATA.discounts.k6 !== undefined) ? DATA.discounts.k6 : 0;
    const k8_val = (DATA.discounts && DATA.discounts.k8 !== undefined) ? DATA.discounts.k8 : 0;
    const pensionista = (DATA.discounts && DATA.discounts.pensionista) || false;

    if (pensionista && rules.pensionista_excluded) return { ok: false, reason: "Producto no disponible para pensionistas", product };

    let productLookup = rules.base_name || product;
    if (product === "Adeslas Extra NIF") {
      productLookup = (numAseguradosTotal <= 2) ? "Extra Negocios NIF_1_2" : "Extra Negocios NIF_3_plus";
    }

    let multiFactor = 1.0;
    const _pnLow = (product || "").toLowerCase();
    const _isPlenaTotalNoSeniors = _pnLow.includes("plena total") && !_pnLow.includes("seniors");
    const _skipMultiForCampaign = _isPlenaTotalNoSeniors && numAseguradosTotal >= 3;
    if (rules.multi_discount && !_skipMultiForCampaign) {
      if (rules.multi_discount.threshold && numAseguradosTotal >= rules.multi_discount.threshold) {
        multiFactor = rules.multi_discount.factor;
      } else if (rules.multi_discount.graduated) {
        for (const level of rules.multi_discount.graduated) {
          if (numAseguradosTotal >= level.min_count) { multiFactor = level.factor; break; }
        }
      }
    }

    let pensFactor = 1.0;
    if (pensionista && rules.pensionista_discount) pensFactor = 0.94;
    let k6Factor = 1.0;
    if (rules.k6_applies && k6_val > 0) k6Factor = (1 - k6_val);

    let totalSinVal = 0, totalConVal = 0;
    const breakdown = [];
    const dentalKey = String(Math.min(numAseguradosTotal, 8));
    const dental_pp = (DATA.dental_per_person && DATA.dental_per_person[dentalKey]) || 0;
    const dental_total_for_group = (DATA.dental_total && DATA.dental_total[dentalKey]) || 0;

    const allowedCheck = isProductAllowed(product, state.ages);
    if (!allowedCheck.ok) return { ok: false, reason: allowedCheck.reason || "No cumple las reglas de contratación", product };

    for (const age of state.ages) {
      const basePrice = getPrice(DATA, productLookup, state.zona, age);
      const base = (basePrice === "No asegurable") ? 0 : basePrice;
      const discounted = base * multiFactor * pensFactor * k6Factor;
      totalSinVal += discounted;
      totalConVal += discounted;
      breakdown.push({ age, base, multi: multiFactor, pens: pensFactor, k6: k6Factor });
    }

    if (totalSinVal === 0) return { ok: false, reason: "No hay asegurables en este rango de edad", product };

    if (rules.dental_mode === "per_person_inherited" || rules.dental_mode === "per_person_direct") {
      totalConVal += dental_total_for_group;
    }

    let finalSin = totalSinVal, finalCon = totalConVal;

    if (rules.k8_applies && k8_val > 0) {
      let actualK8 = k8_val;
      if (rules.k8_applies === "double") actualK8 = k8_val * 2;
      finalSin *= (1 - actualK8);
      finalCon *= (1 - actualK8);
    }

    // Welcome/anual_only: precio de tabla ya es final anual, sin descuentos.
    const payDisc = rules.annual_only ? 0 : (PAY_DISCOUNT[state.pay] || 0);
    finalSin = applyDiscount(finalSin, payDisc);
    finalCon = applyDiscount(finalCon, payDisc);

    const isOnlyConDental = !!rules.only_con_dental;

    let effectiveDiscount = 0;
    if (!isGOProduct(product) && !rules.annual_only) {
      effectiveDiscount = state.discount || 0;
      finalSin = applyDiscount(finalSin, effectiveDiscount);
      finalCon = applyDiscount(finalCon, effectiveDiscount);
    }

    const campaign = (state.pay === "mensual" && !rules.annual_only) ? loadActiveCampaign(state.promos, state.effectiveDate) : null;
    let campaignDiscSin = 0, campaignDiscCon = 0;
    if (campaign) {
      const cr1 = getCampaignRule(campaign, product, numAseguradosTotal, false);
      const cr2 = getCampaignRule(campaign, product, numAseguradosTotal, true);
      campaignDiscSin = (cr1 && cr1.discount) || 0;
      campaignDiscCon = (cr2 && cr2.discount) || 0;
      if (campaignDiscSin > 0) finalSin = applyDiscount(finalSin, campaignDiscSin);
      if (campaignDiscCon > 0) finalCon = applyDiscount(finalCon, campaignDiscCon);
    }

    // Dental de NIF (total_at_end): importe FIJO, se suma DESPUÉS de todos los
    // descuentos (pago, comisión, campaña). El dental NO lleva descuento.
    if (rules.dental_mode === "total_at_end") finalCon = finalSin + dental_total_for_group;

    const showSin = isOnlyConDental ? null : roundPrice(finalSin);
    const showCon = isOnlyConDental ? roundPrice(finalSin) : roundPrice(finalCon);
    // Welcome/anual_only: el precio ya es anual (no multiplicar ×12).
    const annualMult = rules.annual_only ? 1 : 12;

    return {
      ok: true,
      product,
      numAsegurados: numAseguradosTotal,
      isOnlyConDental,
      monthlySin: showSin,
      monthlyCon: showCon,
      annualSin: showSin !== null ? roundPrice(finalSin * annualMult) : null,
      annualCon: roundPrice((isOnlyConDental ? finalSin : finalCon) * annualMult),
      manualDiscApplied: effectiveDiscount,
      campaignDiscSin,
      campaignDiscCon
    };
  }

  function quote(DATA, input) {
    const ages = (input.ages || []).filter(a => typeof a === "number" && !Number.isNaN(a));
    const cp = String(input.cp || "").trim();
    const z = resolveZone(DATA, cp);
    const state = {
      cp, ages,
      zona: z ? z.zona : null,
      pay: input.pay || "mensual",
      discount: input.discount || 0,
      effectiveDate: input.effectiveDate || null,
      promos: input.promos || []
    };
    const list = (input.products && input.products.length) ? input.products : DATA.products;
    const products = list.map(p => computeProduct(DATA, p, state));
    return {
      cp, zona: z ? z.zona : null, provincia: z ? z.provincia : null,
      numAsegurados: ages.length, pay: state.pay,
      zonaResuelta: !!z,
      products
    };
  }

  return { quote, computeProduct, resolveZone, getPrice, PAY_DISCOUNT, ENGINE_VERSION: "2026.1" };
});
