import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

// Caminho do Arduino CLI (Windows)
const ARDUINO_CLI = process.platform === 'win32' 
  ? '"C:\\Program Files\\Arduino CLI\\arduino-cli.exe"'
  : 'arduino-cli'

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
  
  try {
    // Recebe o FormData com o arquivo ou código
    const formData = await request.formData()
    const file = formData.get('file') as File
    const deviceId = formData.get('deviceId') as string
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo ou código fornecido' },
        { status: 400 }
      )
    }
    
    // Lê o conteúdo do arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Cria diretório temporário se não existir
    const tempDir = path.join(process.cwd(), 'temp_arduino')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }
    
    // IMPORTANTE: Arduino CLI exige que o .ino esteja em pasta com MESMO NOME
    // Exemplo: sketch_abc/sketch_abc.ino
    const sketchName = `sketch_${Date.now()}`
    const sketchDir = path.join(tempDir, sketchName)
    
    // Cria pasta do sketch
    if (!existsSync(sketchDir)) {
      await mkdir(sketchDir, { recursive: true })
    }
    
    // Salva o arquivo com MESMO NOME da pasta
    tempFilePath = path.join(sketchDir, `${sketchName}.ino`)
    await writeFile(tempFilePath, buffer)
    
    console.log(`📝 Sketch salvo em: ${tempFilePath}`)
    console.log(`📦 Tamanho: ${buffer.length} bytes`)
    
    // Detecta automaticamente a porta COM do Arduino conectado
    console.log('🔍 Detectando Arduino conectado...')
    let arduinoPort: string | null = null
    
    try {
      const { stdout: boardList } = await execAsync(`${ARDUINO_CLI} board list`)
      console.log('📋 Placas detectadas:')
      console.log(boardList)
      
      // Procura por linha que contém "Arduino" e extrai a porta COM
      const lines = boardList.split('\n')
      for (const line of lines) {
        if (line.includes('Arduino') || line.includes('Serial Port')) {
          // Extrai porta COM (ex: COM3, COM4, etc)
          const match = line.match(/COM\d+/i)
          if (match) {
            arduinoPort = match[0].toUpperCase()
            console.log(`✅ Arduino detectado na porta: ${arduinoPort}`)
            break
          }
        }
      }
      
      if (!arduinoPort) {
        // Fallback: pega primeira porta COM disponível
        for (const line of lines) {
          const match = line.match(/COM\d+/i)
          if (match) {
            arduinoPort = match[0].toUpperCase()
            console.log(`⚠️ Usando primeira porta disponível: ${arduinoPort}`)
            break
          }
        }
      }
    } catch (detectError) {
      console.error('❌ Erro ao detectar porta:', detectError)
    }
    
    if (!arduinoPort) {
      // Remove arquivos temporários
      if (tempFilePath && existsSync(tempFilePath)) {
        await unlink(tempFilePath)
      }
      if (existsSync(sketchDir)) {
        await execAsync(`rmdir /s /q "${sketchDir}"`)
      }
      
      return NextResponse.json(
        { error: 'Nenhum Arduino detectado! Conecte o Arduino na porta USB e tente novamente.' },
        { status: 400 }
      )
    }
    
    console.log(`🔧 Compilando código para dispositivo: ${deviceId}`)
    console.log(`📡 Porta detectada: ${arduinoPort}`)
    
    // Compila o código (compila a PASTA do sketch)
    // A biblioteca Servo já vem incluída no core arduino:avr, não precisa instalar separadamente
    console.log('⚙️ Compilando código com Arduino CLI...')
    const compileCommand = `${ARDUINO_CLI} compile --fqbn arduino:avr:uno "${sketchDir}" --verbose`
    const { stdout: compileOutput, stderr: compileError } = await execAsync(compileCommand, { timeout: 60000 })
    
    // Verifica se há erros REAIS (ignora avisos de memória e informações de uso)
    const hasRealError = compileError && 
      !compileError.includes('Sketch uses') && 
      !compileError.includes('Used library') && 
      !compileError.includes('Low memory available') &&
      !compileError.includes('Global variables use') &&
      compileError.includes('error')
    
    if (hasRealError) {
      console.error('❌ Erro na compilação:', compileError)
      
      // Remove arquivos temporários
      if (tempFilePath && existsSync(tempFilePath)) {
        await unlink(tempFilePath)
      }
      if (existsSync(sketchDir)) {
        await execAsync(`rmdir /s /q "${sketchDir}"`)
      }
      
      return NextResponse.json(
        { 
          error: 'Erro de compilação',
          details: compileError
        },
        { status: 400 }
      )
    }
    
    console.log('✅ Compilação bem-sucedida!')
    
    // Mostra informações de uso de memória (se houver)
    if (compileError) {
      if (compileError.includes('Sketch uses') || compileError.includes('Low memory available')) {
        console.log('📊 Informações de memória:')
        console.log(compileError)
      }
    }
    
    if (compileOutput) {
      console.log('📋 Output da compilação:')
      console.log(compileOutput)
    }
    
    // Faz upload para o Arduino (upload da PASTA do sketch)
    console.log(`📤 Enviando código para Arduino na porta ${arduinoPort}...`)
    const uploadCommand = `${ARDUINO_CLI} upload -p ${arduinoPort} --fqbn arduino:avr:uno "${sketchDir}"`
    const { stdout: uploadOutput, stderr: uploadError } = await execAsync(uploadCommand, { timeout: 30000 })
    
    if (uploadError && !uploadError.includes('New upload port') && !uploadError.includes('avrdude done') && !uploadError.includes('Thank you')) {
      console.error('❌ Erro no upload:', uploadError)
      
      // Remove arquivos temporários
      if (tempFilePath && existsSync(tempFilePath)) {
        await unlink(tempFilePath)
      }
      if (existsSync(sketchDir)) {
        await execAsync(`rmdir /s /q "${sketchDir}"`)
      }
      
      return NextResponse.json(
        { 
          error: 'Erro no upload',
          details: uploadError
        },
        { status: 400 }
      )
    }
    
    console.log('✅ Upload concluído! Arduino reiniciando...')
    if (uploadOutput) console.log(uploadOutput)
    
    // Remove arquivos temporários (pasta inteira)
    if (existsSync(sketchDir)) {
      await execAsync(`rmdir /s /q "${sketchDir}"`)
      console.log('🗑️ Sketch temporário removido')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Código compilado e enviado com sucesso! Arduino reiniciando...',
      deviceId,
      port: arduinoPort,
      compileInfo: compileError || 'Compilado com sucesso',
      uploadInfo: uploadError || 'Upload concluído'
    })
    
  } catch (error) {
    console.error('❌ Erro ao processar upload:', error)
    
    // Remove arquivos temporários em caso de erro
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        await unlink(tempFilePath)
        
        // Remove pasta do sketch também
        const sketchDir = path.dirname(tempFilePath)
        if (existsSync(sketchDir) && sketchDir.includes('temp_arduino')) {
          await execAsync(`rmdir /s /q "${sketchDir}"`)
        }
      } catch (unlinkError) {
        console.error('Erro ao remover arquivos temporários:', unlinkError)
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { 
        error: 'Erro ao compilar/enviar código',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
