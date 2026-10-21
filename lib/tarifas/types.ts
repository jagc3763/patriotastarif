export type TipoRutaCatalogo = 'base' | 'combinacion' | 'largo'

export type TopografiaTachira = 'urbano' | 'troncal' | 'montana' | 'frontera'

export type ReglaAplicada =
  | 'OFICIAL_DESDE_TARIBA'
  | 'OFICIAL_HACIA_TARIBA'
  | 'COMBINACION_PACTADA'
  | 'VIAJE_LARGO_OFICIAL'
  | 'DESPACHO_RADIAL_MATRIZ'
  | 'INFERENCIA_ANCLA_VECINA'
  | 'ESTIMACION_TOPOGRAFICA_KM'
  | 'IA_GEORREFERENCIADA_OSRM'

export type NivelConfianzaTarifa =
  | 'OFICIAL_100'
  | 'ALTA_ANCLA_VECINA'
  | 'MEDIA_TRIANGULACION'
  | 'IA_RUTEO_VIAL'

export interface RutaBaseItem {
  id: string
  tipo: 'base'
  origen: string
  destino: string
  cop_raw: number
  cop: number
}

export interface CombinacionItem {
  id: string
  tipo: 'combinacion'
  raw: string
  origen: string
  destino: string
  cop_raw: number
  cop: number
}

export interface ViajeLargoItem {
  id: string
  tipo: 'largo'
  origen: string
  destino: string
  usd: number | null
  cop: number | null
}

export interface TarifasTachiraDB {
  origen_base_default: string
  combinaciones: CombinacionItem[]
  rutas_base: RutaBaseItem[]
  viajes_largos: ViajeLargoItem[]
}

export interface SectorCoordenada {
  clave: string
  nombre: string
  municipio?: string
  lat: number
  lon: number
  altitudMsnm?: number
  tipo: TopografiaTachira
  anclaOficial?: string
  copAnclaReferencia?: number
  aliases?: string[]
}

export interface AnclaTarifariaReferencia {
  nombreOficial: string
  tipoTabla: 'Hoja 6 (Base Táriba)' | 'Hoja 6 (Combinación)' | 'Hoja 4 (Viaje Largo)'
  copOficial: number
  distanciaAlPuntoKm: number
  ajustePorDistanciaCop: number
  tarifaInferidaPuntoCop: number
  coordenadas: { lat: number; lon: number }
}

export interface ParametrosMotorTarifas {
  tasaCopPorUsd: number // Default: 3800 COP = 1 USD
  tasaBcvPorUsd: number // Default: 45.00 Bs = 1 USD
  tarifaMinimaBaseCop: number // Default: 10000 COP
  kmIncluidosBase: number // Default: 2.5 km
  costoKmUrbano: number // Default: 1500 COP/km
  costoKmTroncal: number // Default: 1850 COP/km
  costoKmMontana: number // Default: 2400 COP/km
  costoKmFrontera: number // Default: 2600 COP/km
  factorCurvasAndinas: number // Default: 1.38
  factorRecogidaRadial: number // Default: 1.0 (100% del Tramo 1 Táriba -> Origen)
  aplicarRedondeoComercial: boolean // Default: true
  recargoNocturnoPct: number // Default: 20
  recargoLluviaPct: number // Default: 10
  recargoFeriadoPct: number // Default: 15
  costoParadaExtraCop: number // Default: 4000 COP
  costoMinutoEsperaCop: number // Default: 500 COP
}

export interface OpcionesViaje {
  nocturno: boolean
  lluvia: boolean
  feriado: boolean
  paradasExtra: number
  minutosEspera: number
}

export interface ResultadoCalculoTarifa {
  origenInput: string
  destinoInput: string
  sectorOrigenDetectado: string
  sectorDestinoDetectado: string
  reglaAplicada: ReglaAplicada
  tituloRegla: string
  detalleExplicacion: string
  esOficial: boolean
  nivelConfianza: NivelConfianzaTarifa
  porcentajeConfianza: number
  topografiaDominante: TopografiaTachira
  distanciaVialKm: number
  distanciaRecogidaKm: number
  tiempoEstimadoMin: number
  tramo1RecogidaCop: number
  tramo2TrasladoCop: number
  subtotalBaseCop: number
  porcentajeRecargoTotal: number
  montoRecargosCop: number
  montoExtrasCop: number
  totalSinRedondearCop: number
  totalCop: number
  totalUsd: number
  totalVesBcv: number
  rangoSugeridoMinCop: number
  rangoSugeridoMaxCop: number
  tasaCopUsada: number
  tasaBcvUsada: number
  coordenadasOrigen: { lat: number; lon: number }
  coordenadasDestino: { lat: number; lon: number }
  anclaOrigenUsada?: AnclaTarifariaReferencia
  anclaDestinoUsada?: AnclaTarifariaReferencia
  anclasCercanasDestino?: AnclaTarifariaReferencia[]
  pasosRazonamiento: string[]
  advertenciaCorreccion?: string
  analisisIA?: AnalisisTarifarioIA
}

export interface AnalisisTarifarioIA {
  origenInterpretado: string
  municipioOrigen: string
  destinoInterpretado: string
  municipioDestino: string
  topografiaDetectada: TopografiaTachira
  distanciaCarreteraOsrmKm: number | null
  distanciaRecogidaOsrmKm: number | null
  duracionCarreteraMin: number | null
  anclaOficialOrigen: string
  copAnclaOrigen: number
  anclaOficialDestino: string
  copAnclaDestino: number
  tramo1SugeridoCop: number
  tramo2SugeridoCop: number
  tarifaBaseSugeridaCop: number
  rangoMinCop: number
  rangoMaxCop: number
  razonamientoExperto: string
  factoresConsiderados: string[]
  fuenteGeometria: 'OSRM_CARRETERA_REAL' | 'HAVERSINE_TOPOGRAFICO'
}

export interface SugerenciaLugar {
  texto: string
  subtitulo: string
  categoria:
    | 'Base Táriba'
    | 'Sector Urbano'
    | 'Combinación'
    | 'Viaje Largo'
    | 'Punto No Contemplado (IA)'
  copReferencia?: number
  usdReferencia?: number
}
