import { promises as fs } from 'fs'
import {
  ConfiguracionRouterIA,
  PedidoDespachoWhatsApp,
  SesionClienteWhatsApp,
} from './types'
import { CONFIGURACION_ROUTER_DEFECTO } from './model-router'

const ARCHIVO_SESIONES_WHATSAPP = '/tmp/patriotas-whatsapp-sessions-v1.json'
const TTL_SESION_MS = 30 * 60 * 1000 // 30 minutos de memoria activa por cliente

interface AlmacenWhatsAppServidor {
  actualizadoEn: string
  sesiones: Record<string, SesionClienteWhatsApp>
  pedidosDespacho: PedidoDespachoWhatsApp[]
  configuracionRouter: ConfiguracionRouterIA
}

let cacheMemoria: AlmacenWhatsAppServidor = {
  actualizadoEn: new Date().toISOString(),
  sesiones: {},
  pedidosDespacho: [],
  configuracionRouter: { ...CONFIGURACION_ROUTER_DEFECTO },
}

export async function leerAlmacenWhatsApp(): Promise<AlmacenWhatsAppServidor> {
  try {
    const raw = await fs.readFile(ARCHIVO_SESIONES_WHATSAPP, 'utf-8')
    const parsed = JSON.parse(raw) as AlmacenWhatsAppServidor
    if (parsed && parsed.sesiones) {
      cacheMemoria = {
        ...parsed,
        configuracionRouter: {
          ...CONFIGURACION_ROUTER_DEFECTO,
          ...(parsed.configuracionRouter || {}),
        },
      }
      return cacheMemoria
    }
  } catch {
    // Si no existe en /tmp aún, usamos cache en memoria
  }
  return cacheMemoria
}

export async function guardarAlmacenWhatsApp(
  almacen: AlmacenWhatsAppServidor
): Promise<void> {
  cacheMemoria = {
    ...almacen,
    actualizadoEn: new Date().toISOString(),
  }
  try {
    await fs.writeFile(
      ARCHIVO_SESIONES_WHATSAPP,
      JSON.stringify(cacheMemoria, null, 2),
      'utf-8'
    )
  } catch {
    // Fallback silencioso a memoria si el FS no permite escritura
  }
}

export async function obtenerConfiguracionRouter(): Promise<ConfiguracionRouterIA> {
  const almacen = await leerAlmacenWhatsApp()
  return almacen.configuracionRouter || { ...CONFIGURACION_ROUTER_DEFECTO }
}

export async function actualizarConfiguracionRouter(
  parcial: Partial<ConfiguracionRouterIA>
): Promise<ConfiguracionRouterIA> {
  const almacen = await leerAlmacenWhatsApp()
  const actualizada: ConfiguracionRouterIA = {
    ...CONFIGURACION_ROUTER_DEFECTO,
    ...(almacen.configuracionRouter || {}),
    ...parcial,
    // Regla de negocio: el guardrail de traslados permanece activo salvo que se cambie explícitamente
    guardrailSoloTraslados:
      parcial.guardrailSoloTraslados ??
      almacen.configuracionRouter?.guardrailSoloTraslados ??
      true,
  }
  almacen.configuracionRouter = actualizada
  await guardarAlmacenWhatsApp(almacen)
  return actualizada
}

export async function obtenerSesionCliente(
  telefono: string,
  nombreCliente = 'Pasajero WhatsApp'
): Promise<SesionClienteWhatsApp> {
  const almacen = await leerAlmacenWhatsApp()
  const clave = telefono.replace(/[^\d+]/g, '') || '584140000000'
  const existente = almacen.sesiones[clave]
  const ahora = Date.now()

  if (existente && ahora - existente.ultimoMensajeTimestamp < TTL_SESION_MS) {
    if (nombreCliente && nombreCliente !== 'Pasajero WhatsApp') {
      existente.nombreCliente = nombreCliente
    }
    return existente
  }

  const nuevaSesion: SesionClienteWhatsApp = {
    telefono: clave,
    nombreCliente,
    estado: 'INICIAL',
    opcionesDetectadas: {
      nocturno: false,
      lluvia: false,
      feriado: false,
      paradasExtra: 0,
      minutosEspera: 0,
    },
    ultimoMensajeTimestamp: ahora,
    historial: [],
  }

  almacen.sesiones[clave] = nuevaSesion
  await guardarAlmacenWhatsApp(almacen)
  return nuevaSesion
}

export async function actualizarSesionCliente(
  sesion: SesionClienteWhatsApp,
  nuevoPedido?: PedidoDespachoWhatsApp
): Promise<void> {
  const almacen = await leerAlmacenWhatsApp()
  const clave = sesion.telefono.replace(/[^\d+]/g, '') || '584140000000'
  almacen.sesiones[clave] = {
    ...sesion,
    ultimoMensajeTimestamp: Date.now(),
  }
  if (nuevoPedido) {
    almacen.pedidosDespacho = [nuevoPedido, ...almacen.pedidosDespacho].slice(
      0,
      50
    )
  }
  await guardarAlmacenWhatsApp(almacen)
}

export async function reiniciarSesionCliente(
  telefono: string
): Promise<SesionClienteWhatsApp> {
  const almacen = await leerAlmacenWhatsApp()
  const clave = telefono.replace(/[^\d+]/g, '') || '584140000000'
  const nueva: SesionClienteWhatsApp = {
    telefono: clave,
    nombreCliente: almacen.sesiones[clave]?.nombreCliente || 'Pasajero WhatsApp',
    estado: 'INICIAL',
    opcionesDetectadas: {
      nocturno: false,
      lluvia: false,
      feriado: false,
      paradasExtra: 0,
      minutosEspera: 0,
    },
    ultimoMensajeTimestamp: Date.now(),
    historial: [],
  }
  almacen.sesiones[clave] = nueva
  await guardarAlmacenWhatsApp(almacen)
  return nueva
}

export async function cambiarEstadoPedidoDespacho(
  idPedido: string,
  nuevoEstado: PedidoDespachoWhatsApp['estadoDespacho']
): Promise<PedidoDespachoWhatsApp[]> {
  const almacen = await leerAlmacenWhatsApp()
  almacen.pedidosDespacho = almacen.pedidosDespacho.map((p) =>
    p.id === idPedido ? { ...p, estadoDespacho: nuevoEstado } : p
  )
  await guardarAlmacenWhatsApp(almacen)
  return almacen.pedidosDespacho
}
