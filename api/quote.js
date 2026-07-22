// ============================================================
// /api/quote  —  Cotiza los 11 productos para un lead (CP + edades)
// y devuelve los precios ya mapeados a los campos de Zoho.
//   Entrada (GET query o POST json):
//     cp / Zip_Code   -> código postal (5 dígitos)
//     ages:[..] | Edad1..Edad4 -> edades
//     pay (opcional)  -> "mensual" (por defecto)
//   Cabecera: x-api-key: <QUOTE_API_KEY>
//   Lee las promos de Upstash (mismo store que /api/promos) para aplicar
//   el descuento de campaña igual que la web.
// ============================================================
const DATA = require("../data_autogen.js");
const engine = require("../pricing-engine.js");

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const API_KEY     = process.env.QUOTE_API_KEY || "";
const PROMOS_KEY  = "adeslas_promos_v1";

// Mapeo producto (motor) -> campos de Zoho (API names).
// Productos "solo con dental" tienen un único campo (usa el precio con dental).
const ZOHO_MAP = {
  "Adeslas NIF":                 { sin: "Precio_Aut_nomos1",     con: "Precio_Negocios_NIF_Dental" },
  "Adeslas Plena":               { sin: "Precio_Plena",          con: "Precio_Plena_Dental" },
  "Adeslas Plena Plus":          { sin: "Precio_Plena_Plus",     con: "Precio_Plena_Plus_Dental" },
  "Adeslas Plena Extra 150":     { sin: "Plena_Extra",           con: "Precio_Plena_Extra_Dental" },
  "Plena Vital":                 { sin: "Precio_Plena_Vital",    con: "Precio_Plena_Vital_Dental" },
  "Adeslas Seniors":             { sin: "Precio_Seniors",        con: "Precio_Seniors_Dental" },
  "Go":                          { sin: "Precio_GO1",            con: "Precio_GO_Dental" },
  "Adeslas Plena Total":         { single: "Precio_Plena_Total1" },
  "Plena Total Vital":           { single: "Precio_Plena_Total_Vital" },
  "Adeslas Plena Total Seniors": { single: "Precio_Seniors_Total" },
  "Adeslas Pymes TOTAL":         { single: "Precio_Pymes_Total" }
};

async function getPromos() {
  if (!REDIS_URL || !REDIS_TOKEN) return [];
  try {
    const r = await fetch(REDIS_URL + "/get/" + PROMOS_KEY, { headers: { Authorization: "Bearer " + REDIS_TOKEN } });
    const j = await r.json();
    if (j && typeof j.result === "string" && j.result.length) {
      try { return JSON.parse(j.result) || []; } catch (e) { return []; }
    }
  } catch (e) {}
  return [];
}

function safeJSON(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

function parseAges(input) {
  let ages = [];
  if (Array.isArray(input.ages)) ages = input.ages.slice();
  else {
    for (let i = 1; i <= 6; i++) {
      const v = input["Edad" + i] != null ? input["Edad" + i] : (input["edad" + i] != null ? input["edad" + i] : input["age" + i]);
      if (v != null && String(v).trim() !== "") ages.push(v);
    }
  }
  return ages.map(a => parseInt(a, 10)).filter(a => !Number.isNaN(a));
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const key = req.headers["x-api-key"] || (req.query && req.query.key) || "";
  if (!API_KEY || key !== API_KEY) { res.status(401).json({ error: "unauthorized" }); return; }

  const input = (req.method === "POST")
    ? (typeof req.body === "string" ? safeJSON(req.body) : (req.body || {}))
    : (req.query || {});

  const cp = String(input.cp || input.Zip_Code || input.zip || "").trim();
  const ages = parseAges(input);
  const pay = input.pay || "mensual";

  if (!/^[0-9]{5}$/.test(cp)) { res.status(400).json({ error: "cp_invalido", cp }); return; }
  if (!ages.length) { res.status(400).json({ error: "faltan_edades" }); return; }

  const promos = await getPromos();
  const result = engine.quote(DATA, { cp, ages, pay, promos });

  // Construir objeto plano de campos Zoho (API name -> valor, o null si no apto)
  const zohoFields = {};
  for (const p of result.products) {
    const map = ZOHO_MAP[p.product];
    if (!map) continue;
    if (map.single) {
      zohoFields[map.single] = p.ok ? p.monthlyCon : null;
    } else {
      zohoFields[map.sin] = p.ok ? p.monthlySin : null;
      zohoFields[map.con] = p.ok ? p.monthlyCon : null;
    }
  }

  res.status(200).json({
    ok: true,
    engineVersion: engine.ENGINE_VERSION,
    cp: result.cp,
    zona: result.zona,
    provincia: result.provincia,
    zonaResuelta: result.zonaResuelta,
    numAsegurados: result.numAsegurados,
    pay: result.pay,
    zohoFields,
    products: result.products
  });
};
