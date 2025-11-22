import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readdir } from 'fs/promises'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder')

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Nome da pasta é obrigatório' },
        { status: 400 }
      )
    }

    // Determine the base path based on folder prefix
    let basePath: string
    let urlPrefix: string
    
    if (folder.startsWith('guest_')) {
      // Guest photos are stored in face-data
      basePath = join(process.cwd(), 'public', 'face-data', folder)
      urlPrefix = `/face-data/${folder}`
    } else {
      // Resident photos are stored in face-api labels
      basePath = join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels', folder)
      urlPrefix = `/assets/lib/face-api/labels/${folder}`
    }
    
    console.log('Checking folder:', basePath)

    // Verificar se a pasta existe
    if (!existsSync(basePath)) {
      console.log('Folder does not exist:', basePath)
      return NextResponse.json({
        success: true,
        images: [],
        message: 'Pasta não encontrada'
      })
    }

    try {
      // Listar arquivos na pasta
      const files = await readdir(basePath)
      console.log('Files found:', files)
      
      // Filtrar apenas imagens
      const imageFiles = files.filter(file => {
        const ext = file.toLowerCase()
        return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp')
      })

      // Criar URLs para as imagens
      const images = imageFiles.map(file => ({
        name: file,
        url: `${urlPrefix}/${file}`
      }))

      console.log('Image URLs:', images)

      return NextResponse.json({
        success: true,
        images,
        count: images.length
      })

    } catch (readError) {
      console.error('Error reading directory:', readError)
      return NextResponse.json({
        success: true,
        images: [],
        message: 'Erro ao ler pasta'
      })
    }

  } catch (error) {
    console.error('Erro ao buscar imagens:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}