import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      include: {
        residents: {
          include: {
            user: true
          }
        }
      },
      orderBy: [
        { block: 'asc' },
        { number: 'asc' }
      ]
    })

    const formattedUnits = units.map((unit) => ({
      id: unit.id,
      number: unit.number,
      building: unit.block,
      floor: unit.floor,
      type: "APARTMENT", // Campo não existe no schema atual
      status: unit.residents.length > 0 ? "OCCUPIED" : "AVAILABLE",
      residents: unit.residents.map((resident) => ({
        id: resident.id,
        name: resident.user.name || 'Nome não informado',
        status: "ACTIVE" // Campo não existe no schema atual
      }))
    }))

    return NextResponse.json(formattedUnits)
  } catch (error) {
    console.error("Erro ao buscar unidades:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, building, floor } = body

    // Validações básicas
    if (!number || !building) {
      return NextResponse.json(
        { error: "Número e prédio são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se já existe uma unidade com o mesmo número no mesmo prédio
    const existingUnit = await prisma.unit.findFirst({
      where: {
        number: number,
        block: building
      }
    })

    if (existingUnit) {
      return NextResponse.json(
        { error: "Já existe uma unidade com esse número neste prédio" },
        { status: 409 }
      )
    }

    // Criar unidade
    const unit = await prisma.unit.create({
      data: {
        number,
        block: building,
        floor: floor || 1
      }
    })

    return NextResponse.json({
      success: true,
      message: "Unidade criada com sucesso",
      unit: unit
    })

  } catch (error) {
    console.error("Erro ao criar unidade:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
