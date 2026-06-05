/* =============================================================================
 * SACD-Local · Capa de datos (IndexedDB) — 100% en el dispositivo, sin nube.
 * Stores: usuarios, campanas, documentos, lotes, eventos (auditoría), config.
 * La bitácora de eventos es append-only y encadenada por hash (anti-manipulación).
 * ============================================================================= */

const DB = (() => {
  const NAME = "sacd_local";
  const VERSION = 1;
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("usuarios"))
          db.createObjectStore("usuarios", { keyPath: "id" });
        if (!db.objectStoreNames.contains("campanas"))
          db.createObjectStore("campanas", { keyPath: "id" });
        if (!db.objectStoreNames.contains("documentos")) {
          const st = db.createObjectStore("documentos", { keyPath: "id" });
          st.createIndex("campana", "campanaId");
          st.createIndex("serie", "serieId");
          st.createIndex("codigo", "codigo", { unique: true });
        }
        if (!db.objectStoreNames.contains("lotes")) {
          const st = db.createObjectStore("lotes", { keyPath: "id" });
          st.createIndex("campana", "campanaId");
        }
        if (!db.objectStoreNames.contains("eventos")) {
          const st = db.createObjectStore("eventos", { keyPath: "seq", autoIncrement: true });
          st.createIndex("entidad", "entidadId");
        }
        if (!db.objectStoreNames.contains("config"))
          db.createObjectStore("config", { keyPath: "k" });
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function tx(store, mode) {
    return open().then(db => db.transaction(store, mode).objectStore(store));
  }

  const put = (store, val) => tx(store, "readwrite").then(st =>
    new Promise((res, rej) => { const r = st.put(val); r.onsuccess = () => res(val); r.onerror = () => rej(r.error); }));

  const get = (store, key) => tx(store, "readonly").then(st =>
    new Promise((res, rej) => { const r = st.get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));

  const all = (store) => tx(store, "readonly").then(st =>
    new Promise((res, rej) => { const r = st.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); }));

  const del = (store, key) => tx(store, "readwrite").then(st =>
    new Promise((res, rej) => { const r = st.delete(key); r.onsuccess = () => res(true); r.onerror = () => rej(r.error); }));

  // SHA-256 hex (WebCrypto)
  async function sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Registra un evento en la bitácora encadenada: hash_actual = SHA256(hash_prev + payload)
  async function registrarEvento(ev) {
    const eventos = await all("eventos");
    const prev = eventos.length ? eventos[eventos.length - 1].hash : "GENESIS";
    const base = {
      ts: new Date().toISOString(),
      usuario: ev.usuario || "desconocido",
      rol: ev.rol || "",
      accion: ev.accion,
      entidad: ev.entidad || "",
      entidadId: ev.entidadId || "",
      detalle: ev.detalle || {},
      campana: ev.campana || "",
    };
    base.hashPrev = prev;
    base.hash = await sha256(prev + JSON.stringify(base));
    return put("eventos", base);
  }

  // Verifica integridad de la cadena de auditoría
  async function verificarCadena() {
    const eventos = (await all("eventos")).sort((a, b) => a.seq - b.seq);
    let prev = "GENESIS";
    for (const e of eventos) {
      const copia = { ...e }; delete copia.seq;
      const h = copia.hash; delete copia.hash;
      const recalculo = await sha256(prev + JSON.stringify(copia));
      if (h !== recalculo) return { ok: false, rotoEn: e.seq };
      prev = h;
    }
    return { ok: true, total: eventos.length };
  }

  return { open, put, get, all, del, sha256, registrarEvento, verificarCadena };
})();

if (typeof module !== "undefined") { module.exports = { DB }; }
