import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar funcionário por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[GET Employee] ID recebido:', id)

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            document: true,
            documentType: true,
            isActive: true
          }
        },
        condominium: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!employee) {
      console.log('[GET Employee] Funcionário não encontrado')
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }

    console.log('[GET Employee] Dados brutos do banco:', {
      phone: employee.user.phone,
      document: employee.user.document
    })

    // Formatar resposta
    const formattedEmployee = {
      id: employee.id,
      name: employee.user.name,
      email: employee.user.email,
      phone: employee.user.phone || '',
      documentNumber: employee.user.document || '',
      position: employee.position,
      department: employee.department || '',
      shift: 'FULL_TIME',
      salary: Number(employee.salary) || 0,
      status: employee.isActive ? 'ACTIVE' : 'INACTIVE',
      hireDate: employee.hireDate.toISOString(),
      createdAt: employee.createdAt.toISOString()
    }

    console.log('[GET Employee] Resposta formatada:', formattedEmployee)

    return NextResponse.json({ success: true, employee: formattedEmployee })
  } catch (error) {
    console.error('Erro ao buscar funcionário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar funcionário' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar funcionário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('[PUT Employee] ID:', id)
    console.log('[PUT Employee] Body recebido:', body)
    
    const {
      name,
      email,
      phone,
      documentNumber,
      position,
      department,
      salary,
      hireDate
    } = body

    // Verificar se o funcionário existe
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingEmployee) {
      console.log('[PUT Employee] Funcionário não encontrado')
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }

    console.log('[PUT Employee] Atualizando usuário ID:', existingEmployee.userId)
    console.log('[PUT Employee] Dados do usuário:', { name, email, phone, documentNumber })

    // Atualizar usuário
    await prisma.user.update({
      where: { id: existingEmployee.userId },
      data: {
        name,
        email,
        phone,
        document: documentNumber
      }
    })

    console.log('[PUT Employee] Usuário atualizado com sucesso')
    console.log('[PUT Employee] Atualizando funcionário com:', { position, department, salary, hireDate })

    // Atualizar funcionário
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        position,
        department,
        salary: parseFloat(salary),
        hireDate: new Date(hireDate)
      },
      include: {
        user: true
      }
    })

    console.log('[PUT Employee] Funcionário atualizado com sucesso:', updatedEmployee.id)

    return NextResponse.json({
      success: true,
      message: 'Funcionário atualizado com sucesso',
      employee: updatedEmployee
    })
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar funcionário' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir funcionário
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[DELETE Employee] ID recebido:', id)

    // Verificar se o funcionário existe
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }

    // Excluir funcionário (o usuário será excluído em cascata)
    await prisma.employee.delete({
      where: { id }
    })

    // Excluir usuário associado
    await prisma.user.delete({
      where: { id: existingEmployee.userId }
    })

    return NextResponse.json({
      success: true,
      message: 'Funcionário excluído com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir funcionário:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir funcionário' },
      { status: 500 }
    )
  }
}
