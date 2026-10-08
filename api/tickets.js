// ============================================================
// /api/tickets  —  Tickets de soporte (Upstash Redis + aviso por email)
// ------------------------------------------------------------
//   GET                      -> { tickets: [...] }  (más recientes primero)
//   POST { asunto, mensaje, ... }        -> crea el ticket y avisa por email
//   POST { action:"estado", id, estado } -> cambia el estado   (x-admin-secret)
//   POST { action:"borrar", id }         -> elimina el ticket  (x-admin-secret)
//
// Variables de entorno:
//   KV_REST_API_URL / KV_REST_API_TOKEN  -> Upstash (ya configurado)
//   PROMOS_ADMIN_SECRET                  -> clave de admin (cambiar estado/borrar)
//   RESEND_API_KEY                       -> envío de email (integración Resend)
//   TICKETS_TO    (opcional)             -> destinatario, por defecto ayuso@startend.es
//   TICKETS_FROM  (opcional)             -> remitente verificado en Resend
// Si RESEND_API_KEY no está, el ticket se guarda igual y se marca emailEnviado:false.
// ============================================================

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const ADMIN_SECRET = process.env.PROMOS_ADMIN_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const TICKETS_TO   = process.env.TICKETS_TO   || "ayuso@startend.es";
const TICKETS_FROM = process.env.TICKETS_FROM || "Tickets Cotizador <onboarding@resend.dev>";
const KEY = "adeslas_tickets_v1";
const MAX_TICKETS = 500;

async function redis(cmdPath, opts) {
  const r = await fetch(REDIS_URL + "/" + cmdPath, Object.assign({}, opts, {
    headers: Object.assign({ Authorization: "Bearer " + REDIS_TOKEN }, (opts && opts.headers) || {})
  }));
  const j = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error("redis " + r.status + " " + JSON.stringify(j));
  return j;
}

async function leerTickets() {
  const data = await redis("get/" + KEY);
  if (data && typeof data.result === "string" && data.result.length) {
    try { const v = JSON.parse(data.result); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  return [];
}

async function guardarTickets(tickets) {
  await redis("set/" + KEY, { method: "POST", body: JSON.stringify(tickets.slice(0, MAX_TICKETS)) });
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

async function enviarEmail(t) {
  if (!RESEND_API_KEY) return { enviado: false, motivo: "RESEND_API_KEY no configurada" };
  try {
    const html = `
      <div style="font-family:system-ui,sans-serif;font-size:14px;color:#1e293b">
        <h2 style="margin:0 0 12px">🎫 Nuevo ticket · ${esc(t.asunto)}</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
          <tr><td><b>De</b></td><td>${esc(t.usuario || "—")}</td></tr>
          <tr><td><b>Email</b></td><td>${esc(t.email || "—")}</td></tr>
          <tr><td><b>Categoría</b></td><td>${esc(t.categoria)}</td></tr>
          <tr><td><b>Prioridad</b></td><td>${esc(t.prioridad)}</td></tr>
          <tr><td><b>Página</b></td><td>${esc(t.pagina || "—")}</td></tr>
          <tr><td><b>Fecha</b></td><td>${esc(t.fecha)}</td></tr>
          <tr><td><b>Ref.</b></td><td>${esc(t.id)}</td></tr>
        </table>
        <p style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:12px">${esc(t.mensaje)}</p>
      </div>`;
    const body = {
      from: TICKETS_FROM,
      to: [TICKETS_TO],
      subject: `[Ticket ${t.prioridad}] ${t.asunto}`,
      html
    };
    if (t.email) body.reply_to = t.email;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { enviado: false, motivo: "resend " + r.status + " " + txt.slice(0, 200) };
    }
    return { enviado: true };
  } catch (e) {
    return { enviado: false, motivo: String((e && e.message) || e) };
  }
}

function safeJSON(s) { try { return JSON.parse(s); } catch (e) { return {}; } }

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(503).json({ error: "storage_not_configured" });
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json({ tickets: await leerTickets() });
      return;
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") body = safeJSON(body);
      body = body || {};
      const action = body.action || "crear";

      // --- Acciones de admin: cambiar estado o borrar ---
      if (action === "estado" || action === "borrar") {
        const secret = req.headers["x-admin-secret"] || "";
        if (!ADMIN_SECRET || secret !== ADMIN_SECRET) { res.status(401).json({ error: "unauthorized" }); return; }
        const tickets = await leerTickets();
        const i = tickets.findIndex(t => t.id === body.id);
        if (i === -1) { res.status(404).json({ error: "ticket_no_encontrado" }); return; }
        if (action === "borrar") tickets.splice(i, 1);
        else tickets[i].estado = String(body.estado || "abierto");
        await guardarTickets(tickets);
        res.status(200).json({ ok: true, tickets });
        return;
      }

      // --- Crear ticket ---
      const asunto = String(body.asunto || "").trim();
      const mensaje = String(body.mensaje || "").trim();
      if (!asunto || !mensaje) { res.status(400).json({ error: "faltan_asunto_o_mensaje" }); return; }

      const ticket = {
        id: "tk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        fecha: new Date().toISOString(),
        estado: "abierto",
        asunto: asunto.slice(0, 160),
        mensaje: mensaje.slice(0, 4000),
        categoria: String(body.categoria || "Otro").slice(0, 40),
        prioridad: String(body.prioridad || "Media").slice(0, 20),
        usuario: String(body.usuario || "").slice(0, 80),
        email: String(body.email || "").slice(0, 120),
        pagina: String(body.pagina || "").slice(0, 200)
      };

      const tickets = await leerTickets();
      tickets.unshift(ticket);

      const envio = await enviarEmail(ticket);
      ticket.emailEnviado = envio.enviado;
      if (!envio.enviado && envio.motivo) ticket.emailError = envio.motivo;

      await guardarTickets(tickets);
      res.status(200).json({ ok: true, ticket, email: envio });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
