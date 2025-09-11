import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Esquema de validação para upload do código
const uploadCodeSchema = z.object({
  condominiumId: z.string().uuid(),
  deviceCode: z.string().min(1),
  arduinoCode: z.string().min(1),
  port: z.string().optional().default('COM4'),
  baudRate: z.number().optional().default(9600),
  boardType: z.string().optional().default('arduino:avr:uno'),
});

// Schema para compilar código
const compileCodeSchema = z.object({
  condominiumId: z.string().uuid(),
  deviceCode: z.string().min(1),
});

interface UploadBody {
  action: string;
  condominiumId: string;
  deviceCode: string;
  arduinoCode: string;
  port?: string;
  baudRate?: number;
  boardType?: string;
}

interface CompileBody {
  action: string;
  condominiumId: string;
  deviceCode: string;
}

interface CheckPortBody {
  action: string;
  port: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'upload') {
      return await handleUpload(body as UploadBody);
    } else if (action === 'compile') {
      return await handleCompile(body as CompileBody);
    } else if (action === 'check-port') {
      return await handleCheckPort(body as CheckPortBody);
    } else {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro na API Arduino Deploy:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

async function handleUpload(body: UploadBody) {
  const validatedData = uploadCodeSchema.parse(body);
  const { condominiumId, deviceCode, arduinoCode, port, baudRate } = validatedData;

  // Buscar a configuração do Arduino
  const arduinoConfig = await prisma.arduinoConfiguration.findFirst({
    where: {
      condominiumId,
      deviceCode,
    },
  });

  if (!arduinoConfig) {
    return NextResponse.json({ error: 'Configuração Arduino não encontrada' }, { status: 404 });
  }

  try {
    // Salvar o código no banco de dados
    await prisma.arduinoConfiguration.update({
      where: { id: arduinoConfig.id },
      data: {
        code: arduinoCode,
        connectionPort: port,
        baudRate,
        updatedAt: new Date(),
      },
    });

    // Simular o processo de upload do código (já que não temos Arduino CLI)
    const uploadResult = await simulateUploadCodeToArduino({
      code: arduinoCode,
      port: port || 'COM4',
      deviceCode,
    });

    if (uploadResult.success) {
      // Atualizar status online se o upload foi bem-sucedido
      await prisma.arduinoConfiguration.update({
        where: { id: arduinoConfig.id },
        data: {
          isOnline: true,
          lastPing: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Código salvo no banco de dados com sucesso!',
        details: uploadResult.output,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Falha ao processar código para o Arduino',
        details: uploadResult.error,
        output: uploadResult.output,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao fazer upload do código:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar upload',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

async function handleCompile(body: CompileBody) {
  const validatedData = compileCodeSchema.parse(body);
  const { condominiumId, deviceCode } = validatedData;

  // Buscar a configuração do Arduino
  const arduinoConfig = await prisma.arduinoConfiguration.findFirst({
    where: {
      condominiumId,
      deviceCode,
    },
  });

  if (!arduinoConfig || !arduinoConfig.code) {
    return NextResponse.json({ error: 'Código Arduino não encontrado' }, { status: 404 });
  }

  try {
    const compileResult = await simulateCompileArduinoCode({
      code: arduinoConfig.code,
    });

    return NextResponse.json({
      success: compileResult.success,
      message: compileResult.success ? 'Código validado com sucesso!' : 'Erro na validação',
      details: compileResult.output,
      errors: compileResult.errors,
    });
  } catch (error) {
    console.error('Erro ao compilar código:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao validar código',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

async function handleCheckPort(body: CheckPortBody) {
  const { port } = body;
  
  try {
    const availablePorts = await getAvailablePorts();
    const isPortAvailable = availablePorts.includes(port);
    
    return NextResponse.json({
      success: true,
      isAvailable: isPortAvailable,
      availablePorts,
      recommendedPort: availablePorts[0] || 'COM4',
    });
  } catch (error) {
    console.error('Erro ao verificar portas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar portas disponíveis',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

// Função para simular upload do código para o Arduino
async function simulateUploadCodeToArduino({
  code,
  port,
  deviceCode,
}: {
  code: string;
  port: string;
  deviceCode: string;
}) {
  try {
    // Validação básica do código Arduino
    const hasSetup = code.includes('void setup()');
    const hasLoop = code.includes('void loop()');
    
    if (!hasSetup || !hasLoop) {
      return {
        success: false,
        error: 'Código Arduino inválido: deve conter void setup() e void loop()',
        output: 'Validação falhou: estrutura básica do Arduino não encontrada',
      };
    }

    // Simular compilação
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      output: `Código para dispositivo ${deviceCode} salvo no banco de dados com sucesso!\n` +
               `Porta: ${port}\n` +
               `Tamanho do código: ${code.length} caracteres\n` +
               `Status: Pronto para deploy no Arduino`,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      output: '',
    };
  }
}

// Função para simular compilação do código
async function simulateCompileArduinoCode({
  code,
}: {
  code: string;
}) {
  try {
    // Validação básica do código
    const hasSetup = code.includes('void setup()');
    const hasLoop = code.includes('void loop()');
    const hasIncludes = code.includes('#include');
    
    let output = 'Validação do código Arduino:\n';
    output += `✓ Estrutura setup(): ${hasSetup ? 'OK' : 'ERRO'}\n`;
    output += `✓ Estrutura loop(): ${hasLoop ? 'OK' : 'ERRO'}\n`;
    output += `✓ Bibliotecas: ${hasIncludes ? 'Detectadas' : 'Nenhuma'}\n`;
    output += `✓ Tamanho: ${code.length} caracteres\n`;
    
    if (!hasSetup || !hasLoop) {
      return {
        success: false,
        output,
        errors: 'Código Arduino inválido: deve conter void setup() e void loop()',
      };
    }

    // Simular tempo de compilação
    await new Promise(resolve => setTimeout(resolve, 1500));

    output += '\nValidação concluída com sucesso!';

    return {
      success: true,
      output,
      errors: null,
    };

  } catch (error) {
    return {
      success: false,
      output: '',
      errors: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Função para obter portas disponíveis (simulada para ambiente Windows)
async function getAvailablePorts(): Promise<string[]> {
  try {
    // Em um ambiente real, você poderia usar bibliotecas como serialport
    // Por enquanto, retornar portas comuns do Windows
    const commonPorts = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'];
    
    // Simular verificação de portas
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return commonPorts;
  } catch (error) {
    console.error('Erro ao obter portas:', error);
    return ['COM1', 'COM2', 'COM3', 'COM4'];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'ports') {
      const ports = await getAvailablePorts();
      return NextResponse.json({ success: true, ports });
    } else if (action === 'check-cli') {
      return NextResponse.json({ 
        success: true, 
        cliInstalled: false, // Simulado como false
        cliPath: null,
        message: 'Arduino CLI não detectado - usando modo simulação'
      });
    } else {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro na API Arduino Deploy GET:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
