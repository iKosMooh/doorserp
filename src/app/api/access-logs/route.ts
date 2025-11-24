import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = searchParams.get('limit') === 'all' 
      ? undefined 
      : parseInt(searchParams.get('limit') || '25')

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

    const orderBy = {
      timestamp: 'desc' as const
    }

    // Se limit é undefined (all), buscar tudo sem paginação
    if (limit === undefined) {
      const logs = await prisma.accessLog.findMany({
        where: whereClause,
        orderBy,
        include: {
          user: {
            include: {
              residents: {
                include: {
                  unit: true
                }
              }
            }
          },
          guest: {
            include: {
              invitedByResident: {
                include: {
                  unit: true
                }
              }
            }
          }
        }
      })

      const formattedLogs = logs.map((log) => {
        // Extrair nome da pessoa: primeiro tenta user, depois guest, depois notes
        let personName = "Usuário Desconhecido"
        let unitNumber: string | undefined
        let building: string | undefined
        
        if (log.user) {
          personName = log.user.name
          // Pegar unidade do primeiro resident associado
          if (log.user.residents && log.user.residents.length > 0) {
            const resident = log.user.residents[0]
            unitNumber = resident.unit.number
            building = resident.unit.block
          }
        } else if (log.guest) {
          personName = log.guest.name
          // Pegar unidade do morador que convidou
          if (log.guest.invitedByResident?.unit) {
            unitNumber = log.guest.invitedByResident.unit.number
            building = log.guest.invitedByResident.unit.block
          }
        } else {
          // Tentar extrair das notes como fallback
          personName = extractPersonNameFromNotes(log.notes) || "Usuário Desconhecido"
          unitNumber = extractUnitFromLocation(log.location)
          building = extractBuildingFromLocation(log.location)
        }
        
        const status = mapStatus(log.status)
        
        return {
          id: log.id,
          timestamp: log.timestamp.toISOString(),
          personName,
          personType: log.accessType as "RESIDENT" | "EMPLOYEE" | "GUEST",
          accessType: log.entryExit === "EXIT" ? "EXIT" : "ENTRY" as "ENTRY" | "EXIT",
          method: extractMethodFromNotes(log.notes) || mapAccessMethod(log.accessMethod),
          location: log.location || "Portaria Principal",
          status: status as "APPROVED" | "DENIED" | "FORCED",
          notes: log.notes,
          unitNumber,
          building
        }
      })

      return NextResponse.json({
        data: formattedLogs,
        pagination: {
          total: formattedLogs.length,
          page: 1,
          limit: formattedLogs.length,
          totalPages: 1
        }
      })
    }

    // Com paginação
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            include: {
              residents: {
                include: {
                  unit: true
                }
              }
            }
          },
          guest: {
            include: {
              invitedByResident: {
                include: {
                  unit: true
                }
              }
            }
          }
        }
      }),
      prisma.accessLog.count({ where: whereClause })
    ])

    const formattedLogs = logs.map((log) => {
      // Extrair nome da pessoa: primeiro tenta user, depois guest, depois notes
      let personName = "Usuário Desconhecido"
      let unitNumber: string | undefined
      let building: string | undefined
      
      if (log.user) {
        personName = log.user.name
        // Pegar unidade do primeiro resident associado
        if (log.user.residents && log.user.residents.length > 0) {
          const resident = log.user.residents[0]
          unitNumber = resident.unit.number
          building = resident.unit.block
        }
      } else if (log.guest) {
        personName = log.guest.name
        // Pegar unidade do morador que convidou
        if (log.guest.invitedByResident?.unit) {
          unitNumber = log.guest.invitedByResident.unit.number
          building = log.guest.invitedByResident.unit.block
        }
      } else {
        // Tentar extrair das notes como fallback
        personName = extractPersonNameFromNotes(log.notes) || "Usuário Desconhecido"
        unitNumber = extractUnitFromLocation(log.location)
        building = extractBuildingFromLocation(log.location)
      }
      
      const status = mapStatus(log.status)
      
      return {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        personName,
        personType: log.accessType as "RESIDENT" | "EMPLOYEE" | "GUEST",
        accessType: log.entryExit === "EXIT" ? "EXIT" : "ENTRY" as "ENTRY" | "EXIT",
        method: extractMethodFromNotes(log.notes) || mapAccessMethod(log.accessMethod),
        location: log.location || "Portaria Principal",
        status: status as "APPROVED" | "DENIED" | "FORCED",
        notes: log.notes,
        unitNumber,
        building
      }
    })

    return NextResponse.json({
      data: formattedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
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
  
  // Tentar extrair do reconhecimento facial
  const matchFacial = notes.match(/Reconhecimento facial: ([^(]+)/)
  if (matchFacial) return matchFacial[1].trim()
  
  // Tentar extrair do código QR
  const matchQR = notes.match(/Acesso por código QR: (.+)/)
  if (matchQR) return matchQR[1].trim()
  
  // Tentar extrair padrão genérico de nome seguido de parenteses
  const matchGeneric = notes.match(/^([^(]+)\s*\(/)
  if (matchGeneric) return matchGeneric[1].trim()
  
  return null
}

function extractMethodFromNotes(notes: string | null): string {
  if (!notes) return "FACIAL_RECOGNITION"
  if (notes.includes("Reconhecimento facial")) return "FACIAL_RECOGNITION"
  if (notes.includes("Cartão")) return "KEY_CARD"
  if (notes.includes("código QR") || notes.includes("QR Code")) return "MANUAL"
  return "FACIAL_RECOGNITION"
}

function mapAccessMethod(accessMethod: string): string {
  const methodMap: { [key: string]: string } = {
    'FACIAL_RECOGNITION': 'Reconhecimento Facial',
    'ACCESS_CARD': 'Cartão',
    'ACCESS_CODE': 'Código de Acesso',
    'MANUAL': 'Manual',
    'EMERGENCY': 'Emergência'
  }
  return methodMap[accessMethod] || 'Reconhecimento Facial'
}

function extractUnitFromLocation(location: string | null): string | undefined {
  if (!location) return undefined
  
  // Tentar padrão "Apt XXX" ou "Apto XXX" (mais comum)
  let match = location.match(/Apt\.?\s+(\d+)/i)
  if (match) return match[1]
  
  // Tentar padrão "Unidade XXX"
  match = location.match(/Unidade\s+(\d+)/i)
  if (match) return match[1]
  
  // Tentar padrão de número após hífen (ex: "- 101")
  match = location.match(/[^\d](\d{3,4})(?:\s|$)/)
  if (match) return match[1]
  
  return undefined
}

function extractBuildingFromLocation(location: string | null): string | undefined {
  if (!location) return undefined
  
  // Tentar padrão "Prédio X" ou "Bloco X"
  const match = location.match(/(?:Prédio|Bloco)\s+([A-Z\d]+)/i)
  if (match) return match[1].toUpperCase()
  
  return undefined
}

function mapStatus(status: string): string {
  // Mapear status corretamente
  switch (status) {
    case "APPROVED": 
      return "APPROVED"
    case "REJECTED": 
    case "DENIED":
      return "DENIED"
    case "PENDING": 
      return "PENDING"
    default: 
      // Se não houver um status válido, retornar PENDING ao invés de DENIED
      return "PENDING"
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

