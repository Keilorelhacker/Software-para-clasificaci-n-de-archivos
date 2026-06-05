# SACD‑Local — Sistema de Apoyo a la Clasificación Documental (versión local sin nube)

Aplicación **PWA** que corre **100 % en su dispositivo**: captura el documento, lo mejora, le aplica **OCR**, sugiere una **serie documental** (catálogo oficial **CUSED‑TPC‑2018**, UCR), exige **validación humana**, asigna **código único**, lo agrupa en **cajas físicas**, genera **etiquetas QR** y mantiene **trazabilidad con bitácora encadenada**. **No envía datos a ningún servidor.**

---

## ¿Por qué "como app en el teléfono"?
Es una **PWA**: se instala en la pantalla de inicio y se abre como una app normal, pero los datos y el procesamiento quedan en el teléfono (almacenamiento local del navegador). Esto cumple el requisito de **operar sin nube** y reutilizar el equipo existente.

---

## Instalación en el teléfono

La PWA necesita servirse por **HTTP/HTTPS** (o `localhost`) para instalarse y funcionar sin conexión. Elija **una** opción:

### Opción 1 — Servidor local en una computadora de la oficina (recomendada, sin Internet)
1. Copie la carpeta `sacd-local/` a una PC en la misma red Wi‑Fi.
2. En esa carpeta ejecute un servidor estático, por ejemplo:
   - Python: `python3 -m http.server 8080`
   - Node: `npx serve -l 8080`
3. En el teléfono (misma red) abra `http://IP-DE-LA-PC:8080/` (ej. `http://192.168.1.50:8080`).
4. En el navegador del teléfono: menú → **"Agregar a pantalla de inicio" / "Instalar app"**.

> Para que funcione **totalmente offline** y se instale en iPhone, lo ideal es servir por **HTTPS**. En red local puede usar un certificado autofirmado o una herramienta como `mkcert`.

### Opción 2 — Hosting estático privado
Súbala a un hosting estático interno o privado (servido por HTTPS) e instálela igual desde el navegador. *Nota: aunque se aloje el código, los **datos del usuario siguen quedando solo en el teléfono**; no se suben.*

### Opción 3 — Prueba rápida (sin instalar)
Abra `index.html` directamente en un navegador de escritorio (doble clic). Funciona para probar captura, OCR, clasificación y registros. **Limitaciones del modo `file://`:** no se instala como app ni cachea offline (el Service Worker requiere http/https).

---

## Primer uso
1. **Ingresar**: viene un usuario "Administrador Local". Cree más usuarios en **Más → Administración** (roles: clasificador, supervisor, auditor, administrador).
2. **Campañas**: cree una campaña (oficina/proyecto), su código corto, ubicación física, departamento receptor y capacidad por caja.
3. **Capturar**: foto del documento → control de calidad → OCR → revisar la sugerencia → **confirmar o corregir** → el sistema asigna el código y la **caja física** donde colocarlo → imprimir etiqueta.
4. **Cajas / Buscar / Reportes / Auditoría**: gestione lotes, busque, exporte CSV y verifique la integridad de la bitácora.

> **OCR**: la primera vez necesita Internet para descargar el modelo de idioma (español); luego el Service Worker lo deja en caché y funciona sin conexión. Si no hay OCR disponible, la app permite escribir el texto y clasificar manualmente.

---

## Privacidad y seguridad (modo local)
- Todo el procesamiento y almacenamiento ocurre **en el dispositivo** (IndexedDB). No hay servidor ni nube.
- **Trazabilidad**: cada acción se registra en una **bitácora append‑only encadenada por hash** (verificable desde *Auditoría*).
- **Control de acceso local** por rol; PIN opcional por usuario.
- **Borrado de temporales**: puede purgar las miniaturas desde *Administración*.
- **Confidencialidad**: las series sensibles (p. ej. investigación delictiva, códigos de alarma) se marcan como confidenciales.

> La **autenticación en servidor, MFA real, cifrado en reposo gestionado y multiusuario concurrente** corresponden al despliegue institucional descrito en la propuesta (Opción C con backend on‑premise). Ver `MEJORAS_FUTURAS.md`.

---

## Estructura del proyecto
```
sacd-local/
├── index.html              · App shell
├── styles.css              · Estilos (estética institucional)
├── series-data.js          · 54 series comunes CUSED-TPC-2018 + reglas/retención
├── classifier.js           · Clasificador por reglas + extractor de metadatos
├── db.js                   · IndexedDB + bitácora encadenada por hash
├── app.js                  · Controlador (captura, OCR, validación, cajas, reportes)
├── manifest.webmanifest    · Manifiesto PWA
├── service-worker.js       · Caché offline
├── lib/qrcode.min.js       · Generación de QR (offline)
├── icons/                  · Íconos de la app
├── README.md               · Este archivo
└── MEJORAS_FUTURAS.md      · Extensiones fuera de alcance v1
```

## Limitaciones conocidas (v1)
- Clasificación por **reglas** (Fase 1): interpretable y de bajo costo; mejora con el modelo ML de Fase 2.
- Preprocesamiento de imagen básico (gris + contraste); recorte/deskew automático queda como mejora.
- OCR depende de la calidad de captura: por eso el control de calidad es obligatorio antes de procesar.
- Los **plazos de retención** mostrados son un resumen operativo; la fuente legal vinculante es la tabla **CUSED‑TPC‑2018** oficial.
