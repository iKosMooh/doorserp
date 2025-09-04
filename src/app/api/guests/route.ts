import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Buscar convidados do condomínio
    const guests = await prisma.guest.findMany({
      where: {
        condominiumId
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: guests
    });

  } catch (error) {
    console.error('Erro ao buscar convidados:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      document,
      phone,
      condominiumId,
      invitedByResidentId,
      visitPurpose,
      vehiclePlate,
      validFrom,
      validUntil,
      maxEntries,
      accessDurationMinutes,
      autoExpire
    } = body;

    // Validações básicas
    if (!name || !condominiumId || !invitedByResidentId) {
      return NextResponse.json(
        { error: 'Nome, condomínio e morador convidante são obrigatórios' },
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

    // Verificar se o morador existe
    const resident = await prisma.resident.findUnique({
      where: { id: invitedByResidentId }
    });

    if (!resident) {
      return NextResponse.json(
        { error: 'Morador não encontrado' },
        { status: 404 }
      );
    }

    // Criar o convidado
    const guest = await prisma.guest.create({
      data: {
        name,
        document,
        phone,
        condominiumId,
        invitedByResidentId,
        visitPurpose,
        vehiclePlate,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        maxEntries: maxEntries || 1,
        accessDurationMinutes: accessDurationMinutes || 60,
        autoExpire: autoExpire !== false
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

    return NextResponse.json({
      success: true,
      data: guest
    });

  } catch (error) {
    console.error('Erro ao criar convidado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
