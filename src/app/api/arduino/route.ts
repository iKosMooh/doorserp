import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

// Tipos para as bibliotecas do SerialPort
interface SerialPortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  vendorId?: string
  productId?: string
}

interface SerialPortInstance {
  write: (data: string, callback?: (error?: Error | null) => void) => boolean
  close: (callback?: (error?: Error | null) => void) => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  open: (callback?: (error?: Error | null) => void) => void
  pipe: (destination: unknown) => unknown
  isOpen: boolean
}

interface SerialPortConstructor {
  new (options: { path: string; baudRate: number; autoOpen?: boolean }): SerialPortInstance
  list: () => Promise<SerialPortInfo[]>
}

interface ReadlineParserConstructor {
  new (options: { delimiter: string }): unknown
}

interface ParserInstance {
  on: (event: string, callback: (data: string) => void) => void
}

// Variáveis globais tipadas
let SerialPort: SerialPortConstructor | null = null
let ReadlineParser: ReadlineParserConstructor | null = null

// Tenta importar as bibliotecas de porta serial
try {
  const serialportModule = eval('require("serialport")')
  const readlineModule = eval('require("@serialport/parser-readline")')
  SerialPort = serialportModule.SerialPort
  ReadlineParser = readlineModule.ReadlineParser
} catch {
  console.warn('⚠️ Bibliotecas de porta serial não encontradas. Usando modo simulação.')
}

// Estado global da conexão
let arduinoPort: SerialPortInstance | null = null
let isConnected = false
let currentPort = 'COM4'
let lastError = ''

// Estados dos LEDs (backup para quando não há comunicação real)
let ledStates = {
  led1: false, // Pino 13
  led2: false, // Pino 12
  led3: false, // Pino 11
  led4: false  // Pino 10
}

// Lista portas seriais disponíveis
async function listarPortas() {
  if (!SerialPort) {
    return [
      { path: 'COM3', manufacturer: 'Simulado' },
      { path: 'COM4', manufacturer: 'Simulado' },
      { path: 'COM5', manufacturer: 'Simulado' }
    ]
  }

  try {
    const ports = await SerialPort.list()
    console.log('📋 Portas disponíveis:')
    ports.forEach((port: SerialPortInfo) => {
      console.log(`- ${port.path} (${port.manufacturer || 'Desconhecido'})`)
    })
    return ports
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro ao listar portas:', errorMessage)
    return []
  }
}

// Conecta ao Arduino
async function conectarArduino(portaPath: string): Promise<boolean> {
  if (!SerialPort) {
    console.log('⚠️ Modo simulação - SerialPort não disponível')
    isConnected = true
    currentPort = portaPath
    return true
  }

  try {
    // Se já estiver conectado, desconecta primeiro
    if (arduinoPort && arduinoPort.isOpen) {
      await new Promise<void>((resolve) => {
        arduinoPort!.close(() => {
          resolve()
        })
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`🔌 Tentando conectar ao Arduino na porta ${portaPath}`)

    // Cria nova conexão
    arduinoPort = new SerialPort({
      path: portaPath,
      baudRate: 9600,
      autoOpen: false
    })

    // Parser para ler linha por linha
    let parser: ParserInstance | null = null
    if (ReadlineParser) {
      parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' })) as ParserInstance
    }

    // Eventos da porta serial
    arduinoPort.on('open', () => {
      console.log(`✅ Conectado ao Arduino na porta ${portaPath}`)
      isConnected = true
      currentPort = portaPath
      lastError = ''
    })

    arduinoPort.on('error', (...args: unknown[]) => {
      const err = args[0] as Error
      console.error('❌ Erro na porta serial:', err.message)
      isConnected = false
      lastError = err.message
    })

    arduinoPort.on('close', () => {
      console.log('🔌 Conexão com Arduino fechada')
      isConnected = false
    })

    // Recebe dados do Arduino
    if (parser) {
      parser.on('data', (data: string) => {
        console.log('📥 Arduino:', data.trim())
        
        // Tenta fazer parse se for JSON para atualizar estados
        try {
          const jsonData = JSON.parse(data)
          if (jsonData.status) {
            ledStates = {
              led1: jsonData.status.pino13,
              led2: jsonData.status.pino12,
              led3: jsonData.status.pino11,
              led4: jsonData.status.pino10
            }
          }
        } catch {
          // Não é JSON, apenas texto
        }
      })
    }

    // Abre a conexão
    return new Promise<boolean>((resolve) => {
      arduinoPort!.open((err?: Error | null) => {
        if (err) {
          console.error('❌ Erro ao abrir porta:', err.message)
          isConnected = false
          lastError = err.message
          resolve(false)
        } else {
          console.log('✅ Porta aberta com sucesso')
          // Aguarda estabilizar e solicita status
          setTimeout(async () => {
            await enviarComandoSerial('STATUS')
            resolve(true)
          }, 2000)
        }
      })
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro ao conectar:', errorMessage)
    isConnected = false
    lastError = errorMessage
    return false
  }
}

// Envia comando via porta serial
async function enviarComandoSerial(comando: string): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isConnected || !arduinoPort) {
    return { success: false, error: 'Arduino não conectado' }
  }

  return new Promise((resolve) => {
    console.log(`📤 Enviando comando: ${comando}`)
    
    const success = arduinoPort!.write(`${comando}\n`, (err?: Error | null) => {
      if (err) {
        console.error('❌ Erro ao enviar comando:', err.message)
        resolve({ success: false, error: err.message })
      } else {
        resolve({ success: true, message: `Comando ${comando} enviado` })
      }
    })
    
    if (!success) {
      resolve({ success: false, error: 'Falha ao escrever na porta serial' })
    }
  })
}

// Simula comando quando SerialPort não está disponível
async function simularComando(comando: string): Promise<{ success: boolean; message?: string; error?: string }> {
  console.log(`🎭 Simulando comando: ${comando}`)
  
  // Simula mudança de estado dos LEDs
  if (comando.startsWith('L')) {
    const match = comando.match(/L(\d+)_(ON|OFF)/i)
    if (match) {
      const ledNum = parseInt(match[1])
      const estado = match[2].toUpperCase() === 'ON'
      
      if (ledNum >= 1 && ledNum <= 4) {
        const ledKey = `led${ledNum}` as keyof typeof ledStates
        ledStates[ledKey] = estado
        
        return { 
          success: true, 
          message: `LED ${ledNum} ${estado ? 'ligado' : 'desligado'} (simulação)` 
        }
      }
    }
  }
  
  return { success: true, message: `Comando ${comando} simulado` }
}

// Desconecta do Arduino
async function desconectarArduino(): Promise<boolean> {
  try {
    if (arduinoPort && arduinoPort.isOpen) {
      await new Promise<void>((resolve) => {
        arduinoPort!.close(() => {
          resolve()
        })
      })
    }
    isConnected = false
    console.log('🔌 Desconectado do Arduino')
    return true
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro ao desconectar:', errorMessage)
    return false
  }
}

// API GET - Status, listagem de portas e configurações
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const condominiumId = searchParams.get('condominiumId')

    // Lista portas disponíveis
    if (action === 'ports') {
      const ports = await listarPortas()
      return NextResponse.json({ ports })
    }

    // Lista configurações Arduino do condomínio
    if (condominiumId) {
      const arduinoConfigs = await prisma.arduinoConfiguration.findMany({
        where: {
          condominiumId: condominiumId,
          isActive: true
        },
        orderBy: {
          deviceName: 'asc'
        }
      })

      return NextResponse.json({
        success: true,
        configs: arduinoConfigs,
        count: arduinoConfigs.length
      })
    }

    // Retorna status atual
    return NextResponse.json({
      connected: isConnected,
      port: currentPort,
      ledStates: ledStates,
      hasSerialPort: !!SerialPort,
      error: lastError || undefined,
      message: isConnected 
        ? `Arduino conectado na porta ${currentPort}` 
        : 'Arduino desconectado'
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro no GET:', errorMessage)
    return NextResponse.json(
      { 
        connected: false, 
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}

// API POST - Comandos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, command, port } = body

    // Conectar
    if (action === 'connect' && port) {
      const sucesso = await conectarArduino(port)
      
      return NextResponse.json({
        success: sucesso,
        connected: isConnected,
        port: currentPort,
        message: sucesso 
          ? `${SerialPort ? 'Conectado' : 'Simulação conectada'} à porta ${port}` 
          : `Erro ao conectar: ${lastError}`,
        error: sucesso ? undefined : lastError
      })
    }

    // Desconectar
    if (action === 'disconnect') {
      const sucesso = await desconectarArduino()
      
      return NextResponse.json({
        success: sucesso,
        connected: false,
        message: 'Desconectado com sucesso'
      })
    }

    // Enviar comando
    if (action === 'command' && command) {
      // Verifica se está conectado
      if (!isConnected) {
        return NextResponse.json(
          { success: false, error: 'Arduino não conectado. Conecte primeiro.' },
          { status: 400 }
        )
      }

      // Envia comando
      const resultado = SerialPort && isConnected 
        ? await enviarComandoSerial(command)
        : await simularComando(command)
      
      if (resultado.success) {
        return NextResponse.json({
          success: true,
          command: command,
          message: resultado.message,
          ledStates: ledStates,
          mode: SerialPort && isConnected ? 'real' : 'simulation'
        })
      } else {
        return NextResponse.json(
          { success: false, error: resultado.error },
          { status: 400 }
        )
      }
    }

    // Ação não reconhecida
    return NextResponse.json(
      { success: false, error: 'Ação não reconhecida' },
      { status: 400 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro no POST:', errorMessage)
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}
