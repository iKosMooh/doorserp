import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/guests/active
 * Lista visitantes ativos com informações de timeout
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const condominiumId = searchParams.get('condominiumId')
    
    if (!condominiumId) {
      return NextResponse.json({
        success: false,
        message: 'ID do condomínio é obrigatório'
      }, { status: 400 })
    }

    const guests = await prisma.guest.findMany({
      where: {
        condominiumId,
        isActive: true,
        validUntil: { gte: new Date() }
      },
      include: {
        invitedByResident: {
          include: {
            user: { select: { name: true, phone: true } },
            unit: { select: { block: true, number: true } }
          }
        },
        invitedByEmployee: {
          include: {
            user: { select: { name: true, phone: true } }
          }
        },
        accessLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          select: {
            id: true,
            timestamp: true,
            entryExit: true,
            status: true,
            location: true
          }
        }
      },
      orderBy: [
        { validUntil: 'asc' }
      ]
    })

    // Calcular status e tempo restante para cada visitante
    const guestsWithStatus = guests.map(guest => {
      const now = new Date()
      const timeRemainingMs = guest.validUntil.getTime() - now.getTime()
      const minutesRemaining = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60)))
      
      let status = 'active'
      if (timeRemainingMs <= 0) {
        status = 'expired'
      } else if (minutesRemaining <= 10) {
        status = 'expiring_soon'
      }

      return {
        ...guest,
        timeStatus: {
          status,
          minutesRemaining,
          hoursRemaining: Math.floor(minutesRemaining / 60),
          timeRemainingFormatted: formatTimeRemaining(minutesRemaining)
        }
      }
    })

    return NextResponse.json({
      success: true,
      guests: guestsWithStatus,
      summary: {
        total: guestsWithStatus.length,
        active: guestsWithStatus.filter(g => g.timeStatus.status === 'active').length,
        expiringSoon: guestsWithStatus.filter(g => g.timeStatus.status === 'expiring_soon').length,
        expired: guestsWithStatus.filter(g => g.timeStatus.status === 'expired').length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar visitantes ativos:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

/**
 * POST /api/guests/active
 * Cria um novo visitante com timeout automático
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      document,
      phone,
      condominiumId,
      invitedByResidentId,
      invitedByEmployeeId,
      visitPurpose,
      vehiclePlate,
      accessDurationMinutes = 60, // Padrão: 1 hora
      maxEntries = 1,
      enableFaceRecognition = false,
      authorizedLocations = ['main_entrance'],
      notes
    } = body

    // Validações básicas
    if (!name || !condominiumId || !invitedByResidentId) {
      return NextResponse.json({
        success: false,
        message: 'Nome, condomínio e residente que convida são obrigatórios'
      }, { status: 400 })
    }

    // Verificar se o residente existe e está ativo
    const resident = await prisma.resident.findFirst({
      where: {
        id: invitedByResidentId,
        condominiumId,
        isActive: true
      }
    })

    if (!resident) {
      return NextResponse.json({
        success: false,
        message: 'Residente não encontrado ou inativo neste condomínio'
      }, { status: 404 })
    }

    // Gerar código de acesso único
    const accessCode = generateAccessCode()

    // Calcular tempo de expiração
    const validFrom = new Date()
    const validUntil = new Date(validFrom.getTime() + (accessDurationMinutes * 60 * 1000))

    // Criar visitante
    const guest = await prisma.guest.create({
      data: {
        name,
        document,
        phone,
        condominiumId,
        invitedByResidentId,
        invitedByEmployeeId,
        visitPurpose,
        vehiclePlate,
        accessCode,
        validFrom,
        validUntil,
        accessDurationMinutes,
        autoExpire: true,
        maxEntries,
        currentEntries: 0,
        authorizedLocations,
        faceRecognitionEnabled: enableFaceRecognition,
        faceRecognitionFolder: enableFaceRecognition ? 
          `Visitor_${name.replace(/\s+/g, '_')}_${Date.now()}` : null,
        notificationSent: false,
        notes
      },
      include: {
        invitedByResident: {
          include: {
            user: { select: { name: true, phone: true } },
            unit: { select: { block: true, number: true } }
          }
        }
      }
    })

    // Se reconhecimento facial está habilitado, criar pasta
    if (enableFaceRecognition && guest.faceRecognitionFolder) {
      try {
        await fetch('/api/face-recognition/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: guest.id, 
            isGuest: true 
          })
        })
      } catch (syncError) {
        console.warn('Erro ao criar pasta de reconhecimento facial:', syncError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Visitante criado com sucesso',
      guest: {
        ...guest,
        timeStatus: {
          minutesRemaining: accessDurationMinutes,
          hoursRemaining: Math.floor(accessDurationMinutes / 60),
          timeRemainingFormatted: formatTimeRemaining(accessDurationMinutes)
        }
      }
    })

  } catch (error) {
    console.error('Erro ao criar visitante:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

/**
 * PUT /api/guests/active
 * Estende o tempo de acesso de um visitante
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, additionalMinutes, reason } = body

    if (!guestId || !additionalMinutes) {
      return NextResponse.json({
        success: false,
        message: 'ID do visitante e minutos adicionais são obrigatórios'
      }, { status: 400 })
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        invitedByResident: {
          include: {
            user: { select: { name: true } },
            unit: { select: { block: true, number: true } }
          }
        }
      }
    })

    if (!guest || !guest.isActive) {
      return NextResponse.json({
        success: false,
        message: 'Visitante não encontrado ou inativo'
      }, { status: 404 })
    }

    // Estender tempo de acesso
    const newValidUntil = new Date(guest.validUntil.getTime() + (additionalMinutes * 60 * 1000))
    const newAccessDuration = guest.accessDurationMinutes + additionalMinutes

    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        validUntil: newValidUntil,
        accessDurationMinutes: newAccessDuration,
        notes: `${guest.notes || ''}\n[${new Date().toLocaleString('pt-BR')}] Tempo estendido em ${additionalMinutes} minutos. ${reason ? `Motivo: ${reason}` : ''}`
      }
    })

    return NextResponse.json({
      success: true,
      message: `Tempo de acesso estendido em ${additionalMinutes} minutos`,
      guest: updatedGuest
    })

  } catch (error) {
    console.error('Erro ao estender tempo de visitante:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/guests/active
 * Remove/expira um visitante antes do tempo
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const guestId = searchParams.get('guestId')
    const reason = searchParams.get('reason')

    if (!guestId) {
      return NextResponse.json({
        success: false,
        message: 'ID do visitante é obrigatório'
      }, { status: 400 })
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId }
    })

    if (!guest) {
      return NextResponse.json({
        success: false,
        message: 'Visitante não encontrado'
      }, { status: 404 })
    }

    // Desativar visitante
    await prisma.guest.update({
      where: { id: guestId },
      data: {
        isActive: false,
        validUntil: new Date(), // Expirar imediatamente
        notes: `${guest.notes || ''}\n[${new Date().toLocaleString('pt-BR')}] Acesso revogado manualmente. ${reason ? `Motivo: ${reason}` : ''}`
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Acesso do visitante revogado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao revogar acesso de visitante:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Funções auxiliares
function generateAccessCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Expirado'
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`
  } else {
    return `${remainingMinutes}min`
  }
}
