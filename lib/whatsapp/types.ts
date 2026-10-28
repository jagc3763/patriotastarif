import { ResultadoCalculoTarifa } from '@/lib/tarifas/types'

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
  | 'PREGUNTA_GENERAL'

export interface UbicacionGpsWhatsApp {
  lat: number
  lon: number
  nombreReferencia?: string
  direccion?: string
}

export interface ExtraccionNluWhatsApp {
  intencion: IntencionMensajeCliente
  origenDetectado: string | null
  destinoDetectado: string | null
  nocturnoExplicito: boolean
  lluviaExplicita: boolean
  feriadoExplicito: boolean
  paradasExtra: number
  minutosEspera: number
  motorNluUsado: 'cloud_ai' | 'local_heuristic'
  razonamientoBreve: string
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

export interface ResultadoProcesamientoWhatsApp {
  textoRespuesta: string
  sesionActualizada: SesionClienteWhatsApp
  cotizacionGenerada?: ResultadoCalculoTarifa
  extraccionNlu: ExtraccionNluWhatsApp
  pedidoDespachoCreado?: PedidoDespachoWhatsApp
  leccionesActivasMotor: number
}
