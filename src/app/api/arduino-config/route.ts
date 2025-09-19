import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      condominiumId,
      deviceName,
      deviceCode,
      connectionPort,
      baudRate,
      deviceLocation,
      deviceType,
      notes
    } = body

    // Validações básicas
    if (!condominiumId || !deviceName || !connectionPort) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Campos obrigatórios: condominiumId, deviceName, connectionPort' 
        },
        { status: 400 }
      )
    }

    // Verificar se já existe um Arduino com o mesmo código ou porta para este condomínio
    const existingArduino = await prisma.arduinoConfiguration.findFirst({
      where: {
        condominiumId,
        OR: [
          { deviceCode },
          { connectionPort }
        ]
      }
    })

    if (existingArduino) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Já existe um Arduino cadastrado com este código ou porta para este condomínio' 
        },
        { status: 400 }
      )
    }

    // Criar configuração do Arduino
    const arduinoConfig = await prisma.arduinoConfiguration.create({
      data: {
        condominiumId,
        deviceName,
        deviceCode: deviceCode || `ARD_${Date.now()}`,
        connectionPort,
        baudRate: baudRate || 9600,
        deviceLocation: deviceLocation || null,
        deviceType: deviceType || 'MAIN_GATE',
        notes: notes || null,
        isActive: true,
        isOnline: false
      }
    })

    return NextResponse.json({
      success: true,
      arduino: arduinoConfig,
      message: 'Arduino cadastrado com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao criar configuração do Arduino:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const condominiumId = searchParams.get('condominiumId')

    if (!condominiumId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'condominiumId é obrigatório' 
        },
        { status: 400 }
      )
    }

    const arduinoConfigs = await prisma.arduinoConfiguration.findMany({
      where: {
        condominiumId,
        isActive: true
      },
      orderBy: {
        deviceName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      configs: arduinoConfigs,
      count: arduinoConfigs.length
    })
  } catch (error) {
    console.error('Erro ao buscar configurações do Arduino:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      deviceName,
      deviceCode,
      connectionPort,
      baudRate,
      deviceLocation,
      deviceType,
      notes,
      isActive
    } = body

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID é obrigatório para atualização' 
        },
        { status: 400 }
      )
    }

    const updatedArduino = await prisma.arduinoConfiguration.update({
      where: { id },
      data: {
        deviceName: deviceName || undefined,
        deviceCode: deviceCode || undefined,
        connectionPort: connectionPort || undefined,
        baudRate: baudRate || undefined,
        deviceLocation: deviceLocation || undefined,
        deviceType: deviceType || undefined,
        notes: notes || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      arduino: updatedArduino,
      message: 'Arduino atualizado com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao atualizar configuração do Arduino:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID é obrigatório para exclusão' 
        },
        { status: 400 }
      )
    }

    await prisma.arduinoConfiguration.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Arduino removido com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao remover configuração do Arduino:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}
