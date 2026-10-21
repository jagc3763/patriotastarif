import {
  AnclaTarifariaReferencia,
  ParametrosMotorTarifas,
  SectorCoordenada,
  TopografiaTachira,
} from './types'

export const COORD_BASE_TARIBA = {
  lat: 7.818,
  lon: -72.2248,
  altitudMsnm: 860,
}

export interface NodoAnclaOficial {
  nombreOficial: string
  copOficial: number
  tipoTabla: 'Hoja 6 (Base Táriba)' | 'Hoja 4 (Viaje Largo)'
  lat: number
  lon: number
  altitudMsnm: number
  topografia: TopografiaTachira
  municipio: string
  clavesAsociadas: string[]
}

export const ANCLAS_OFICIALES_GEORREFERENCIADAS: NodoAnclaOficial[] = [
  {
    nombreOficial: 'Las Vegas',
    copOficial: 10000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.8105,
    lon: -72.2205,
    altitudMsnm: 840,
    topografia: 'urbano',
    municipio: 'Cárdenas',
    clavesAsociadas: ['las vegas', 'vegas de tariba', 'parada 6', 'las vegas p6'],
  },
  {
    nombreOficial: 'Arjona',
    copOficial: 12000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.805,
    lon: -72.205,
    altitudMsnm: 890,
    topografia: 'urbano',
    municipio: 'Cárdenas',
    clavesAsociadas: ['arjona', 'arjona 46'],
  },
  {
    nombreOficial: 'Sabaneta',
    copOficial: 13000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.799,
    lon: -72.209,
    altitudMsnm: 870,
    topografia: 'urbano',
    municipio: 'Cárdenas',
    clavesAsociadas: ['sabaneta', 'recta de las vegas'],
  },
  {
    nombreOficial: 'Margaritas',
    copOficial: 12000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.8225,
    lon: -72.2195,
    altitudMsnm: 910,
    topografia: 'urbano',
    municipio: 'Cárdenas',
    clavesAsociadas: ['las margaritas', 'margaritas de tariba'],
  },
  {
    nombreOficial: 'Capachito',
    copOficial: 12000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.814,
    lon: -72.231,
    altitudMsnm: 895,
    topografia: 'urbano',
    municipio: 'Cárdenas',
    clavesAsociadas: ['capachito', 'capachito parte alta', 'capachito parte baja'],
  },
  {
    nombreOficial: 'Barrancas',
    copOficial: 15000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.806,
    lon: -72.235,
    altitudMsnm: 850,
    topografia: 'urbano',
    municipio: 'Cárdenas',
    clavesAsociadas: ['barrancas', 'barrancas parte alta', 'barrancas parte baja'],
  },
  {
    nombreOficial: 'Tucape',
    copOficial: 15000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.829,
    lon: -72.207,
    altitudMsnm: 960,
    topografia: 'urbano',
    municipio: 'Cárdenas',
    clavesAsociadas: ['tucape', 'sector tucape'],
  },
  {
    nombreOficial: 'Guamito',
    copOficial: 17000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.834,
    lon: -72.199,
    altitudMsnm: 1020,
    topografia: 'montana',
    municipio: 'Cárdenas',
    clavesAsociadas: ['guamito', 'el guamito'],
  },
  {
    nombreOficial: 'Cordero',
    copOficial: 30000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.855,
    lon: -72.178,
    altitudMsnm: 1150,
    topografia: 'montana',
    municipio: 'Andrés Bello',
    clavesAsociadas: ['cordero', 'plaza bolivar cordero', 'via cordero'],
  },
  {
    nombreOficial: 'Zumbador',
    copOficial: 120000,
    tipoTabla: 'Hoja 4 (Viaje Largo)',
    lat: 7.968,
    lon: -72.078,
    altitudMsnm: 2650,
    topografia: 'montana',
    municipio: 'Jáuregui / Andrés Bello',
    clavesAsociadas: ['el zumbador', 'paramo el zumbador', 'alcabala el zumbador'],
  },
  {
    nombreOficial: 'Patiecitos',
    copOficial: 15000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.835,
    lon: -72.215,
    altitudMsnm: 950,
    topografia: 'urbano',
    municipio: 'Guásimos',
    clavesAsociadas: ['patiecitos', 'puente patiecitos'],
  },
  {
    nombreOficial: 'Palmira',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.848,
    lon: -72.208,
    altitudMsnm: 1060,
    topografia: 'urbano',
    municipio: 'Guásimos',
    clavesAsociadas: ['palmira', 'abejal', 'el abejal', 'san agustin palmira'],
  },
  {
    nombreOficial: 'Copa De Oro',
    copOficial: 25000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.858,
    lon: -72.218,
    altitudMsnm: 1180,
    topografia: 'troncal',
    municipio: 'Guásimos',
    clavesAsociadas: ['copa de oro', 'la victoria palmira'],
  },
  {
    nombreOficial: 'Palo Grande',
    copOficial: 35000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.878,
    lon: -72.228,
    altitudMsnm: 1380,
    topografia: 'montana',
    municipio: 'Lobatera / Guásimos',
    clavesAsociadas: ['palo grande', 'curva los monos'],
  },
  {
    nombreOficial: 'Sambil',
    copOficial: 13000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.802,
    lon: -72.218,
    altitudMsnm: 830,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['sambil', 'autopista sambil', 'cc sambil'],
  },
  {
    nombreOficial: 'Torbes',
    copOficial: 12000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.795,
    lon: -72.229,
    altitudMsnm: 810,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['av marginal del torbes', 'puente libertador', 'tariba puente'],
  },
  {
    nombreOficial: 'Madre Juana',
    copOficial: 15000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.786,
    lon: -72.234,
    altitudMsnm: 835,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['madre juana', '19 de abril'],
  },
  {
    nombreOficial: 'Guayana',
    copOficial: 17000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.792,
    lon: -72.214,
    altitudMsnm: 880,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['av guayana', 'avenida guayana', 'cc las lomas'],
  },
  {
    nombreOficial: 'Machiri',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.808,
    lon: -72.192,
    altitudMsnm: 1040,
    topografia: 'montana',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['la machiri', 'machiri', 'cuesta del trapiche'],
  },
  {
    nombreOficial: 'Paramillo',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.805,
    lon: -72.202,
    altitudMsnm: 980,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['paramillo', 'aeropuerto paramillo', 'zona industrial paramillo'],
  },
  {
    nombreOficial: 'Unet',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.795,
    lon: -72.198,
    altitudMsnm: 1010,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['unet', 'universidad experimental del tachira', 'jardines botanicos'],
  },
  {
    nombreOficial: 'Pueblo Nuevo',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.791,
    lon: -72.206,
    altitudMsnm: 975,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['pueblo nuevo', 'estadio pueblo nuevo', 'plaza de toros'],
  },
  {
    nombreOficial: 'Santa Teresa',
    copOficial: 18000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.786,
    lon: -72.215,
    altitudMsnm: 930,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['santa teresa', 'villa olimpica', 'asogata'],
  },
  {
    nombreOficial: 'Carabobo',
    copOficial: 18000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.781,
    lon: -72.212,
    altitudMsnm: 945,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['av carabobo', 'avenida carabobo'],
  },
  {
    nombreOficial: 'Ferrero Tamayo',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.784,
    lon: -72.203,
    altitudMsnm: 995,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['av ferrero tamayo', 'ferrero tamayo'],
  },
  {
    nombreOficial: 'Pirineos',
    copOficial: 22000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.781,
    lon: -72.198,
    altitudMsnm: 1060,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['pirineos', 'pirineos i', 'pirineos ii', 'quinimari'],
  },
  {
    nombreOficial: 'Barrio Sucre',
    copOficial: 22000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.786,
    lon: -72.193,
    altitudMsnm: 1120,
    topografia: 'montana',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['barrio sucre', 'libertador', 'barrio libertador'],
  },
  {
    nombreOficial: 'Centro 5ta/7ma',
    copOficial: 15000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.7665,
    lon: -72.2325,
    altitudMsnm: 825,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['centro', '5ta avenida', '7ma avenida', 'plaza bolivar sc'],
  },
  {
    nombreOficial: 'Ermita',
    copOficial: 16000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.772,
    lon: -72.228,
    altitudMsnm: 855,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['la ermita', 'iglesia la ermita', 'mercado la ermita'],
  },
  {
    nombreOficial: 'Barrio Obrero',
    copOficial: 18000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.7735,
    lon: -72.218,
    altitudMsnm: 915,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['barrio obrero', 'plaza los mangos', 'pasaje acueducto'],
  },
  {
    nombreOficial: 'Hospital Central',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.761,
    lon: -72.215,
    altitudMsnm: 920,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['hospital central', 'seguro social', 'policlinica tachira'],
  },
  {
    nombreOficial: 'Castra',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.756,
    lon: -72.221,
    altitudMsnm: 890,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['la castra', 'iufront', 'unidad vecinal'],
  },
  {
    nombreOficial: 'Concordia',
    copOficial: 20000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.752,
    lon: -72.231,
    altitudMsnm: 815,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['la concordia', 'terminal', 'terminal de pasajeros'],
  },
  {
    nombreOficial: 'Chucuri',
    copOficial: 25000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.738,
    lon: -72.229,
    altitudMsnm: 790,
    topografia: 'urbano',
    municipio: 'San Cristóbal',
    clavesAsociadas: ['chucuri', 'tambo'],
  },
  {
    nombreOficial: 'Mirador',
    copOficial: 22000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.775,
    lon: -72.248,
    altitudMsnm: 980,
    topografia: 'montana',
    municipio: 'Cárdenas / Independencia',
    clavesAsociadas: ['el mirador', 'via capacho', 'la popa'],
  },
  {
    nombreOficial: 'Capacho',
    copOficial: 35000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.825,
    lon: -72.308,
    altitudMsnm: 1270,
    topografia: 'montana',
    municipio: 'Independencia / Libertad',
    clavesAsociadas: ['capacho', 'independencia', 'libertad capacho', 'mercado de capacho'],
  },
  {
    nombreOficial: 'San Antonio',
    copOficial: 75000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.814,
    lon: -72.443,
    altitudMsnm: 438,
    topografia: 'frontera',
    municipio: 'Bolívar',
    clavesAsociadas: ['san antonio del tachira', 'puente simon bolivar', 'aduana san antonio'],
  },
  {
    nombreOficial: 'Ureña',
    copOficial: 85000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.916,
    lon: -72.446,
    altitudMsnm: 310,
    topografia: 'frontera',
    municipio: 'Pedro María Ureña',
    clavesAsociadas: ['urena', 'aguas calientes', 'puente francisco de paula santander'],
  },
  {
    nombreOficial: 'Berlin Via Rubio',
    copOficial: 40000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.732,
    lon: -72.295,
    altitudMsnm: 1180,
    topografia: 'montana',
    municipio: 'Junín / Córdoba',
    clavesAsociadas: ['berlin', 'cruce santa ana'],
  },
  {
    nombreOficial: 'Santa Ana',
    copOficial: 60000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.645,
    lon: -72.276,
    altitudMsnm: 820,
    topografia: 'montana',
    municipio: 'Córdoba',
    clavesAsociadas: ['santa ana del tachira', 'municipio cordoba'],
  },
  {
    nombreOficial: 'Rubio',
    copOficial: 70000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.701,
    lon: -72.356,
    altitudMsnm: 825,
    topografia: 'montana',
    municipio: 'Junín',
    clavesAsociadas: ['rubio', 'ciudad pontonera', 'junin'],
  },
  {
    nombreOficial: 'San Josecito',
    copOficial: 30000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.662,
    lon: -72.212,
    altitudMsnm: 590,
    topografia: 'troncal',
    municipio: 'Torbes',
    clavesAsociadas: ['san josecito', 'municipio torbes'],
  },
  {
    nombreOficial: 'EL PIÑAL',
    copOficial: 114000,
    tipoTabla: 'Hoja 4 (Viaje Largo)',
    lat: 7.532,
    lon: -71.958,
    altitudMsnm: 260,
    topografia: 'troncal',
    municipio: 'Fernández Feo',
    clavesAsociadas: ['el pinal', 'san rafael del pinal', 'naranjales'],
  },
  {
    nombreOficial: 'ABEJALES',
    copOficial: 247000,
    tipoTabla: 'Hoja 4 (Viaje Largo)',
    lat: 7.628,
    lon: -71.519,
    altitudMsnm: 215,
    topografia: 'troncal',
    municipio: 'Libertador',
    clavesAsociadas: ['abejales', 'punta de piedra'],
  },
  {
    nombreOficial: 'Lobatera',
    copOficial: 50000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.928,
    lon: -72.246,
    altitudMsnm: 968,
    topografia: 'montana',
    municipio: 'Lobatera',
    clavesAsociadas: ['lobatera', 'minas de lobatera'],
  },
  {
    nombreOficial: 'Michelena',
    copOficial: 60000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 7.955,
    lon: -72.243,
    altitudMsnm: 1200,
    topografia: 'montana',
    municipio: 'Michelena',
    clavesAsociadas: ['michelena', 'boca de monte'],
  },
  {
    nombreOficial: 'Colon',
    copOficial: 80000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 8.031,
    lon: -72.26,
    altitudMsnm: 802,
    topografia: 'troncal',
    municipio: 'Ayacucho',
    clavesAsociadas: ['san juan de colon', 'colon tachira'],
  },
  {
    nombreOficial: 'La Fria',
    copOficial: 140000,
    tipoTabla: 'Hoja 6 (Base Táriba)',
    lat: 8.215,
    lon: -72.248,
    altitudMsnm: 125,
    topografia: 'troncal',
    municipio: 'García de Hevia',
    clavesAsociadas: ['la fria', 'aeropuerto la fria'],
  },
  {
    nombreOficial: 'COLONCITO',
    copOficial: 171000,
    tipoTabla: 'Hoja 4 (Viaje Largo)',
    lat: 8.322,
    lon: -72.083,
    altitudMsnm: 130,
    topografia: 'troncal',
    municipio: 'Panamericano',
    clavesAsociadas: ['coloncito', 'panamericano'],
  },
  {
    nombreOficial: 'LA TENDIDA',
    copOficial: 190000,
    tipoTabla: 'Hoja 4 (Viaje Largo)',
    lat: 8.508,
    lon: -71.842,
    altitudMsnm: 165,
    topografia: 'troncal',
    municipio: 'Samuel Darío Maldonado',
    clavesAsociadas: ['la tendida'],
  },
  {
    nombreOficial: 'LA GRITA',
    copOficial: 171000,
    tipoTabla: 'Hoja 4 (Viaje Largo)',
    lat: 8.133,
    lon: -71.983,
    altitudMsnm: 1440,
    topografia: 'montana',
    municipio: 'Jáuregui',
    clavesAsociadas: ['la grita', 'santo cristo de la grita'],
  },
]

export const PUNTOS_EXTENDIDOS_TACHIRA: SectorCoordenada[] = [
  {
    clave: 'peribeca',
    nombre: 'Peribeca (Pueblo Turístico)',
    municipio: 'Independencia (Capacho)',
    lat: 7.808,
    lon: -72.292,
    altitudMsnm: 1290,
    tipo: 'montana',
    anclaOficial: 'Capacho',
    copAnclaReferencia: 35000,
    aliases: ['pueblo de peribeca', 'iglesia de peribeca', 'via peribeca', 'el topon'],
  },
  {
    clave: 'chorro del indio',
    nombre: 'Chorro del Indio (Parque Nacional)',
    municipio: 'San Cristóbal',
    lat: 7.742,
    lon: -72.172,
    altitudMsnm: 1380,
    tipo: 'montana',
    anclaOficial: 'Castra',
    copAnclaReferencia: 20000,
    aliases: ['el chorro del indio', 'via macanillo', 'mirador chorro del indio', 'macanillo'],
  },
  {
    clave: 'loma del viento',
    nombre: 'Loma del Viento (Mirador)',
    municipio: 'San Cristóbal / Capacho',
    lat: 7.788,
    lon: -72.275,
    altitudMsnm: 1340,
    tipo: 'montana',
    anclaOficial: 'Mirador',
    copAnclaReferencia: 22000,
    aliases: ['mirador loma del viento', 'cerro el cristo', 'cristo rey capacho'],
  },
  {
    clave: 'el vallado',
    nombre: 'El Vallado',
    municipio: 'Lobatera / Ureña',
    lat: 7.902,
    lon: -72.342,
    altitudMsnm: 1090,
    tipo: 'montana',
    anclaOficial: 'Lobatera',
    copAnclaReferencia: 50000,
    aliases: ['aldea el vallado', 'via san pedro del rio por el vallado'],
  },
  {
    clave: 'san pedro del rio',
    nombre: 'San Pedro del Río',
    municipio: 'Ayacucho',
    lat: 7.988,
    lon: -72.269,
    altitudMsnm: 790,
    tipo: 'montana',
    anclaOficial: 'Michelena',
    copAnclaReferencia: 60000,
    aliases: ['pueblo san pedro del rio', 'entrada san pedro del rio'],
  },
  {
    clave: 'borota',
    nombre: 'Borotá (Municipio Constitución)',
    municipio: 'Constitución',
    lat: 7.892,
    lon: -72.256,
    altitudMsnm: 1320,
    tipo: 'montana',
    anclaOficial: 'Palo Grande',
    copAnclaReferencia: 35000,
    aliases: ['pueblo de borota', 'constitucion borota', 'mochileros borota'],
  },
  {
    clave: 'zorca providencia',
    nombre: 'Zorca Providencia / Zorca San Isidro',
    municipio: 'Cárdenas / Independencia',
    lat: 7.768,
    lon: -72.265,
    altitudMsnm: 830,
    tipo: 'troncal',
    anclaOficial: 'Mirador',
    copAnclaReferencia: 22000,
    aliases: ['zorca', 'zorca san isidro', 'zorca pie de cuesta', 'via zorca'],
  },
  {
    clave: 'vega de aza',
    nombre: 'Vega de Aza',
    municipio: 'Torbes',
    lat: 7.615,
    lon: -72.185,
    altitudMsnm: 480,
    tipo: 'troncal',
    anclaOficial: 'San Josecito',
    copAnclaReferencia: 30000,
    aliases: ['peaje vega de aza', 'alcabala vega de aza', 'rio torbes vega de aza'],
  },
  {
    clave: 'el corozo',
    nombre: 'El Corozo (Vía Llano)',
    municipio: 'Torbes',
    lat: 7.695,
    lon: -72.218,
    altitudMsnm: 680,
    tipo: 'troncal',
    anclaOficial: 'Chucuri',
    copAnclaReferencia: 25000,
    aliases: ['alcabala el corozo', 'marginal del torbes sur', 'palmar de la cope'],
  },
  {
    clave: 'bramon',
    nombre: 'Bramón (Junín)',
    municipio: 'Junín',
    lat: 7.658,
    lon: -72.382,
    altitudMsnm: 1120,
    tipo: 'montana',
    anclaOficial: 'Rubio',
    copAnclaReferencia: 70000,
    aliases: ['pueblo de bramon', 'inapet bramon', 'via delicias'],
  },
  {
    clave: 'delicias',
    nombre: 'Delicias (Municipio Rafael Urdaneta)',
    municipio: 'Rafael Urdaneta',
    lat: 7.565,
    lon: -72.448,
    altitudMsnm: 1580,
    tipo: 'montana',
    anclaOficial: 'Rubio',
    copAnclaReferencia: 70000,
    aliases: ['pueblo de delicias', 'el tama', 'via delicias rubio'],
  },
  {
    clave: 'las dantas',
    nombre: 'Las Dantas / Peracal',
    municipio: 'Bolívar',
    lat: 7.772,
    lon: -72.392,
    altitudMsnm: 980,
    tipo: 'frontera',
    anclaOficial: 'San Antonio',
    copAnclaReferencia: 75000,
    aliases: ['peracal', 'alcabala peracal', 'apartaderos via san antonio'],
  },
  {
    clave: 'la mulera',
    nombre: 'La Mulera / Apartaderos',
    municipio: 'Bolívar / Libertad',
    lat: 7.798,
    lon: -72.362,
    altitudMsnm: 1210,
    tipo: 'montana',
    anclaOficial: 'Capacho',
    copAnclaReferencia: 35000,
    aliases: ['aldea la mulera', 'bosque la mulera'],
  },
  {
    clave: 'el cobre',
    nombre: 'El Cobre (Municipio José María Vargas)',
    municipio: 'José María Vargas',
    lat: 8.032,
    lon: -72.058,
    altitudMsnm: 1920,
    tipo: 'montana',
    anclaOficial: 'Zumbador',
    copAnclaReferencia: 120000,
    aliases: ['pueblo el cobre', 'municipio jose maria vargas'],
  },
  {
    clave: 'queniquea',
    nombre: 'Queniquea (Municipio Sucre)',
    municipio: 'Sucre',
    lat: 7.918,
    lon: -72.012,
    altitudMsnm: 1590,
    tipo: 'montana',
    anclaOficial: 'Zumbador',
    copAnclaReferencia: 120000,
    aliases: ['pueblo de queniquea', 'mesa del tigre', 'san pablo'],
  },
  {
    clave: 'seboruco',
    nombre: 'Seboruco',
    municipio: 'Seboruco',
    lat: 8.146,
    lon: -72.072,
    altitudMsnm: 910,
    tipo: 'montana',
    anclaOficial: 'LA GRITA',
    copAnclaReferencia: 171000,
    aliases: ['pueblo de seboruco', 'santa clara seboruco'],
  },
  {
    clave: 'pregonero',
    nombre: 'Pregonero (Municipio Uribante)',
    municipio: 'Uribante',
    lat: 7.988,
    lon: -71.756,
    altitudMsnm: 1270,
    tipo: 'montana',
    anclaOficial: 'LA GRITA',
    copAnclaReferencia: 171000,
    aliases: ['uribante pregonero', 'represa uribante caparo', 'la trampa'],
  },
  {
    clave: 'umuquena',
    nombre: 'Umuquena (San Judas Tadeo)',
    municipio: 'San Judas Tadeo',
    lat: 8.258,
    lon: -72.072,
    altitudMsnm: 380,
    tipo: 'troncal',
    anclaOficial: 'COLONCITO',
    copAnclaReferencia: 171000,
    aliases: ['san judas tadeo umuquena'],
  },
  {
    clave: 'las mesas',
    nombre: 'Las Mesas (Antonio Rómulo Costa)',
    municipio: 'Antonio Rómulo Costa',
    lat: 8.165,
    lon: -72.162,
    altitudMsnm: 440,
    tipo: 'troncal',
    anclaOficial: 'La Fria',
    copAnclaReferencia: 140000,
    aliases: ['las mesas de seboruco', 'piedra de moler'],
  },
  {
    clave: 'cucuta',
    nombre: 'Cúcuta / La Parada (Frontera Colombia)',
    municipio: 'Norte de Santander (Colombia)',
    lat: 7.889,
    lon: -72.496,
    altitudMsnm: 320,
    tipo: 'frontera',
    anclaOficial: 'San Antonio',
    copAnclaReferencia: 75000,
    aliases: ['la parada', 'cucuta centro', 'ventura plaza', 'aeropuerto camilo daza'],
  },
  {
    clave: 'urb las acacias',
    nombre: 'Urb. Las Acacias / Av. España',
    municipio: 'San Cristóbal',
    lat: 7.789,
    lon: -72.203,
    altitudMsnm: 985,
    tipo: 'urbano',
    anclaOficial: 'Pueblo Nuevo',
    copAnclaReferencia: 20000,
    aliases: ['las acacias', 'avenida espana', 'av espana', 'urb merida', 'urbanizacion merida'],
  },
  {
    clave: 'clinica cemoc',
    nombre: 'Clínica CEMOC / Policlínica Táchira / Cruz Roja',
    municipio: 'San Cristóbal',
    lat: 7.777,
    lon: -72.214,
    altitudMsnm: 930,
    tipo: 'urbano',
    anclaOficial: 'Barrio Obrero',
    copAnclaReferencia: 18000,
    aliases: ['cemoc', 'clinica san sebastian', 'clinica trinidad', 'clinica los andes', 'hospital militar'],
  },
  {
    clave: 'ula tachira',
    nombre: 'ULA Táchira / Paramillo Universitario',
    municipio: 'San Cristóbal',
    lat: 7.801,
    lon: -72.199,
    altitudMsnm: 1005,
    tipo: 'urbano',
    anclaOficial: 'Unet',
    copAnclaReferencia: 20000,
    aliases: ['universidad de los andes tachira', 'ula', 'ucab tachira', 'universidad catolica'],
  },
  {
    clave: 'barrio el rio',
    nombre: 'Barrio El Río / Las Flores / La Bermeja',
    municipio: 'San Cristóbal',
    lat: 7.768,
    lon: -72.212,
    altitudMsnm: 910,
    tipo: 'urbano',
    anclaOficial: 'Barrio Obrero',
    copAnclaReferencia: 18000,
    aliases: ['la bermeja', 'barrio las flores', 'santa ines'],
  },
  {
    clave: 'la popa',
    nombre: 'Sector La Popa / Puente Real',
    municipio: 'San Cristóbal',
    lat: 7.764,
    lon: -72.241,
    altitudMsnm: 810,
    tipo: 'urbano',
    anclaOficial: 'Centro 5ta/7ma',
    copAnclaReferencia: 15000,
    aliases: ['puente real', 'redoma el educador', 'av antonio jose de sucre'],
  },
  {
    clave: 'san agustin',
    nombre: 'San Agustín / La Blanca (Cárdenas)',
    municipio: 'Cárdenas',
    lat: 7.826,
    lon: -72.189,
    altitudMsnm: 1030,
    tipo: 'montana',
    anclaOficial: 'Guamito',
    copAnclaReferencia: 17000,
    aliases: ['la blanca tariba', 'mesa de aura', 'loma de pio'],
  },
  {
    clave: 'toica',
    nombre: 'Toicito / Toica / El Hiranzo',
    municipio: 'Cárdenas',
    lat: 7.791,
    lon: -72.226,
    altitudMsnm: 845,
    tipo: 'urbano',
    anclaOficial: 'Las Vegas',
    copAnclaReferencia: 10000,
    aliases: ['el hiranzo', 'pozo azul', 'colinas de toico'],
  },
]

export function distanciaHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function encontrarAnclasTarifariasCercanas(
  lat: number,
  lon: number,
  topografiaPunto: TopografiaTachira,
  parametros: ParametrosMotorTarifas,
  k = 3
): AnclaTarifariaReferencia[] {
  const distTaribaAlPuntoVial =
    distanciaHaversineKm(COORD_BASE_TARIBA.lat, COORD_BASE_TARIBA.lon, lat, lon) *
    parametros.factorCurvasAndinas

  const costoKm =
    topografiaPunto === 'frontera'
      ? parametros.costoKmFrontera
      : topografiaPunto === 'montana'
      ? parametros.costoKmMontana
      : topografiaPunto === 'troncal'
      ? parametros.costoKmTroncal
      : parametros.costoKmUrbano

  const candidatos = ANCLAS_OFICIALES_GEORREFERENCIADAS.map((ancla) => {
    const distLinealAnclaAlPunto = distanciaHaversineKm(
      ancla.lat,
      ancla.lon,
      lat,
      lon
    )
    const distVialAnclaAlPunto = Number(
      (distLinealAnclaAlPunto * parametros.factorCurvasAndinas).toFixed(2)
    )

    const distTaribaAlAnclaVial =
      distanciaHaversineKm(
        COORD_BASE_TARIBA.lat,
        COORD_BASE_TARIBA.lon,
        ancla.lat,
        ancla.lon
      ) * parametros.factorCurvasAndinas

    let ajustePorDistanciaCop = 0
    if (distVialAnclaAlPunto <= 0.6) {
      ajustePorDistanciaCop = 0
    } else if (distTaribaAlPuntoVial >= distTaribaAlAnclaVial) {
      ajustePorDistanciaCop = Math.round(distVialAnclaAlPunto * costoKm)
    } else {
      const deltaRadial = distTaribaAlPuntoVial - distTaribaAlAnclaVial
      const desvioLateral = Math.max(0, distVialAnclaAlPunto - Math.abs(deltaRadial))
      ajustePorDistanciaCop = Math.round(
        deltaRadial * (costoKm * 0.5) + desvioLateral * (costoKm * 0.85)
      )
    }

    const tarifaSinRedondear = Math.max(
      parametros.tarifaMinimaBaseCop,
      ancla.copOficial + ajustePorDistanciaCop
    )
    const tarifaInferidaPuntoCop = Math.round(tarifaSinRedondear / 1000) * 1000
    const ajusteRedondeado = tarifaInferidaPuntoCop - ancla.copOficial

    return {
      nombreOficial: ancla.nombreOficial,
      tipoTabla: ancla.tipoTabla,
      copOficial: ancla.copOficial,
      distanciaAlPuntoKm: distVialAnclaAlPunto,
      ajustePorDistanciaCop: ajusteRedondeado,
      tarifaInferidaPuntoCop,
      coordenadas: { lat: ancla.lat, lon: ancla.lon },
    } satisfies AnclaTarifariaReferencia
  })

  candidatos.sort((a, b) => a.distanciaAlPuntoKm - b.distanciaAlPuntoKm)
  return candidatos.slice(0, k)
}

export function inferirSectorPorDireccionLibre(texto: string): SectorCoordenada | null {
  const t = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  const matchCalle = t.match(/calle\s*(\d+)/)
  const matchCarrera = t.match(/carrera\s*(\d+)/)

  if (matchCalle || matchCarrera) {
    const numCalle = matchCalle ? parseInt(matchCalle[1], 10) : null
    const numCarrera = matchCarrera ? parseInt(matchCarrera[1], 10) : null

    if (t.includes('tariba')) {
      return {
        clave: 'tariba',
        nombre: `Casco Urbano Táriba (${texto.trim()})`,
        municipio: 'Cárdenas',
        lat: 7.8185,
        lon: -72.224,
        tipo: 'urbano',
        anclaOficial: 'Las Vegas',
        copAnclaReferencia: 10000,
      }
    }

    if (
      numCalle &&
      numCalle >= 8 &&
      numCalle <= 17 &&
      (!numCarrera || (numCarrera >= 14 && numCarrera <= 26))
    ) {
      return {
        clave: 'barrio obrero',
        nombre: `Barrio Obrero (${texto.trim()})`,
        municipio: 'San Cristóbal',
        lat: 7.7735 + (numCalle - 12) * 0.0008,
        lon: -72.218 + ((numCarrera || 20) - 20) * 0.0008,
        tipo: 'urbano',
        anclaOficial: 'Barrio Obrero',
        copAnclaReferencia: 18000,
      }
    }

    if (numCarrera && numCarrera >= 4 && numCarrera <= 10) {
      return {
        clave: 'centro',
        nombre: `Centro San Cristóbal (${texto.trim()})`,
        municipio: 'San Cristóbal',
        lat: 7.767,
        lon: -72.231,
        tipo: 'urbano',
        anclaOficial: 'Centro 5ta/7ma',
        copAnclaReferencia: 15000,
      }
    }
  }

  if (
    t.includes('aldea') ||
    t.includes('paramo') ||
    t.includes('loma') ||
    t.includes('cerro') ||
    t.includes('cuesta') ||
    t.includes('parte alta') ||
    t.includes('montana') ||
    t.includes('vereda') ||
    t.includes('urb') ||
    t.includes('barrio')
  ) {
    let hash = 0
    for (let i = 0; i < t.length; i++) {
      hash = (hash * 31 + t.charCodeAt(i)) % 1000
    }
    const offsetLat = ((hash % 40) - 20) * 0.0022
    const offsetLon = ((Math.floor(hash / 40) % 40) - 20) * 0.0022
    const esAlta =
      t.includes('aldea') ||
      t.includes('loma') ||
      t.includes('cerro') ||
      t.includes('cuesta') ||
      t.includes('parte alta')

    return {
      clave: `inferido_${t}`,
      nombre: `${texto.trim()} (${esAlta ? 'Zona Alta / Montaña' : 'Sector Residencial'})`,
      municipio: 'Táchira',
      lat: Number((7.788 + offsetLat).toFixed(4)),
      lon: Number((-72.214 + offsetLon).toFixed(4)),
      tipo: esAlta ? 'montana' : 'urbano',
    }
  }

  return null
}
