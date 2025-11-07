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

// Buffer para mensagens do Serial Monitor (últimas 100 mensagens)
const serialBuffer: string[] = []
const MAX_SERIAL_BUFFER = 100

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

// Detecta automaticamente porta COM do Arduino
async function detectarPortaArduino(): Promise<string | null> {
  console.log('🔍 Detectando porta do Arduino automaticamente...')
  
  if (!SerialPort) {
    console.log('⚠️ SerialPort não disponível, retornando COM4 como padrão')
    return 'COM4'
  }

  try {
    const ports = await SerialPort.list()
    console.log('📋 Portas disponíveis para detecção:', ports.map(p => p.path))

    // Prioridades de busca para Arduino
    const portasPrioridade = [
      'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'COM10'
    ]

    // Primeiro, buscar por portas que podem ser Arduino (USB, CH340, etc.)
    const portasArduino = ports.filter(port => {
      const manufacturer = (port.manufacturer || '').toLowerCase()
      const isArduino = manufacturer.includes('arduino') || 
                       manufacturer.includes('ch340') || 
                       manufacturer.includes('cp210') ||
                       manufacturer.includes('ftdi') ||
                       manufacturer.includes('usb')
      
      if (isArduino) {
        console.log(`🎯 Porta Arduino potencial encontrada: ${port.path} (${port.manufacturer})`)
      }
      
      return isArduino
    })

    // Se encontrou portas Arduino específicas, testar elas primeiro
    if (portasArduino.length > 0) {
      for (const port of portasArduino) {
        console.log(`🔌 Testando porta Arduino identificada: ${port.path}`)
        const sucesso = await testarConexaoPorta(port.path)
        if (sucesso) {
          console.log(`✅ Arduino encontrado na porta: ${port.path}`)
          return port.path
        }
      }
    }

    // Se não encontrou Arduino específico, testar portas por prioridade
    for (const porta of portasPrioridade) {
      const portaExiste = ports.some(p => p.path === porta)
      if (portaExiste) {
        console.log(`🔌 Testando porta por prioridade: ${porta}`)
        
        // Primeiro verifica se está disponível
        const status = await verificarPortaDisponivel(porta)
        if (!status.available) {
          console.log(`🚫 Porta ${porta} não disponível: ${status.error}`)
          continue
        }
        
        const sucesso = await testarConexaoPorta(porta)
        if (sucesso) {
          console.log(`✅ Arduino encontrado na porta: ${porta}`)
          return porta
        }
      }
    }

    console.log('❌ Nenhuma porta Arduino encontrada automaticamente')
    return null
  } catch (error) {
    console.error('❌ Erro na detecção automática:', error)
    return null
  }
}

// Verifica se uma porta está disponível (não em uso)
async function verificarPortaDisponivel(portaPath: string): Promise<{ available: boolean; error?: string }> {
  if (!SerialPort) return { available: true }

  return new Promise((resolve) => {
    let testPort: SerialPortInstance | null = null
    let timeout: NodeJS.Timeout | null = null

    try {
      testPort = new SerialPort({
        path: portaPath,
        baudRate: 9600,
        autoOpen: false
      })

      // Timeout rápido de 1 segundo para verificação
      timeout = setTimeout(() => {
        if (testPort && testPort.isOpen) {
          testPort.close(() => {})
        }
        resolve({ available: false, error: 'Timeout na verificação' })
      }, 1000)

      testPort.on('open', () => {
        if (timeout) clearTimeout(timeout)
        testPort!.close(() => {
          resolve({ available: true })
        })
      })

      testPort.on('error', (...args: unknown[]) => {
        const err = args[0] as Error
        if (timeout) clearTimeout(timeout)
        
        let errorMsg = err.message
        if (err.message.includes('Access denied')) {
          errorMsg = 'Porta em uso por outro programa'
        } else if (err.message.includes('File not found')) {
          errorMsg = 'Porta não encontrada'
        }
        
        resolve({ available: false, error: errorMsg })
      })

      testPort.open()
    } catch (error) {
      if (timeout) clearTimeout(timeout)
      const errorMessage = error instanceof Error ? error.message : 'Erro na verificação'
      resolve({ available: false, error: errorMessage })
    }
  })
}

// Testa conexão com uma porta específica
async function testarConexaoPorta(portaPath: string): Promise<boolean> {
  if (!SerialPort) return false

  // Primeiro verifica se a porta está disponível
  const verificacao = await verificarPortaDisponivel(portaPath)
  if (!verificacao.available) {
    console.log(`🚫 Porta ${portaPath} não disponível: ${verificacao.error}`)
    return false
  }

  return new Promise<boolean>((resolve) => {
    let testPort: SerialPortInstance | null = null
    let timeout: NodeJS.Timeout | null = null

    try {
      console.log(`🧪 Testando conexão com ${portaPath}...`)
      
      testPort = new SerialPort({
        path: portaPath,
        baudRate: 9600,
        autoOpen: false
      })

      // Timeout de 3 segundos para o teste
      timeout = setTimeout(() => {
        console.log(`⏰ Timeout ao testar ${portaPath}`)
        if (testPort && testPort.isOpen) {
          testPort.close(() => {})
        }
        resolve(false)
      }, 3000)

      testPort.on('open', () => {
        console.log(`✅ Teste bem-sucedido: ${portaPath}`)
        if (timeout) clearTimeout(timeout)
        testPort!.close(() => {
          resolve(true)
        })
      })

      testPort.on('error', (...args: unknown[]) => {
        const err = args[0] as Error
        console.log(`❌ Erro ao testar ${portaPath}: ${err.message}`)
        if (timeout) clearTimeout(timeout)
        resolve(false)
      })

      testPort.open()
    } catch (error) {
      console.log(`❌ Exceção ao testar ${portaPath}:`, error)
      if (timeout) clearTimeout(timeout)
      resolve(false)
    }
  })
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
        const trimmedData = data.trim()
        console.log('📥 Arduino:', trimmedData)
        
        // Adiciona ao buffer do Serial Monitor
        serialBuffer.push(trimmedData)
        if (serialBuffer.length > MAX_SERIAL_BUFFER) {
          serialBuffer.shift() // Remove a mensagem mais antiga
        }
        
        // Tenta fazer parse se for JSON para atualizar estados
        try {
          const jsonData = JSON.parse(trimmedData)
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
          
          // Melhorar mensagens de erro para o usuário
          if (err.message.includes('Access denied')) {
            lastError = `Acesso negado à porta ${portaPath}. Possíveis soluções:\n• Feche outros programas que possam estar usando a porta (Arduino IDE, Serial Monitor, etc.)\n• Reconecte o cabo USB\n• Tente uma porta diferente\n• Execute o programa como administrador`
          } else if (err.message.includes('File not found')) {
            lastError = `Porta ${portaPath} não encontrada. Verifique se o Arduino está conectado e na porta correta.`
          } else if (err.message.includes('Permission denied')) {
            lastError = `Permissão negada para ${portaPath}. Execute como administrador ou verifique as permissões.`
          } else {
            lastError = `Erro na porta ${portaPath}: ${err.message}`
          }
          
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
  
  // Simula comandos da cancela
  if (comando.toUpperCase() === 'FACE_RECOGNIZED' || comando.toUpperCase() === 'OPEN_GATE') {
    return { 
      success: true, 
      message: `Cancela aberta por reconhecimento facial (simulação)` 
    }
  }
  
  if (comando.toUpperCase() === 'FACE_REJECTED') {
    return { 
      success: true, 
      message: `Acesso negado - Buzzer acionado (simulação)` 
    }
  }
  
  if (comando.toUpperCase() === 'CLOSE_GATE') {
    return { 
      success: true, 
      message: `Cancela fechada manualmente (simulação)` 
    }
  }
  
  if (comando.toUpperCase() === 'STATUS') {
    return { 
      success: true, 
      message: `Estado da cancela: SIMULAÇÃO (simulação)` 
    }
  }
  
  if (comando.toUpperCase() === 'PING') {
    return { 
      success: true, 
      message: `PONG (simulação)` 
    }
  }
  
  // Simula mudança de estado dos LEDs (compatibilidade com comandos antigos)
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
          message: `LED ${ledNum} ${estado ? 'ligado' : 'desligado'} (simulação - use FACE_RECOGNIZED para abrir cancela)` 
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

    // Retorna mensagens do Serial Monitor
    if (action === 'serial-messages') {
      const messages = [...serialBuffer] // Cópia do buffer
      console.log(`📤 GET /api/arduino?action=serial-messages - Retornando ${messages.length} mensagens:`, messages)
      serialBuffer.length = 0 // Limpa o buffer após ler
      return NextResponse.json({ 
        success: true,
        messages,
        count: messages.length
      })
    }

    // Lista portas disponíveis
    if (action === 'ports') {
      const ports = await listarPortas()
      return NextResponse.json({ ports })
    }

    // Detecta porta Arduino automaticamente
    if (action === 'detect') {
      const portaDetectada = await detectarPortaArduino()
      return NextResponse.json({ 
        success: !!portaDetectada,
        detectedPort: portaDetectada,
        message: portaDetectada ? `Arduino detectado na porta ${portaDetectada}` : 'Nenhuma porta Arduino encontrada'
      })
    }

    // Verifica status de uma porta específica
    if (action === 'check-port') {
      const porta = searchParams.get('port')
      if (!porta) {
        return NextResponse.json({ success: false, error: 'Porta não especificada' })
      }

      const status = await verificarPortaDisponivel(porta)
      return NextResponse.json({
        success: true,
        port: porta,
        available: status.available,
        error: status.error,
        message: status.available ? `Porta ${porta} disponível` : `Porta ${porta}: ${status.error}`
      })
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
    if (action === 'connect') {
      let portaParaConectar = port

      // Se não especificou porta ou especificou 'auto', detecta automaticamente
      if (!port || port === 'auto') {
        console.log('🔍 Detectando porta Arduino automaticamente...')
        portaParaConectar = await detectarPortaArduino()
        
        if (!portaParaConectar) {
          return NextResponse.json({
            success: false,
            connected: false,
            error: 'Nenhuma porta Arduino encontrada automaticamente. Possíveis soluções:\n• Verifique se o Arduino está conectado via USB\n• Instale os drivers corretos (CH340, CP210x, etc.)\n• Tente desconectar e reconectar o cabo USB\n• Feche outros programas que possam estar usando a porta',
            message: 'Detecção automática falhou'
          })
        }
      } else {
        // Se especificou uma porta, verificar se está disponível primeiro
        const status = await verificarPortaDisponivel(portaParaConectar)
        if (!status.available) {
          return NextResponse.json({
            success: false,
            connected: false,
            error: `Porta ${portaParaConectar} não está disponível: ${status.error}`,
            message: 'Porta não disponível'
          })
        }
      }

      const sucesso = await conectarArduino(portaParaConectar)
      
      return NextResponse.json({
        success: sucesso,
        connected: isConnected,
        port: currentPort,
        detectedAutomatically: !port || port === 'auto',
        message: sucesso 
          ? `${SerialPort ? 'Conectado' : 'Simulação conectada'} à porta ${portaParaConectar}${(!port || port === 'auto') ? ' (detectada automaticamente)' : ''}` 
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
      // Se não está conectado, executar em modo simulação
      if (!isConnected) {
        console.log(`⚠️ Arduino não conectado, executando comando em modo simulação: ${command}`)
        const resultado = await simularComando(command)
        
        return NextResponse.json({
          success: true,
          command: command,
          message: `${resultado.message} (Arduino não conectado)`,
          ledStates: ledStates,
          mode: 'simulation',
          warning: 'Arduino não conectado - comando simulado'
        })
      }

      // Envia comando (real ou simulado)
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
