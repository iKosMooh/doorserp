import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// Pasta base para os modelos de reconhecimento facial
const FACE_API_LABELS_PATH = path.join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels')

/**
 * GET /api/face-recognition/sync
 * Sincroniza as pastas de reconhecimento facial com o banco de dados
 */
export async function GET() {
  try {
    // Verificar se a pasta base existe
    if (!fs.existsSync(FACE_API_LABELS_PATH)) {
      fs.mkdirSync(FACE_API_LABELS_PATH, { recursive: true })
    }

    // Listar todas as pastas existentes
    const existingFolders = fs.readdirSync(FACE_API_LABELS_PATH, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    // Buscar usuários com reconhecimento facial habilitado
    const usersWithFaceRecognition = await prisma.user.findMany({
      where: { 
        faceRecognitionEnabled: true,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        faceRecognitionFolder: true,
        faceModelsCount: true
      }
    })

    // Buscar visitantes ativos com reconhecimento facial
    const guestsWithFaceRecognition = await prisma.guest.findMany({
      where: { 
        faceRecognitionEnabled: true,
        isActive: true,
        validUntil: { gte: new Date() }
      },
      select: {
        id: true,
        name: true,
        faceRecognitionFolder: true,
        validUntil: true
      }
    })

    const syncResults = {
      usersProcessed: 0,
      guestsProcessed: 0,
      foldersCreated: 0,
      foldersRemoved: 0,
      errors: []
    }

    // Processar usuários
    for (const user of usersWithFaceRecognition) {
      try {
        let folderName = user.faceRecognitionFolder
        
        // Se não tem pasta definida, criar baseado no nome
        if (!folderName) {
          folderName = user.name
            .replace(/\s+/g, '_')
            .replace(/[áàâãä]/gi, 'a')
            .replace(/[éèêë]/gi, 'e')
            .replace(/[íìîï]/gi, 'i')
            .replace(/[óòôõö]/gi, 'o')
            .replace(/[úùûü]/gi, 'u')
            .replace(/[ç]/gi, 'c')
            .replace(/[^a-zA-Z0-9_]/g, '')
          
          // Atualizar no banco
          await prisma.user.update({
            where: { id: user.id },
            data: { faceRecognitionFolder: folderName }
          })
        }

        // Criar pasta se não existir
        const userFolderPath = path.join(FACE_API_LABELS_PATH, folderName)
        if (!fs.existsSync(userFolderPath)) {
          fs.mkdirSync(userFolderPath, { recursive: true })
          syncResults.foldersCreated++
          
          // Criar arquivo README.md com instruções
          const readmeContent = `# Pasta de Reconhecimento Facial - ${user.name}

Esta pasta contém os modelos de treinamento para reconhecimento facial do usuário **${user.name}**.

## Instruções:
1. Adicione fotos do rosto do usuário (formato: 1.jpg, 2.jpg, 3.jpg, etc.)
2. Use fotos com boa qualidade e diferentes ângulos
3. Mínimo de 3 fotos, recomendado 5-10 fotos
4. As fotos devem mostrar claramente o rosto da pessoa
5. Evite fotos com óculos escuros, chapéus ou máscaras

## Status Atual:
- Modelos treinados: ${user.faceModelsCount}
- Criado em: ${new Date().toLocaleDateString('pt-BR')}
- ID do usuário: ${user.id}
`
          fs.writeFileSync(path.join(userFolderPath, 'README.md'), readmeContent)
        }

        // Contar arquivos de imagem na pasta
        const imageFiles = fs.readdirSync(userFolderPath)
          .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
        
        // Atualizar contador de modelos se necessário
        if (imageFiles.length !== user.faceModelsCount) {
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              faceModelsCount: imageFiles.length,
              lastFaceTraining: imageFiles.length > 0 ? new Date() : null
            }
          })
        }

        syncResults.usersProcessed++
      } catch (error) {
        syncResults.errors.push(`Erro ao processar usuário ${user.name}: ${error}`)
      }
    }

    // Processar visitantes
    for (const guest of guestsWithFaceRecognition) {
      try {
        let folderName = guest.faceRecognitionFolder
        
        // Se não tem pasta definida, criar baseado no nome + timestamp
        if (!folderName) {
          folderName = `Visitor_${guest.name.replace(/\s+/g, '_')}_${Date.now()}`
          
          // Atualizar no banco
          await prisma.guest.update({
            where: { id: guest.id },
            data: { faceRecognitionFolder: folderName }
          })
        }

        // Criar pasta se não existir
        const guestFolderPath = path.join(FACE_API_LABELS_PATH, folderName)
        if (!fs.existsSync(guestFolderPath)) {
          fs.mkdirSync(guestFolderPath, { recursive: true })
          syncResults.foldersCreated++
          
          // Criar arquivo README.md com instruções para visitante
          const readmeContent = `# Pasta de Reconhecimento Facial - Visitante: ${guest.name}

Esta pasta contém os modelos de treinamento temporários para reconhecimento facial do visitante **${guest.name}**.

## Informações:
- **PASTA TEMPORÁRIA** - Será removida automaticamente após expiração
- Visitante válido até: ${guest.validUntil.toLocaleString('pt-BR')}
- ID do visitante: ${guest.id}
- Criado em: ${new Date().toLocaleDateString('pt-BR')}

## Instruções:
1. Esta pasta é para uso temporário apenas
2. Adicione 1-3 fotos do visitante para identificação
3. A pasta será automaticamente removida após a expiração do acesso
`
          fs.writeFileSync(path.join(guestFolderPath, 'README.md'), readmeContent)
        }

        syncResults.guestsProcessed++
      } catch (error) {
        syncResults.errors.push(`Erro ao processar visitante ${guest.name}: ${error}`)
      }
    }

    // Limpar pastas de visitantes expirados
    const expiredGuests = await prisma.guest.findMany({
      where: {
        faceRecognitionEnabled: true,
        faceRecognitionFolder: { not: null },
        OR: [
          { validUntil: { lt: new Date() } },
          { isActive: false }
        ]
      },
      select: {
        id: true,
        name: true,
        faceRecognitionFolder: true
      }
    })

    for (const expiredGuest of expiredGuests) {
      try {
        if (expiredGuest.faceRecognitionFolder) {
          const expiredFolderPath = path.join(FACE_API_LABELS_PATH, expiredGuest.faceRecognitionFolder)
          if (fs.existsSync(expiredFolderPath)) {
            fs.rmSync(expiredFolderPath, { recursive: true, force: true })
            syncResults.foldersRemoved++
          }
          
          // Limpar referência no banco
          await prisma.guest.update({
            where: { id: expiredGuest.id },
            data: { 
              faceRecognitionFolder: null,
              faceRecognitionEnabled: false
            }
          })
        }
      } catch (error) {
        syncResults.errors.push(`Erro ao remover pasta do visitante expirado ${expiredGuest.name}: ${error}`)
      }
    }

    // Verificar pastas órfãs (que existem no sistema de arquivos mas não no banco)
    const allDatabaseFolders = [
      ...usersWithFaceRecognition.map(u => u.faceRecognitionFolder),
      ...guestsWithFaceRecognition.map(g => g.faceRecognitionFolder)
    ].filter(Boolean)

    const orphanFolders = existingFolders.filter(folder => 
      !allDatabaseFolders.includes(folder) && 
      !folder.startsWith('Visitor_') // Manter pastas de visitantes por segurança
    )

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída com sucesso',
      results: syncResults,
      statistics: {
        totalUsers: usersWithFaceRecognition.length,
        totalGuests: guestsWithFaceRecognition.length,
        totalFolders: existingFolders.length,
        orphanFolders: orphanFolders.length
      },
      orphanFolders
    })

  } catch (error) {
    console.error('Erro na sincronização de reconhecimento facial:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

/**
 * POST /api/face-recognition/sync
 * Força criação de pasta para um usuário específico
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, isGuest = false } = await request.json()

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'ID do usuário é obrigatório'
      }, { status: 400 })
    }

    let user, folderName

    if (isGuest) {
      user = await prisma.guest.findUnique({
        where: { id: userId },
        select: { id: true, name: true, faceRecognitionFolder: true, isActive: true }
      })
    } else {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, faceRecognitionFolder: true, isActive: true }
      })
    }

    if (!user || !user.isActive) {
      return NextResponse.json({
        success: false,
        message: isGuest ? 'Visitante não encontrado ou inativo' : 'Usuário não encontrado ou inativo'
      }, { status: 404 })
    }

    // Gerar nome da pasta
    if (isGuest) {
      folderName = `Visitor_${user.name.replace(/\s+/g, '_')}_${Date.now()}`
    } else {
      folderName = user.name
        .replace(/\s+/g, '_')
        .replace(/[áàâãä]/gi, 'a')
        .replace(/[éèêë]/gi, 'e')
        .replace(/[íìîï]/gi, 'i')
        .replace(/[óòôõö]/gi, 'o')
        .replace(/[úùûü]/gi, 'u')
        .replace(/[ç]/gi, 'c')
        .replace(/[^a-zA-Z0-9_]/g, '')
    }

    // Criar pasta
    const folderPath = path.join(FACE_API_LABELS_PATH, folderName)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }

    // Atualizar no banco
    if (isGuest) {
      await prisma.guest.update({
        where: { id: userId },
        data: { 
          faceRecognitionFolder: folderName,
          faceRecognitionEnabled: true
        }
      })
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          faceRecognitionFolder: folderName,
          faceRecognitionEnabled: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Pasta de reconhecimento facial criada com sucesso',
      folderName,
      folderPath: `/assets/lib/face-api/labels/${folderName}`
    })

  } catch (error) {
    console.error('Erro ao criar pasta de reconhecimento facial:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
