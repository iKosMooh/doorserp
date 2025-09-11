import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const {
      condominiumId,
      deviceName,
      deviceCode,
      connectionPort,
      baudRate,
      deviceLocation,
      deviceType,
      wifiSsid,
      wifiPassword,
      firmwareVersion,
      pinConfigurations,
      commandMapping,
      notes
    } = await request.json();

    // Validações básicas
    if (!condominiumId || !deviceName || !deviceCode || !connectionPort) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: condominiumId, deviceName, deviceCode, connectionPort' },
        { status: 400 }
      );
    }

    // Verificar se o condomínio existe
    const condominium = await prisma.condominium.findUnique({
      where: { id: condominiumId }
    });

    if (!condominium) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe um dispositivo com o mesmo código
    const existingDevice = await prisma.arduinoConfiguration.findUnique({
      where: { deviceCode }
    });

    if (existingDevice) {
      return NextResponse.json(
        { error: 'Já existe um dispositivo com este código' },
        { status: 409 }
      );
    }

    // Validar JSON dos campos de configuração
    if (pinConfigurations) {
      try {
        JSON.parse(pinConfigurations);
      } catch {
        return NextResponse.json(
          { error: 'Configuração de pinos deve ser um JSON válido' },
          { status: 400 }
        );
      }
    }

    if (commandMapping) {
      try {
        JSON.parse(commandMapping);
      } catch {
        return NextResponse.json(
          { error: 'Mapeamento de comandos deve ser um JSON válido' },
          { status: 400 }
        );
      }
    }

    // Criar a configuração do Arduino
    const arduinoConfig = await prisma.arduinoConfiguration.create({
      data: {
        condominiumId,
        deviceName,
        deviceCode,
        connectionPort,
        baudRate: parseInt(baudRate) || 9600,
        deviceLocation,
        deviceType: deviceType || 'MAIN_GATE',
        wifiSsid,
        wifiPassword,
        firmwareVersion,
        pinConfigurations: pinConfigurations || null,
        commandMapping: commandMapping || null,
        notes,
        isActive: true,
        isOnline: false,
        installationDate: new Date()
      },
      include: {
        condominium: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuração do Arduino salva com sucesso',
      data: {
        id: arduinoConfig.id,
        deviceName: arduinoConfig.deviceName,
        deviceCode: arduinoConfig.deviceCode,
        connectionPort: arduinoConfig.connectionPort,
        deviceLocation: arduinoConfig.deviceLocation,
        deviceType: arduinoConfig.deviceType,
        condominium: arduinoConfig.condominium,
        createdAt: arduinoConfig.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao salvar configuração do Arduino:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const condominiumId = searchParams.get('condominiumId');

    if (!condominiumId) {
      return NextResponse.json(
        { error: 'ID do condomínio é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar configurações do Arduino para o condomínio
    const arduinoConfigs = await prisma.arduinoConfiguration.findMany({
      where: {
        condominiumId,
        isActive: true
      },
      include: {
        condominium: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: arduinoConfigs.map(config => ({
        id: config.id,
        deviceName: config.deviceName,
        deviceCode: config.deviceCode,
        connectionPort: config.connectionPort,
        baudRate: config.baudRate,
        deviceLocation: config.deviceLocation,
        deviceType: config.deviceType,
        wifiSsid: config.wifiSsid,
        firmwareVersion: config.firmwareVersion,
        isOnline: config.isOnline,
        lastPing: config.lastPing,
        installationDate: config.installationDate,
        notes: config.notes,
        pinConfigurations: config.pinConfigurations,
        commandMapping: config.commandMapping,
        condominium: config.condominium,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar configurações do Arduino:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      deviceName,
      deviceCode,
      connectionPort,
      baudRate,
      deviceLocation,
      deviceType,
      wifiSsid,
      wifiPassword,
      firmwareVersion,
      pinConfigurations,
      commandMapping,
      notes,
      isActive
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID da configuração é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a configuração existe
    const existingConfig = await prisma.arduinoConfiguration.findUnique({
      where: { id }
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      );
    }

    // Se o deviceCode foi alterado, verificar duplicação
    if (deviceCode && deviceCode !== existingConfig.deviceCode) {
      const duplicateCode = await prisma.arduinoConfiguration.findUnique({
        where: { deviceCode }
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: 'Já existe um dispositivo com este código' },
          { status: 409 }
        );
      }
    }

    // Validar JSON dos campos de configuração se fornecidos
    if (pinConfigurations) {
      try {
        JSON.parse(pinConfigurations);
      } catch {
        return NextResponse.json(
          { error: 'Configuração de pinos deve ser um JSON válido' },
          { status: 400 }
        );
      }
    }

    if (commandMapping) {
      try {
        JSON.parse(commandMapping);
      } catch {
        return NextResponse.json(
          { error: 'Mapeamento de comandos deve ser um JSON válido' },
          { status: 400 }
        );
      }
    }

    // Atualizar a configuração
    const updatedConfig = await prisma.arduinoConfiguration.update({
      where: { id },
      data: {
        ...(deviceName && { deviceName }),
        ...(deviceCode && { deviceCode }),
        ...(connectionPort && { connectionPort }),
        ...(baudRate && { baudRate: parseInt(baudRate) }),
        ...(deviceLocation !== undefined && { deviceLocation }),
        ...(deviceType && { deviceType }),
        ...(wifiSsid !== undefined && { wifiSsid }),
        ...(wifiPassword !== undefined && { wifiPassword }),
        ...(firmwareVersion !== undefined && { firmwareVersion }),
        ...(pinConfigurations !== undefined && { pinConfigurations }),
        ...(commandMapping !== undefined && { commandMapping }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      },
      include: {
        condominium: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: updatedConfig
    });

  } catch (error) {
    console.error('Erro ao atualizar configuração do Arduino:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID da configuração é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a configuração existe
    const existingConfig = await prisma.arduinoConfiguration.findUnique({
      where: { id }
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      );
    }

    // Soft delete - marcar como inativo em vez de deletar
    await prisma.arduinoConfiguration.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuração removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover configuração do Arduino:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
