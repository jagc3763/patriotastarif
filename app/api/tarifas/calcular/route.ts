import { NextRequest, NextResponse } from 'next/server'
import {
  calcularTarifaPatriotas,
  OPCIONES_VIAJE_DEFAULT,
  PARAMETROS_DEFAULT,
} from '@/lib/tarifas/engine'
import { OpcionesViaje, ParametrosMotorTarifas } from '@/lib/tarifas/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origen = searchParams.get('origen') || 'Táriba'
  const destino = searchParams.get('destino') || 'Pueblo Nuevo'
  const tasaCop = Number(searchParams.get('tasaCop')) || PARAMETROS_DEFAULT.tasaCopPorUsd
  const tasaBcv = Number(searchParams.get('tasaBcv')) || PARAMETROS_DEFAULT.tasaBcvPorUsd
  const nocturno = searchParams.get('nocturno') === 'true'
  const lluvia = searchParams.get('lluvia') === 'true'
  const feriado = searchParams.get('feriado') === 'true'

  const resultado = calcularTarifaPatriotas(
    origen,
    destino,
    {
      ...PARAMETROS_DEFAULT,
      tasaCopPorUsd: tasaCop,
      tasaBcvPorUsd: tasaBcv,
    },
    {
      ...OPCIONES_VIAJE_DEFAULT,
      nocturno,
      lluvia,
      feriado,
    }
  )

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    data: resultado,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const origen: string = body.origen || 'Táriba'
    const destino: string = body.destino || 'Pueblo Nuevo'

    const parametros: ParametrosMotorTarifas = {
      ...PARAMETROS_DEFAULT,
      ...(body.parametros || {}),
    }

    const opciones: OpcionesViaje = {
      ...OPCIONES_VIAJE_DEFAULT,
      ...(body.opciones || {}),
    }

    const resultado = calcularTarifaPatriotas(origen, destino, parametros, opciones)

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      data: resultado,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error al procesar cálculo de tarifa',
      },
      { status: 400 }
    )
  }
}
