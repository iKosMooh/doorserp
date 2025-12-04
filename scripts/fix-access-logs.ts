/**
 * Script para corrigir logs de acesso que não têm userId ou guestId vinculados
 * Extrai o nome da pessoa do campo 'notes' e vincula ao registro correto
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function extractPersonNameFromNotes(notes: string): string | null {
  if (!notes) return null
  
  // Padrões de reconhecimento facial: "Reconhecimento facial: Nome da Pessoa (99.5% confiança)"
  const facialMatch = notes.match(/Reconhecimento facial:\s*([^(]+)/)
  if (facialMatch) {
    return facialMatch[1].trim()
  }
  
  // Padrões de QR Code: "Acesso por código QR: Nome da Pessoa"
  const qrMatch = notes.match(/Acesso por código QR:\s*(.+)/)
  if (qrMatch) {
    return qrMatch[1].trim()
  }
  
  // Padrão genérico: "Nome da Pessoa (Unidade 101)"
  const genericMatch = notes.match(/^([^(]+)\s*\(/)
  if (genericMatch) {
    return genericMatch[1].trim()
  }
  
  return null
}

async function fixAccessLogs() {
  console.log('🔍 Buscando logs de acesso sem userId ou guestId...')
  
  // Buscar todos os logs sem vínculos
  const logsWithoutLinks = await prisma.accessLog.findMany({
    where: {
      AND: [
        { userId: null },
        { guestId: null }
      ]
    },
    orderBy: {
      timestamp: 'desc'
    }
  })
  
  console.log(`📊 Encontrados ${logsWithoutLinks.length} logs sem vínculos`)
  
  if (logsWithoutLinks.length === 0) {
    console.log('✅ Todos os logs já estão corretamente vinculados!')
    return
  }
  
  let fixed = 0
  let notFound = 0
  
  for (const log of logsWithoutLinks) {
    const personName = extractPersonNameFromNotes(log.notes || '')
    
    if (!personName) {
      console.log(`⚠️  Log ${log.id}: Não foi possível extrair nome das notas`)
      notFound++
      continue
    }
    
    console.log(`\n🔎 Procurando: "${personName}"`)
    
    // Tentar encontrar convidado primeiro (mais comum em logs sem vínculos)
    const guest = await prisma.guest.findFirst({
      where: {
        name: personName,
        condominiumId: log.condominiumId
      }
    })
    
    if (guest) {
      await prisma.accessLog.update({
        where: { id: log.id },
        data: { 
          guestId: guest.id,
          accessType: 'GUEST'
        }
      })
      console.log(`✅ Log ${log.id} vinculado ao convidado: ${guest.name}`)
      fixed++
      continue
    }
    
    // Se não encontrou convidado, tentar morador
    const resident = await prisma.resident.findFirst({
      where: {
        condominiumId: log.condominiumId,
        user: {
          name: personName
        }
      },
      include: {
        user: true
      }
    })
    
    if (resident) {
      await prisma.accessLog.update({
        where: { id: log.id },
        data: { 
          userId: resident.userId,
          accessType: 'RESIDENT'
        }
      })
      console.log(`✅ Log ${log.id} vinculado ao morador: ${resident.user.name}`)
      fixed++
      continue
    }
    
    // Por último, tentar funcionário
    const employee = await prisma.employee.findFirst({
      where: {
        condominiumId: log.condominiumId,
        user: {
          name: personName
        }
      },
      include: {
        user: true
      }
    })
    
    if (employee) {
      await prisma.accessLog.update({
        where: { id: log.id },
        data: { 
          userId: employee.userId,
          accessType: 'EMPLOYEE'
        }
      })
      console.log(`✅ Log ${log.id} vinculado ao funcionário: ${employee.user.name}`)
      fixed++
      continue
    }
    
    console.log(`❌ Log ${log.id}: Pessoa "${personName}" não encontrada no banco de dados`)
    notFound++
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`📈 Relatório Final:`)
  console.log(`   ✅ Logs corrigidos: ${fixed}`)
  console.log(`   ❌ Logs não corrigidos: ${notFound}`)
  console.log(`   📊 Total processado: ${logsWithoutLinks.length}`)
  console.log('='.repeat(60))
}

fixAccessLogs()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
