import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = searchParams.get('limit') === 'all' 
      ? undefined 
      : parseInt(searchParams.get('limit') || '25');

    const include = {
      user: true
    };

    const orderBy = {
      createdAt: 'desc' as const
    };

    // Se limit é undefined (all), buscar tudo sem paginação
    if (limit === undefined) {
      const employees = await prisma.employee.findMany({
        include,
        orderBy
      });

      const formattedEmployees = employees.map((employee) => ({
        id: employee.id,
        name: employee.user.name || 'Nome não informado',
        email: employee.user.email || '',
        phone: employee.user.phone || '',
        documentNumber: employee.user.document || '',
        position: employee.position,
        department: employee.department || 'Não informado',
        shift: 'FULL_TIME',
        salary: employee.salary ? Number(employee.salary) : 0,
        status: employee.isActive ? "ACTIVE" : "INACTIVE",
        hireDate: employee.hireDate.toISOString(),
        createdAt: employee.createdAt.toISOString(),
        userId: employee.user.id
      }));

      return NextResponse.json({
        data: formattedEmployees,
        pagination: {
          total: formattedEmployees.length,
          page: 1,
          limit: formattedEmployees.length,
          totalPages: 1
        }
      });
    }

    // Com paginação
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        skip,
        take: limit,
        include,
        orderBy
      }),
      prisma.employee.count()
    ]);

    const formattedEmployees = employees.map((employee) => ({
      id: employee.id,
      name: employee.user.name || 'Nome não informado',
      email: employee.user.email || '',
      phone: employee.user.phone || '',
      documentNumber: employee.user.document || '',
      position: employee.position,
      department: employee.department || 'Não informado',
      shift: 'FULL_TIME',
      salary: employee.salary ? Number(employee.salary) : 0,
      status: employee.isActive ? "ACTIVE" : "INACTIVE",
      hireDate: employee.hireDate.toISOString(),
      createdAt: employee.createdAt.toISOString(),
      userId: employee.user.id
    }));

    return NextResponse.json({
      data: formattedEmployees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      email, 
      position, 
      department, 
      salary,
      hireDate,
      condominiumId 
    } = body

    // Validações básicas
    if (!name || !position || !condominiumId) {
      return NextResponse.json(
        { error: "Nome, cargo e condomínio são obrigatórios" },
        { status: 400 }
      )
    }

    // Gerar código único de funcionário
    const employeeCode = `EMP${Date.now()}`

    // Criar usuário (sem password por enquanto - pode ser adicionado depois)
    const user = await prisma.user.create({
      data: {
        name,
        email: email || `${employeeCode.toLowerCase()}@temp.com`,
        password: 'temp123' // Senha temporária - deve ser alterada
      }
    })

    // Criar funcionário
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        condominiumId,
        employeeCode,
        position,
        department: department || 'Geral',
        salary: salary ? parseFloat(salary) : null,
        accessCardId: `CARD${Date.now()}`,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      message: "Funcionário cadastrado com sucesso",
      employee: {
        id: employee.id,
        name: user.name,
        email: user.email,
        phone: '',
        documentNumber: '',
        position: employee.position,
        department: employee.department,
        shift: 'FULL_TIME',
        salary: employee.salary ? Number(employee.salary) : 0,
        status: employee.isActive ? "ACTIVE" : "INACTIVE",
        hireDate: employee.hireDate,
        createdAt: employee.createdAt
      }
    })

  } catch (error) {
    console.error("Erro ao criar funcionário:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
