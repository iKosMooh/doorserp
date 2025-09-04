import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

// Função utilitária para excluir pastas de reconhecimento facial
function deleteFaceRecognitionFolder(folderName: string) {
  try {
    const labelsPath = path.join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels', folderName)
    if (fs.existsSync(labelsPath)) {
      fs.rmSync(labelsPath, { recursive: true, force: true })
      console.log(`Pasta de reconhecimento facial excluída: ${folderName}`)
    }
  } catch (error) {
    console.error(`Erro ao excluir pasta de reconhecimento facial ${folderName}:`, error)
  }
}

// GET /api/residents/[id] - Buscar morador por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const resident = await prisma.resident.findUnique({
      where: { id },
      include: {
        user: true,
        unit: true,
        condominium: true
      }
    })

    if (!resident) {
      return NextResponse.json(
        { error: 'Morador não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: resident
    })
  } catch (error) {
    console.error('Erro ao buscar morador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/residents/[id] - Atualizar morador
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()

    // Verificar se o morador existe
    const existingResident = await prisma.resident.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingResident) {
      return NextResponse.json(
        { error: 'Morador não encontrado' },
        { status: 404 }
      )
    }

    // Extrair dados do formData
    const userData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || null,
      document: formData.get('document') as string || null,
      documentType: formData.get('documentType') as 'CPF' | 'RG' | 'CNH' | 'PASSPORT' || 'CPF',
      birthDate: formData.get('birthDate') ? new Date(formData.get('birthDate') as string) : null,
      faceRecognitionEnabled: formData.get('faceRecognitionEnabled') === 'true'
    }

    const residentData = {
      unitId: formData.get('unitId') as string,
      relationshipType: formData.get('relationshipType') as 'OWNER' | 'TENANT' | 'FAMILY_MEMBER' | 'AUTHORIZED',
      emergencyContact: formData.get('emergencyContact') as string || null,
      vehiclePlates: JSON.parse(formData.get('vehiclePlates') as string || '[]'),
      isActive: formData.get('isActive') === 'true'
    }

    // Validar dados obrigatórios
    if (!userData.name || !userData.email || !residentData.unitId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, email, unitId' },
        { status: 400 }
      )
    }

    // Verificar se email já existe em outro usuário
    if (userData.email !== existingResident.user.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: userData.email,
          id: { not: existingResident.userId }
        }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email já está em uso por outro usuário' },
          { status: 409 }
        )
      }
    }

    // Verificar se a unidade existe
    const unit = await prisma.unit.findUnique({
      where: { id: residentData.unitId }
    })

    if (!unit) {
      return NextResponse.json(
        { error: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Processar imagens de reconhecimento facial
    let faceRecognitionFolder = existingResident.user.faceRecognitionFolder
    let faceModelsCount = existingResident.user.faceModelsCount

    if (userData.faceRecognitionEnabled) {
      const faceImages: File[] = []
      
      // Extrair imagens do formData
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('faceImage_') && value instanceof File) {
          faceImages.push(value)
        }
      }

      if (faceImages.length > 0) {
        // Criar pasta se não existir
        if (!faceRecognitionFolder) {
          faceRecognitionFolder = `${userData.name.replace(/\s+/g, '_')}_${Date.now()}`
        }

        const labelsPath = path.join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels', faceRecognitionFolder)
        
        if (!fs.existsSync(labelsPath)) {
          fs.mkdirSync(labelsPath, { recursive: true })
        }

        // Salvar novas imagens (adicionar às existentes)
        for (let i = 0; i < faceImages.length; i++) {
          const file = faceImages[i]
          const buffer = Buffer.from(await file.arrayBuffer())
          const fileName = `${faceModelsCount + i + 1}.jpg`
          const filePath = path.join(labelsPath, fileName)
          fs.writeFileSync(filePath, buffer)
        }

        faceModelsCount += faceImages.length
      }
    } else {
      // Se reconhecimento facial foi desabilitado, excluir pasta
      if (faceRecognitionFolder) {
        deleteFaceRecognitionFolder(faceRecognitionFolder)
        faceRecognitionFolder = null
        faceModelsCount = 0
      }
    }

    // Atualizar dados em transação
    const updatedResident = await prisma.$transaction(async (tx) => {
      // Atualizar usuário
      await tx.user.update({
        where: { id: existingResident.userId },
        data: {
          ...userData,
          faceRecognitionFolder,
          faceModelsCount,
          lastFaceTraining: faceModelsCount > 0 ? new Date() : null
        }
      })

      // Atualizar morador
      return await tx.resident.update({
        where: { id },
        data: residentData,
        include: {
          user: true,
          unit: true,
          condominium: true
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Morador atualizado com sucesso',
      data: updatedResident
    })
  } catch (error) {
    console.error('Erro ao atualizar morador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/residents/[id] - Excluir morador
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se o morador existe
    const existingResident = await prisma.resident.findUnique({
      where: { id },
      include: {
        user: true,
        guests: true,
        financialEntries: true
      }
    })

    if (!existingResident) {
      return NextResponse.json(
        { error: 'Morador não encontrado' },
        { status: 404 }
      )
    }

    // Excluir em transação
    await prisma.$transaction(async (tx) => {
      console.log(`Iniciando exclusão do morador: ${existingResident.user.name}`)

      // 1. Excluir hóspedes relacionados
      const deletedGuests = await tx.guest.deleteMany({
        where: { invitedByResidentId: id }
      })
      console.log(`${deletedGuests.count} hóspedes excluídos`)

      // 2. Excluir entradas financeiras
      const deletedFinancialEntries = await tx.financialEntry.deleteMany({
        where: { residentId: id }
      })
      console.log(`${deletedFinancialEntries.count} entradas financeiras excluídas`)

      // 3. Excluir logs de acesso relacionados ao usuário
      const deletedAccessLogs = await tx.accessLog.deleteMany({
        where: { userId: existingResident.userId }
      })
      console.log(`${deletedAccessLogs.count} logs de acesso excluídos`)

      // 4. Excluir morador
      await tx.resident.delete({
        where: { id }
      })
      console.log('Morador excluído')

      // 5. Verificar se o usuário tem outros relacionamentos
      const userHasOtherRelationships = await tx.resident.findFirst({
        where: { userId: existingResident.userId }
      }) || await tx.employee.findFirst({
        where: { userId: existingResident.userId }
      })

      // 6. Se não tem outros relacionamentos, excluir usuário
      if (!userHasOtherRelationships) {
        await tx.user.delete({
          where: { id: existingResident.userId }
        })
        console.log('Usuário excluído')
      }
    })

    // 7. Excluir pasta de reconhecimento facial (após a transação)
    if (existingResident.user.faceRecognitionFolder) {
      deleteFaceRecognitionFolder(existingResident.user.faceRecognitionFolder)
    }

    return NextResponse.json({
      success: true,
      message: `Morador "${existingResident.user.name}" excluído com sucesso`
    })
  } catch (error) {
    console.error('Erro ao excluir morador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
