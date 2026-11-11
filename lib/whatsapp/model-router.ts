import {
  ConfiguracionRouterIA,
  EstrategiaRouterIA,
} from './types'

export interface ModeloCatalogoRouter {
  id: string
  nombre: string
  proveedor: 'OpenAI' | 'Google' | 'Anthropic' | 'OpenRouter / Custom'
  especialidad: string
  velocidad: 'Ultra rápida' | 'Rápida' | 'Alta precisión'
}

export const CATALOGO_MODELOS_ROUTER: ModeloCatalogoRouter[] = [
  {
    id: 'openai/gpt-5.4-mini',
    nombre: 'GPT-5.4 Mini',
    proveedor: 'OpenAI',
    especialidad: 'Extracción estructurada JSON de orígenes, destinos y modificadores',
    velocidad: 'Ultra rápida',
  },
  {
    id: 'google/gemini-3.5-flash',
    nombre: 'Gemini 3.5 Flash',
    proveedor: 'Google',
    especialidad: 'Baja latencia y alta disponibilidad para consultas rápidas de WhatsApp',
    velocidad: 'Ultra rápida',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    nombre: 'Claude Haiku 4.5',
    proveedor: 'Anthropic',
    especialidad: 'Comprensión de jerga tachirense, referencias coloquiales y paradas múltiples',
    velocidad: 'Rápida',
  },
  {
    id: 'openai/gpt-5.4',
    nombre: 'GPT-5.4',
    proveedor: 'OpenAI',
    especialidad: 'Razonamiento avanzado para mensajes ambiguos o multi-tramo',
    velocidad: 'Alta precisión',
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    nombre: 'Claude Sonnet 4.6',
    proveedor: 'Anthropic',
    especialidad: 'Máxima fidelidad semántica y filtrado estricto de dominio',
    velocidad: 'Alta precisión',
  },
]

export const CONFIGURACION_ROUTER_DEFECTO: ConfiguracionRouterIA = {
  estrategia:
    (process.env.AI_ROUTER_STRATEGY as EstrategiaRouterIA) ||
    'auto_complejidad',
  modeloPrimario: process.env.AI_ROUTER_PRIMARY_MODEL || 'openai/gpt-5.4-mini',
  modelosFallback: [
    'google/gemini-3.5-flash',
    'anthropic/claude-haiku-4.5',
  ],
  guardrailSoloTraslados: true,
  customRouterUrl:
    process.env.AI_ROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  customRouterModel:
    process.env.AI_ROUTER_CUSTOM_MODEL || 'openai/gpt-4o-mini',
}

let contadorRoundRobin = 0

export function obtenerProveedorDeModelo(modeloId: string): string {
  if (modeloId.startsWith('openai/')) return 'OpenAI'
  if (modeloId.startsWith('google/')) return 'Google Gemini'
  if (modeloId.startsWith('anthropic/')) return 'Anthropic Claude'
  return 'Router API Externo'
}

/**
 * Construye la secuencia ordenada de modelos que el Router intentará en cascada
 * según la estrategia activa y la complejidad semántica del mensaje del pasajero.
 */
export function resolverCadenaModelosRouter(
  textoCliente: string,
  config: ConfiguracionRouterIA
): string[] {
  const todosPorDefecto = [
    'openai/gpt-5.4-mini',
    'google/gemini-3.5-flash',
    'anthropic/claude-haiku-4.5',
  ]

  if (config.estrategia === 'modelo_fijo') {
    const primario = config.modeloPrimario || 'openai/gpt-5.4-mini'
    const resto = [
      ...config.modelosFallback,
      ...todosPorDefecto,
    ].filter((m, idx, arr) => m !== primario && arr.indexOf(m) === idx)
    return [primario, ...resto]
  }

  if (config.estrategia === 'balanceo_proveedores') {
    const rotacion = [
      'openai/gpt-5.4-mini',
      'google/gemini-3.5-flash',
      'anthropic/claude-haiku-4.5',
    ]
    const indice = contadorRoundRobin % rotacion.length
    contadorRoundRobin += 1
    return [
      rotacion[indice],
      rotacion[(indice + 1) % rotacion.length],
      rotacion[(indice + 2) % rotacion.length],
    ]
  }

  if (config.estrategia === 'custom_api_router') {
    const customModel = config.customRouterModel || 'openai/gpt-4o-mini'
    return [customModel, ...todosPorDefecto]
  }

  // Estrategia por defecto: 'auto_complejidad'
  // Si el mensaje tiene referencias coloquiales largas, múltiples condiciones o dudas operativas,
  // priorizamos Claude Haiku 4.5 -> GPT-5.4 Mini -> Gemini 3.5 Flash.
  const esMensajeComplejo =
    textoCliente.length > 85 ||
    /parada|espera|mientras|hospital|redoma|puente|terminal|pago\s*m[oó]vil|transferencia|zelle|equipaje|maleta|mascota|perro|gato/i.test(
      textoCliente
    )

  if (esMensajeComplejo) {
    return [
      'anthropic/claude-haiku-4.5',
      'openai/gpt-5.4-mini',
      'google/gemini-3.5-flash',
    ]
  }

  // Si es una consulta ultra corta de respuesta ("Sí", "PEDIR", "En Sabaneta"), priorizamos velocidad
  if (textoCliente.trim().length <= 28) {
    return [
      'google/gemini-3.5-flash',
      'openai/gpt-5.4-mini',
      'anthropic/claude-haiku-4.5',
    ]
  }

  return [
    'openai/gpt-5.4-mini',
    'google/gemini-3.5-flash',
    'anthropic/claude-haiku-4.5',
  ]
}
