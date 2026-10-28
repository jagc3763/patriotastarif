'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  calcularTarifaPatriotas,
  obtenerDbSaneada,
  OPCIONES_VIAJE_DEFAULT,
  PARAMETROS_DEFAULT,
} from '@/lib/tarifas/engine'
import {
  ESTADO_APRENDIZAJE_INICIAL,
  procesarEntrenamientoTarifa,
} from '@/lib/tarifas/aprendizaje'
import {
  EstadoAprendizajeMotor,
  ModoAprendizajeTarifa,
  OpcionesViaje,
  ParametrosMotorTarifas,
  TarifasTachiraDB,
  TelemetriaRutaMapa,
} from '@/lib/tarifas/types'
import { CotizadorInteligente } from '@/components/tarifas/cotizador-inteligente'
import { ReglasParametrosPanel } from '@/components/tarifas/reglas-parametros-panel'
import { CatalogoMatrizPanel } from '@/components/tarifas/catalogo-matriz-panel'
import { AuditoriaCodigoPanel } from '@/components/tarifas/auditoria-codigo-panel'
import { EntrenamientoPanel } from '@/components/tarifas/entrenamiento-panel'
import { BotWhatsappPanel } from '@/components/tarifas/bot-whatsapp-panel'
import {
  CarTaxiFront,
  Calculator,
  Sliders,
  Table2,
  ShieldAlert,
  Coins,
  MapPin,
  BrainCircuit,
  MessageSquare,
} from 'lucide-react'

type TabPrincipal =
  | 'cotizador'
  | 'entrenamiento'
  | 'whatsapp'
  | 'reglas'
  | 'catalogo'
  | 'auditoria'

export default function ModuloTarifasPatriotasPage() {
  const [tabActiva, setTabActiva] = useState<TabPrincipal>('cotizador')
  const dbOriginal = useMemo(() => obtenerDbSaneada(), [])
  const [db, setDb] = useState<TarifasTachiraDB>(() => obtenerDbSaneada())
  const [parametros, setParametros] = useState<ParametrosMotorTarifas>(
    PARAMETROS_DEFAULT
  )
  const [estadoAprendizaje, setEstadoAprendizaje] =
    useState<EstadoAprendizajeMotor>(ESTADO_APRENDIZAJE_INICIAL)
  const [opciones, setOpciones] = useState<OpcionesViaje>(OPCIONES_VIAJE_DEFAULT)

  const [origen, setOrigen] = useState('Táriba')
  const [destino, setDestino] = useState('Pueblo Nuevo')
  const [telemetriaMapa, setTelemetriaMapa] =
    useState<TelemetriaRutaMapa | null>(null)

  // Cargar memoria de entrenamiento persistida en el servidor al iniciar
  useEffect(() => {
    let cancelado = false
    fetch('/api/tarifas/entrenamiento')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelado && data?.ok) {
          if (data.parametros) setParametros(data.parametros)
          if (data.estadoAprendizaje)
            setEstadoAprendizaje(data.estadoAprendizaje)
          if (data.db) setDb(data.db)
        }
      })
      .catch(() => {
        // Mantiene estado inicial si hay error de red
      })
    return () => {
      cancelado = true
    }
  }, [])

  const persistirEnServidor = useCallback(
    (
      nuevosParams: ParametrosMotorTarifas,
      nuevoAprendizaje: EstadoAprendizajeMotor,
      nuevoDb: TarifasTachiraDB
    ) => {
      fetch('/api/tarifas/entrenamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parametros: nuevosParams,
          estadoAprendizaje: nuevoAprendizaje,
          db: nuevoDb,
        }),
      }).catch(() => {})
    },
    []
  )

  const resultadoActual = useMemo(() => {
    return calcularTarifaPatriotas(
      origen,
      destino,
      parametros,
      opciones,
      db,
      telemetriaMapa,
      estadoAprendizaje
    )
  }, [
    origen,
    destino,
    parametros,
    opciones,
    db,
    telemetriaMapa,
    estadoAprendizaje,
  ])

  const totalRutasRegistradas =
    db.rutas_base.length + db.combinaciones.length + db.viajes_largos.length

  const manejarProbarRuta = (nuevoOrigen: string, nuevoDestino: string) => {
    setOrigen(nuevoOrigen)
    setDestino(nuevoDestino)
    setTabActiva('cotizador')
  }

  const manejarEntrenarPrecio = useCallback(
    (params: {
      origen: string
      destino: string
      nuevoTotalCop: number
      modoAprendizaje: ModoAprendizajeTarifa
      propagarCorredorVecino: boolean
    }) => {
      const resultadoBaseParaEntrenar = calcularTarifaPatriotas(
        params.origen,
        params.destino,
        parametros,
        opciones,
        db,
        params.origen === origen && params.destino === destino
          ? telemetriaMapa
          : null,
        estadoAprendizaje
      )

      const ejecutado = procesarEntrenamientoTarifa({
        resultadoActual: resultadoBaseParaEntrenar,
        nuevoTotalCop: params.nuevoTotalCop,
        parametrosActuales: parametros,
        opcionesActuales: opciones,
        dbActual: db,
        estadoAprendizajeActual: estadoAprendizaje,
        modoAprendizaje: params.modoAprendizaje,
        propagarCorredorVecino: params.propagarCorredorVecino,
      })

      setDb(ejecutado.nuevoDb)
      setParametros(ejecutado.nuevosParametros)
      setEstadoAprendizaje(ejecutado.nuevoEstadoAprendizaje)
      persistirEnServidor(
        ejecutado.nuevosParametros,
        ejecutado.nuevoEstadoAprendizaje,
        ejecutado.nuevoDb
      )
    },
    [
      parametros,
      opciones,
      db,
      origen,
      destino,
      telemetriaMapa,
      estadoAprendizaje,
      persistirEnServidor,
    ]
  )

  const manejarCambiarAlpha = (nuevoAlpha: number) => {
    const actualizado: EstadoAprendizajeMotor = {
      ...estadoAprendizaje,
      tasaAprendizajeAlpha: nuevoAlpha,
    }
    setEstadoAprendizaje(actualizado)
    persistirEnServidor(parametros, actualizado, db)
  }

  const manejarEliminarLeccion = (idLeccion: string) => {
    const restantes = estadoAprendizaje.lecciones.filter(
      (l) => l.id !== idLeccion
    )
    if (restantes.length === 0) {
      manejarRestaurarFabrica()
      return
    }
    const actualizado: EstadoAprendizajeMotor = {
      ...estadoAprendizaje,
      lecciones: restantes,
    }
    setEstadoAprendizaje(actualizado)
    persistirEnServidor(parametros, actualizado, db)
  }

  const manejarRestaurarFabrica = () => {
    const dbLimpia = obtenerDbSaneada()
    setDb(dbLimpia)
    setParametros(PARAMETROS_DEFAULT)
    setEstadoAprendizaje(ESTADO_APRENDIZAJE_INICIAL)
    fetch('/api/tarifas/entrenamiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'reset' }),
    }).catch(() => {})
  }

  const manejarAgregarRutaCustom = (nueva: {
    categoria: 'base' | 'combinacion' | 'largo'
    origen: string
    destino: string
    cop: number
    usd?: number
  }) => {
    // Al agregar o modificar desde el catálogo, también entrenamos el sistema
    manejarEntrenarPrecio({
      origen: nueva.categoria === 'combinacion' ? nueva.origen : 'Táriba',
      destino: nueva.destino,
      nuevoTotalCop: nueva.cop,
      modoAprendizaje: 'completo',
      propagarCorredorVecino: false,
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1120] text-slate-100">
      {/* HEADER SUPERIOR CON TASAS DE CAMBIO EN TIEMPO REAL */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/20">
              <CarTaxiFront className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Línea Los Patriotas
                </h1>
                <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
                  Base Central Táriba • Táchira
                </span>
                {estadoAprendizaje.lecciones.length > 0 && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <BrainCircuit className="h-3 w-3" />
                    {estadoAprendizaje.lecciones.length} lecciones aprendidas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Módulo de Tarifas Trimonetario (COP / USD / BCV) con Aprendizaje Adaptativo ({totalRutasRegistradas} rutas activas)
              </p>
            </div>
          </div>

          {/* CONTROL DE TASAS DE CAMBIO */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold">1 USD =</span>
              <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-2 py-1">
                <input
                  type="number"
                  aria-label="Tasa Pesos por Dólar"
                  step={50}
                  value={parametros.tasaCopPorUsd}
                  onChange={(e) => {
                    const nuevos = {
                      ...parametros,
                      tasaCopPorUsd: Number(e.target.value) || 3800,
                    }
                    setParametros(nuevos)
                    persistirEnServidor(nuevos, estadoAprendizaje, db)
                  }}
                  className="w-16 bg-transparent text-center font-bold text-amber-400 focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400 ml-1">
                  COP
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="font-semibold">1 USD =</span>
              <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-2 py-1">
                <input
                  type="number"
                  aria-label="Tasa Bolívares BCV por Dólar"
                  step={0.5}
                  value={parametros.tasaBcvPorUsd}
                  onChange={(e) => {
                    const nuevos = {
                      ...parametros,
                      tasaBcvPorUsd: Number(e.target.value) || 45,
                    }
                    setParametros(nuevos)
                    persistirEnServidor(nuevos, estadoAprendizaje, db)
                  }}
                  className="w-14 bg-transparent text-center font-bold text-emerald-400 focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400 ml-1">
                  Bs BCV
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE PESTAÑAS DEL MÓDULO */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1.5 pt-1 border-t border-slate-900">
          <button
            type="button"
            onClick={() => setTabActiva('cotizador')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              tabActiva === 'cotizador'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Cotizador Inteligente y Despacho</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('entrenamiento')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              tabActiva === 'entrenamiento'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-400/10'
                : 'border-transparent text-emerald-400/80 hover:text-emerald-300'
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            <span>
              Entrenamiento y Aprendizaje ({estadoAprendizaje.lecciones.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('whatsapp')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              tabActiva === 'whatsapp'
                ? 'border-teal-400 text-teal-300 bg-teal-400/10'
                : 'border-transparent text-teal-400/80 hover:text-teal-300'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Bot WhatsApp IA (En Vivo)</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('reglas')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              tabActiva === 'reglas'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Reglas y Parámetros Topográficos</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('catalogo')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              tabActiva === 'catalogo'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table2 className="h-4 w-4" />
            <span>Matriz Oficial Completa ({totalRutasRegistradas} Tarifas)</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('auditoria')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              tabActiva === 'auditoria'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-emerald-400" />
            <span>Auditoría de Archivos (.py / .json) y API</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {tabActiva === 'cotizador' && (
          <CotizadorInteligente
            origen={origen}
            destino={destino}
            onChangeOrigen={setOrigen}
            onChangeDestino={setDestino}
            opciones={opciones}
            onChangeOpciones={setOpciones}
            parametros={parametros}
            resultado={resultadoActual}
            db={db}
            telemetriaMapa={telemetriaMapa}
            onChangeTelemetriaMapa={setTelemetriaMapa}
            estadoAprendizaje={estadoAprendizaje}
            onEntrenarPrecio={manejarEntrenarPrecio}
            onIrAlLaboratorioEntrenamiento={() =>
              setTabActiva('entrenamiento')
            }
          />
        )}

        {tabActiva === 'entrenamiento' && (
          <EntrenamientoPanel
            db={db}
            dbOriginal={dbOriginal}
            parametros={parametros}
            estadoAprendizaje={estadoAprendizaje}
            onAplicarEntrenamiento={manejarEntrenarPrecio}
            onCambiarAlpha={manejarCambiarAlpha}
            onEliminarLeccion={manejarEliminarLeccion}
            onRestaurarFabrica={manejarRestaurarFabrica}
            onProbarEnCotizador={manejarProbarRuta}
          />
        )}

        {tabActiva === 'whatsapp' && (
          <BotWhatsappPanel
            parametros={parametros}
            estadoAprendizaje={estadoAprendizaje}
            onEntrenarPrecioDesdeBot={manejarEntrenarPrecio}
            onProbarEnCotizador={manejarProbarRuta}
          />
        )}

        {tabActiva === 'reglas' && (
          <ReglasParametrosPanel
            parametros={parametros}
            onChangeParametros={(nuevos) => {
              setParametros(nuevos)
              persistirEnServidor(nuevos, estadoAprendizaje, db)
            }}
            resultadoActual={resultadoActual}
          />
        )}

        {tabActiva === 'catalogo' && (
          <CatalogoMatrizPanel
            db={db}
            parametros={parametros}
            onProbarRuta={manejarProbarRuta}
            onAgregarRutaCustom={manejarAgregarRutaCustom}
            onEntrenarRutaDesdeCatalogo={(orig, dest, nuevoCop) =>
              manejarEntrenarPrecio({
                origen: orig,
                destino: dest,
                nuevoTotalCop: nuevoCop,
                modoAprendizaje: 'completo',
                propagarCorredorVecino: true,
              })
            }
          />
        )}

        {tabActiva === 'auditoria' && (
          <AuditoriaCodigoPanel onProbarCaso={manejarProbarRuta} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-amber-400" />
            Línea de Taxis <strong>Los Patriotas</strong> — Estado Táchira, Venezuela. Base Central: <strong>Táriba</strong>.
          </span>
          <span className="text-slate-500">
            Motor de Tarifas Adaptativo v2.5 • {totalRutasRegistradas} Rutas + {estadoAprendizaje.lecciones.length} Lecciones Aprendidas
          </span>
        </div>
      </footer>
    </div>
  )
}
