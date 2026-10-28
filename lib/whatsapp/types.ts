import { ResultadoCalculoTarifa } from '../tarifas/types'

export type EstadoConversacionWhatsApp =
  | 'INICIAL'
  | 'ESPERANDO_ORIGEN'
  | 'ESPERANDO_DESTINO'
  | 'COTIZADO_PENDIENTE_CONFIRMACION'
  | 'DESPACHADO_A_OPERADOR'

export type IntencionMensajeCliente =
  | 'SALUDO'
  | 'CONSULTA_PRECIO'
  | 'COMPLETAR_ORIGEN'
  | 'COMPLETAR_DESTINO'
  | 'CONFIRMAR_DESPACHO'
  | 'CANCELAR'
  | 'DUDA_OPERATIVA_TRASLADO'
  | 'FUERA_DE_DOMINIO'
  | 'PREGUNTA_GENERAL'

export type CategoriaDudaOperativaTraslado =
  | 'metodos_pago'
  | 'horario_nocturno'
  | 'equipaje_mascotas'
  | 'paradas_espera'
  | 'cobertura_unidades'
  | 'general_traslado'

export type EstrategiaRouterIA =
  | 'auto_complejidad'
  | 'balanceo_proveedores'
  | 'modelo_fijo'
  | 'custom_api_router'

export interface IntentoRouterModelo {
  modelo: string
  proveedor: string
  estado: 'exito' | 'error' | 'omitido'
  latenciaMs: number
  detalle?: string
}

export interface ConfiguracionRouterIA {
  estrategia: EstrategiaRouterIA
  modeloPrimario: string
  modelosFallback: string[]
  guardrailSoloTraslados: boolean
  customRouterUrl?: string
  customRouterModel?: string
}

export interface UbicacionGpsWhatsApp {
  lat: number
  lon: number
  nombreReferencia?: string
}

export interface ExtraccionNluWhatsApp {
  intencion: IntencionMensajeCliente
  esTemaTraslado?: boolean
  categoriaDudaTraslado?: CategoriaDudaOperativaTraslado | null
  origenDetectado: string | null
  destinoDetectado: string | null
  nocturnoExplicito: boolean
  lluviaExplicita: boolean
  feriadoExplicito: boolean
  paradasExtra: number
  minutosEspera: number
  motorNluUsado: 'cloud_ai' | 'local_heuristic'
  razonamientoBreve: string
  modeloUsado?: string
  estrategiaRouterUsada?: EstrategiaRouterIA
  latenciaRouterMs?: number
  intentosRouter?: IntentoRouterModelo[]
}

export interface MensajeHistorialWhatsApp {
  id: string
  rol: 'cliente' | 'bot'
  texto: string
  timestamp: string
  ubicacionGps?: UbicacionGpsWhatsApp
  cotizacionAdjunta?: ResultadoCalculoTarifa
  extraccionNlu?: ExtraccionNluWhatsApp
}

export interface PedidoDespachoWhatsApp {
  id: string
  creadoEn: string
  telefonoCliente: string
  nombreCliente: string
  origen: string
  destino: string
  totalCop: number
  totalUsd: number
  totalBsBcv: number
  distanciaKm: number
  reglaAplicada: string
  enlaceGoogleMaps: string
  estadoDespacho: 'pendiente' | 'unidad_asignada' | 'completado'
}

export interface SesionClienteWhatsApp {
  telefono: string
  nombreCliente: string
  estado: EstadoConversacionWhatsApp
  origenTemporal?: string
  destinoTemporal?: string
  coordenadasOrigen?: { lat: number; lon: number }
  coordenadasDestino?: { lat: number; lon: number }
  opcionesDetectadas: {
    nocturno: boolean
    lluvia: boolean
    feriado: boolean
    paradasExtra: number
    minutosEspera: number
  }
  ultimaCotizacion?: ResultadoCalculoTarifa
  ultimoMensajeTimestamp: number
  historial: MensajeHistorialWhatsApp[]
}

export interface ResultadoProcesamientoWhatsApp {
  textoRespuesta: string
  sesionActualizada: SesionClienteWhatsApp
  cotizacionGenerada?: ResultadoCalculoTarifa
  extraccionNlu: ExtraccionNluWhatsApp
  pedidoDespachoCreado?: PedidoDespachoWhatsApp
  leccionesActivasMotor: number
  configuracionRouterActiva?: ConfiguracionRouterIA
}
