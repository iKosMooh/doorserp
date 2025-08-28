import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface ResidentWithUserAndUnit {
  id: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    photo: string | null
  }
  unit: {
    id: string
    number: string
    block: string
  }
  phone: string | null
  emergencyContact: string | null
}

export async function GET() {
  try {
    const residents = await prisma.resident.findMany({
      include: {
        user: true,
        unit: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedResidents = residents.map((resident: ResidentWithUserAndUnit) => ({
      id: resident.id,
      name: resident.user.name || 'Nome não informado',
      email: resident.user.email || '',
      phone: resident.phone || '',
      documentNumber: '', // Campo não existe no schema atual
      unitNumber: resident.unit.number,
      building: resident.unit.block,
      status: "ACTIVE", // Campo não existe no schema atual, assumindo ACTIVE
      createdAt: resident.createdAt.toISOString(),
      userId: resident.user.id,
      unitId: resident.unit.id
    }))

    return NextResponse.json(formattedResidents)
  } catch (error) {
    console.error("Erro ao buscar moradores:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, unitId } = body

    // Validações básicas
    if (!name || !unitId) {
      return NextResponse.json(
        { error: "Nome e unidade são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se a unidade existe
    const unit = await prisma.unit.findUnique({
      where: { id: unitId }
    })

    if (!unit) {
      return NextResponse.json(
        { error: "Unidade não encontrada" },
        { status: 404 }
      )
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email
        // Remove phone, documentNumber, and status if not present in User schema
      }
    })

    // Criar morador
    const resident = await prisma.resident.create({
      data: {
        userId: user.id,
        unitId: unitId
        // Remove status if not present in Resident schema
      }
    });

    return NextResponse.json({
      success: true,
      message: "Morador cadastrado com sucesso",
      resident: {
        id: resident.id,
        name: user.name,
        email: user.email,
        unitId: resident.unitId,
        createdAt: resident.createdAt
        // Remove phone, documentNumber, and status if not present in User/Resident schema
      }
    });
  } catch (error: unknown) {
    console.error("Erro ao criar morador:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
