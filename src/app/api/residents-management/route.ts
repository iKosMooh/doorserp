import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

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
  } catch {
    return null;
  }
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

    // Se é admin/super admin, pode ver todos os moradores
    if (user.isAdmin || user.isSuperAdmin) {
      const where: Prisma.ResidentWhereInput = {};
      
      if (condominiumId) {
        where.condominiumId = condominiumId;
      }
      
      if (unitId) {
        where.unitId = unitId;
      }

      const residents = await prisma.resident.findMany({
        where: {
          ...where,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              document: true,
              photo: true,
              faceRecognitionEnabled: true,
              lastLogin: true
            }
          },
          unit: {
            select: {
              id: true,
              block: true,
              number: true,
              floor: true
            }
          },
          condominium: {
            select: {
              id: true,
              name: true
            }
          },
          guests: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              validFrom: true,
              validUntil: true,
              accessCode: true,
              currentEntries: true,
              maxEntries: true
            }
          }
        },
        orderBy: [
          { unit: { block: 'asc' } },
          { unit: { number: 'asc' } },
          { relationshipType: 'asc' }
        ]
      });

      return NextResponse.json({
        success: true,
        residents
      });
    }

    // Se é morador, só pode ver dados da própria unidade
    const residentInfo = user.residents.find(r => r.isActive);
    
    if (!residentInfo) {
      return NextResponse.json(
        { success: false, message: 'Usuário não é morador ativo' },
        { status: 403 }
      );
    }

    const residents = await prisma.resident.findMany({
      where: {
        unitId: residentInfo.unitId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            document: true,
            photo: true,
            faceRecognitionEnabled: true,
            lastLogin: true
          }
        },
        unit: {
          select: {
            id: true,
            block: true,
            number: true,
            floor: true
          }
        },
        condominium: {
          select: {
            id: true,
            name: true
          }
        },
        guests: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            validFrom: true,
            validUntil: true,
            accessCode: true,
            currentEntries: true,
            maxEntries: true
          }
        }
      },
      orderBy: {
        relationshipType: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      residents
    });

  } catch (error) {
    console.error('Erro ao buscar moradores:', error);
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

    // Apenas admins podem criar novos moradores
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      document,
      unitId,
      condominiumId,
      relationshipType = 'OWNER',
      emergencyContact,
      vehiclePlates,
      accessPermissions,
      moveInDate,
      notes
    } = body;

    // Validações
    if (!name || !email || !unitId || !condominiumId) {
      return NextResponse.json(
        { success: false, message: 'Nome, email, unidade e condomínio são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a unidade existe
    const unit = await prisma.unit.findUnique({
      where: { id: unitId }
    });

    if (!unit || unit.condominiumId !== condominiumId) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada ou não pertence ao condomínio' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe
    let targetUser = await prisma.user.findUnique({
      where: { email }
    });

    // Se não existe, criar novo usuário
    if (!targetUser) {
      const bcrypt = require('bcryptjs');
      const defaultPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      targetUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          document,
          mustChangePassword: true, // Força mudança de senha no primeiro login
          isActive: true
        }
      });

      // TODO: Enviar email com credenciais temporárias
      console.log(`Senha temporária para ${email}: ${defaultPassword}`);
    }

    // Verificar se já é morador da unidade
    const existingResident = await prisma.resident.findFirst({
      where: {
        userId: targetUser.id,
        unitId: unitId,
        isActive: true
      }
    });

    if (existingResident) {
      return NextResponse.json(
        { success: false, message: 'Usuário já é morador desta unidade' },
        { status: 400 }
      );
    }

    // Criar registro de morador
    const resident = await prisma.resident.create({
      data: {
        userId: targetUser.id,
        unitId,
        condominiumId,
        relationshipType,
        emergencyContact,
        vehiclePlates,
        accessPermissions,
        moveInDate: moveInDate ? new Date(moveInDate) : new Date(),
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            document: true,
            photo: true,
            faceRecognitionEnabled: true,
            lastLogin: true
          }
        },
        unit: {
          select: {
            id: true,
            block: true,
            number: true,
            floor: true
          }
        },
        condominium: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Atualizar status de ocupação da unidade
    await prisma.unit.update({
      where: { id: unitId },
      data: { isOccupied: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Morador cadastrado com sucesso',
      resident
    });

  } catch (error) {
    console.error('Erro ao criar morador:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
