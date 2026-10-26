import {
  calcularTarifaPatriotas,
  detectarCoordenadasYTopografia,
  normalizarTextoTachira,
  OPCIONES_VIAJE_DEFAULT,
  PARAMETROS_DEFAULT,
  redondearTarifaTachira,
} from './engine'
import { distanciaHaversineKm } from './geografia-tachira'
import {
  AnclaAprendidaItem,
  EjemploRutaImpactada,
  EstadoAprendizajeMotor,
  LeccionEntrenamiento,
  ModoAprendizajeTarifa,
  OpcionesViaje,
  ParametrosMotorTarifas,
  ResultadoCalculoTarifa,
  TarifasTachiraDB,
  TopografiaTachira,
} from './types'

export const ESTADO_APRENDIZAJE_INICIAL: EstadoAprendizajeMotor = {
  tasaAprendizajeAlpha: 0.45,
  lecciones: [],
  anclasAprendidas: [],
  factoresZonales: {
    urbano: 1.0,
    troncal: 1.0,
    montana: 1.0,
    frontera: 1.0,
  },
}

export const CASOS_BENCHMARK_APRENDIZAJE: Array<{
  origen: string
  destino: string
  descripcionZona: string
}> = [
  {
    origen: 'Táriba',
    destino: 'Santa Teresa',
    descripcionZona: 'Punto no contemplado · Eje Urbano San Cristóbal Norte',
  },
  {
    origen: 'Táriba',
    destino: 'Av. Ferrero Tamayo',
    descripcionZona: 'Punto no contemplado · Eje Urbano Pirineos / Pueblo Nuevo',
  },
  {
    origen: 'Táriba',
    destino: 'Loma de Pío',
    descripcionZona: 'Punto no contemplado · Eje Montaña Cárdenas / Cordero',
  },
  {
    origen: 'Barrio Obrero',
    destino: 'Pueblo Nuevo',
    descripcionZona: 'Despacho Radial (Recogida Tramo 1 + Traslado Tramo 2)',
  },
  {
    origen: 'Palmira',
    destino: 'Centro 5ta/7ma',
    descripcionZona: 'Despacho Radial Troncal → Urbano',
  },
  {
    origen: 'Táriba',
    destino: 'Zorca San Isidro',
    descripcionZona: 'Punto no contemplado · Eje Troncal / Valle de Zorca',
  },
  {
    origen: 'Táriba',
    destino: 'El Palotal (Vía San Antonio)',
    descripcionZona: 'Punto no contemplado · Eje Frontera Bolívar',
  },
  {
    origen: 'Sambil',
    destino: 'Hospital Central',
    descripcionZona: 'Despacho Radial Urbano San Cristóbal',
  },
]

function esTextoTariba(texto: string): boolean {
  const n = normalizarTextoTachira(texto)
  return (
    n === 'tariba' ||
    n === 'tariba (base central)' ||
    n === 'base tariba' ||
    n === 'base central' ||
    n === 'plaza bolivar de tariba'
  )
}

function obtenerNombreCampoCostoKm(
  topo: TopografiaTachira
):
  | 'costoKmUrbano'
  | 'costoKmTroncal'
  | 'costoKmMontana'
  | 'costoKmFrontera' {
  switch (topo) {
    case 'frontera':
      return 'costoKmFrontera'
    case 'montana':
      return 'costoKmMontana'
    case 'troncal':
      return 'costoKmTroncal'
    default:
      return 'costoKmUrbano'
  }
}

export interface ResultadoEntrenamientoEjecutado {
  nuevoDb: TarifasTachiraDB
  nuevosParametros: ParametrosMotorTarifas
  nuevoEstadoAprendizaje: EstadoAprendizajeMotor
  leccion: LeccionEntrenamiento
  ejemplosImpactados: EjemploRutaImpactada[]
}

/**
 * Calcula y ejecuta (o previsualiza sin mutar el estado original) el aprendizaje
 * cuando el usuario modifica el precio de una ruta en el cotizador o matriz.
 */
export function procesarEntrenamientoTarifa(params: {
  resultadoActual: ResultadoCalculoTarifa
  nuevoTotalCop: number
  parametrosActuales: ParametrosMotorTarifas
  opcionesActuales?: OpcionesViaje
  dbActual: TarifasTachiraDB
  estadoAprendizajeActual: EstadoAprendizajeMotor
  modoAprendizaje: ModoAprendizajeTarifa
  propagarCorredorVecino: boolean
}): ResultadoEntrenamientoEjecutado {
  const {
    resultadoActual,
    nuevoTotalCop,
    parametrosActuales,
    opcionesActuales = OPCIONES_VIAJE_DEFAULT,
    dbActual,
    estadoAprendizajeActual,
    modoAprendizaje,
    propagarCorredorVecino,
  } = params

  const alpha = Math.min(
    0.9,
    Math.max(0.1, estadoAprendizajeActual.tasaAprendizajeAlpha || 0.45)
  )

  // 1. Despejar el subtotal base objetivo (descontando recargos nocturnos/lluvia/feriado y extras si están activos)
  const factorRecargo = 1 + (resultadoActual.porcentajeRecargoTotal || 0) / 100
  const subtotalEntrenadoSinRedondear = Math.max(
    5000,
    Math.round(
      (nuevoTotalCop - (resultadoActual.montoExtrasCop || 0)) / factorRecargo
    )
  )
  const subtotalEntrenadoCop =
    Math.round(subtotalEntrenadoSinRedondear / 1000) * 1000

  const subtotalAnteriorCop = Math.max(1000, resultadoActual.subtotalBaseCop)
  const ratioCambio = subtotalEntrenadoCop / subtotalAnteriorCop
  const deltaCop = nuevoTotalCop - resultadoActual.totalCop
  const deltaPorcentaje = Number(
    (((nuevoTotalCop - resultadoActual.totalCop) /
      Math.max(1, resultadoActual.totalCop)) *
      100).toFixed(1)
  )

  // Clonar estructuras para producir el nuevo estado entrenado
  const nuevoDb: TarifasTachiraDB = {
    ...dbActual,
    rutas_base: [...dbActual.rutas_base],
    combinaciones: [...dbActual.combinaciones],
    viajes_largos: [...dbActual.viajes_largos],
  }

  const nuevosParametros: ParametrosMotorTarifas = { ...parametrosActuales }
  const nuevasAnclas: AnclaAprendidaItem[] = [
    ...estadoAprendizajeActual.anclasAprendidas,
  ]
  const nuevosFactoresZonales: Record<TopografiaTachira, number> = {
    ...estadoAprendizajeActual.factoresZonales,
  }

  const resumenAprendizaje: string[] = []
  let parametroModificado: string | undefined
  let valorAnterior: number | undefined
  let valorNuevo: number | undefined
  let anclaActualizada: string | undefined
  let rutasVecinasActualizadas = 0

  const origEsTariba = esTextoTariba(resultadoActual.origenInput)
  const destEsTariba = esTextoTariba(resultadoActual.destinoInput)
  const topo = resultadoActual.topografiaDominante

  // ============================================================================
  // NIVEL 1: FIJAR / ACTUALIZAR RUTA DIRECTA Y ANCLA GEOGRÁFICA (SI APLICA)
  // ============================================================================
  if (modoAprendizaje === 'completo' || modoAprendizaje === 'zonal_ancla') {
    if (origEsTariba || destEsTariba) {
      // Es una ruta desde/hacia la Base Central Táriba
      const nombrePunto = origEsTariba
        ? resultadoActual.destinoInput.trim()
        : resultadoActual.origenInput.trim()
      const coordPunto = origEsTariba
        ? resultadoActual.coordenadasDestino
        : resultadoActual.coordenadasOrigen
      const clavePuntoNorm = normalizarTextoTachira(nombrePunto)

      // Verificar si es viaje largo (> 120.000 COP o ya existe en viajes_largos)
      const idxLargo = nuevoDb.viajes_largos.findIndex(
        (l) => normalizarTextoTachira(l.destino) === clavePuntoNorm
      )
      const idxBase = nuevoDb.rutas_base.findIndex(
        (r) => normalizarTextoTachira(r.destino) === clavePuntoNorm
      )

      if (idxLargo >= 0) {
        const prev = nuevoDb.viajes_largos[idxLargo]
        nuevoDb.viajes_largos[idxLargo] = {
          ...prev,
          cop: subtotalEntrenadoCop,
          usd: Number(
            (subtotalEntrenadoCop / nuevosParametros.tasaCopPorUsd).toFixed(2)
          ),
        }
        resumenAprendizaje.push(
          `Viaje Largo Oficial "${prev.destino}" actualizado de ${(prev.cop ?? 0).toLocaleString('es-CO')} a ${subtotalEntrenadoCop.toLocaleString('es-CO')} COP.`
        )
      } else if (idxBase >= 0) {
        const prev = nuevoDb.rutas_base[idxBase]
        nuevoDb.rutas_base[idxBase] = {
          ...prev,
          cop: subtotalEntrenadoCop,
          cop_raw: Number((subtotalEntrenadoCop / 1000).toFixed(1)),
        }
        resumenAprendizaje.push(
          `Ruta Base "${prev.destino}" actualizada en matriz de ${prev.cop.toLocaleString('es-CO')} a ${subtotalEntrenadoCop.toLocaleString('es-CO')} COP.`
        )
      } else {
        // Era un punto NO contemplado en el Excel: lo incorporamos al catálogo aprendido
        nuevoDb.rutas_base.unshift({
          id: `entrenada_base_${Date.now()}`,
          tipo: 'base',
          origen: 'Táriba',
          destino: nombrePunto,
          cop_raw: Number((subtotalEntrenadoCop / 1000).toFixed(1)),
          cop: subtotalEntrenadoCop,
        })
        resumenAprendizaje.push(
          `Nuevo destino aprendido "${nombrePunto}" incorporado al catálogo desde Táriba en ${subtotalEntrenadoCop.toLocaleString('es-CO')} COP.`
        )
      }

      // Actualizar o crear el Nodo Ancla Georreferenciado para que todas las calles y sectores vecinos aprendan
      const idxAncla = nuevasAnclas.findIndex(
        (a) => normalizarTextoTachira(a.nombreOficial) === clavePuntoNorm
      )
      const nuevaAnclaObj: AnclaAprendidaItem = {
        id: `ancla_${clavePuntoNorm}_${Date.now()}`,
        nombreOficial: nombrePunto,
        copOficial: subtotalEntrenadoCop,
        copAnterior: subtotalAnteriorCop,
        tipoTabla: 'Ancla Entrenada',
        lat: coordPunto.lat,
        lon: coordPunto.lon,
        topografia: topo,
        clavesAsociadas: [clavePuntoNorm],
        fechaActualizacion: new Date().toISOString(),
      }

      if (idxAncla >= 0) {
        nuevasAnclas[idxAncla] = nuevaAnclaObj
      } else {
        nuevasAnclas.unshift(nuevaAnclaObj)
      }
      anclaActualizada = nombrePunto
      resumenAprendizaje.push(
        `Ancla Geográfica "${nombrePunto}" (${coordPunto.lat.toFixed(4)}, ${coordPunto.lon.toFixed(4)}) fijada en ${subtotalEntrenadoCop.toLocaleString('es-CO')} COP para triangular sectores vecinos.`
      )

      // Si el usuario activó "Propagar al corredor vecino", ajustamos rutas oficiales cercanas (< 2.5 km) de la misma topografía
      if (propagarCorredorVecino && Math.abs(ratioCambio - 1) >= 0.03) {
        nuevoDb.rutas_base = nuevoDb.rutas_base.map((r) => {
          const rNorm = normalizarTextoTachira(r.destino)
          if (rNorm === clavePuntoNorm) return r
          const geoR = detectarCoordenadasYTopografia(r.destino)
          if (geoR.clave === 'no_catalogado' || geoR.tipo !== topo) return r
          const distKm = distanciaHaversineKm(
            coordPunto.lat,
            coordPunto.lon,
            geoR.lat,
            geoR.lon
          )
          if (distKm > 0.1 && distKm <= 2.4) {
            // Peso inverso a la distancia dentro del corredor vecino
            const pesoVecino = Math.max(0.25, 1 - distKm / 2.8) * alpha
            const factorVecino = 1 + (ratioCambio - 1) * pesoVecino
            const nuevoCopVecino = redondearTarifaTachira(
              Math.round(r.cop * factorVecino)
            )
            if (nuevoCopVecino !== r.cop) {
              rutasVecinasActualizadas++
              return {
                ...r,
                cop: nuevoCopVecino,
                cop_raw: Number((nuevoCopVecino / 1000).toFixed(1)),
              }
            }
          }
          return r
        })
        if (rutasVecinasActualizadas > 0) {
          resumenAprendizaje.push(
            `Se recalibraron proporcionalmente ${rutasVecinasActualizadas} rutas vecinas en un radio de 2.4 km del mismo corredor.`
          )
        }
      }
    } else {
      // Es un viaje entre dos sectores distintos de Táriba (Combinación o Despacho Radial)
      const origTxt = resultadoActual.origenInput.trim()
      const destTxt = resultadoActual.destinoInput.trim()
      const origNorm = normalizarTextoTachira(origTxt)
      const destNorm = normalizarTextoTachira(destTxt)

      const idxComb = nuevoDb.combinaciones.findIndex((c) => {
        const cOrig = normalizarTextoTachira(c.origen)
        const cDest = normalizarTextoTachira(c.destino)
        return (
          (cOrig === origNorm && cDest === destNorm) ||
          (cOrig === destNorm && cDest === origNorm)
        )
      })

      if (idxComb >= 0) {
        const prev = nuevoDb.combinaciones[idxComb]
        nuevoDb.combinaciones[idxComb] = {
          ...prev,
          cop: subtotalEntrenadoCop,
          cop_raw: Number((subtotalEntrenadoCop / 1000).toFixed(1)),
        }
        resumenAprendizaje.push(
          `Combinación "${prev.raw}" actualizada a ${subtotalEntrenadoCop.toLocaleString('es-CO')} COP.`
        )
      } else {
        nuevoDb.combinaciones.unshift({
          id: `entrenada_comb_${Date.now()}`,
          tipo: 'combinacion',
          raw: `${origTxt}/${destTxt}`,
          origen: origTxt,
          destino: destTxt,
          cop_raw: Number((subtotalEntrenadoCop / 1000).toFixed(1)),
          cop: subtotalEntrenadoCop,
        })
        resumenAprendizaje.push(
          `Nueva combinación directa aprendida "${origTxt} / ${destTxt}" guardada en ${subtotalEntrenadoCop.toLocaleString('es-CO')} COP.`
        )
      }

      // Si el destino no estaba en catálogo y tenemos cuánto costaba la recogida (Tramo 1),
      // también entrenamos el ancla del destino restando el Tramo 1 de recogida
      if (
        !resultadoActual.esOficial &&
        resultadoActual.tramo1RecogidaCop > 0 &&
        subtotalEntrenadoCop > resultadoActual.tramo1RecogidaCop
      ) {
        const tramo2Aprendido = Math.max(
          nuevosParametros.tarifaMinimaBaseCop,
          Math.round((subtotalEntrenadoCop - resultadoActual.tramo1RecogidaCop) / 1000) *
            1000
        )
        const idxAnclaDest = nuevasAnclas.findIndex(
          (a) => normalizarTextoTachira(a.nombreOficial) === destNorm
        )
        const anclaDestObj: AnclaAprendidaItem = {
          id: `ancla_${destNorm}_${Date.now()}`,
          nombreOficial: destTxt,
          copOficial: tramo2Aprendido,
          tipoTabla: 'Ancla Entrenada',
          lat: resultadoActual.coordenadasDestino.lat,
          lon: resultadoActual.coordenadasDestino.lon,
          topografia: topo,
          clavesAsociadas: [destNorm],
          fechaActualizacion: new Date().toISOString(),
        }
        if (idxAnclaDest >= 0) {
          nuevasAnclas[idxAnclaDest] = anclaDestObj
        } else {
          nuevasAnclas.unshift(anclaDestObj)
        }
        anclaActualizada = destTxt
      }
    }
  }

  // ============================================================================
  // NIVEL 2: APRENDIZAJE MATEMÁTICO DE PARÁMETROS PARA EL RESTO DE LAS TARIFAS
  // ============================================================================
  if (modoAprendizaje === 'completo' || modoAprendizaje === 'solo_formula') {
    const campoCostoKm = obtenerNombreCampoCostoKm(topo)
    const costoKmActual = nuevosParametros[campoCostoKm]

    // Caso 2A: Si es un Despacho Radial (ambos puntos fuera de Táriba con Tramo 1 > 0)
    if (
      !origEsTariba &&
      !destEsTariba &&
      resultadoActual.tramo1RecogidaCop > 0 &&
      resultadoActual.tramo2TrasladoCop > 0
    ) {
      // Deducir cuál es el factorRecogidaRadial implícito enseñado por el operador
      const costoRecogidaBasePuro =
        resultadoActual.tramo1RecogidaCop /
        Math.max(0.1, parametrosActuales.factorRecogidaRadial)
      const recogidaImplicitaDeseada = Math.max(
        0,
        subtotalEntrenadoCop - resultadoActual.tramo2TrasladoCop
      )
      const factorRadialImplicito = Math.min(
        1.5,
        Math.max(0.25, recogidaImplicitaDeseada / Math.max(1000, costoRecogidaBasePuro))
      )

      const nuevoFactorRadial = Number(
        (
          (1 - alpha) * parametrosActuales.factorRecogidaRadial +
          alpha * factorRadialImplicito
        ).toFixed(2)
      )

      if (
        Math.abs(nuevoFactorRadial - parametrosActuales.factorRecogidaRadial) >=
        0.01
      ) {
        parametroModificado = 'factorRecogidaRadial'
        valorAnterior = parametrosActuales.factorRecogidaRadial
        valorNuevo = nuevoFactorRadial
        nuevosParametros.factorRecogidaRadial = nuevoFactorRadial
        resumenAprendizaje.push(
          `El motor aprendió que en despachos radiales el Factor de Recogida (Tramo 1) debe calibrarse de ${Math.round(valorAnterior * 100)}% a ${Math.round(nuevoFactorRadial * 100)}% para el resto de carreras fuera de Táriba.`
        )
      }
    }

    // Caso 2B: Calibrar el Costo por Kilómetro según la topografía dominante y el Factor Zonal
    const kmEfectivos = Math.max(
      1.2,
      resultadoActual.distanciaVialKm - nuevosParametros.kmIncluidosBase
    )

    if (resultadoActual.distanciaVialKm <= 2.8) {
      // Carrera corta: entrena la tarifa mínima base (banderazo)
      const banderazoNuevo =
        Math.round(
          ((1 - alpha * 0.6) * nuevosParametros.tarifaMinimaBaseCop +
            alpha * 0.6 * subtotalEntrenadoCop) /
            500
        ) * 500
      if (banderazoNuevo !== nuevosParametros.tarifaMinimaBaseCop) {
        parametroModificado = 'tarifaMinimaBaseCop'
        valorAnterior = nuevosParametros.tarifaMinimaBaseCop
        valorNuevo = banderazoNuevo
        nuevosParametros.tarifaMinimaBaseCop = banderazoNuevo
        resumenAprendizaje.push(
          `Carrera corta detectada (${resultadoActual.distanciaVialKm} km): Banderazo mínimo ajustado de ${valorAnterior.toLocaleString('es-CO')} a ${valorNuevo.toLocaleString('es-CO')} COP.`
        )
      }
    }

    // Calcular el nuevo costo/km para la topografía dominante proporcional al cambio enseñado
    let costoKmObjetivo = Math.round(costoKmActual * ratioCambio)
    if (
      resultadoActual.anclaDestinoUsada &&
      resultadoActual.anclaDestinoUsada.distanciaAlPuntoKm >= 0.8 &&
      origEsTariba
    ) {
      // Si se calculó desde un ancla vecina, también miramos la pendiente real (COP/km desde el ancla)
      const deltaDesdeAncla =
        subtotalEntrenadoCop - resultadoActual.anclaDestinoUsada.copOficial
      if (deltaDesdeAncla > 0) {
        const costoKmDesdeAncla = Math.round(
          deltaDesdeAncla / resultadoActual.anclaDestinoUsada.distanciaAlPuntoKm
        )
        costoKmObjetivo = Math.round(
          costoKmObjetivo * 0.5 + costoKmDesdeAncla * 0.5
        )
      } else if (kmEfectivos > 1.5) {
        costoKmObjetivo = Math.round(
          (subtotalEntrenadoCop - nuevosParametros.tarifaMinimaBaseCop) /
            kmEfectivos
        )
      }
    }

    costoKmObjetivo = Math.min(6000, Math.max(700, costoKmObjetivo))
    const costoKmAprendido =
      Math.round(
        ((1 - alpha) * costoKmActual + alpha * costoKmObjetivo) / 50
      ) * 50

    if (costoKmAprendido !== costoKmActual) {
      if (!parametroModificado) {
        parametroModificado = campoCostoKm
        valorAnterior = costoKmActual
        valorNuevo = costoKmAprendido
      }
      nuevosParametros[campoCostoKm] = costoKmAprendido
      resumenAprendizaje.push(
        `Tarifa por km en topografía ${topo.toUpperCase()} calibrada de ${costoKmActual.toLocaleString('es-CO')} a ${costoKmAprendido.toLocaleString('es-CO')} COP/km.`
      )
    }

    // Actualizar el factor zonal fino para las inferencias de esta topografía
    const factorZonalPrevio = nuevosFactoresZonales[topo] ?? 1.0
    const factorZonalObjetivo = Math.min(
      1.45,
      Math.max(0.65, factorZonalPrevio * (1 + (ratioCambio - 1) * (alpha * 0.65)))
    )
    nuevosFactoresZonales[topo] = Number(factorZonalObjetivo.toFixed(3))
    if (Math.abs(nuevosFactoresZonales[topo] - factorZonalPrevio) >= 0.01) {
      const pctZonal = Math.round((nuevosFactoresZonales[topo] - 1) * 100)
      resumenAprendizaje.push(
        `Multiplicador adaptativo de zona ${topo.toUpperCase()} ajustado a ${pctZonal >= 0 ? '+' : ''}${pctZonal}% para recalibrar rutas similares no tabuladas.`
      )
    }
  }

  const leccion: LeccionEntrenamiento = {
    id: `lec_${Date.now()}`,
    fecha: new Date().toISOString(),
    origen: resultadoActual.origenInput,
    destino: resultadoActual.destinoInput,
    sectorOrigen: resultadoActual.sectorOrigenDetectado,
    sectorDestino: resultadoActual.sectorDestinoDetectado,
    reglaOriginal: resultadoActual.reglaAplicada,
    topografia: topo,
    distanciaVialKm: resultadoActual.distanciaVialKm,
    subtotalSistemaAnteriorCop: subtotalAnteriorCop,
    subtotalEntrenadoCop,
    totalSistemaAnteriorCop: resultadoActual.totalCop,
    totalEntrenadoCop: nuevoTotalCop,
    deltaCop,
    deltaPorcentaje,
    coordenadasOrigen: resultadoActual.coordenadasOrigen,
    coordenadasDestino: resultadoActual.coordenadasDestino,
    modoAprendizaje,
    propagoCorredorVecino: propagarCorredorVecino,
    ajustesAplicados: {
      parametroModificado,
      valorAnterior,
      valorNuevo,
      anclaActualizada,
      rutasVecinasActualizadas,
      resumenAprendizaje,
    },
  }

  const nuevoEstadoAprendizaje: EstadoAprendizajeMotor = {
    tasaAprendizajeAlpha: estadoAprendizajeActual.tasaAprendizajeAlpha,
    lecciones: [leccion, ...estadoAprendizajeActual.lecciones],
    anclasAprendidas: nuevasAnclas,
    factoresZonales: nuevosFactoresZonales,
  }

  // ============================================================================
  // 3. CALCULAR EL IMPACTO EN EL RESTO DE LAS RUTAS (ANTES VS DESPUÉS)
  // ============================================================================
  const candidatosComparacion = [
    ...CASOS_BENCHMARK_APRENDIZAJE,
    // Agregar puntos cercanos de acuerdo a las anclas vecinas del destino actual
    ...(resultadoActual.anclasCercanasDestino ?? []).map((a) => ({
      origen: 'Táriba',
      destino: a.nombreOficial,
      descripcionZona: `Sector vecino a ${a.distanciaAlPuntoKm} km del punto entrenado`,
    })),
  ]

  const ejemplosImpactados: EjemploRutaImpactada[] = []
  const vistos = new Set<string>()
  const claveActual = `${normalizarTextoTachira(resultadoActual.origenInput)}->${normalizarTextoTachira(resultadoActual.destinoInput)}`
  vistos.add(claveActual)

  for (const caso of candidatosComparacion) {
    const k = `${normalizarTextoTachira(caso.origen)}->${normalizarTextoTachira(caso.destino)}`
    if (vistos.has(k)) continue
    vistos.add(k)

    const antes = calcularTarifaPatriotas(
      caso.origen,
      caso.destino,
      parametrosActuales,
      opcionesActuales,
      dbActual,
      null,
      estadoAprendizajeActual
    )

    const despues = calcularTarifaPatriotas(
      caso.origen,
      caso.destino,
      nuevosParametros,
      opcionesActuales,
      nuevoDb,
      null,
      nuevoEstadoAprendizaje
    )

    if (antes.totalCop !== despues.totalCop) {
      ejemplosImpactados.push({
        origen: caso.origen,
        destino: caso.destino,
        descripcionZona: caso.descripcionZona,
        copAntes: antes.totalCop,
        copDespues: despues.totalCop,
        diferenciaCop: despues.totalCop - antes.totalCop,
        motivoCambio: despues.aprendizajeAplicado?.usandoAnclaEntrenada
          ? `Usa nueva ancla entrenada (${anclaActualizada || resultadoActual.sectorDestinoDetectado})`
          : `Recalibrado por ${parametroModificado === 'factorRecogidaRadial' ? 'Factor Radial' : `fórmula ${despues.topografiaDominante.toUpperCase()}`}`,
      })
    }
  }

  return {
    nuevoDb,
    nuevosParametros,
    nuevoEstadoAprendizaje,
    leccion,
    ejemplosImpactados: ejemplosImpactados.slice(0, 6),
  }
}

export function obtenerComparativaGlobalAprendizaje(params: {
  parametrosActuales: ParametrosMotorTarifas
  dbActual: TarifasTachiraDB
  estadoAprendizajeActual: EstadoAprendizajeMotor
  dbOriginal: TarifasTachiraDB
}): EjemploRutaImpactada[] {
  const {
    parametrosActuales,
    dbActual,
    estadoAprendizajeActual,
    dbOriginal,
  } = params

  return CASOS_BENCHMARK_APRENDIZAJE.map((caso) => {
    const fabrica = calcularTarifaPatriotas(
      caso.origen,
      caso.destino,
      PARAMETROS_DEFAULT,
      OPCIONES_VIAJE_DEFAULT,
      dbOriginal,
      null,
      ESTADO_APRENDIZAJE_INICIAL
    )

    const entrenado = calcularTarifaPatriotas(
      caso.origen,
      caso.destino,
      parametrosActuales,
      OPCIONES_VIAJE_DEFAULT,
      dbActual,
      null,
      estadoAprendizajeActual
    )

    return {
      origen: caso.origen,
      destino: caso.destino,
      descripcionZona: caso.descripcionZona,
      copAntes: fabrica.totalCop,
      copDespues: entrenado.totalCop,
      diferenciaCop: entrenado.totalCop - fabrica.totalCop,
      motivoCambio:
        entrenado.totalCop === fabrica.totalCop
          ? 'Sin variación respecto a fábrica'
          : entrenado.aprendizajeAplicado?.usandoAnclaEntrenada
          ? 'Ancla geográfica entrenada'
          : `Calibración aprendida (${entrenado.topografiaDominante.toUpperCase()})`,
    }
  })
}
