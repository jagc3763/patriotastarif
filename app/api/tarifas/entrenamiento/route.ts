import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { ESTADO_APRENDIZAJE_INICIAL } from '@/lib/tarifas/aprendizaje'
import { obtenerDbSaneada, PARAMETROS_DEFAULT } from '@/lib/tarifas/engine'
import {
  EstadoAprendizajeMotor,
  ParametrosMotorTarifas,
  TarifasTachiraDB,
} from '@/lib/tarifas/types'

const ARCHIVO_ENTRENAMIENTO_SERVER = '/tmp/patriotas-entrenamiento-v1.json'

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
  await fs.writeFile(
    ARCHIVO_ENTRENAMIENTO_SERVER,
    JSON.stringify(snapshot, null, 2),
    'utf-8'
  )
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
