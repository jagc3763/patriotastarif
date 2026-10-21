'use client'

import React from 'react'
import {
  ParametrosMotorTarifas,
  ResultadoCalculoTarifa,
} from '@/lib/tarifas/types'
import { PARAMETROS_DEFAULT } from '@/lib/tarifas/engine'
import {
  Sliders,
  RotateCcw,
  Mountain,
  MapPin,
  Route,
  ShieldCheck,
  Percent,
  Coins,
  CheckCircle2,
} from 'lucide-react'

interface ReglasParametrosPanelProps {
  parametros: ParametrosMotorTarifas
  onChangeParametros: (nuevos: ParametrosMotorTarifas) => void
  resultadoActual: ResultadoCalculoTarifa
}

export function ReglasParametrosPanel({
  parametros,
  onChangeParametros,
  resultadoActual,
}: ReglasParametrosPanelProps) {
  const actualizarCampo = <K extends keyof ParametrosMotorTarifas>(
    clave: K,
    valor: ParametrosMotorTarifas[K]
  ) => {
    onChangeParametros({
      ...parametros,
      [clave]: valor,
    })
  }

  const restaurarDefaults = () => {
    onChangeParametros(PARAMETROS_DEFAULT)
  }

  const pasosJerarquia = [
    {
      orden: 1,
      codigo: 'OFICIAL_DESDE_TARIBA',
      codigosGrupo: ['OFICIAL_DESDE_TARIBA', 'OFICIAL_HACIA_TARIBA', 'VIAJE_LARGO_OFICIAL'],
      titulo: 'Regla 1: Ruta Directa Oficial con Base Táriba (Hoja 6 y Hoja 4)',
      descripcion:
        'Si el punto de partida o de llegada es Táriba (Base Central), consulta directamente los 141 sectores de la Hoja 6 o los 75 destinos nacionales de la Hoja 4. No suma costo de recogida en Tramo 1.',
      formula: 'Tarifa = PrecioOficial(Táriba ↔ Sector)',
    },
    {
      orden: 2,
      codigo: 'COMBINACION_PACTADA',
      codigosGrupo: ['COMBINACION_PACTADA'],
      titulo: 'Regla 2: Combinación Directa Pactada con "/" en Tarifario (Hoja 6)',
      descripcion:
        'Si ni el origen ni el destino son Táriba, verifica primero si el par (Origen / Destino) existe en las 54 combinaciones especiales pactadas (ej. "Arjona 46/Centro" = 20.000 COP, "Las Vegas P6/B.Obrero" = 20.000 COP).',
      formula: 'Tarifa = PrecioCombinacionOficial(Origen ⇄ Destino)',
    },
    {
      orden: 3,
      codigo: 'DESPACHO_RADIAL_MATRIZ',
      codigosGrupo: ['DESPACHO_RADIAL_MATRIZ'],
      titulo: 'Regla 3: Modelo Radial de Despacho desde Base Táriba (Tramo 1 + Tramo 2)',
      descripcion:
        'Para rutas cruzadas no listadas (ej. "Junco 46" → "Barrio Sucre"), el taxi sale de la Base Táriba a buscar al pasajero en [Origen] (Tramo 1) y realiza el traslado hacia [Destino] (Tramo 2).',
      formula: `Tarifa = (Tramo1_Táriba→Origen × ${Math.round(parametros.factorRecogidaRadial * 100)}%) + Tramo2_Táriba→Destino`,
    },
    {
      orden: 4,
      codigo: 'ESTIMACION_TOPOGRAFICA_KM',
      codigosGrupo: ['ESTIMACION_TOPOGRAFICA_KM'],
      titulo: 'Regla 4: Estimación Topográfica por Kilometraje y Pendiente Andina',
      descripcion:
        'Cuando un sector no figura en el Excel, calcula la distancia Haversine multiplicada por el factor de curvas andinas y aplica la tarifa por kilómetro según la exigencia mecánica (Urbano, Troncal, Montaña o Frontera).',
      formula: `Tarifa = Base(${parametros.tarifaMinimaBaseCop.toLocaleString('es-CO')}) + max(0, Km - ${parametros.kmIncluidosBase}) × CostoKmTopografía`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* ÁRBOL DE DECISIÓN DE LAS 4 REGLAS PREDEFINIDAS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-400/20 mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Arquitectura de Reglas de Negocio
            </span>
            <h2 className="text-lg font-bold text-white">
              Jerarquía de Evaluación del Motor de Tarifas (Táriba First)
            </h2>
            <p className="text-xs text-slate-400">
              El algoritmo evalúa secuencialmente estas 4 reglas predefinidas. La regla activa en tu cotización actual aparece resaltada en verde/ámbar.
            </p>
          </div>
          <button
            type="button"
            onClick={restaurarDefaults}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            Restaurar Valores Calibrados
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pasosJerarquia.map((paso) => {
            const estaActiva = paso.codigosGrupo.includes(resultadoActual.reglaAplicada)
            return (
              <div
                key={paso.codigo}
                className={`rounded-xl border p-4 transition-all ${
                  estaActiva
                    ? 'border-amber-400/60 bg-amber-400/10 shadow-lg shadow-amber-500/5'
                    : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                      estaActiva
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Prioridad #{paso.orden}
                  </span>
                  {estaActiva && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Activa en cotización actual
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{paso.titulo}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {paso.descripcion}
                </p>
                <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-3 py-2 font-mono text-[11px] text-amber-300">
                  {paso.formula}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PARÁMETROS CALIBRADOS EDITABLES EN TIEMPO REAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA 1: PARÁMETROS BASE Y DESPACHO RADIAL */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Route className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Banderazo y Despacho Radial</h3>
              <p className="text-[11px] text-slate-400">Arranque en Táriba y factor de recogida</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tarifa Mínima / Banderazo Base (COP)
              </label>
              <input
                type="number"
                step={500}
                value={parametros.tarifaMinimaBaseCop}
                onChange={(e) =>
                  actualizarCampo('tarifaMinimaBaseCop', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-amber-400 focus:border-amber-400 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">
                Valor en Python: 10.000 COP (hasta 2.5 km en Táriba / Las Vegas / Margaritas)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kilómetros Incluidos en Banderazo (km)
              </label>
              <input
                type="number"
                step={0.5}
                value={parametros.kmIncluidosBase}
                onChange={(e) =>
                  actualizarCampo('kmIncluidosBase', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Factor de Cobro de Tramo 1 en Despacho Radial ({Math.round(parametros.factorRecogidaRadial * 100)}%)
              </label>
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.05}
                value={parametros.factorRecogidaRadial}
                onChange={(e) =>
                  actualizarCampo('factorRecogidaRadial', Number(e.target.value))
                }
                className="w-full accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>50% (Unidad cercana)</span>
                <span className="font-bold text-amber-400">
                  {Math.round(parametros.factorRecogidaRadial * 100)}% del Tramo 1
                </span>
                <span>100% (Sale de Táriba)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Redondeo Comercial Tachirense
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Ajusta recargos y estimaciones a múltiplos de 1.000 / 5.000 COP
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={parametros.aplicarRedondeoComercial}
                  onChange={(e) =>
                    actualizarCampo('aplicarRedondeoComercial', e.target.checked)
                  }
                  className="h-4 w-4 rounded accent-amber-400"
                />
              </label>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: COSTOS POR KM SEGÚN TOPOGRAFÍA ANDINA */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
              <Mountain className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tarifas por Km según Topografía</h3>
              <p className="text-[11px] text-slate-400">Calibradas en calculador_inteligente.py</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Costo Km Urbano (COP/km)</span>
                <span className="text-slate-500">SC, Táriba, Palmira</span>
              </label>
              <input
                type="number"
                step={100}
                value={parametros.costoKmUrbano}
                onChange={(e) =>
                  actualizarCampo('costoKmUrbano', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-bold text-emerald-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Costo Km Troncal (COP/km)</span>
                <span className="text-slate-500">El Corozo, Cordero, Rubio</span>
              </label>
              <input
                type="number"
                step={100}
                value={parametros.costoKmTroncal}
                onChange={(e) =>
                  actualizarCampo('costoKmTroncal', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-bold text-sky-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Costo Km Montaña (COP/km)</span>
                <span className="text-slate-500">Capacho, El Junco, Zorca</span>
              </label>
              <input
                type="number"
                step={100}
                value={parametros.costoKmMontana}
                onChange={(e) =>
                  actualizarCampo('costoKmMontana', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-bold text-purple-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Costo Km Frontera (COP/km)</span>
                <span className="text-slate-500">San Antonio, Ureña</span>
              </label>
              <input
                type="number"
                step={100}
                value={parametros.costoKmFrontera}
                onChange={(e) =>
                  actualizarCampo('costoKmFrontera', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-bold text-rose-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Factor de Curvas Andinas</span>
                <span className="text-amber-400 font-bold">×{parametros.factorCurvasAndinas}</span>
              </label>
              <input
                type="number"
                step={0.02}
                value={parametros.factorCurvasAndinas}
                onChange={(e) =>
                  actualizarCampo('factorCurvasAndinas', Number(e.target.value) || 1)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* COLUMNA 3: RECARGOS Y PARADAS ADICIONALES */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-400/10 text-purple-400 border border-purple-400/20">
              <Percent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Porcentajes de Recargo y Extras</h3>
              <p className="text-[11px] text-slate-400">Horario nocturno, clima, feriados y esperas</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nocturno (%)
                </label>
                <input
                  type="number"
                  value={parametros.recargoNocturnoPct}
                  onChange={(e) =>
                    actualizarCampo('recargoNocturnoPct', Number(e.target.value) || 0)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-center text-sm font-bold text-amber-400 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Lluvia (%)
                </label>
                <input
                  type="number"
                  value={parametros.recargoLluviaPct}
                  onChange={(e) =>
                    actualizarCampo('recargoLluviaPct', Number(e.target.value) || 0)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-center text-sm font-bold text-sky-400 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Feriado (%)
                </label>
                <input
                  type="number"
                  value={parametros.recargoFeriadoPct}
                  onChange={(e) =>
                    actualizarCampo('recargoFeriadoPct', Number(e.target.value) || 0)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-center text-sm font-bold text-purple-400 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Costo por Parada Adicional en Ruta (COP)
              </label>
              <input
                type="number"
                step={1000}
                value={parametros.costoParadaExtraCop}
                onChange={(e) =>
                  actualizarCampo('costoParadaExtraCop', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Costo por Minuto de Espera Solicitud Pasajero (COP/min)
              </label>
              <input
                type="number"
                step={100}
                value={parametros.costoMinutoEsperaCop}
                onChange={(e) =>
                  actualizarCampo('costoMinutoEsperaCop', Number(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
