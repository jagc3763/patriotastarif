import { NextRequest, NextResponse } from 'next/server'
import {
  calcularDistanciaVialKm,
  detectarCoordenadasYTopografia,
} from '@/lib/tarifas/engine'
import {
  ANCLAS_OFICIALES_GEORREFERENCIADAS,
  COORD_BASE_TARIBA,
} from '@/lib/tarifas/geografia-tachira'
import { AlternativaRutaMapa, TelemetriaRutaMapa } from '@/lib/tarifas/types'

interface CoordenadaResuelta {
  lat: number
  lon: number
  direccionFormateada: string
  encontradoExterno: boolean
}

function generarCurvaVialAndinaFallback(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): [number, number][] {
  const puntos: [number, number][] = []
  const pasos = 18
  const dLat = lat2 - lat1
  const dLon = lon2 - lon1
  // Desviación perpendicular suave que simula el trazado vial del valle del Torbes / montaña
  const perpLat = -dLon * 0.14
  const perpLon = dLat * 0.14

  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos
    const onda = Math.sin(t * Math.PI) * 0.65 + Math.sin(t * Math.PI * 2) * 0.2
    puntos.push([
      Number((lat1 + dLat * t + perpLat * onda).toFixed(5)),
      Number((lon1 + dLon * t + perpLon * onda).toFixed(5)),
    ])
  }
  return puntos
}

async function geocodificarPuntoTachira(
  texto: string,
  coordExplicita?: { lat: number; lon: number },
  googleApiKey?: string
): Promise<CoordenadaResuelta> {
  if (
    coordExplicita &&
    typeof coordExplicita.lat === 'number' &&
    typeof coordExplicita.lon === 'number'
  ) {
    return {
      lat: coordExplicita.lat,
      lon: coordExplicita.lon,
      direccionFormateada: texto || `${coordExplicita.lat.toFixed(4)}, ${coordExplicita.lon.toFixed(4)}`,
      encontradoExterno: true,
    }
  }

  const local = detectarCoordenadasYTopografia(texto)
  if (local.clave !== 'no_catalogado') {
    return {
      lat: local.lat,
      lon: local.lon,
      direccionFormateada: local.nombre,
      encontradoExterno: false,
    }
  }

  // 1. Si el usuario proveyó Google API Key, intentar Geocoding API de Google restringido a Táchira
  if (googleApiKey && googleApiKey.trim().length > 10) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        `${texto}, Táchira, Venezuela`
      )}&bounds=7.35,-72.55|8.65,-71.35&region=ve&language=es&key=${encodeURIComponent(
        googleApiKey.trim()
      )}`
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3000)
      const gRes = await fetch(gUrl, { signal: controller.signal })
      clearTimeout(timer)
      if (gRes.ok) {
        const gData = await gRes.json()
        if (gData.status === 'OK' && gData.results?.length > 0) {
          const loc = gData.results[0].geometry.location
          if (loc.lat >= 6.8 && loc.lat <= 9.3 && loc.lng >= -73.2 && loc.lng <= -70.4) {
            return {
              lat: loc.lat,
              lon: loc.lng,
              direccionFormateada: gData.results[0].formatted_address || texto,
              encontradoExterno: true,
            }
          }
        }
      }
    } catch {
      // Continuar a Nominatim si falla
    }
  }

  // 2. Geocodificación gratuita en OpenStreetMap Nominatim acotada al Estado Táchira
  try {
    const query = `${texto}, Táchira, Venezuela`
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}&viewbox=-72.55,8.65,-71.35,7.35&bounded=0`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LineaLosPatriotasTariba/2.5 (MapaRutasTachira)',
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
          const nombreCorto = String(item.display_name || texto)
            .split(',')
            .slice(0, 2)
            .join(',')
            .trim()
          return {
            lat,
            lon,
            direccionFormateada: nombreCorto || texto,
            encontradoExterno: true,
          }
        }
      }
    }
  } catch {
    // Fallback local
  }

  return {
    lat: local.lat,
    lon: local.lon,
    direccionFormateada: local.nombre,
    encontradoExterno: false,
  }
}

interface ResultadoOsrmCompleto {
  distanciaKm: number
  duracionMin: number
  resumenVial: string
  geometria: [number, number][]
  alternativas: AlternativaRutaMapa[]
}

async function obtenerRutasVialesOsrm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  incluirAlternativas = true
): Promise<ResultadoOsrmCompleto> {
  const distEntrePuntos = Math.hypot(lat2 - lat1, lon2 - lon1)
  if (distEntrePuntos < 0.0004) {
    return {
      distanciaKm: 0,
      duracionMin: 0,
      resumenVial: 'Mismo punto (Base Táriba)',
      geometria: [
        [lat1, lon1],
        [lat2, lon2],
      ],
      alternativas: [],
    }
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&alternatives=${
      incluirAlternativas ? 'true' : 'false'
    }&steps=true`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3800)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const alternativas: AlternativaRutaMapa[] = data.routes.map(
          (r: {
            distance: number
            duration: number
            legs?: { summary?: string; steps?: { name?: string }[] }[]
            geometry?: { coordinates?: [number, number][] }
          }, idx: number) => {
            const coordsGeojson = r.geometry?.coordinates || []
            const geometriaLatLon: [number, number][] =
              coordsGeojson.length > 0
                ? coordsGeojson.map((c) => [c[1], c[0]])
                : generarCurvaVialAndinaFallback(lat1, lon1, lat2, lon2)

            // Extraer nombres de vías reales de los steps o del summary
            const leg = r.legs?.[0]
            let resumen = leg?.summary?.replace(/;/g, ' → ') || ''
            if (!resumen && Array.isArray(leg?.steps)) {
              const nombresVias = Array.from(
                new Set(
                  leg.steps
                    .map((s) => s.name?.trim())
                    .filter((n): n is string => Boolean(n && n.length > 2))
                )
              ).slice(0, 3)
              if (nombresVias.length > 0) {
                resumen = nombresVias.join(' → ')
              }
            }
            if (!resumen) {
              resumen = idx === 0 ? 'Vía Principal Recomendada' : `Ruta Alternativa #${idx + 1}`
            }

            return {
              indice: idx,
              resumen,
              distanciaKm: Math.max(0.5, Number((r.distance / 1000).toFixed(2))),
              duracionMin: Math.max(3, Math.round(r.duration / 60)),
              geometria: geometriaLatLon,
              esMejorRuta: idx === 0,
            }
          }
        )

        const principal = alternativas[0]
        return {
          distanciaKm: principal.distanciaKm,
          duracionMin: principal.duracionMin,
          resumenVial: principal.resumen,
          geometria: principal.geometria || generarCurvaVialAndinaFallback(lat1, lon1, lat2, lon2),
          alternativas,
        }
      }
    }
  } catch {
    // Fallback determinístico topográfico
  }

  const distFallback = calcularDistanciaVialKm(lat1, lon1, lat2, lon2, 1.38)
  const durFallback = Math.max(4, Math.round((distFallback / 30) * 60))
  const geomFallback = generarCurvaVialAndinaFallback(lat1, lon1, lat2, lon2)

  return {
    distanciaKm: distFallback,
    duracionMin: durFallback,
    resumenVial: 'Corredor Vial Andino Táchira',
    geometria: geomFallback,
    alternativas: [
      {
        indice: 0,
        resumen: 'Corredor Vial Andino Táchira (Mejor Ruta)',
        distanciaKm: distFallback,
        duracionMin: durFallback,
        geometria: geomFallback,
        esMejorRuta: true,
      },
    ],
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '')
  const lon = parseFloat(searchParams.get('lon') || '')

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { ok: false, error: 'Coordenadas lat/lon requeridas' },
      { status: 400 }
    )
  }

  // Buscar primero el ancla o sector más cercano en Táchira
  let anclaMasCercana = ANCLAS_OFICIALES_GEORREFERENCIADAS[0]
  let menorDist = Infinity
  for (const a of ANCLAS_OFICIALES_GEORREFERENCIADAS) {
    const d = Math.hypot(a.lat - lat, a.lon - lon)
    if (d < menorDist) {
      menorDist = d
      anclaMasCercana = a
    }
  }

  // Intentar Reverse Geocoding en Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=17&addressdetails=1`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2800)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LineaLosPatriotasTariba/2.5 (ReverseGeocodeTachira)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      const addr = data.address || {}
      const via =
        addr.road ||
        addr.pedestrian ||
        addr.neighbourhood ||
        addr.suburb ||
        addr.Ult ||
        ''
      const localidad =
        addr.suburb ||
        addr.neighbourhood ||
        addr.town ||
        addr.city ||
        addr.village ||
        anclaMasCercana.nombreOficial

      const nombreCompuesto =
        via && localidad && via !== localidad
          ? `${via}, ${localidad}`
          : via || localidad || `${anclaMasCercana.nombreOficial} (Pin Mapa)`

      return NextResponse.json({
        ok: true,
        nombreLugar: nombreCompuesto,
        anclaCercana: anclaMasCercana.nombreOficial,
        copAncla: anclaMasCercana.copOficial,
        lat,
        lon,
      })
    }
  } catch {
    // Fallback a ancla más cercana
  }

  return NextResponse.json({
    ok: true,
    nombreLugar: `Sector cercano a ${anclaMasCercana.nombreOficial} (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    anclaCercana: anclaMasCercana.nombreOficial,
    copAncla: anclaMasCercana.copOficial,
    lat,
    lon,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const origenTexto: string = body.origen || 'Táriba'
    const destinoTexto: string = body.destino || 'Pueblo Nuevo'
    const coordOrigenExplicita = body.coordOrigen as
      | { lat: number; lon: number }
      | undefined
    const coordDestinoExplicita = body.coordDestino as
      | { lat: number; lon: number }
      | undefined
    const googleApiKey: string | undefined =
      body.googleApiKey ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY

    const [puntoOrigen, puntoDestino] = await Promise.all([
      geocodificarPuntoTachira(origenTexto, coordOrigenExplicita, googleApiKey),
      geocodificarPuntoTachira(destinoTexto, coordDestinoExplicita, googleApiKey),
    ])

    const [rutaTramo1, rutaTramo2] = await Promise.all([
      obtenerRutasVialesOsrm(
        COORD_BASE_TARIBA.lat,
        COORD_BASE_TARIBA.lon,
        puntoOrigen.lat,
        puntoOrigen.lon,
        false
      ),
      obtenerRutasVialesOsrm(
        puntoOrigen.lat,
        puntoOrigen.lon,
        puntoDestino.lat,
        puntoDestino.lon,
        true
      ),
    ])

    const telemetria: TelemetriaRutaMapa = {
      proveedor: 'OSRM_VIAL',
      distanciaTramo1RecogidaKm: rutaTramo1.distanciaKm,
      duracionTramo1RecogidaMin: rutaTramo1.duracionMin,
      distanciaTramo2TrasladoKm: rutaTramo2.distanciaKm,
      duracionTramo2TrasladoMin: rutaTramo2.duracionMin,
      resumenRutaPrincipal: rutaTramo2.resumenVial,
      coordenadasOrigen: {
        lat: puntoOrigen.lat,
        lon: puntoOrigen.lon,
        direccionFormateada: puntoOrigen.direccionFormateada,
      },
      coordenadasDestino: {
        lat: puntoDestino.lat,
        lon: puntoDestino.lon,
        direccionFormateada: puntoDestino.direccionFormateada,
      },
      geometriaTramo1: rutaTramo1.geometria,
      geometriaTramo2: rutaTramo2.geometria,
      alternativas: rutaTramo2.alternativas,
      rutaSeleccionadaIndice: 0,
    }

    return NextResponse.json({
      ok: true,
      telemetria,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al calcular la ruta vial en el mapa',
      },
      { status: 400 }
    )
  }
}
