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

    // Validar formato do ID (aceita UUID ou CUID do Prisma)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const cuidRegex = /^c[a-z0-9]{24,25}$/i
    
    if (!uuidRegex.test(condominiumId) && !cuidRegex.test(condominiumId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID do condomínio deve ser um UUID ou CUID válido',
          received: condominiumId,
          receivedLength: condominiumId.length
        },
        { status: 400 }
      )
    }

    // Verificar se o condomínio existe
    const condominium = await prisma.condominium.findFirst({
      where: {
        id: condominiumId,
        isActive: true
      }
    })

    if (!condominium) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Condomínio não encontrado ou inativo' 
        },
        { status: 404 }
      )
    }

    // Verificar se já existe um Arduino ATIVO com o mesmo código ou porta para este condomínio
    const existingArduino = await prisma.arduinoConfiguration.findFirst({
      where: {
        condominiumId,
        isActive: true, // Verifica apenas registros ativos
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
          error: 'Já existe um Arduino ativo com este código ou porta para este condomínio',
          existingDevice: {
            name: existingArduino.deviceName,
            code: existingArduino.deviceCode,
            port: existingArduino.connectionPort
          }
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

    // Se não tiver condominiumId, retorna dados mock para demonstração
    if (!condominiumId) {
      const mockDevices = [
        {
          id: '1',
          name: 'Arduino Cancela Principal',
          location: 'Portaria A',
          port: 'COM4',
          connected: true,
          lastSeen: new Date().toISOString(),
          firmwareVersion: '1.2.0',
          ipAddress: '192.168.1.100',
          type: 'gate' as const
        },
        {
          id: '2',
          name: 'Arduino Acesso Pedestre',
          location: 'Portaria B',
          port: 'COM5',
          connected: false,
          lastSeen: new Date(Date.now() - 3600000).toISOString(),
          firmwareVersion: '1.1.0',
          type: 'access' as const
        },
        {
          id: '3',
          name: 'Arduino LEDs Garagem',
          location: 'Subsolo',
          port: 'COM6',
          connected: true,
          lastSeen: new Date().toISOString(),
          firmwareVersion: '1.0.5',
          type: 'led' as const
        }
      ]

      return NextResponse.json({
        success: true,
        devices: mockDevices,
        count: mockDevices.length
      })
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

    // Converte para o formato esperado pelo componente
    const devices = arduinoConfigs.map(config => ({
      id: config.id,
      name: config.deviceName,
      location: config.deviceLocation || 'Não especificado',
      port: config.connectionPort,
      connected: config.isOnline || false,
      lastSeen: config.updatedAt.toISOString(),
      firmwareVersion: config.deviceCode || 'N/A',
      type: (config.deviceType?.toLowerCase() || 'sensor') as 'gate' | 'access' | 'led' | 'sensor'
    }))

    return NextResponse.json({
      success: true,
      devices,
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
