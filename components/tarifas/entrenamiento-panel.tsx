'use client'

import React, { useState, useMemo } from 'react'
import {
  EstadoAprendizajeMotor,
  ModoAprendizajeTarifa,
  ParametrosMotorTarifas,
  TarifasTachiraDB,
} from '@/lib/tarifas/types'
import {
  calcularTarifaPatriotas,
  OPCIONES_VIAJE_DEFAULT,
  PARAMETROS_DEFAULT,
} from '@/lib/tarifas/engine'
import {
  obtenerComparativaGlobalAprendizaje,
  procesarEntrenamientoTarifa,
} from '@/lib/tarifas/aprendizaje'
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Compass,
  Sliders,
  History,
  Trash2,
  Zap,
  Edit3,
} from 'lucide-react'

interface EntrenamientoPanelProps {
  db: TarifasTachiraDB
  dbOriginal: TarifasTachiraDB
  parametros: ParametrosMotorTarifas
  estadoAprendizaje: EstadoAprendizajeMotor
  onAplicarEntrenamiento: (params: {
    origen: string
    destino: string
    nuevoTotalCop: number
    modoAprendizaje: ModoAprendizajeTarifa
    propagarCorredorVecino: boolean
  }) => void
  onCambiarAlpha: (nuevoAlpha: number) => void
  onEliminarLeccion: (idLeccion: string) => void
  onRestaurarFabrica: () => void
  onProbarEnCotizador: (origen: string, destino: string) => void
}

export function EntrenamientoPanel({
  db,
  dbOriginal,
  parametros,
  estadoAprendizaje,
  onAplicarEntrenamiento,
  onCambiarAlpha,
  onEliminarLeccion,
  onRestaurarFabrica,
  onProbarEnCotizador,
}: EntrenamientoPanelProps) {
  const [origenRapido, setOrigenRapido] = useState('Táriba')
  const [destinoRapido, setDestinoRapido] = useState('Santa Teresa')
  const [modoAprendizaje, setModoAprendizaje] =
    useState<ModoAprendizajeTarifa>('completo')
  const [propagarCorredor, setPropagarCorredor] = useState(true)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [filaEditando, setFilaEditando] = useState<string | null>(null)
  const [precioFilaEditando, setPrecioFilaEditando] = useState<number>(20000)

  const calculoSimuladoActual = useMemo(() => {
    return calcularTarifaPatriotas(
      origenRapido,
      destinoRapido,
      parametros,
      OPCIONES_VIAJE_DEFAULT,
      db,
      null,
      estadoAprendizaje
    )
  }, [origenRapido, destinoRapido, parametros, db, estadoAprendizaje])

  const [precioObjetivoRapido, setPrecioObjetivoRapido] = useState<number>(
    calculoSimuladoActual.totalCop
  )

  // Sincronizar cuando cambia origen o destino rápido
  React.useEffect(() => {
    setPrecioObjetivoRapido(calculoSimuladoActual.totalCop)
  }, [calculoSimuladoActual.totalCop, origenRapido, destinoRapido])

  const vistaPreviaRapida = useMemo(() => {
    if (precioObjetivoRapido === calculoSimuladoActual.totalCop) return null
    return procesarEntrenamientoTarifa({
      resultadoActual: calculoSimuladoActual,
      nuevoTotalCop: precioObjetivoRapido,
      parametrosActuales: parametros,
      dbActual: db,
      estadoAprendizajeActual: estadoAprendizaje,
      modoAprendizaje,
      propagarCorredorVecino: propagarCorredor,
    })
  }, [
    precioObjetivoRapido,
    calculoSimuladoActual,
    parametros,
    db,
    estadoAprendizaje,
    modoAprendizaje,
    propagarCorredor,
  ])

  const comparativaGlobal = useMemo(() => {
    return obtenerComparativaGlobalAprendizaje({
      parametrosActuales: parametros,
      dbActual: db,
      estadoAprendizajeActual: estadoAprendizaje,
      dbOriginal,
    })
  }, [parametros, db, estadoAprendizaje, dbOriginal])

  const ejecutarEntrenamientoDesdeFormulario = (e: React.FormEvent) => {
    e.preventDefault()
    onAplicarEntrenamiento({
      origen: origenRapido,
      destino: destinoRapido,
      nuevoTotalCop: precioObjetivoRapido,
      modoAprendizaje,
      propagarCorredorVecino: propagarCorredor,
    })
    setMensajeExito(
      `El sistema aprendió ${origenRapido} → ${destinoRapido} a ${precioObjetivoRapido.toLocaleString('es-CO')} COP y recalibró el resto de rutas relacionadas.`
    )
    setTimeout(() => setMensajeExito(null), 5000)
  }

  return (
    <div className="space-y-6">
      {/* CABECERA DE ESTADO DEL MOTOR DE APRENDIZAJE */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Centro de Entrenamiento y Aprendizaje Adaptativo
                </h2>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  {estadoAprendizaje.lecciones.length} Lecciones Aprendidas
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Cada vez que modificas un precio, el sistema realiza un{' '}
                <strong>triple aprendizaje</strong>: (1) Fija la tarifa exacta de
                esa ruta, (2) Convierte el punto en un{' '}
                <strong>Ancla Geográfica</strong> para calles y urbanizaciones
                vecinas, y (3) Recalibra los costos por kilómetro, factores
                zonales y recogida radial para mejorar el cálculo del resto de
                las tarifas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Tasa de Aprendizaje Alpha */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Velocidad de Aprendizaje:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { val: 0.25, label: 'Suave (25%)' },
                  { val: 0.45, label: 'Equilibrado (45%)' },
                  { val: 0.75, label: 'Agresivo (75%)' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => onCambiarAlpha(opt.val)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                      Math.abs(
                        estadoAprendizaje.tasaAprendizajeAlpha - opt.val
                      ) < 0.05
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {estadoAprendizaje.lecciones.length > 0 && (
              <button
                type="button"
                onClick={onRestaurarFabrica}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2.5 text-xs font-bold text-rose-300 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reiniciar Entrenamiento</span>
              </button>
            )}
          </div>
        </div>

        {/* MÉTRICAS RÁPIDAS DE EVOLUCIÓN DE PARÁMETROS (FÁBRICA VS ENTRENADO) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          {[
            {
              titulo: 'Km Urbano',
              fabrica: `${PARAMETROS_DEFAULT.costoKmUrbano.toLocaleString('es-CO')} COP`,
              actual: `${parametros.costoKmUrbano.toLocaleString('es-CO')} COP`,
              cambio: parametros.costoKmUrbano !== PARAMETROS_DEFAULT.costoKmUrbano,
              factorZonal: estadoAprendizaje.factoresZonales.urbano,
            },
            {
              titulo: 'Km Troncal',
              fabrica: `${PARAMETROS_DEFAULT.costoKmTroncal.toLocaleString('es-CO')} COP`,
              actual: `${parametros.costoKmTroncal.toLocaleString('es-CO')} COP`,
              cambio:
                parametros.costoKmTroncal !== PARAMETROS_DEFAULT.costoKmTroncal,
              factorZonal: estadoAprendizaje.factoresZonales.troncal,
            },
            {
              titulo: 'Km Montaña',
              fabrica: `${PARAMETROS_DEFAULT.costoKmMontana.toLocaleString('es-CO')} COP`,
              actual: `${parametros.costoKmMontana.toLocaleString('es-CO')} COP`,
              cambio:
                parametros.costoKmMontana !== PARAMETROS_DEFAULT.costoKmMontana,
              factorZonal: estadoAprendizaje.factoresZonales.montana,
            },
            {
              titulo: 'Km Frontera',
              fabrica: `${PARAMETROS_DEFAULT.costoKmFrontera.toLocaleString('es-CO')} COP`,
              actual: `${parametros.costoKmFrontera.toLocaleString('es-CO')} COP`,
              cambio:
                parametros.costoKmFrontera !== PARAMETROS_DEFAULT.costoKmFrontera,
              factorZonal: estadoAprendizaje.factoresZonales.frontera,
            },
            {
              titulo: 'Recogida Radial',
              fabrica: `${Math.round(PARAMETROS_DEFAULT.factorRecogidaRadial * 100)}%`,
              actual: `${Math.round(parametros.factorRecogidaRadial * 100)}%`,
              cambio:
                parametros.factorRecogidaRadial !==
                PARAMETROS_DEFAULT.factorRecogidaRadial,
            },
            {
              titulo: 'Anclas Aprendidas',
              fabrica: '29 Oficiales',
              actual: `${29 + estadoAprendizaje.anclasAprendidas.length} Activas`,
              cambio: estadoAprendizaje.anclasAprendidas.length > 0,
            },
          ].map((item) => (
            <div
              key={item.titulo}
              className={`rounded-xl border p-3 ${
                item.cambio
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/70'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {item.titulo}
              </span>
              <span className="text-sm font-black text-white block mt-0.5">
                {item.actual}
              </span>
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className="text-slate-500">Base: {item.fabrica}</span>
                {item.factorZonal && Math.abs(item.factorZonal - 1) >= 0.01 && (
                  <span className="text-emerald-400 font-bold">
                    {item.factorZonal > 1 ? '+' : ''}
                    {Math.round((item.factorZonal - 1) * 100)}% zonal
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: ENTRENADOR DIRECTO CON VISTA PREVIA DE PROPAGACIÓN */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Entrenar una Ruta y Enseñar al Motor
            </h3>
            <span className="text-[11px] text-slate-400">
              Topografía: <strong className="text-white uppercase">{calculoSimuladoActual.topografiaDominante}</strong>
            </span>
          </div>

          <form onSubmit={ejecutarEntrenamientoDesdeFormulario} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Origen de la Carrera
                </label>
                <input
                  type="text"
                  value={origenRapido}
                  onChange={(e) => setOrigenRapido(e.target.value)}
                  placeholder="Ej. Táriba, Barrio Obrero..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Destino de la Carrera
                </label>
                <input
                  type="text"
                  value={destinoRapido}
                  onChange={(e) => setDestinoRapido(e.target.value)}
                  placeholder="Ej. Santa Teresa, Loma de Pío..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* COMPARACIÓN PRECIO SISTEMA VS PRECIO A ENSEÑAR */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Cálculo Actual del Sistema:
                  </span>
                  <span className="text-base font-black text-slate-200">
                    {calculoSimuladoActual.totalCop.toLocaleString('es-CO')} COP
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {calculoSimuladoActual.tituloRegla}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-400" />
                <div className="text-right">
                  <span className="text-amber-300 font-bold block text-[11px]">
                    Nuevo Precio a Enseñar (COP):
                  </span>
                  <input
                    type="number"
                    step={1000}
                    min={5000}
                    value={precioObjetivoRapido}
                    onChange={(e) =>
                      setPrecioObjetivoRapido(Number(e.target.value) || 0)
                    }
                    className="w-36 rounded-lg border border-amber-400/50 bg-slate-900 px-2.5 py-1 text-right text-base font-black text-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* BOTONES RÁPIDOS DE AJUSTE */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Ajuste rápido:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[-5000, -2000, -1000, 1000, 2000, 5000].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() =>
                        setPrecioObjetivoRapido((prev) =>
                          Math.max(5000, prev + step)
                        )
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-400/50 hover:text-amber-300 px-2 py-1 text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      {step > 0 ? `+${step / 1000}k` : `${step / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* OPCIONES DE PROPAGACIÓN DEL APRENDIZAJE */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-300">
                Modo de Entrenamiento:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {[
                  {
                    id: 'completo' as const,
                    label: 'Completo (Ruta + Resto)',
                  },
                  {
                    id: 'zonal_ancla' as const,
                    label: 'Ruta + Ancla Vecina',
                  },
                  {
                    id: 'solo_formula' as const,
                    label: 'Solo Fórmulas Km',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModoAprendizaje(m.id)}
                    className={`rounded-lg border px-2 py-1.5 font-bold transition-all ${
                      modoAprendizaje === m.id
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={propagarCorredor}
                  onChange={(e) => setPropagarCorredor(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>
                  Propagar proporcionalmente a rutas vecinas del mismo corredor (&lt; 2.4 km)
                </span>
              </label>
            </div>

            {/* PREVISUALIZACIÓN DE LO QUE APRENDERÁ EL MOTOR */}
            {vistaPreviaRapida && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Vista Previa del Aprendizaje en el Sistema:
                </span>
                <ul className="space-y-1 text-[11px] text-slate-200">
                  {vistaPreviaRapida.leccion.ajustesAplicados.resumenAprendizaje.map(
                    (linea, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{linea}</span>
                      </li>
                    )
                  )}
                </ul>

                {vistaPreviaRapida.ejemplosImpactados.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-300 block">
                      Otras rutas que se recalibrarán automáticamente:
                    </span>
                    {vistaPreviaRapida.ejemplosImpactados.slice(0, 3).map((ej) => (
                      <div
                        key={`${ej.origen}-${ej.destino}`}
                        className="flex items-center justify-between text-[11px] bg-slate-950/60 rounded-lg px-2 py-1"
                      >
                        <span className="text-slate-300 truncate">
                          {ej.origen} → <strong>{ej.destino}</strong>
                        </span>
                        <span className="font-bold text-amber-300 shrink-0 ml-2">
                          {ej.copAntes.toLocaleString('es-CO')} →{' '}
                          {ej.copDespues.toLocaleString('es-CO')} COP
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mensajeExito && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{mensajeExito}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <BrainCircuit className="h-4 w-4" />
              <span>Guardar Precio y Entrenar al Sistema</span>
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: TABLA DE IMPACTO EN EL RESTO DE LAS RUTAS */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Cómo Calcula Ahora el Resto de Rutas (Fábrica vs. Aprendido)
              </h3>
              <p className="text-xs text-slate-400">
                Haz clic en <strong>Entrenar</strong> en cualquier fila para ajustar su precio y enseñar a su zona.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Ruta Testigo en Táchira</th>
                  <th className="py-2.5 px-3 text-right">Fábrica</th>
                  <th className="py-2.5 px-3 text-right">Aprendido Actual</th>
                  <th className="py-2.5 px-3">Efecto del Entrenamiento</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comparativaGlobal.map((item) => {
                  const claveFila = `${item.origen}->${item.destino}`
                  const estaEditando = filaEditando === claveFila
                  const cambio = item.diferenciaCop !== 0

                  return (
                    <tr
                      key={claveFila}
                      className={`transition-colors ${
                        cambio
                          ? 'bg-emerald-950/15 hover:bg-emerald-950/25'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">
                          {item.origen} →{' '}
                          <span className="text-amber-300">{item.destino}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {item.descripcionZona}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-semibold">
                        {item.copAntes.toLocaleString('es-CO')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {estaEditando ? (
                          <input
                            type="number"
                            step={1000}
                            value={precioFilaEditando}
                            onChange={(e) =>
                              setPrecioFilaEditando(Number(e.target.value) || 0)
                            }
                            className="w-24 rounded-lg border border-amber-400 bg-slate-950 px-2 py-1 text-right text-xs font-black text-amber-400 focus:outline-none"
                          />
                        ) : (
                          <div>
                            <span className="font-black text-white text-sm">
                              {item.copDespues.toLocaleString('es-CO')}
                            </span>
                            {cambio && (
                              <span
                                className={`block text-[10px] font-bold ${
                                  item.diferenciaCop > 0
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {item.diferenciaCop > 0 ? '+' : ''}
                                {item.diferenciaCop.toLocaleString('es-CO')} COP
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        <span
                          className={
                            cambio
                              ? 'text-emerald-300 font-semibold'
                              : 'text-slate-500'
                          }
                        >
                          {item.motivoCambio}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {estaEditando ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onAplicarEntrenamiento({
                                  origen: item.origen,
                                  destino: item.destino,
                                  nuevoTotalCop: precioFilaEditando,
                                  modoAprendizaje: 'completo',
                                  propagarCorredorVecino: true,
                                })
                                setFilaEditando(null)
                              }}
                              className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-black text-slate-950"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setFilaEditando(null)}
                              className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFilaEditando(claveFila)
                                setPrecioFilaEditando(item.copDespues)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 px-2 py-1 text-[10px] font-bold text-emerald-300 transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Entrenar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onProbarEnCotizador(item.origen, item.destino)
                              }
                              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300"
                              title="Ver en el Cotizador"
                            >
                              Ver
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* HISTORIAL DE LECCIONES ENSEÑADAS AL MOTOR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <History className="h-4 w-4 text-amber-400" />
            Historial de Precios Modificados y Aprendizaje Generado (
            {estadoAprendizaje.lecciones.length})
          </h3>
        </div>

        {estadoAprendizaje.lecciones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center text-xs text-slate-400">
            Aún no has modificado ningún precio. Puedes entrenar una tarifa desde el{' '}
            <strong>Cotizador Inteligente</strong> (botón{' '}
            <span className="text-amber-300 font-bold">
              &quot;Modificar / Entrenar Precio&quot;
            </span>
            ), desde el formulario superior o haciendo clic en{' '}
            <span className="text-emerald-300 font-bold">&quot;Entrenar&quot;</span> en
            la tabla comparativa.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {estadoAprendizaje.lecciones.map((lec) => (
              <div
                key={lec.id}
                className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-white">
                        {lec.origen} →{' '}
                        <span className="text-amber-400">{lec.destino}</span>
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Topografía {lec.topografia.toUpperCase()} · ~
                        {lec.distanciaVialKm} km
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs line-through text-slate-500 mr-1.5">
                        {lec.totalSistemaAnteriorCop.toLocaleString('es-CO')}
                      </span>
                      <span className="text-sm font-black text-emerald-400">
                        {lec.totalEntrenadoCop.toLocaleString('es-CO')} COP
                      </span>
                      <span className="block text-[10px] font-bold text-amber-300">
                        {lec.deltaPorcentaje >= 0 ? '+' : ''}
                        {lec.deltaPorcentaje}%
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-1 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                    {lec.ajustesAplicados.resumenAprendizaje.map((txt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] text-slate-500">
                  <span>
                    Modo: <strong className="text-slate-300">{lec.modoAprendizaje}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onProbarEnCotizador(lec.origen, lec.destino)}
                      className="text-amber-400 hover:underline font-bold"
                    >
                      Probar ruta
                    </button>
                    <button
                      type="button"
                      onClick={() => onEliminarLeccion(lec.id)}
                      className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
