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
  | 'RUTA_EXACTA_MAPA_VIAL'
  | 'RUTA_ENTRENADA_OPERADOR'

export interface AlternativaRutaMapa {
  indice: number
  resumen: string
  distanciaKm: number
  duracionMin: number
  geometria?: [number, number][]
  esMejorRuta: boolean
}

export interface TelemetriaRutaMapa {
  proveedor: 'GOOGLE_MAPS' | 'OSRM_VIAL'
  distanciaTramo1RecogidaKm: number
  duracionTramo1RecogidaMin: number
  distanciaTramo2TrasladoKm: number
  duracionTramo2TrasladoMin: number
  resumenRutaPrincipal: string
  coordenadasOrigen?: {
    lat: number
    lon: number
    direccionFormateada?: string
  }
  coordenadasDestino?: {
    lat: number
    lon: number
    direccionFormateada?: string
  }
  geometriaTramo1?: [number, number][]
  geometriaTramo2?: [number, number][]
  alternativas?: AlternativaRutaMapa[]
  rutaSeleccionadaIndice?: number
}

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
  tipoTabla:
    | 'Hoja 6 (Base Táriba)'
    | 'Hoja 6 (Combinación)'
    | 'Hoja 4 (Viaje Largo)'
    | 'Ancla Entrenada'
  copOficial: number
  distanciaAlPuntoKm: number
  ajustePorDistanciaCop: number
  tarifaInferidaPuntoCop: number
  coordenadas: { lat: number; lon: number }
  esEntrenada?: boolean
}

export type ModoAprendizajeTarifa = 'completo' | 'zonal_ancla' | 'solo_formula'

export interface AnclaAprendidaItem {
  id: string
  nombreOficial: string
  copOficial: number
  copAnterior?: number
  tipoTabla:
    | 'Hoja 6 (Base Táriba)'
    | 'Hoja 6 (Combinación)'
    | 'Hoja 4 (Viaje Largo)'
    | 'Ancla Entrenada'
  lat: number
  lon: number
  topografia: TopografiaTachira
  municipio?: string
  clavesAsociadas: string[]
  fechaActualizacion: string
}

export interface EjemploRutaImpactada {
  origen: string
  destino: string
  descripcionZona: string
  copAntes: number
  copDespues: number
  diferenciaCop: number
  motivoCambio: string
}

export interface LeccionEntrenamiento {
  id: string
  fecha: string
  origen: string
  destino: string
  sectorOrigen: string
  sectorDestino: string
  reglaOriginal: ReglaAplicada
  topografia: TopografiaTachira
  distanciaVialKm: number
  subtotalSistemaAnteriorCop: number
  subtotalEntrenadoCop: number
  totalSistemaAnteriorCop: number
  totalEntrenadoCop: number
  deltaCop: number
  deltaPorcentaje: number
  coordenadasOrigen: { lat: number; lon: number }
  coordenadasDestino: { lat: number; lon: number }
  modoAprendizaje: ModoAprendizajeTarifa
  propagoCorredorVecino: boolean
  ajustesAplicados: {
    parametroModificado?: string
    valorAnterior?: number
    valorNuevo?: number
    anclaActualizada?: string
    rutasVecinasActualizadas?: number
    resumenAprendizaje: string[]
  }
}

export interface EstadoAprendizajeMotor {
  tasaAprendizajeAlpha: number // Default: 0.45 (45% peso a la nueva corrección)
  lecciones: LeccionEntrenamiento[]
  anclasAprendidas: AnclaAprendidaItem[]
  factoresZonales: Record<TopografiaTachira, number>
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
  telemetriaMapa?: TelemetriaRutaMapa
  aprendizajeAplicado?: {
    leccionesActivas: number
    usandoAnclaEntrenada: boolean
    factorZonalAplicado: number
  }
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
