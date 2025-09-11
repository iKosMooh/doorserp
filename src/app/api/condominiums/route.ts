import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

    // Verificar se já existe um usuário com este email (apenas se email foi fornecido)
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Já existe um usuário com este email' 
          },
          { status: 400 }
        );
      }
    }

    // Usar transação para criar condomínio e usuário (se email fornecido)
    const result = await prisma.$transaction(async (tx) => {
      // Criar condomínio
      const condominium = await tx.condominium.create({
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

      let user = null;
      let defaultPassword = null;

      // Criar usuário administrador apenas se email foi fornecido
      if (email) {
        // Gerar senha padrão baseada no nome do condomínio
        defaultPassword = name.toLowerCase().replace(/\s+/g, '') + '123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name: adminContact || `Admin ${name}`,
            phone: phone || null,
            isActive: true,
            mustChangePassword: true // Força a troca de senha no primeiro login
          }
        });

        // Criar acesso do usuário ao condomínio
        await tx.userCondominiumAccess.create({
          data: {
            userId: user.id,
            condominiumId: condominium.id,
            accessLevel: 'ADMIN',
            isActive: true
          }
        });
      }

      return { condominium, user, defaultPassword };
    });

    const response = {
      success: true,
      condominium: result.condominium,
      message: 'Condomínio criado com sucesso!',
      user: result.user ? {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        defaultPassword: result.defaultPassword
      } : null
    };

    if (result.user && result.defaultPassword) {
      response.message = `Condomínio criado com sucesso! Usuário admin criado com email: ${result.user.email} e senha: ${result.defaultPassword}`;
    }

    return NextResponse.json(response);
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
