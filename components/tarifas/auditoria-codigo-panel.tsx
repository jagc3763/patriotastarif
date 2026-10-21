'use client'

import React, { useState } from 'react'
import {
  Bug,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  FileCode2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'

interface AuditoriaCodigoPanelProps {
  onProbarCaso: (origen: string, destino: string) => void
}

export function AuditoriaCodigoPanel({ onProbarCaso }: AuditoriaCodigoPanelProps) {
  const [copiadoPy, setCopiadoPy] = useState(false)

  const hallazgosCriticos = [
    {
      id: 'bug-1',
      titulo: '1. Colisión de Subcadena en "Rubio" vs "Berlin Via Rubio" (Pérdida de 30.000 COP por viaje)',
      archivo: 'calculador_inteligente.py (líneas 54-57) / verificador_tarifas.html (líneas 583-588)',
      problema:
        'En buscar_precio_desde_tariba(), el ciclo recorre db["rutas_base"] en orden alfabético haciendo `if dest in q or q in dest`. Cuando el usuario consulta "Rubio", la cadena "rubio" está contenida dentro de "berlin via rubio" (base_24 = 40.000 COP), que aparece antes que "Rubio" (base_115 = 70.000 COP). Por eso cobraba 40.000 COP en vez de 70.000 COP.',
      solucion:
        'Se implementó un algoritmo de ranking por especificidad (Coincidencia Exacta [1000 pts] > Frase Completa [700 pts] > Inicio de Palabra [600 pts] > Modificador "Vía" [250 pts]). Ahora "Táriba → Rubio" cobra exactamente 70.000 COP y "Patiecitos → Rubio" cobra 12.000 + 70.000 = 82.000 COP.',
      origenPrueba: 'Patiecitos',
      destinoPrueba: 'Rubio',
      antes: '52.000 COP (Tomaba Berlin Via Rubio = 40k)',
      ahora: '82.000 COP (Patiecitos 12k + Rubio 70k Oficial)',
    },
    {
      id: 'bug-2',
      titulo: '2. Ruptura de Combinaciones con Doble Barra "/" en el JSON ("Capachito P/B/Centro")',
      archivo: 'tarifas_tachira.json (comb_25, comb_26, comb_52)',
      problema:
        'Al exportar del Excel, las rutas que llevaban "P/B" (Parte Baja) o "P/A" (Parte Alta) tenían dos barras "/". El script que generó el JSON dividió por la primera barra dejando `origen: "Capachito P"` y `destino: "B"` o `destino: "A"`. Como el buscador hacía `c_dest in d_low`, cualquier destino que tuviera la letra "a" o "b" activaba esa combinación por error.',
      solucion:
        'Se saneó automáticamente el catálogo unificando "Capachito P/B → Centro" (25.000 COP), "Capachito P/A → Concordia" (35.000 COP) y "Margaritas P/A → Concordia" (25.000 COP), exigiendo coincidencia de palabras completas.',
      origenPrueba: 'Capachito P/B',
      destinoPrueba: 'Centro',
      antes: 'No reconocía "Centro" (buscaba destino = "B")',
      ahora: '25.000 COP (Combinación Pactada Oficial)',
    },
    {
      id: 'bug-3',
      titulo: '3. Error Tipográfico en "LA TENDIDA" (19.000 COP en lugar de 190.000 COP) y "LAGUNILLAS MERIDA" null',
      archivo: 'tarifas_tachira.json (largo_47 y largo_48)',
      problema:
        'En `viajes_largos`, el destino "LA TENDIDA" tiene `usd: 50.0`, pero en `cop` tenía `19000` (faltaba un cero respecto a 50 × 3800 = 190.000 COP). Además, "LAGUNILLAS MERIDA" tenía `usd: 120.0` y `cop: null`.',
      solucion:
        'El motor sanea ambos registros al cargar la base de datos: corrige LA TENDIDA a 190.000 COP y calcula automáticamente LAGUNILLAS MERIDA en 456.000 COP ($120 USD).',
      origenPrueba: 'Táriba',
      destinoPrueba: 'LA TENDIDA',
      antes: '19.000 COP ($5.00 USD — pérdida del 90%)',
      ahora: '190.000 COP ($50.00 USD Oficial)',
    },
    {
      id: 'bug-4',
      titulo: '4. Bug Visual "~undefined km" en la Tarjeta de Resultados del HTML',
      archivo: 'verificador_tarifas.html (línea 747)',
      problema:
        'En `mostrarTarifaFinal(data)` se asignaba `document.getElementById("badgeKm").textContent = "~" + data.km + " km"`, pero `procesarCalculoLibre()` jamás enviaba la propiedad `km` dentro del objeto `data`, mostrando siempre `~undefined km`.',
      solucion:
        'El motor geocodifica siempre tanto el origen como el destino en los sectores de Táchira y calcula la distancia vial Haversine con factor de curvas andinas (×1.38) y el tiempo estimado en minutos.',
      origenPrueba: 'Táriba',
      destinoPrueba: 'Pueblo Nuevo',
      antes: '~undefined km',
      ahora: '~4.3 km (~10 min)',
    },
  ]

  const codigoPythonCorregido = `"""
Motor Predictivo y Algoritmo Inteligente de Tarifas - Estado Táchira (VERSIÓN CORREGIDA)
Modelo Radial de Despacho desde Táriba (Línea Los Patriotas)
"""

import json
import os
import re
import unicodedata

JSON_PATH = os.path.join(os.path.dirname(__file__), 'tarifas_tachira.json')

def normalizar(texto: str) -> str:
    if not texto:
        return ""
    s = "".join(
        c for c in unicodedata.normalize("NFD", texto.lower().strip())
        if unicodedata.category(c) != "Mn"
    )
    s = re.sub(r"\\bb\\.?\\s*obrero\\b", "barrio obrero", s)
    s = re.sub(r"\\bp\\.?\\s*nuevo\\b", "pueblo nuevo", s)
    s = re.sub(r"\\bb\\.?\\s*sucre\\b", "barrio sucre", s)
    s = re.sub(r"\\bb\\.?\\s*libertador\\b", "barrio libertador", s)
    return re.sub(r"\\s+", " ", s)

def cargar_db_saneada():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        db = json.load(f)

    # Reparar combinaciones con doble barra '/' (P/A y P/B)
    for c in db.get('combinaciones', []):
        if c['raw'] == 'Capachito P/B/Centro':
            c['origen'], c['destino'] = 'Capachito P/B', 'Centro'
        elif c['raw'] == 'Capachito P/A/Concordia':
            c['origen'], c['destino'] = 'Capachito P/A', 'Concordia'
        elif c['raw'] == 'Margaritas P/A/Concordia':
            c['origen'], c['destino'] = 'Margaritas P/A', 'Concordia'

    # Reparar errores de tipeo en viajes largos
    for l in db.get('viajes_largos', []):
        if l['destino'] == 'LA TENDIDA' and l['usd'] == 50.0 and l['cop'] == 19000:
            l['cop'] = 190000
        elif l['destino'] == 'LAGUNILLAS MERIDA' and l['cop'] is None:
            l['cop'] = int(l['usd'] * 3800)

    return db

def puntaje_coincidencia(query_usuario: str, nombre_catalogo: str) -> int:
    q = normalizar(query_usuario)
    target = normalizar(nombre_catalogo)
    if not q or not target:
        return 0
    if q == target:
        return 1000
    if re.search(rf"(^|\\s){re.escape(target)}($|\\s)", q):
        return 700 + len(target) * 5
    if re.search(rf"(^|\\s){re.escape(q)}($|\\s)", target):
        if f"via {q}" in target:
            return 250  # Evita que 'Rubio' prefiera 'Berlin Via Rubio'
        return 600 - (len(target) - len(q)) if target.startswith(q) else 450 - (len(target) - len(q))
    return 0
`

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoPythonCorregido)
    setCopiadoPy(true)
    setTimeout(() => setCopiadoPy(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* RESUMEN DE AUDITORÍA */}
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Auditoría Técnica de tus Archivos (.py, .json y .html)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Analizamos línea por línea <code className="text-amber-300">calculador_inteligente.py</code>,{' '}
              <code className="text-amber-300">tarifas_tachira.json</code>,{' '}
              <code className="text-amber-300">verificador_cli.py</code> y{' '}
              <code className="text-amber-300">verificador_tarifas.html</code>. Encontramos y corregimos automáticamente <strong>4 errores ocultos</strong> que afectaban el cobro en ciertas rutas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hallazgosCriticos.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                    {h.archivo}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Corregido
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{h.titulo}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-200">Causa:</strong> {h.problema}
                </p>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  <strong className="text-emerald-400">Solución aplicada:</strong> {h.solucion}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-rose-950/30 border border-rose-500/20 p-2">
                    <span className="text-rose-400 font-bold block">Antes (Con Bug):</span>
                    <span className="text-slate-300">{h.antes}</span>
                  </div>
                  <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-2">
                    <span className="text-emerald-400 font-bold block">Ahora (Corregido):</span>
                    <span className="text-white font-semibold">{h.ahora}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onProbarCaso(h.origenPrueba, h.destinoPrueba)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 py-1.5 text-xs font-semibold text-amber-400 transition-colors"
                >
                  <span>
                    Probar en el Cotizador: {h.origenPrueba} → {h.destinoPrueba}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PARCHE PYTHON Y ENDPOINT API */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Parche de Precisión para tu <code className="text-amber-300">calculador_inteligente.py</code>
              </h3>
            </div>
            <button
              type="button"
              onClick={copiarCodigo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300 transition-colors"
            >
              {copiadoPy ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiar Python
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-slate-950 border border-slate-800 p-4 text-[11px] font-mono text-slate-300 leading-relaxed max-h-80">
            <code>{codigoPythonCorregido}</code>
          </pre>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                API REST Activa en este Proyecto
              </h3>
              <p className="text-[11px] text-slate-400">
                Lista para consumir desde el Bot de WhatsApp o Apps Flutter
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1.5">
              <span className="inline-block rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-mono text-[10px] font-bold">
                GET /api/tarifas/calcular
              </span>
              <p className="text-slate-400 text-[11px]">
                Consulta rápida por URL para el Bot de WhatsApp o pruebas:
              </p>
              <code className="block rounded bg-slate-900 p-2 font-mono text-[11px] text-amber-300 break-all">
                /api/tarifas/calcular?origen=Junco%2046&destino=Barrio%20Sucre&nocturno=false
              </code>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1.5">
              <span className="inline-block rounded bg-amber-500/20 text-amber-400 px-2 py-0.5 font-mono text-[10px] font-bold">
                POST /api/tarifas/calcular
              </span>
              <p className="text-slate-400 text-[11px]">
                Cálculo completo enviando parámetros personalizados y recargos:
              </p>
              <pre className="rounded bg-slate-900 p-2 font-mono text-[10px] text-slate-300 overflow-x-auto">
{`{
  "origen": "Las Vegas P6",
  "destino": "Barrio Obrero",
  "opciones": {
    "nocturno": true,
    "lluvia": false,
    "paradasExtra": 1
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
