import { NextRequest, NextResponse } from 'next/server'
import {
  calcularTarifaPatriotas,
  OPCIONES_VIAJE_DEFAULT,
  PARAMETROS_DEFAULT,
} from '@/lib/tarifas/engine'
import { OpcionesViaje, ParametrosMotorTarifas } from '@/lib/tarifas/types'
import { leerSnapshotEntrenamiento } from '@/app/api/tarifas/entrenamiento/route'

export async function GET(request: NextRequest) {
  const snapshot = await leerSnapshotEntrenamiento()
  const { searchParams } = new URL(request.url)
  const origen = searchParams.get('origen') || 'Táriba'
  const destino = searchParams.get('destino') || 'Pueblo Nuevo'
  const tasaCop =
    Number(searchParams.get('tasaCop')) || snapshot.parametros.tasaCopPorUsd
  const tasaBcv =
    Number(searchParams.get('tasaBcv')) || snapshot.parametros.tasaBcvPorUsd
  const nocturno = searchParams.get('nocturno') === 'true'
  const lluvia = searchParams.get('lluvia') === 'true'
  const feriado = searchParams.get('feriado') === 'true'

  const resultado = calcularTarifaPatriotas(
    origen,
    destino,
    {
      ...snapshot.parametros,
      tasaCopPorUsd: tasaCop,
      tasaBcvPorUsd: tasaBcv,
    },
    {
      ...OPCIONES_VIAJE_DEFAULT,
      nocturno,
      lluvia,
      feriado,
    },
    snapshot.db,
    null,
    snapshot.estadoAprendizaje
  )

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    leccionesActivas: snapshot.estadoAprendizaje.lecciones.length,
    data: resultado,
  })
}

export async function POST(request: NextRequest) {
  try {
    const snapshot = await leerSnapshotEntrenamiento()
    const body = await request.json()
    const origen: string = body.origen || 'Táriba'
    const destino: string = body.destino || 'Pueblo Nuevo'

    const parametros: ParametrosMotorTarifas = {
      ...snapshot.parametros,
      ...(body.parametros || {}),
    }

    const opciones: OpcionesViaje = {
      ...OPCIONES_VIAJE_DEFAULT,
      ...(body.opciones || {}),
    }

    const resultado = calcularTarifaPatriotas(
      origen,
      destino,
      parametros,
      opciones,
      body.db ?? snapshot.db,
      body.telemetriaMapa ?? null,
      body.estadoAprendizaje ?? snapshot.estadoAprendizaje
    )

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      leccionesActivas: (body.estadoAprendizaje ?? snapshot.estadoAprendizaje)
        .lecciones.length,
      data: resultado,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al procesar cálculo de tarifa',
      },
      { status: 400 }
    )
  }
}
