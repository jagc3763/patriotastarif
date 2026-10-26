import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import {
  calcularTarifaPatriotas,
  detectarCoordenadasYTopografia,
  OPCIONES_VIAJE_DEFAULT,
  PARAMETROS_DEFAULT,
  redondearTarifaTachira,
} from '@/lib/tarifas/engine'
import {
  ANCLAS_OFICIALES_GEORREFERENCIADAS,
  COORD_BASE_TARIBA,
  encontrarAnclasTarifariasCercanas,
} from '@/lib/tarifas/geografia-tachira'
import {
  AnalisisTarifarioIA,
  OpcionesViaje,
  ParametrosMotorTarifas,
  TopografiaTachira,
} from '@/lib/tarifas/types'
import { leerSnapshotEntrenamiento } from '@/app/api/tarifas/entrenamiento/route'

interface GeocodingResult {
  lat: number
  lon: number
  displayName: string
  encontradoEnOsm: boolean
}

async function geocodificarLugarTachira(
  lugar: string,
  fallbackLat: number,
  fallbackLon: number
): Promise<GeocodingResult> {
  try {
    const query = `${lugar}, Táchira, Venezuela`
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}&viewbox=-72.55,8.65,-71.35,7.35&bounded=0`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3200)

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LineaLosPatriotasTariba/2.0 (DespachoTachira)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0]
        const lat = parseFloat(item.lat)
        const lon = parseFloat(item.lon)
        if (lat >= 6.8 && lat <= 9.2 && lon >= -73.0 && lon <= -70.5) {
          return {
            lat,
            lon,
            displayName: item.display_name || lugar,
            encontradoEnOsm: true,
          }
        }
      }
    }
  } catch {
    // Fallback silencioso a coordenadas locales
  }

  return {
    lat: fallbackLat,
    lon: fallbackLon,
    displayName: lugar,
    encontradoEnOsm: false,
  }
}

interface OsrmRouteResult {
  distanciaKm: number
  duracionMin: number
}

async function calcularRutaCarreteraOsrm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<OsrmRouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3200)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        return {
          distanciaKm: Number((route.distance / 1000).toFixed(2)),
          duracionMin: Math.max(4, Math.round(route.duration / 60)),
        }
      }
    }
  } catch {
    // Fallback silencioso a Haversine topográfico
  }
  return null
}

const EsquemaInferenciaIA = z.object({
  origenExtraido: z
    .string()
    .describe('Nombre limpio del sector, barrio, urbanización o pueblo de origen en Táchira'),
  municipioOrigen: z
    .string()
    .describe('Municipio del estado Táchira donde se ubica el origen'),
  destinoExtraido: z
    .string()
    .describe('Nombre limpio del sector, barrio, urbanización, clínica o pueblo de destino en Táchira'),
  municipioDestino: z
    .string()
    .describe('Municipio del estado Táchira o frontera donde se ubica el destino'),
  topografiaDetectada: z
    .enum(['urbano', 'troncal', 'montana', 'frontera'])
    .describe('Tipo de terreno predominante en la ruta dentro de la geografía del Táchira'),
  latOrigenEstimada: z
    .number()
    .describe('Latitud aproximada del origen en el Táchira (ej. entre 7.40 y 8.60)'),
  lonOrigenEstimada: z
    .number()
    .describe('Longitud aproximada del origen en el Táchira (ej. entre -72.55 y -71.40)'),
  latDestinoEstimada: z
    .number()
    .describe('Latitud aproximada del destino en el Táchira (ej. entre 7.40 y 8.60)'),
  lonDestinoEstimada: z
    .number()
    .describe('Longitud aproximada del destino en el Táchira (ej. entre -72.55 y -71.40)'),
  nocturnoDetectado: z.boolean().describe('True si la consulta menciona noche, madrugada o después de las 9pm'),
  lluviaDetectada: z.boolean().describe('True si la consulta menciona lluvia o aguacero'),
  feriadoDetectado: z.boolean().describe('True si la consulta menciona domingo o día feriado'),
  paradasExtraDetectadas: z.number().describe('Número de paradas intermedias mencionadas (0 si ninguna)'),
  minutosEsperaDetectados: z.number().describe('Minutos de espera mencionados (0 si ninguno)'),
  anclaOficialOrigen: z
    .string()
    .describe('Nombre de la tarifa oficial de Línea Los Patriotas más cercana al origen'),
  copAnclaOrigen: z
    .number()
    .describe('Valor en COP de esa tarifa ancla de origen desde Base Táriba (0 si el origen es Táriba)'),
  anclaOficialDestino: z
    .string()
    .describe('Nombre de la tarifa oficial de Línea Los Patriotas más cercana al destino'),
  copAnclaDestino: z
    .number()
    .describe('Valor en COP de esa tarifa ancla de destino desde Base Táriba'),
  tramo1SugeridoCop: z
    .number()
    .describe('Costo sugerido en COP para el Tramo 1 (Recogida desde Base Táriba al Origen; 0 si sale de Táriba)'),
  tramo2SugeridoCop: z
    .number()
    .describe('Costo sugerido en COP para el Tramo 2 (Traslado al Destino)'),
  tarifaBaseSugeridaCop: z
    .number()
    .describe('Subtotal base sugerido en COP (múltiplo de 1000) calibrado con el tarifario oficial'),
  razonamientoExperto: z
    .string()
    .describe('Explicación clara y técnica en español de cómo se calculó la tarifa para este punto no contemplado usando el ancla oficial vecina, distancia vial y topografía andina'),
  factoresConsiderados: z
    .array(z.string())
    .describe('Lista de 3 a 4 puntos clave considerados en la tasación'),
})

export async function POST(request: Request) {
  try {
    const snapshot = await leerSnapshotEntrenamiento()
    const body = await request.json()
    const origenRaw: string = body.origen ?? 'Táriba'
    const destinoRaw: string = body.destino ?? 'Peribeca'
    const consultaLibre: string | undefined = body.consultaLibre

    const parametros: ParametrosMotorTarifas = {
      ...snapshot.parametros,
      ...(body.parametros ?? {}),
    }
    const estadoAprendizaje =
      body.estadoAprendizaje ?? snapshot.estadoAprendizaje
    const dbActiva = body.db ?? snapshot.db
    const opciones: OpcionesViaje = {
      ...OPCIONES_VIAJE_DEFAULT,
      ...(body.opciones ?? {}),
    }

    const geoOrigLocal = detectarCoordenadasYTopografia(origenRaw)
    const geoDestLocal = detectarCoordenadasYTopografia(destinoRaw)

    const [osmOrig, osmDest] = await Promise.all([
      geoOrigLocal.clave === 'no_catalogado'
        ? geocodificarLugarTachira(origenRaw, geoOrigLocal.lat, geoOrigLocal.lon)
        : Promise.resolve({
            lat: geoOrigLocal.lat,
            lon: geoOrigLocal.lon,
            displayName: geoOrigLocal.nombre,
            encontradoEnOsm: false,
          }),
      geoDestLocal.clave === 'no_catalogado'
        ? geocodificarLugarTachira(destinoRaw, geoDestLocal.lat, geoDestLocal.lon)
        : Promise.resolve({
            lat: geoDestLocal.lat,
            lon: geoDestLocal.lon,
            displayName: geoDestLocal.nombre,
            encontradoEnOsm: false,
          }),
    ])

    const [osrmRecogida, osrmTraslado] = await Promise.all([
      calcularRutaCarreteraOsrm(
        COORD_BASE_TARIBA.lat,
        COORD_BASE_TARIBA.lon,
        osmOrig.lat,
        osmOrig.lon
      ),
      calcularRutaCarreteraOsrm(
        osmOrig.lat,
        osmOrig.lon,
        osmDest.lat,
        osmDest.lon
      ),
    ])

    const anclasOrig = encontrarAnclasTarifariasCercanas(
      osmOrig.lat,
      osmOrig.lon,
      geoOrigLocal.tipo,
      parametros,
      3,
      estadoAprendizaje.anclasAprendidas,
      dbActiva
    )
    const anclasDest = encontrarAnclasTarifariasCercanas(
      osmDest.lat,
      osmDest.lon,
      geoDestLocal.tipo,
      parametros,
      3,
      estadoAprendizaje.anclasAprendidas,
      dbActiva
    )

    const catalogoAnclasResumen = ANCLAS_OFICIALES_GEORREFERENCIADAS.map(
      (a) => `${a.nombreOficial} (${a.municipio}, ${a.topografia}): ${a.copOficial.toLocaleString('es-CO')} COP`
    ).join(' | ')

    const resumenLeccionesEntrenadas =
      estadoAprendizaje.lecciones.length > 0
        ? `\n5. CORRECCIONES APRENDIDAS DEL OPERADOR DE DESPACHO (PRIORIDAD MÁXIMA):\n` +
          estadoAprendizaje.lecciones
            .slice(0, 12)
            .map(
              (l: { origen: string; destino: string; subtotalEntrenadoCop: number; topografia: string }) =>
                `- ${l.origen} → ${l.destino} (${l.topografia}): entrenada a ${l.subtotalEntrenadoCop.toLocaleString('es-CO')} COP`
            )
            .join('\n')
        : ''

    let resultadoIA: z.infer<typeof EsquemaInferenciaIA> | null = null

    try {
      const { output } = await generateText({
        model: 'openai/gpt-5.4-mini',
        output: Output.object({
          schema: EsquemaInferenciaIA,
        }),
        system: `Eres el Ingeniero Jefe de Despacho y Tasación Geográfica de "Línea Los Patriotas", cuya base central de operaciones está en Táriba (Municipio Cárdenas, Estado Táchira, Venezuela, coordenadas 7.8180, -72.2248).
Tu misión es calcular con máxima precisión tarifas hacia o desde puntos NO contemplados en el Excel oficial, calibrándote ESTRICTAMENTE con las tarifas oficiales de referencia (Anclas Oficiales) y la distancia vial real.

REGLAS DE ORO DE LÍNEA LOS PATRIOTAS (TÁRIBA):
1. Todas las tarifas se expresan en Pesos Colombianos (COP) en múltiplos cerrados de 1.000 COP. Tarifa mínima base: ${parametros.tarifaMinimaBaseCop} COP.
2. Si el viaje sale de Base Táriba hacia un punto P no contemplado:
   - Localiza el Ancla Oficial más cercana en el tarifario de la línea.
   - Toma el precio oficial de esa Ancla y suma/ajusta los kilómetros viales adicionales desde el Ancla hasta el punto P según la topografía:
     * Urbano: ${parametros.costoKmUrbano} COP/km
     * Troncal: ${parametros.costoKmTroncal} COP/km
     * Montaña / Cuesta andina: ${parametros.costoKmMontana} COP/km
     * Frontera: ${parametros.costoKmFrontera} COP/km
3. Si el viaje es entre un Origen A (distinto de Táriba) y un Destino B:
   - El taxi debe salir de Base Táriba a recoger al cliente en A (Tramo 1 Recogida, factor ${parametros.factorRecogidaRadial * 100}%) y luego trasladarlo a B (Tramo 2 Traslado).
   - Si A y B son sectores muy cercanos entre sí (< 4 km dentro del mismo casco urbano), el Tramo 2 se calcula por distancia vial corta para mantener un precio competitivo y realista.
4. Catálogo de Anclas Oficiales desde Base Táriba:
${catalogoAnclasResumen}${resumenLeccionesEntrenadas}`,
        prompt: consultaLibre
          ? `Analiza la siguiente solicitud en lenguaje natural para un taxi en el Táchira:
"${consultaLibre}"
(Si no especifica origen, asume Táriba Base Central. Extrae origen, destino, condiciones de lluvia/noche/feriado/paradas y calcula la tarifa calibrada con las anclas oficiales).`
          : `Calcula la tarifa inteligente para este viaje de prueba:
- Origen solicitado: "${origenRaw}" (Detectado: ${osmOrig.displayName}, coords: ${osmOrig.lat}, ${osmOrig.lon}, distancia por carretera desde Táriba: ${osrmRecogida ? `${osrmRecogida.distanciaKm} km` : 'estimada por Haversine'})
- Anclas oficiales más cercanas al Origen: ${JSON.stringify(anclasOrig)}
- Destino solicitado: "${destinoRaw}" (Detectado: ${osmDest.displayName}, coords: ${osmDest.lat}, ${osmDest.lon}, distancia carretera Origen->Destino: ${osrmTraslado ? `${osrmTraslado.distanciaKm} km (${osrmTraslado.duracionMin} min)` : 'estimada por Haversine'})
- Anclas oficiales más cercanas al Destino: ${JSON.stringify(anclasDest)}`,
      })

      resultadoIA = output
    } catch {
      resultadoIA = null
    }

    const origenFinal = resultadoIA?.origenExtraido || origenRaw
    const destinoFinal = resultadoIA?.destinoExtraido || destinoRaw
    const opcionesFinales: OpcionesViaje =
      consultaLibre && resultadoIA
        ? {
            nocturno: resultadoIA.nocturnoDetectado || opciones.nocturno,
            lluvia: resultadoIA.lluviaDetectada || opciones.lluvia,
            feriado: resultadoIA.feriadoDetectado || opciones.feriado,
            paradasExtra: resultadoIA.paradasExtraDetectadas || opciones.paradasExtra,
            minutosEspera: resultadoIA.minutosEsperaDetectados || opciones.minutosEspera,
          }
        : opciones

    const calculoMotor = calcularTarifaPatriotas(
      origenFinal,
      destinoFinal,
      parametros,
      opcionesFinales,
      dbActiva,
      null,
      estadoAprendizaje
    )

    const distanciaVialFinal =
      osrmTraslado?.distanciaKm ?? calculoMotor.distanciaVialKm
    const distanciaRecogidaFinal =
      osrmRecogida?.distanciaKm ?? calculoMotor.distanciaRecogidaKm
    const duracionFinal =
      osrmTraslado?.duracionMin ?? calculoMotor.tiempoEstimadoMin

    let tramo1Final = calculoMotor.tramo1RecogidaCop
    let tramo2Final = calculoMotor.tramo2TrasladoCop
    let subtotalFinal = calculoMotor.subtotalBaseCop

    if (!calculoMotor.esOficial && resultadoIA) {
      tramo1Final = Math.round(resultadoIA.tramo1SugeridoCop / 1000) * 1000
      tramo2Final = Math.round(resultadoIA.tramo2SugeridoCop / 1000) * 1000
      subtotalFinal = Math.max(
        parametros.tarifaMinimaBaseCop,
        tramo1Final + tramo2Final
      )
    } else if (!calculoMotor.esOficial && osrmTraslado && geoDestLocal.clave === 'no_catalogado') {
      const costoKm =
        calculoMotor.topografiaDominante === 'frontera'
          ? parametros.costoKmFrontera
          : calculoMotor.topografiaDominante === 'montana'
          ? parametros.costoKmMontana
          : calculoMotor.topografiaDominante === 'troncal'
          ? parametros.costoKmTroncal
          : parametros.costoKmUrbano

      const kmAdic = Math.max(0, osrmTraslado.distanciaKm - parametros.kmIncluidosBase)
      tramo2Final = redondearTarifaTachira(
        Math.round(parametros.tarifaMinimaBaseCop + kmAdic * costoKm)
      )
      subtotalFinal = tramo1Final + tramo2Final
    }

    const montoRecargosCop = Math.round(
      subtotalFinal * (calculoMotor.porcentajeRecargoTotal / 100)
    )
    const totalSinRedondearCop =
      subtotalFinal + montoRecargosCop + calculoMotor.montoExtrasCop

    const totalCop =
      !calculoMotor.esOficial && parametros.aplicarRedondeoComercial
        ? redondearTarifaTachira(totalSinRedondearCop)
        : calculoMotor.totalCop

    const totalUsd = Number((totalCop / parametros.tasaCopPorUsd).toFixed(2))
    const totalVesBcv = Number((totalUsd * parametros.tasaBcvPorUsd).toFixed(2))

    const rangoMin = calculoMotor.esOficial
      ? totalCop
      : redondearTarifaTachira(Math.round(totalCop * 0.92))
    const rangoMax = calculoMotor.esOficial
      ? totalCop
      : redondearTarifaTachira(Math.round(totalCop * 1.1))

    const anclaDestTop = anclasDest[0]
    const anclaOrigTop = anclasOrig[0]

    const analisisIA: AnalisisTarifarioIA = {
      origenInterpretado:
        resultadoIA?.origenExtraido || calculoMotor.sectorOrigenDetectado,
      municipioOrigen:
        resultadoIA?.municipioOrigen ||
        geoOrigLocal.municipio ||
        'Cárdenas / San Cristóbal',
      destinoInterpretado:
        resultadoIA?.destinoExtraido || calculoMotor.sectorDestinoDetectado,
      municipioDestino:
        resultadoIA?.municipioDestino ||
        geoDestLocal.municipio ||
        'Estado Táchira',
      topografiaDetectada:
        (resultadoIA?.topografiaDetectada as TopografiaTachira) ||
        calculoMotor.topografiaDominante,
      distanciaCarreteraOsrmKm: osrmTraslado?.distanciaKm ?? null,
      distanciaRecogidaOsrmKm: osrmRecogida?.distanciaKm ?? null,
      duracionCarreteraMin: osrmTraslado?.duracionMin ?? null,
      anclaOficialOrigen:
        resultadoIA?.anclaOficialOrigen ||
        anclaOrigTop?.nombreOficial ||
        'Táriba (Base Central)',
      copAnclaOrigen:
        resultadoIA?.copAnclaOrigen ?? anclaOrigTop?.copOficial ?? 0,
      anclaOficialDestino:
        resultadoIA?.anclaOficialDestino ||
        anclaDestTop?.nombreOficial ||
        'Pueblo Nuevo',
      copAnclaDestino:
        resultadoIA?.copAnclaDestino ?? anclaDestTop?.copOficial ?? 20000,
      tramo1SugeridoCop: tramo1Final,
      tramo2SugeridoCop: tramo2Final,
      tarifaBaseSugeridaCop: subtotalFinal,
      rangoMinCop: rangoMin,
      rangoMaxCop: rangoMax,
      razonamientoExperto:
        resultadoIA?.razonamientoExperto ||
        calculoMotor.pasosRazonamiento.join(' '),
      factoresConsiderados: resultadoIA?.factoresConsiderados || [
        `Ancla oficial más cercana: ${anclaDestTop?.nombreOficial ?? 'Matriz Táriba'} (${(anclaDestTop?.copOficial ?? 20000).toLocaleString('es-CO')} COP)`,
        `Distancia vial ${osrmTraslado ? `medida por carretera OSRM: ${osrmTraslado.distanciaKm} km (${osrmTraslado.duracionMin} min)` : `topográfica: ~${distanciaVialFinal} km`}`,
        `Topografía dominante en ruta: ${calculoMotor.topografiaDominante.toUpperCase()}`,
      ],
      fuenteGeometria: osrmTraslado
        ? 'OSRM_CARRETERA_REAL'
        : 'HAVERSINE_TOPOGRAFICO',
    }

    const resultadoEnriquecido = {
      ...calculoMotor,
      origenInput: origenFinal,
      destinoInput: destinoFinal,
      sectorOrigenDetectado: analisisIA.origenInterpretado,
      sectorDestinoDetectado: analisisIA.destinoInterpretado,
      reglaAplicada: calculoMotor.esOficial
        ? calculoMotor.reglaAplicada
        : osrmTraslado || resultadoIA
        ? ('IA_GEORREFERENCIADA_OSRM' as const)
        : calculoMotor.reglaAplicada,
      tituloRegla: calculoMotor.esOficial
        ? calculoMotor.tituloRegla
        : 'Inferencia IA + Ruteo Vial OSRM + Ancla Oficial Vecina',
      nivelConfianza: calculoMotor.esOficial
        ? ('OFICIAL_100' as const)
        : ('IA_RUTEO_VIAL' as const),
      porcentajeConfianza: calculoMotor.esOficial ? 100 : 95,
      distanciaVialKm: distanciaVialFinal,
      distanciaRecogidaKm: distanciaRecogidaFinal,
      tiempoEstimadoMin: duracionFinal,
      tramo1RecogidaCop: tramo1Final,
      tramo2TrasladoCop: tramo2Final,
      subtotalBaseCop: subtotalFinal,
      montoRecargosCop,
      totalSinRedondearCop,
      totalCop,
      totalUsd,
      totalVesBcv,
      rangoSugeridoMinCop: rangoMin,
      rangoSugeridoMaxCop: rangoMax,
      coordenadasOrigen: {
        lat: resultadoIA?.latOrigenEstimada || osmOrig.lat,
        lon: resultadoIA?.lonOrigenEstimada || osmOrig.lon,
      },
      coordenadasDestino: {
        lat: resultadoIA?.latDestinoEstimada || osmDest.lat,
        lon: resultadoIA?.lonDestinoEstimada || osmDest.lon,
      },
      opcionesAplicadas: opcionesFinales,
      analisisIA,
    }

    return NextResponse.json({
      ok: true,
      resultado: resultadoEnriquecido,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error en el motor de inferencia inteligente',
      },
      { status: 400 }
    )
  }
}
