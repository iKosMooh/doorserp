import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { units } = await request.json();

    if (!units || !Array.isArray(units) || units.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Lista de unidades é obrigatória'
      }, { status: 400 });
    }

    // Validar cada unidade
    for (const unit of units) {
      if (!unit.condominiumId || !unit.block || !unit.number) {
        return NextResponse.json({
          success: false,
          error: 'Campos obrigatórios faltando: condominiumId, block, number'
        }, { status: 400 });
      }

      if (isNaN(parseFloat(unit.monthlyFee))) {
        return NextResponse.json({
          success: false,
          error: 'Taxa mensal deve ser um número válido'
        }, { status: 400 });
      }
    }

    // Verificar se o condomínio existe
    const condominiumExists = await prisma.condominium.findUnique({
      where: { id: units[0].condominiumId }
    });

    if (!condominiumExists) {
      return NextResponse.json({
        success: false,
        error: 'Condomínio não encontrado'
      }, { status: 404 });
    }

    // Verificar se alguma unidade já existe (mesmo bloco e número no condomínio)
    const existingUnits = await prisma.unit.findMany({
      where: {
        condominiumId: units[0].condominiumId,
        OR: units.map(unit => ({
          block: unit.block,
          number: unit.number
        }))
      },
      select: {
        block: true,
        number: true
      }
    });

    if (existingUnits.length > 0) {
      const duplicates = existingUnits.map(u => `${u.block}-${u.number}`).join(', ');
      return NextResponse.json({
        success: false,
        error: `Unidades já existem: ${duplicates}`
      }, { status: 409 });
    }

    // Criar as unidades em uma transação
    const createdUnits = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const unit of units) {
        const createdUnit = await tx.unit.create({
          data: {
            condominiumId: unit.condominiumId,
            block: unit.block,
            number: unit.number,
            floor: unit.floor,
            area: unit.area,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            parkingSpaces: unit.parkingSpaces,
            unitType: unit.unitType || 'APARTMENT',
            monthlyFee: unit.monthlyFee,
            isActive: true
          }
        });
        
        results.push(createdUnit);
      }
      
      return results;
    });

    return NextResponse.json({
      success: true,
      data: createdUnits,
      message: `${createdUnits.length} unidades criadas com sucesso`
    });

  } catch (error) {
    console.error('Erro ao criar unidades em lote:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
