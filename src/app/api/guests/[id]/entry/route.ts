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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Validar action
    if (action !== 'increment') {
      return NextResponse.json(
        { success: false, message: 'Ação inválida. Use "increment"' },
        { status: 400 }
      );
    }

    // Buscar o convidado
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        invitedByResident: {
          include: {
            unit: true,
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

    // Verificar se o usuário tem permissão (admin ou morador da unidade)
    if (!user.isAdmin && !user.isSuperAdmin) {
      const userResident = user.residents.find(r => 
        r.unitId === guest.invitedByResident.unitId
      );
      
      if (!userResident) {
        return NextResponse.json(
          { success: false, message: 'Sem permissão para este convidado' },
          { status: 403 }
        );
      }
    }

    // Verificar se o convidado está ativo
    if (!guest.isActive) {
      return NextResponse.json(
        { success: false, message: 'Convidado não está ativo' },
        { status: 400 }
      );
    }

    // Verificar período de validade
    const now = new Date();
    const validFrom = new Date(guest.validFrom);
    const validUntil = guest.validUntil ? new Date(guest.validUntil) : null;

    if (now < validFrom) {
      return NextResponse.json(
        { success: false, message: 'Período de acesso ainda não iniciado' },
        { status: 400 }
      );
    }

    if (validUntil && now > validUntil) {
      return NextResponse.json(
        { success: false, message: 'Período de acesso expirado' },
        { status: 400 }
      );
    }

    // Verificar se não excedeu o limite de entradas
    if (guest.currentEntries >= guest.maxEntries) {
      return NextResponse.json(
        { success: false, message: 'Limite de entradas excedido' },
        { status: 400 }
      );
    }

    // Incrementar o contador de entradas
    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        currentEntries: {
          increment: 1
        },
        updatedAt: new Date()
      }
    });

    // Criar log de entrada
    await prisma.accessLog.create({
      data: {
        condominiumId: guest.invitedByResident.condominiumId,
        guestId: guest.id,
        timestamp: now,
        accessType: 'GUEST',
        accessMethod: 'FACIAL_RECOGNITION',
        entryExit: 'ENTRY',
        status: 'APPROVED', // Este é um log de entrada válida - APPROVED
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Entrada registrada com sucesso',
      guest: {
        id: updatedGuest.id,
        name: updatedGuest.name,
        currentEntries: updatedGuest.currentEntries,
        maxEntries: updatedGuest.maxEntries,
        remainingEntries: updatedGuest.maxEntries - updatedGuest.currentEntries
      }
    });

  } catch (error) {
    console.error('Erro ao registrar entrada do convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}