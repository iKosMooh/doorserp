import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '100')

    let whereClause = {}
    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      whereClause = {
        timestamp: {
          gte: startDate,
          lt: endDate
        }
      }
    }

    const logs = await prisma.accessLog.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    })

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      personName: extractPersonNameFromNotes(log.notes) || "Usuário Desconhecido",
      personType: log.accessType as "RESIDENT" | "EMPLOYEE" | "GUEST",
      accessType: log.entryExit === "EXIT" ? "EXIT" : "ENTRY" as "ENTRY" | "EXIT",
      method: extractMethodFromNotes(log.notes) || "FACIAL_RECOGNITION" as "FACIAL_RECOGNITION" | "KEY_CARD" | "MANUAL",
      location: log.location || "Portaria Principal",
      status: mapStatus(log.status) as "APPROVED" | "DENIED" | "FORCED",
      notes: log.notes,
      unitNumber: extractUnitFromLocation(log.location),
      building: extractBuildingFromLocation(log.location)
    }))

    return NextResponse.json(formattedLogs)
  } catch (error) {
    console.error("Erro ao buscar logs de acesso:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// Funções auxiliares
function extractPersonNameFromNotes(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/Reconhecimento facial: ([^(]+)/)
  return match ? match[1].trim() : null
}

function extractMethodFromNotes(notes: string | null): string {
  if (!notes) return "FACIAL_RECOGNITION"
  if (notes.includes("Reconhecimento facial")) return "FACIAL_RECOGNITION"
  if (notes.includes("Cartão")) return "KEY_CARD"
  return "MANUAL"
}

function extractUnitFromLocation(location: string | null): string | undefined {
  if (!location) return undefined
  const match = location.match(/Unidade (\d+)/)
  return match ? match[1] : undefined
}

function extractBuildingFromLocation(location: string | null): string | undefined {
  if (!location) return undefined
  const match = location.match(/Prédio ([A-Z])/)
  return match ? match[1] : undefined
}

function mapStatus(status: string): string {
  switch (status) {
    case "APPROVED": return "APPROVED"
    case "REJECTED": return "DENIED"
    case "PENDING": return "DENIED"
    default: return "APPROVED"
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Suporte para dois tipos de entrada: facial recognition e sistema regular
    if (body.personName && body.confidence !== undefined) {
      // Este é um log do reconhecimento facial
      const { 
        condominiumId,
        personName,
        accessType, 
        unitNumber,
        building,
        status = 'APPROVED',
        method = 'FACIAL_RECOGNITION',
        confidence,
        timestamp
      } = body

      // Validações básicas
      if (!personName || !accessType || !condominiumId) {
        return NextResponse.json(
          { error: "Nome da pessoa, tipo de acesso e condomínio são obrigatórios" },
          { status: 400 }
        )
      }

      // Mapear tipos de acesso
      const accessTypeMap: { [key: string]: string } = {
        'RESIDENT': 'RESIDENT',
        'EMPLOYEE': 'EMPLOYEE', 
        'GUEST': 'GUEST'
      }

      const mappedAccessType = accessTypeMap[accessType] || 'GUEST'

      // Mapear status
      const statusMap: { [key: string]: string } = {
        'APPROVED': 'APPROVED',
        'DENIED': 'REJECTED',
        'REJECTED': 'REJECTED',
        'PENDING': 'PENDING'
      }

      const mappedStatus = statusMap[status] || 'APPROVED'

      // Criar log de acesso para reconhecimento facial (sem userId obrigatório)
      const accessLog = await prisma.accessLog.create({
        data: {
          condominiumId,
          accessType: mappedAccessType as "RESIDENT" | "EMPLOYEE" | "GUEST",
          accessMethod: "FACIAL_RECOGNITION",
          status: mappedStatus as "APPROVED" | "REJECTED" | "PENDING",
          entryExit: "ENTRY",
          location: unitNumber && building ? `Prédio ${building} - Unidade ${unitNumber}` : 'Portaria Principal',
          notes: `Reconhecimento facial: ${personName} (${(confidence * 100).toFixed(1)}% confiança) - Método: ${method}`,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      })

      console.log('✅ Log de reconhecimento facial salvo:', {
        id: accessLog.id,
        person: personName,
        confidence: `${(confidence * 100).toFixed(1)}%`,
        location: accessLog.location
      })

      return NextResponse.json({
        success: true,
        message: "Log de acesso por reconhecimento facial registrado",
        log: {
          ...accessLog,
          personName, // Adicionar o nome da pessoa para referência
        }
      })
    } else {
      // Sistema regular (código original)
      const { 
        condominiumId,
        userId,
        accessType, 
        method, 
        location, 
        status,
        notes
      } = body

      // Validações básicas para sistema regular
      if (!accessType || !status || !condominiumId) {
        return NextResponse.json(
          { error: "Tipo de acesso, status e condomínio são obrigatórios" },
          { status: 400 }
        )
      }

      let user = null
      if (userId) {
        // Verificar se o usuário existe apenas se userId foi fornecido
        user = await prisma.user.findUnique({
          where: { id: userId }
        })

        if (!user) {
          return NextResponse.json(
            { error: "Usuário não encontrado" },
            { status: 404 }
          )
        }
      }

      // Criar log de acesso
      const accessLog = await prisma.accessLog.create({
        data: {
          condominiumId,
          userId: userId || undefined,
          accessType: accessType as "RESIDENT" | "EMPLOYEE" | "GUEST",
          accessMethod: (method as "FACIAL_RECOGNITION" | "ACCESS_CARD" | "ACCESS_CODE" | "MANUAL" | "EMERGENCY") || "MANUAL",
          status: status as "APPROVED" | "REJECTED" | "PENDING",
          entryExit: "ENTRY",
          location: location || 'Portaria Principal',
          notes,
          timestamp: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: "Log de acesso registrado com sucesso",
        log: accessLog
      })
    }

  } catch (error) {
    console.error("Erro ao criar log de acesso:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
