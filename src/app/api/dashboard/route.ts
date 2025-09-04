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

    // Buscar estatísticas do condomínio
    const [
      totalResidents,
      totalEmployees,
      totalUnits,
      totalGuests,
      recentAccess
    ] = await Promise.all([
      // Total de moradores ativos
      prisma.resident.count({
        where: {
          condominiumId,
          isActive: true
        }
      }),

      // Total de funcionários ativos
      prisma.employee.count({
        where: {
          condominiumId,
          isActive: true
        }
      }),

      // Total de unidades
      prisma.unit.count({
        where: { condominiumId }
      }),

      // Total de convidados ativos (não expirados)
      prisma.guest.count({
        where: {
          condominiumId,
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } }
          ]
        }
      }),

      // Últimos acessos (últimas 24 horas)
      prisma.accessLog.findMany({
        where: {
          condominiumId,
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
          }
        },
        include: {
          user: {
            select: {
              name: true
            }
          },
          guest: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 10
      })
    ]);

    // Calcular dados financeiros separados por tipo
    const monthlyIncome = await prisma.financialEntry.aggregate({
      where: {
        condominiumId,
        type: 'INCOME',
        transactionDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      },
      _sum: {
        amount: true
      }
    });

    const monthlyExpenses = await prisma.financialEntry.aggregate({
      where: {
        condominiumId,
        type: 'EXPENSE',
        transactionDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      },
      _sum: {
        amount: true
      }
    });

    // Formatar logs de acesso
    const formattedRecentAccess = recentAccess.map((access) => ({
      id: access.id,
      timestamp: access.timestamp.toISOString(),
      personName: access.user?.name || access.guest?.name || 'Desconhecido',
      accessType: access.user ? 'USER' : 'GUEST',
      status: access.status
    }));

    // Estatísticas de acesso por período
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayAccess = await prisma.accessLog.count({
      where: {
        condominiumId,
        timestamp: {
          gte: todayStart
        }
      }
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const weeklyAccess = await prisma.accessLog.count({
      where: {
        condominiumId,
        timestamp: {
          gte: weekStart
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        condominium: {
          id: condominium.id,
          name: condominium.name,
          address: condominium.address,
          city: condominium.city,
          state: condominium.state
        },
        stats: {
          totalResidents,
          totalEmployees,
          totalUnits,
          totalGuests,
          todayAccess,
          weeklyAccess,
          monthlyIncome: Number(monthlyIncome._sum.amount || 0),
          monthlyExpenses: Number(monthlyExpenses._sum.amount || 0),
          netBalance: Number(monthlyIncome._sum.amount || 0) - Number(monthlyExpenses._sum.amount || 0)
        },
        recentAccess: formattedRecentAccess
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
