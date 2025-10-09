import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Função para verificar token e obter usuário
async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        residents: {
          include: {
            unit: true,
            condominium: true
          }
        }
      }
    });
    
    return user;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const guestId = params.id;

    // Buscar convidado
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        invitedByResident: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            unit: {
              select: {
                block: true,
                number: true
              }
            },
            condominium: true
          }
        }
      }
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, message: 'Convidado não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canView = user.isAdmin || user.isSuperAdmin || 
      user.residents.some(resident => 
        resident.condominium.id === guest.invitedByResident.condominium.id
      );

    if (!canView) {
      return NextResponse.json(
        { success: false, message: 'Sem permissão para visualizar este convidado' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        name: guest.name,
        accessCode: guest.accessCode,
        document: guest.document,
        phone: guest.phone,
        validFrom: guest.validFrom,
        validUntil: guest.validUntil,
        maxEntries: guest.maxEntries,
        currentEntries: guest.currentEntries,
        observations: guest.notes,
        isActive: guest.isActive,
        faceRecognitionEnabled: guest.faceRecognitionEnabled,
        faceRecognitionFolder: guest.faceRecognitionFolder,
        invitedBy: guest.invitedByResident.user.name,
        unit: `${guest.invitedByResident.unit.block}${guest.invitedByResident.unit.number}`
      }
    });

  } catch (error) {
    console.error('Erro ao buscar convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const guestId = params.id;
    const body = await request.json();

    // Verificar se o convidado existe
    const existingGuest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        invitedByResident: {
          include: {
            unit: true,
            condominium: true,
            user: true
          }
        }
      }
    });

    if (!existingGuest) {
      return NextResponse.json(
        { success: false, message: 'Convidado não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canEdit = user.isAdmin || user.isSuperAdmin || 
      user.residents.some(resident => 
        resident.condominium.id === existingGuest.invitedByResident.condominium.id
      );

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: 'Sem permissão para editar este convidado' },
        { status: 403 }
      );
    }

    // Validar dados
    const {
      name,
      document,
      phone,
      validFrom,
      validUntil,
      maxEntries,
      observations,
      isActive,
      faceRecognitionEnabled
    } = body;

    if (!name || !validFrom || !validUntil) {
      return NextResponse.json(
        { success: false, message: 'Nome e datas de validade são obrigatórios' },
        { status: 400 }
      );
    }

    const startDate = new Date(validFrom);
    const endDate = new Date(validUntil);

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, message: 'Data de início deve ser anterior à data de fim' },
        { status: 400 }
      );
    }

    if (maxEntries < 1) {
      return NextResponse.json(
        { success: false, message: 'Número máximo de entradas deve ser pelo menos 1' },
        { status: 400 }
      );
    }

    // Atualizar convidado
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        name: name.trim(),
        document: document?.trim() || null,
        phone: phone?.trim() || null,
        validFrom: startDate,
        validUntil: endDate,
        maxEntries: parseInt(maxEntries),
        notes: observations?.trim() || null, // Usar 'notes' ao invés de 'observations'
        isActive: Boolean(isActive),
        faceRecognitionEnabled: Boolean(faceRecognitionEnabled),
        updatedAt: new Date()
      },
      include: {
        invitedByResident: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            unit: {
              select: {
                block: true,
                number: true
              }
            }
          }
        }
      }
    });

    // Log da atualização
    console.log(`🔄 Convidado atualizado: ${updatedGuest.name} (${updatedGuest.accessCode}) por ${user.name}`);

    return NextResponse.json({
      success: true,
      message: 'Convidado atualizado com sucesso',
      guest: {
        id: updatedGuest.id,
        name: updatedGuest.name,
        accessCode: updatedGuest.accessCode,
        document: updatedGuest.document,
        phone: updatedGuest.phone,
        validFrom: updatedGuest.validFrom,
        validUntil: updatedGuest.validUntil,
        maxEntries: updatedGuest.maxEntries,
        currentEntries: updatedGuest.currentEntries,
        observations: updatedGuest.notes, // Usar 'notes' ao invés de 'observations'
        isActive: updatedGuest.isActive,
        faceRecognitionEnabled: updatedGuest.faceRecognitionEnabled,
        invitedBy: updatedGuest.invitedByResident.user.name,
        unit: `${updatedGuest.invitedByResident.unit.block}${updatedGuest.invitedByResident.unit.number}`
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const guestId = params.id;

    // Verificar se o convidado existe
    const existingGuest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        invitedByResident: {
          include: {
            condominium: true
          }
        }
      }
    });

    if (!existingGuest) {
      return NextResponse.json(
        { success: false, message: 'Convidado não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canDelete = user.isAdmin || user.isSuperAdmin || 
      user.residents.some(resident => 
        resident.condominium.id === existingGuest.invitedByResident.condominium.id
      );

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: 'Sem permissão para excluir este convidado' },
        { status: 403 }
      );
    }

    // Excluir convidado
    await prisma.guest.delete({
      where: { id: guestId }
    });

    console.log(`🗑️ Convidado excluído: ${existingGuest.name} (${existingGuest.accessCode}) por ${user.name}`);

    return NextResponse.json({
      success: true,
      message: 'Convidado excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}