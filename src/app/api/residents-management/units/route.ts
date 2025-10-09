import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Build where clause based on user permissions
    const whereClause: { condominium?: { id: string } } = {};
    
    if (!user.isAdmin && !user.isSuperAdmin) {
      // Non-admin users can only see their own condominium
      const userCondominium = user.residents[0]?.condominium?.id;
      if (userCondominium) {
        whereClause.condominium = {
          id: userCondominium
        };
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Usuário não possui condomínio associado' 
        }, { status: 403 });
      }
    }

    const residents = await prisma.resident.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            document: true,
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
            // Include all guests, both active and inactive for admin view
          },
          select: {
            id: true,
            name: true,
            validFrom: true,
            validUntil: true,
            accessCode: true,
            currentEntries: true,
            maxEntries: true,
            isActive: true,
            faceRecognitionEnabled: true,
            faceRecognitionFolder: true
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
      residents: residents.map(resident => ({
        id: resident.id,
        relationshipType: resident.relationshipType,
        isActive: resident.isActive,
        emergencyContact: resident.emergencyContact,
        vehiclePlates: resident.vehiclePlates || [],
        user: resident.user,
        unit: resident.unit,
        condominium: resident.condominium,
        guests: resident.guests
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar dados das unidades:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}