import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { ESTADO_APRENDIZAJE_INICIAL } from '@/lib/tarifas/aprendizaje'
import { obtenerDbSaneada, PARAMETROS_DEFAULT } from '@/lib/tarifas/engine'
import {
  EstadoAprendizajeMotor,
  ParametrosMotorTarifas,
  TarifasTachiraDB,
} from '@/lib/tarifas/types'

const DIRECTORIO_DATOS = process.env.PATRIOTAS_DATA_DIR || path.join(process.cwd(), '.data')
const ARCHIVO_ENTRENAMIENTO_SERVER = path.join(
  DIRECTORIO_DATOS,
  'patriotas-entrenamiento-v1.json'
)
let colaEscrituras: Promise<void> = Promise.resolve()

export interface SnapshotEntrenamientoServidor {
  actualizadoEn: string
  parametros: ParametrosMotorTarifas
  estadoAprendizaje: EstadoAprendizajeMotor
  db: TarifasTachiraDB
}

export async function leerSnapshotEntrenamiento(): Promise<SnapshotEntrenamientoServidor> {
  try {
    const contenido = await fs.readFile(ARCHIVO_ENTRENAMIENTO_SERVER, 'utf-8')
    const parsed = JSON.parse(contenido) as SnapshotEntrenamientoServidor
    if (parsed && parsed.parametros && parsed.estadoAprendizaje && parsed.db) {
      return parsed
    }
  } catch {
    // Si aún no existe el archivo en /tmp, retornamos el estado inicial
  }

  return {
    actualizadoEn: new Date().toISOString(),
    parametros: PARAMETROS_DEFAULT,
    estadoAprendizaje: ESTADO_APRENDIZAJE_INICIAL,
    db: obtenerDbSaneada(),
  }
}

export async function guardarSnapshotEntrenamiento(
  snapshot: SnapshotEntrenamientoServidor
): Promise<void> {
  const escribir = async () => {
    await fs.mkdir(DIRECTORIO_DATOS, { recursive: true })
    const temporal = `${ARCHIVO_ENTRENAMIENTO_SERVER}.tmp`
    await fs.writeFile(temporal, JSON.stringify(snapshot, null, 2), 'utf-8')
    await fs.rename(temporal, ARCHIVO_ENTRENAMIENTO_SERVER)
  }

  const siguiente = colaEscrituras.then(escribir, escribir)
  colaEscrituras = siguiente.catch(() => {})
  await siguiente
}

export async function GET() {
  const snapshot = await leerSnapshotEntrenamiento()
  return NextResponse.json({
    ok: true,
    ...snapshot,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.accion === 'reset') {
      const inicial: SnapshotEntrenamientoServidor = {
        actualizadoEn: new Date().toISOString(),
        parametros: PARAMETROS_DEFAULT,
        estadoAprendizaje: ESTADO_APRENDIZAJE_INICIAL,
        db: obtenerDbSaneada(),
      }
      await guardarSnapshotEntrenamiento(inicial)
      return NextResponse.json({
        ok: true,
        mensaje: 'Memoria de entrenamiento restaurada a los valores originales.',
        ...inicial,
      })
    }

    const actual = await leerSnapshotEntrenamiento()
    const nuevoSnapshot: SnapshotEntrenamientoServidor = {
      actualizadoEn: new Date().toISOString(),
      parametros: body.parametros ?? actual.parametros,
      estadoAprendizaje: body.estadoAprendizaje ?? actual.estadoAprendizaje,
      db: body.db ?? actual.db,
    }

    await guardarSnapshotEntrenamiento(nuevoSnapshot)

    return NextResponse.json({
      ok: true,
      mensaje: 'Entrenamiento guardado y propagado al motor de cálculo.',
      ...nuevoSnapshot,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al guardar el entrenamiento',
      },
      { status: 400 }
    )
  }
}
