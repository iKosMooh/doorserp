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

    const formattedLogs = logs.map((log) => {
      const personName = extractPersonNameFromNotes(log.notes) || "Usuário Desconhecido"
      const status = mapStatus(log.status)
      
      return {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        personName,
        personType: log.accessType as "RESIDENT" | "EMPLOYEE" | "GUEST",
        accessType: log.entryExit === "EXIT" ? "EXIT" : "ENTRY" as "ENTRY" | "EXIT",
        method: extractMethodFromNotes(log.notes) || "FACIAL_RECOGNITION" as "FACIAL_RECOGNITION" | "KEY_CARD" | "MANUAL",
        location: log.location || "Portaria Principal",
        status: status as "APPROVED" | "DENIED" | "FORCED",
        notes: log.notes,
        unitNumber: extractUnitFromLocation(log.location),
        building: extractBuildingFromLocation(log.location)
      }
    })

    return NextResponse.json(formattedLogs)
  } catch (error) {
    console.error("Erro ao buscar logs de acesso:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

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
    default: return "DENIED"
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.personName && body.confidence !== undefined) {
      const { 
        condominiumId,
        personName,
        accessType, 
        unitNumber,
        building,
        status = 'DENIED',
        method = 'FACIAL_RECOGNITION',
        confidence,
        timestamp
      } = body

      if (!personName || !accessType || !condominiumId) {
        return NextResponse.json(
          { error: "Nome da pessoa, tipo de acesso e condomínio são obrigatórios" },
          { status: 400 }
        )
      }

      if (personName === 'Usuário Desconhecido' || 
          personName === 'Pessoa não identificada' ||
          personName.includes('Desconhecido') || 
          personName.includes('unknown') ||
          personName.includes('não identificada') ||
          !personName.trim()) {
        console.warn(`🚫 BLOQUEADO: Tentativa de criar log para usuário não identificado: "${personName}"`)
        return NextResponse.json(
          { 
            success: false, 
            message: "Logs para usuários não identificados não são permitidos por segurança" 
          },
          { status: 403 }
        )
      }

      const accessTypeMap: { [key: string]: string } = {
        'RESIDENT': 'RESIDENT',
        'EMPLOYEE': 'EMPLOYEE', 
        'GUEST': 'GUEST'
      }

      const mappedAccessType = accessTypeMap[accessType] || 'GUEST'

      const statusMap: { [key: string]: string } = {
        'APPROVED': 'APPROVED',
        'DENIED': 'REJECTED',
        'REJECTED': 'REJECTED',
        'PENDING': 'PENDING'
      }

      const mappedStatus = statusMap[status] || 'REJECTED'
      
      let finalStatus = mappedStatus
      if (personName.includes('Desconhecido') || personName.includes('não identificada') || personName.includes('unknown') || !personName.trim()) {
        console.error('🚨 ERRO CRÍTICO DE SEGURANÇA: Tentativa de aprovar acesso para usuário não identificado!')
        finalStatus = 'REJECTED'
      }

      const accessLog = await prisma.accessLog.create({
        data: {
          condominiumId,
          accessType: mappedAccessType as "RESIDENT" | "EMPLOYEE" | "GUEST",
          accessMethod: "FACIAL_RECOGNITION",
          status: finalStatus as "APPROVED" | "REJECTED" | "PENDING",
          entryExit: "ENTRY",
          location: unitNumber && building ? `Prédio ${building} - Unidade ${unitNumber}` : 'Portaria Principal',
          notes: `Reconhecimento facial: ${personName} (${(confidence * 100).toFixed(1)}% confiança) - Método: ${method}`,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: "Log de acesso por reconhecimento facial registrado",
        log: {
          ...accessLog,
          personName,
        }
      })
    } else {
      const { 
        condominiumId,
        userId,
        accessType, 
        method, 
        location, 
        status,
        notes
      } = body

      if (!accessType || !status || !condominiumId) {
        return NextResponse.json(
          { error: "Tipo de acesso, status e condomínio são obrigatórios" },
          { status: 400 }
        )
      }

      let user = null
      if (userId) {
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cleanupType = searchParams.get('cleanup')
    
    if (cleanupType === 'unknown-users') {
      const result = await prisma.accessLog.deleteMany({
        where: {
          OR: [
            { notes: { contains: 'Usuário Desconhecido' } },
            { notes: { contains: 'Pessoa não identificada' } },
            { notes: { contains: 'unknown' } },
            { notes: { contains: 'Desconhecido' } },
            { notes: null }
          ]
        }
      })
      
      console.log(`🧹 Removidos ${result.count} logs de usuários não identificados`)
      
      return NextResponse.json({
        success: true,
        message: `${result.count} logs de usuários não identificados foram removidos`,
        count: result.count
      })
    }
    
    return NextResponse.json(
      { error: "Tipo de limpeza não especificado ou inválido" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Erro ao limpar logs:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

