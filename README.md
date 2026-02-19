# Cotizador-Adeslas (deploy limpio)

Proyecto estático (HTML/CSS/JS + assets) listo para GitHub + Vercel.

## Entrada (Vercel)
- `index.html` (raíz) redirige automáticamente a: `cotizador_comercial_cp_edades.html`

## Estructura
- HTML principales: `*.html`
- Excel soporte: `*.xlsx`
- PDF FAQ: `faq/faq.pdf`
- Buscador: `buscador patologias/buscador_patologias_base_interna_v2.html`

## Deploy en Vercel
1. Importar repo desde GitHub.
2. Framework: **Other / Static** (si pregunta).
3. Deploy.  
Si sale 404, este repo incluye `vercel.json` forzando `/` -> `index.html`.

## Local
```bash
cd CotizadorAdeslas
python3 -m http.server 8000
```
Abrir: `http://localhost:8000`
