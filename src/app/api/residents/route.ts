import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const condominiumId = searchParams.get('condominiumId')

    if (!condominiumId) {
      return NextResponse.json({
        success: false,
        error: 'ID do condomínio é obrigatório'
      }, { status: 400 })
    }

    const residents = await prisma.resident.findMany({
      where: {
        unit: {
          condominiumId: condominiumId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            document: true,
            documentType: true,
            birthDate: true,
            faceRecognitionEnabled: true,
            faceRecognitionFolder: true
          }
        },
        unit: {
          select: {
            id: true,
            block: true,
            number: true
          }
        }
      },
      orderBy: [
        { unit: { block: 'asc' } },
        { unit: { number: 'asc' } },
        { user: { name: 'asc' } }
      ]
    })

    return NextResponse.json({
      success: true,
      data: residents
    })

  } catch (error) {
    console.error('Erro ao buscar moradores:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extrair dados do formulário
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const document = formData.get('document') as string
    const unitId = formData.get('unitId') as string
    const relationshipType = formData.get('relationshipType') as string
    const emergencyContact = formData.get('emergencyContact') as string
    const vehiclePlatesString = formData.get('vehiclePlates') as string
    const condominiumId = formData.get('condominiumId') as string

    // Validação básica
    if (!name || !email || !unitId || !relationshipType || !condominiumId) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: nome, email, unidade, tipo de relacionamento e condomínio'
      }, { status: 400 })
    }

    // Verificar se a unidade pertence ao condomínio correto
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        condominiumId: condominiumId
      }
    })

    if (!unit) {
      return NextResponse.json({
        success: false,
        error: 'Unidade não encontrada neste condomínio'
      }, { status: 400 })
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Email já cadastrado no sistema'
      }, { status: 400 })
    }

    // Processar placas de veículos
    const vehiclePlates = vehiclePlatesString 
      ? vehiclePlatesString.split(',').map(plate => plate.trim()).filter(plate => plate.length > 0)
      : []

    // Extrair imagens do formulário
    const images: File[] = []
    let imageIndex = 0
    
    // Tentar buscar com o novo padrão de nomes
    while (true) {
      const image = formData.get(`faceImage_${imageIndex}`) as File | null
      if (!image) break
      images.push(image)
      imageIndex++
    }

    // Se não encontrou com o novo padrão, tentar com o padrão antigo para compatibilidade
    if (images.length === 0) {
      imageIndex = 0
      while (true) {
        const image = formData.get(`image_${imageIndex}`) as File | null
        if (!image) break
        images.push(image)
        imageIndex++
      }
    }

    console.log(`Recebidas ${images.length} imagens para processamento`)

    // Criar diretório para as imagens de reconhecimento facial se necessário
    let faceRecognitionEnabled = false
    let faceRecognitionFolder = null
    
    if (images.length > 0) {
      try {
        const faceApiPath = path.join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels')
        const residentFolderName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
        const residentImagePath = path.join(faceApiPath, residentFolderName)

        // Criar diretório
        await fs.mkdir(residentImagePath, { recursive: true })

        // Salvar cada imagem
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          const buffer = Buffer.from(await image.arrayBuffer())
          const fileName = `${i + 1}.jpg`
          const filePath = path.join(residentImagePath, fileName)
          
          await fs.writeFile(filePath, buffer)
          console.log(`Imagem salva: ${filePath}`)
        }

        faceRecognitionEnabled = true
        faceRecognitionFolder = residentFolderName // Salvar o nome da pasta
        console.log(`${images.length} imagens salvas em: ${residentImagePath}`)
        
      } catch (imageError) {
        console.error('Erro ao salvar imagens:', imageError)
        // Não falhar a criação do morador por erro nas imagens
        // mas registrar o erro
      }
    }

    // Criar usuário e morador em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          document: document || null,
          faceRecognitionEnabled,
          faceRecognitionFolder: faceRecognitionFolder,
          faceModelsCount: images.length
        }
      })

      // Validar tipo de relacionamento
      const validRelationshipTypes = ['OWNER', 'TENANT', 'FAMILY_MEMBER', 'AUTHORIZED'] as const
      if (!validRelationshipTypes.includes(relationshipType as typeof validRelationshipTypes[number])) {
        throw new Error('Tipo de relacionamento inválido')
      }

      // Criar morador
      const resident = await tx.resident.create({
        data: {
          userId: user.id,
          unitId,
          condominiumId,
          relationshipType: relationshipType as 'OWNER' | 'TENANT' | 'FAMILY_MEMBER' | 'AUTHORIZED',
          emergencyContact: emergencyContact || null,
          vehiclePlates: vehiclePlates.length > 0 ? vehiclePlates : undefined,
          isActive: true,
          moveInDate: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              document: true,
              faceRecognitionEnabled: true
            }
          },
          unit: {
            select: {
              id: true,
              block: true,
              number: true
            }
          }
        }
      })

      return resident
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Morador cadastrado com sucesso${faceRecognitionEnabled ? ' com reconhecimento facial habilitado' : ''}`
    })

  } catch (error) {
    console.error('Erro ao criar morador:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
