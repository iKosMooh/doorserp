import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const condominiumId = searchParams.get('condominiumId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = searchParams.get('limit') === 'all' 
      ? undefined 
      : parseInt(searchParams.get('limit') || '25');

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

    const where = { condominiumId };

    const include = {
      residents: {
        where: {
          isActive: true
        },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }
    };

    const orderBy = [
      { block: 'asc' as const },
      { number: 'asc' as const }
    ];

    // Se limit é undefined (all), buscar tudo sem paginação
    if (limit === undefined) {
      const units = await prisma.unit.findMany({
        where,
        include,
        orderBy
      });

      return NextResponse.json({
        success: true,
        data: units,
        pagination: {
          total: units.length,
          page: 1,
          limit: units.length,
          totalPages: 1
        }
      });
    }

    // Com paginação
    const skip = (page - 1) * limit;

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        skip,
        take: limit,
        include,
        orderBy
      }),
      prisma.unit.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: units,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar unidades:', error);
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
      condominiumId,
      block,
      number,
      floor,
      area,
      bedrooms,
      bathrooms,
      parkingSpaces,
      unitType,
      monthlyFee
    } = body;

    // Validações básicas
    if (!condominiumId || !block || !number) {
      return NextResponse.json(
        { error: 'Condomínio, bloco e número são obrigatórios' },
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

    // Verificar se já existe uma unidade com o mesmo bloco/número
    const existingUnit = await prisma.unit.findFirst({
      where: {
        condominiumId,
        block,
        number
      }
    });

    if (existingUnit) {
      return NextResponse.json(
        { error: 'Já existe uma unidade com este bloco/número' },
        { status: 400 }
      );
    }

    // Criar a unidade
    const unit = await prisma.unit.create({
      data: {
        condominiumId,
        block,
        number,
        floor,
        area: area ? parseFloat(area) : null,
        bedrooms,
        bathrooms,
        parkingSpaces: parkingSpaces || 0,
        unitType: unitType || 'APARTMENT',
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0
      },
      include: {
        residents: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: unit
    });

  } catch (error) {
    console.error('Erro ao criar unidade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
