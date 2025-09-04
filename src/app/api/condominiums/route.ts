import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const condominiums = await prisma.condominium.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      condominiums
    });
  } catch (error) {
    console.error('Erro ao buscar condomínios:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      cnpj,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      adminContact,
      subscriptionPlan
    } = body;

    // Validações básicas
    if (!name || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Campos obrigatórios: name, address, city, state, zipCode' 
        },
        { status: 400 }
      );
    }

    const condominium = await prisma.condominium.create({
      data: {
        name,
        cnpj: cnpj || null,
        address,
        city,
        state,
        zipCode,
        phone: phone || null,
        email: email || null,
        adminContact: adminContact || null,
        subscriptionPlan: subscriptionPlan || 'BASIC'
      }
    });

    return NextResponse.json({
      success: true,
      condominium
    });
  } catch (error) {
    console.error('Erro ao criar condomínio:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}
