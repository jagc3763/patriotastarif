'use client'

import React, { useState, useMemo } from 'react'
import {
  TarifasTachiraDB,
  ParametrosMotorTarifas,
} from '@/lib/tarifas/types'
import {
  Search,
  Plane,
  Table2,
  Plus,
  ArrowRight,
  Printer,
  Filter,
} from 'lucide-react'

interface CatalogoMatrizPanelProps {
  db: TarifasTachiraDB
  parametros: ParametrosMotorTarifas
  onProbarRuta: (origen: string, destino: string) => void
  onAgregarRutaCustom: (nueva: {
    categoria: 'base' | 'combinacion' | 'largo'
    origen: string
    destino: string
    cop: number
    usd?: number
  }) => void
  onEntrenarRutaDesdeCatalogo?: (origen: string, destino: string, nuevoCop: number) => void
}

export function CatalogoMatrizPanel({
  db,
  parametros,
  onProbarRuta,
  onAgregarRutaCustom,
  onEntrenarRutaDesdeCatalogo,
}: CatalogoMatrizPanelProps) {
  const [subTab, setSubTab] = useState<'matriz' | 'largos' | 'agregar'>('matriz')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'base' | 'combinacion' | 'largo'>('todos')
  const [idFilaEditando, setIdFilaEditando] = useState<string | null>(null)
  const [copEditando, setCopEditando] = useState<number>(20000)

  const [nuevaCat, setNuevaCat] = useState<'base' | 'combinacion' | 'largo'>('base')
  const [nuevoOrigen, setNuevoOrigen] = useState('Táriba')
  const [nuevoDestino, setNuevoDestino] = useState('')
  const [nuevoCop, setNuevoCop] = useState(20000)
  const [nuevoUsd, setNuevoUsd] = useState(5.26)
  const [mensajeGuardado, setMensajeGuardado] = useState('')

  const itemsUnificados = useMemo(() => {
    const lista: {
      id: string
      origen: string
      destino: string
      tipoCodigo: 'base' | 'combinacion' | 'largo'
      tipoLabel: string
      valorRaw: string
      cop: number
      usd: number
      bcv: number
    }[] = []

    for (const r of db.rutas_base) {
      const usd = r.cop / parametros.tasaCopPorUsd
      lista.push({
        id: r.id,
        origen: 'Táriba',
        destino: r.destino,
        tipoCodigo: 'base',
        tipoLabel: 'Ruta Base Táriba (Hoja 6)',
        valorRaw: `${r.cop_raw}k`,
        cop: r.cop,
        usd,
        bcv: usd * parametros.tasaBcvPorUsd,
      })
    }

    for (const c of db.combinaciones) {
      const usd = c.cop / parametros.tasaCopPorUsd
      lista.push({
        id: c.id,
        origen: c.origen,
        destino: c.destino,
        tipoCodigo: 'combinacion',
        tipoLabel: 'Combinación "/" (Hoja 6)',
        valorRaw: `${c.cop_raw}k`,
        cop: c.cop,
        usd,
        bcv: usd * parametros.tasaBcvPorUsd,
      })
    }

    for (const l of db.viajes_largos) {
      const cop = l.cop ?? Math.round((l.usd ?? 0) * parametros.tasaCopPorUsd)
      const usd = l.usd ?? cop / parametros.tasaCopPorUsd
      lista.push({
        id: l.id,
        origen: 'Táriba',
        destino: l.destino,
        tipoCodigo: 'largo',
        tipoLabel: 'Viaje Largo (Hoja 4)',
        valorRaw: l.usd ? `$${l.usd}` : `${cop / 1000}k`,
        cop,
        usd,
        bcv: usd * parametros.tasaBcvPorUsd,
      })
    }

    return lista
  }, [db, parametros.tasaCopPorUsd, parametros.tasaBcvPorUsd])

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return itemsUnificados.filter((it) => {
      if (filtroTipo !== 'todos' && it.tipoCodigo !== filtroTipo) return false
      if (!q) return true
      return (
        it.origen.toLowerCase().includes(q) ||
        it.destino.toLowerCase().includes(q) ||
        it.tipoLabel.toLowerCase().includes(q)
      )
    })
  }, [itemsUnificados, busqueda, filtroTipo])

  const viajesLargosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return db.viajes_largos.filter((v) =>
      v.destino.toLowerCase().includes(q)
    )
  }, [db.viajes_largos, busqueda])

  const manejarSubmitNueva = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoDestino.trim()) return

    onAgregarRutaCustom({
      categoria: nuevaCat,
      origen: nuevaCat === 'combinacion' ? nuevoOrigen.trim() : 'Táriba',
      destino: nuevoDestino.trim(),
      cop: Number(nuevoCop),
      usd: nuevaCat === 'largo' ? Number(nuevoUsd) : undefined,
    })

    setMensajeGuardado(
      `Regla agregada: ${nuevaCat === 'combinacion' ? nuevoOrigen : 'Táriba'} → ${nuevoDestino} (${Number(nuevoCop).toLocaleString('es-CO')} COP)`
    )
    setNuevoDestino('')
    setTimeout(() => setMensajeGuardado(''), 4000)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('matriz')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              subTab === 'matriz'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Table2 className="h-4 w-4" />
            <span>Matriz Oficial Completa ({itemsUnificados.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('largos')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              subTab === 'largos'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plane className="h-4 w-4" />
            <span>Tarjetas de Viajes Largos ({db.viajes_largos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('agregar')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              subTab === 'agregar'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Nueva Tarifa / Regla</span>
          </button>
        </div>

        {subTab !== 'agregar' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar sector o ciudad..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        )}
      </div>

      {subTab === 'matriz' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-semibold">
                <Filter className="h-3.5 w-3.5 text-amber-400" /> Filtrar por hoja:
              </span>
              {(
                [
                  { id: 'todos', label: `Todas (${itemsUnificados.length})` },
                  { id: 'base', label: `Base Táriba (${db.rutas_base.length})` },
                  { id: 'combinacion', label: `Combinaciones "/" (${db.combinaciones.length})` },
                  { id: 'largo', label: `Viajes Largos (${db.viajes_largos.length})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroTipo(f.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    filtroTipo === f.id
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">
              Mostrando <strong>{itemsFiltrados.length}</strong> rutas
            </span>
          </div>

          <div className="overflow-x-auto max-h-[540px] rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-950/95 text-slate-400 uppercase font-semibold border-b border-slate-800 backdrop-blur-sm">
                <tr>
                  <th className="py-3 px-4">Punto de Partida</th>
                  <th className="py-3 px-4">Punto de Llegada</th>
                  <th className="py-3 px-4">Categoría Excel</th>
                  <th className="py-3 px-4 text-right">Pesos (COP)</th>
                  <th className="py-3 px-4 text-right">Dólares (USD)</th>
                  <th className="py-3 px-4 text-right">Bolívares (BCV)</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {itemsFiltrados.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-bold text-amber-400">
                      {item.origen}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-white">
                      {item.destino}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          item.tipoCodigo === 'base'
                            ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                            : item.tipoCodigo === 'combinacion'
                            ? 'bg-sky-400/10 text-sky-300 border border-sky-400/20'
                            : 'bg-purple-400/10 text-purple-300 border border-purple-400/20'
                        }`}
                      >
                        {item.tipoLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-white">
                      {idFilaEditando === item.id ? (
                        <input
                          type="number"
                          step={1000}
                          min={5000}
                          value={copEditando}
                          onChange={(e) =>
                            setCopEditando(Number(e.target.value) || 0)
                          }
                          className="w-28 rounded-lg border border-amber-400 bg-slate-950 px-2 py-1 text-right text-xs font-black text-amber-400 focus:outline-none"
                        />
                      ) : (
                        `${item.cop.toLocaleString('es-CO')} COP`
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-300">
                      ${item.usd.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                      Bs. {item.bcv.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {idFilaEditando === item.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onEntrenarRutaDesdeCatalogo?.(
                                item.origen,
                                item.destino,
                                copEditando
                              )
                              setIdFilaEditando(null)
                            }}
                            className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-slate-950"
                          >
                            Entrenar
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdFilaEditando(null)}
                            className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-300"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          {onEntrenarRutaDesdeCatalogo && (
                            <button
                              type="button"
                              onClick={() => {
                                setIdFilaEditando(item.id)
                                setCopEditando(item.cop)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 px-2 py-1 text-[11px] font-bold text-emerald-300 transition-colors"
                            >
                              <span>Modificar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onProbarRuta(item.origen, item.destino)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 px-2.5 py-1 text-[11px] font-bold text-amber-400 transition-colors"
                          >
                            <span>Cotizar</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'largos' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {viajesLargosFiltrados.map((v) => {
              const cop =
                v.cop ?? Math.round((v.usd ?? 0) * parametros.tasaCopPorUsd)
              const usd = v.usd ?? Number((cop / parametros.tasaCopPorUsd).toFixed(2))
              const bcv = Number((usd * parametros.tasaBcvPorUsd).toFixed(2))

              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 hover:border-amber-400/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-bold text-amber-400">Táriba (Base)</span>
                      <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <h3 className="text-base font-black text-white mb-3">
                      {v.destino}
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">DÓLARES:</span>
                        <span className="text-lg font-black text-amber-300">
                          ${usd}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">PESOS (COP):</span>
                        <span className="text-sm font-bold text-white">
                          {cop.toLocaleString('es-CO')} COP
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Bs. {bcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => onProbarRuta('Táriba', v.destino)}
                        className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                      >
                        Cotizar <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {subTab === 'agregar' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 max-w-2xl">
          <h3 className="text-base font-bold text-white mb-1">
            Agregar Nueva Tarifa Oficial o Combinación Pactada
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Agrega un nuevo sector desde Táriba, una combinación directa con &quot;/&quot; o un viaje largo para probarlo inmediatamente en el motor de cálculo.
          </p>

          <form onSubmit={manejarSubmitNueva} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Regla en el Tarifario
              </label>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                {(
                  [
                    { id: 'base', label: 'Ruta Base Táriba (Hoja 6)' },
                    { id: 'combinacion', label: 'Combinación "/" (Hoja 6)' },
                    { id: 'largo', label: 'Viaje Largo (Hoja 4)' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setNuevaCat(t.id)
                      if (t.id !== 'combinacion') setNuevoOrigen('Táriba')
                    }}
                    className={`rounded-xl border p-2.5 font-bold transition-all ${
                      nuevaCat === t.id
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sector de Partida (Origen)
                </label>
                <input
                  type="text"
                  disabled={nuevaCat !== 'combinacion'}
                  value={nuevaCat === 'combinacion' ? nuevoOrigen : 'Táriba'}
                  onChange={(e) => setNuevoOrigen(e.target.value)}
                  placeholder="Ej. Las Vegas P6, Sabaneta..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white disabled:opacity-60 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sector o Ciudad de Llegada (Destino)
                </label>
                <input
                  type="text"
                  required
                  value={nuevoDestino}
                  onChange={(e) => setNuevoDestino(e.target.value)}
                  placeholder="Ej. Residencias Las Acacias, El Piñal..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tarifa Oficial en Pesos (COP)
                </label>
                <input
                  type="number"
                  step={1000}
                  required
                  value={nuevoCop}
                  onChange={(e) => {
                    const copVal = Number(e.target.value) || 0
                    setNuevoCop(copVal)
                    setNuevoUsd(Number((copVal / parametros.tasaCopPorUsd).toFixed(2)))
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-amber-400 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Equivalente en Dólares (USD)
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={nuevoUsd}
                  onChange={(e) => {
                    const usdVal = Number(e.target.value) || 0
                    setNuevoUsd(usdVal)
                    setNuevoCop(Math.round(usdVal * parametros.tasaCopPorUsd))
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-emerald-400 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {mensajeGuardado && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
                {mensajeGuardado}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              Guardar Regla en el Catálogo Activo
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
