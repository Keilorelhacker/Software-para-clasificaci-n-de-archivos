/* =============================================================================
 * SACD-Local · Controlador principal
 * App local sin nube. Todo el procesamiento (OCR, clasificación, almacenamiento)
 * ocurre en el dispositivo. Diseñado bajo los parámetros de la Opción C
 * (PWA híbrida, local-first) y el catálogo oficial CUSED-TPC-2018 (UCR).
 * ============================================================================= */

const App = (() => {
  "use strict";

  const S = { usuario:null, campana:null, vista:"home", captura:null, ajustes:null };
  const $ = (sel, el=document) => el.querySelector(sel);
  const root = () => document.getElementById("app");

  // ---- utilidades ------------------------------------------------------------
  const uid = (p="id") => p+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const nowISO = () => new Date().toISOString();
  const fmt = (iso) => { try { return new Date(iso).toLocaleString("es-CR",{dateStyle:"medium",timeStyle:"short"}); } catch { return iso; } };
  const esc = (s) => (s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function toast(msg, type="") {
    const t = document.getElementById("toast");
    t.textContent = msg; t.className = "show "+type;
    clearTimeout(toast._t); toast._t = setTimeout(()=>t.className="", 3200);
  }

  function checkChar(s){ let n=0; for(const c of s) n=(n+c.charCodeAt(0))%36; return "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[n]; }

  const ROL_PERMISOS = {
    administrador:{capturar:true,cerrarLote:true,reportes:true,auditoria:true,admin:true},
    supervisor:   {capturar:true,cerrarLote:true,reportes:true,auditoria:true,admin:false},
    clasificador: {capturar:true,cerrarLote:false,reportes:false,auditoria:false,admin:false},
    auditor:      {capturar:false,cerrarLote:false,reportes:true,auditoria:true,admin:false},
  };
  const puede = (k) => S.usuario && ROL_PERMISOS[S.usuario.rol] && ROL_PERMISOS[S.usuario.rol][k];

  // ---- arranque --------------------------------------------------------------
  async function init() {
    await DB.open();
    // ajustes por defecto
    S.ajustes = (await DB.get("config","ajustes")) || { k:"ajustes", umbral:0.60, capacidadCaja:50, institucion:"INST" };
    await DB.put("config", S.ajustes);
    // sembrar admin inicial
    const usuarios = await DB.all("usuarios");
    if (!usuarios.length) {
      await DB.put("usuarios", { id:uid("u"), nombre:"Administrador Local", rol:"administrador", pinHash:null, creado:nowISO() });
    }
    renderLogin();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("service-worker.js").catch(()=>{});
    }
  }

  // ---- LOGIN -----------------------------------------------------------------
  async function renderLogin() {
    const usuarios = await DB.all("usuarios");
    root().innerHTML = `
      <div class="login-wrap">
        <div class="card login-card">
          <div class="seal">SA</div>
          <h2 class="title" style="text-align:center;margin:0">¡Bienvenido/a a SACD‑Local!</h2>
          <p class="sub" style="text-align:center">Sistema de Apoyo a la Clasificación Documental. Seleccione su usuario para comenzar.</p>
          <label class="fld">Persona usuaria
            <select id="lg-user">${usuarios.map(u=>`<option value="${u.id}">${esc(u.nombre)} — ${u.rol}</option>`).join("")}</select>
          </label>
          <div id="lg-pin-wrap" class="hidden">
            <label class="fld">PIN (4 dígitos)<input id="lg-pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></label>
          </div>
          <button class="btn block accent" id="lg-enter">Ingresar</button>
        </div>
      </div>`;
    const sel = $("#lg-user");
    const refreshPin = async () => {
      const u = usuarios.find(x=>x.id===sel.value);
      $("#lg-pin-wrap").classList.toggle("hidden", !(u && u.pinHash));
    };
    sel.addEventListener("change", refreshPin); refreshPin();
    $("#lg-enter").addEventListener("click", async () => {
      const u = usuarios.find(x=>x.id===sel.value);
      if (!u) return;
      if (u.pinHash) {
        const pin = $("#lg-pin").value.trim();
        const h = await DB.sha256("pin:"+pin);
        if (h !== u.pinHash) return toast("PIN incorrecto","err");
      }
      S.usuario = u;
      await DB.registrarEvento({ usuario:u.nombre, rol:u.rol, accion:"inicio_sesion", entidad:"usuario", entidadId:u.id });
      S.vista = "home"; renderShell();
    });
  }

  // ---- SHELL + RUTEO ---------------------------------------------------------
  function renderShell() {
    const tabs = [
      {id:"home", ic:"📁", t:"Campañas"},
      {id:"captura", ic:"📷", t:"Capturar", req:"capturar"},
      {id:"lotes", ic:"📦", t:"Cajas"},
      {id:"buscar", ic:"🔎", t:"Buscar"},
      {id:"mas", ic:"≡", t:"Más"},
    ].filter(x=>!x.req || puede(x.req));

    root().innerHTML = `
      <header class="masthead">
        <div class="row between">
          <div class="brand">SACD‑Local<small>Clasificación documental · sin nube</small></div>
          <button class="btn ghost sm" style="color:var(--paper);border-color:#3a352d" id="logout">Salir</button>
        </div>
        <div class="ctx">
          <span class="chip">👤 <b>${esc(S.usuario.nombre)}</b> · ${S.usuario.rol}</span>
          ${S.campana?`<span class="chip">📁 <b>${esc(S.campana.nombre)}</b></span>`:`<span class="chip">Sin campaña activa</span>`}
        </div>
      </header>
      <main id="main"></main>
      <nav class="tabbar">${tabs.map(x=>`<button data-tab="${x.id}" class="${S.vista===x.id?"active":""}"><span class="ic">${x.ic}</span>${x.t}</button>`).join("")}</nav>`;

    $("#logout").addEventListener("click", async ()=>{ 
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"cierre_sesion"});
      S.usuario=null;S.campana=null;S.captura=null; renderLogin(); 
    });
    root().querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{ S.vista=b.dataset.tab; route(); }));
    route();
  }

  function route() {
    root().querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active", b.dataset.tab===S.vista));
    const v = { home:viewHome, captura:viewCaptura, lotes:viewLotes, buscar:viewBuscar, mas:viewMas }[S.vista] || viewHome;
    v();
  }
  const setMain = (html) => { $("#main").innerHTML = `<section class="view">${html}</section>`; };

  // ---- VISTA: CAMPAÑAS -------------------------------------------------------
  async function viewHome() {
    const camps = await DB.all("campanas");
    setMain(`
      <h2 class="title">Campañas de clasificación</h2>
      <p class="sub">Una campaña agrupa los documentos de una oficina o proyecto y define la caja destino.</p>
      <div class="card">
        <h3>Nueva campaña</h3>
        <label class="fld">Nombre<input id="c-nombre" placeholder="Ej. Oficina de Suministros 2026"></label>
        <label class="fld">Código corto<input id="c-cod" placeholder="Ej. OSUM" maxlength="8"></label>
        <label class="fld">Ubicación física<input id="c-ubi" placeholder="Ej. Edificio A, bodega 2"></label>
        <label class="fld">Departamento receptor<input id="c-dep" placeholder="Ej. AUROL / Archivo Central"></label>
        <label class="fld">Capacidad por caja (documentos)<input id="c-cap" type="number" value="${S.ajustes.capacidadCaja}" min="1"></label>
        <button class="btn block accent" id="c-crear">Crear campaña</button>
      </div>
      <h3 style="font-family:var(--serif)">Campañas existentes</h3>
      ${camps.length? camps.map(c=>{ const esActiva = S.campana&&S.campana.id===c.id; return `
        <div class="list-item" style="${esActiva?'border:2px solid var(--teal);background:var(--teal-l);':''}">
          <div class="dot" style="${esActiva?'background:var(--teal);color:#fff;':''}">📁</div>
          <div class="grow">
            <div class="t">${esc(c.nombre)} ${esActiva?'<span class="badge teal">● Activa</span>':'<span class="badge gray">○ Inactiva</span>'}</div>
            <div class="m"><span class="code">${esc(c.codigo)}</span> · ${esc(c.deptoReceptor||"—")} · ${c.contador||0} doc. · Cap. caja: ${c.capacidadCaja}</div>
          </div>
          <button class="btn sm ${esActiva?'ghost':'accent'}" data-sel="${c.id}" ${esActiva?'disabled':''}>
            ${esActiva?'✓ Activa':'Activar'}
          </button>
        </div>`; }).join("") : `<p class="sub">Aún no hay campañas. Cree la primera arriba.</p>`}
    `);
    $("#c-crear").addEventListener("click", async ()=>{
      const nombre=$("#c-nombre").value.trim(), codigo=$("#c-cod").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
      if(!nombre||!codigo) return toast("Nombre y código son obligatorios","err");
      const btn = $("#c-crear");
      btn.disabled = true; btn.textContent = "Guardando…";
      const camp={ id:uid("camp"), nombre, codigo, ubicacion:$("#c-ubi").value.trim(),
        deptoReceptor:$("#c-dep").value.trim(), capacidadCaja:parseInt($("#c-cap").value)||S.ajustes.capacidadCaja,
        contador:0, creada:nowISO(), creadaPor:S.usuario.nombre };
      await DB.put("campanas",camp);
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"crear_campana",entidad:"campana",entidadId:camp.id,detalle:{nombre,codigo}});
      S.campana=camp; toast("✓ Campaña creada y activada","ok"); viewHome();
    });
    root().querySelectorAll("[data-sel]").forEach(b=>b.addEventListener("click",async()=>{
      S.campana = camps.find(c=>c.id===b.dataset.sel); renderShell(); toast("Campaña activada","ok");
    }));
  }

  // ---- VISTA: CAPTURA (flujo por pasos) -------------------------------------
  function viewCaptura() {
    if(!puede("capturar")) return setMain(`<div class="warn">Su rol (${S.usuario.rol}) no captura documentos.</div>`);
    if(!S.campana) return setMain(`<div class="warn">Seleccione o cree una campaña en la pestaña <b>Campañas</b> antes de capturar.</div>`);
    if(!S.captura) S.captura={ paso:1 };
    const p=S.captura.paso;
    if(p===1) return pasoCaptura();
    if(p===2) return pasoQC();
    if(p===3) return pasoOCR();
    if(p===4) return pasoValidar();
    if(p===5) return pasoResultado();
  }

  function pasoCaptura() {
    setMain(`
      <h2 class="title">1 · Capturar documento</h2>
      <p class="sub">Campaña activa: <b>${esc(S.campana.nombre)}</b></p>
      <div class="card">
        ${S.captura.img?`<img class="preview" src="${S.captura.img}">`:`<div class="drop">📷<br>Tome la foto o seleccione una imagen del documento físico.</div>`}
        <div class="row wrap" style="margin-top:12px">
          <label class="btn accent" style="flex:1">📷 Cámara
            <input id="cap-cam" type="file" accept="image/*" capture="environment" class="hidden"></label>
          <label class="btn ghost" style="flex:1">🖼️ Galería / escáner
            <input id="cap-file" type="file" accept="image/*" class="hidden"></label>
        </div>
      </div>
      ${S.captura.img?`<button class="btn block teal" id="cap-next">Continuar al control de calidad →</button>`:""}
      <button class="btn block ghost" id="cap-cancel" style="margin-top:8px">Cancelar</button>
    `);
    const onFile=(e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader();
      r.onload=()=>{ S.captura.img=r.result; viewCaptura(); }; r.readAsDataURL(f); };
    $("#cap-cam").addEventListener("change",onFile);
    $("#cap-file").addEventListener("change",onFile);
    if($("#cap-next")) $("#cap-next").addEventListener("click",()=>{ S.captura.paso=2; analizarCalidad().then(viewCaptura); });
    $("#cap-cancel").addEventListener("click",()=>{ S.captura=null; S.vista="home"; route(); });
  }

  // Control de calidad de imagen: brillo medio y nitidez (proxy de Laplaciano)
  function analizarCalidad() {
    return new Promise(res=>{
      const im=new Image();
      im.onload=()=>{
        const W=Math.min(480, im.width), H=Math.round(im.height*(W/im.width));
        const c=document.createElement("canvas"); c.width=W;c.height=H;
        const ctx=c.getContext("2d"); ctx.drawImage(im,0,0,W,H);
        const d=ctx.getImageData(0,0,W,H).data;
        const gray=new Float32Array(W*H); let sum=0;
        for(let i=0,j=0;i<d.length;i+=4,j++){ const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; gray[j]=g; sum+=g; }
        const brillo=sum/(W*H);
        // varianza del gradiente (nitidez)
        let m=0,m2=0,n=0;
        for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
          const k=y*W+x; const lap=4*gray[k]-gray[k-1]-gray[k+1]-gray[k-W]-gray[k+W];
          m+=lap;m2+=lap*lap;n++;
        }
        const varianza=(m2/n)-(m/n)*(m/n);
        S.captura.qc={ brillo:Math.round(brillo), nitidez:Math.round(varianza),
          okBrillo:brillo>60&&brillo<225, okNitidez:varianza>80 };
        res();
      };
      im.src=S.captura.img;
    });
  }

  function pasoQC() {
    const q=S.captura.qc||{};
    const buena=q.okBrillo&&q.okNitidez;
    setMain(`
      <h2 class="title">2 · Control de calidad</h2>
      <div class="card">
        <img class="preview" src="${S.captura.img}" style="aspect-ratio:auto;max-height:220px;object-fit:contain">
        <div style="margin-top:12px">
          <div class="qc-line"><span>Iluminación</span><b>${q.brillo} ${q.okBrillo?'<span class="badge teal">OK</span>':'<span class="badge rust">Revisar</span>'}</b></div>
          <div class="qc-line"><span>Nitidez (enfoque)</span><b>${q.nitidez} ${q.okNitidez?'<span class="badge teal">OK</span>':'<span class="badge rust">Borrosa</span>'}</b></div>
        </div>
        ${buena?`<p class="sub" style="margin-top:12px">Imagen apta para OCR.</p>`
               :`<div class="warn" style="margin-top:12px">La imagen podría dificultar el OCR: ${!q.okBrillo?'mejore la iluminación':''}${(!q.okBrillo&&!q.okNitidez)?' y ':''}${!q.okNitidez?'evite el movimiento / acerque y enfoque':''}. Recomendado repetir captura.</div>`}
      </div>
      <button class="btn block ${buena?'teal':'accent'}" id="qc-ocr">${buena?'Aplicar OCR →':'Continuar de todos modos →'}</button>
      <button class="btn block ghost" id="qc-retake" style="margin-top:8px">↺ Repetir captura</button>
    `);
    $("#qc-ocr").addEventListener("click",()=>{ S.captura.paso=3; viewCaptura(); ejecutarOCR(); });
    $("#qc-retake").addEventListener("click",()=>{ S.captura={paso:1}; viewCaptura(); });
  }

  // Preprocesa: genera DOS versiones para el OCR —
  //  (a) gris + estiramiento de contraste, (b) binarizada con umbral de Otsu —
  // y un thumbnail comprimido. La binarización suele mejorar mucho el OCR en
  // documentos impresos; la versión gris es respaldo para fotos con sombras.
  function preprocesar(dataUrl, maxW=1600){
    return new Promise(res=>{
      const im=new Image();
      im.onload=()=>{
        const W=Math.min(maxW,im.width), H=Math.round(im.height*(W/im.width));
        const c=document.createElement("canvas"); c.width=W;c.height=H;
        const ctx=c.getContext("2d"); ctx.drawImage(im,0,0,W,H);
        const img=ctx.getImageData(0,0,W,H), d=img.data;

        // 1) Gris + estiramiento de contraste
        let min=255,max=0;
        const gray=new Uint8ClampedArray(W*H);
        for(let i=0,j=0;i<d.length;i+=4,j++){ const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; gray[j]=g; if(g<min)min=g; if(g>max)max=g; }
        const rng=Math.max(1,max-min);
        for(let j=0;j<gray.length;j++) gray[j]=Math.max(0,Math.min(255,((gray[j]-min)/rng)*255));
        for(let i=0,j=0;i<d.length;i+=4,j++){ d[i]=d[i+1]=d[i+2]=gray[j]; }
        ctx.putImageData(img,0,0);
        const procGris=c.toDataURL("image/jpeg",0.85);

        // 2) Binarización con umbral de Otsu (separa tinta/papel automáticamente)
        const hist=new Array(256).fill(0);
        for(let j=0;j<gray.length;j++) hist[gray[j]|0]++;
        const total=gray.length;
        let sumAll=0; for(let t=0;t<256;t++) sumAll+=t*hist[t];
        let sumB=0,wB=0,bestVar=-1,umbral=127;
        for(let t=0;t<256;t++){
          wB+=hist[t]; if(!wB) continue;
          const wF=total-wB; if(!wF) break;
          sumB+=t*hist[t];
          const mB=sumB/wB, mF=(sumAll-sumB)/wF;
          const between=wB*wF*(mB-mF)*(mB-mF);
          if(between>bestVar){ bestVar=between; umbral=t; }
        }
        const img2=ctx.getImageData(0,0,W,H), d2=img2.data;
        for(let i=0,j=0;i<d2.length;i+=4,j++){ const v=gray[j]>umbral?255:0; d2[i]=d2[i+1]=d2[i+2]=v; }
        ctx.putImageData(img2,0,0);
        const procBin=c.toDataURL("image/jpeg",0.9);

        // 3) Thumbnail para almacenamiento eficiente (desde la versión gris)
        const c3=document.createElement("canvas");
        const tw=Math.min(900,W), th=Math.round(H*(tw/W));
        c3.width=tw;c3.height=th;
        const im3=new Image();
        im3.onload=()=>{ c3.getContext("2d").drawImage(im3,0,0,tw,th);
          res({ procGris, procBin, thumb: c3.toDataURL("image/jpeg",0.6) }); };
        im3.src=procGris;
      };
      im.src=dataUrl;
    });
  }

  function pasoOCR() {
    setMain(`
      <h2 class="title">3 · Lectura y clasificación</h2>
      <div class="card">
        <p id="ocr-status">Procesando imagen…</p>
        <div class="meter"><i id="ocr-bar" style="width:8%;background:var(--ochre)"></i></div>
        <p class="sub" id="ocr-hint" style="margin-top:10px">El OCR se ejecuta en este dispositivo. La primera vez necesita Internet para descargar el idioma; luego funciona sin conexión.</p>
      </div>`);
  }

  // Carga toda la memoria de aprendizaje como mapa { serieId: registro }
  async function cargarAprendizaje(){
    const regs = await DB.all("aprendizaje");
    const map = {};
    for(const r of regs) map[r.serieId] = r;
    return map;
  }

  async function ejecutarOCR() {
    const setStatus=(t,p)=>{ const s=$("#ocr-status"),b=$("#ocr-bar"); if(s)s.textContent=t; if(b&&p!=null)b.style.width=Math.round(p*100)+"%"; };
    const { procGris, procBin, thumb } = await preprocesar(S.captura.img);
    S.captura.thumb = thumb;
    let texto="", ocrConf=0;
    try {
      if (typeof Tesseract === "undefined") throw new Error("sin-ocr");
      // Pasada 1: imagen binarizada (Otsu) — suele dar la mejor lectura en documentos
      setStatus("Reconociendo texto (OCR en español)…",0.15);
      const r1 = await Tesseract.recognize(procBin, "spa", {
        logger:m=>{ if(m.status==="recognizing text") setStatus("Reconociendo texto…",0.15+0.5*m.progress); }
      });
      texto = (r1.data && r1.data.text) || "";
      ocrConf = (r1.data && r1.data.confidence) || 0;
      // Pasada 2 (solo si la lectura fue pobre): reintenta con la versión en gris,
      // útil cuando hay sombras o iluminación irregular que arruinan la binarización
      if (ocrConf < 55) {
        setStatus("Lectura difícil: reintentando con ajuste alternativo…",0.7);
        const r2 = await Tesseract.recognize(procGris, "spa", {
          logger:m=>{ if(m.status==="recognizing text") setStatus("Segunda lectura…",0.7+0.25*m.progress); }
        });
        const conf2 = (r2.data && r2.data.confidence) || 0;
        if (conf2 > ocrConf) { texto = (r2.data && r2.data.text) || texto; ocrConf = conf2; }
      }
    } catch(e) {
      // Fallback: sin OCR disponible → entrada manual de texto
      S.captura.texto=""; S.captura.sinOCR=true; S.captura.paso=4; return viewCaptura();
    }
    S.captura.texto = texto;
    S.captura.ocrConfianza = Math.round(ocrConf);
    setStatus("Clasificando…",0.95);
    const meta = Clasificador.extraerMetadatos(texto);
    const aprendizaje = await cargarAprendizaje();
    const clas = Clasificador.clasificar(texto, meta, aprendizaje);
    S.captura.meta = meta; S.captura.clas = clas;
    S.captura.paso=4; viewCaptura();
  }

  function selectSeries(selId){
    return `<select id="${selId}">${SERIES.map(s=>`<option value="${s.id}">${esc(s.id)} · ${esc(s.nombre)}</option>`).join("")}</select>`;
  }

  // Panel de metadatos detectados (caracterización ampliada del documento)
  function renderMetadatos(meta){
    meta = meta || {};
    const items = [
      meta.tipoDocumental && ["Tipo", meta.tipoDocumental],
      meta.fecha && ["Fecha", meta.fecha],
      meta.anio && ["Año", meta.anio],
      meta.n_oficio && ["Oficio", meta.n_oficio],
      meta.n_expediente && ["Expediente", meta.n_expediente],
      meta.n_acta && ["Acta", meta.n_acta],
      meta.n_resolucion && ["Resolución", meta.n_resolucion],
      meta.n_circular && ["Circular", meta.n_circular],
      meta.n_factura && ["Factura", meta.n_factura],
      meta.monto && ["Monto", meta.monto],
      meta.cedula && ["Cédula", meta.cedula],
      meta.correo && ["Correo", meta.correo],
      meta.telefono && ["Teléfono", meta.telefono],
      meta.destinatario && ["Para", meta.destinatario],
      meta.remitente && ["De", meta.remitente],
    ].filter(Boolean);
    const senales = [
      meta.tiene_firma && "firma",
      meta.tiene_sello && "sello",
      meta.tiene_membrete && "membrete institucional",
      meta.tieneTabla && "estructura tabular/contable",
      meta.tieneListado && "listado",
    ].filter(Boolean);
    if(!items.length && !senales.length) return "";
    return `<div class="kv" style="margin-top:6px"><b>Caracterización del documento:</b></div>
      ${items.map(([k,v])=>`<div class="qc-line"><span>${esc(k)}</span><b style="font-size:.8rem;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v)}</b></div>`).join("")}
      ${senales.length?`<div class="kv" style="margin-top:6px"><small class="muted">Señales: ${senales.map(esc).join(" · ")}</small></div>`:""}`;
  }

  function pasoValidar() {
    const c=S.captura, clas=c.clas, meta=c.meta||{};
    const baja = !clas || clas.confianza < S.ajustes.umbral;
    const conf = clas? Math.round(clas.confianza*100):0;
    const color = conf>=Math.round(S.ajustes.umbral*100)?'var(--teal)':conf>=40?'var(--amber)':'var(--rust)';
    setMain(`
      <h2 class="title">4 · Validación humana</h2>
      ${c.sinOCR?`<div class="warn">OCR no disponible en esta sesión. Escriba o pegue el texto clave del documento para clasificar, o seleccione la serie manualmente.</div>
        <label class="fld">Texto del documento<textarea id="man-text" rows="4" placeholder="Encabezado, palabras clave…"></textarea></label>
        <button class="btn sm accent" id="man-clas">Clasificar texto</button><hr class="sep">`:""}
      ${clas&&clas.sugerida?`
      <div class="card">
        <div class="row between"><h3 style="margin:0">Sugerencia del sistema</h3>
          ${clas.esConfidencial?'<span class="badge rust">Confidencial</span>':''}</div>
        <div class="t" style="font-size:1.05rem;font-weight:700;margin:6px 0">${esc(clas.sugerida.id)} · ${esc(clas.sugerida.nombre)}</div>
        <div class="row between" style="align-items:flex-end;margin:6px 0 4px"><span class="sub" style="margin:0">Confianza</span><span class="conf-num" style="color:${color}">${conf}%</span></div>
        <div class="meter"><i style="width:${conf}%;background:${color}"></i></div>
        ${baja?`<div class="warn" style="margin-top:10px">Confianza por debajo del umbral (${Math.round(S.ajustes.umbral*100)}%). Verifique y corrija antes de confirmar. <b>Su decisión alimentará la memoria del clasificador.</b></div>`:""}
        ${clas.evidencia.length?`<div class="evidence" style="margin-top:10px"><small class="muted">Evidencia (★ = término aprendido de validaciones previas):</small><br>${clas.evidencia.map(e=>`<span>${esc(e)}</span>`).join("")}</div>`:""}
        <div class="kv" style="margin-top:10px"><b>Retención:</b> ${esc(clas.sugerida.plazo)} · <b>Valor C-C:</b> ${esc(clas.sugerida.valorCC)}</div>
        ${c.ocrConfianza!=null?`<div class="kv"><b>Calidad de lectura OCR:</b> ${c.ocrConfianza}%${c.ocrConfianza<55?' <span class="badge rust">baja</span>':c.ocrConfianza<75?' <span class="badge ochre">media</span>':' <span class="badge teal">buena</span>'}</div>`:""}
      </div>`:`<div class="warn">No se obtuvo una sugerencia automática. Seleccione la serie manualmente. <b>Su decisión alimentará la memoria del clasificador.</b></div>`}

      <div class="card">
        <h3>Decisión</h3>
        <label class="fld">Serie documental final ${selectSeries("val-serie")}</label>
        <label class="fld">Criterio / observación (opcional)<input id="val-crit" placeholder="Motivo de la corrección o nota"></label>
        ${renderMetadatos(meta)}
        <div class="row wrap" style="margin-top:10px">
          <button class="btn teal" style="flex:1" id="val-ok">✓ Confirmar clasificación</button>
          <button class="btn rust" style="flex:1" id="val-rej">✕ Rechazar / revisión manual</button>
        </div>
      </div>
      <button class="btn block ghost" id="val-cancel">Cancelar documento</button>
    `);
    if(clas&&clas.sugerida) $("#val-serie").value=clas.sugerida.id;
    if(c.sinOCR&&$("#man-clas")) $("#man-clas").addEventListener("click",async()=>{
      const txt=$("#man-text").value; const m=Clasificador.extraerMetadatos(txt);
      const apr=await cargarAprendizaje();
      S.captura.texto=txt; S.captura.meta=m; S.captura.clas=Clasificador.clasificar(txt,m,apr); S.captura.sinOCR=false; viewCaptura();
    });
    $("#val-ok").addEventListener("click",()=>confirmarDocumento($("#val-serie").value,$("#val-crit").value,false));
    $("#val-rej").addEventListener("click",()=>confirmarDocumento($("#val-serie").value,$("#val-crit").value,true));
    $("#val-cancel").addEventListener("click",()=>{ S.captura=null; S.vista="home"; route(); });
  }

  async function asignarLote(serieId, rechazado){
    const lotes=(await DB.all("lotes")).filter(l=>l.campanaId===S.campana.id);
    const targetSerie = rechazado? "REVISION" : serieId;
    let lote=lotes.find(l=>l.serieId===targetSerie && l.estado==="abierto" && l.docCount<l.capacidad);
    if(!lote){
      const nCaja=lotes.length+1;
      lote={ id:uid("lote"), campanaId:S.campana.id, serieId:targetSerie,
        codigoCaja:`${S.campana.codigo}-CJ-${String(nCaja).padStart(3,"0")}`,
        capacidad:S.campana.capacidadCaja||S.ajustes.capacidadCaja, docCount:0, estado:"abierto",
        creado:nowISO(), creadoPor:S.usuario.nombre };
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"abrir_lote",entidad:"lote",entidadId:lote.id,campana:S.campana.nombre,detalle:{caja:lote.codigoCaja,serie:targetSerie}});
    }
    lote.docCount++; await DB.put("lotes",lote); return lote;
  }

  // ★ Retroalimentación: aprende de las validaciones humanas.
  // Se activa cuando hubo intervención humana significativa:
  //   - corrección (la sugerencia era otra serie), o
  //   - confirmación con confianza baja (el sistema "dudó" y el humano decidió).
  // Extrae los términos distintivos del texto y refuerza su asociación con la
  // serie elegida; si hubo corrección, penaliza levemente esos términos en la
  // serie sugerida erróneamente. Los pesos se acotan para evitar sobreajuste.
  async function aprenderDeValidacion(serieCorrectaId, serieSugeridaId, texto, accion){
    if(!texto || texto.trim().length < 30) return 0; // texto insuficiente para aprender
    const tokens = Clasificador.tokensRelevantes(texto, 15);
    if(!tokens.length) return 0;

    // Refuerzo positivo en la serie validada por el humano
    let reg = (await DB.get("aprendizaje", serieCorrectaId)) ||
              { serieId: serieCorrectaId, terminos: {}, muestras: 0 };
    for(const tk of tokens){
      reg.terminos[tk] = Math.min((reg.terminos[tk] || 0) + 1, 10); // techo de peso
    }
    reg.muestras++; reg.actualizado = nowISO();
    await DB.put("aprendizaje", reg);

    // Penalización suave en la serie sugerida erróneamente (solo correcciones)
    if(accion === "corregida" && serieSugeridaId && serieSugeridaId !== serieCorrectaId){
      let regNeg = await DB.get("aprendizaje", serieSugeridaId);
      if(regNeg && regNeg.terminos){
        for(const tk of tokens){
          if(regNeg.terminos[tk] != null){
            regNeg.terminos[tk] = Math.max(regNeg.terminos[tk] - 0.5, 0);
            if(regNeg.terminos[tk] === 0) delete regNeg.terminos[tk];
          }
        }
        regNeg.actualizado = nowISO();
        await DB.put("aprendizaje", regNeg);
      }
    }
    return tokens.length;
  }

  async function confirmarDocumento(serieId, criterio, rechazado){
    const c=S.captura, clas=c.clas;
    const serie=SERIES.find(s=>s.id===serieId);
    const accion = rechazado?"rechazada":(clas&&clas.sugerida&&clas.sugerida.id===serieId?"aceptada":"corregida");
    // código único
    S.campana.contador=(S.campana.contador||0)+1;
    const body=`${S.ajustes.institucion}-${S.campana.codigo}-${new Date().getFullYear()}-${String(S.campana.contador).padStart(6,"0")}`;
    const codigo=`${body}-${checkChar(body)}`;
    const lote=await asignarLote(serieId,rechazado);
    const doc={ id:uid("doc"), codigo, campanaId:S.campana.id, campanaNombre:S.campana.nombre,
      serieId:rechazado?null:serieId, serieNombre:rechazado?"(revisión manual)":(serie?serie.nombre:serieId),
      estado:rechazado?"revision_manual":"clasificado",
      confianza: clas?clas.confianza:0, ocrConfianza: c.ocrConfianza!=null?c.ocrConfianza:null,
      sugeridaId: clas&&clas.sugerida?clas.sugerida.id:null,
      accionHumana:accion, criterio:criterio||"", meta:c.meta||{}, textoOCR:(c.texto||"").slice(0,4000),
      thumb:c.thumb||null, loteId:lote.id, codigoCaja:lote.codigoCaja,
      capturadoPor:S.usuario.nombre, capturadoEn:nowISO(),
      confidencial: (clas&&clas.esConfidencial) || (serie&&SERIES_CONFIDENCIALES.includes(serie.id)) || false };
    await DB.put("documentos",doc);
    await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"clasificar_documento",
      entidad:"documento",entidadId:doc.id,campana:S.campana.nombre,
      detalle:{codigo,serie:doc.serieNombre,accion,confianza:doc.confianza,caja:lote.codigoCaja,sugerida:doc.sugeridaId}});
    await DB.put("campanas",S.campana);

    // ★ Retroalimentación del clasificador: corrección, o aceptación con duda
    const huboValidacionSignificativa = !rechazado &&
      (accion==="corregida" || (clas && clas.confianza < S.ajustes.umbral));
    if(huboValidacionSignificativa){
      const nTerm = await aprenderDeValidacion(serieId, doc.sugeridaId, c.texto, accion);
      if(nTerm){
        await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,
          accion:"aprendizaje_actualizado",entidad:"serie",entidadId:serieId,
          campana:S.campana.nombre,detalle:{terminos:nTerm,origen:accion,codigo}});
        toast(`✓ El clasificador aprendió ${nTerm} término(s) de su validación`,"ok");
      }
    }

    S.captura.doc=doc; S.captura.lote=lote; S.captura.paso=5; viewCaptura();
  }

  function pasoResultado() {
    const {doc,lote}=S.captura;
    setMain(`
      <h2 class="title">Documento registrado</h2>
      <div class="card" style="text-align:center">
        <div class="seal" style="background:var(--teal)">✓</div>
        <p class="sub" style="margin:6px 0">Código único del documento</p>
        <div class="code" style="font-size:1.05rem">${esc(doc.codigo)}</div>
        <hr class="sep">
        <p style="margin:0">Colóquelo físicamente en la caja:</p>
        <div class="code" style="font-size:1.4rem;color:var(--ochre-d)">${esc(lote.codigoCaja)}</div>
        <p class="sub">${esc(doc.serieNombre)} · ${lote.docCount}/${lote.capacidad} en la caja</p>
      </div>
      <button class="btn block accent" id="r-label">🏷️ Generar etiqueta de la caja</button>
      <button class="btn block teal" id="r-next" style="margin-top:8px">📷 Capturar siguiente documento</button>
      <button class="btn block ghost" id="r-done" style="margin-top:8px">Terminar</button>
    `);
    $("#r-label").addEventListener("click",()=>generarEtiqueta(lote));
    $("#r-next").addEventListener("click",()=>{ S.captura={paso:1}; viewCaptura(); });
    $("#r-done").addEventListener("click",()=>{ S.captura=null; S.vista="lotes"; route(); });
  }

  // ---- ETIQUETA QR (imprimible) ---------------------------------------------
  async function generarEtiqueta(lote){
    const camp=await DB.get("campanas",lote.campanaId);
    const serie=SERIES.find(s=>s.id===lote.serieId);
    const payload=`SACD|caja=${lote.codigoCaja}|camp=${camp.codigo}|serie=${lote.serieId}|f=${new Date().toISOString().slice(0,10)}`;
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>Etiqueta ${lote.codigoCaja}</title>
      <style>body{font-family:system-ui;margin:0;padding:24px;color:#1c1a17}
      .lbl{border:3px solid #1c1a17;border-radius:12px;padding:20px;max-width:420px;margin:auto}
      .hd{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#9c6212}
      .cj{font-family:ui-monospace,monospace;font-size:2rem;font-weight:800;margin:4px 0}
      .qr{display:flex;justify-content:center;margin:14px 0}
      table{width:100%;font-size:.85rem;border-collapse:collapse} td{padding:3px 0;border-bottom:1px dashed #ccc}
      td:first-child{color:#666;width:40%}
      @media print{button{display:none}}</style></head>
      <body><div class="lbl"><div class="hd">SACD · Etiqueta de caja</div>
      <div class="cj">${lote.codigoCaja}</div><div class="qr" id="qr"></div>
      <table>
        <tr><td>Serie</td><td>${serie?serie.id+" · "+serie.nombre:lote.serieId}</td></tr>
        <tr><td>Campaña</td><td>${camp.nombre} (${camp.codigo})</td></tr>
        <tr><td>Receptor</td><td>${camp.deptoReceptor||"—"}</td></tr>
        <tr><td>Retención</td><td>${serie?serie.plazo:"—"}</td></tr>
        <tr><td>Documentos</td><td>${lote.docCount}</td></tr>
        <tr><td>Estado</td><td>${lote.estado}</td></tr>
      </table>
      <p style="font-size:.7rem;color:#888;text-align:center;margin-top:12px">Generada ${new Date().toLocaleString("es-CR")}</p>
      <button onclick="window.print()" style="width:100%;padding:12px;margin-top:10px;border:none;border-radius:10px;background:#bd7a1f;color:#fff;font-weight:700">Imprimir</button>
      </div>
      <script src="lib/qrcode.min.js"><\/script>
      <script>new QRCode(document.getElementById("qr"),{text:${JSON.stringify(payload)},width:150,height:150,correctLevel:QRCode.CorrectLevel.M});<\/script>
      </body></html>`);
    w.document.close();
    await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"generar_etiqueta",entidad:"lote",entidadId:lote.id,detalle:{caja:lote.codigoCaja}});
  }

  // ---- VISTA: CAJAS / LOTES --------------------------------------------------
  async function viewLotes() {
    if(!S.campana) return setMain(`<div class="warn">Seleccione una campaña para ver sus cajas.</div>`);
    const lotes=(await DB.all("lotes")).filter(l=>l.campanaId===S.campana.id);
    setMain(`
      <h2 class="title">Cajas físicas</h2>
      <p class="sub">Campaña: <b>${esc(S.campana.nombre)}</b> · ${lotes.length} caja(s)</p>
      ${lotes.length? lotes.map(l=>{ const s=SERIES.find(x=>x.id===l.serieId);
        return `<div class="list-item">
          <div class="dot">${l.estado==="cerrado"?"🔒":"📦"}</div>
          <div class="grow"><div class="t"><span class="code">${esc(l.codigoCaja)}</span> ${l.estado==="cerrado"?'<span class="badge gray">cerrada</span>':'<span class="badge ochre">abierta</span>'}</div>
            <div class="m">${esc(s?s.nombre:l.serieId)} · ${l.docCount}/${l.capacidad}</div></div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn sm ghost" data-lbl="${l.id}">🏷️</button>
            ${puede("cerrarLote")&&l.estado==="abierto"?`<button class="btn sm accent" data-close="${l.id}">Cerrar</button>`:""}
          </div></div>`; }).join("")
       : `<p class="sub">Sin cajas todavía. Se crean automáticamente al clasificar.</p>`}
    `);
    root().querySelectorAll("[data-lbl]").forEach(b=>b.addEventListener("click",async()=>{
      generarEtiqueta(lotes.find(l=>l.id===b.dataset.lbl)); }));
    root().querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",async()=>{
      const l=lotes.find(x=>x.id===b.dataset.close); l.estado="cerrado"; l.cerrado=nowISO(); l.cerradoPor=S.usuario.nombre;
      await DB.put("lotes",l);
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"cerrar_lote",entidad:"lote",entidadId:l.id,campana:S.campana.nombre,detalle:{caja:l.codigoCaja,docs:l.docCount}});
      toast("Caja cerrada","ok"); viewLotes();
    }));
  }

  // ---- VISTA: BUSCAR ---------------------------------------------------------
  async function viewBuscar() {
    setMain(`
      <h2 class="title">Buscar documentos</h2>
      <div class="card">
        <label class="fld">Texto (código, serie, usuario, palabra clave del OCR)<input id="q" placeholder="Ej. acta, OSUM-…, 2025"></label>
        <label class="fld">Serie ${`<select id="q-serie"><option value="">Todas</option>${SERIES.map(s=>`<option value="${s.id}">${esc(s.id)} · ${esc(s.nombre)}</option>`).join("")}</select>`}</label>
        <button class="btn block accent" id="q-go">Buscar</button>
      </div>
      <div id="q-res"></div>
    `);
    const run=async()=>{
      const q=Clasificador.norm($("#q").value), serie=$("#q-serie").value;
      let docs=await DB.all("documentos");
      if(serie) docs=docs.filter(d=>d.serieId===serie);
      if(q) docs=docs.filter(d=>[d.codigo,d.serieNombre,d.capturadoPor,d.codigoCaja,d.textoOCR,d.campanaNombre]
        .some(f=>Clasificador.norm(f).includes(q)));
      docs.sort((a,b)=>b.capturadoEn.localeCompare(a.capturadoEn));
      $("#q-res").innerHTML = docs.length? docs.slice(0,80).map(d=>`
        <div class="list-item">
          <div class="dot">${d.estado==="revision_manual"?"⚠️":"📄"}</div>
          <div class="grow"><div class="t code" style="font-size:.82rem">${esc(d.codigo)}</div>
            <div class="m">${esc(d.serieNombre)} · ${esc(d.codigoCaja)}</div>
            <div class="m">${esc(d.capturadoPor)} · ${fmt(d.capturadoEn)} · ${Math.round(d.confianza*100)}% · ${esc(d.accionHumana)}</div></div>
          ${d.confidencial?'<span class="badge rust">Conf.</span>':''}
        </div>`).join("")
        : `<p class="sub">Sin resultados.</p>`;
    };
    $("#q-go").addEventListener("click",run); run();
  }

  // ---- VISTA: MÁS (menú) -----------------------------------------------------
  function viewMas() {
    setMain(`
      <h2 class="title">Más opciones</h2>
      ${puede("reportes")?`<div class="list-item" data-go="reportes"><div class="dot">📊</div><div class="grow"><div class="t">Reportes y exportación</div><div class="m">Inventario por caja · CSV</div></div><span>›</span></div>`:""}
      ${puede("auditoria")?`<div class="list-item" data-go="auditoria"><div class="dot">🧾</div><div class="grow"><div class="t">Bitácora de auditoría</div><div class="m">Trazabilidad · verificar integridad</div></div><span>›</span></div>`:""}
      ${puede("admin")?`<div class="list-item" data-go="admin"><div class="dot">⚙️</div><div class="grow"><div class="t">Administración</div><div class="m">Usuarios · umbral · datos</div></div><span>›</span></div>`:""}
      <div class="list-item" data-go="acerca"><div class="dot">ℹ️</div><div class="grow"><div class="t">Acerca de / Series</div><div class="m">Catálogo CUSED-TPC-2018</div></div><span>›</span></div>
    `);
    root().querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{
      ({reportes:viewReportes,auditoria:viewAuditoria,admin:viewAdmin,acerca:viewAcerca}[b.dataset.go])(); }));
  }

  // ---- REPORTES --------------------------------------------------------------
  async function viewReportes() {
    const docs=(await DB.all("documentos")).filter(d=>!S.campana||d.campanaId===S.campana.id);
    const porSerie={};
    docs.forEach(d=>{ porSerie[d.serieNombre]=(porSerie[d.serieNombre]||0)+1; });
    setMain(`
      <button class="btn ghost sm" id="back">← Más</button>
      <h2 class="title">Reportes</h2>
      <p class="sub">${S.campana?`Campaña: <b>${esc(S.campana.nombre)}</b>`:"Todas las campañas"} · ${docs.length} documentos</p>
      <div class="card"><h3>Resumen por serie</h3>
        ${Object.keys(porSerie).length?Object.entries(porSerie).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="qc-line"><span>${esc(k)}</span><b>${v}</b></div>`).join(""):'<p class="sub">Sin datos.</p>'}
      </div>
      <button class="btn block accent" id="csv">⬇️ Exportar CSV</button>
    `);
    $("#back").addEventListener("click",viewMas);
    $("#csv").addEventListener("click",()=>exportarCSV(docs));
  }

  function exportarCSV(docs){
    const cols=["codigo","serieId","serieNombre","estado","confianza","accionHumana","codigoCaja","capturadoPor","capturadoEn","criterio"];
    const head=cols.join(",");
    const rows=docs.map(d=>cols.map(c=>`"${String(d[c]==null?"":d[c]).replace(/"/g,'""')}"`).join(","));
    const blob=new Blob(["\ufeff"+head+"\n"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`SACD_${S.campana?S.campana.codigo:"todas"}_${Date.now()}.csv`; a.click();
    DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"exportar_csv",detalle:{filas:docs.length}});
    toast("CSV exportado","ok");
  }

  // ---- AUDITORÍA -------------------------------------------------------------
  async function viewAuditoria() {
    const eventos=(await DB.all("eventos")).sort((a,b)=>b.seq-a.seq).slice(0,120);
    setMain(`
      <button class="btn ghost sm" id="back">← Más</button>
      <h2 class="title">Bitácora de auditoría</h2>
      <p class="sub">Registro append-only encadenado por hash (anti-manipulación).</p>
      <button class="btn block teal" id="verif">🔐 Verificar integridad de la cadena</button>
      <div id="verif-res"></div>
      <div style="margin-top:12px">
        ${eventos.map(e=>`<div class="list-item"><div class="grow">
          <div class="t" style="font-size:.86rem">${esc(e.accion)} ${e.detalle&&e.detalle.codigo?`· <span class="code" style="font-size:.74rem">${esc(e.detalle.codigo)}</span>`:""}</div>
          <div class="m">${esc(e.usuario)} (${esc(e.rol)}) · ${fmt(e.ts)}</div>
          <div class="m code" style="font-size:.66rem;color:var(--ink-soft)">#${e.seq} · ${e.hash.slice(0,16)}…</div>
        </div></div>`).join("")}
      </div>
    `);
    $("#back").addEventListener("click",viewMas);
    $("#verif").addEventListener("click",async()=>{
      const r=await DB.verificarCadena();
      $("#verif-res").innerHTML = r.ok
        ? `<div class="card" style="border-color:var(--teal)"><b style="color:var(--teal)">✓ Cadena íntegra</b> · ${r.total} eventos verificados.</div>`
        : `<div class="card" style="border-color:var(--rust)"><b style="color:var(--rust)">✕ Integridad comprometida</b> en el evento #${r.rotoEn}.</div>`;
    });
  }

  // ---- ADMINISTRACIÓN --------------------------------------------------------
  async function viewAdmin() {
    const usuarios=await DB.all("usuarios");
    const aprendizaje=await DB.all("aprendizaje");
    const totalTerminos=aprendizaje.reduce((a,r)=>a+Object.keys(r.terminos||{}).length,0);
    const totalMuestras=aprendizaje.reduce((a,r)=>a+(r.muestras||0),0);
    setMain(`
      <button class="btn ghost sm" id="back">← Más</button>
      <h2 class="title">Administración</h2>
      <div class="card"><h3>Parámetros</h3>
        <label class="fld">Código de institución (prefijo de códigos)<input id="a-inst" value="${esc(S.ajustes.institucion)}" maxlength="8"></label>
        <label class="fld">Umbral de confianza para validación obligatoria: <b id="a-umbral-v">${Math.round(S.ajustes.umbral*100)}%</b>
          <input id="a-umbral" type="range" min="30" max="95" value="${Math.round(S.ajustes.umbral*100)}"></label>
        <label class="fld">Capacidad por caja (por defecto)<input id="a-cap" type="number" value="${S.ajustes.capacidadCaja}" min="1"></label>
        <button class="btn accent sm" id="a-save">Guardar parámetros</button>
      </div>
      <div class="card"><h3>Personas usuarias</h3>
        ${usuarios.map(u=>`<div class="qc-line"><span>${esc(u.nombre)} <span class="badge gray">${u.rol}</span></span>${u.id!==S.usuario.id?`<button class="btn sm rust" data-del="${u.id}">Eliminar</button>`:'<span class="badge teal">usted</span>'}</div>`).join("")}
        <hr class="sep">
        <label class="fld">Nombre<input id="u-nom" placeholder="Nombre completo"></label>
        <label class="fld">Rol <select id="u-rol"><option>clasificador</option><option>supervisor</option><option>auditor</option><option>administrador</option></select></label>
        <label class="fld">PIN opcional (4 dígitos)<input id="u-pin" inputmode="numeric" maxlength="4" placeholder="opcional"></label>
        <button class="btn accent sm" id="u-add">Agregar usuario</button>
      </div>
      <div class="card"><h3>🧠 Memoria del clasificador</h3>
        <p class="sub">Términos aprendidos de las validaciones humanas (correcciones y confirmaciones con baja confianza). Esta memoria refuerza las sugerencias futuras sin reemplazar el catálogo oficial.</p>
        <div class="qc-line"><span>Series con aprendizaje</span><b>${aprendizaje.length}</b></div>
        <div class="qc-line"><span>Términos aprendidos</span><b>${totalTerminos}</b></div>
        <div class="qc-line"><span>Validaciones aprovechadas</span><b>${totalMuestras}</b></div>
        ${aprendizaje.length?`<details style="margin-top:8px"><summary style="cursor:pointer;font-size:.84rem;font-weight:600">Ver detalle por serie</summary>
          <div style="max-height:200px;overflow:auto;margin-top:6px">
          ${aprendizaje.map(r=>{ const s=SERIES.find(x=>x.id===r.serieId);
            const tops=Object.entries(r.terminos||{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([t])=>t);
            return `<div class="qc-line"><span><b>${esc(r.serieId)}</b> ${esc(s?s.nombre:"")}<br><small class="muted">${tops.map(esc).join(", ")||"—"}</small></span><b>${r.muestras||0}</b></div>`; }).join("")}
          </div></details>`:""}
        <button class="btn ghost sm rust" id="apr-reset" style="margin-top:10px" ${aprendizaje.length?"":"disabled"}>🗑️ Reiniciar memoria de aprendizaje</button>
      </div>
      <div class="card"><h3>Datos locales</h3>
        <p class="sub">Las miniaturas de imagen se guardan localmente. Puede purgarlas para ahorrar espacio (los registros y la trazabilidad se conservan).</p>
        <button class="btn ghost sm" id="d-purge">🧹 Purgar miniaturas (borrado de temporales)</button>
      </div>
    `);
    $("#back").addEventListener("click",viewMas);
    $("#a-umbral").addEventListener("input",e=>$("#a-umbral-v").textContent=e.target.value+"%");
    $("#a-save").addEventListener("click",async()=>{
      S.ajustes.institucion=$("#a-inst").value.trim().toUpperCase()||"INST";
      S.ajustes.umbral=parseInt($("#a-umbral").value)/100;
      S.ajustes.capacidadCaja=parseInt($("#a-cap").value)||50;
      await DB.put("config",S.ajustes); toast("Parámetros guardados","ok");
    });
    $("#u-add").addEventListener("click",async()=>{
      const nombre=$("#u-nom").value.trim(); if(!nombre) return toast("Nombre requerido","err");
      const pin=$("#u-pin").value.trim();
      const u={ id:uid("u"), nombre, rol:$("#u-rol").value, pinHash: pin?await DB.sha256("pin:"+pin):null, creado:nowISO() };
      await DB.put("usuarios",u);
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"crear_usuario",entidad:"usuario",entidadId:u.id,detalle:{nombre,rol:u.rol}});
      toast("Usuario agregado","ok"); viewAdmin();
    });
    root().querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",async()=>{
      await DB.del("usuarios",b.dataset.del);
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"eliminar_usuario",entidad:"usuario",entidadId:b.dataset.del});
      viewAdmin();
    }));
    $("#d-purge").addEventListener("click",async()=>{
      const docs=await DB.all("documentos"); let n=0;
      for(const d of docs){ if(d.thumb){ d.thumb=null; await DB.put("documentos",d); n++; } }
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"purgar_miniaturas",detalle:{afectados:n}});
      toast(`${n} miniatura(s) purgada(s)`,"ok");
    });
    if($("#apr-reset")) $("#apr-reset").addEventListener("click",async()=>{
      if(!confirm("¿Borrar toda la memoria de aprendizaje del clasificador? El catálogo oficial no se ve afectado.")) return;
      const regs=await DB.all("aprendizaje");
      for(const r of regs) await DB.del("aprendizaje",r.serieId);
      await DB.registrarEvento({usuario:S.usuario.nombre,rol:S.usuario.rol,accion:"reiniciar_aprendizaje",detalle:{series:regs.length}});
      toast("Memoria de aprendizaje reiniciada","ok"); viewAdmin();
    });
  }

  // ---- ACERCA / CATÁLOGO -----------------------------------------------------
  function viewAcerca() {
    setMain(`
      <button class="btn ghost sm" id="back">← Más</button>
      <h2 class="title">Catálogo de series</h2>
      <p class="sub">${SERIES.length} series comunes · fuente: CUSED‑TPC‑2018 (UCR), actualizada a julio 2025.</p>
      <div class="warn">Los plazos mostrados son un resumen operativo. La fuente legal vinculante es la tabla oficial CUSED‑TPC‑2018.</div>
      <div class="card" style="max-height:50vh;overflow:auto">
        ${SERIES.map(s=>`<div class="qc-line"><span><b>${esc(s.id)}</b> ${esc(s.nombre)}${SERIES_CONFIDENCIALES.includes(s.id)?' <span class="badge rust">Conf.</span>':''}<br><small class="muted">${esc(s.plazo)} · Valor C-C: ${esc(s.valorCC)}</small></span></div>`).join("")}
      </div>
      <p class="sub" style="margin-top:14px">SACD‑Local · versión local sin nube. Procesa OCR y clasificación en el dispositivo; no envía datos a servidores externos.</p>
    `);
    $("#back").addEventListener("click",viewMas);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
