'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  AnclaTarifariaReferencia,
  AlternativaRutaMapa,
  TelemetriaRutaMapa,
} from '@/lib/tarifas/types'
import { COORD_BASE_TARIBA } from '@/lib/tarifas/geografia-tachira'
import {
  Map as MapIcon,
  Navigation,
  MapPin,
  Route,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Compass,
  Crosshair,
  Layers,
  Sparkles,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'

interface MapaRutaInteractivoProps {
  origen: string
  destino: string
  coordenadasOrigen: { lat: number; lon: number }
  coordenadasDestino: { lat: number; lon: number }
  anclaDestino?: AnclaTarifariaReferencia
  totalCop: number
  esOficial: boolean
  telemetriaActual: TelemetriaRutaMapa | null
  onChangeTelemetria: (nueva: TelemetriaRutaMapa | null) => void
  onSeleccionarPuntoEnMapa: (
    tipo: 'origen' | 'destino',
    nombreLugar: string,
    coords: { lat: number; lon: number }
  ) => void
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any
  }
}

export function MapaRutaInteractivo({
  origen,
  destino,
  coordenadasOrigen,
  coordenadasDestino,
  anclaDestino,
  totalCop,
  esOficial,
  telemetriaActual,
  onChangeTelemetria,
  onSeleccionarPuntoEnMapa,
}: MapaRutaInteractivoProps) {
  const envGoogleKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || ''

  const [googleApiKeyInput, setGoogleApiKeyInput] = useState<string>(envGoogleKey)
  const [googleApiKeyActiva, setGoogleApiKeyActiva] = useState<string>(envGoogleKey)
  const [mostrarConfigKey, setMostrarConfigKey] = useState<boolean>(false)
  const [mostrarKeyTexto, setMostrarKeyTexto] = useState<boolean>(false)

  const [motorMapa, setMotorMapa] = useState<'google' | 'osm_vial'>(
    envGoogleKey ? 'google' : 'osm_vial'
  )
  const [estiloCapaOsm, setEstiloCapaOsm] = useState<'oscuro' | 'calles' | 'topografico'>('calles')
  const [modoClicMapa, setModoClicMapa] = useState<'ninguno' | 'origen' | 'destino'>('ninguno')

  const [cargandoRuta, setCargandoRuta] = useState<boolean>(false)
  const [errorGoogleSdk, setErrorGoogleSdk] = useState<string | null>(null)
  const [googleSdkListo, setGoogleSdkListo] = useState<boolean>(false)

  // Coordenadas explícitas cuando el usuario hace clic o arrastra un marcador en el mapa
  const [coordExplicitaOrigen, setCoordExplicitaOrigen] = useState<{
    lat: number
    lon: number
  } | null>(null)
  const [coordExplicitaDestino, setCoordExplicitaDestino] = useState<{
    lat: number
    lon: number
  } | null>(null)

  const ultimoOrigenTextoRef = useRef<string>(origen)
  const ultimoDestinoTextoRef = useRef<string>(destino)

  // Si el usuario escribe otro lugar distinto en el buscador, limpiamos la coordenada explícita de pin manual
  useEffect(() => {
    if (origen !== ultimoOrigenTextoRef.current) {
      ultimoOrigenTextoRef.current = origen
      setCoordExplicitaOrigen(null)
    }
  }, [origen])

  useEffect(() => {
    if (destino !== ultimoDestinoTextoRef.current) {
      ultimoDestinoTextoRef.current = destino
      setCoordExplicitaDestino(null)
    }
  }, [destino])

  // Referencias para Leaflet (Mapa Vial Gratuito OSM + OSRM)
  const leafletContainerRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletLayerGroupRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletTileLayerRef = useRef<any>(null)
  const modoClicRef = useRef<'ninguno' | 'origen' | 'destino'>('ninguno')

  useEffect(() => {
    modoClicRef.current = modoClicMapa
  }, [modoClicMapa])

  // Referencias para Google Maps JS SDK Oficial
  const googleMapContainerRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleMapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleDirectionsRendererRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleTramo1LineRef = useRef<any>(null)

  // Resolver un clic o arrastre en el mapa a nombre de calle/sector en Táchira
  const manejarPinEnMapa = useCallback(
    async (tipo: 'origen' | 'destino', lat: number, lon: number) => {
      const latRed = Number(lat.toFixed(5))
      const lonRed = Number(lon.toFixed(5))
      try {
        const res = await fetch(
          `/api/tarifas/ruta-mapa?lat=${latRed}&lon=${lonRed}`
        )
        const data = await res.json()
        const nombreDetectado =
          data.ok && data.nombreLugar
            ? data.nombreLugar
            : `Pin en Mapa (${latRed.toFixed(4)}, ${lonRed.toFixed(4)})`

        if (tipo === 'origen') {
          ultimoOrigenTextoRef.current = nombreDetectado
          setCoordExplicitaOrigen({ lat: latRed, lon: lonRed })
        } else {
          ultimoDestinoTextoRef.current = nombreDetectado
          setCoordExplicitaDestino({ lat: latRed, lon: lonRed })
        }

        onSeleccionarPuntoEnMapa(tipo, nombreDetectado, {
          lat: latRed,
          lon: lonRed,
        })
        setModoClicMapa('ninguno')
      } catch {
        const fallbackNombre = `Punto GPS (${latRed.toFixed(4)}, ${lonRed.toFixed(4)})`
        if (tipo === 'origen') {
          ultimoOrigenTextoRef.current = fallbackNombre
          setCoordExplicitaOrigen({ lat: latRed, lon: lonRed })
        } else {
          ultimoDestinoTextoRef.current = fallbackNombre
          setCoordExplicitaDestino({ lat: latRed, lon: lonRed })
        }
        onSeleccionarPuntoEnMapa(tipo, fallbackNombre, {
          lat: latRed,
          lon: lonRed,
        })
        setModoClicMapa('ninguno')
      }
    },
    [onSeleccionarPuntoEnMapa]
  )

  // 1. Consultar la ruta vial exacta desde nuestro endpoint (/api/tarifas/ruta-mapa)
  useEffect(() => {
    let cancelado = false
    const timer = setTimeout(async () => {
      if (!origen.trim() || !destino.trim()) return
      setCargandoRuta(true)
      try {
        const res = await fetch('/api/tarifas/ruta-mapa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origen,
            destino,
            coordOrigen: coordExplicitaOrigen || undefined,
            coordDestino: coordExplicitaDestino || undefined,
            googleApiKey: googleApiKeyActiva || undefined,
          }),
        })
        const data = await res.json()
        if (!cancelado && data.ok && data.telemetria) {
          // Si estamos en modo Google Maps y Google Directions ya calculó, no sobreescribimos salvo que estemos en modo OSM
          if (motorMapa === 'osm_vial' || !googleSdkListo) {
            onChangeTelemetria(data.telemetria)
          }
        }
      } catch {
        // Silencioso, usa fallback del motor
      } finally {
        if (!cancelado) setCargandoRuta(false)
      }
    }, 260)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [
    origen,
    destino,
    coordExplicitaOrigen,
    coordExplicitaDestino,
    googleApiKeyActiva,
    motorMapa,
    googleSdkListo,
    onChangeTelemetria,
  ])

  // 2. Cargar Google Maps JavaScript SDK cuando el usuario activa su API Key
  useEffect(() => {
    if (motorMapa !== 'google' || !googleApiKeyActiva) return

    if (typeof window !== 'undefined' && window.google?.maps) {
      setGoogleSdkListo(true)
      setErrorGoogleSdk(null)
      return
    }

    const existingScript = document.getElementById('google-maps-sdk-script')
    if (existingScript) {
      existingScript.remove()
    }

    setErrorGoogleSdk(null)
    const script = document.createElement('script')
    script.id = 'google-maps-sdk-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      googleApiKeyActiva
    )}&libraries=places,geometry&language=es&region=VE`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google?.maps) {
        setGoogleSdkListo(true)
        setErrorGoogleSdk(null)
      } else {
        setErrorGoogleSdk(
          'No se pudo inicializar Google Maps con esta clave. Se mantiene activo el Mapa Vial OSRM.'
        )
      }
    }

    script.onerror = () => {
      setErrorGoogleSdk(
        'Error de red o API Key inválida al cargar Google Maps JS API. Verifica tu clave o usa el Mapa Vial Gratuito.'
      )
      setGoogleSdkListo(false)
    }

    document.head.appendChild(script)
  }, [motorMapa, googleApiKeyActiva])

  // 3. Renderizar y trazar la Mejor Ruta en Google Maps Oficial cuando está activo
  useEffect(() => {
    if (
      motorMapa !== 'google' ||
      !googleSdkListo ||
      !googleMapContainerRef.current ||
      !window.google?.maps
    ) {
      return
    }

    const gmaps = window.google.maps

    if (!googleMapInstanceRef.current) {
      googleMapInstanceRef.current = new gmaps.Map(
        googleMapContainerRef.current,
        {
          center: { lat: COORD_BASE_TARIBA.lat, lng: COORD_BASE_TARIBA.lon },
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }
      )

      googleDirectionsRendererRef.current = new gmaps.DirectionsRenderer({
        map: googleMapInstanceRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#10b981',
          strokeOpacity: 0.95,
          strokeWeight: 6,
        },
      })

      // Permitir clic en el mapa de Google para fijar origen o destino
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      googleMapInstanceRef.current.addListener('click', (e: any) => {
        if (!e.latLng) return
        const tipo =
          modoClicRef.current !== 'ninguno' ? modoClicRef.current : 'destino'
        manejarPinEnMapa(tipo, e.latLng.lat(), e.latLng.lng())
      })
    }

    const directionsService = new gmaps.DirectionsService()
    const origLat =
      coordExplicitaOrigen?.lat ??
      telemetriaActual?.coordenadasOrigen?.lat ??
      coordenadasOrigen.lat
    const origLon =
      coordExplicitaOrigen?.lon ??
      telemetriaActual?.coordenadasOrigen?.lon ??
      coordenadasOrigen.lon
    const destLat =
      coordExplicitaDestino?.lat ??
      telemetriaActual?.coordenadasDestino?.lat ??
      coordenadasDestino.lat
    const destLon =
      coordExplicitaDestino?.lon ??
      telemetriaActual?.coordenadasDestino?.lon ??
      coordenadasDestino.lon

    setCargandoRuta(true)

    directionsService.route(
      {
        origin: { lat: origLat, lng: origLon },
        destination: { lat: destLat, lng: destLon },
        travelMode: gmaps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        region: 'VE',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result: any, status: string) => {
        setCargandoRuta(false)
        if (status === 'OK' && result?.routes?.length > 0) {
          googleDirectionsRendererRef.current?.setDirections(result)

          // Dibujar línea punteada desde Base Táriba hasta el punto de recogida si no sale de Táriba
          if (googleTramo1LineRef.current) {
            googleTramo1LineRef.current.setMap(null)
          }
          const distBaseAOrig = Math.hypot(
            origLat - COORD_BASE_TARIBA.lat,
            origLon - COORD_BASE_TARIBA.lon
          )
          if (distBaseAOrig > 0.002) {
            googleTramo1LineRef.current = new gmaps.Polyline({
              path: [
                { lat: COORD_BASE_TARIBA.lat, lng: COORD_BASE_TARIBA.lon },
                { lat: origLat, lng: origLon },
              ],
              geodesic: true,
              strokeColor: '#f59e0b',
              strokeOpacity: 0.85,
              strokeWeight: 4,
              map: googleMapInstanceRef.current,
            })
          }

          // Extraer todas las alternativas de Google Maps Directions y actualizar la tarifa
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const alternativasGoogle: AlternativaRutaMapa[] = result.routes.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any, idx: number) => {
              const leg = r.legs?.[0]
              const distKm = Number(((leg?.distance?.value || 1000) / 1000).toFixed(2))
              const durMin = Math.max(
                3,
                Math.round((leg?.duration?.value || 300) / 60)
              )
              return {
                indice: idx,
                resumen: r.summary || `Ruta Google Maps #${idx + 1}`,
                distanciaKm: distKm,
                duracionMin: durMin,
                esMejorRuta: idx === 0,
              }
            }
          )

          const mejor = alternativasGoogle[0]
          const leg0 = result.routes[0]?.legs?.[0]

          onChangeTelemetria({
            proveedor: 'GOOGLE_MAPS',
            distanciaTramo1RecogidaKm:
              telemetriaActual?.distanciaTramo1RecogidaKm ?? 0,
            duracionTramo1RecogidaMin:
              telemetriaActual?.duracionTramo1RecogidaMin ?? 0,
            distanciaTramo2TrasladoKm: mejor.distanciaKm,
            duracionTramo2TrasladoMin: mejor.duracionMin,
            resumenRutaPrincipal: mejor.resumen,
            coordenadasOrigen: {
              lat: origLat,
              lon: origLon,
              direccionFormateada: leg0?.start_address || origen,
            },
            coordenadasDestino: {
              lat: destLat,
              lon: destLon,
              direccionFormateada: leg0?.end_address || destino,
            },
            alternativas: alternativasGoogle,
            rutaSeleccionadaIndice: 0,
          })
        } else {
          setErrorGoogleSdk(
            `Google Directions respondió "${status}". Verifica que Directions API esté habilitada en tu Google Cloud Console.`
          )
        }
      }
    )
  }, [
    motorMapa,
    googleSdkListo,
    origen,
    destino,
    coordenadasOrigen.lat,
    coordenadasOrigen.lon,
    coordenadasDestino.lat,
    coordenadasDestino.lon,
    coordExplicitaOrigen,
    coordExplicitaDestino,
    manejarPinEnMapa,
    onChangeTelemetria,
    telemetriaActual?.coordenadasDestino?.lat,
    telemetriaActual?.coordenadasDestino?.lon,
    telemetriaActual?.coordenadasOrigen?.lat,
    telemetriaActual?.coordenadasOrigen?.lon,
    telemetriaActual?.distanciaTramo1RecogidaKm,
    telemetriaActual?.duracionTramo1RecogidaMin,
  ])

  // 4. Inicializar y actualizar el Mapa Vial Interactivo (Leaflet + OSM + OSRM)
  useEffect(() => {
    if (motorMapa !== 'osm_vial' || !leafletContainerRef.current) return

    let activo = true

    async function renderizarLeaflet() {
      const L = (await import('leaflet')).default
      if (!activo || !leafletContainerRef.current) return

      const urlsCapas: Record<typeof estiloCapaOsm, string> = {
        calles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        oscuro:
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        topografico: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      }

      if (!leafletMapRef.current) {
        const map = L.map(leafletContainerRef.current, {
          center: [COORD_BASE_TARIBA.lat, COORD_BASE_TARIBA.lon],
          zoom: 13,
          zoomControl: true,
        })

        leafletTileLayerRef.current = L.tileLayer(urlsCapas[estiloCapaOsm], {
          maxZoom: 19,
          attribution: '© OpenStreetMap • OSRM Vial Táchira',
        }).addTo(map)

        leafletLayerGroupRef.current = L.layerGroup().addTo(map)

        // Evento de clic en cualquier punto del mapa para fijar Origen o Destino
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng
          const objetivo =
            modoClicRef.current !== 'ninguno' ? modoClicRef.current : 'destino'
          manejarPinEnMapa(objetivo, lat, lng)
        })

        leafletMapRef.current = map
      } else if (leafletTileLayerRef.current) {
        leafletTileLayerRef.current.setUrl(urlsCapas[estiloCapaOsm])
      }

      const map = leafletMapRef.current
      const group = leafletLayerGroupRef.current
      if (!map || !group) return

      group.clearLayers()

      const origLat =
        telemetriaActual?.coordenadasOrigen?.lat ?? coordenadasOrigen.lat
      const origLon =
        telemetriaActual?.coordenadasOrigen?.lon ?? coordenadasOrigen.lon
      const destLat =
        telemetriaActual?.coordenadasDestino?.lat ?? coordenadasDestino.lat
      const destLon =
        telemetriaActual?.coordenadasDestino?.lon ?? coordenadasDestino.lon

      // A. Dibujar rutas alternativas en gris/azul si existen
      const indiceSeleccionado = telemetriaActual?.rutaSeleccionadaIndice ?? 0
      if (
        telemetriaActual?.alternativas &&
        telemetriaActual.alternativas.length > 1
      ) {
        telemetriaActual.alternativas.forEach((alt) => {
          if (alt.indice !== indiceSeleccionado && alt.geometria?.length) {
            const polyAlt = L.polyline(alt.geometria, {
              color: '#64748b',
              weight: 5,
              opacity: 0.55,
              dashArray: '6, 8',
            })
            polyAlt.bindTooltip(
              `Ruta Alternativa: ${alt.resumen} (${alt.distanciaKm} km · ${alt.duracionMin} min)`,
              { sticky: true }
            )
            polyAlt.on('click', () => {
              if (!telemetriaActual) return
              onChangeTelemetria({
                ...telemetriaActual,
                distanciaTramo2TrasladoKm: alt.distanciaKm,
                duracionTramo2TrasladoMin: alt.duracionMin,
                resumenRutaPrincipal: alt.resumen,
                geometriaTramo2: alt.geometria,
                rutaSeleccionadaIndice: alt.indice,
              })
            })
            polyAlt.addTo(group)
          }
        })
      }

      // B. Dibujar Tramo 1 (Despacho Base Táriba -> Punto de Partida) si el origen no es Táriba Base
      const distOrigABase = Math.hypot(
        origLat - COORD_BASE_TARIBA.lat,
        origLon - COORD_BASE_TARIBA.lon
      )
      if (distOrigABase > 0.0025) {
        const coordsTramo1: [number, number][] =
          telemetriaActual?.geometriaTramo1 &&
          telemetriaActual.geometriaTramo1.length > 1
            ? telemetriaActual.geometriaTramo1
            : [
                [COORD_BASE_TARIBA.lat, COORD_BASE_TARIBA.lon],
                [origLat, origLon],
              ]

        const polyTramo1 = L.polyline(coordsTramo1, {
          color: '#f59e0b',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
        })
        polyTramo1.bindTooltip(
          `Tramo 1 (Despacho Base Táriba → Recogida): ~${
            telemetriaActual?.distanciaTramo1RecogidaKm ?? 0
          } km`,
          { sticky: true }
        )
        polyTramo1.addTo(group)
      }

      // C. Dibujar Tramo 2 (Mejor Ruta Punto de Partida -> Punto de Llegada)
      const coordsTramo2: [number, number][] =
        telemetriaActual?.geometriaTramo2 &&
        telemetriaActual.geometriaTramo2.length > 1
          ? telemetriaActual.geometriaTramo2
          : [
              [origLat, origLon],
              [destLat, destLon],
            ]

      // Borde exterior de la mejor ruta para alto contraste
      L.polyline(coordsTramo2, {
        color: '#064e3b',
        weight: 9,
        opacity: 0.65,
      }).addTo(group)

      const polyTramo2 = L.polyline(coordsTramo2, {
        color: '#10b981',
        weight: 5,
        opacity: 1,
      })
      polyTramo2.bindTooltip(
        `Mejor Ruta: ${
          telemetriaActual?.resumenRutaPrincipal || 'Vía Principal'
        } (${telemetriaActual?.distanciaTramo2TrasladoKm ?? 0} km · ${
          telemetriaActual?.duracionTramo2TrasladoMin ?? 0
        } min)`,
        { sticky: true }
      )
      polyTramo2.addTo(group)

      // D. Marcador de Base Central Táriba
      const iconBaseTariba = L.divIcon({
        className: 'custom-pin-tariba',
        html: `<div style="background:#f59e0b;color:#0f172a;font-weight:900;font-size:10px;padding:3px 7px;border-radius:9999px;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.45);white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">
          <span>🚕 BASE TÁRIBA</span>
        </div>`,
        iconSize: [96, 24],
        iconAnchor: [48, 12],
      })

      L.marker([COORD_BASE_TARIBA.lat, COORD_BASE_TARIBA.lon], {
        icon: iconBaseTariba,
      })
        .bindPopup(
          `<strong>Base Central Línea Los Patriotas</strong><br/>Táriba, Municipio Cárdenas (7.8180, -72.2248)`
        )
        .addTo(group)

      // E. Marcador de Punto de Partida (Origen A) - Arrastrable
      const iconOrigen = L.divIcon({
        className: 'custom-pin-origen',
        html: `<div style="background:#0284c7;color:#ffffff;font-weight:800;font-size:11px;padding:4px 9px;border-radius:9999px;border:2px solid #fff;box-shadow:0 4px 14px rgba(2,132,199,0.55);white-space:nowrap;">
          A · Partida
        </div>`,
        iconSize: [84, 26],
        iconAnchor: [42, 13],
      })

      const markerOrigen = L.marker([origLat, origLon], {
        icon: iconOrigen,
        draggable: true,
      })
        .bindPopup(
          `<strong>Punto de Partida (A):</strong> ${origen}<br/><small>Arrastra este pin para ajustar la calle exacta</small>`
        )
        .addTo(group)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markerOrigen.on('dragend', (ev: any) => {
        const pos = ev.target.getLatLng()
        manejarPinEnMapa('origen', pos.lat, pos.lng)
      })

      // F. Marcador de Punto de Llegada (Destino B) - Arrastrable
      const iconDestino = L.divIcon({
        className: 'custom-pin-destino',
        html: `<div style="background:#10b981;color:#052e16;font-weight:900;font-size:11px;padding:4px 10px;border-radius:9999px;border:2px solid #fff;box-shadow:0 4px 14px rgba(16,185,129,0.6);white-space:nowrap;">
          B · Llegada (${totalCop.toLocaleString('es-CO')} COP)
        </div>`,
        iconSize: [150, 26],
        iconAnchor: [75, 13],
      })

      const markerDestino = L.marker([destLat, destLon], {
        icon: iconDestino,
        draggable: true,
      })
        .bindPopup(
          `<strong>Punto de Llegada (B):</strong> ${destino}<br/><strong>Tarifa Calculada:</strong> ${totalCop.toLocaleString(
            'es-CO'
          )} COP<br/><small>Arrastra este pin para ajustar el punto exacto</small>`
        )
        .addTo(group)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markerDestino.on('dragend', (ev: any) => {
        const pos = ev.target.getLatLng()
        manejarPinEnMapa('destino', pos.lat, pos.lng)
      })

      // G. Si no es oficial y hay un Ancla Oficial usada, mostrar el nodo del Ancla en el mapa y su línea de referencia
      if (!esOficial && anclaDestino) {
        const iconAncla = L.divIcon({
          className: 'custom-pin-ancla',
          html: `<div style="background:#9333ea;color:#ffffff;font-weight:800;font-size:10px;padding:3px 8px;border-radius:9999px;border:1.5px dashed #e9d5ff;box-shadow:0 4px 10px rgba(147,51,234,0.45);white-space:nowrap;">
            ⚓ Ancla: ${anclaDestino.nombreOficial} (${(
            anclaDestino.copOficial / 1000
          ).toFixed(0)}k)
          </div>`,
          iconSize: [130, 22],
          iconAnchor: [65, 11],
        })

        L.marker(
          [anclaDestino.coordenadas.lat, anclaDestino.coordenadas.lon],
          { icon: iconAncla }
        )
          .bindPopup(
            `<strong>Ancla Oficial de Referencia:</strong> ${
              anclaDestino.nombreOficial
            }<br/>Tarifa Oficial Excel: ${anclaDestino.copOficial.toLocaleString(
              'es-CO'
            )} COP<br/>Distancia al destino: ${
              anclaDestino.distanciaAlPuntoKm
            } km`
          )
          .addTo(group)

        L.polyline(
          [
            [anclaDestino.coordenadas.lat, anclaDestino.coordenadas.lon],
            [destLat, destLon],
          ],
          {
            color: '#a855f7',
            weight: 2.5,
            opacity: 0.75,
            dashArray: '4, 6',
          }
        ).addTo(group)
      }

      // Ajustar el encuadre del mapa para ver toda la ruta completa
      const puntosEncuadre: [number, number][] = [
        ...coordsTramo2,
        [origLat, origLon],
        [destLat, destLon],
      ]
      if (distOrigABase > 0.0025) {
        puntosEncuadre.push([COORD_BASE_TARIBA.lat, COORD_BASE_TARIBA.lon])
      }
      if (puntosEncuadre.length >= 2) {
        const bounds = L.latLngBounds(puntosEncuadre)
        map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 })
      }
    }

    renderizarLeaflet()

    return () => {
      activo = false
    }
  }, [
    motorMapa,
    estiloCapaOsm,
    origen,
    destino,
    coordenadasOrigen.lat,
    coordenadasOrigen.lon,
    coordenadasDestino.lat,
    coordenadasDestino.lon,
    telemetriaActual,
    anclaDestino,
    totalCop,
    esOficial,
    manejarPinEnMapa,
    onChangeTelemetria,
  ])

  // Limpiar instancia Leaflet al desmontar o cambiar de motor
  useEffect(() => {
    if (motorMapa !== 'osm_vial' && leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
      leafletLayerGroupRef.current = null
      leafletTileLayerRef.current = null
    }
  }, [motorMapa])

  const origLat =
    telemetriaActual?.coordenadasOrigen?.lat ?? coordenadasOrigen.lat
  const origLon =
    telemetriaActual?.coordenadasOrigen?.lon ?? coordenadasOrigen.lon
  const destLat =
    telemetriaActual?.coordenadasDestino?.lat ?? coordenadasDestino.lat
  const destLon =
    telemetriaActual?.coordenadasDestino?.lon ?? coordenadasDestino.lon

  const urlGoogleMapsExterno = `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLon}&destination=${destLat},${destLon}&travelmode=driving`

  const activarGoogleMapsConKey = () => {
    const limpia = googleApiKeyInput.trim()
    if (!limpia) return
    setGoogleApiKeyActiva(limpia)
    setMotorMapa('google')
    setMostrarConfigKey(false)
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/85 overflow-hidden shadow-2xl">
      {/* BARRA SUPERIOR DEL MAPA: SELECTOR DE MOTOR + API KEY + CONTROLES DE CLIC */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-tight">
                Mapa Interactivo de Mejor Ruta y Cálculo Exacto
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                {cargandoRuta ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Trazando ruta vial...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    {motorMapa === 'google' && googleSdkListo
                      ? 'Google Maps Directions Activo'
                      : 'Ruteo Vial GPS OSRM Activo'}
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Visualiza la mejor ruta desde el punto de partida hasta la llegada. Puedes{' '}
              <strong className="text-slate-200">arrastrar los pines A / B</strong> o{' '}
              <strong className="text-slate-200">hacer clic en el mapa</strong> para calibrar la tarifa exacta.
            </p>
          </div>
        </div>

        {/* BOTONES DE MOTOR DE MAPA Y CONFIGURACIÓN DE GOOGLE API KEY */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setMotorMapa('osm_vial')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                motorMapa === 'osm_vial'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Mapa Vial Gratis (OSRM)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (googleApiKeyActiva) {
                  setMotorMapa('google')
                } else {
                  setMostrarConfigKey(true)
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                motorMapa === 'google'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Maps (Tu API)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMostrarConfigKey(!mostrarConfigKey)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
              googleApiKeyActiva
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>
              {googleApiKeyActiva ? 'API Key Google Conectada' : 'Conectar tu Google API Key'}
            </span>
          </button>

          <a
            href={urlGoogleMapsExterno}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors"
            title="Abrir navegación paso a paso en Google Maps"
          >
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Abrir en Google Maps</span>
          </a>
        </div>
      </div>

      {/* PANEL DESPLEGABLE PARA PEGAR LA GOOGLE MAPS API KEY DEL USUARIO */}
      {mostrarConfigKey && (
        <div className="p-4 border-b border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Configura tu Google Maps API Key (Capa Gratuita de Google Cloud)
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Pega tu clave <code className="text-amber-300 font-mono">AIzaSy...</code> aquí para activar el renderizado nativo de{' '}
                <strong>Google Maps + DirectionsService + Places</strong>, o agrégala en la sección{' '}
                <strong>Vars</strong> (arriba a la derecha) como{' '}
                <code className="text-emerald-300 font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type={mostrarKeyTexto ? 'text' : 'password'}
                value={googleApiKeyInput}
                onChange={(e) => setGoogleApiKeyInput(e.target.value)}
                placeholder="Pega tu Google Maps API Key (ej. AIzaSyB...)"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-3.5 pr-10 py-2 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setMostrarKeyTexto(!mostrarKeyTexto)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                aria-label="Mostrar u ocultar API Key"
              >
                {mostrarKeyTexto ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={activarGoogleMapsConKey}
              disabled={!googleApiKeyInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 px-4 py-2 text-xs font-black text-slate-950 transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Activar Google Maps Ahora</span>
            </button>

            {googleApiKeyActiva && (
              <button
                type="button"
                onClick={() => {
                  setGoogleApiKeyActiva('')
                  setGoogleApiKeyInput('')
                  setMotorMapa('osm_vial')
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300"
              >
                Usar Mapa Gratis OSRM
              </button>
            )}
          </div>
        </div>
      )}

      {/* AVISO SI GOOGLE MAPS SDK DEVOLVIÓ ERROR DE KEY O PERMISOS */}
      {errorGoogleSdk && motorMapa === 'google' && (
        <div className="px-4 py-2.5 bg-rose-950/60 border-b border-rose-500/30 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorGoogleSdk}</span>
          </div>
          <button
            type="button"
            onClick={() => setMotorMapa('osm_vial')}
            className="rounded-lg bg-rose-500/20 border border-rose-400/40 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500/30"
          >
            Cambiar a Mapa Vial Gratis OSRM
          </button>
        </div>
      )}

      {/* BARRA DE HERRAMIENTAS INTERACTIVAS SOBRE EL MAPA */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Crosshair className="h-3.5 w-3.5 text-amber-400" />
            Marcar con clic en el mapa:
          </span>

          <button
            type="button"
            onClick={() =>
              setModoClicMapa(modoClicMapa === 'origen' ? 'ninguno' : 'origen')
            }
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all ${
              modoClicMapa === 'origen'
                ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md shadow-sky-500/20'
                : 'bg-slate-950 border-slate-800 text-sky-300 hover:border-sky-500/40'
            }`}
          >
            <Navigation className="h-3 w-3" />
            <span>
              {modoClicMapa === 'origen'
                ? 'Haz clic en el mapa para fijar Partida (A)...'
                : 'Fijar Punto de Partida (A)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setModoClicMapa(
                modoClicMapa === 'destino' ? 'ninguno' : 'destino'
              )
            }
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all ${
              modoClicMapa === 'destino'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 border-slate-800 text-emerald-300 hover:border-emerald-500/40'
            }`}
          >
            <MapPin className="h-3 w-3" />
            <span>
              {modoClicMapa === 'destino'
                ? 'Haz clic en el mapa para fijar Llegada (B)...'
                : 'Fijar Punto de Llegada (B)'}
            </span>
          </button>
        </div>

        {/* CAPAS DEL MAPA */}
        {motorMapa === 'osm_vial' && (
          <div className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-slate-400 mr-1" />
            {(
              [
                { id: 'calles', label: 'Calles Claro' },
                { id: 'oscuro', label: 'Nocturno' },
                { id: 'topografico', label: 'Relieve Andino' },
              ] as const
            ).map((capa) => (
              <button
                key={capa.id}
                type="button"
                onClick={() => setEstiloCapaOsm(capa.id)}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                  estiloCapaOsm === capa.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200'
                }`}
              >
                {capa.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LIENZO PRINCIPAL DEL MAPA */}
      <div className="relative h-[380px] sm:h-[430px] w-full bg-slate-950">
        {motorMapa === 'google' && googleSdkListo ? (
          <div ref={googleMapContainerRef} className="h-full w-full" />
        ) : (
          <div ref={leafletContainerRef} className="h-full w-full z-10" />
        )}

        {/* LEYENDA FLOTANTE DE TRAZADO VIAL */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none rounded-xl border border-slate-800/90 bg-slate-950/90 backdrop-blur-md px-3 py-2 text-[11px] text-slate-200 shadow-xl space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-6 rounded-full bg-emerald-500" />
            <span className="font-bold">
              Mejor Ruta (Partida A → Llegada B):{' '}
              <strong className="text-emerald-400">
                {telemetriaActual?.distanciaTramo2TrasladoKm ?? 0} km
              </strong>{' '}
              ({telemetriaActual?.duracionTramo2TrasladoMin ?? 0} min)
            </span>
          </div>
          {(telemetriaActual?.distanciaTramo1RecogidaKm ?? 0) > 0.3 && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-6 border-b-2 border-dashed border-amber-400" />
              <span className="text-slate-300">
                Despacho Base Táriba → Recogida A:{' '}
                <strong className="text-amber-300">
                  {telemetriaActual?.distanciaTramo1RecogidaKm} km
                </strong>
              </span>
            </div>
          )}
          {!esOficial && anclaDestino && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-6 border-b-2 border-dashed border-purple-400" />
              <span className="text-purple-200">
                Ancla Oficial Vecina: <strong>{anclaDestino.nombreOficial}</strong> (
                {anclaDestino.copOficial.toLocaleString('es-CO')} COP)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PIE DEL MAPA: SELECTOR DE MEJOR RUTA Y RUTAS ALTERNATIVAS ENCONTRADAS */}
      <div className="p-3.5 bg-slate-950/95 border-t border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <Compass className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-300">
              Vía óptima detectada:
            </span>
            <span className="font-extrabold text-emerald-300">
              {telemetriaActual?.resumenRutaPrincipal ||
                'Calculando corredor vial...'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Coordenadas A:{' '}
              <code className="text-slate-200 font-mono text-[11px]">
                {origLat.toFixed(4)}, {origLon.toFixed(4)}
              </code>
            </span>
            <span className="text-slate-400">
              Coordenadas B:{' '}
              <code className="text-slate-200 font-mono text-[11px]">
                {destLat.toFixed(4)}, {destLon.toFixed(4)}
              </code>
            </span>
          </div>
        </div>

        {/* TARJETAS DE RUTAS ALTERNATIVAS (SI HAY MÁS DE UNA OPCIÓN VIAL) */}
        {telemetriaActual?.alternativas &&
          telemetriaActual.alternativas.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {telemetriaActual.alternativas.map((alt) => {
                const seleccionada =
                  (telemetriaActual.rutaSeleccionadaIndice ?? 0) === alt.indice
                return (
                  <button
                    key={`${alt.indice}-${alt.resumen}`}
                    type="button"
                    onClick={() => {
                      onChangeTelemetria({
                        ...telemetriaActual,
                        distanciaTramo2TrasladoKm: alt.distanciaKm,
                        duracionTramo2TrasladoMin: alt.duracionMin,
                        resumenRutaPrincipal: alt.resumen,
                        geometriaTramo2:
                          alt.geometria ?? telemetriaActual.geometriaTramo2,
                        rutaSeleccionadaIndice: alt.indice,
                      })
                    }}
                    className={`text-left rounded-xl border p-2.5 transition-all flex items-center justify-between gap-2 ${
                      seleccionada
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white shadow-md'
                        : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                            alt.esMejorRuta
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {alt.esMejorRuta
                            ? 'Mejor Ruta'
                            : `Alternativa #${alt.indice + 1}`}
                        </span>
                        <span className="text-xs font-bold truncate block">
                          {alt.resumen}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Distancia real: <strong>{alt.distanciaKm} km</strong> ·
                        Tiempo: <strong>~{alt.duracionMin} min</strong>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}
