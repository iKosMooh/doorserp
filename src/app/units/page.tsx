"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CreateUnitModal } from "@/components/CreateUnitModal"
import { useCondominium } from "@/contexts/CondominiumContext"
import { 
  Building, 
  Users, 
  Home,
  Car,
  DollarSign,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Square
} from "lucide-react"

interface Unit {
  id: string
  block: string
  number: string
  floor: number | null
  area: number | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number
  unitType: string
  monthlyFee: number
  isOccupied: boolean
  isActive: boolean
  residents: Array<{
    id: string
    user: {
      name: string
    }
    relationshipType: string
    isActive: boolean
  }>
}

export default function UnitsPage() {
  const { selectedCondominium, loading: condominiumLoading } = useCondominium()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "occupied" | "vacant">("all")
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchUnits = async (condominiumId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/units?condominiumId=${condominiumId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar unidades')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setUnits(result.data)
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao buscar unidades:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCondominium?.id) {
      fetchUnits(selectedCondominium.id)
    }
  }, [selectedCondominium])

  const filteredUnits = units.filter(unit => {
    // Filtro por busca
    const matchesSearch = searchTerm === "" || 
      `${unit.block}/${unit.number}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.residents.some(resident => 
        resident.user.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

    // Filtro por ocupação
    const matchesFilter = filter === "all" || 
      (filter === "occupied" && unit.isOccupied) ||
      (filter === "vacant" && !unit.isOccupied)

    return matchesSearch && matchesFilter && unit.isActive
  })

  const getUnitTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'APARTMENT': 'Apartamento',
      'HOUSE': 'Casa',
      'COMMERCIAL': 'Comercial',
      'STORAGE': 'Depósito'
    }
    return types[type] || type
  }

  const getRelationshipLabel = (type: string) => {
    const types: Record<string, string> = {
      'OWNER': 'Proprietário',
      'TENANT': 'Inquilino',
      'FAMILY_MEMBER': 'Familiar',
      'AUTHORIZED': 'Autorizado'
    }
    return types[type] || type
  }

  const stats = {
    total: units.filter(u => u.isActive).length,
    occupied: units.filter(u => u.isActive && u.isOccupied).length,
    vacant: units.filter(u => u.isActive && !u.isOccupied).length,
    totalParkingSpaces: units.reduce((sum, u) => sum + u.parkingSpaces, 0)
  }

  const handleCreateSuccess = () => {
    if (selectedCondominium?.id) {
      fetchUnits(selectedCondominium.id)
    }
  }

  if (condominiumLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando condomínios...</div>
        </div>
      </MainLayout>
    )
  }

  if (!selectedCondominium) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Nenhum condomínio selecionado</h2>
            <p className="text-gray-500 mt-2">Selecione um condomínio no menu lateral para gerenciar unidades.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Unidades</h1>
            <p className="text-muted-foreground">
              Gerencie as unidades de {selectedCondominium.name}
            </p>
          </div>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Unidade
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupadas</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.occupied}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}% ocupação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vagas</CardTitle>
              <Home className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.vacant}</div>
              <p className="text-xs text-muted-foreground">
                Disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vagas de Garagem</CardTitle>
              <Car className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalParkingSpaces}</div>
              <p className="text-xs text-muted-foreground">
                Total no condomínio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e busca */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="Buscar por bloco/número ou nome do morador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                  size="sm"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Todas
                </Button>
                <Button
                  variant={filter === "occupied" ? "default" : "outline"}
                  onClick={() => setFilter("occupied")}
                  size="sm"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Ocupadas
                </Button>
                <Button
                  variant={filter === "vacant" ? "default" : "outline"}
                  onClick={() => setFilter("vacant")}
                  size="sm"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Vagas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de unidades */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Unidades</CardTitle>
            <CardDescription>
              {filteredUnits.length} unidade(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-lg">Carregando unidades...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={() => fetchUnits(selectedCondominium.id)}>
                  Tentar novamente
                </Button>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || filter !== "all" 
                  ? "Nenhuma unidade encontrada com os filtros aplicados" 
                  : "Nenhuma unidade cadastrada"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Moradores</TableHead>
                    <TableHead>Taxa Mensal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Square className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{unit.block}/{unit.number}</div>
                            {unit.floor && (
                              <div className="text-sm text-gray-500">Andar {unit.floor}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getUnitTypeLabel(unit.unitType)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {unit.area && (
                            <div>{unit.area}m²</div>
                          )}
                          {unit.bedrooms && (
                            <div>{unit.bedrooms} quartos</div>
                          )}
                          {unit.bathrooms && (
                            <div>{unit.bathrooms} banheiros</div>
                          )}
                          {unit.parkingSpaces > 0 && (
                            <div className="flex items-center">
                              <Car className="h-3 w-3 mr-1" />
                              {unit.parkingSpaces} vaga(s)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {unit.residents.filter(r => r.isActive).length > 0 ? (
                          <div className="space-y-1">
                            {unit.residents.filter(r => r.isActive).map((resident) => (
                              <div key={resident.id} className="text-sm">
                                <div className="font-medium">{resident.user.name}</div>
                                <div className="text-gray-500">
                                  {getRelationshipLabel(resident.relationshipType)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">Vaga</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                          R$ {unit.monthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          unit.isOccupied
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {unit.isOccupied ? 'Ocupada' : 'Vaga'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <CreateUnitModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </MainLayout>
  )
}
