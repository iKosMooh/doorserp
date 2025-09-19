import { NextRequest, NextResponse } from 'next/server';

// Mock implementation for development
// In production, you would use actual SerialPort
interface MockSerialPort {
  path: string;
  manufacturer: string;
  serialNumber: string;
  vendorId: string;
  productId: string;
}

// Armazena as conexões ativas (mock)
const activeConnections = new Map<string, { isOpen: boolean; interval?: NodeJS.Timeout }>();
const serialLogs = new Map<string, string[]>();

// Mock serial ports para desenvolvimento
const mockPorts: MockSerialPort[] = [
  {
    path: 'COM3',
    manufacturer: 'Arduino LLC',
    serialNumber: 'A12345',
    vendorId: '2341',
    productId: '0043'
  },
  {
    path: 'COM4',
    manufacturer: 'FTDI',
    serialNumber: 'B67890',
    vendorId: '0403',
    productId: '6001'
  }
];

// Simula respostas do Arduino
const simulateArduinoResponse = (command: string): string[] => {
  const responses: string[] = [];
  
  switch (command.toUpperCase()) {
    case 'STATUS':
      responses.push('📊 ===== STATUS DO SISTEMA =====');
      responses.push('🏠 Estado da Cancela: FECHADO');
      responses.push('🔴 LED Vermelho: LIGADO');
      responses.push('🔧 Servo Motor: 0° (Fechado)');
      responses.push('🚗 Veículo: Não detectado há 45s');
      responses.push('💡 LED Aux 1: DESLIGADO');
      responses.push('💡 LED Aux 2: DESLIGADO');
      responses.push('⏰ Sistema ativo há: 1234s');
      responses.push('==============================');
      responses.push('{"gate_system":{"state":"FECHADO","servo_angle":0,"time_in_state":45,"vehicle_detected":false,"time_since_vehicle":45,"aux_led1":false,"aux_led2":false,"uptime":1234}}');
      break;
      
    case 'PING':
      responses.push('PONG - Sistema ativo e respondendo!');
      break;
      
    case 'OPEN_GATE':
    case 'FACE_RECOGNIZED':
      responses.push('✓ OK: Abrindo cancela - Acesso autorizado');
      responses.push('INFO: Reconhecimento facial confirmado');
      responses.push('🔄 MUDANÇA: FECHADO → ABRINDO');
      responses.push('🔧 SERVO: Movendo para posição aberta (90°)');
      break;
      
    case 'CLOSE_GATE':
      responses.push('✓ OK: Fechando cancela manualmente');
      responses.push('🔄 MUDANÇA: ABERTO → FECHANDO');
      break;
      
    case 'L1_ON':
      responses.push('✓ OK: LED auxiliar 1 LIGADO');
      break;
      
    case 'L1_OFF':
      responses.push('✓ OK: LED auxiliar 1 DESLIGADO');
      break;
      
    case 'L2_ON':
      responses.push('✓ OK: LED auxiliar 2 LIGADO');
      break;
      
    case 'L2_OFF':
      responses.push('✓ OK: LED auxiliar 2 DESLIGADO');
      break;
      
    default:
      responses.push(`❌ ERRO: Comando desconhecido: '${command}'`);
      responses.push('Digite \'STATUS\' para ver comandos disponíveis');
      break;
  }
  
  return responses;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const port = searchParams.get('port');

  try {
    switch (action) {
      case 'ports':
        // Retorna portas mock para desenvolvimento
        return NextResponse.json({ 
          success: true, 
          ports: mockPorts 
        });

      case 'status':
        if (!port) {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta não especificada' 
          }, { status: 400 });
        }

        const connection = activeConnections.get(port);
        const isConnected = connection && connection.isOpen;
        const logs = serialLogs.get(port) || [];

        return NextResponse.json({
          success: true,
          connected: isConnected,
          port: port,
          logs: logs.slice(-100) // Últimas 100 linhas
        });

      case 'logs':
        if (!port) {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta não especificada' 
          }, { status: 400 });
        }

        const allLogs = serialLogs.get(port) || [];
        return NextResponse.json({
          success: true,
          logs: allLogs.slice(-500) // Últimas 500 linhas
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Ação não reconhecida' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro na API serial monitor:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, port, command, baudRate = 9600 } = body;

    switch (action) {
      case 'connect':
        if (!port) {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta não especificada' 
          }, { status: 400 });
        }

        // Verifica se já existe conexão
        if (activeConnections.get(port)?.isOpen) {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta já está conectada' 
          }, { status: 400 });
        }

        try {
          // Inicializa logs para esta porta
          if (!serialLogs.has(port)) {
            serialLogs.set(port, []);
          }

          const timestamp = new Date().toLocaleTimeString();
          const logs = serialLogs.get(port) || [];
          logs.push(`[${timestamp}] ✅ CONECTADO: Porta ${port} aberta (${baudRate} baud)`);
          logs.push(`[${timestamp}] 📡 SISTEMA: Simulação ativada - Arduino virtual conectado`);
          logs.push(`[${timestamp}] 🔧 SISTEMA: Digite comandos como STATUS, PING, OPEN_GATE`);
          serialLogs.set(port, logs);

          // Simula conexão ativa
          activeConnections.set(port, { isOpen: true });

          // Simula mensagens periódicas do Arduino (opcional)
          const interval = setInterval(() => {
            const currentLogs = serialLogs.get(port) || [];
            const now = new Date().toLocaleTimeString();
            
            // Adiciona heartbeat ocasional (a cada 30 segundos)
            if (Math.random() < 0.1) {
              currentLogs.push(`[${now}] 📨 RX: ❤️ Sistema funcionando normalmente`);
              serialLogs.set(port, currentLogs);
            }
          }, 30000);

          // Armazena interval para cleanup
          const connection = activeConnections.get(port)!;
          connection.interval = interval;
          activeConnections.set(port, connection);

          return NextResponse.json({ 
            success: true, 
            message: `Conectado à porta ${port} (Simulação)` 
          });

        } catch (error) {
          console.error('Erro ao conectar:', error);
          return NextResponse.json({ 
            success: false, 
            error: `Erro ao conectar: ${error}` 
          }, { status: 500 });
        }

      case 'disconnect':
        if (!port) {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta não especificada' 
          }, { status: 400 });
        }

        const connection = activeConnections.get(port);
        if (connection && connection.isOpen) {
          // Limpa o interval se existir
          if (connection.interval) {
            clearInterval(connection.interval);
          }
          
          // Log de desconexão
          const timestamp = new Date().toLocaleTimeString();
          const logs = serialLogs.get(port) || [];
          logs.push(`[${timestamp}] 🔌 DESCONECTADO: Porta ${port} fechada`);
          serialLogs.set(port, logs);
          
          // Remove conexão
          activeConnections.delete(port);
          
          return NextResponse.json({ 
            success: true, 
            message: `Desconectado da porta ${port}` 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta não está conectada' 
          }, { status: 400 });
        }

      case 'send':
        if (!port || !command) {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta e comando são obrigatórios' 
          }, { status: 400 });
        }

        const serialConnection = activeConnections.get(port);
        if (!serialConnection || !serialConnection.isOpen) {
          return NextResponse.json({ 
            success: false, 
            error: 'Porta não está conectada' 
          }, { status: 400 });
        }

        try {
          // Log do comando enviado
          const timestamp = new Date().toLocaleTimeString();
          const logs = serialLogs.get(port) || [];
          logs.push(`[${timestamp}] 📤 TX: ${command}`);
          
          // Simula resposta do Arduino
          const responses = simulateArduinoResponse(command);
          responses.forEach((response, index) => {
            setTimeout(() => {
              const currentLogs = serialLogs.get(port) || [];
              const responseTime = new Date().toLocaleTimeString();
              currentLogs.push(`[${responseTime}] 📨 RX: ${response}`);
              
              // Mantém apenas as últimas 1000 linhas
              if (currentLogs.length > 1000) {
                currentLogs.splice(0, currentLogs.length - 1000);
              }
              
              serialLogs.set(port, currentLogs);
            }, index * 100); // Pequeno delay entre respostas
          });
          
          serialLogs.set(port, logs);

          return NextResponse.json({ 
            success: true, 
            message: `Comando enviado: ${command}` 
          });

        } catch (error) {
          console.error('Erro ao enviar comando:', error);
          return NextResponse.json({ 
            success: false, 
            error: `Erro ao enviar comando: ${error}` 
          }, { status: 500 });
        }

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Ação não reconhecida' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro na API serial monitor:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
