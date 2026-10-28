import { NextRequest, NextResponse } from 'next/server'
import { procesarMensajeEntranteWhatsApp } from '@/lib/whatsapp/bot-engine'
import { CATALOGO_MODELOS_ROUTER } from '@/lib/whatsapp/model-router'
import {
  actualizarConfiguracionRouter,
  cambiarEstadoPedidoDespacho,
  leerAlmacenWhatsApp,
  reiniciarSesionCliente,
} from '@/lib/whatsapp/session-store'

/**
 * Envía un mensaje de respuesta saliente a través de Meta WhatsApp Cloud API oficial
 */
async function enviarMensajeMetaCloudApi(
  telefonoDestino: string,
  textoRespuesta: string
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) return false

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefonoDestino.replace(/[^\d]/g, ''),
          type: 'text',
          text: { body: textoRespuesta },
        }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

/**
 * Envía un mensaje de respuesta saliente a través de Evolution API (Conexión local/nube por Código QR)
 */
async function enviarMensajeEvolutionApi(
  remoteJid: string,
  textoRespuesta: string
): Promise<boolean> {
  const baseUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'patriotas-tariba'
  if (!baseUrl || !apiKey) return false

  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, '')}/message/sendText/${instance}`,
      {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: remoteJid,
          text: textoRespuesta,
        }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

/**
 * GET /api/whatsapp/webhook
 * 1) Verificación oficial del Webhook de Meta Cloud API (hub.verify_token)
 * 2) Consulta de estado, sesiones, configuración del Router IA y bandeja de despachos para el panel web
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyTokenEsperado =
    process.env.WHATSAPP_VERIFY_TOKEN || 'patriotas_tariba_2025'

  if (mode === 'subscribe' && challenge) {
    if (token === verifyTokenEsperado) {
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    return NextResponse.json(
      { ok: false, error: 'Token de verificación de WhatsApp inválido' },
      { status: 403 }
    )
  }

  const almacen = await leerAlmacenWhatsApp()
  const telefonoFiltro = searchParams.get('telefono')
  const sesionActiva = telefonoFiltro
    ? almacen.sesiones[telefonoFiltro.replace(/[^\d+]/g, '')]
    : undefined

  return NextResponse.json({
    ok: true,
    webhookActivo: true,
    proveedoresConfigurados: {
      metaCloudApi: Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN &&
          process.env.WHATSAPP_PHONE_NUMBER_ID
      ),
      evolutionQrApi: Boolean(
        process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY
      ),
      customRouterApiKey: Boolean(
        process.env.AI_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY
      ),
      verifyTokenConfigurado: verifyTokenEsperado,
    },
    configuracionRouter: almacen.configuracionRouter,
    catalogoModelosRouter: CATALOGO_MODELOS_ROUTER,
    sesion: sesionActiva,
    pedidosDespacho: almacen.pedidosDespacho,
    totalSesionesActivas: Object.keys(almacen.sesiones).length,
  })
}

/**
 * POST /api/whatsapp/webhook
 * Soporta simultáneamente:
 * A) Payload Oficial de Meta WhatsApp Cloud API
 * B) Payload de Evolution API / Baileys (Conexión local por QR)
 * C) Simulador Directo en Pantalla / Configuración del Router IA / Gestión de sesión
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Acción administrativa: actualizar configuración del Router Multi-Modelo y Guardrails
    if (body.accion === 'configurar_router_ia' && body.configuracionRouter) {
      const nuevaConfig = await actualizarConfiguracionRouter(
        body.configuracionRouter
      )
      return NextResponse.json({
        ok: true,
        configuracionRouter: nuevaConfig,
        catalogoModelosRouter: CATALOGO_MODELOS_ROUTER,
      })
    }

    // Acción administrativa: reiniciar conversación de un cliente
    if (body.accion === 'reiniciar_sesion') {
      const sesionLimpia = await reiniciarSesionCliente(
        body.telefono || '584147654321'
      )
      const almacen = await leerAlmacenWhatsApp()
      return NextResponse.json({
        ok: true,
        sesion: sesionLimpia,
        pedidosDespacho: almacen.pedidosDespacho,
        configuracionRouter: almacen.configuracionRouter,
      })
    }

    // Acción administrativa: actualizar estado de un pedido de despacho
    if (body.accion === 'actualizar_despacho' && body.idPedido) {
      const pedidos = await cambiarEstadoPedidoDespacho(
        body.idPedido,
        body.nuevoEstado || 'unidad_asignada'
      )
      return NextResponse.json({
        ok: true,
        pedidosDespacho: pedidos,
      })
    }

    // FORMATO A: Payload Oficial de Meta WhatsApp Cloud API
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const message = value?.messages?.[0]
      const contact = value?.contacts?.[0]

      if (!message) {
        return NextResponse.json({
          ok: true,
          ignorado: 'Evento de estado sin mensaje',
        })
      }

      const telefono = message.from || '584140000000'
      const nombreCliente = contact?.profile?.name || 'Cliente WhatsApp'

      let texto = ''
      let ubicacionGps = undefined

      if (message.type === 'text') {
        texto = message.text?.body || ''
      } else if (message.type === 'location') {
        ubicacionGps = {
          lat: Number(message.location?.latitude),
          lon: Number(message.location?.longitude),
          nombreReferencia:
            message.location?.name || message.location?.address || undefined,
        }
      } else if (message.type === 'interactive') {
        texto =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          ''
      }

      const resultado = await procesarMensajeEntranteWhatsApp({
        telefono,
        nombreCliente,
        texto,
        ubicacionGps,
      })

      const enviadoMeta = await enviarMensajeMetaCloudApi(
        telefono,
        resultado.textoRespuesta
      )

      return NextResponse.json({
        ok: true,
        canal: 'meta_cloud_api',
        enviadoMeta,
        respuesta: resultado.textoRespuesta,
        cotizacion: resultado.cotizacionGenerada,
        extraccionNlu: resultado.extraccionNlu,
      })
    }

    // FORMATO B: Payload de Evolution API / Baileys (WhatsApp QR en Local)
    if (body.event === 'messages.upsert' && body.data) {
      const msgData = body.data
      if (msgData.key?.fromMe) {
        return NextResponse.json({
          ok: true,
          ignorado: 'Mensaje propio del bot',
        })
      }

      const remoteJid: string = msgData.key?.remoteJid || ''
      const telefono = remoteJid.split('@')[0] || '584140000000'
      const nombreCliente = msgData.pushName || 'Cliente WhatsApp'

      const texto =
        msgData.message?.conversation ||
        msgData.message?.extendedTextMessage?.text ||
        ''

      const locMsg = msgData.message?.locationMessage
      const ubicacionGps = locMsg
        ? {
            lat: Number(locMsg.degreesLatitude),
            lon: Number(locMsg.degreesLongitude),
            nombreReferencia: locMsg.name || locMsg.address || undefined,
          }
        : undefined

      const resultado = await procesarMensajeEntranteWhatsApp({
        telefono,
        nombreCliente,
        texto,
        ubicacionGps,
      })

      const enviadoEvolution = await enviarMensajeEvolutionApi(
        remoteJid,
        resultado.textoRespuesta
      )

      return NextResponse.json({
        ok: true,
        canal: 'evolution_qr_api',
        enviadoEvolution,
        respuesta: resultado.textoRespuesta,
        cotizacion: resultado.cotizacionGenerada,
        extraccionNlu: resultado.extraccionNlu,
      })
    }

    // FORMATO C: Simulador en Vivo / API Directa
    const resultado = await procesarMensajeEntranteWhatsApp({
      telefono: body.telefono || '584147654321',
      nombreCliente: body.nombreCliente || 'Pasajero Táchira',
      texto: body.texto || '',
      ubicacionGps: body.ubicacionGps,
      forzarNocturno: body.forzarNocturno,
      configRouterOverride: body.configRouterOverride,
    })

    const almacen = await leerAlmacenWhatsApp()

    return NextResponse.json({
      ok: true,
      canal: 'simulador_directo',
      ...resultado,
      pedidosDespacho: almacen.pedidosDespacho,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error procesando webhook de WhatsApp',
      },
      { status: 400 }
    )
  }
}
