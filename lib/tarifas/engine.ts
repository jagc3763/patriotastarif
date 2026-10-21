import rawDb from '@/lib/data/tarifas-tachira.json'
import {
  COORD_BASE_TARIBA,
  encontrarAnclasTarifariasCercanas,
  inferirSectorPorDireccionLibre,
  PUNTOS_EXTENDIDOS_TACHIRA,
} from './geografia-tachira'
import {
  AnclaTarifariaReferencia,
  CombinacionItem,
  NivelConfianzaTarifa,
  OpcionesViaje,
  ParametrosMotorTarifas,
  ResultadoCalculoTarifa,
  RutaBaseItem,
  SectorCoordenada,
  SugerenciaLugar,
  TarifasTachiraDB,
  TelemetriaRutaMapa,
  TopografiaTachira,
  ViajeLargoItem,
} from './types'

export const PARAMETROS_DEFAULT: ParametrosMotorTarifas = {
  tasaCopPorUsd: 3800,
  tasaBcvPorUsd: 45.0,
  tarifaMinimaBaseCop: 10000,
  kmIncluidosBase: 2.5,
  costoKmUrbano: 1500,
  costoKmTroncal: 1850,
  costoKmMontana: 2400,
  costoKmFrontera: 2600,
  factorCurvasAndinas: 1.38,
  factorRecogidaRadial: 1.0,
  aplicarRedondeoComercial: true,
  recargoNocturnoPct: 20,
  recargoLluviaPct: 10,
  recargoFeriadoPct: 15,
  costoParadaExtraCop: 4000,
  costoMinutoEsperaCop: 500,
}

export const OPCIONES_VIAJE_DEFAULT: OpcionesViaje = {
  nocturno: false,
  lluvia: false,
  feriado: false,
  paradasExtra: 0,
  minutosEspera: 0,
}

export const SECTORES_GEOREFERENCIADOS: SectorCoordenada[] = [
  {
    clave: 'tariba',
    nombre: 'Táriba (Base Central)',
    lat: 7.818,
    lon: -72.2248,
    tipo: 'urbano',
    aliases: ['plaza bolivar de tariba', 'tariba centro', 'base central', 'hospital de tariba'],
  },
  {
    clave: 'las vegas',
    nombre: 'Las Vegas de Táriba',
    lat: 7.8105,
    lon: -72.2205,
    tipo: 'urbano',
    aliases: ['las vegas p6', 'vegas de tariba', 'parada 6'],
  },
  {
    clave: 'patiecitos',
    nombre: 'Patiecitos',
    lat: 7.835,
    lon: -72.215,
    tipo: 'urbano',
    aliases: ['patiecitos puente'],
  },
  {
    clave: 'arjona',
    nombre: 'Arjona',
    lat: 7.805,
    lon: -72.205,
    tipo: 'urbano',
    aliases: ['arjona 46', 'sector arjona'],
  },
  {
    clave: 'palmira',
    nombre: 'Palmira',
    lat: 7.848,
    lon: -72.208,
    tipo: 'urbano',
    aliases: ['palmira centro', 'estacion palmira', 'abejal'],
  },
  {
    clave: 'centro',
    nombre: 'San Cristóbal Centro (5ta/7ma)',
    lat: 7.7665,
    lon: -72.2325,
    tipo: 'urbano',
    aliases: ['centro 5ta/7ma', '5ta avenida', '7ma avenida', 'centro sc', 'plaza bolivar sc'],
  },
  {
    clave: 'barrio obrero',
    nombre: 'Barrio Obrero',
    lat: 7.7735,
    lon: -72.218,
    tipo: 'urbano',
    aliases: ['b.obrero', 'b obrero', 'plaza los mangos', 'calle 14'],
  },
  {
    clave: 'pueblo nuevo',
    nombre: 'Pueblo Nuevo',
    lat: 7.798,
    lon: -72.205,
    tipo: 'urbano',
    aliases: ['p.nuevo', 'p nuevo', 'estadio pueblo nuevo', 'plaza de toros'],
  },
  {
    clave: 'pirineos',
    nombre: 'Pirineos I / II',
    lat: 7.785,
    lon: -72.198,
    tipo: 'urbano',
    aliases: ['pirineos i', 'pirineos ii', 'altos de pirineos', 'colinas de pirineos'],
  },
  {
    clave: 'hospital central',
    nombre: 'Hospital Central',
    lat: 7.761,
    lon: -72.215,
    tipo: 'urbano',
    aliases: ['hospital militar', 'policlinica tachira', 'cruz roja'],
  },
  {
    clave: 'terminal',
    nombre: 'Terminal de Pasajeros SC',
    lat: 7.752,
    lon: -72.235,
    tipo: 'urbano',
    aliases: ['terminal la concordia'],
  },
  {
    clave: 'sambil',
    nombre: 'Sambil San Cristóbal',
    lat: 7.802,
    lon: -72.218,
    tipo: 'urbano',
    aliases: ['centro comercial sambil', 'autopista sambil'],
  },
  {
    clave: 'concordia',
    nombre: 'La Concordia',
    lat: 7.758,
    lon: -72.23,
    tipo: 'urbano',
    aliases: ['mercado', 'mercado la concordia'],
  },
  {
    clave: 'barrio sucre',
    nombre: 'Barrio Sucre',
    lat: 7.782,
    lon: -72.228,
    tipo: 'urbano',
    aliases: ['b.sucre', 'b sucre'],
  },
  {
    clave: 'barrio libertador',
    nombre: 'Barrio Libertador',
    lat: 7.779,
    lon: -72.225,
    tipo: 'urbano',
    aliases: ['b.libertador', 'b libertador'],
  },
  {
    clave: 'unidad vecinal',
    nombre: 'Unidad Vecinal',
    lat: 7.75,
    lon: -72.222,
    tipo: 'urbano',
  },
  {
    clave: 'unet',
    nombre: 'UNET (Paramillo)',
    lat: 7.8,
    lon: -72.2,
    tipo: 'urbano',
    aliases: ['altos de paramillo', 'zona ind. paramillo', 'ucat nueva', 'ucat vieja'],
  },
  {
    clave: 'ula',
    nombre: 'ULA (Pamplonita)',
    lat: 7.786,
    lon: -72.212,
    tipo: 'urbano',
  },
  {
    clave: 'junco',
    nombre: 'El Junco',
    lat: 7.828,
    lon: -72.192,
    tipo: 'montana',
    aliases: ['junco 46', 'junco paramo', 'junco 1er matadero', 'junco matadero1', 'junco viejo'],
  },
  {
    clave: 'cordero',
    nombre: 'Cordero',
    lat: 7.865,
    lon: -72.185,
    tipo: 'troncal',
    aliases: ['cordero plaza bolivar', 'cordero plaza', 'cordero esguarna', 'cordero manuel felip', 'cordero m.felipe'],
  },
  {
    clave: 'capacho',
    nombre: 'Capacho (Independencia / Libertad)',
    lat: 7.795,
    lon: -72.345,
    tipo: 'montana',
    aliases: ['capacho indep', 'capacho liberta', 'capcho cristo y ornos'],
  },
  {
    clave: 'capachito',
    nombre: 'Capachito',
    lat: 7.812,
    lon: -72.242,
    tipo: 'montana',
    aliases: ['capachito urb', 'capachito p/a', 'capachito p/b'],
  },
  {
    clave: 'rubio',
    nombre: 'Rubio',
    lat: 7.705,
    lon: -72.355,
    tipo: 'troncal',
    aliases: ['berlin via rubio', 'el tope via rubio', 'lagunilla via rubio'],
  },
  {
    clave: 'aerop san antonio',
    nombre: 'Aeropuerto San Antonio',
    lat: 7.85,
    lon: -72.44,
    tipo: 'frontera',
    aliases: ['aeropuerto san antonio', 'san antonio del tachira'],
  },
  {
    clave: 'aerop santo dom',
    nombre: 'Aeropuerto Santo Domingo',
    lat: 7.585,
    lon: -72.065,
    tipo: 'troncal',
    aliases: ['aeropuerto santo domingo', 'el piñal', 'el pinal'],
  },
  {
    clave: 'san josesito',
    nombre: 'San Josesito (Torbes)',
    lat: 7.625,
    lon: -72.235,
    tipo: 'troncal',
    aliases: ['el corozo'],
  },
  {
    clave: 'peribeca',
    nombre: 'Peribeca',
    lat: 7.815,
    lon: -72.305,
    tipo: 'montana',
    aliases: ['peribeca iglecia', 'peribeca iglesia'],
  },
  {
    clave: 'la fria',
    nombre: 'La Fría',
    lat: 8.215,
    lon: -72.245,
    tipo: 'troncal',
  },
  {
    clave: 'la grita',
    nombre: 'La Grita',
    lat: 8.135,
    lon: -71.985,
    tipo: 'montana',
  },
  {
    clave: 'colon',
    nombre: 'San Juan de Colón',
    lat: 8.035,
    lon: -72.26,
    tipo: 'troncal',
  },
  {
    clave: 'michelena',
    nombre: 'Michelena',
    lat: 7.945,
    lon: -72.245,
    tipo: 'troncal',
  },
  {
    clave: 'lobatera',
    nombre: 'Lobatera',
    lat: 7.915,
    lon: -72.255,
    tipo: 'troncal',
  },
  {
    clave: 'santa ana',
    nombre: 'Santa Ana del Táchira',
    lat: 7.645,
    lon: -72.285,
    tipo: 'troncal',
  },
  {
    clave: 'borota',
    nombre: 'Borotá',
    lat: 7.885,
    lon: -72.255,
    tipo: 'montana',
  },
  {
    clave: 'zorca',
    nombre: 'Zorca (Providencia / San Isidro / Pie de Cuesta)',
    lat: 7.785,
    lon: -72.275,
    tipo: 'montana',
    aliases: ['zorca providencia', 'zorca san isidro', 'zorca pie de cuesta'],
  },
  {
    clave: 'margaritas',
    nombre: 'Las Margaritas de Táriba',
    lat: 7.825,
    lon: -72.222,
    tipo: 'urbano',
    aliases: ['margaritas policia', 'margaritas carrascal', 'margaritas pol'],
  },
  {
    clave: 'sabaneta',
    nombre: 'Sabaneta',
    lat: 7.815,
    lon: -72.235,
    tipo: 'urbano',
    aliases: ['sabaneta t-6', 'sabaneta r-1'],
  },
  {
    clave: 'el torbes',
    nombre: 'El Torbes',
    lat: 7.808,
    lon: -72.232,
    tipo: 'urbano',
    aliases: ['el torbes salao', 'el torbes villa sol'],
  },
  {
    clave: 'caneyes',
    nombre: 'Caneyes / Boca de Caneyes',
    lat: 7.838,
    lon: -72.228,
    tipo: 'urbano',
    aliases: ['boca caneyes', 'boca caneyes p/a', 'bocas c'],
  },
  {
    clave: 'tucape',
    nombre: 'Tucapé',
    lat: 7.822,
    lon: -72.21,
    tipo: 'urbano',
    aliases: ['tucape p/a', 'tucape bella vista', 'tucape matadero'],
  },
  {
    clave: 'diamante',
    nombre: 'El Diamante',
    lat: 7.812,
    lon: -72.212,
    tipo: 'urbano',
    aliases: ['diamante 12p', 'diamant la victoria'],
  },
  {
    clave: 'machiri',
    nombre: 'Machirí',
    lat: 7.795,
    lon: -72.225,
    tipo: 'urbano',
    aliases: ['machiri cruce', 'machiri p/a'],
  },
  {
    clave: 'el mirador',
    nombre: 'El Mirador',
    lat: 7.77,
    lon: -72.25,
    tipo: 'montana',
    aliases: ['el mirador alcabala', 'el mirador cement'],
  },
  {
    clave: 'san rafael',
    nombre: 'San Rafael de Cordero',
    lat: 7.845,
    lon: -72.195,
    tipo: 'montana',
    aliases: ['san rafael 46', 'san rafael cruce', 'san rafael garcia', 'san rafael y', 'san rafael pa', 'san rafael 12otc'],
  },
  {
    clave: 'barrancas',
    nombre: 'Barrancas',
    lat: 7.805,
    lon: -72.215,
    tipo: 'urbano',
    aliases: ['barrancas p/b', 'barrancas p/a ppal', 'barrancas la loma'],
  },
  {
    clave: 'llanitos',
    nombre: 'Los Llanitos',
    lat: 7.835,
    lon: -72.198,
    tipo: 'urbano',
    aliases: ['laja llanitos'],
  },
  {
    clave: 'hiranzo',
    nombre: 'El Hiranzo',
    lat: 7.828,
    lon: -72.202,
    tipo: 'urbano',
    aliases: ['el hiranzo', 'hiranzo p/a'],
  },
  {
    clave: 'el vegon',
    nombre: 'El Vegón',
    lat: 7.814,
    lon: -72.23,
    tipo: 'urbano',
  },
]

/**
 * Normaliza texto quitando tildes, expandiendo abreviaturas típicas del Excel
 * de Los Patriotas (ej. B.Obrero -> barrio obrero, P.Nuevo -> pueblo nuevo)
 */
export function normalizarTextoTachira(texto: string): string {
  if (!texto) return ''
  let s = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  // Expansiones de abreviaturas comunes en el Excel de la línea
  s = s
    .replace(/\bb\.?\s*obrero\b/g, 'barrio obrero')
    .replace(/\bp\.?\s*nuevo\b/g, 'pueblo nuevo')
    .replace(/\bb\.?\s*sucre\b/g, 'barrio sucre')
    .replace(/\bb\.?\s*libertador\b/g, 'barrio libertador')
    .replace(/\bbocas\s+c\b/g, 'boca caneyes')
    .replace(/\bmargaritas\s+pol\b/g, 'margaritas policia')
    .replace(/\bcordero\s+m\.?\s*felipe\b/g, 'cordero manuel felip')
    .replace(/\bjunco\s+matadero1\b/g, 'junco 1er matadero')
    .replace(/\blomas\s+b\.?\s*parada\.?\s*b\b/g, 'lomas b. parada b')
    .replace(/\blomas\s+b\.?\s*flamingo\b/g, 'lomas b. flamingo')
    .replace(/\s+/g, ' ')

  return s
}

/**
 * Carga y sanea la base de datos JSON corrigiendo los errores de parseo de '/' del Excel original:
 * - comb_25: "Capachito P/B/Centro" tenía origen="Capachito P", destino="B" -> corregido a origen="Capachito P/B", destino="Centro"
 * - comb_26: "Capachito P/A/Concordia" tenía origen="Capachito P", destino="A" -> corregido a origen="Capachito P/A", destino="Concordia"
 * - comb_52: "Margaritas P/A/Concordia" tenía origen="Margaritas P", destino="A" -> corregido a origen="Margaritas P/A", destino="Concordia"
 * - largo_47: "LAGUNILLAS MERIDA" tenía usd=120, cop=null -> cop=456000
 * - largo_48: "LA TENDIDA" tenía usd=50, cop=19000 (faltaba un cero) -> cop=190000
 * - base_142 y base_143: duplicados exactos de base_139 y base_140 -> deduplicados
 */
export function obtenerDbSaneada(): TarifasTachiraDB {
  const db = rawDb as TarifasTachiraDB

  const combinacionesSaneadas: CombinacionItem[] = db.combinaciones.map((c) => {
    if (c.raw === 'Capachito P/B/Centro') {
      return { ...c, origen: 'Capachito P/B', destino: 'Centro' }
    }
    if (c.raw === 'Capachito P/A/Concordia') {
      return { ...c, origen: 'Capachito P/A', destino: 'Concordia' }
    }
    if (c.raw === 'Margaritas P/A/Concordia') {
      return { ...c, origen: 'Margaritas P/A', destino: 'Concordia' }
    }
    return c
  })

  // Eliminar duplicados exactos en rutas_base (ej. Zorca San Isidro y Zorca Pie de Cuesta aparecían dos veces)
  const vistosBase = new Set<string>()
  const rutasBaseSaneadas: RutaBaseItem[] = []
  for (const r of db.rutas_base) {
    const k = normalizarTextoTachira(r.destino)
    if (!vistosBase.has(k)) {
      vistosBase.add(k)
      rutasBaseSaneadas.push(r)
    }
  }

  const viajesLargosSaneados: ViajeLargoItem[] = db.viajes_largos.map((l) => {
    if (l.destino === 'LA TENDIDA' && l.usd === 50 && l.cop === 19000) {
      return { ...l, cop: 190000 }
    }
    if (l.destino === 'LAGUNILLAS MERIDA' && l.usd === 120 && l.cop === null) {
      return { ...l, cop: 456000 }
    }
    return l
  })

  return {
    origen_base_default: db.origen_base_default,
    combinaciones: combinacionesSaneadas,
    rutas_base: rutasBaseSaneadas,
    viajes_largos: viajesLargosSaneados,
  }
}

/**
 * Redondeo comercial usado por taxistas en el Estado Táchira (múltiplos limpios de 1.000 o 5.000 COP)
 */
export function redondearTarifaTachira(montoCop: number): number {
  if (montoCop <= 13000) {
    return Math.round(montoCop / 1000) * 1000
  } else if (montoCop <= 30000) {
    const resto = montoCop % 5000
    if (resto < 1500) {
      return Math.round(montoCop - resto)
    } else if (resto > 3500) {
      return Math.round(montoCop + (5000 - resto))
    } else {
      return Math.round(montoCop / 1000) * 1000
    }
  } else {
    return Math.round(montoCop / 5000) * 5000
  }
}

/**
 * Calcula la distancia vial en kilómetros usando Haversine + Factor de Curvas Andinas (x1.38)
 */
export function calcularDistanciaVialKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  factorCurvas = 1.38
): number {
  const R = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const dist = R * c * factorCurvas
  return Math.max(0.8, Math.round(dist * 10) / 10)
}

/**
 * Evalúa qué tan bien coincide un texto libre del usuario con un destino oficial del catálogo.
 * Evita el bug donde "Rubio" hacía match con "Berlin Via Rubio" o "Colón" con "Coloncito".
 */
function calcularPuntajeCoincidencia(queryUsuario: string, nombreCatalogo: string): number {
  const q = normalizarTextoTachira(queryUsuario)
  const target = normalizarTextoTachira(nombreCatalogo)

  if (!q || !target) return 0

  // 1. Coincidencia exacta
  if (q === target) return 1000

  // 2. El usuario escribió una dirección larga que contiene el nombre completo del sector del catálogo
  // Ej. "Calle 14 de Barrio Obrero frente a la plaza" contiene "barrio obrero"
  const regexPalabraCompleta = new RegExp(`(^|\\s|[,./-])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[,./-])`, 'i')
  if (regexPalabraCompleta.test(q)) {
    // Mayor puntaje mientras más largo y específico sea el nombre del catálogo encontrado
    return 700 + target.length * 5
  }

  // 3. El nombre del catálogo contiene lo que escribió el usuario como palabra completa
  // Pero penalizamos si el catálogo tiene palabras modificadoras como "via" (ej. "Berlin Via Rubio" cuando buscan "Rubio")
  const regexQueryEnTarget = new RegExp(`(^|\\s|[,./-])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[,./-])`, 'i')
  if (regexQueryEnTarget.test(target)) {
    if (target.includes(`via ${q}`)) {
      return 250 // Baja prioridad si es "X via Y" y el usuario buscó "Y"
    }
    // Preferir cuando el query empieza igual que el target (ej. "Palmira" -> "Palmira centro")
    if (target.startsWith(q)) {
      return 600 - (target.length - q.length)
    }
    return 450 - (target.length - q.length)
  }

  // 4. Coincidencia parcial por subcadena (solo si > 3 caracteres)
  if (q.length >= 4 && target.includes(q)) {
    return 200 - (target.length - q.length)
  }
  if (target.length >= 4 && q.includes(target)) {
    return 300 + target.length
  }

  return 0
}

export function detectarCoordenadasYTopografia(texto: string): SectorCoordenada {
  const q = normalizarTextoTachira(texto)

  let mejorSector: SectorCoordenada | null = null
  let mejorScore = 0

  const todosLosSectores = [
    ...SECTORES_GEOREFERENCIADOS,
    ...PUNTOS_EXTENDIDOS_TACHIRA,
  ]

  for (const sec of todosLosSectores) {
    const scoreClave = calcularPuntajeCoincidencia(q, sec.clave)
    const scoreNombre = calcularPuntajeCoincidencia(q, sec.nombre)
    let maxAlias = 0
    if (sec.aliases) {
      for (const al of sec.aliases) {
        maxAlias = Math.max(maxAlias, calcularPuntajeCoincidencia(q, al))
      }
    }
    const score = Math.max(scoreClave, scoreNombre, maxAlias)
    if (score > mejorScore) {
      mejorScore = score
      mejorSector = sec
    }
  }

  if (mejorSector && mejorScore >= 200) {
    return mejorSector
  }

  // 2. Intentar inferencia por patrón de Calle / Carrera / Avenida / Aldea / Loma
  const inferidoPorPatron = inferirSectorPorDireccionLibre(texto)
  if (inferidoPorPatron) {
    return inferidoPorPatron
  }

  // 3. Fallback determinístico por hash del nombre para que dos puntos desconocidos nunca colisionen en 0 km
  let hash = 0
  for (let i = 0; i < q.length; i++) {
    hash = (hash * 33 + q.charCodeAt(i)) % 10000
  }
  const deltaLat = ((hash % 100) - 50) * 0.0007
  const deltaLon = ((Math.floor(hash / 100) % 100) - 50) * 0.0007

  return {
    clave: 'no_catalogado',
    nombre: texto.trim() || 'Sector Táchira',
    municipio: 'Área Metropolitana Táchira (Inferido)',
    lat: Number((7.788 + deltaLat).toFixed(4)),
    lon: Number((-72.218 + deltaLon).toFixed(4)),
    tipo: 'urbano',
  }
}

export interface MatchDesdeTariba {
  cop: number
  usdOficial: number | null
  nombreOficial: string
  origenTabla: 'BASE_TARIBA' | 'COMBINACION_ORIGEN' | 'VIAJE_LARGO'
  esBaseCentral: boolean
  advertenciaCorreccion?: string
}

/**
 * Busca la tarifa oficial desde Táriba hacia el sector consultado usando ranking de precisión
 */
export function buscarPrecioDesdeTariba(
  sectorQuery: string,
  db: TarifasTachiraDB,
  tasaCopPorUsd = 3800
): MatchDesdeTariba | null {
  const q = normalizarTextoTachira(sectorQuery)
  if (!q) return null

  // ¿Es Táriba Base Central? (y no "Las Vegas de Táriba" ni "Margaritas de Táriba")
  const esSubsectorTariba =
    q.includes('las vegas') ||
    q.includes('margaritas') ||
    q.includes('patiecitos') ||
    q.includes('arjona') ||
    q.includes('sabaneta')

  if (
    !esSubsectorTariba &&
    (q === 'tariba' ||
      q === 'tariba (base central)' ||
      q === 'base tariba' ||
      q === 'plaza bolivar de tariba' ||
      q === 'tariba centro')
  ) {
    return {
      cop: 0,
      usdOficial: 0,
      nombreOficial: 'Táriba (Base Central)',
      origenTabla: 'BASE_TARIBA',
      esBaseCentral: true,
    }
  }

  let mejorCandidato: MatchDesdeTariba | null = null
  let mejorPuntaje = 0

  // 1. Buscar en las 141 rutas_base (Hoja 6)
  for (const r of db.rutas_base) {
    const score = calcularPuntajeCoincidencia(q, r.destino)
    if (score > mejorPuntaje && score >= 250) {
      mejorPuntaje = score
      let adv: string | undefined
      if (q === 'rubio' && r.destino === 'Rubio') {
        adv =
          'Se corrigió colisión de subcadena: el script original tomaba "Berlin Via Rubio" (40.000 COP) en lugar de "Rubio" (70.000 COP).'
      }
      mejorCandidato = {
        cop: r.cop,
        usdOficial: null,
        nombreOficial: r.destino,
        origenTabla: 'BASE_TARIBA',
        esBaseCentral: false,
        advertenciaCorreccion: adv,
      }
    }
  }

  // 2. Buscar en orígenes de combinaciones (ej. "Arjona 46", "Las Vegas P6", "Sabaneta")
  for (const c of db.combinaciones) {
    const scoreOrig = calcularPuntajeCoincidencia(q, c.origen)
    if (scoreOrig > mejorPuntaje && scoreOrig >= 300) {
      // Buscar su precio base equivalente en rutas_base
      let mejorBase: RutaBaseItem | null = null
      let mejorScoreBase = 0
      for (const r of db.rutas_base) {
        const sb = calcularPuntajeCoincidencia(c.origen, r.destino)
        if (sb > mejorScoreBase) {
          mejorScoreBase = sb
          mejorBase = r
        }
      }
      if (mejorBase && mejorScoreBase >= 200) {
        mejorPuntaje = scoreOrig
        mejorCandidato = {
          cop: mejorBase.cop,
          usdOficial: null,
          nombreOficial: `${c.origen} (Base ${mejorBase.destino})`,
          origenTabla: 'COMBINACION_ORIGEN',
          esBaseCentral: false,
        }
      }
    }
  }

  // 3. Buscar en viajes_largos (Hoja 4)
  for (const l of db.viajes_largos) {
    const scoreLargo = calcularPuntajeCoincidencia(q, l.destino)
    // Si hay empate entre ruta_base y viaje_largo (ej. "Colón" o "La Fría"), priorizamos ruta_base si existe,
    // o viaje_largo si el score es superior
    if (scoreLargo > mejorPuntaje && scoreLargo >= 300) {
      mejorPuntaje = scoreLargo
      const copCalc = l.cop ?? Math.round((l.usd ?? 0) * tasaCopPorUsd)
      let adv: string | undefined
      if (l.destino === 'LA TENDIDA') {
        adv =
          'Se corrigió error tipográfico del Excel en "LA TENDIDA": decía 19.000 COP para $50 USD (corregido a 190.000 COP).'
      } else if (l.destino === 'LAGUNILLAS MERIDA') {
        adv =
          'Se completó valor COP faltante (null) en "LAGUNILLAS MERIDA" ($120 USD = 456.000 COP).'
      }
      mejorCandidato = {
        cop: copCalc,
        usdOficial: l.usd,
        nombreOficial: l.destino,
        origenTabla: 'VIAJE_LARGO',
        esBaseCentral: false,
        advertenciaCorreccion: adv,
      }
    }
  }

  return mejorCandidato
}

/**
 * Busca si existe una Combinación Oficial Pactada con '/' (Hoja 6) entre Origen y Destino
 */
function buscarCombinacionPactada(
  origenTexto: string,
  destinoTexto: string,
  db: TarifasTachiraDB
): { item: CombinacionItem; advertencia?: string } | null {
  let mejorComb: CombinacionItem | null = null
  let mejorScore = 0
  let advertencia: string | undefined

  for (const c of db.combinaciones) {
    const scoreDir1Orig = calcularPuntajeCoincidencia(origenTexto, c.origen)
    const scoreDir1Dest = calcularPuntajeCoincidencia(destinoTexto, c.destino)

    const scoreDir2Orig = calcularPuntajeCoincidencia(origenTexto, c.destino)
    const scoreDir2Dest = calcularPuntajeCoincidencia(destinoTexto, c.origen)

    const matchDirecto = scoreDir1Orig >= 350 && scoreDir1Dest >= 350
    const matchInverso = scoreDir2Orig >= 350 && scoreDir2Dest >= 350

    if (matchDirecto || matchInverso) {
      const scoreTotal = matchDirecto
        ? scoreDir1Orig + scoreDir1Dest
        : scoreDir2Orig + scoreDir2Dest

      if (scoreTotal > mejorScore) {
        mejorScore = scoreTotal
        mejorComb = c
        if (
          c.raw === 'Capachito P/B/Centro' ||
          c.raw === 'Capachito P/A/Concordia' ||
          c.raw === 'Margaritas P/A/Concordia'
        ) {
          advertencia = `Se reparó la combinación "${c.raw}" que en el JSON original se había partido erróneamente por tener dos barras "/".`
        }
      }
    }
  }

  return mejorComb ? { item: mejorComb, advertencia } : null
}

/**
 * MOTOR PRINCIPAL DE CÁLCULO DE TARIFAS - LÍNEA LOS PATRIOTAS (TÁCHIRA)
 */
export function calcularTarifaPatriotas(
  origenInput: string,
  destinoInput: string,
  parametros: ParametrosMotorTarifas = PARAMETROS_DEFAULT,
  opciones: OpcionesViaje = OPCIONES_VIAJE_DEFAULT,
  customDb?: TarifasTachiraDB,
  telemetriaMapa?: TelemetriaRutaMapa | null
): ResultadoCalculoTarifa {
  const db = customDb ?? obtenerDbSaneada()

  const origenLimpio = origenInput.trim() || 'Táriba'
  const destinoLimpio = destinoInput.trim() || 'Pueblo Nuevo'

  const geoOrigenBase = detectarCoordenadasYTopografia(origenLimpio)
  const geoDestinoBase = detectarCoordenadasYTopografia(destinoLimpio)

  const geoOrigen: SectorCoordenada = telemetriaMapa?.coordenadasOrigen
    ? {
        ...geoOrigenBase,
        lat: telemetriaMapa.coordenadasOrigen.lat,
        lon: telemetriaMapa.coordenadasOrigen.lon,
        nombre:
          geoOrigenBase.clave !== 'no_catalogado'
            ? geoOrigenBase.nombre
            : telemetriaMapa.coordenadasOrigen.direccionFormateada ||
              geoOrigenBase.nombre,
      }
    : geoOrigenBase

  const geoDestino: SectorCoordenada = telemetriaMapa?.coordenadasDestino
    ? {
        ...geoDestinoBase,
        lat: telemetriaMapa.coordenadasDestino.lat,
        lon: telemetriaMapa.coordenadasDestino.lon,
        nombre:
          geoDestinoBase.clave !== 'no_catalogado'
            ? geoDestinoBase.nombre
            : telemetriaMapa.coordenadasDestino.direccionFormateada ||
              geoDestinoBase.nombre,
      }
    : geoDestinoBase

  const distanciaRecogidaHaversine = calcularDistanciaVialKm(
    COORD_BASE_TARIBA.lat,
    COORD_BASE_TARIBA.lon,
    geoOrigen.lat,
    geoOrigen.lon,
    parametros.factorCurvasAndinas
  )

  const distanciaVialHaversine = calcularDistanciaVialKm(
    geoOrigen.lat,
    geoOrigen.lon,
    geoDestino.lat,
    geoDestino.lon,
    parametros.factorCurvasAndinas
  )

  const distanciaRecogidaKm =
    telemetriaMapa && telemetriaMapa.distanciaTramo1RecogidaKm >= 0
      ? telemetriaMapa.distanciaTramo1RecogidaKm
      : distanciaRecogidaHaversine

  const distanciaVialKm =
    telemetriaMapa && telemetriaMapa.distanciaTramo2TrasladoKm > 0
      ? telemetriaMapa.distanciaTramo2TrasladoKm
      : distanciaVialHaversine

  // Velocidad promedio según topografía en Táchira (km/h)
  const jerarquiaTopo: Record<TopografiaTachira, number> = {
    urbano: 1,
    troncal: 2,
    montana: 3,
    frontera: 4,
  }
  const topografiaDominante: TopografiaTachira =
    jerarquiaTopo[geoOrigen.tipo] >= jerarquiaTopo[geoDestino.tipo]
      ? geoOrigen.tipo
      : geoDestino.tipo

  const velocidadPromedioKmH =
    topografiaDominante === 'urbano'
      ? 26
      : topografiaDominante === 'montana'
      ? 32
      : 45

  const tiempoEstimadoMin =
    telemetriaMapa && telemetriaMapa.duracionTramo2TrasladoMin > 0
      ? telemetriaMapa.duracionTramo2TrasladoMin
      : Math.max(5, Math.round((distanciaVialKm / velocidadPromedioKmH) * 60))

  const matchOrigenDesdeBase = buscarPrecioDesdeTariba(
    origenLimpio,
    db,
    parametros.tasaCopPorUsd
  )
  const matchDestinoDesdeBase = buscarPrecioDesdeTariba(
    destinoLimpio,
    db,
    parametros.tasaCopPorUsd
  )

  const esOrigenTaribaBase = matchOrigenDesdeBase?.esBaseCentral === true
  const esDestinoTaribaBase = matchDestinoDesdeBase?.esBaseCentral === true

  let subtotalBaseCop = 0
  let tramo1RecogidaCop = 0
  let tramo2TrasladoCop = 0
  let reglaAplicada: ResultadoCalculoTarifa['reglaAplicada'] =
    'OFICIAL_DESDE_TARIBA'
  let tituloRegla = ''
  let detalleExplicacion = ''
  let esOficial = true
  let nivelConfianza: NivelConfianzaTarifa = 'OFICIAL_100'
  let porcentajeConfianza = 100
  let sectorOrigenDetectado = geoOrigen.nombre
  let sectorDestinoDetectado = geoDestino.nombre
  let advertenciaCorreccion: string | undefined
  let anclaOrigenUsada: AnclaTarifariaReferencia | undefined
  let anclaDestinoUsada: AnclaTarifariaReferencia | undefined
  const anclasCercanasDestino = encontrarAnclasTarifariasCercanas(
    geoDestino.lat,
    geoDestino.lon,
    geoDestino.tipo,
    parametros,
    3
  )
  const anclasCercanasOrigen = encontrarAnclasTarifariasCercanas(
    geoOrigen.lat,
    geoOrigen.lon,
    geoOrigen.tipo,
    parametros,
    3
  )
  const pasosRazonamiento: string[] = []

  // =========================================================================
  // REGLA 1: SALIDA O LLEGADA EN TÁRIBA (BASE CENTRAL) EN CATÁLOGO OFICIAL
  // =========================================================================
  if (esOrigenTaribaBase && matchDestinoDesdeBase && !esDestinoTaribaBase) {
    subtotalBaseCop = matchDestinoDesdeBase.cop
    tramo1RecogidaCop = 0
    tramo2TrasladoCop = matchDestinoDesdeBase.cop
    esOficial = true
    nivelConfianza = 'OFICIAL_100'
    porcentajeConfianza = 100
    sectorOrigenDetectado = 'Táriba (Base Central)'
    sectorDestinoDetectado = matchDestinoDesdeBase.nombreOficial
    advertenciaCorreccion = matchDestinoDesdeBase.advertenciaCorreccion

    if (matchDestinoDesdeBase.origenTabla === 'VIAJE_LARGO') {
      reglaAplicada = 'VIAJE_LARGO_OFICIAL'
      tituloRegla = 'Viaje Largo / Extraurbano Oficial (Hoja 4)'
      detalleExplicacion = `Tarifa oficial de larga distancia desde Base Táriba hacia ${matchDestinoDesdeBase.nombreOficial}`
      pasosRazonamiento.push(
        `Origen detectado en Base Central Táriba (sin recargo de búsqueda / Tramo 1 = 0 COP).`,
        `Destino "${matchDestinoDesdeBase.nombreOficial}" localizado en tabla oficial Hoja 4 (Viajes Largos) con tarifa fija de ${matchDestinoDesdeBase.cop.toLocaleString('es-CO')} COP.`
      )
    } else {
      reglaAplicada = 'OFICIAL_DESDE_TARIBA'
      tituloRegla = 'Tarifa Oficial desde Base Táriba (Hoja 6)'
      detalleExplicacion = `Ruta directa de matriz oficial desde Base Táriba hacia ${matchDestinoDesdeBase.nombreOficial}`
      pasosRazonamiento.push(
        `Origen detectado en Base Central Táriba (Tramo 1 Recogida = 0 COP).`,
        `Destino "${matchDestinoDesdeBase.nombreOficial}" localizado exactamente en la matriz oficial Hoja 6 (${matchDestinoDesdeBase.cop.toLocaleString('es-CO')} COP).`
      )
    }
  } else if (esDestinoTaribaBase && matchOrigenDesdeBase && !esOrigenTaribaBase) {
    subtotalBaseCop = matchOrigenDesdeBase.cop
    tramo1RecogidaCop = matchOrigenDesdeBase.cop
    tramo2TrasladoCop = 0
    esOficial = true
    nivelConfianza = 'OFICIAL_100'
    porcentajeConfianza = 100
    sectorOrigenDetectado = matchOrigenDesdeBase.nombreOficial
    sectorDestinoDetectado = 'Táriba (Base Central)'
    advertenciaCorreccion = matchOrigenDesdeBase.advertenciaCorreccion
    reglaAplicada = 'OFICIAL_HACIA_TARIBA'
    tituloRegla = 'Tarifa Oficial Retorno a Táriba (Hoja 6)'
    detalleExplicacion = `Ruta directa oficial desde ${matchOrigenDesdeBase.nombreOficial} hacia Base Táriba`
    pasosRazonamiento.push(
      `Retorno simétrico hacia Base Central Táriba desde "${matchOrigenDesdeBase.nombreOficial}".`,
      `Se aplica el valor oficial tabulado en Hoja 6: ${matchOrigenDesdeBase.cop.toLocaleString('es-CO')} COP.`
    )
  } else {
    // =========================================================================
    // REGLA 2: COMBINACIÓN PACTADA OFICIAL CON "/" EN EL EXCEL (HOJA 6)
    // =========================================================================
    const combMatch = buscarCombinacionPactada(origenLimpio, destinoLimpio, db)

    if (combMatch) {
      subtotalBaseCop = combMatch.item.cop
      tramo1RecogidaCop = 0
      tramo2TrasladoCop = combMatch.item.cop
      esOficial = true
      nivelConfianza = 'OFICIAL_100'
      porcentajeConfianza = 100
      reglaAplicada = 'COMBINACION_PACTADA'
      tituloRegla = 'Combinación Directa Pactada (Hoja 6)'
      detalleExplicacion = `Combinación especial pre-acordada en tarifario: "${combMatch.item.raw}"`
      sectorOrigenDetectado = combMatch.item.origen
      sectorDestinoDetectado = combMatch.item.destino
      advertenciaCorreccion = combMatch.advertencia
      pasosRazonamiento.push(
        `Se detectó combinación especial pre-acordada con "/" en la Hoja 6 del Excel: "${combMatch.item.raw}".`,
        `Prevalece el precio pactado directo (${combMatch.item.cop.toLocaleString('es-CO')} COP) sobre la suma radial.`
      )
    } else if (matchOrigenDesdeBase && matchDestinoDesdeBase) {
      // =========================================================================
      // REGLA 3: MODELO RADIAL DE DESPACHO (AMBOS PUNTOS EN MATRIZ OFICIAL)
      // =========================================================================
      tramo1RecogidaCop = Math.round(
        matchOrigenDesdeBase.cop * parametros.factorRecogidaRadial
      )
      tramo2TrasladoCop = matchDestinoDesdeBase.cop
      subtotalBaseCop = tramo1RecogidaCop + tramo2TrasladoCop
      esOficial = false
      nivelConfianza = 'OFICIAL_100'
      porcentajeConfianza = 96
      reglaAplicada = 'DESPACHO_RADIAL_MATRIZ'
      tituloRegla = 'Despacho Radial desde Base Táriba (Tramo 1 + Tramo 2)'
      sectorOrigenDetectado = matchOrigenDesdeBase.nombreOficial
      sectorDestinoDetectado = matchDestinoDesdeBase.nombreOficial
      advertenciaCorreccion =
        matchOrigenDesdeBase.advertenciaCorreccion ||
        matchDestinoDesdeBase.advertenciaCorreccion

      const pctRecogidaTxt =
        parametros.factorRecogidaRadial !== 1
          ? ` al ${Math.round(parametros.factorRecogidaRadial * 100)}%`
          : ''

      detalleExplicacion = `Salida de Base Táriba a recoger en ${matchOrigenDesdeBase.nombreOficial} (${tramo1RecogidaCop.toLocaleString('es-CO')} COP${pctRecogidaTxt}) + Traslado a ${matchDestinoDesdeBase.nombreOficial} (${tramo2TrasladoCop.toLocaleString('es-CO')} COP)`
      pasosRazonamiento.push(
        `Ambos puntos existen en el tarifario oficial, pero no tienen combinación directa con "/".`,
        `Tramo 1 (Recogida): Táriba → ${matchOrigenDesdeBase.nombreOficial} = ${tramo1RecogidaCop.toLocaleString('es-CO')} COP${pctRecogidaTxt}.`,
        `Tramo 2 (Traslado): ${matchDestinoDesdeBase.nombreOficial} en matriz oficial = ${tramo2TrasladoCop.toLocaleString('es-CO')} COP.`,
        `Suma Radial Exacta: ${subtotalBaseCop.toLocaleString('es-CO')} COP.`
      )
    } else {
      // =========================================================================
      // REGLA 4: MOTOR INTELIGENTE PARA PUNTOS NO CONTEMPLADOS EN EL EXCEL
      // Triangulación por Ancla Tarifaria Oficial Más Cercana + Gradiente Topográfico
      // =========================================================================
      const costoPorKm =
        topografiaDominante === 'frontera'
          ? parametros.costoKmFrontera
          : topografiaDominante === 'montana'
          ? parametros.costoKmMontana
          : topografiaDominante === 'troncal'
          ? parametros.costoKmTroncal
          : parametros.costoKmUrbano

      const anclaOrig = anclasCercanasOrigen[0]
      const anclaDest = anclasCercanasDestino[0]

      // 1. Determinar Tramo 1 (Recogida desde Base Táriba hasta el Origen)
      if (esOrigenTaribaBase) {
        tramo1RecogidaCop = 0
        sectorOrigenDetectado = 'Táriba (Base Central)'
        pasosRazonamiento.push(
          `Origen en Base Central Táriba: Tramo 1 (Recogida) = 0 COP.`
        )
      } else if (matchOrigenDesdeBase) {
        tramo1RecogidaCop = Math.round(
          matchOrigenDesdeBase.cop * parametros.factorRecogidaRadial
        )
        sectorOrigenDetectado = matchOrigenDesdeBase.nombreOficial
        pasosRazonamiento.push(
          `Tramo 1 (Recogida): "${matchOrigenDesdeBase.nombreOficial}" sí está en el tarifario oficial (${tramo1RecogidaCop.toLocaleString('es-CO')} COP).`
        )
      } else if (anclaOrig) {
        anclaOrigenUsada = anclaOrig
        tramo1RecogidaCop = Math.round(
          anclaOrig.tarifaInferidaPuntoCop * parametros.factorRecogidaRadial
        )
        pasosRazonamiento.push(
          `Origen "${origenLimpio}" NO está en las 270 rutas del Excel. Se trianguló con el Ancla Oficial más cercana: "${anclaOrig.nombreOficial}" (${anclaOrig.copOficial.toLocaleString('es-CO')} COP en ${anclaOrig.tipoTabla}) a ${anclaOrig.distanciaAlPuntoKm} km viales.`,
          `Tramo 1 inferido para recoger en "${sectorOrigenDetectado}": ${tramo1RecogidaCop.toLocaleString('es-CO')} COP.`
        )
      } else {
        tramo1RecogidaCop = parametros.tarifaMinimaBaseCop
      }

      // 2. Determinar Tramo 2 (Traslado hacia el Destino)
      if (esDestinoTaribaBase) {
        tramo2TrasladoCop = 0
        sectorDestinoDetectado = 'Táriba (Base Central)'
        pasosRazonamiento.push(
          `Destino en Base Central Táriba: se cobra el tramo inferido desde "${sectorOrigenDetectado}" hacia Táriba (${tramo1RecogidaCop.toLocaleString('es-CO')} COP).`
        )
      } else if (matchDestinoDesdeBase) {
        tramo2TrasladoCop = matchDestinoDesdeBase.cop
        sectorDestinoDetectado = matchDestinoDesdeBase.nombreOficial
        pasosRazonamiento.push(
          `Tramo 2 (Traslado): "${matchDestinoDesdeBase.nombreOficial}" está en el tarifario oficial (${tramo2TrasladoCop.toLocaleString('es-CO')} COP).`
        )
      } else if (anclaDest) {
        anclaDestinoUsada = anclaDest
        // Si tenemos telemetría vial real del mapa (Google Maps / OSRM), ponderamos el ancla oficial con los km viales reales de la mejor ruta
        const costoRutaVialDirecta = redondearTarifaTachira(
          Math.round(
            parametros.tarifaMinimaBaseCop +
              Math.max(0, distanciaVialKm - parametros.kmIncluidosBase) *
                costoPorKm
          )
        )

        if (esOrigenTaribaBase) {
          if (telemetriaMapa && anclaDest.distanciaAlPuntoKm > 2.2) {
            // Calibración híbrida: Ancla Oficial + ajuste exacto o ruta vial real medida en mapa
            tramo2TrasladoCop = redondearTarifaTachira(
              Math.round(
                anclaDest.tarifaInferidaPuntoCop * 0.65 +
                  costoRutaVialDirecta * 0.35
              )
            )
            pasosRazonamiento.push(
              `Ruta medida en mapa (${telemetriaMapa.proveedor === 'GOOGLE_MAPS' ? 'Google Maps Directions' : 'Ruteo Vial OSRM'}): ${distanciaVialKm} km (${tiempoEstimadoMin} min) por ${telemetriaMapa.resumenRutaPrincipal}.`,
              `Calibración exacta con Ancla Oficial "${anclaDest.nombreOficial}" (${anclaDest.copOficial.toLocaleString('es-CO')} COP a ${anclaDest.distanciaAlPuntoKm} km) + kilometraje vial real → ${tramo2TrasladoCop.toLocaleString('es-CO')} COP.`
            )
          } else {
            tramo2TrasladoCop = anclaDest.tarifaInferidaPuntoCop
            pasosRazonamiento.push(
              `Destino "${destinoLimpio}" NO figura en el Excel. Se ancló a la tarifa oficial más cercana: "${anclaDest.nombreOficial}" (${anclaDest.copOficial.toLocaleString('es-CO')} COP en ${anclaDest.tipoTabla}), ubicada a ${anclaDest.distanciaAlPuntoKm} km viales.`,
              `Ajuste por extensión vial y topografía ${geoDestino.tipo.toUpperCase()} (${costoPorKm.toLocaleString('es-CO')} COP/km): ${anclaDest.ajustePorDistanciaCop >= 0 ? '+' : ''}${anclaDest.ajustePorDistanciaCop.toLocaleString('es-CO')} COP → Base inferida: ${anclaDest.tarifaInferidaPuntoCop.toLocaleString('es-CO')} COP.`
            )
          }
        } else {
          // Si ni el origen es Táriba ni el destino está en matriz:
          const kmAdicionales = Math.max(0, distanciaVialKm - parametros.kmIncluidosBase)
          const costoTramoDirectoKm = Math.round(
            parametros.tarifaMinimaBaseCop + kmAdicionales * costoPorKm
          )
          if (distanciaVialKm <= 4.5) {
            tramo2TrasladoCop = costoTramoDirectoKm
            pasosRazonamiento.push(
              `Traslado corto intra-zonal (${distanciaVialKm} km medidos en ruta entre "${sectorOrigenDetectado}" y "${sectorDestinoDetectado}"): se suma tramo vial de ${costoTramoDirectoKm.toLocaleString('es-CO')} COP sobre la recogida.`
            )
          } else if (telemetriaMapa) {
            tramo2TrasladoCop = redondearTarifaTachira(
              Math.round(
                anclaDest.tarifaInferidaPuntoCop * 0.6 +
                  costoTramoDirectoKm * 0.4
              )
            )
            pasosRazonamiento.push(
              `Mejor ruta en mapa (${distanciaVialKm} km · ${tiempoEstimadoMin} min por ${telemetriaMapa.resumenRutaPrincipal}) calibrada con Ancla "${anclaDest.nombreOficial}" (${anclaDest.copOficial.toLocaleString('es-CO')} COP) = ${tramo2TrasladoCop.toLocaleString('es-CO')} COP.`
            )
          } else {
            tramo2TrasladoCop = anclaDest.tarifaInferidaPuntoCop
            pasosRazonamiento.push(
              `Destino "${destinoLimpio}" anclado a "${anclaDest.nombreOficial}" (${anclaDest.copOficial.toLocaleString('es-CO')} COP) + ajuste topográfico (${anclaDest.distanciaAlPuntoKm} km) = ${anclaDest.tarifaInferidaPuntoCop.toLocaleString('es-CO')} COP.`
            )
          }
        }
      } else {
        const kmAdicionales = Math.max(0, distanciaVialKm - parametros.kmIncluidosBase)
        tramo2TrasladoCop = Math.round(
          parametros.tarifaMinimaBaseCop + kmAdicionales * costoPorKm
        )
      }

      subtotalBaseCop = Math.max(
        parametros.tarifaMinimaBaseCop,
        tramo1RecogidaCop + tramo2TrasladoCop
      )
      esOficial = false

      const fueReconocidoEnGeografia =
        geoOrigen.clave !== 'no_catalogado' && geoDestino.clave !== 'no_catalogado'

      reglaAplicada = telemetriaMapa
        ? 'RUTA_EXACTA_MAPA_VIAL'
        : fueReconocidoEnGeografia
        ? 'INFERENCIA_ANCLA_VECINA'
        : 'ESTIMACION_TOPOGRAFICA_KM'

      nivelConfianza = telemetriaMapa
        ? 'IA_RUTEO_VIAL'
        : fueReconocidoEnGeografia
        ? 'ALTA_ANCLA_VECINA'
        : 'MEDIA_TRIANGULACION'
      porcentajeConfianza = telemetriaMapa
        ? 97
        : fueReconocidoEnGeografia
        ? 92
        : 78

      tituloRegla = telemetriaMapa
        ? `Ruta Exacta en Mapa (${telemetriaMapa.proveedor === 'GOOGLE_MAPS' ? 'Google Maps' : 'Vial GPS'}) + Ancla Oficial`
        : fueReconocidoEnGeografia
        ? 'Inferencia Inteligente por Ancla Tarifaria Vecina + Topografía'
        : 'Triangulación Topográfica por Kilometraje y Pendiente'

      const refAnclaTexto = anclaDestinoUsada
        ? `Ancla oficial más cercana: ${anclaDestinoUsada.nombreOficial} (${anclaDestinoUsada.copOficial.toLocaleString('es-CO')} COP a ${anclaDestinoUsada.distanciaAlPuntoKm} km)`
        : anclaOrigenUsada
        ? `Ancla origen: ${anclaOrigenUsada.nombreOficial} (${anclaOrigenUsada.copOficial.toLocaleString('es-CO')} COP a ${anclaOrigenUsada.distanciaAlPuntoKm} km)`
        : `Distancia vial ~${distanciaVialKm} km`

      detalleExplicacion = `Punto fuera de matriz calculado por inteligencia geoespacial — ${refAnclaTexto} · Topografía ${topografiaDominante.toUpperCase()} (${costoPorKm.toLocaleString('es-CO')} COP/km)`
    }
  }

  // =========================================================================
  // REGLA 5: RECARGOS (NOCTURNO, LLUVIA, FERIADO) Y EXTRAS (PARADAS / ESPERA)
  // =========================================================================
  let porcentajeRecargoTotal = 0
  if (opciones.nocturno) porcentajeRecargoTotal += parametros.recargoNocturnoPct
  if (opciones.lluvia) porcentajeRecargoTotal += parametros.recargoLluviaPct
  if (opciones.feriado) porcentajeRecargoTotal += parametros.recargoFeriadoPct

  const montoRecargosCop = Math.round(
    subtotalBaseCop * (porcentajeRecargoTotal / 100)
  )
  const montoExtrasCop =
    opciones.paradasExtra * parametros.costoParadaExtraCop +
    opciones.minutosEspera * parametros.costoMinutoEsperaCop

  const totalSinRedondearCop =
    subtotalBaseCop + montoRecargosCop + montoExtrasCop

  // Si proviene de tarifas de la matriz (directa, combinación o suma radial de matriz) y no tiene recargos porcentuales,
  // mantenemos la suma exacta de miles del tarifario (ej. 12.000 + 70.000 = 82.000 COP).
  // Aplicamos redondeo comercial tachirense cuando es inferencia/estimación o cuando hay recargos porcentuales.
  const debeRedondear =
    parametros.aplicarRedondeoComercial &&
    (reglaAplicada === 'INFERENCIA_ANCLA_VECINA' ||
      reglaAplicada === 'ESTIMACION_TOPOGRAFICA_KM' ||
      porcentajeRecargoTotal > 0 ||
      parametros.factorRecogidaRadial !== 1)

  const totalCop = debeRedondear
    ? redondearTarifaTachira(totalSinRedondearCop)
    : totalSinRedondearCop

  const rangoSugeridoMinCop = esOficial
    ? totalCop
    : Math.max(
        parametros.tarifaMinimaBaseCop,
        redondearTarifaTachira(Math.round(totalCop * 0.92))
      )
  const rangoSugeridoMaxCop = esOficial
    ? totalCop
    : redondearTarifaTachira(Math.round(totalCop * 1.1))

  const tasaCopSegura = Math.max(1, parametros.tasaCopPorUsd)
  const tasaBcvSegura = Math.max(0.01, parametros.tasaBcvPorUsd)

  const totalUsd = Number((totalCop / tasaCopSegura).toFixed(2))
  const totalVesBcv = Number((totalUsd * tasaBcvSegura).toFixed(2))

  return {
    origenInput: origenLimpio,
    destinoInput: destinoLimpio,
    sectorOrigenDetectado,
    sectorDestinoDetectado,
    reglaAplicada,
    tituloRegla,
    detalleExplicacion,
    esOficial,
    nivelConfianza,
    porcentajeConfianza,
    topografiaDominante,
    distanciaVialKm,
    distanciaRecogidaKm,
    tiempoEstimadoMin,
    tramo1RecogidaCop,
    tramo2TrasladoCop,
    subtotalBaseCop,
    porcentajeRecargoTotal,
    montoRecargosCop,
    montoExtrasCop,
    totalSinRedondearCop,
    totalCop,
    totalUsd,
    totalVesBcv,
    rangoSugeridoMinCop,
    rangoSugeridoMaxCop,
    tasaCopUsada: tasaCopSegura,
    tasaBcvUsada: tasaBcvSegura,
    coordenadasOrigen: { lat: geoOrigen.lat, lon: geoOrigen.lon },
    coordenadasDestino: { lat: geoDestino.lat, lon: geoDestino.lon },
    anclaOrigenUsada,
    anclaDestinoUsada,
    anclasCercanasDestino,
    pasosRazonamiento,
    advertenciaCorreccion,
    telemetriaMapa: telemetriaMapa ?? undefined,
  }
}

/**
 * Genera sugerencias de autocompletado combinando sectores geográficos,
 * rutas base desde Táriba, combinaciones y viajes largos
 */
export function buscarSugerenciasLugares(
  query: string,
  db: TarifasTachiraDB,
  limite = 8
): SugerenciaLugar[] {
  const q = normalizarTextoTachira(query)
  if (!q || q.length < 1) {
    return [
      {
        texto: 'Táriba (Base Central)',
        subtitulo: 'Base principal de despacho — Línea Los Patriotas',
        categoria: 'Base Táriba',
        copReferencia: 0,
      },
      {
        texto: 'Pueblo Nuevo',
        subtitulo: 'Tarifa oficial desde Táriba: 20.000 COP',
        categoria: 'Base Táriba',
        copReferencia: 20000,
      },
      {
        texto: 'Barrio Obrero',
        subtitulo: 'Tarifa oficial desde Táriba: 18.000 COP',
        categoria: 'Base Táriba',
        copReferencia: 18000,
      },
      {
        texto: 'Centro 5ta/7ma',
        subtitulo: 'Tarifa oficial desde Táriba: 15.000 COP',
        categoria: 'Base Táriba',
        copReferencia: 15000,
      },
      {
        texto: 'Hospital Central',
        subtitulo: 'Tarifa oficial desde Táriba: 20.000 COP',
        categoria: 'Base Táriba',
        copReferencia: 20000,
      },
      {
        texto: 'Sambil',
        subtitulo: 'Tarifa oficial desde Táriba: 13.000 COP',
        categoria: 'Base Táriba',
        copReferencia: 13000,
      },
    ]
  }

  const candidatos: { sug: SugerenciaLugar; score: number }[] = []

  // 1. Táriba Base Central
  const scoreTariba = calcularPuntajeCoincidencia(q, 'Táriba (Base Central)')
  if (scoreTariba > 0) {
    candidatos.push({
      score: scoreTariba + 50,
      sug: {
        texto: 'Táriba (Base Central)',
        subtitulo: 'Punto de partida central de la línea',
        categoria: 'Base Táriba',
        copReferencia: 0,
      },
    })
  }

  // 2. Rutas Base (Hoja 6)
  for (const r of db.rutas_base) {
    const score = calcularPuntajeCoincidencia(q, r.destino)
    if (score > 0) {
      candidatos.push({
        score,
        sug: {
          texto: r.destino,
          subtitulo: `Desde Base Táriba: ${r.cop.toLocaleString('es-CO')} COP`,
          categoria: 'Base Táriba',
          copReferencia: r.cop,
        },
      })
    }
  }

  // 3. Orígenes de Combinaciones (ej. Arjona 46, Las Vegas P6)
  const origenesVistos = new Set<string>()
  for (const c of db.combinaciones) {
    const k = normalizarTextoTachira(c.origen)
    if (!origenesVistos.has(k)) {
      origenesVistos.add(k)
      const score = calcularPuntajeCoincidencia(q, c.origen)
      if (score > 0) {
        candidatos.push({
          score,
          sug: {
            texto: c.origen,
            subtitulo: `Sector con combinación pactada (ej. → ${c.destino}: ${c.cop.toLocaleString('es-CO')} COP)`,
            categoria: 'Combinación',
            copReferencia: c.cop,
          },
        })
      }
    }
  }

  // 4. Viajes Largos (Hoja 4)
  for (const l of db.viajes_largos) {
    const score = calcularPuntajeCoincidencia(q, l.destino)
    if (score > 0) {
      candidatos.push({
        score,
        sug: {
          texto: l.destino,
          subtitulo: `Viaje Largo: $${l.usd ?? 0} USD (${(l.cop ?? 0).toLocaleString('es-CO')} COP)`,
          categoria: 'Viaje Largo',
          copReferencia: l.cop ?? undefined,
          usdReferencia: l.usd ?? undefined,
        },
      })
    }
  }

  // 5. Puntos Extendidos No Contemplados en Matriz (Inferencia por Ancla Vecina)
  for (const p of PUNTOS_EXTENDIDOS_TACHIRA) {
    const scoreNombre = calcularPuntajeCoincidencia(q, p.nombre)
    const scoreClave = calcularPuntajeCoincidencia(q, p.clave)
    let scoreAlias = 0
    if (p.aliases) {
      for (const al of p.aliases) {
        scoreAlias = Math.max(scoreAlias, calcularPuntajeCoincidencia(q, al))
      }
    }
    const maxS = Math.max(scoreNombre, scoreClave, scoreAlias)
    if (maxS > 0) {
      candidatos.push({
        score: maxS,
        sug: {
          texto: p.nombre,
          subtitulo: `Fuera de matriz · Ancla cercana: ${p.anclaOficial ?? 'Táchira'} (${(p.copAnclaReferencia ?? 20000).toLocaleString('es-CO')} COP + km)`,
          categoria: 'Punto No Contemplado (IA)',
          copReferencia: p.copAnclaReferencia,
        },
      })
    }
  }

  candidatos.sort((a, b) => b.score - a.score)

  const unicos: SugerenciaLugar[] = []
  const textosVistos = new Set<string>()
  for (const item of candidatos) {
    const k = normalizarTextoTachira(item.sug.texto)
    if (!textosVistos.has(k)) {
      textosVistos.add(k)
      unicos.push(item.sug)
      if (unicos.length >= limite) break
    }
  }

  return unicos
}
