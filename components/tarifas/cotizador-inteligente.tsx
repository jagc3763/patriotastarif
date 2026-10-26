'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  EstadoAprendizajeMotor,
  ModoAprendizajeTarifa,
  OpcionesViaje,
  ParametrosMotorTarifas,
  ResultadoCalculoTarifa,
  TarifasTachiraDB,
  TelemetriaRutaMapa,
} from '@/lib/tarifas/types'
import { buscarSugerenciasLugares } from '@/lib/tarifas/engine'
import { procesarEntrenamientoTarifa } from '@/lib/tarifas/aprendizaje'
import { MapaRutaInteractivo } from './mapa-ruta-interactivo'
import {
  MapPin,
  Navigation,
  ArrowUpDown,
  Calculator,
  Sparkles,
  Copy,
  Check,
  Moon,
  CloudRain,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle2,
  BrainCircuit,
  AlertCircle,
  ChevronDown,
  X,
  Compass,
  Radar,
  Loader2,
  Send,
  ShieldCheck,
  Route,
} from 'lucide-react'

interface CotizadorInteligenteProps {
  origen: string
  destino: string
  onChangeOrigen: (val: string) => void
  onChangeDestino: (val: string) => void
  opciones: OpcionesViaje
  onChangeOpciones: (nuevas: OpcionesViaje) => void
  parametros: ParametrosMotorTarifas
  resultado: ResultadoCalculoTarifa
  db: TarifasTachiraDB
  telemetriaMapa: TelemetriaRutaMapa | null
  onChangeTelemetriaMapa: (nueva: TelemetriaRutaMapa | null) => void
  estadoAprendizaje: EstadoAprendizajeMotor
  onEntrenarPrecio: (params: {
    origen: string
    destino: string
    nuevoTotalCop: number
    modoAprendizaje: ModoAprendizajeTarifa
    propagarCorredorVecino: boolean
  }) => void
  onIrAlLaboratorioEntrenamiento?: () => void
}

const CASOS_PRUEBA_OFICIALES = [
  {
    etiqueta: 'Táriba → Pueblo Nuevo',
    origen: 'Táriba',
    destino: 'Pueblo Nuevo',
    badge: 'Oficial Hoja 6',
  },
  {
    etiqueta: 'Arjona 46 → Centro',
    origen: 'Arjona 46',
    destino: 'Centro',
    badge: 'Combinación "/"',
  },
  {
    etiqueta: 'Las Vegas P6 → Barrio Obrero',
    origen: 'Las Vegas P6',
    destino: 'Barrio Obrero',
    badge: 'Combinación "/"',
  },
  {
    etiqueta: 'Junco 46 → Barrio Sucre',
    origen: 'Junco 46',
    destino: 'Barrio Sucre',
    badge: 'Despacho Radial (18k+22k)',
  },
  {
    etiqueta: 'Patiecitos → Rubio',
    origen: 'Patiecitos',
    destino: 'Rubio',
    badge: 'Radial Corregido (15k+70k)',
  },
  {
    etiqueta: 'Táriba → Caracas',
    origen: 'Táriba',
    destino: 'CARACAS',
    badge: 'Viaje Largo ($400)',
  },
]

const CASOS_PRUEBA_NO_CONTEMPLADOS = [
  {
    etiqueta: 'Táriba → Chorro del Indio',
    origen: 'Táriba',
    destino: 'Chorro del Indio',
    badge: 'Ancla: Hospital + Montaña',
  },
  {
    etiqueta: 'Táriba → Loma del Viento',
    origen: 'Táriba',
    destino: 'Loma del Viento',
    badge: 'Ancla: Mirador + Cuesta',
  },
  {
    etiqueta: 'Urb. Las Acacias → Clínica CEMOC',
    origen: 'Urb. Las Acacias',
    destino: 'Clínica CEMOC',
    badge: '2 Puntos No Listados',
  },
  {
    etiqueta: 'Zorca Providencia → Sambil',
    origen: 'Zorca Providencia',
    destino: 'Sambil',
    badge: 'Aldea → Sambil',
  },
  {
    etiqueta: 'Táriba → Bramón',
    origen: 'Táriba',
    destino: 'Bramón',
    badge: 'Ancla: Rubio + Montaña',
  },
  {
    etiqueta: 'Táriba → San Pedro del Río',
    origen: 'Táriba',
    destino: 'San Pedro del Río',
    badge: 'Ancla: Michelena + km',
  },
  {
    etiqueta: 'Carrera 19 Calle 12 → Delicias',
    origen: 'Carrera 19 con Calle 12',
    destino: 'Delicias',
    badge: 'Calle Libre → Frontera Alta',
  },
]

export function CotizadorInteligente({
  origen,
  destino,
  onChangeOrigen,
  onChangeDestino,
  opciones,
  onChangeOpciones,
  parametros,
  resultado: resultadoLocal,
  db,
  telemetriaMapa,
  onChangeTelemetriaMapa,
  estadoAprendizaje,
  onEntrenarPrecio,
  onIrAlLaboratorioEntrenamiento,
}: CotizadorInteligenteProps) {
  const [focoInput, setFocoInput] = useState<'origen' | 'destino' | null>(null)
  const [copiadoWhatsapp, setCopiadoWhatsapp] = useState(false)
  const [mostrarGuiado, setMostrarGuiado] = useState(false)
  const [modoCasosPrueba, setModoCasosPrueba] = useState<'no_contemplados' | 'oficiales'>('no_contemplados')

  // Estado para el Entrenador de Precio en Vivo dentro de la tarjeta de resultado
  const [editandoPrecio, setEditandoPrecio] = useState(false)
  const [precioEntrenarCop, setPrecioEntrenarCop] = useState<number>(
    resultadoLocal.totalCop
  )
  const [modoAprendizajeLocal, setModoAprendizajeLocal] =
    useState<ModoAprendizajeTarifa>('completo')
  const [propagarVecinosLocal, setPropagarVecinosLocal] = useState(true)
  const [feedbackEntrenamiento, setFeedbackEntrenamiento] = useState<{
    resumen: string[]
    rutasImpactadas: Array<{
      origen: string
      destino: string
      copAntes: number
      copDespues: number
    }>
  } | null>(null)

  // Estado para el Agente IA + Ruteo Carretera Real OSRM
  const [consultaNatural, setConsultaNatural] = useState('')
  const [cargandoIA, setCargandoIA] = useState(false)
  const [resultadoIAOverride, setResultadoIAOverride] =
    useState<ResultadoCalculoTarifa | null>(null)
  const [errorIA, setErrorIA] = useState<string | null>(null)

  const contenedorRef = useRef<HTMLDivElement>(null)

  // Cuando cambian manualmente origen, destino, opciones o parámetros, limpiamos el override previo de IA
  useEffect(() => {
    setResultadoIAOverride(null)
    setErrorIA(null)
  }, [origen, destino, opciones, parametros])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setFocoInput(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resultado = resultadoIAOverride ?? resultadoLocal

  useEffect(() => {
    setPrecioEntrenarCop(resultado.totalCop)
  }, [resultado.totalCop, origen, destino])

  const vistaPreviaEntrenamiento = React.useMemo(() => {
    if (!editandoPrecio || precioEntrenarCop === resultado.totalCop) return null
    return procesarEntrenamientoTarifa({
      resultadoActual: resultado,
      nuevoTotalCop: precioEntrenarCop,
      parametrosActuales: parametros,
      opcionesActuales: opciones,
      dbActual: db,
      estadoAprendizajeActual: estadoAprendizaje,
      modoAprendizaje: modoAprendizajeLocal,
      propagarCorredorVecino: propagarVecinosLocal,
    })
  }, [
    editandoPrecio,
    precioEntrenarCop,
    resultado,
    parametros,
    opciones,
    db,
    estadoAprendizaje,
    modoAprendizajeLocal,
    propagarVecinosLocal,
  ])

  const confirmarEntrenamientoPrecio = () => {
    const preview = procesarEntrenamientoTarifa({
      resultadoActual: resultado,
      nuevoTotalCop: precioEntrenarCop,
      parametrosActuales: parametros,
      opcionesActuales: opciones,
      dbActual: db,
      estadoAprendizajeActual: estadoAprendizaje,
      modoAprendizaje: modoAprendizajeLocal,
      propagarCorredorVecino: propagarVecinosLocal,
    })

    setResultadoIAOverride(null)
    onEntrenarPrecio({
      origen,
      destino,
      nuevoTotalCop: precioEntrenarCop,
      modoAprendizaje: modoAprendizajeLocal,
      propagarCorredorVecino: propagarVecinosLocal,
    })
    setEditandoPrecio(false)
    setFeedbackEntrenamiento({
      resumen: preview.leccion.ajustesAplicados.resumenAprendizaje,
      rutasImpactadas: preview.ejemplosImpactados.slice(0, 4),
    })
  }

  const sugerenciasOrigen = buscarSugerenciasLugares(origen, db, 7)
  const sugerenciasDestino = buscarSugerenciasLugares(destino, db, 7)

  const invertirRuta = () => {
    const temp = origen
    onChangeOrigen(destino)
    onChangeDestino(temp)
  }

  const ejecutarAnalisisProfundoIA = async (textoLibreOpcional?: string) => {
    setCargandoIA(true)
    setErrorIA(null)
    try {
      const res = await fetch('/api/tarifas/inteligente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen,
          destino,
          consultaLibre: textoLibreOpcional?.trim() || undefined,
          parametros,
          opciones,
        }),
      })
      const data = await res.json()
      if (data.ok && data.resultado) {
        const r: ResultadoCalculoTarifa & { opcionesAplicadas?: OpcionesViaje } =
          data.resultado
        if (textoLibreOpcional?.trim()) {
          onChangeOrigen(r.origenInput)
          onChangeDestino(r.destinoInput)
          if (r.opcionesAplicadas) {
            onChangeOpciones(r.opcionesAplicadas)
          }
        }
        // Guardamos con un pequeño timeout para que no lo borre el useEffect de cambio de input
        setTimeout(() => {
          setResultadoIAOverride(r)
        }, 30)
      } else {
        setErrorIA(data.error || 'No se pudo completar el análisis vial.')
      }
    } catch {
      setErrorIA('Error de red al consultar el motor IA + OSRM.')
    } finally {
      setCargandoIA(false)
    }
  }

  const copiarParaWhatsapp = () => {
    const recargosActivos: string[] = []
    if (opciones.nocturno)
      recargosActivos.push(`Nocturno +${parametros.recargoNocturnoPct}%`)
    if (opciones.lluvia)
      recargosActivos.push(`Lluvia +${parametros.recargoLluviaPct}%`)
    if (opciones.feriado)
      recargosActivos.push(`Feriado +${parametros.recargoFeriadoPct}%`)

    const lineaRecargos =
      recargosActivos.length > 0
        ? `\n*Recargos aplicados:* ${recargosActivos.join(', ')}`
        : ''

    const lineaAncla = resultado.anclaDestinoUsada
      ? `\n*Ancla Oficial Referencia:* ${resultado.anclaDestinoUsada.nombreOficial} (${resultado.anclaDestinoUsada.copOficial.toLocaleString('es-CO')} COP a ${resultado.anclaDestinoUsada.distanciaAlPuntoKm} km)`
      : ''

    const lineaViaOptima = resultado.telemetriaMapa?.resumenRutaPrincipal
      ? `\n*Mejor Ruta Vial:* ${resultado.telemetriaMapa.resumenRutaPrincipal}`
      : ''

    const linkGoogleMaps = `https://www.google.com/maps/dir/?api=1&origin=${resultado.coordenadasOrigen.lat},${resultado.coordenadasOrigen.lon}&destination=${resultado.coordenadasDestino.lat},${resultado.coordenadasDestino.lon}&travelmode=driving`

    const texto = [
      `*LÍNEA DE TAXIS LOS PATRIOTAS (TÁCHIRA)*`,
      `*Recogida:* ${resultado.origenInput} (${resultado.sectorOrigenDetectado})`,
      `*Destino:* ${resultado.destinoInput} (${resultado.sectorDestinoDetectado})`,
      `*Distancia Vial:* ~${resultado.distanciaVialKm} km (~${resultado.tiempoEstimadoMin} min)${lineaViaOptima}`,
      `*Método:* ${resultado.tituloRegla} (Confianza ${resultado.porcentajeConfianza}%)${lineaAncla}`,
      `*Detalle:* ${resultado.detalleExplicacion}${lineaRecargos}`,
      `*Ruta Google Maps:* ${linkGoogleMaps}`,
      `--------------------------------`,
      `*TOTAL EN PESOS:* ${resultado.totalCop.toLocaleString('es-CO')} COP`,
      !resultado.esOficial
        ? `*Rango Sugerido:* ${resultado.rangoSugeridoMinCop.toLocaleString('es-CO')} - ${resultado.rangoSugeridoMaxCop.toLocaleString('es-CO')} COP`
        : '',
      `*EQUIVALENTE USD:* $${resultado.totalUsd.toFixed(2)} USD`,
      `*EQUIVALENTE BCV:* Bs. ${resultado.totalVesBcv.toFixed(2)}`,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(texto)
    setCopiadoWhatsapp(true)
    setTimeout(() => setCopiadoWhatsapp(false), 2500)
  }

  const origenesGuiados = React.useMemo(() => {
    const setOrig = new Set<string>()
    db.combinaciones.forEach((c) => setOrig.add(c.origen))
    return Array.from(setOrig).sort()
  }, [db.combinaciones])

  return (
    <div className="space-y-6" ref={contenedorRef}>
      {/* BARRA DE CASOS DE PRUEBA: PUNTOS NO CONTEMPLADOS VS OFICIALES */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModoCasosPrueba('no_contemplados')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
                modoCasosPrueba === 'no_contemplados'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              Pruebas Puntos NO Contemplados (Inferencia IA / Anclas)
            </button>

            <button
              type="button"
              onClick={() => setModoCasosPrueba('oficiales')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
                modoCasosPrueba === 'oficiales'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Pruebas Oficiales del Tarifario (270 Rutas)
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            {modoCasosPrueba === 'no_contemplados'
              ? 'Lugares que NO están en el Excel: el motor los triangula con la tarifa oficial vecina más cercana'
              : 'Rutas directas, combinaciones con "/" y despachos radiales de la matriz'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(modoCasosPrueba === 'no_contemplados'
            ? CASOS_PRUEBA_NO_CONTEMPLADOS
            : CASOS_PRUEBA_OFICIALES
          ).map((caso) => {
            const activo =
              origen.toLowerCase() === caso.origen.toLowerCase() &&
              destino.toLowerCase() === caso.destino.toLowerCase()
            return (
              <button
                key={caso.etiqueta}
                type="button"
                onClick={() => {
                  onChangeOrigen(caso.origen)
                  onChangeDestino(caso.destino)
                }}
                className={`group inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all ${
                  activo
                    ? modoCasosPrueba === 'no_contemplados'
                      ? 'border-purple-400 bg-purple-500/20 text-white shadow-md shadow-purple-500/10'
                      : 'border-amber-400 bg-amber-400/15 text-white shadow-md shadow-amber-500/10'
                    : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="font-bold">{caso.etiqueta}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    activo
                      ? modoCasosPrueba === 'no_contemplados'
                        ? 'bg-purple-400 text-slate-950'
                        : 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                  }`}
                >
                  {caso.badge}
                </span>
              </button>
            )
          })}
        </div>

        {/* BARRA DE CONSULTA EN LENGUAJE NATURAL CON AGENTE IA + RUTEO OSRM */}
        <div className="pt-2 border-t border-slate-800/90 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <BrainCircuit className="h-4 w-4 text-purple-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={consultaNatural}
              onChange={(e) => setConsultaNatural(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229 &&
                  consultaNatural.trim()
                ) {
                  e.preventDefault()
                  ejecutarAnalisisProfundoIA(consultaNatural)
                }
              }}
              placeholder='Prueba con IA en lenguaje libre: ej. "Desde parte alta de Pueblo Nuevo hasta Peribeca lloviendo con 1 parada"'
              className="w-full rounded-xl border border-purple-500/30 bg-slate-950/90 pl-10 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={cargandoIA}
            onClick={() => ejecutarAnalisisProfundoIA(consultaNatural)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-purple-600/20 transition-all shrink-0"
          >
            {cargandoIA ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Calculando IA + Ruta Vial OSRM...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>
                  {consultaNatural.trim()
                    ? 'Cotizar Texto con IA'
                    : 'Verificar Ruta con IA + GPS OSRM'}
                </span>
              </>
            )}
          </button>
        </div>

        {errorIA && (
          <p className="text-xs text-rose-400 font-medium">{errorIA}</p>
        )}
      </div>

      {/* GRID PRINCIPAL: FORMULARIO IZQUIERDA (7 COL) + TARJETA RESULTADO DERECHA (5 COL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: ENTRADAS DE DIRECCIÓN Y RECARGOS */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl space-y-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-400/20 mb-2">
              <Calculator className="h-3.5 w-3.5" /> Motor Híbrido: Matriz Oficial + Triangulación de Anclas + IA
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Calculador Inteligente — Base Central Táriba
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Escribe <strong className="text-slate-200">cualquier punto del Táchira</strong>, esté o no en el Excel (ej.{' '}
              <em className="text-purple-300">&quot;Peribeca&quot;</em>,{' '}
              <em className="text-purple-300">&quot;Chorro del Indio&quot;</em>,{' '}
              <em className="text-purple-300">&quot;Clínica CEMOC&quot;</em>,{' '}
              <em className="text-purple-300">&quot;Bramón&quot;</em>,{' '}
              <em className="text-purple-300">&quot;Carrera 19 con Calle 12&quot;</em>). Si no está en la matriz, el sistema localiza el <strong className="text-amber-300">Ancla Oficial más cercana</strong> y calcula los kilómetros y pendiente adicionales.
            </p>
          </div>

          {/* INPUT ORIGEN */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="input-origen"
                className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <Navigation className="h-3.5 w-3.5 text-amber-400" />
                Dirección o Punto de Partida (Recogida):
              </label>
              <button
                type="button"
                onClick={() => onChangeOrigen('Táriba')}
                className="text-[11px] font-bold text-amber-400 hover:underline"
              >
                fijar Base Táriba
              </button>
            </div>

            <div className="relative">
              <input
                id="input-origen"
                type="text"
                value={origen}
                onFocus={() => setFocoInput('origen')}
                onChange={(e) => {
                  onChangeOrigen(e.target.value)
                  setFocoInput('origen')
                }}
                placeholder="Ej. Táriba, Urb. Las Acacias, Zorca Providencia, Sabaneta..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-9 py-3 text-sm font-semibold text-white focus:border-amber-400 focus:outline-none transition-colors"
              />
              <MapPin className="h-4 w-4 text-amber-400 absolute left-3.5 top-3.5" />
              {origen && (
                <button
                  type="button"
                  onClick={() => onChangeOrigen('')}
                  aria-label="Limpiar origen"
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* DROPDOWN SUGERENCIAS ORIGEN */}
            {focoInput === 'origen' && sugerenciasOrigen.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
                {sugerenciasOrigen.map((sug) => (
                  <button
                    key={`${sug.categoria}-${sug.texto}`}
                    type="button"
                    onClick={() => {
                      onChangeOrigen(sug.texto)
                      setFocoInput(null)
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 border-b border-slate-800/80 last:border-none flex items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {sug.texto}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {sug.subtitulo}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                        sug.categoria === 'Punto No Contemplado (IA)'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800 text-amber-400 border-slate-700'
                      }`}
                    >
                      {sug.categoria}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN INVERTIR ORIGEN <-> DESTINO */}
          <div className="flex items-center justify-center -my-2">
            <button
              type="button"
              onClick={invertirRuta}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-md transition-transform hover:scale-105"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-400" />
              <span>Invertir Partida y Llegada</span>
            </button>
          </div>

          {/* INPUT DESTINO */}
          <div className="relative">
            <label
              htmlFor="input-destino"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5 text-rose-400" />
              Dirección o Punto de Llegada (Destino):
            </label>

            <div className="relative">
              <input
                id="input-destino"
                type="text"
                value={destino}
                onFocus={() => setFocoInput('destino')}
                onChange={(e) => {
                  onChangeDestino(e.target.value)
                  setFocoInput('destino')
                }}
                placeholder="Ej. Peribeca, Chorro del Indio, Bramón, Clínica CEMOC, Rubio..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-9 py-3 text-sm font-semibold text-white focus:border-amber-400 focus:outline-none transition-colors"
              />
              <MapPin className="h-4 w-4 text-rose-400 absolute left-3.5 top-3.5" />
              {destino && (
                <button
                  type="button"
                  onClick={() => onChangeDestino('')}
                  aria-label="Limpiar destino"
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* DROPDOWN SUGERENCIAS DESTINO */}
            {focoInput === 'destino' && sugerenciasDestino.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
                {sugerenciasDestino.map((sug) => (
                  <button
                    key={`${sug.categoria}-${sug.texto}`}
                    type="button"
                    onClick={() => {
                      onChangeDestino(sug.texto)
                      setFocoInput(null)
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 border-b border-slate-800/80 last:border-none flex items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {sug.texto}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {sug.subtitulo}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                        sug.categoria === 'Punto No Contemplado (IA)'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800 text-amber-400 border-slate-700'
                      }`}
                    >
                      {sug.categoria}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PANEL DE CONDICIONES OPERATIVAS (RECARGOS Y EXTRAS) */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Condiciones del Servicio y Recargos Operativos:
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onChangeOpciones({ ...opciones, nocturno: !opciones.nocturno })
                }
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                  opciones.nocturno
                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 shadow-md'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Moon className="h-4 w-4 mb-1 text-indigo-400" />
                <span>Nocturno</span>
                <span className="text-[10px] opacity-75">
                  +{parametros.recargoNocturnoPct}%
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeOpciones({ ...opciones, lluvia: !opciones.lluvia })
                }
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                  opciones.lluvia
                    ? 'border-sky-400 bg-sky-500/20 text-sky-200 shadow-md'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CloudRain className="h-4 w-4 mb-1 text-sky-400" />
                <span>Lluvia Fuerte</span>
                <span className="text-[10px] opacity-75">
                  +{parametros.recargoLluviaPct}%
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeOpciones({ ...opciones, feriado: !opciones.feriado })
                }
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                  opciones.feriado
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-md'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Calendar className="h-4 w-4 mb-1 text-amber-400" />
                <span>Dom / Feriado</span>
                <span className="text-[10px] opacity-75">
                  +{parametros.recargoFeriadoPct}%
                </span>
              </button>
            </div>

            {/* PARADAS EXTRA Y MINUTOS DE ESPERA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Paradas Extra
                    </span>
                    <span className="text-[10px] text-slate-500">
                      +{parametros.costoParadaExtraCop.toLocaleString('es-CO')} COP c/u
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOpciones({
                        ...opciones,
                        paradasExtra: Math.max(0, opciones.paradasExtra - 1),
                      })
                    }
                    className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-white">
                    {opciones.paradasExtra}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOpciones({
                        ...opciones,
                        paradasExtra: opciones.paradasExtra + 1,
                      })
                    }
                    className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Espera (Minutos)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      +{parametros.costoMinutoEsperaCop.toLocaleString('es-CO')} COP/min
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOpciones({
                        ...opciones,
                        minutosEspera: Math.max(0, opciones.minutosEspera - 5),
                      })
                    }
                    className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    -5m
                  </button>
                  <span className="w-7 text-center text-xs font-bold text-white">
                    {opciones.minutosEspera}m
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOpciones({
                        ...opciones,
                        minutosEspera: opciones.minutosEspera + 5,
                      })
                    }
                    className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    +5m
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SELECTOR CLÁSICO POR MENÚS DESPLEGABLES */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setMostrarGuiado(!mostrarGuiado)}
              className="w-full flex items-center justify-between text-xs font-bold text-amber-400 hover:text-amber-300 py-1"
            >
              <span>Selector Guiado por Listas Desplegables del Excel</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  mostrarGuiado ? 'rotate-180' : ''
                }`}
              />
            </button>

            {mostrarGuiado && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Elegir Origen de Lista:
                  </label>
                  <select
                    value={origen}
                    onChange={(e) => onChangeOrigen(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Táriba">Táriba (Base Central)</option>
                    <optgroup label="Orígenes con Combinación Pactada">
                      {origenesGuiados.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Elegir Destino de Lista:
                  </label>
                  <select
                    value={destino}
                    onChange={(e) => onChangeDestino(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <optgroup label="Rutas Urbanas / Regionales (Hoja 6)">
                      {db.rutas_base.map((r) => (
                        <option key={r.id} value={r.destino}>
                          {r.destino} — {r.cop.toLocaleString('es-CO')} COP
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Viajes Largos (Hoja 4)">
                      {db.viajes_largos.map((l) => (
                        <option key={l.id} value={l.destino}>
                          {l.destino} — ${l.usd} USD
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: TARJETA DE RESULTADO, ANCLAS Y RAZONAMIENTO IA */}
        <div className="lg:col-span-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl space-y-4">
          {/* CABECERA DE REGLA, CONFIANZA Y DISTANCIA */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider border ${
                  resultado.esOficial
                    ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                    : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                }`}
              >
                {resultado.esOficial ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <BrainCircuit className="h-3.5 w-3.5 text-purple-400" />
                )}
                {resultado.esOficial
                  ? 'Tarifa Oficial'
                  : resultado.reglaAplicada === 'IA_GEORREFERENCIADA_OSRM'
                  ? 'IA + Ruteo Vial OSRM'
                  : resultado.reglaAplicada === 'INFERENCIA_ANCLA_VECINA'
                  ? 'Inferencia por Ancla Vecina'
                  : 'Cálculo Radial / IA'}
              </span>

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  resultado.porcentajeConfianza >= 95
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                }`}
              >
                {resultado.porcentajeConfianza}% Confianza
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="rounded-lg bg-slate-800/90 border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-200">
                ~{resultado.distanciaVialKm} km
              </span>
              <span className="rounded-lg bg-slate-800/90 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-400">
                ~{resultado.tiempoEstimadoMin} min
              </span>
              <span className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">
                {resultado.topografiaDominante}
              </span>
            </div>
          </div>

          {/* RESUMEN DE RUTA Y SECTORES DETECTADOS */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  PUNTO DE PARTIDA (RECOGIDA):
                </span>
                <span className="text-sm font-bold text-amber-300">
                  {resultado.origenInput}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Nodo: <strong>{resultado.sectorOrigenDetectado}</strong>
                </span>
              </div>
              {resultado.tramo1RecogidaCop > 0 && (
                <span className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 shrink-0">
                  Tramo 1: {resultado.tramo1RecogidaCop.toLocaleString('es-CO')} COP
                </span>
              )}
            </div>

            <div className="border-t border-dashed border-slate-800 my-1" />

            <div className="flex items-start justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  PUNTO DE LLEGADA (DESTINO):
                </span>
                <span className="text-sm font-bold text-white">
                  {resultado.destinoInput}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Nodo: <strong>{resultado.sectorDestinoDetectado}</strong>
                </span>
              </div>
              {resultado.tramo2TrasladoCop > 0 && (
                <span className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 shrink-0">
                  Tramo 2: {resultado.tramo2TrasladoCop.toLocaleString('es-CO')} COP
                </span>
              )}
            </div>

            {resultado.telemetriaMapa?.resumenRutaPrincipal && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Route className="h-3.5 w-3.5" />
                  Mejor Ruta en Mapa:
                </span>
                <span className="text-slate-200 font-semibold truncate">
                  {resultado.telemetriaMapa.resumenRutaPrincipal} (
                  {resultado.distanciaVialKm} km · ~{resultado.tiempoEstimadoMin} min)
                </span>
              </div>
            )}
          </div>

          {/* MONTO PRINCIPAL EN PESOS COLOMBIANOS (COP) */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-1">
              Total a Cobrar ({resultado.tituloRegla})
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {resultado.totalCop.toLocaleString('es-CO')}
              </span>
              <span className="text-xl font-black text-amber-400">COP</span>
            </div>

            {/* BARRA RÁPIDA PARA MODIFICAR EL PRECIO Y ENTRENAR AL SISTEMA */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {[-2000, -1000, 1000, 2000].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => {
                    const base = editandoPrecio
                      ? precioEntrenarCop
                      : resultado.totalCop
                    setPrecioEntrenarCop(Math.max(5000, base + delta))
                    setEditandoPrecio(true)
                    setFeedbackEntrenamiento(null)
                  }}
                  className="rounded-lg border border-amber-400/30 bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 px-2.5 py-1 text-[11px] font-extrabold text-amber-300 transition-colors"
                >
                  {delta > 0 ? `+${delta.toLocaleString('es-CO')}` : delta.toLocaleString('es-CO')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPrecioEntrenarCop(resultado.totalCop)
                  setEditandoPrecio((prev) => !prev)
                  setFeedbackEntrenamiento(null)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 px-3 py-1 text-[11px] font-black text-emerald-300 transition-all"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                <span>
                  {editandoPrecio
                    ? 'Cerrar Entrenador'
                    : 'Modificar Precio y Entrenar'}
                </span>
              </button>
            </div>

            {/* PANEL DESPLEGABLE DE ENTRENAMIENTO EN VIVO */}
            {editandoPrecio && (
              <div className="mt-3.5 rounded-xl border border-emerald-400/40 bg-slate-950/95 p-3.5 text-left space-y-3 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <BrainCircuit className="h-4 w-4" />
                    Entrenar Precio Real para Enseñar al Sistema
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Actual: {resultado.totalCop.toLocaleString('es-CO')} COP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Nuevo Precio en Pesos (COP)
                    </label>
                    <input
                      type="number"
                      step={1000}
                      min={5000}
                      value={precioEntrenarCop}
                      onChange={(e) =>
                        setPrecioEntrenarCop(Number(e.target.value) || 0)
                      }
                      className="w-full rounded-xl border border-emerald-400/50 bg-slate-900 px-3 py-2 text-base font-black text-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Equivalente en Dólares (USD)
                    </label>
                    <input
                      type="number"
                      step={0.25}
                      min={1}
                      value={Number(
                        (precioEntrenarCop / parametros.tasaCopPorUsd).toFixed(2)
                      )}
                      onChange={(e) => {
                        const usd = Number(e.target.value) || 0
                        setPrecioEntrenarCop(
                          Math.round((usd * parametros.tasaCopPorUsd) / 1000) *
                            1000
                        )
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base font-black text-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { id: 'completo', label: 'Aprender Ruta + Ancla + Resto' },
                        { id: 'zonal_ancla', label: 'Solo Ruta y Ancla' },
                        { id: 'solo_formula', label: 'Solo Fórmulas Km' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModoAprendizajeLocal(m.id)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold border transition-all ${
                          modoAprendizajeLocal === m.id
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propagarVecinosLocal}
                      onChange={(e) => setPropagarVecinosLocal(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500"
                    />
                    <span>Ajustar corredor vecino (&lt; 2.4 km)</span>
                  </label>
                </div>

                {/* PREVISUALIZACIÓN EN TIEMPO REAL DE CÓMO APRENDE EL RESTO */}
                {vistaPreviaEntrenamiento && (
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/25 p-2.5 space-y-1.5 text-[11px]">
                    <span className="font-bold text-emerald-300 block">
                      ¿Qué aprenderá el motor al guardar este precio?
                    </span>
                    <ul className="space-y-1 text-slate-200">
                      {vistaPreviaEntrenamiento.leccion.ajustesAplicados.resumenAprendizaje.map(
                        (item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                    {vistaPreviaEntrenamiento.ejemplosImpactados.length > 0 && (
                      <div className="pt-1.5 border-t border-emerald-500/20">
                        <span className="text-[10px] font-bold uppercase text-amber-300 block mb-1">
                          Impacto automático en otras rutas del sistema:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {vistaPreviaEntrenamiento.ejemplosImpactados
                            .slice(0, 4)
                            .map((ej) => (
                              <div
                                key={`${ej.origen}-${ej.destino}`}
                                className="flex items-center justify-between rounded bg-slate-900/90 px-2 py-1 text-[10px]"
                              >
                                <span className="text-slate-300 truncate">
                                  {ej.origen} → <strong>{ej.destino}</strong>
                                </span>
                                <span className="font-bold text-emerald-400 shrink-0 ml-1">
                                  {ej.copAntes.toLocaleString('es-CO')} →{' '}
                                  {ej.copDespues.toLocaleString('es-CO')}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditandoPrecio(false)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarEntrenamientoPrecio}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Aplicar Precio y Entrenar Resto de Tarifas</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMACIÓN POST-ENTRENAMIENTO */}
            {feedbackEntrenamiento && !editandoPrecio && (
              <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-3 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ¡Sistema entrenado! El motor aprendió esta tarifa y recalibró zonas vecinas:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFeedbackEntrenamiento(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="space-y-0.5 text-[11px] text-slate-200">
                  {feedbackEntrenamiento.resumen.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
                {onIrAlLaboratorioEntrenamiento && (
                  <button
                    type="button"
                    onClick={onIrAlLaboratorioEntrenamiento}
                    className="text-[11px] font-bold text-amber-300 hover:underline inline-flex items-center gap-1"
                  >
                    <span>
                      Ver impacto completo en el Laboratorio de Entrenamiento (
                      {estadoAprendizaje.lecciones.length} lecciones)
                    </span>
                  </button>
                )}
              </div>
            )}

            {!resultado.esOficial && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 border border-amber-400/25 px-3 py-0.5 text-[11px] font-semibold text-amber-200">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  Banda de Negociación Sugerida:{' '}
                  <strong>
                    {resultado.rangoSugeridoMinCop.toLocaleString('es-CO')} —{' '}
                    {resultado.rangoSugeridoMaxCop.toLocaleString('es-CO')} COP
                  </strong>
                </span>
              </div>
            )}

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {resultado.detalleExplicacion}
            </p>

            {(resultado.porcentajeRecargoTotal > 0 ||
              resultado.montoExtrasCop > 0) && (
              <div className="mt-3 pt-2.5 border-t border-amber-400/20 flex flex-wrap items-center justify-center gap-2 text-[11px] text-amber-200">
                <span>
                  Base: {resultado.subtotalBaseCop.toLocaleString('es-CO')} COP
                </span>
                {resultado.porcentajeRecargoTotal > 0 && (
                  <span>
                    • Recargos (+{resultado.porcentajeRecargoTotal}%): +
                    {resultado.montoRecargosCop.toLocaleString('es-CO')} COP
                  </span>
                )}
                {resultado.montoExtrasCop > 0 && (
                  <span>
                    • Extras: +{resultado.montoExtrasCop.toLocaleString('es-CO')} COP
                  </span>
                )}
              </div>
            )}
          </div>

          {/* PANEL DE TRIANGULACIÓN DE ANCLAS OFICIALES VECINAS (CUANDO ES UN PUNTO NO CONTEMPLADO) */}
          {!resultado.esOficial &&
            resultado.anclasCercanasDestino &&
            resultado.anclasCercanasDestino.length > 0 && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-purple-400" />
                    Anclas Oficiales Vecinas Usadas para Calcular
                  </span>
                  <button
                    type="button"
                    disabled={cargandoIA}
                    onClick={() => ejecutarAnalisisProfundoIA()}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold text-purple-200 transition-colors"
                  >
                    {cargandoIA ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Radar className="h-3 w-3" />
                    )}
                    <span>Ruteo GPS + IA</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {resultado.anclasCercanasDestino.map((ancla, idx) => (
                    <div
                      key={ancla.nombreOficial}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs border ${
                        idx === 0
                          ? 'bg-purple-500/15 border-purple-400/40 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                            idx === 0
                              ? 'bg-purple-400 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold block leading-tight">
                            Ancla Excel: {ancla.nombreOficial}
                          </span>
                          <span className="text-[10px] opacity-80">
                            A {ancla.distanciaAlPuntoKm} km viales del punto ·{' '}
                            {ancla.tipoTabla}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-300 block">
                          {ancla.copOficial.toLocaleString('es-CO')} COP
                        </span>
                        <span className="text-[10px] text-purple-300">
                          {ancla.ajustePorDistanciaCop >= 0 ? '+' : ''}
                          {ancla.ajustePorDistanciaCop.toLocaleString('es-CO')} ajuste km
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* RAZONAMIENTO PASO A PASO O EXPLICACIÓN DEL AGENTE IA */}
                {resultado.analisisIA ? (
                  <div className="rounded-lg bg-slate-950/80 border border-purple-500/30 p-2.5 text-[11px] text-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-300">
                      <span className="flex items-center gap-1">
                        <Route className="h-3 w-3" /> Dictamen del Agente IA +{' '}
                        {resultado.analisisIA.fuenteGeometria === 'OSRM_CARRETERA_REAL'
                          ? 'Carretera Real OSRM'
                          : 'Topografía'}
                      </span>
                      <span>
                        {resultado.analisisIA.municipioOrigen} →{' '}
                        {resultado.analisisIA.municipioDestino}
                      </span>
                    </div>
                    <p className="leading-relaxed text-slate-300">
                      {resultado.analisisIA.razonamientoExperto}
                    </p>
                  </div>
                ) : (
                  resultado.pasosRazonamiento &&
                  resultado.pasosRazonamiento.length > 0 && (
                    <ul className="space-y-1 text-[11px] text-slate-300 pt-1">
                      {resultado.pasosRazonamiento.map((paso, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-purple-400 font-bold">•</span>
                          <span>{paso}</span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            )}

          {/* CONVERSIÓN SIMULTÁNEA A DÓLARES (USD) Y BOLÍVARES (BCV) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                Equivalente Dólares
              </span>
              <span className="text-2xl font-black text-amber-300">
                ${resultado.totalUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Tasa: {resultado.tasaCopUsada.toLocaleString('es-CO')} COP/USD
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                Equivalente Bolívares
              </span>
              <span className="text-2xl font-black text-emerald-400">
                Bs. {resultado.totalVesBcv.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Tasa BCV: {resultado.tasaBcvUsada.toFixed(2)} Bs/USD
              </span>
            </div>
          </div>

          {/* NOTA SI SE APLICÓ UNA CORRECCIÓN AUTOMÁTICA RESPECTO AL PYTHON ORIGINAL */}
          {resultado.advertenciaCorreccion && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 flex items-start gap-2.5 text-xs text-emerald-200">
              <AlertCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-400 block">
                  Precisión Mejorada Activa:
                </span>
                <span>{resultado.advertenciaCorreccion}</span>
              </div>
            </div>
          )}

          {/* PIE DE TARJETA Y BOTÓN COPIAR WHATSAPP */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Fuente: <strong>Tarifas eyo.xlsx + Motor Anclas IA</strong>
            </span>
            <button
              type="button"
              onClick={copiarParaWhatsapp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-500/10 transition-all"
            >
              {copiadoWhatsapp ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>¡Copiado para WhatsApp!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Cotización</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MAPA INTERACTIVO DE MEJOR RUTA (GOOGLE MAPS CON TU API KEY + MAPA VIAL OSRM GRATUITO) */}
      <MapaRutaInteractivo
        origen={origen}
        destino={destino}
        coordenadasOrigen={resultado.coordenadasOrigen}
        coordenadasDestino={resultado.coordenadasDestino}
        anclaDestino={resultado.anclaDestinoUsada}
        totalCop={resultado.totalCop}
        esOficial={resultado.esOficial}
        telemetriaActual={telemetriaMapa}
        onChangeTelemetria={onChangeTelemetriaMapa}
        onSeleccionarPuntoEnMapa={(tipo, nombreLugar) => {
          if (tipo === 'origen') {
            onChangeOrigen(nombreLugar)
          } else {
            onChangeDestino(nombreLugar)
          }
        }}
      />
    </div>
  )
}
