import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedEmployees = employees.map((employee) => ({
      id: employee.id,
      name: employee.user.name || 'Nome não informado',
      email: employee.user.email || '',
      phone: '', // Campo não existe no schema atual
      documentNumber: '', // Campo não existe no schema atual
      position: employee.position,
      department: employee.department || 'Não informado',
      shift: 'FULL_TIME', // Campo não existe no schema atual, assumindo FULL_TIME
      salary: employee.salary ? Number(employee.salary) : 0,
      status: employee.isActive ? "ACTIVE" : "INACTIVE",
      hireDate: employee.hireDate.toISOString(),
      createdAt: employee.createdAt.toISOString(),
      userId: employee.user.id
    }))

    return NextResponse.json(formattedEmployees)
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
      hireDate 
    } = body

    // Validações básicas
    if (!name || !position) {
      return NextResponse.json(
        { error: "Nome e cargo são obrigatórios" },
        { status: 400 }
      )
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        isResident: false
      }
    })

    // Criar funcionário
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        position,
        department,
        salary: salary ? parseFloat(salary) : null,
        accessCardId: `EMP${Date.now()}`,
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
