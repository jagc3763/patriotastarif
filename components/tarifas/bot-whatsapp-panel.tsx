'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  EstadoAprendizajeMotor,
  ModoAprendizajeTarifa,
  ParametrosMotorTarifas,
  ResultadoCalculoTarifa,
} from '@/lib/tarifas/types'
import {
  ExtraccionNluWhatsApp,
  PedidoDespachoWhatsApp,
  SesionClienteWhatsApp,
  UbicacionGpsWhatsApp,
} from '@/lib/whatsapp/types'
import {
  MessageSquare,
  Send,
  MapPin,
  RotateCcw,
  BrainCircuit,
  CheckCheck,
  Navigation,
  Copy,
  Check,
  Sparkles,
  Server,
  QrCode,
  Cloud,
  CarTaxiFront,
  PhoneCall,
} from 'lucide-react'

interface BotWhatsappPanelProps {
  parametros: ParametrosMotorTarifas
  estadoAprendizaje: EstadoAprendizajeMotor
  onEntrenarPrecioDesdeBot: (params: {
    origen: string
    destino: string
    nuevoTotalCop: number
    modoAprendizaje: ModoAprendizajeTarifa
    propagarCorredorVecino: boolean
  }) => void
  onProbarEnCotizador: (origen: string, destino: string) => void
}

const PINES_GPS_PRUEBA: Array<{
  etiqueta: string
  lat: number
  lon: number
  nombreReferencia: string
}> = [
  {
    etiqueta: 'Pin GPS: Urb. Villa Real (Palo Gordo)',
    lat: 7.8245,
    lon: -72.2265,
    nombreReferencia: 'Urb. Villa Real, Palo Gordo',
  },
  {
    etiqueta: 'Pin GPS: El Mirador (Vía Llano)',
    lat: 7.734,
    lon: -72.226,
    nombreReferencia: 'Sector El Mirador, Troncal 5',
  },
  {
    etiqueta: 'Pin GPS: Plaza Los Mangos (Barrio Obrero)',
    lat: 7.7682,
    lon: -72.2158,
    nombreReferencia: 'Plaza Los Mangos, Barrio Obrero',
  },
]

const MENSAJES_RAPIDOS_PRUEBA = [
  {
    titulo: '1. Consulta completa directa',
    texto:
      'Buenas tardes, ¿cuánto me sale un taxi desde Las Vegas de Táriba hasta el Sambil?',
  },
  {
    titulo: '2. Consulta sin decir origen (Memoria)',
    texto: 'Hola, ¿cuánto cobran para ir a Cordero?',
  },
  {
    titulo: '3. Completar origen faltante',
    texto: 'Estoy en Sabaneta',
  },
  {
    titulo: '4. Nocturno + Parada extra',
    texto: 'Desde Palmira hasta el Terminal de noche haciendo 1 parada',
  },
  {
    titulo: '5. Confirmar unidad (PEDIR)',
    texto: 'PEDIR',
  },
]

export function BotWhatsappPanel({
  parametros,
  estadoAprendizaje,
  onEntrenarPrecioDesdeBot,
  onProbarEnCotizador,
}: BotWhatsappPanelProps) {
  const [subVista, setSubVista] = useState<'simulador' | 'despachos' | 'conexion'>(
    'simulador'
  )
  const [telefonoSimulado, setTelefonoSimulado] = useState('584147654321')
  const [nombreSimulado, setNombreSimulado] = useState('Carlos Chacón')
  const [textoInput, setTextoInput] = useState('')
  const [forzarNocturno, setForzarNocturno] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [sesion, setSesion] = useState<SesionClienteWhatsApp | null>(null)
  const [ultimaExtraccion, setUltimaExtraccion] =
    useState<ExtraccionNluWhatsApp | null>(null)
  const [ultimaCotizacion, setUltimaCotizacion] =
    useState<ResultadoCalculoTarifa | null>(null)
  const [pedidosDespacho, setPedidosDespacho] = useState<
    PedidoDespachoWhatsApp[]
  >([])

  // Estado para entrenar directamente la última tarifa cotizada por el bot
  const [precioEntrenarBotCop, setPrecioEntrenarBotCop] = useState<number>(20000)
  const [entrenadoExitoso, setEntrenadoExitoso] = useState(false)
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch(`/api/whatsapp/webhook?telefono=${encodeURIComponent(telefonoSimulado)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          if (data.sesion) {
            setSesion(data.sesion)
            if (data.sesion.ultimaCotizacion) {
              setUltimaCotizacion(data.sesion.ultimaCotizacion)
              setPrecioEntrenarBotCop(data.sesion.ultimaCotizacion.totalCop)
            }
          }
          if (data.pedidosDespacho) {
            setPedidosDespacho(data.pedidosDespacho)
          }
        }
      })
      .catch(() => {})
  }, [telefonoSimulado])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [sesion?.historial.length, enviando])

  const enviarMensajeAlWebhook = async (opciones: {
    texto?: string
    ubicacionGps?: UbicacionGpsWhatsApp
  }) => {
    if (enviando) return
    if (!opciones.texto?.trim() && !opciones.ubicacionGps) return

    setEnviando(true)
    setEntrenadoExitoso(false)
    if (opciones.texto) setTextoInput('')

    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: telefonoSimulado,
          nombreCliente: nombreSimulado,
          texto: opciones.texto,
          ubicacionGps: opciones.ubicacionGps,
          forzarNocturno,
        }),
      })
      const data = await res.json()
      if (data?.ok) {
        setSesion(data.sesionActualizada)
        setUltimaExtraccion(data.extraccionNlu)
        if (data.cotizacionGenerada) {
          setUltimaCotizacion(data.cotizacionGenerada)
          setPrecioEntrenarBotCop(data.cotizacionGenerada.totalCop)
        }
        if (data.pedidosDespacho) {
          setPedidosDespacho(data.pedidosDespacho)
        }
      }
    } finally {
      setEnviando(false)
    }
  }

  const reiniciarConversacion = async () => {
    setEnviando(true)
    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'reiniciar_sesion',
          telefono: telefonoSimulado,
        }),
      })
      const data = await res.json()
      if (data?.ok) {
        setSesion(data.sesion)
        setUltimaCotizacion(null)
        setUltimaExtraccion(null)
      }
    } finally {
      setEnviando(false)
    }
  }

  const cambiarEstadoDespacho = async (
    idPedido: string,
    nuevoEstado: PedidoDespachoWhatsApp['estadoDespacho']
  ) => {
    const res = await fetch('/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'actualizar_despacho',
        idPedido,
        nuevoEstado,
      }),
    })
    const data = await res.json()
    if (data?.ok && data.pedidosDespacho) {
      setPedidosDespacho(data.pedidosDespacho)
    }
  }

  const copiarTexto = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto)
    setCopiadoId(id)
    setTimeout(() => setCopiadoId(null), 2000)
  }

  const aplicarCorreccionYReenviarCotizacion = async () => {
    if (!ultimaCotizacion) return
    onEntrenarPrecioDesdeBot({
      origen: ultimaCotizacion.sectorOrigenDetectado,
      destino: ultimaCotizacion.sectorDestinoDetectado,
      nuevoTotalCop: precioEntrenarBotCop,
      modoAprendizaje: 'completo',
      propagarCorredorVecino: true,
    })
    setEntrenadoExitoso(true)

    // Esperar brevemente a que persista el entrenamiento y volver a consultar al bot
    setTimeout(() => {
      enviarMensajeAlWebhook({
        texto: `Desde ${ultimaCotizacion.sectorOrigenDetectado} hasta ${ultimaCotizacion.sectorDestinoDetectado}`,
      })
    }, 250)
  }

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DEL MÓDULO DE WHATSAPP */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-xs font-black text-emerald-300">
                <MessageSquare className="h-3.5 w-3.5" />
                Bot de WhatsApp con IA + Tarifario Entrenado
              </span>
              <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                {estadoAprendizaje.lecciones.length} lecciones de precios conectadas al Bot
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Automatización de Cotizaciones y Despacho por WhatsApp (Local + Nube)
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              El bot interpreta mensajes de texto o pines GPS de los clientes usando IA en la nube, mantiene memoria de la conversación si falta el origen o el destino, y responde automáticamente con el precio exacto de tu tarifario entrenado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubVista('simulador')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                subVista === 'simulador'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Simulador en Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => setSubVista('despachos')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                subVista === 'despachos'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <CarTaxiFront className="h-3.5 w-3.5" />
              <span>Carreras Confirmadas ({pedidosDespacho.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubVista('conexion')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                subVista === 'conexion'
                  ? 'bg-sky-400 text-slate-950 shadow-lg shadow-sky-400/20'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Conectar WhatsApp Real (Local / Cloud)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBVISTA 1: SIMULADOR INTERACTIVO DE WHATSAPP + INSPECTOR DE IA */}
      {subVista === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA: TELÉFONO WHATSAPP EN VIVO */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-800 bg-[#0b141a] overflow-hidden shadow-2xl">
            {/* CABECERA ESTILO WHATSAPP */}
            <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black">
                  LP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      Línea Los Patriotas (Bot IA)
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-emerald-400">
                    en línea • Responde con precios entrenados en tiempo real
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forzarNocturno}
                    onChange={(e) => setForzarNocturno(e.target.checked)}
                    className="rounded border-slate-600 text-amber-400"
                  />
                  <span>Simular Nocturno</span>
                </label>

                <button
                  type="button"
                  onClick={reiniciarConversacion}
                  title="Reiniciar conversación de este cliente"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reiniciar Chat</span>
                </button>
              </div>
            </div>

            {/* BARRA DE CASOS DE PRUEBA RÁPIDA Y PINES GPS */}
            <div className="bg-[#111b21] px-3.5 py-2.5 border-b border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Mensajes de prueba de clientes (1 clic):
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Estado actual: {sesion?.estado ?? 'INICIAL'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MENSAJES_RAPIDOS_PRUEBA.map((item) => (
                  <button
                    key={item.titulo}
                    type="button"
                    disabled={enviando}
                    onClick={() => enviarMensajeAlWebhook({ texto: item.texto })}
                    className="rounded-lg border border-emerald-500/30 bg-[#202c33] hover:bg-emerald-500 hover:text-slate-950 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition-colors"
                  >
                    {item.titulo}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/70">
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Enviar ubicación GPS:
                </span>
                {PINES_GPS_PRUEBA.map((pin) => (
                  <button
                    key={pin.etiqueta}
                    type="button"
                    disabled={enviando}
                    onClick={() =>
                      enviarMensajeAlWebhook({
                        ubicacionGps: {
                          lat: pin.lat,
                          lon: pin.lon,
                          nombreReferencia: pin.nombreReferencia,
                        },
                      })
                    }
                    className="rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-400 hover:text-slate-950 px-2 py-0.5 text-[10px] font-bold text-amber-300 transition-colors"
                  >
                    {pin.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {/* VENTANA DE MENSAJES DE WHATSAPP */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-[390px] max-h-[460px] overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
            >
              {(!sesion || sesion.historial.length === 0) && (
                <div className="rounded-xl border border-slate-800 bg-[#182229] p-4 text-center max-w-md mx-auto my-8 space-y-2">
                  <Sparkles className="h-6 w-6 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-200">
                    Simulador de WhatsApp conectado a tu motor de tarifas
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Escribe cualquier consulta como si fueras un pasajero en Táchira (ej.{' '}
                    <em>&quot;Hola, ¿cuánto sale desde Las Vegas de Táriba hasta el Sambil?&quot;</em>) o pulsa uno de los botones de arriba.
                  </p>
                </div>
              )}

              {sesion?.historial.map((msg) => {
                const esCliente = msg.rol === 'cliente'
                const horaFormateada = new Date(
                  msg.timestamp
                ).toLocaleTimeString('es-VE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={msg.id}
                    className={`flex ${
                      esCliente ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md ${
                        esCliente
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/60'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed font-sans">
                        {msg.texto}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-300/80">
                        <span>{horaFormateada}</span>
                        {esCliente && (
                          <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {enviando && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-[#202c33] border border-slate-700 px-4 py-2.5 text-xs text-emerald-300 font-semibold animate-pulse">
                    Bot Los Patriotas está calculando la tarifa...
                  </div>
                </div>
              )}
            </div>

            {/* BARRA DE ESCRITURA INFERIOR DE WHATSAPP */}
            <div className="bg-[#202c33] p-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={textoInput}
                onChange={(e) => setTextoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    enviarMensajeAlWebhook({ texto: textoInput })
                  }
                }}
                placeholder="Escribe un mensaje de WhatsApp aquí... (Ej: ¿Cuánto sale de Táriba a Palmira?)"
                className="flex-1 rounded-xl border border-slate-700 bg-[#2a3942] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                disabled={enviando || !textoInput.trim()}
                onClick={() => enviarMensajeAlWebhook({ texto: textoInput })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 px-4 py-2.5 text-xs font-black text-slate-950 transition-all"
              >
                <Send className="h-4 w-4" />
                <span>Enviar</span>
              </button>
            </div>
          </div>

          {/* COLUMNA DERECHA: INSPECTOR DEL CEREBRO IA + ENTRENADOR EN VIVO */}
          <div className="lg:col-span-5 space-y-4">
            {/* TARJETA 1: ESTADO DE MEMORIA CONVERSACIONAL DEL CLIENTE */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <BrainCircuit className="h-4 w-4" />
                  Memoria Conversacional del Cliente
                </h3>
                <span className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-0.5 text-[11px] font-mono text-emerald-400">
                  +{telefonoSimulado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <span className="text-[10px] text-slate-400 block">
                    Estado del Flujo
                  </span>
                  <span className="font-black text-emerald-300 text-xs">
                    {sesion?.estado ?? 'INICIAL'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <span className="text-[10px] text-slate-400 block">
                    Motor NLU Utilizado
                  </span>
                  <span className="font-bold text-sky-300 text-xs">
                    {ultimaExtraccion?.motorNluUsado === 'cloud_ai'
                      ? 'IA en la Nube (GPT-5.4-mini)'
                      : 'Motor Local Instantáneo'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <span className="text-[10px] text-slate-400 block">
                    Origen en Memoria
                  </span>
                  <span className="font-bold text-white truncate block">
                    {sesion?.origenTemporal ?? 'Pendiente por preguntar'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <span className="text-[10px] text-slate-400 block">
                    Destino en Memoria
                  </span>
                  <span className="font-bold text-white truncate block">
                    {sesion?.destinoTemporal ?? 'Pendiente por preguntar'}
                  </span>
                </div>
              </div>

              {ultimaExtraccion && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">
                      Intención detectada:
                    </span>
                    <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      {ultimaExtraccion.intencion}
                    </span>
                  </div>
                  <p className="text-slate-400">
                    {ultimaExtraccion.razonamientoBreve}
                  </p>
                </div>
              )}
            </div>

            {/* TARJETA 2: ENTRENAR EL PRECIO QUE RESPONDIÓ EL BOT */}
            {ultimaCotizacion ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    ¿El precio del Bot necesita ajuste? Entrénalo aquí
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onProbarEnCotizador(
                        ultimaCotizacion.sectorOrigenDetectado,
                        ultimaCotizacion.sectorDestinoDetectado
                      )
                    }
                    className="text-[11px] font-bold text-amber-400 hover:underline"
                  >
                    Abrir en Mapa
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {ultimaCotizacion.sectorOrigenDetectado} →{' '}
                      {ultimaCotizacion.sectorDestinoDetectado}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {ultimaCotizacion.tituloRegla} •{' '}
                      {ultimaCotizacion.distanciaVialKm} km
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-amber-400">
                      {ultimaCotizacion.totalCop.toLocaleString('es-CO')} COP
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold">
                      ${ultimaCotizacion.totalUsd.toFixed(2)} USD
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Nuevo precio real en COP para enseñar al Bot y recalibrar rutas vecinas:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={1000}
                      min={5000}
                      value={precioEntrenarBotCop}
                      onChange={(e) =>
                        setPrecioEntrenarBotCop(Number(e.target.value) || 0)
                      }
                      className="w-36 rounded-xl border border-emerald-400/50 bg-slate-950 px-3 py-2 text-sm font-black text-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={aplicarCorreccionYReenviarCotizacion}
                      className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 transition-all"
                    >
                      Entrenar y Re-Cotizar en el Chat
                    </button>
                  </div>
                  {entrenadoExitoso && (
                    <p className="text-[11px] font-bold text-emerald-400">
                      ¡Entrenamiento guardado! El Bot ya aprendió la nueva tarifa y envió la cotización actualizada al chat.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
                Haz una consulta de precio en el simulador de WhatsApp para ver aquí el desglose matemático y poder entrenar su tarifa en vivo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVISTA 2: BANDEJA DE CARRERAS CONFIRMADAS POR WHATSAPP */}
      {subVista === 'despachos' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-amber-400" />
                Bandeja de Despacho: Carreras Confirmadas por Clientes (PEDIR)
              </h3>
              <p className="text-xs text-slate-400">
                Cada vez que un cliente responde <strong>PEDIR</strong> o <strong>SÍ</strong> a una cotización en WhatsApp, aparece aquí listo para enviar al grupo de conductores.
              </p>
            </div>
          </div>

          {pedidosDespacho.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center space-y-2">
              <CarTaxiFront className="h-8 w-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">
                Aún no hay carreras confirmadas en esta sesión
              </p>
              <p className="text-xs text-slate-400">
                Ve al <strong>Simulador en Vivo</strong>, realiza una cotización y pulsa el botón <strong>5. Confirmar unidad (PEDIR)</strong> para probar el flujo completo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pedidosDespacho.map((p) => {
                const textoGrupoConductores = `*SERVICIO CONFIRMADO — LOS PATRIOTAS*\n• *Cliente:* ${p.nombreCliente} (+${p.telefonoCliente})\n• *Recogida:* ${p.origen}\n• *Destino:* ${p.destino}\n• *Tarifa:* ${p.totalCop.toLocaleString('es-CO')} COP ($${p.totalUsd.toFixed(2)} / Bs. ${p.totalBsBcv.toFixed(2)})\n• *Mapa:* ${p.enlaceGoogleMaps}`
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">
                        {p.nombreCliente} (+{p.telefonoCliente})
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          p.estadoDespacho === 'pendiente'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : p.estadoDespacho === 'unidad_asignada'
                            ? 'bg-sky-400/20 text-sky-300 border border-sky-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        }`}
                      >
                        {p.estadoDespacho.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      <div>
                        <strong>Recogida:</strong> {p.origen}
                      </div>
                      <div>
                        <strong>Destino:</strong> {p.destino} ({p.distanciaKm} km)
                      </div>
                      <div className="text-sm font-black text-amber-400 pt-1">
                        {p.totalCop.toLocaleString('es-CO')} COP • $
                        {p.totalUsd.toFixed(2)} USD • Bs.{' '}
                        {p.totalBsBcv.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            cambiarEstadoDespacho(p.id, 'unidad_asignada')
                          }
                          className="rounded-lg border border-sky-500/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-300"
                        >
                          Asignar Unidad
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            cambiarEstadoDespacho(p.id, 'completado')
                          }
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
                        >
                          Completado
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={p.enlaceGoogleMaps}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-200"
                        >
                          <Navigation className="h-3 w-3 text-amber-400" />
                          <span>Mapa</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            copiarTexto(p.id, textoGrupoConductores)
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 text-[11px] font-black text-slate-950"
                        >
                          {copiadoId === p.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copiar para Conductores</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBVISTA 3: GUÍA DE CONEXIÓN LOCAL + NUBE (QR Y META CLOUD API) */}
      {subVista === 'conexion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <Server className="h-4 w-4" />
              <h3>
                Opción 1: Correr en tu PC Local (Base Táriba) + IA en la Nube + Código QR
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ideal si quieres usar el teléfono actual de la línea escaneando un código QR (como WhatsApp Web) y que tu computadora consulte la IA en la nube y responda con los precios que vayas entrenando.
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-emerald-300 overflow-x-auto space-y-1">
              <div className="text-slate-500">
                # Archivo .env.local en tu PC de la oficina
              </div>
              <div>OPENAI_API_KEY=&quot;sk-proj-...&quot;</div>
              <div>WHATSAPP_VERIFY_TOKEN=&quot;patriotas_tariba_2025&quot;</div>
              <div className="text-slate-500 pt-1">
                # Conector Evolution API (Código QR Local o Docker)
              </div>
              <div>EVOLUTION_API_URL=&quot;http://localhost:8080&quot;</div>
              <div>EVOLUTION_API_KEY=&quot;tu_clave_evolution&quot;</div>
              <div>EVOLUTION_INSTANCE_NAME=&quot;patriotas-tariba&quot;</div>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li>
                • <strong>Endpoint Webhook ya activo en tu proyecto:</strong>{' '}
                <code className="text-amber-300">/api/whatsapp/webhook</code>
              </li>
              <li>
                • En Evolution API configura el Webhook apuntando a{' '}
                <code className="text-emerald-300">
                  http://localhost:3000/api/whatsapp/webhook
                </code>{' '}
                activando el evento <code>MESSAGES_UPSERT</code>.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sky-400 font-black text-sm">
              <Cloud className="h-4 w-4" />
              <h3>
                Opción 2: Meta WhatsApp Cloud API Oficial (24/7 en Vercel sin PC encendida)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              El endpoint <code>/api/whatsapp/webhook</code> ya incluye la validación oficial <code>GET hub.challenge</code> de Meta y la lectura de mensajes de texto y pines de ubicación GPS nativos.
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-sky-300 overflow-x-auto space-y-1">
              <div className="text-slate-500">
                # Variables en Vercel (Settings → Environment Variables)
              </div>
              <div>WHATSAPP_VERIFY_TOKEN=&quot;patriotas_tariba_2025&quot;</div>
              <div>WHATSAPP_ACCESS_TOKEN=&quot;EAAGm0PX4ZCps...&quot;</div>
              <div>WHATSAPP_PHONE_NUMBER_ID=&quot;109283746512345&quot;</div>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">
                Prueba rápida del Webhook por terminal (cURL):
              </p>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[10px] text-amber-300 overflow-x-auto">
{`curl -X POST http://localhost:3000/api/whatsapp/webhook \\
  -H "Content-Type: application/json" \\
  -d '{"telefono":"584147654321","texto":"Desde Las Vegas de Tariba hasta el Sambil"}'`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
