# Posibles mejoras (extensiones futuras)

Estas funcionalidades **quedan fuera del alcance de la versión 1 (local sin nube)** para garantizar una entrega temprana, bajo costo y operación en equipos existentes. Se documentan como extensiones futuras habilitadas por el **diseño modular** del sistema: cada una puede incorporarse como un módulo adicional sin reescribir el núcleo.

## 1. Digitalización archivística definitiva y certificada
Incorporar firma electrónica avanzada sobre el documento digital y preservación a largo plazo (formatos PDF/A, sellado de tiempo, cadena de custodia digital con valor legal). Requiere integración con una autoridad de certificación y políticas de preservación digital.

## 2. Extracción semántica profunda (NLP avanzado por documento)
Más allá de los metadatos clave actuales (fecha, número de expediente, firma/sello): resúmenes automáticos, extracción de entidades (personas, montos, instancias), detección de temas y enlazado entre documentos. Habilita búsquedas más ricas, pero exige modelos de lenguaje más pesados y mayor cómputo.

## 3. Gestión del expediente electrónico completo
El ciclo completo del expediente (conformación, foliado electrónico, préstamo, consulta, disposición final) **pertenece a los departamentos receptores** (archivo, digitalización, custodia). El SACD entrega el insumo pre-clasificado y trazable; la gestión integral del expediente se integraría vía interoperabilidad con el sistema de archivo institucional.

## 4. Reconocimiento biométrico de firmas y validación de autenticidad legal de sellos
Verificación automática de la autenticidad de firmas manuscritas (biometría) y validación legal de sellos. Es un dominio especializado, con implicaciones legales y de privacidad, y se aborda solo si la institución lo requiere y bajo marco normativo apropiado.

---

### Otras mejoras técnicas previstas (de la propuesta)
- **Modelo ML (Fase 2):** sustituir/complementar las reglas por TF-IDF + clasificador y luego embeddings/transformer en español (BETO), con aprendizaje activo a partir de las correcciones humanas.
- **Señales visuales / *layout*:** clasificación apoyada en la estructura visual para documentos con poco texto.
- **Sincronización opcional** entre dispositivos y respaldo cifrado (manteniendo el modo local como predeterminado).
- **Despliegue servidor on-premise** (backend FastAPI + PostgreSQL) para multiusuario concurrente, autenticación robusta y MFA real.
- **Mejoras de preprocesamiento:** recorte y corrección de perspectiva (deskew) automáticos.

> Nota de delimitación: *El alcance se delimita para garantizar entrega temprana y bajo costo; las exclusiones se dejan como extensiones futuras del diseño modular.*
