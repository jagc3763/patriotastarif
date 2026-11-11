import { generateText, Output } from 'ai'
import { z } from 'zod'
import { leerSnapshotEntrenamiento } from '@/app/api/tarifas/entrenamiento/route'
import {
  calcularTarifaPatriotas,
  OPCIONES_VIAJE_DEFAULT,
} from '@/lib/tarifas/engine'
import { encontrarAnclasTarifariasCercanas } from '@/lib/tarifas/geografia-tachira'
import {
  ParametrosMotorTarifas,
  ResultadoCalculoTarifa,
} from '@/lib/tarifas/types'
import {
  obtenerProveedorDeModelo,
  resolverCadenaModelosRouter,
} from './model-router'
import {
  actualizarSesionCliente,
  obtenerConfiguracionRouter,
  obtenerSesionCliente,
} from './session-store'
import {
  CategoriaDudaOperativaTraslado,
  ConfiguracionRouterIA,
  ExtraccionNluWhatsApp,
  IntentoRouterModelo,
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
    'DUDA_OPERATIVA_TRASLADO',
    'FUERA_DE_DOMINIO',
  ]),
  esTemaTraslado: z
    .boolean()
    .describe(
      'true ÚNICAMENTE si el mensaje trata sobre pedir un taxi, cotizar rutas en el Táchira, ubicaciones de recogida/destino o condiciones operativas del traslado (pagos, horarios, paradas, espera, equipaje). false para cualquier otro tema.'
    ),
  categoriaDudaTraslado: z
    .enum([
      'metodos_pago',
      'horario_nocturno',
      'equipaje_mascotas',
      'paradas_espera',
      'cobertura_unidades',
      'general_traslado',
    ])
    .nullable(),
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
 * Detecta preguntas operativas sobre el servicio de traslado (pagos, horarios, equipaje, paradas, espera)
 */
function detectarCategoriaDudaTraslado(
  lower: string
): CategoriaDudaOperativaTraslado | null {
  if (
    /\b(pago\s*movil|transferencia|efectivo|pesos|dolares|bolivares|bcv|zelle|divisas|formas?\s+de\s+pago|metodos?\s+de\s+pago|como\s+pago|aceptan)\b/i.test(
      lower
    )
  ) {
    return 'metodos_pago'
  }
  if (
    /\b(a\s+que\s+hora|horario\s+nocturno|hasta\s+que\s+hora\s+trabajan|trabajan\s+24|madrugada|recargo\s+nocturno)\b/i.test(
      lower
    )
  ) {
    return 'horario_nocturno'
  }
  if (
    /\b(maleta|equipaje|bulto|mercado|mascota|perro|gato|jaula|silla\s+de\s+ruedas|aire\s+acondicionado|cuantos\s+pasajeros|capacidad)\b/i.test(
      lower
    )
  ) {
    return 'equipaje_mascotas'
  }
  if (
    /\b(cuanto\s+cobran\s+por\s+parada|parada\s+adicional|parada\s+extra|tiempo\s+de\s+espera|minutos?\s+de\s+espera|esperarme)\b/i.test(
      lower
    )
  ) {
    return 'paradas_espera'
  }
  if (
    /\b(donde\s+quedan|ubicados|base\s+central|numero\s+de\s+telefono|viajan\s+fuera|aeropuerto|san\s+antonio|rubio|la\s+grita|el\s+piñal|pinal)\b/i.test(
      lower
    )
  ) {
    return 'cobertura_unidades'
  }
  return null
}

/**
 * Detecta si un mensaje es claramente ajeno al dominio de traslados y taxis
 */
function esMensajeFueraDeDominioHeuristico(lower: string): boolean {
  return /\b(receta|cocinar|pizca\s+andina|ingrediente|poema|chiste|cuento|futbol|partido|mundial|real\s+madrid|barcelona|politica|presidente|elecciones|programar|codigo\s+en\s+python|javascript|html|ecuacion|derivada|raiz\s+cuadrada|horoscopo|signo\s+zodiacal|pelicula|netflix|bitcoin|criptomoneda|traduce\s+al\s+ingles|quien\s+descubrio|capital\s+de\s+francia|tarea\s+de\s+matematicas)\b/i.test(
    lower
  )
}

/**
 * Heurística local ultrarrápida para extraer intención, origen, destino y guardrails de dominio en español tachirense.
 * Sirve como respaldo determinístico cuando se ejecuta en local sin internet a la IA o para comandos directos.
 */
export function extraerIntencionHeuristicaLocal(
  textoOriginal: string,
  sesion: SesionClienteWhatsApp,
  guardrailSoloTraslados = true
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

  // 0. Guardrail de dominio: bloquear temas ajenos a traslados antes de alterar la sesión
  if (guardrailSoloTraslados && esMensajeFueraDeDominioHeuristico(lower)) {
    return {
      intencion: 'FUERA_DE_DOMINIO',
      esTemaTraslado: false,
      categoriaDudaTraslado: null,
      origenDetectado: null,
      destinoDetectado: null,
      nocturnoExplicito: false,
      lluviaExplicita: false,
      feriadoExplicito: false,
      paradasExtra: 0,
      minutosEspera: 0,
      motorNluUsado: 'local_heuristic',
      modeloUsado: 'guardrail-local-deterministico',
      razonamientoBreve:
        'Guardrail activado: la consulta no está relacionada con traslados ni servicios de taxi.',
    }
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
      esTemaTraslado: true,
      categoriaDudaTraslado: null,
      origenDetectado: sesion.origenTemporal ?? null,
      destinoDetectado: sesion.destinoTemporal ?? null,
      nocturnoExplicito,
      lluviaExplicita,
      feriadoExplicito,
      paradasExtra,
      minutosEspera,
      motorNluUsado: 'local_heuristic',
      modeloUsado: 'motor-local-instantaneo',
      razonamientoBreve:
        'Cliente confirmó el envío de la unidad sobre la cotización activa.',
    }
  }

  // 2. Cancelación / reinicio
  if (/^(cancelar|reiniciar|salir|no gracias|otra consulta)\b/i.test(lower)) {
    return {
      intencion: 'CANCELAR',
      esTemaTraslado: true,
      categoriaDudaTraslado: null,
      origenDetectado: null,
      destinoDetectado: null,
      nocturnoExplicito: false,
      lluviaExplicita: false,
      feriadoExplicito: false,
      paradasExtra: 0,
      minutosEspera: 0,
      motorNluUsado: 'local_heuristic',
      modeloUsado: 'motor-local-instantaneo',
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
        esTemaTraslado: true,
        categoriaDudaTraslado: null,
        origenDetectado: orig,
        destinoDetectado: dest,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        modeloUsado: 'motor-local-instantaneo',
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
        esTemaTraslado: true,
        categoriaDudaTraslado: null,
        origenDetectado: orig,
        destinoDetectado: dest,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        modeloUsado: 'motor-local-instantaneo',
        razonamientoBreve: `Detectado trayecto directo (${orig} → ${dest}).`,
      }
    }
  }

  // 4.5. Duda operativa sobre el servicio de traslado (pagos, horario nocturno, paradas, equipaje/mascotas)
  const categoriaDuda = detectarCategoriaDudaTraslado(lower)
  if (categoriaDuda) {
    return {
      intencion: 'DUDA_OPERATIVA_TRASLADO',
      esTemaTraslado: true,
      categoriaDudaTraslado: categoriaDuda,
      origenDetectado: null,
      destinoDetectado: null,
      nocturnoExplicito,
      lluviaExplicita,
      feriadoExplicito,
      paradasExtra,
      minutosEspera,
      motorNluUsado: 'local_heuristic',
      modeloUsado: 'motor-local-instantaneo',
      razonamientoBreve: `Duda operativa sobre traslados detectada (${categoriaDuda}).`,
    }
  }

  // 5. Si la sesión está esperando el ORIGEN y el cliente responde con el sector
  if (sesion.estado === 'ESPERANDO_ORIGEN') {
    const origCandidate = limpiarLugar(
      texto.replace(/^(desde|en|estoy en|salgo de|me recoges en)\s+/i, '')
    )
    if (origCandidate.length >= 2 && origCandidate.split(/\s+/).length <= 7) {
      return {
        intencion: 'COMPLETAR_ORIGEN',
        esTemaTraslado: true,
        categoriaDudaTraslado: null,
        origenDetectado: origCandidate,
        destinoDetectado: sesion.destinoTemporal ?? null,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        modeloUsado: 'motor-local-instantaneo',
        razonamientoBreve: `Cliente completó el sector de recogida faltante: ${origCandidate}.`,
      }
    }
  }

  // 6. Si la sesión está esperando el DESTINO y el cliente responde con el sector
  if (sesion.estado === 'ESPERANDO_DESTINO') {
    const destCandidate = limpiarLugar(
      texto.replace(/^(hasta|para|pa|hacia|voy a|voy para|a)\s+/i, '')
    )
    if (destCandidate.length >= 2 && destCandidate.split(/\s+/).length <= 7) {
      return {
        intencion: 'COMPLETAR_DESTINO',
        esTemaTraslado: true,
        categoriaDudaTraslado: null,
        origenDetectado: sesion.origenTemporal ?? null,
        destinoDetectado: destCandidate,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        modeloUsado: 'motor-local-instantaneo',
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
        esTemaTraslado: true,
        categoriaDudaTraslado: null,
        origenDetectado: null,
        destinoDetectado: dest,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        modeloUsado: 'motor-local-instantaneo',
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
        esTemaTraslado: true,
        categoriaDudaTraslado: null,
        origenDetectado: orig,
        destinoDetectado: null,
        nocturnoExplicito,
        lluviaExplicita,
        feriadoExplicito,
        paradasExtra,
        minutosEspera,
        motorNluUsado: 'local_heuristic',
        modeloUsado: 'motor-local-instantaneo',
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
      esTemaTraslado: true,
      categoriaDudaTraslado: null,
      origenDetectado: null,
      destinoDetectado: null,
      nocturnoExplicito,
      lluviaExplicita,
      feriadoExplicito,
      paradasExtra,
      minutosEspera,
      motorNluUsado: 'local_heuristic',
      modeloUsado: 'motor-local-instantaneo',
      razonamientoBreve: 'Saludo inicial o consulta de disponibilidad.',
    }
  }

  return {
    intencion: guardrailSoloTraslados ? 'FUERA_DE_DOMINIO' : 'PREGUNTA_GENERAL',
    esTemaTraslado: !guardrailSoloTraslados,
    categoriaDudaTraslado: null,
    origenDetectado: null,
    destinoDetectado: null,
    nocturnoExplicito,
    lluviaExplicita,
    feriadoExplicito,
    paradasExtra,
    minutosEspera,
    motorNluUsado: 'local_heuristic',
    modeloUsado: 'guardrail-local-deterministico',
    razonamientoBreve:
      'El mensaje no contiene sectores de traslado ni dudas operativas de taxi.',
  }
}

/**
 * Invoca un endpoint externo compatible con OpenAI (ej. OpenRouter, Groq, Together)
 * cuando la estrategia es 'custom_api_router' y se dispone de API Key.
 */
async function invocarCustomRouterApiCompatible(params: {
  baseUrl: string
  apiKey: string
  modelo: string
  systemPrompt: string
  userPrompt: string
}): Promise<z.infer<typeof EsquemaNluWhatsApp> | null> {
  const endpoint = `${params.baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.modelo,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${params.systemPrompt}\n\nResponde EXCLUSIVAMENTE con un JSON válido con las llaves exactas: intencion, esTemaTraslado, categoriaDudaTraslado, origenDetectado, destinoDetectado, nocturnoExplicito, lluviaExplicita, feriadoExplicito, paradasExtra, minutosEspera, razonamientoBreve.`,
        },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en Router API externo`)
  }
  const data = await res.json()
  const rawContent = data?.choices?.[0]?.message?.content
  if (!rawContent) return null

  const parsed = JSON.parse(rawContent)
  return EsquemaNluWhatsApp.parse(parsed)
}

/**
 * Extrae la intención y entidades usando el Router Multi-Modelo IA (con conmutación automática entre modelos)
 * y aplica el Guardrail estricto para responder únicamente temas de traslados.
 */
export async function extraerIntencionConIA(
  textoCliente: string,
  sesion: SesionClienteWhatsApp,
  configRouter: ConfiguracionRouterIA
): Promise<ExtraccionNluWhatsApp> {
  const heuristica = extraerIntencionHeuristicaLocal(
    textoCliente,
    sesion,
    configRouter.guardrailSoloTraslados
  )

  // Si es confirmación directa o cancelación clara, respondemos al instante sin latencia extra
  if (
    heuristica.intencion === 'CONFIRMAR_DESPACHO' ||
    heuristica.intencion === 'CANCELAR'
  ) {
    return {
      ...heuristica,
      estrategiaRouterUsada: configRouter.estrategia,
      latenciaRouterMs: 1,
      intentosRouter: [
        {
          modelo: 'motor-local-instantaneo',
          proveedor: 'Determinístico Local',
          estado: 'exito',
          latenciaMs: 1,
          detalle: 'Comando directo de sesión resuelto sin latencia de red',
        },
      ],
    }
  }

  const contextoHistorial = sesion.historial
    .slice(-4)
    .map((m) => `${m.rol.toUpperCase()}: ${m.texto}`)
    .join('\n')

  const systemPrompt = `Eres exclusivamente el despachador NLU de WhatsApp de la Línea de Taxis "Los Patriotas" (Base Central Táriba, Municipio Cárdenas, Estado Táchira, Venezuela).

REGLA DE HIERRO DE DOMINIO (SOLO TRASLADOS):
1. ÚNICAMENTE procesas solicitudes de traslado en taxi, cotizaciones de rutas (origen y destino en Táchira), confirmaciones de despacho y dudas operativas del servicio de transporte (métodos de pago en COP/USD/Bs BCV, horario nocturno, lluvia, paradas extra, tiempo de espera, equipaje o mascotas).
2. Si el usuario pregunta CUALQUIER OTRA COSA que NO tenga relación con un traslado o servicio de taxi (por ejemplo: recetas de cocina, deportes, fútbol, política, matemáticas, programación, historia, chistes, tareas escolares o conversación general ajena al transporte), DEBES clasificar obligatoriamente:
   - intencion = "FUERA_DE_DOMINIO"
   - esTemaTraslado = false
   - origenDetectado = null
   - destinoDetectado = null
3. Si el usuario hace una pregunta sobre cómo funciona el servicio de traslado (ej. "¿aceptan Pago Móvil?", "¿cuánto cobran por parada extra?", "¿puedo llevar maletas o perro?", "¿a qué hora empieza el nocturno?"), clasifica:
   - intencion = "DUDA_OPERATIVA_TRASLADO"
   - esTemaTraslado = true
   - categoriaDudaTraslado = una de ['metodos_pago', 'horario_nocturno', 'equipaje_mascotas', 'paradas_espera', 'cobertura_unidades', 'general_traslado']
4. Estado actual de la conversación: ${sesion.estado}.
   - Origen temporal ya guardado en sesión: ${sesion.origenTemporal ?? 'ninguno'}.
   - Destino temporal ya guardado en sesión: ${sesion.destinoTemporal ?? 'ninguno'}.
   - Si el estado es ESPERANDO_ORIGEN y el usuario envía un barrio, urbanización, aldea o punto de referencia de Táchira, clasifica como COMPLETAR_ORIGEN y coloca ese lugar en origenDetectado.
   - Si el estado es ESPERANDO_DESTINO y el usuario envía un lugar, clasifica como COMPLETAR_DESTINO y coloca ese lugar en destinoDetectado.
   - Si el estado es COTIZADO_PENDIENTE_CONFIRMACION y el usuario acepta o pide enviar el taxi ("sí", "pedir", "mándalo", "dale"), clasifica como CONFIRMAR_DESPACHO.
5. Limpia palabras de cortesía de los nombres de lugares (ej. "desde Las Vegas de Táriba por favor" -> "Las Vegas de Táriba").`

  const userPrompt = `Historial reciente:\n${contextoHistorial || 'Sin mensajes previos'}\n\nMensaje actual del cliente por WhatsApp: "${textoCliente}"`

  const cadenaModelos = resolverCadenaModelosRouter(textoCliente, configRouter)
  const intentosRouter: IntentoRouterModelo[] = []
  const inicioGlobal = Date.now()

  for (const modeloId of cadenaModelos) {
    const inicioModelo = Date.now()
    const proveedor = obtenerProveedorDeModelo(modeloId)

    try {
      // Si la estrategia es custom_api_router y es el primer modelo, probamos el endpoint externo si existe API key
      const customApiKey =
        process.env.AI_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY
      if (
        configRouter.estrategia === 'custom_api_router' &&
        modeloId === configRouter.customRouterModel &&
        customApiKey &&
        configRouter.customRouterUrl
      ) {
        const salidaExterna = await invocarCustomRouterApiCompatible({
          baseUrl: configRouter.customRouterUrl,
          apiKey: customApiKey,
          modelo: modeloId,
          systemPrompt,
          userPrompt,
        })
        if (salidaExterna) {
          const latenciaMs = Date.now() - inicioModelo
          intentosRouter.push({
            modelo: modeloId,
            proveedor: 'Router API Externo',
            estado: 'exito',
            latenciaMs,
          })
          return {
            ...salidaExterna,
            motorNluUsado: 'cloud_ai',
            modeloUsado: modeloId,
            estrategiaRouterUsada: configRouter.estrategia,
            latenciaRouterMs: Date.now() - inicioGlobal,
            intentosRouter,
          }
        }
      }

      const { output } = await generateText({
        model: modeloId,
        output: Output.object({ schema: EsquemaNluWhatsApp }),
        temperature: 0,
        system: systemPrompt,
        prompt: userPrompt,
      })

      if (output) {
        const latenciaMs = Date.now() - inicioModelo
        intentosRouter.push({
          modelo: modeloId,
          proveedor,
          estado: 'exito',
          latenciaMs,
        })
        return {
          ...output,
          motorNluUsado: 'cloud_ai',
          modeloUsado: modeloId,
          estrategiaRouterUsada: configRouter.estrategia,
          latenciaRouterMs: Date.now() - inicioGlobal,
          intentosRouter,
        }
      }
    } catch (err) {
      const latenciaMs = Date.now() - inicioModelo
      intentosRouter.push({
        modelo: modeloId,
        proveedor,
        estado: 'error',
        latenciaMs,
        detalle:
          err instanceof Error
            ? err.message.slice(0, 90)
            : 'Fallo de conexión con proveedor',
      })
      continue
    }
  }

  // Fallback transparente al motor heurístico local si ningún modelo en la nube estuvo disponible
  return {
    ...heuristica,
    estrategiaRouterUsada: configRouter.estrategia,
    latenciaRouterMs: Date.now() - inicioGlobal,
    intentosRouter: [
      ...intentosRouter,
      {
        modelo: heuristica.modeloUsado || 'motor-local-instantaneo',
        proveedor: 'Fallback Local Táchira',
        estado: 'exito',
        latenciaMs: 1,
        detalle: 'Resuelto por motor determinístico local',
      },
    ],
  }
}

/**
 * Genera respuestas determinísticas para dudas operativas de traslado usando los parámetros reales del motor
 */
export function formatearRespuestaDudaOperativaTraslado(
  categoria: CategoriaDudaOperativaTraslado | null | undefined,
  parametros: ParametrosMotorTarifas,
  sesion: SesionClienteWhatsApp
): string {
  const recordatorioRuta =
    sesion.origenTemporal && !sesion.destinoTemporal
      ? `\n\n_Seguimos atentos a tu traslado desde *${sesion.origenTemporal}*. ¿Hacia qué sector te diriges?_`
      : !sesion.origenTemporal && sesion.destinoTemporal
      ? `\n\n_Seguimos atentos a tu traslado hacia *${sesion.destinoTemporal}*. ¿En qué sector te recogemos?_`
      : `\n\n_Para cotizar tu traslado al instante, escríbenos desde qué sector sales y hacia dónde vas (ej: *De Táriba a Sambil*)._`

  switch (categoria) {
    case 'metodos_pago':
      return [
        `*MÉTODOS DE PAGO — LÍNEA LOS PATRIOTAS*`,
        `Aceptamos pagos en nuestras tres monedas oficiales calculadas al momento:`,
        `• *Pesos Colombianos (COP):* Efectivo o transferencia (Tasa base: ${parametros.tasaCopPorUsd.toLocaleString('es-CO')} COP/USD).`,
        `• *Dólares (USD):* Efectivo o divisas.`,
        `• *Bolívares (Bs. BCV):* Pago Móvil o transferencia a tasa oficial BCV (Bs. ${parametros.tasaBcvPorUsd.toFixed(2)}/USD).`,
      ].join('\n') + recordatorioRuta

    case 'horario_nocturno':
      return [
        `*HORARIO Y CONDICIONES NOCTURNAS — LOS PATRIOTAS*`,
        `• Operamos desde *Base Central Táriba* para todo el área metropolitana y municipios del Táchira.`,
        `• El horario nocturno rige de *7:00 PM a 5:59 AM* (aplica un ajuste oficial del *+${parametros.recargoNocturnoPct}%*, o *+${parametros.recargoLluviaPct}%* en condición de lluvia/feriado).`,
      ].join('\n') + recordatorioRuta

    case 'paradas_espera':
      return [
        `*PARADAS ADICIONALES Y TIEMPO DE ESPERA*`,
        `• *Parada extra en ruta:* +${parametros.costoParadaExtraCop.toLocaleString('es-CO')} COP por cada parada adicional.`,
        `• *Tiempo de espera:* Cada minuto de espera tiene un valor de *${parametros.costoMinutoEsperaCop.toLocaleString('es-CO')} COP*.`,
      ].join('\n') + recordatorioRuta

    case 'equipaje_mascotas':
      return [
        `*EQUIPAJE, PASAJEROS Y MASCOTAS — LOS PATRIOTAS*`,
        `• Nuestras unidades tienen capacidad estándar para *4 pasajeros* y equipaje de maletero sin costo adicional.`,
        `• Si viajas con mascota en su bolso/kennel o requieres unidad amplia por equipaje especial, indícalo al confirmar con la palabra *PEDIR*.`,
      ].join('\n') + recordatorioRuta

    case 'cobertura_unidades':
      return [
        `*COBERTURA VIAL — LÍNEA LOS PATRIOTAS (BASE TÁRIBA)*`,
        `• Cubrimos las *270 rutas oficiales* en Cárdenas, San Cristóbal, Guásimos, Andrés Bello, Torbes, Capacho, Bolívar, Junín, Ayacucho, Jáuregui y traslados a aeropuertos (Santo Domingo y Cipriano Castro).`,
      ].join('\n') + recordatorioRuta

    default:
      return [
        `*INFORMACIÓN DE TRASLADOS — LÍNEA LOS PATRIOTAS*`,
        `• Cotizamos tu carrera en segundos en *COP, USD y Bs. BCV* según nuestro tabulador oficial y telemetría vial.`,
        `• Puedes enviarnos el sector de *origen y destino* por texto o compartir tu *Pin de Ubicación GPS*.`,
      ].join('\n') + recordatorioRuta
  }
}

/**
 * Genera el mensaje estricto cuando el Guardrail bloquea una pregunta ajena a traslados
 */
export function formatearRespuestaFueraDeDominio(
  sesion: SesionClienteWhatsApp
): string {
  const estadoPendiente =
    sesion.origenTemporal && !sesion.destinoTemporal
      ? `\n\nTenías pendiente indicar el *destino* saliendo desde *${sesion.origenTemporal}*. ¿Hacia dónde te llevamos?`
      : !sesion.origenTemporal && sesion.destinoTemporal
      ? `\n\nTenías pendiente indicar el *sector de recogida* para ir hacia *${sesion.destinoTemporal}*. ¿Dónde te buscamos?`
      : `\n\nIndícanos tu *sector de origen* y *destino* (ej: *"Desde Las Vegas de Táriba hasta el Sambil"*) o envía tu ubicación GPS para cotizar tu carrera.`

  return (
    `*ASISTENTE EXCLUSIVO DE TRASLADOS — LÍNEA LOS PATRIOTAS*\n` +
    `Solo estoy autorizado para responder consultas referentes a *traslados, tarifas de rutas, disponibilidad de unidades y despacho de taxis* en el Estado Táchira.` +
    estadoPendiente
  )
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
  configRouterOverride?: Partial<ConfiguracionRouterIA>
}): Promise<ResultadoProcesamientoWhatsApp> {
  const snapshot = await leerSnapshotEntrenamiento()
  const configGuardada = await obtenerConfiguracionRouter()
  const configRouter: ConfiguracionRouterIA = {
    ...configGuardada,
    ...(params.configRouterOverride || {}),
  }

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
        esTemaTraslado: true,
        origenDetectado: sesion.origenTemporal,
        destinoDetectado: sesion.destinoTemporal,
        nocturnoExplicito: nocturnoActivo,
        lluviaExplicita: opcionesViaje.lluvia,
        feriadoExplicito: opcionesViaje.feriado,
        paradasExtra: opcionesViaje.paradasExtra,
        minutosEspera: opcionesViaje.minutosEspera,
        motorNluUsado: 'local_heuristic',
        modeloUsado: 'telemetria-gps-local',
        estrategiaRouterUsada: configRouter.estrategia,
        latenciaRouterMs: 1,
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
        configuracionRouterActiva: configRouter,
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
      esTemaTraslado: true,
      origenDetectado: sesion.origenTemporal ?? etiquetaGps,
      destinoDetectado: null,
      nocturnoExplicito: false,
      lluviaExplicita: false,
      feriadoExplicito: false,
      paradasExtra: 0,
      minutosEspera: 0,
      motorNluUsado: 'local_heuristic',
      modeloUsado: 'telemetria-gps-local',
      estrategiaRouterUsada: configRouter.estrategia,
      latenciaRouterMs: 1,
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
      configuracionRouterActiva: configRouter,
    }
  }

  // 2. Procesamiento de mensaje de texto con Router Multi-Modelo IA + Guardrail de Dominio
  const extraccion = await extraerIntencionConIA(
    textoEntrada,
    sesion,
    configRouter
  )

  sesion.historial.push({
    id: `msg-${Date.now()}-c`,
    rol: 'cliente',
    texto: textoEntrada,
    timestamp: ahoraIso,
    extraccionNlu: extraccion,
  })

  // Caso 0: GUARDRAIL ESTRICTO — Si el mensaje está fuera del dominio de traslados, rechazamos cortésmente sin alterar el estado de sesión
  if (
    configRouter.guardrailSoloTraslados &&
    (extraccion.intencion === 'FUERA_DE_DOMINIO' ||
      extraccion.esTemaTraslado === false)
  ) {
    const textoBloqueo = formatearRespuestaFueraDeDominio(sesion)
    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: textoBloqueo,
      timestamp: new Date().toISOString(),
      extraccionNlu: extraccion,
    })
    await actualizarSesionCliente(sesion)
    return {
      textoRespuesta: textoBloqueo,
      sesionActualizada: sesion,
      extraccionNlu: extraccion,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
      configuracionRouterActiva: configRouter,
    }
  }

  // Actualizar condiciones operativas detectadas en la conversación
  if (extraccion.nocturnoExplicito) sesion.opcionesDetectadas.nocturno = true
  if (extraccion.lluviaExplicita) sesion.opcionesDetectadas.lluvia = true
  if (extraccion.feriadoExplicito) sesion.opcionesDetectadas.feriado = true
  if (extraccion.paradasExtra > 0)
    sesion.opcionesDetectadas.paradasExtra = extraccion.paradasExtra
  if (extraccion.minutosEspera > 0)
    sesion.opcionesDetectadas.minutosEspera = extraccion.minutosEspera

  // Caso 0.5: Duda Operativa referente a los traslados (métodos de pago, horario nocturno, paradas, espera, equipaje)
  if (
    extraccion.intencion === 'DUDA_OPERATIVA_TRASLADO' &&
    !extraccion.origenDetectado &&
    !extraccion.destinoDetectado
  ) {
    const respuestaDuda = formatearRespuestaDudaOperativaTraslado(
      extraccion.categoriaDudaTraslado,
      snapshot.parametros,
      sesion
    )
    sesion.historial.push({
      id: `msg-${Date.now()}-b`,
      rol: 'bot',
      texto: respuestaDuda,
      timestamp: new Date().toISOString(),
      extraccionNlu: extraccion,
    })
    await actualizarSesionCliente(sesion)
    return {
      textoRespuesta: respuestaDuda,
      sesionActualizada: sesion,
      extraccionNlu: extraccion,
      leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
      configuracionRouterActiva: configRouter,
    }
  }

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
      configuracionRouterActiva: configRouter,
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
      configuracionRouterActiva: configRouter,
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
      configuracionRouterActiva: configRouter,
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
      configuracionRouterActiva: configRouter,
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
      configuracionRouterActiva: configRouter,
    }
  }

  // Caso F: Saludo inicial o consulta de inicio sin origen ni destino aún
  const respuestaBienvenida = [
    `¡Hola! Bienvenido a *Línea Los Patriotas (Base Central Táriba)*.`,
    ``,
    `Soy tu asistente exclusivo de traslados. Para darte el precio exacto al instante (en Pesos, Dólares y Bs. BCV), indícame:`,
    `1. *¿En qué sector o punto te recogemos?* (o envía tu ubicación GPS)`,
    `2. *¿Hacia qué sector te diriges?*`,
    ``,
    `_Ejemplo: "Desde Las Vegas de Táriba hasta el Sambil"_`,
  ].join('\n')

  sesion.historial.push({
    id: `msg-${Date.now()}-b`,
    rol: 'bot',
    texto: respuestaBienvenida,
    timestamp: new Date().toISOString(),
    extraccionNlu: extraccion,
  })

  await actualizarSesionCliente(sesion)
  return {
    textoRespuesta: respuestaBienvenida,
    sesionActualizada: sesion,
    extraccionNlu: extraccion,
    leccionesActivasMotor: snapshot.estadoAprendizaje.lecciones.length,
    configuracionRouterActiva: configRouter,
  }
}
