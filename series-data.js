/* =============================================================================
 * SACD-Local · Catálogo de Series Documentales Comunes
 * Fuente oficial: CUSED-TPC-2018 "Tabla de Plazos de Conservación y Eliminación
 *                 de Documentos — Series Comunes en la Universidad de Costa Rica"
 *                 (actualizada a julio de 2025). Archivo Universitario AUROL/UCR.
 *
 * Cada serie incluye:
 *   id        código interno del sistema (no archivístico)
 *   nombre    nombre oficial de la serie
 *   aka       otras denominaciones / "también llamadas" (sinónimos para el matcher)
 *   keywords  términos/expresiones que disparan la sugerencia (en minúscula, sin tildes)
 *   senales   pistas estructurales esperadas (firma, sello, membrete, etc.)
 *   plazo     vigencia / observación de retención (resumen; VERIFICAR contra la tabla oficial)
 *   valorCC   valor científico-cultural según la tabla ("Sí" / "No" / "Parcial")
 *
 * NOTA: Los plazos son un resumen operativo. La fuente legal vinculante es la
 * tabla CUSED-TPC-2018. Consulte http://archivo.ucr.ac.cr/CUSED/informes.html
 * ============================================================================= */

const SERIES = [
  { id:"S01", nombre:"Actas de eliminación de documentos", aka:[],
    keywords:["acta de eliminacion","eliminacion de documentos","metros lineales","informe de valoracion","documentos que se van a eliminar"],
    senales:["firma","fecha"], plazo:"Unidad 10 años · AUROL permanente", valorCC:"No" },

  { id:"S02", nombre:"Actas de sesiones de órganos colegiados", aka:["acta de sesion","acta de consejo"],
    keywords:["acta","sesion","organo colegiado","orden del dia","acuerdos","articulado","quien preside","miembros presentes","votos disidentes"],
    senales:["sello","firma","membrete"], plazo:"Unidad 2 años · AUROL permanente", valorCC:"Sí" },

  { id:"S03", nombre:"Boletines", aka:["boletin informativo","boletin tecnico"],
    keywords:["boletin","divulgacion","informativo","actividades","fechas importantes"],
    senales:["membrete"], plazo:"Informativo 1 año · Técnico permanente (AUROL)", valorCC:"No" },

  { id:"S04", nombre:"Cartas enviadas (consecutivo)", aka:["consecutivos","control numerico","oficios enviados","carta enviada"],
    keywords:["carta enviada","consecutivo","oficio enviado","por medio del presente","atentamente","reciba un cordial saludo"],
    senales:["firma","membrete","fecha"], plazo:"Unidad 15 años / 5 años · sin valor CC", valorCC:"No" },

  { id:"S05", nombre:"Certificaciones universitarias", aka:["certificacion"],
    keywords:["certificacion","certifica que","hace constar","para los fines","se extiende la presente"],
    senales:["firma","sello"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S06", nombre:"Cierre de cajas de tesorería", aka:["cierre de caja"],
    keywords:["cierre de caja","tesoreria","arqueo","efectivo","monto recaudado"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S07", nombre:"Circulares enviadas", aka:["circular enviada"],
    keywords:["circular","se comunica a","para conocimiento de","a toda la comunidad","de mi consideracion"],
    senales:["firma","membrete"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S08", nombre:"Circulares recibidas", aka:["circular recibida"],
    keywords:["circular recibida","recibido","sello de recibido","para su conocimiento"],
    senales:["sello"], plazo:"Documento de referencia · verificar tabla", valorCC:"No" },

  { id:"S09", nombre:"Constancias universitarias", aka:["constancia"],
    keywords:["constancia","se hace constar","por este medio se certifica","a solicitud del interesado"],
    senales:["firma","sello"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S10", nombre:"Correspondencia", aka:["correspondencia general"],
    keywords:["correspondencia","asunto","destinatario","remitente","adjunto","en respuesta a su"],
    senales:["firma","fecha"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S11", nombre:"Discursos", aka:["discurso"],
    keywords:["discurso","palabras de","alocucion","intervencion","buenos dias estimados"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S12", nombre:"Expediente de abastecimiento de combustible", aka:["combustible"],
    keywords:["combustible","abastecimiento","litros","diesel","gasolina","vale de combustible"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S13", nombre:"Expediente de actos oficiales universitarios", aka:["acto oficial","actos protocolarios"],
    keywords:["acto oficial","protocolo","ceremonia","inauguracion","programa del acto","invitados de honor"],
    senales:["membrete"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Sí" },

  { id:"S14", nombre:"Expediente de apoyo presupuestario", aka:["apoyo presupuestario"],
    keywords:["apoyo presupuestario","presupuesto","partida","asignacion de recursos"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S15", nombre:"Expediente de asesoría archivística (fracción)", aka:["asesoria archivistica"],
    keywords:["asesoria archivistica","aurol","gestion documental","tabla de plazos","valoracion documental"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S16", nombre:"Expediente de asesoría para planes estratégicos de unidades ejecutoras", aka:["plan estrategico de unidad"],
    keywords:["plan estrategico","asesoria","unidad ejecutora","objetivos estrategicos","oplau"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S17", nombre:"Expediente de autoevaluación del Sistema de Control Interno", aka:["autoevaluacion control interno","sci"],
    keywords:["control interno","autoevaluacion","sci","riesgos","valoracion del riesgo","contraloria"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S18", nombre:"Expediente de bienes institucionales", aka:["bienes","activos","inventario de bienes"],
    keywords:["bien institucional","activo","placa","inventario de bienes","numero de activo","depreciacion"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S19", nombre:"Expediente de comprobantes de ingreso", aka:["comprobante de ingreso","recibo de ingreso"],
    keywords:["comprobante de ingreso","recibo","ingreso","monto","numero de recibo","cancelado"],
    senales:["sello"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S20", nombre:"Expediente de contratación administrativa (fracción)", aka:["contratacion administrativa","licitacion","contrato administrativo"],
    keywords:["contratacion administrativa","licitacion","cartel","oferta","adjudicacion","lca","rlca","proveedor","orden de compra"],
    senales:["firma","sello"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S21", nombre:"Expediente de decomisos", aka:["decomiso"],
    keywords:["decomiso","bienes decomisados","retencion de bienes","acta de decomiso"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S22", nombre:"Expediente de evaluación del Plan Anual Operativo Institucional (agregado)", aka:["pao","plan anual operativo"],
    keywords:["plan anual operativo","pao","evaluacion","metas","indicadores","cumplimiento de metas"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S23", nombre:"Expediente de gestión de la calidad", aka:["gestion de calidad","iso 9001"],
    keywords:["gestion de la calidad","iso 9001","procedimiento","no conformidad","accion correctiva","auditoria de calidad"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S24", nombre:"Expediente de gestión del riesgo institucional", aka:["gestion del riesgo","sevri"],
    keywords:["gestion del riesgo","riesgo institucional","sevri","mapa de riesgos","mitigacion"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S25", nombre:"Expediente de investigación delictiva", aka:["investigacion delictiva"],
    keywords:["investigacion delictiva","denuncia","hechos","investigacion","confidencial"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018 · CONFIDENCIAL", valorCC:"Parcial" },

  { id:"S26", nombre:"Expediente de mantenimiento correctivo de maquinaria y equipo", aka:["mantenimiento correctivo"],
    keywords:["mantenimiento correctivo","reparacion","averia","maquinaria","equipo","falla"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S27", nombre:"Expediente de mantenimiento preventivo de maquinaria y equipo", aka:["mantenimiento preventivo"],
    keywords:["mantenimiento preventivo","rutina","programa de mantenimiento","inspeccion","equipo"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S28", nombre:"Expediente de marchamo (personal administrativo, docente, ad-honorem y no vinculados)", aka:["marchamo"],
    keywords:["marchamo","derecho de circulacion","vehiculo","placa","riteve"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S29", nombre:"Expediente de presupuesto – Ejecución (fracción)", aka:["ejecucion presupuestaria"],
    keywords:["ejecucion presupuestaria","ejecucion del presupuesto","devengado","gasto ejecutado","liquidacion"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S30", nombre:"Expediente de presupuesto – Formulación (fracción)", aka:["formulacion presupuestaria"],
    keywords:["formulacion presupuestaria","anteproyecto de presupuesto","proyeccion","estimacion de ingresos"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S31", nombre:"Expediente de proyectos de construcción de obras menores de infraestructura", aka:["obras menores","infraestructura"],
    keywords:["obra menor","construccion","infraestructura","planos","remodelacion","memoria de calculo"],
    senales:["firma","sello"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S32", nombre:"Expediente de reuniones", aka:["reunion"],
    keywords:["reunion","convocatoria","agenda","participantes","temas tratados"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S33", nombre:"Expediente de sesiones de órganos colegiados", aka:["expediente de sesion"],
    keywords:["expediente de sesion","documentos de respaldo","agenda de sesion","convocatoria a sesion"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S34", nombre:"Expediente de transferencia de documentos (fracción)", aka:["transferencia documental"],
    keywords:["transferencia de documentos","remision de documentos","lista de remision","fondo documental"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S35", nombre:"Expediente de transporte para giras nacionales e internacionales", aka:["gira","transporte"],
    keywords:["gira","transporte","solicitud de vehiculo","viaje","itinerario","boleta de transporte"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S36", nombre:"Expedientes de valoración de documentos (fracción)", aka:["valoracion de documentos"],
    keywords:["valoracion de documentos","informe de valoracion","series documentales","plazos de conservacion","cused"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Sí" },

  { id:"S37", nombre:"Fotografías", aka:["foto","fotografia institucional"],
    keywords:["fotografia","foto","imagen institucional","registro fotografico"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S38", nombre:"Expediente del Panorama Cuantitativo Universitario", aka:["panorama cuantitativo"],
    keywords:["panorama cuantitativo","estadisticas universitarias","datos cuantitativos","matricula","cifras"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S39", nombre:"Expediente del Plan Estratégico Institucional", aka:["plan estrategico institucional","pei"],
    keywords:["plan estrategico institucional","pei","vision","mision","ejes estrategicos","oplau"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Sí" },

  { id:"S40", nombre:"Grabaciones de sesiones de órganos colegiados", aka:["grabacion de sesion","audio de sesion"],
    keywords:["grabacion","audio","sesion","respaldo de audio","registro sonoro"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S41", nombre:"Invitaciones", aka:["invitacion"],
    keywords:["invitacion","tenemos el agrado de invitarle","cordialmente invita","se complace en invitar"],
    senales:["membrete"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S42", nombre:"Libros de bitácoras de los puestos de seguridad", aka:["bitacora de seguridad","libro de novedades"],
    keywords:["bitacora","puesto de seguridad","novedades","rondas","libro de bitacora","oficial de seguridad"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S43", nombre:"Memorandos", aka:["memorando","memo"],
    keywords:["memorando","memo","para:","de:","asunto:","referencia:"],
    senales:["firma","fecha"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"Parcial" },

  { id:"S44", nombre:"Minutas", aka:["minuta"],
    keywords:["minuta","puntos tratados","acuerdos de la minuta","participantes de la minuta"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S45", nombre:"Reportes de conteo del volumen de fotocopias", aka:["conteo de fotocopias"],
    keywords:["fotocopias","conteo","volumen de copias","contador de copias","reporte de fotocopiado"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S46", nombre:"Reporte de envío de correspondencia (guías consolidadas)", aka:["guias consolidadas","boletas de envio de correspondencia"],
    keywords:["guia consolidada","envio de correspondencia","boleta de envio","mensajeria","guia de correspondencia"],
    senales:["sello"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S47", nombre:"Reporte de recolección de desechos y residuos", aka:["recoleccion de desechos","residuos"],
    keywords:["desechos","residuos","recoleccion","reciclaje","gestion de residuos"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S48", nombre:"Reporte de supervisores de seguridad", aka:["reporte de supervision de seguridad"],
    keywords:["supervisor de seguridad","reporte de supervision","incidente de seguridad","rondines"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S49", nombre:"Solicitudes de cierre o reserva de espacio de parqueo", aka:["reserva de parqueo"],
    keywords:["reserva de parqueo","cierre de parqueo","espacio de parqueo","estacionamiento"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S50", nombre:"Solicitudes de códigos de alarma", aka:["codigo de alarma"],
    keywords:["codigo de alarma","solicitud de alarma","sistema de alarma","clave de alarma"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018 · CONFIDENCIAL", valorCC:"No" },

  { id:"S51", nombre:"Solicitudes de ingreso a instalaciones en receso y horario no hábil", aka:["ingreso en receso","horario no habil"],
    keywords:["ingreso a instalaciones","horario no habil","receso","permiso de ingreso","fuera de horario"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S52", nombre:"Solicitudes de mantenimiento de planta física y construcción (orden de trabajo)", aka:["orden de trabajo","mantenimiento de planta fisica"],
    keywords:["orden de trabajo","mantenimiento de planta fisica","solicitud de mantenimiento","reparacion de infraestructura"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S53", nombre:"Solicitudes de permiso especial de ingreso y de parqueo", aka:["permiso de ingreso","permiso de parqueo"],
    keywords:["permiso especial","permiso de ingreso","permiso de parqueo","autorizacion de ingreso"],
    senales:["firma"], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },

  { id:"S54", nombre:"Solicitudes de servicio de vigilancia", aka:["servicio de vigilancia"],
    keywords:["servicio de vigilancia","solicitud de vigilancia","resguardo","custodia de instalaciones"],
    senales:[], plazo:"Verificar tabla CUSED-TPC-2018", valorCC:"No" },
];

/* Series marcadas como potencialmente confidenciales (refuerza control de acceso/UX) */
const SERIES_CONFIDENCIALES = ["S25", "S50"];

if (typeof module !== "undefined") { module.exports = { SERIES, SERIES_CONFIDENCIALES }; }
