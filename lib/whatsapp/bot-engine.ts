import { generateText, Output } from 'ai'
import { z } from 'zod'
import { leerSnapshotEntrenamiento } from '@/app/api/tarifas/entrenamiento/route'
import {
  calcularTarifaPatriotas,
  OPCIONES_VIAJE_DEFAULT,
} from '@/lib/tarifas/engine'
import { encontrarAnclasTarifariasCercanas } from '@/lib/tarifas/geografia-tachira'
import { ResultadoCalculoTarifa } from '@/lib/tarifas/types'
import {
  actualizarSesionCliente,
  obtenerSesionCliente,
} from './session-store'
import {
  ExtraccionNluWhatsApp,
  IntencionMensajeCliente,
  PedidoDespachoWhatsApp,
  ResultadoProcesamientoWhatsApp,
  SesionClienteWhatsApp,
  UbicacionGpsWhatsApp,
} from './types'

const EsquemaNluWhatsApp = z.object({
  intencion: z.enum([
    'SALUDO',
    'CONSULTA_PRECIO',
    'COMPLETAR_ORIGEN',
    'COMPLETAR_DESTINO',
    'CONFIRMAR_DESPACHO',
    'CANCELAR',
    'PREGUNTA_GENERAL',
  ]),
  origenDetectado: z.string().nullable(),
  destinoDetectado: z.string().nullable(),
  nocturnoExplicito: z.boolean(),
  lluviaExplicita: z.boolean(),
  feriadoExplicito: z.boolean(),
  paradasExtra: z.number().int().min(0).max(5),
  minutosEspera: z.number().int().min(0).max(120),
  razonamientoBreve: z.string(),
})

/**
 * Determina si la hora actual en Venezuela (America/Caracas, UTC-4) corresponde a horario nocturno (7:00 PM a 5:59 AM)
 */
export function esHorarioNocturnoVenezuela(): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Caracas',
      hour: 'numeric',
      hour12: false,
    })
    const hora = Number(formatter.format(new Date()))
    return hora >= 19 || hora < 6
  } catch {
    return false
  }
}

/**
 * Heurística local ultrarrápida para extraer intención, origen y destino en español tachirense
 * Sirve como respaldo determinístico cuando se ejecuta en local sin internet a la IA o para comandos directos.
 */
export function extraerIntencionHeuristicaLocal(
  textoOriginal: string,
  sesion: SesionClienteWhatsApp
): ExtraccionNluWhatsApp {
  const texto = textoOriginal.trim()
  const lower = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const nocturnoExplicito =
    /\b(noche|nocturn[oa]|madrugada|10\s*pm|11\s*pm|12\s*am)\b/i.test(lower)
  const lluviaExplicita = /\b(lluvia|lloviendo|aguacero|llueve)\b/i.test(lower)
  const feriadoExplicito = /\b(feriado|domingo|festivo|1\s*de\s*enero)\b/i.test(
    lower
  )

  let paradasExtra = 0
  const matchParadas = lower.match(/(\d+)\s*parada/)
  if (matchParadas) {
    paradasExtra = Math.min(5, Number(matchParadas[1]) || 1)
  } else if (/\b(una\s+parada|con\s+parada|pasando\s+por)\b/.test(lower)) {
    paradasExtra = 1
  }

  let minutosEspera = 0
  const matchEspera = lower.match(/(\d+)\s*min(utos)?\s*(de\s*)?espera/)
  if (matchEspera) {
    minutosEspera = Math.min(120, Number(matchEspera[1]) || 0)
  }

  // 1. Confirmación de despacho
  if (
    sesion.estado === 'COTIZADO_PENDIENTE_CONFIRMACION' &&
    /^(pedir|si|sí|confirmar|confirmo|envialo|envia|manda|mandame|dale|ok|listo|de una)\b/i.test(
      lower
    )
  ) {
    return {
      intencion: 'CONFIRMAR_DESPACHO',
      origenDetectado: sesion.origenTemporal ?? null,
      destinoDetectado: sesion.destinoTemporal ?? null,
      nocturnoExplicito,
      lluviaExplicita,
      feriadoExplicito,
      paradasExtra,
      minutosEspera,
      motorNluUsado: 'local_heuristic',
      razonamientoBreve:
        'Cliente confirmó el envío de la unidad sobre la cotización activa.',
    }
  }

  // 2. Cancelación / reinicio
  if (/^(cancelar|reiniciar|salir|no gracias|otra consulta)\b/i.test(lower)) {
    return {
      intencion: 'CANCELAR',
      origenDetectado: null,
      destinoDetectado: null,
      nocturnoExplicito: false,
      lluviaExplicita: false,
      feriadoExplicito: false,
      paradasExtra: 0,
      minutosEspera: 0,
      motorNluUsado: 'local_heuristic',
      razonamientoBreve: 'Cliente solicitó reiniciar o cancelar la consulta.',
    }
  }

  const limpiarLugar = (raw: string): string =>
    raw
      .replace(
        /\b(por favor|gracias|buenas noches|buenos dias|buenas tardes|hola|cuanto sale|cuanto cuesta|cuanto cobran|un taxi|una carrera|ahorita|de noche|lloviendo)\b/gi,
        ''
      )
      .replace(/[?¿!¡.,;]+/g, '')
      .trim()

  // 3. Patrón explícito: "desde X hasta/para/a Y" o "de X a/para/hasta Y"
  const regexDesdeHasta =
    /(?:desde|de)\s+(.+?)\s+(?:hasta|para|pa|hacia|a)\s+(.+?)(?:[?¿!.]|$)/i
  const matchDH = texto.match(regexDesdeHasta)
  if (matchDH) {
    const orig = limpiarLugar(matchDH[1])
    const dest = limpiarLugar(matchDH[2])
    if (orig && dest) {
      return {
        intencion: 'CONSULTA_PRECIO',
        origenDetectado: orig,
        destinoDetectado: dest,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        razonamientoBreve: `Detectado par completo origen (${orig}) y destino (${dest}).`,
      }
    }
  }

  // 4. Patrón con flecha o guion: "Táriba -> Sambil" o "Las Vegas a Cordero"
  const regexFlecha = /^([^?¿]+?)\s*(?:->|→|hasta|hacia)\s*([^?¿]+)$/i
  const matchFlecha = texto.match(regexFlecha)
  if (matchFlecha) {
    const orig = limpiarLugar(matchFlecha[1])
    const dest = limpiarLugar(matchFlecha[2])
    if (orig && dest && orig.length >= 3 && dest.length >= 3) {
      return {
        intencion: 'CONSULTA_PRECIO',
        origenDetectado: orig,
        destinoDetectado: dest,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        razonamientoBreve: `Detectado trayecto directo (${orig} → ${dest}).`,
      }
    }
  }

  // 5. Si la sesión está esperando el ORIGEN y el cliente responde con el sector
  if (sesion.estado === 'ESPERANDO_ORIGEN') {
    const origCandidate = limpiarLugar(
      texto.replace(/^(desde|en|estoy en|salgo de|me recoges en)\s+/i, '')
    )
    if (origCandidate.length >= 2) {
      return {
        intencion: 'COMPLETAR_ORIGEN',
        origenDetectado: origCandidate,
        destinoDetectado: sesion.destinoTemporal ?? null,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        razonamientoBreve: `Cliente completó el sector de recogida faltante: ${origCandidate}.`,
      }
    }
  }

  // 6. Si la sesión está esperando el DESTINO y el cliente responde con el sector
  if (sesion.estado === 'ESPERANDO_DESTINO') {
    const destCandidate = limpiarLugar(
      texto.replace(/^(hasta|para|pa|hacia|voy a|voy para|a)\s+/i, '')
    )
    if (destCandidate.length >= 2) {
      return {
        intencion: 'COMPLETAR_DESTINO',
        origenDetectado: sesion.origenTemporal ?? null,
        destinoDetectado: destCandidate,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        razonamientoBreve: `Cliente completó el destino faltante: ${destCandidate}.`,
      }
    }
  }

  // 7. Solo destino mencionado: "¿cuánto sale para Cordero?" / "carrera hasta El Sambil"
  const regexSoloDestino =
    /(?:para\s+ir\s+a|para\s+ir\s+hasta|para|hasta|hacia|ir\s+a)\s+([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]{3,35})(?:[?¿!.]|$)/i
  const matchSoloDest = texto.match(regexSoloDestino)
  if (matchSoloDest) {
    const dest = limpiarLugar(matchSoloDest[1])
    if (dest.length >= 3) {
      return {
        intencion: 'CONSULTA_PRECIO',
        origenDetectado: null,
        destinoDetectado: dest,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        razonamientoBreve: `Cliente consultó destino (${dest}) sin especificar origen.`,
      }
    }
  }

  // 8. Solo origen mencionado: "estoy en Las Vegas de Táriba" / "desde Sabaneta"
  const regexSoloOrigen =
    /(?:estoy\s+en|salgo\s+de|recoger\s+en|desde)\s+([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]{3,35})(?:[?¿!.]|$)/i
  const matchSoloOrig = texto.match(regexSoloOrigen)
  if (matchSoloOrig) {
    const orig = limpiarLugar(matchSoloOrig[1])
    if (orig.length >= 3) {
      return {
        intencion: 'CONSULTA_PRECIO',
        origenDetectado: orig,
        destinoDetectado: null,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        razonamientoBreve: `Cliente indicó origen (${orig}) sin especificar destino.`,
      }
    }
  }

  // 9. Saludo inicial
  if (
    /^(hola|buenos dias|buenas tardes|buenas noches|buenas|epa|alo|disponible|tienen unidad)\b/i.test(
      lower
    )
  ) {
    return {
      intencion: 'SALUDO',
      origenDetectado: null,
      destinoDetectado: null,
      nocturnoExplicito,
      lluviaExplicita,
      feriadoExplicito,
      paradasExtra,
      minutosEspera,
      motorNluUsado: 'local_heuristic',
      razonamientoBreve: 'Saludo inicial o consulta de disponibilidad.',
    }
  }

  return {
    intencion: 'PREGUNTA_GENERAL',
    origenDetectado: null,
    destinoDetectado: null,
    nocturnoExplicito,
    lluviaExplicita,
    feriadoExplicito,
    paradasExtra,
    minutosEspera,
    motorNluUsado: 'local_heuristic',
    razonamientoBreve: 'No se detectó par origen/destino claro en el mensaje.',
  }
}

/**
 * Extrae la intención y entidades usando IA en la nube (Vercel AI Gateway / OpenAI gpt-5.4-mini)
 * con respaldo automático al analizador heurístico local si no hay conexión.
 */
export async function extraerIntencionConIA(
  textoCliente: string,
  sesion: SesionClienteWhatsApp
): Promise<ExtraccionNluWhatsApp> {
  const heuristica = extraerIntencionHeuristicaLocal(textoCliente, sesion)

  // Si es confirmación directa o cancelación clara, respondemos al instante sin latencia extra
  if (
    heuristica.intencion === 'CONFIRMAR_DESPACHO' ||
    heuristica.intencion === 'CANCELAR'
  ) {
    return heuristica
  }

  try {
    const contextoHistorial = sesion.historial
      .slice(-4)
      .map((m) => `${m.rol.toUpperCase()}: ${m.texto}`)
      .join('\n')

    const { output } = await generateText({
      model: 'openai/gpt-5.4-mini',
      output: Output.object({ schema: EsquemaNluWhatsApp }),
      system: `Eres el analizador NLU de WhatsApp de la Línea de Taxis "Los Patriotas" (Base Central Táriba, Municipio Cárdenas, Estado Táchira, Venezuela).
Tu única tarea es extraer de forma estructurada la intención del pasajero y los lugares de ORIGEN y DESTINO en el Táchira.
Reglas clave:
- Estado actual de la conversación: ${sesion.estado}.
- Origen temporal ya guardado en sesión: ${sesion.origenTemporal ?? 'ninguno'}.
- Destino temporal ya guardado en sesión: ${sesion.destinoTemporal ?? 'ninguno'}.
- Si el estado es ESPERANDO_ORIGEN y el usuario envía el nombre de un barrio, urbanización o lugar, clasifica como COMPLETAR_ORIGEN y coloca ese lugar en origenDetectado.
- Si el estado es ESPERANDO_DESTINO y el usuario envía un lugar, clasifica como COMPLETAR_DESTINO y coloca ese lugar en destinoDetectado.
- Si el estado es COTIZADO_PENDIENTE_CONFIRMACION y el usuario acepta o pide enviar el taxi ("sí", "pedir", "mándalo", "dale"), clasifica como CONFIRMAR_DESPACHO.
- Limpia palabras de cortesía de los nombres de lugares (ej. "desde Las Vegas de Táriba por favor" -> "Las Vegas de Táriba").`,
      prompt: `Historial reciente:\n${contextoHistorial || 'Sin mensajes previos'}\n\nMensaje actual del cliente por WhatsApp: "${textoCliente}"`,
    })

    if (output) {
      return {
        ...output,
        motorNluUsado: 'cloud_ai',
      }
    }
  } catch {
    // Fallback transparente al motor heurístico local cuando corre offline o sin API key
  }

  return heuristica
}

/**
 * Formatea una cotización oficial o entrenada al estilo comercial de WhatsApp de Línea Los Patriotas
 */
export function formatearMensajeCotizacionWhatsApp(
  cotizacion: ResultadoCalculoTarifa,
  opcionesActivas: {
    nocturno: boolean
    lluvia: boolean
    feriado: boolean
    paradasExtra: number
    minutosEspera: number
  }
): string {
  const urlMaps = `https://www.google.com/maps/dir/?api=1&origin=${cotizacion.coordenadasOrigen.lat},${cotizacion.coordenadasOrigen.lon}&destination=${cotizacion.coordenadasDestino.lat},${cotizacion.coordenadasDestino.lon}&travelmode=driving`

  const etiquetasExtras: string[] = []
  if (opcionesActivas.nocturno) etiquetasExtras.push('Horario Nocturno')
  if (opcionesActivas.lluvia) etiquetasExtras.push('Condición Lluvia')
  if (opcionesActivas.feriado) etiquetasExtras.push('Día Feriado')
  if (opcionesActivas.paradasExtra > 0)
    etiquetasExtras.push(`${opcionesActivas.paradasExtra} Parada(s) Extra`)
  if (opcionesActivas.minutosEspera > 0)
    etiquetasExtras.push(`${opcionesActivas.minutosEspera} min Espera`)

  const lineaModalidad = cotizacion.aprendizajeAplicado?.usandoAnclaEntrenada
    ? `${cotizacion.tituloRegla} (Calibrada con Entrenamiento)`
    : cotizacion.tituloRegla

  const lineas = [
    `*LÍNEA LOS PATRIOTAS — BASE TÁRIBA*`,
    `----------------------------------`,
    `*Origen:* ${cotizacion.sectorOrigenDetectado}`,
    `*Destino:* ${cotizacion.sectorDestinoDetectado}`,
    `*Distancia estimada:* ${cotizacion.distanciaVialKm} km (${cotizacion.topografiaDominante.toUpperCase()})`,
    `*Modalidad:* ${lineaModalidad}`,
    etiquetasExtras.length > 0
      ? `*Condiciones aplicadas:* ${etiquetasExtras.join(', ')}`
      : null,
    `----------------------------------`,
    `*TARIFA DEL TRASLADO:*`,
    `• *Pesos:* ${cotizacion.totalCop.toLocaleString('es-CO')} COP`,
    `• *Dólares:* $${cotizacion.totalUsd.toFixed(2)} USD`,
    `• *Bolívares (BCV):* Bs. ${cotizacion.totalVesBcv.toFixed(2)}`,
    `----------------------------------`,
    `*Ruta en Mapa:* ${urlMaps}`,
    ``,
    `Responde *PEDIR* si deseas que te enviemos una unidad a esta tarifa, o escribe otra ruta para cotizar.`,
  ].filter(Boolean)

  return lineas.join('\n')
}

/**
 * Procesador principal de mensajes entrantes de WhatsApp (Texto o Pin de Ubicación GPS)
 */
export async function procesarMensajeEntranteWhatsApp(params: {
  telefono: string
  nombreCliente?: string
  texto?: string
  ubicacionGps?: UbicacionGpsWhatsApp
  forzarNocturno?: boolean
}): Promise<ResultadoProcesamientoWhatsApp> {
  const snapshot = await leerSnapshotEntrenamiento()
  const sesion = await obtenerSesionCliente(
    params.telefono,
    params.nombreCliente || 'Pasajero WhatsApp'
  )

  const textoEntrada = (params.texto || '').trim()
  const ahoraIso = new Date().toISOString()

  // 1. Si el cliente envió un Pin de Ubicación GPS nativo de WhatsApp
  if (params.ubicacionGps) {
    const { lat, lon, nombreReferencia } = params.ubicacionGps
    const anclasCercanas = encontrarAnclasTarifariasCercanas(
      lat,
      lon,
      'urbano',
      snapshot.parametros,
      2,
      snapshot.estadoAprendizaje.anclasAprendidas,
      snapshot.db
    )
    const anclaMasCercana = anclasCercanas[0]
    const etiquetaGps =
      nombreReferencia ||
      (anclaMasCercana
        ? `${anclaMasCercana.nombreOficial} (Pin GPS a ${anclaMasCercana.distanciaAlPuntoKm} km)`
        : `Ubicación GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`)

    const msgCliente = {
      id: `msg-${Date.now()}-c`,
      rol: 'cliente' as const,
      texto: `[Ubicación GPS enviada: ${etiquetaGps}]`,
      timestamp: ahoraIso,
      ubicacionGps: params.ubicacionGps,
    }
    sesion.historial.push(msgCliente)

    // Si estaba esperando el destino o ya tenía origen, el GPS completa el destino; de lo contrario, es el origen de recogida
    if (sesion.estado === 'ESPERANDO_DESTINO' || sesion.origenTemporal) {
      sesion.destinoTemporal =
        anclaMasCercana?.nombreOficial || etiquetaGps
      sesion.coordenadasDestino = { lat, lon }
    } else {
      sesion.origenTemporal =
        anclaMasCercana?.nombreOficial || etiquetaGps
      sesion.coordenadasOrigen = { lat, lon }
    }

    // Si ya tenemos origen y destino tras recibir el Pin GPS, calculamos de inmediato
    if (sesion.origenTemporal && sesion.destinoTemporal) {
      const nocturnoActivo =
        params.forzarNocturno ??
        (sesion.opcionesDetectadas.nocturno || esHorarioNocturnoVenezuela())

      const opcionesViaje = {
        ...OPCIONES_VIAJE_DEFAULT,
        ...sesion.opcionesDetectadas,
        nocturno: nocturnoActivo,
      }

      const cotizacion = calcularTarifaPatriotas(
        sesion.origenTemporal,
        sesion.destinoTemporal,
        snapshot.parametros,
        opcionesViaje,
        snapshot.db,
        null,
        snapshot.estadoAprendizaje
      )

      sesion.estado = 'COTIZADO_PENDIENTE_CONFIRMACION'
      sesion.ultimaCotizacion = cotizacion

      const respuesta = formatearMensajeCotizacionWhatsApp(
        cotizacion,
        opcionesViaje
      )
      const extraccionGps: ExtraccionNluWhatsApp = {
        intencion: 'CONSULTA_PRECIO',
        origenDetectado: sesion.origenTemporal,
        destinoDetectado: sesion.destinoTemporal,
        nocturnoExplicito: nocturnoActivo,
        lluviaExplicita: opcionesViaje.lluvia,
        feriadoExplicito: opcionesViaje.feriado,
        paradasExtra: opcionesViaje.paradasExtra,
        minutosEspera: opcionesViaje.minutosEspera,
        motorNluUsado: 'local_heuristic',
        razonamientoBreve: `Ubicación GPS vinculada al ancla "${anclaMasCercana?.nombreOficial ?? etiquetaGps}".`,
      }

      sesion.historial.push({
        id: `msg-${Date.now()}-b`,
        rol: 'bot',
        texto: respuesta,
        timestamp: new Date().toISOString(),
        cotizacionAdjunta: cotizacion,
        extraccionNlu: extraccionGps,
      })

      await actualizarSesionCliente(sesion)
      return {
        textoRespuesta: respuesta,
        sesionActualizada: sesion,
        cotizacionGenerada: cotizacion,
        extraccionNlu: extraccionGps,
        leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
      }
    }

    // Si el GPS fue el origen y falta el destino, pedimos el destino
    sesion.estado = 'ESPERANDO_DESTINO'
    const respuestaFaltaDestino = [
      `Recibimos tu ubicación GPS cerca de *${etiquetaGps}*.`,
      ``,
      `¿Hacia qué sector, urbanización o punto de referencia deseas trasladarte?`,
    ].join('\n')

    const extraccionParcial: ExtraccionNluWhatsApp = {
      intencion: 'COMPLETAR_ORIGEN',
      origenDetectado: sesion.origenTemporal ?? etiquetaGps,
      destinoDetectado: null,
      nocturnoExplicito: false,
      lluviaExplicita: false,
      feriadoExplicito: false,
      paradasExtra: 0,
      minutosEspera: 0,
      motorNluUsado: 'local_heuristic',
      razonamientoBreve: `Pin GPS recibido como punto de recogida (${etiquetaGps}). Esperando destino.`,
    }

    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: respuestaFaltaDestino,
      timestamp: new Date().toISOString(),
      extraccionNlu: extraccionParcial,
    })

    await actualizarSesionCliente(sesion)
    return {
      textoRespuesta: respuestaFaltaDestino,
      sesionActualizada: sesion,
      extraccionNlu: extraccionParcial,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
    }
  }

  // 2. Procesamiento de mensaje de texto con IA en la nube + Respaldo local
  const extraccion = await extraerIntencionConIA(textoEntrada, sesion)

  sesion.historial.push({
    id: `msg-${Date.now()}-c`,
    rol: 'cliente',
    texto: textoEntrada,
    timestamp: ahoraIso,
    extraccionNlu: extraccion,
  })

  // Actualizar condiciones operativas detectadas en la conversación
  if (extraccion.nocturnoExplicito) sesion.opcionesDetectadas.nocturno = true
  if (extraccion.lluviaExplicita) sesion.opcionesDetectadas.lluvia = true
  if (extraccion.feriadoExplicito) sesion.opcionesDetectadas.feriado = true
  if (extraccion.paradasExtra > 0)
    sesion.opcionesDetectadas.paradasExtra = extraccion.paradasExtra
  if (extraccion.minutosEspera > 0)
    sesion.opcionesDetectadas.minutosEspera = extraccion.minutosEspera

  // Caso A: Cancelar o reiniciar
  if (extraccion.intencion === 'CANCELAR') {
    sesion.estado = 'INICIAL'
    sesion.origenTemporal = undefined
    sesion.destinoTemporal = undefined
    sesion.ultimaCotizacion = undefined
    const textoReset =
      'Consulta reiniciada. Indícanos desde qué sector sales y hacia dónde vas para darte el precio exacto.'
    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: textoReset,
      timestamp: new Date().toISOString(),
      extraccionNlu: extraccion,
    })
    await actualizarSesionCliente(sesion)
    return {
      textoRespuesta: textoReset,
      sesionActualizada: sesion,
      extraccionNlu: extraccion,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
    }
  }

  // Caso B: Confirmar despacho de unidad sobre una cotización activa
  if (
    extraccion.intencion === 'CONFIRMAR_DESPACHO' &&
    sesion.ultimaCotizacion
  ) {
    const cot = sesion.ultimaCotizacion
    const urlMaps = `https://www.google.com/maps/dir/?api=1&origin=${cot.coordenadasOrigen.lat},${cot.coordenadasOrigen.lon}&destination=${cot.coordenadasDestino.lat},${cot.coordenadasDestino.lon}&travelmode=driving`

    const nuevoPedido: PedidoDespachoWhatsApp = {
      id: `desp-${Date.now()}`,
      creadoEn: new Date().toISOString(),
      telefonoCliente: sesion.telefono,
      nombreCliente: sesion.nombreCliente,
      origen: cot.sectorOrigenDetectado,
      destino: cot.sectorDestinoDetectado,
      totalCop: cot.totalCop,
      totalUsd: cot.totalUsd,
      totalBsBcv: cot.totalVesBcv,
      distanciaKm: cot.distanciaVialKm,
      reglaAplicada: cot.tituloRegla,
      enlaceGoogleMaps: urlMaps,
      estadoDespacho: 'pendiente',
    }

    sesion.estado = 'DESPACHADO_A_OPERADOR'
    const textoDespacho = [
      `*¡SOLICITUD DE UNIDAD CONFIRMADA!*`,
      `----------------------------------`,
      `*Pasajero:* ${sesion.nombreCliente} (${sesion.telefono})`,
      `*Recogida:* ${cot.sectorOrigenDetectado}`,
      `*Destino:* ${cot.sectorDestinoDetectado}`,
      `*Tarifa acordada:* ${cot.totalCop.toLocaleString('es-CO')} COP ($${cot.totalUsd.toFixed(2)} USD / Bs. ${cot.totalVesBcv.toFixed(2)})`,
      `----------------------------------`,
      `Nuestra central en *Base Táriba* ya recibió tu pedido y te asignará la unidad más cercana en breves instantes.`,
    ].join('\n')

    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: textoDespacho,
      timestamp: new Date().toISOString(),
      extraccionNlu: extraccion,
    })

    await actualizarSesionCliente(sesion, nuevoPedido)
    return {
      textoRespuesta: textoDespacho,
      sesionActualizada: sesion,
      cotizacionGenerada: cot,
      extraccionNlu: extraccion,
      pedidoDespachoCreado: nuevoPedido,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
    }
  }

  // Actualizar origen/destino temporales según lo extraído
  if (extraccion.origenDetectado) {
    sesion.origenTemporal = extraccion.origenDetectado
  }
  if (extraccion.destinoDetectado) {
    sesion.destinoTemporal = extraccion.destinoDetectado
  }

  // Caso C: Tenemos tanto ORIGEN como DESTINO -> Cotizar con el motor entrenado
  if (sesion.origenTemporal && sesion.destinoTemporal) {
    const nocturnoActivo =
      params.forzarNocturno ??
      (sesion.opcionesDetectadas.nocturno || esHorarioNocturnoVenezuela())

    const opcionesViaje = {
      ...OPCIONES_VIAJE_DEFAULT,
      ...sesion.opcionesDetectadas,
      nocturno: nocturnoActivo,
    }

    const cotizacion = calcularTarifaPatriotas(
      sesion.origenTemporal,
      sesion.destinoTemporal,
      snapshot.parametros,
      opcionesViaje,
      snapshot.db,
      null,
      snapshot.estadoAprendizaje
    )

    sesion.estado = 'COTIZADO_PENDIENTE_CONFIRMACION'
    sesion.ultimaCotizacion = cotizacion

    const respuestaCotizacion = formatearMensajeCotizacionWhatsApp(
      cotizacion,
      opcionesViaje
    )

    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: respuestaCotizacion,
      timestamp: new Date().toISOString(),
      cotizacionAdjunta: cotizacion,
      extraccionNlu: extraccion,
    })

    await actualizarSesionCliente(sesion)
    return {
      textoRespuesta: respuestaCotizacion,
      sesionActualizada: sesion,
      cotizacionGenerada: cotizacion,
      extraccionNlu: extraccion,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
    }
  }

  // Caso D: El cliente dio el DESTINO pero falta el ORIGEN
  if (sesion.destinoTemporal && !sesion.origenTemporal) {
    sesion.estado = 'ESPERANDO_ORIGEN'
    const respuestaPedirOrigen = [
      `¡Con gusto te cotizamos el traslado hacia *${sesion.destinoTemporal}*!`,
      ``,
      `¿Desde qué sector, barrio o punto de referencia te recogemos?`,
      `*(También puedes enviarnos tu ubicación actual por WhatsApp)*`,
    ].join('\n')

    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: respuestaPedirOrigen,
      timestamp: new Date().toISOString(),
      extraccionNlu: extraccion,
    })

    await actualizarSesionCliente(sesion)
    return {
      textoRespuesta: respuestaPedirOrigen,
      sesionActualizada: sesion,
      extraccionNlu: extraccion,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
    }
  }

  // Caso E: El cliente dio el ORIGEN pero falta el DESTINO
  if (sesion.origenTemporal && !sesion.destinoTemporal) {
    sesion.estado = 'ESPERANDO_DESTINO'
    const respuestaPedirDestino = [
      `Perfecto, te recogemos en *${sesion.origenTemporal}*.`,
      ``,
      `¿Hacia qué sector o destino te diriges?`,
    ].join('\n')

    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: respuestaPedirDestino,
      timestamp: new Date().toISOString(),
      extraccionNlu: extraccion,
    })

    await actualizarSesionCliente(sesion)
    return {
      textoRespuesta: respuestaPedirDestino,
      sesionActualizada: sesion,
      extraccionNlu: extraccion,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
    }
  }

  // Caso F: Saludo inicial o consulta general
  const textoBienvenida = [
    `¡Hola! Bienvenido a *Línea Los Patriotas (Base Central Táriba)*.`,
    ``,
    `Soy el asistente automático de tarifas. Para darte el precio exacto en *Pesos (COP), Dólares (USD) y Bolívares (BCV)*, indícame:`,
    `1. *¿Dónde te recogemos?* (o envía tu pin de ubicación GPS)`,
    `2. *¿A dónde vas?*`,
    ``,
    `_Ejemplo: "Desde Las Vegas de Táriba hasta el Sambil"_`,
  ].join('\n')

  sesion.historial.push({
    id: `msg-${Date.now()}-b`,
    rol: 'bot',
    texto: textoBienvenida,
    timestamp: new Date().toISOString(),
    extraccionNlu: extraccion,
  })

  await actualizarSesionCliente(sesion)
  return {
    textoRespuesta: textoBienvenida,
    sesionActualizada: sesion,
    extraccionNlu: extraccion,
    leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
  }
}
