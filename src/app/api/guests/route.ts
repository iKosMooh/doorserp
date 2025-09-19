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
          where: { isActive: true },
          select: {
            id: true,
            unitId: true,
            condominiumId: true,
            relationshipType: true
          }
        }
      }
    });
    
    return user;
  } catch {
    return null;
  }
}

// Função para gerar código de acesso único
function generateAccessCode(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const condominiumId = searchParams.get('condominiumId');
    const unitId = searchParams.get('unitId');
    const residentId = searchParams.get('residentId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let whereClause = {};

    // Se é admin/super admin, pode ver todos os convidados
    if (user.isAdmin || user.isSuperAdmin) {
      if (condominiumId) {
        whereClause = { ...whereClause, condominiumId };
      }
      
      if (unitId) {
        whereClause = { 
          ...whereClause,
          invitedByResident: {
            unitId: unitId
          }
        };
      }
      
      if (residentId) {
        whereClause = { ...whereClause, invitedByResidentId: residentId };
      }
    } else {
      // Morador normal: só pode ver convidados da sua unidade
      const residentInfo = user.residents.find(r => r.id);
      
      if (!residentInfo) {
        return NextResponse.json(
          { success: false, message: 'Usuário não é morador ativo' },
          { status: 403 }
        );
      }

      whereClause = {
        ...whereClause,
        invitedByResident: {
          unitId: residentInfo.unitId
        }
      };
    }

    // Filtrar apenas ativos se solicitado
    if (activeOnly) {
      const now = new Date();
      whereClause = {
        ...whereClause,
        isActive: true,
        validUntil: {
          gte: now
        }
      };
    }

    const guests = await prisma.guest.findMany({
      where: whereClause,
      include: {
        invitedByResident: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            unit: {
              select: {
                id: true,
                block: true,
                number: true,
                floor: true
              }
            }
          }
        },
        condominium: {
          select: {
            id: true,
            name: true
          }
        },
        accessLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 5,
          select: {
            id: true,
            timestamp: true,
            accessType: true
          }
        }
      },
      orderBy: [
        { validUntil: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      guests
    });

  } catch (error) {
    console.error('Erro ao buscar convidados:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      document,
      phone,
      photo,
      validFrom,
      validUntil,
      maxEntries = 10,
      observations,
      residentId
    } = body;

    // Validações básicas
    if (!name || !validFrom || !validUntil || !residentId) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário pode criar convidado para este morador
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      include: {
        unit: true,
        condominium: true
      }
    });

    if (!resident) {
      return NextResponse.json(
        { success: false, message: 'Morador não encontrado' },
        { status: 404 }
      );
    }

    // Se não é admin, só pode criar para a própria unidade
    if (!user.isAdmin && !user.isSuperAdmin) {
      const userResident = user.residents.find(r => r.unitId === resident.unitId);
      
      if (!userResident) {
        return NextResponse.json(
          { success: false, message: 'Você só pode criar convidados para sua própria unidade' },
          { status: 403 }
        );
      }
    }

    // Validar datas
    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + 2); // Máximo 2 dias

    if (validFromDate < now) {
      return NextResponse.json(
        { success: false, message: 'Data de início não pode ser no passado' },
        { status: 400 }
      );
    }

    if (validUntilDate <= validFromDate) {
      return NextResponse.json(
        { success: false, message: 'Data de fim deve ser posterior à data de início' },
        { status: 400 }
      );
    }

    if (validUntilDate > maxDate) {
      return NextResponse.json(
        { success: false, message: 'Período máximo de acesso é de 2 dias' },
        { status: 400 }
      );
    }

    if (maxEntries < 1 || maxEntries > 50) {
      return NextResponse.json(
        { success: false, message: 'Número de entradas deve estar entre 1 e 50' },
        { status: 400 }
      );
    }

    // Gerar código único
    let accessCode = generateAccessCode();
    let attempts = 0;
    
    // Garantir que o código é único
    while (attempts < 10) {
      const existingGuest = await prisma.guest.findFirst({
        where: { accessCode }
      });
      
      if (!existingGuest) {
        break;
      }
      
      accessCode = generateAccessCode();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { success: false, message: 'Erro ao gerar código único' },
        { status: 500 }
      );
    }

    // Criar convidado
    const guest = await prisma.guest.create({
      data: {
        name,
        document,
        phone,
        visitorPhoto: photo,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        maxEntries,
        currentEntries: 0,
        accessCode,
        notes: observations,
        isActive: true,
        condominiumId: resident.condominiumId,
        invitedByResidentId: residentId
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

    // Log da criação
    await prisma.accessLog.create({
      data: {
        condominiumId: resident.condominiumId,
        guestId: guest.id,
        timestamp: now,
        accessType: 'GUEST',
        accessMethod: 'MANUAL',
        entryExit: 'ENTRY',
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Convidado criado com sucesso',
      guest
    });

  } catch (error) {
    console.error('Erro ao criar convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID do convidado é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar convidado
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        invitedByResident: {
          include: {
            unit: true
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

    // Verificar permissão
    if (!user.isAdmin && !user.isSuperAdmin) {
      const userResident = user.residents.find(r => r.unitId === guest.invitedByResident.unitId);
      
      if (!userResident) {
        return NextResponse.json(
          { success: false, message: 'Você só pode modificar convidados da sua própria unidade' },
          { status: 403 }
        );
      }
    }

    // Atualizar convidado
    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        isActive: isActive !== undefined ? isActive : guest.isActive,
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

    // Log da alteração
    await prisma.accessLog.create({
      data: {
        condominiumId: guest.condominiumId,
        guestId: guest.id,
        timestamp: new Date(),
        accessType: 'GUEST',
        accessMethod: 'MANUAL',
        entryExit: 'ENTRY',
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Convidado atualizado com sucesso',
      guest: updatedGuest
    });

  } catch (error) {
    console.error('Erro ao atualizar convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
