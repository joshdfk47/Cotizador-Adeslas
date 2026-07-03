// ============================================================
// /api/promos  —  Estado GLOBAL de las promos (Upstash Redis via REST)
// ------------------------------------------------------------
//   GET   -> { promos: [...] | null }   (null si aún no se ha sembrado)
//   POST  -> guarda { promos: [...] }    (requiere cabecera x-admin-secret)
//
// Variables de entorno (las inyecta la integración de Upstash en Vercel):
//   KV_REST_API_URL / KV_REST_API_TOKEN   (o UPSTASH_REDIS_REST_URL / _TOKEN)
//   PROMOS_ADMIN_SECRET  -> clave para autorizar la escritura (la fijas tú)
// ============================================================

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const ADMIN_SECRET = process.env.PROMOS_ADMIN_SECRET || "";
const KEY = "adeslas_promos_v1";

async function redis(cmdPath, opts) {
  const r = await fetch(REDIS_URL + "/" + cmdPath, Object.assign({}, opts, {
    headers: Object.assign({ Authorization: "Bearer " + REDIS_TOKEN }, (opts && opts.headers) || {})
  }));
  const j = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error("redis " + r.status + " " + JSON.stringify(j));
  return j;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!REDIS_URL || !REDIS_TOKEN) {
    // Almacén todavía no configurado -> el cliente cae a su copia local.
    res.status(503).json({ error: "storage_not_configured" });
    return;
  }

  try {
    if (req.method === "GET") {
      const data = await redis("get/" + KEY);
      let promos = null;
      if (data && typeof data.result === "string" && data.result.length) {
        try { promos = JSON.parse(data.result); } catch (e) { promos = null; }
      }
      res.status(200).json({ promos: promos });
      return;
    }

    if (req.method === "POST") {
      const secret = req.headers["x-admin-secret"] || "";
      if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const promos = (body && Array.isArray(body.promos)) ? body.promos : [];
      await redis("set/" + KEY, { method: "POST", body: JSON.stringify(promos) });
      res.status(200).json({ ok: true, count: promos.length });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
