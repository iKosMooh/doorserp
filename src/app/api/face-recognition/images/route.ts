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

    // Caminho para a pasta de labels do face-api
    const labelsPath = join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels', folder)
    
    console.log('Checking folder:', labelsPath)

    // Verificar se a pasta existe
    if (!existsSync(labelsPath)) {
      console.log('Folder does not exist:', labelsPath)
      return NextResponse.json({
        success: true,
        images: [],
        message: 'Pasta não encontrada'
      })
    }

    try {
      // Listar arquivos na pasta
      const files = await readdir(labelsPath)
      console.log('Files found:', files)
      
      // Filtrar apenas imagens
      const imageFiles = files.filter(file => {
        const ext = file.toLowerCase()
        return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp')
      })

      // Criar URLs para as imagens
      const images = imageFiles.map(file => ({
        name: file,
        url: `/assets/lib/face-api/labels/${folder}/${file}`
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
