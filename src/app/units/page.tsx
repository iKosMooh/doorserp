"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUnits = async (condominiumId: string, page = 1, limit = 25) => {
    try {
      setLoading(true)
      setError(null)
      
      const limitParam = limit === 0 ? 'all' : limit.toString()
      const response = await fetch(`/api/units?condominiumId=${condominiumId}&page=${page}&limit=${limitParam}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar unidades')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setUnits(result.data || [])
        if (result.pagination) {
          setTotalItems(result.pagination.total)
          setTotalPages(result.pagination.totalPages)
        }
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
      fetchUnits(selectedCondominium.id, currentPage, itemsPerPage)
    }
  }, [selectedCondominium, currentPage, itemsPerPage])

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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Unidades</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie as unidades de {selectedCondominium.name}
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 min-h-[44px] px-6"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Nova Unidade
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Unidades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Ocupadas</CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.occupied}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}% ocupação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Vagas</CardTitle>
              <Home className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.vacant}</div>
              <p className="text-xs text-muted-foreground">
                Disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Garagens</CardTitle>
              <Car className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.totalParkingSpaces}</div>
              <p className="text-xs text-muted-foreground">
                Total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e busca */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <input
                    placeholder="Buscar por bloco/número ou morador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 sm:pl-11 w-full min-h-[44px] px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4"
                >
                  <Filter className="w-4 h-4 mr-1.5" />
                  Todas
                </Button>
                <Button
                  variant={filter === "occupied" ? "default" : "outline"}
                  onClick={() => setFilter("occupied")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Ocupadas
                </Button>
                <Button
                  variant={filter === "vacant" ? "default" : "outline"}
                  onClick={() => setFilter("vacant")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4"
                >
                  <Home className="w-4 h-4 mr-1.5" />
                  Vagas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de unidades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Lista de Unidades</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {filteredUnits.length} unidade(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-base sm:text-lg">Carregando unidades...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4 text-sm sm:text-base">{error}</div>
                <Button onClick={() => fetchUnits(selectedCondominium.id)} className="min-h-[44px] px-6">
                  Tentar novamente
                </Button>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-12">
                <Building className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-sm sm:text-base text-gray-500">
                  {searchTerm || filter !== "all" 
                    ? "Nenhuma unidade encontrada com os filtros aplicados" 
                    : "Nenhuma unidade cadastrada"}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop/Tablet: Tabela */}
                <div className="hidden md:block overflow-x-auto -mx-6 px-6">
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
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-4">
              {filteredUnits.map((unit) => {
                const borderColor = unit.isOccupied ? 'border-l-green-500' : 'border-l-blue-500'
                
                return (
                  <Card key={unit.id} className={`border-l-4 ${borderColor}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Cabeçalho */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Square className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-base">{unit.block}/{unit.number}</div>
                            {unit.floor && (
                              <div className="text-sm text-gray-500">Andar {unit.floor}</div>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          unit.isOccupied ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {unit.isOccupied ? 'Ocupada' : 'Vaga'}
                        </span>
                      </div>

                      {/* Tipo e detalhes */}
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{getUnitTypeLabel(unit.unitType)}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-gray-600">
                          {unit.area && <div>{unit.area}m²</div>}
                          {unit.bedrooms && <div>{unit.bedrooms} quartos</div>}
                          {unit.bathrooms && <div>{unit.bathrooms} banheiros</div>}
                          {unit.parkingSpaces > 0 && (
                            <div className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              {unit.parkingSpaces} vaga(s)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Moradores */}
                      {unit.residents.filter(r => r.isActive).length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-gray-500 mb-1">Moradores:</div>
                          {unit.residents.filter(r => r.isActive).map((resident) => (
                            <div key={resident.id} className="text-sm">
                              <span className="font-medium">{resident.user.name}</span>
                              <span className="text-gray-500"> • {getRelationshipLabel(resident.relationshipType)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Taxa e ações */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center text-sm font-medium text-green-600">
                          <DollarSign className="h-4 w-4" />
                          R$ {unit.monthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="min-h-[36px]">
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm" className="min-h-[36px]">
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

          {/* Pagination */}
          {filteredUnits.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage)
                  setCurrentPage(1)
                }}
              />
            </div>
          )}
          </>
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
