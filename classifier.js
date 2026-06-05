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

    // Señales estructurales (presencia)
    meta.tiene_firma  = /\bfirma\b|\bfirmado\b|firma\s+responsable/i.test(t);
    meta.tiene_sello  = /\bsello\b|sellado/i.test(t);
    meta.tiene_membrete = /universidad de costa rica|\bucr\b|vicerrector|rector|facultad de|escuela de|oficina de/i.test(n);
    meta.tiene_codigo = /\b[A-Z]{2,6}-\d{2,}[-\/A-Z0-9]*/.test(t); // p.ej. CUSED-TPC-2018

    return meta;
  }

  // ---- Clasificación por reglas ----------------------------------------------
  // Devuelve lista ordenada [{serie, score, evidencia[]}] y confianza calibrada.
  function clasificar(texto, meta) {
    const n = norm(texto);
    meta = meta || {};
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

  return { norm, extraerMetadatos, clasificar };
})();

if (typeof module !== "undefined") { module.exports = { Clasificador }; }
