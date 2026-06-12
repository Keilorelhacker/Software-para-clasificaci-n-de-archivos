/* =============================================================================
 * SACD-Local · Clasificador por reglas + extractor de metadatos
 * Fase 1 del proyecto: clasificación interpretable basada en reglas/keywords.
 * Diseñado para ser reemplazable por un modelo ML (TF-IDF / embeddings) sin
 * cambiar el resto de la app (M13 / MLOps).
 * ============================================================================= */

const Clasificador = (() => {

  // Normaliza: minúsculas, sin tildes, espacios colapsados
  function norm(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ---- Tokens relevantes (para la memoria de aprendizaje) ---------------------
  const STOPWORDS = new Set(("de la el los las un una unos unas y o u e en del al que con por para se su sus es son era fue han hay como mas pero esta este estos estas aquel ser estar sobre entre desde hasta cuando donde quien cual cuyo les nos asi cada todo toda todos todas tambien sin segun ante bajo tras durante mediante muy ya no si dicho dicha mismo misma cualquier respecto presente mediante siguiente anterior numero fecha senor senora don dona usted").split(" "));

  // Extrae los términos más frecuentes y distintivos del texto (candidatos a aprender)
  function tokensRelevantes(texto, max = 20) {
    const n = norm(texto);
    const freq = {};
    for (const w of n.split(/[^a-z0-9ñ]+/)) {
      if (w.length < 5) continue;          // muy corto: poco informativo
      if (STOPWORDS.has(w)) continue;       // palabra vacía
      if (/^\d+$/.test(w)) continue;        // solo dígitos
      freq[w] = (freq[w] || 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([w]) => w);
  }

  // ---- Extracción de metadatos por regex --------------------------------------
  function extraerMetadatos(textoOriginal) {
    const t = textoOriginal || "";
    const n = norm(t);
    const meta = {};

    // Fechas: dd/mm/aaaa, dd-mm-aaaa, "12 de marzo de 2025"
    const fechaNum = t.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
    const meses = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
    const fechaTxt = n.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${meses})\\s+de\\s+(\\d{4})`));
    if (fechaNum) meta.fecha = fechaNum[0];
    else if (fechaTxt) meta.fecha = fechaTxt[0];

    // Número de oficio / acta / expediente / resolución / circular
    const patrones = {
      n_oficio:      /\b(oficio)\s*(n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{2,})/i,
      n_acta:        /\b(acta)\s*(n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{1,})/i,
      n_expediente:  /\b(expediente|exp\.?)\s*(n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{2,})/i,
      n_resolucion:  /\b(resoluci[oó]n)\s*(n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{1,})/i,
      n_circular:    /\b(circular)\s*(n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{1,})/i,
      n_factura:     /\b(factura)\s*(n[°ºo.]*)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{2,})/i,
    };
    for (const [k, re] of Object.entries(patrones)) {
      const m = t.match(re);
      if (m) meta[k] = (m[3] || m[0]).trim();
    }

    // --- Nuevos parámetros de caracterización (v2) ---------------------------

    // Montos: ₡, colones, dólares, formatos numéricos con separadores
    const monto = t.match(/(?:₡|\$|¢|crc|usd|colones)\s*[\d.,]{3,}|[\d]{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\s*(?:colones|dolares|dólares)/i);
    if (monto) meta.monto = monto[0].trim();

    // Cédula costarricense: 1-2345-6789 / 9 dígitos / jurídica 3-101-XXXXXX
    const cedula = t.match(/\b\d-\d{4}-\d{4}\b|\b\d{1,2}-\d{3,4}-\d{3,6}\b/);
    if (cedula) meta.cedula = cedula[0];

    // Correo electrónico y teléfono (excluye falsos positivos tipo "2025-0341" de números de oficio)
    const correo = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (correo) meta.correo = correo[0];
    const tels = t.match(/\b(?:\+?506[\s-]?)?[2678]\d{3}[\s-]?\d{4}\b/g) || [];
    const tel = tels.find(x => !/^(19|20)\d{2}/.test(x.replace(/^\+?506[\s-]?/, "")));
    if (tel) meta.telefono = tel;

    // Año del documento (más reciente entre 1980-2039 encontrado)
    const anios = t.match(/\b(19[89]\d|20[0-3]\d)\b/g);
    if (anios) meta.anio = anios.sort().pop();

    // Tipo documental explícito (encabezado típico)
    const tipos = ["memorando","memorandum","oficio","circular","acta","resolucion","resolución","contrato","convenio","informe","factura","boleta","recibo","certificacion","certificación","constancia","solicitud","expediente","comprobante","acuerdo","directriz","reglamento","addendum","adenda"];
    for (const tp of tipos) { if (n.includes(norm(tp))) { meta.tipoDocumental = tp; break; } }

    // Destinatario / remitente (líneas "PARA:", "DE:", "Señor(a)", "Estimado(a)")
    const dest = t.match(/(?:^|\n)\s*(?:para|a)\s*:\s*(.{4,60})/i);
    if (dest) meta.destinatario = dest[1].trim().split("\n")[0];
    const remi = t.match(/(?:^|\n)\s*de\s*:\s*(.{4,60})/i);
    if (remi) meta.remitente = remi[1].trim().split("\n")[0];

    // Características estructurales del texto
    const palabras = n.split(/\s+/).filter(Boolean);
    meta.numPalabras = palabras.length;
    const digitos = (t.match(/\d/g) || []).length;
    meta.densidadNumerica = t.length ? Number((digitos / t.length).toFixed(3)) : 0; // alta → tablas/contable
    meta.tieneTabla = /\t.*\t|\s{4,}\S+\s{4,}\S+/.test(t) || meta.densidadNumerica > 0.15;
    meta.tieneListado = /(?:^|\n)\s*(?:\d+[\.\)]|[-•*])\s+\S/m.test(t);

    // Señales estructurales (presencia)
    meta.tiene_firma  = /\bfirma\b|\bfirmado\b|firma\s+responsable/i.test(t);
    meta.tiene_sello  = /\bsello\b|sellado/i.test(t);
    meta.tiene_membrete = /universidad de costa rica|\bucr\b|vicerrector|rector|facultad de|escuela de|oficina de/i.test(n);
    meta.tiene_codigo = /\b[A-Z]{2,6}-\d{2,}[-\/A-Z0-9]*/.test(t); // p.ej. CUSED-TPC-2018

    return meta;
  }

  // ---- Clasificación por reglas + memoria de aprendizaje ----------------------
  // aprendizaje: { serieId: { terminos: {token: peso}, muestras } } — derivado de
  // validaciones humanas previas. Refuerza series que humanos confirmaron con
  // textos similares. Devuelve lista ordenada y confianza calibrada.
  function clasificar(texto, meta, aprendizaje) {
    const n = norm(texto);
    meta = meta || {};
    aprendizaje = aprendizaje || {};
    const resultados = [];

    for (const s of SERIES) {
      let score = 0;
      const evidencia = [];

      // Coincidencia por nombre (peso alto)
      const nombreNorm = norm(s.nombre);
      const tokensNombre = nombreNorm.split(" ").filter(w => w.length > 4);
      for (const tk of tokensNombre) {
        if (n.includes(tk)) { score += 1.2; evidencia.push(tk); }
      }

      // Otras denominaciones (aka) — peso alto
      for (const a of (s.aka || [])) {
        if (n.includes(norm(a))) { score += 2.0; evidencia.push(a); }
      }

      // Keywords/expresiones (peso medio-alto; expresiones largas valen más)
      for (const kw of (s.keywords || [])) {
        const k = norm(kw);
        if (n.includes(k)) {
          score += k.includes(" ") ? 2.2 : 1.4;
          evidencia.push(kw);
        }
      }

      // Señales estructurales esperadas (refuerzo leve)
      for (const sig of (s.senales || [])) {
        if (sig === "firma" && meta.tiene_firma) { score += 0.4; }
        if (sig === "sello" && meta.tiene_sello) { score += 0.4; }
        if (sig === "membrete" && meta.tiene_membrete) { score += 0.3; }
      }

      // Tipo documental explícito coincide con el nombre de la serie (refuerzo)
      if (meta.tipoDocumental && nombreNorm.includes(norm(meta.tipoDocumental))) {
        score += 1.5; evidencia.push("tipo: " + meta.tipoDocumental);
      }

      // ★ Memoria de aprendizaje: términos validados por humanos para esta serie.
      // Contribución acotada (máx +3.0) para que el aprendizaje complemente y no
      // domine a las reglas oficiales del catálogo.
      const apr = aprendizaje[s.id];
      if (apr && apr.terminos) {
        let aporteApr = 0;
        for (const [tok, peso] of Object.entries(apr.terminos)) {
          if (peso > 0 && n.includes(tok)) {
            aporteApr += Math.min(peso, 5) * 0.35;
            if (evidencia.length < 14) evidencia.push("★" + tok);
          }
        }
        score += Math.min(aporteApr, 3.0);
      }

      if (score > 0) resultados.push({ serie: s, score, evidencia: [...new Set(evidencia)] });
    }

    resultados.sort((a, b) => b.score - a.score);

    // Confianza calibrada (heurística): combina score absoluto del 1° y su
    // separación respecto del 2°. Acotada a [0,1].
    let confianza = 0;
    if (resultados.length) {
      const top = resultados[0].score;
      const segundo = resultados[1] ? resultados[1].score : 0;
      const sat = Math.min(top / 6, 1);             // saturación por evidencia acumulada
      const margen = top > 0 ? (top - segundo) / top : 0; // separación con el 2°
      confianza = Math.max(0, Math.min(1, 0.55 * sat + 0.45 * margen));
    }

    return {
      sugerida: resultados[0] ? resultados[0].serie : null,
      confianza: Number(confianza.toFixed(2)),
      evidencia: resultados[0] ? resultados[0].evidencia.slice(0, 8) : [],
      ranking: resultados.slice(0, 5),
      esConfidencial: resultados[0] && SERIES_CONFIDENCIALES.includes(resultados[0].serie.id),
    };
  }

  return { norm, extraerMetadatos, clasificar, tokensRelevantes };
})();

if (typeof module !== "undefined") { module.exports = { Clasificador }; }
