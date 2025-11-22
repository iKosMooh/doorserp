"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { CreateResidentModal } from "@/components/CreateResidentModal"
import { EditResidentModal } from "@/components/EditResidentModal"
import { useCondominium } from "@/contexts/CondominiumContext"
import { formatCPF, formatPhone } from "@/lib/utils"
import { Plus, Search, Edit, Trash2, Phone, Mail, Home, Building, User, Users, UserX } from "lucide-react"

interface Resident {
  id: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    document: string | null
    documentType: string
    birthDate: string | null
    faceRecognitionEnabled: boolean
    faceRecognitionFolder: string | null
  }
  unit: {
    id: string
    block: string
    number: string
  }
  relationshipType: string
  emergencyContact: string | null
  vehiclePlates: string[]
  isActive: boolean
  moveInDate: string
}

export default function ResidentsPage() {
  const { selectedCondominium, loading: condominiumLoading } = useCondominium()
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [activeTab, setActiveTab] = useState<'residents' | 'vehicles'>('residents')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchResidents = async (condominiumId: string, page = 1, limit = 25) => {
    try {
      setLoading(true)
      setError(null)
      
      const limitParam = limit === 0 ? 'all' : limit.toString()
      const response = await fetch(`/api/residents?condominiumId=${condominiumId}&page=${page}&limit=${limitParam}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar moradores')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setResidents(result.data)
        if (result.pagination) {
          setTotalItems(result.pagination.total)
          setTotalPages(result.pagination.totalPages)
          setCurrentPage(result.pagination.page)
        }
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao buscar moradores:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCondominium?.id) {
      fetchResidents(selectedCondominium.id, currentPage, itemsPerPage)
    }
  }, [selectedCondominium, currentPage, itemsPerPage])

  const filteredResidents = residents.filter(resident => {
    const searchLower = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    return (
      resident.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${resident.unit.block}/${resident.unit.number}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.user.document?.includes(searchTerm) ||
      // Pesquisa por placa (remove hífens e espaços para comparação)
      (resident.vehiclePlates && resident.vehiclePlates.some(plate => 
        plate.toLowerCase().replace(/[^a-z0-9]/g, '').includes(searchLower)
      ))
    )
  })

  // Lista de veículos com informações do morador
  const vehiclesList = residents.flatMap(resident => 
    (resident.vehiclePlates || [])
      .filter(plate => plate && plate.trim())
      .map(plate => ({
        plate,
        residentName: resident.user.name,
        residentId: resident.id,
        unit: `${resident.unit.block}/${resident.unit.number}`,
        isActive: resident.isActive
      }))
  ).sort((a, b) => a.plate.localeCompare(b.plate))

  const filteredVehicles = vehiclesList.filter(vehicle => {
    const searchLower = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '')
    const plateLower = vehicle.plate.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    return (
      plateLower.includes(searchLower) ||
      vehicle.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.unit.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleEdit = (id: string) => {
    const resident = residents.find(r => r.id === id)
    if (resident) {
      setSelectedResident(resident)
      setShowEditModal(true)
    }
  }

  const handleDelete = async (id: string) => {
    const resident = residents.find(r => r.id === id)
    if (!resident) return

    if (!confirm(`Tem certeza que deseja excluir o morador "${resident.user.name}"?\n\nEsta ação irá remover permanentemente:\n• Dados pessoais\n• Relacionamento com a unidade\n• Fotos de reconhecimento facial\n• Logs de acesso\n\nEsta ação NÃO PODE ser desfeita!`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/residents/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir morador')
      }

      if (selectedCondominium?.id) {
        await fetchResidents(selectedCondominium.id)
      }
      alert(`✅ Morador "${resident.user.name}" excluído com sucesso!`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      alert(`❌ Erro: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    if (selectedCondominium?.id) {
      fetchResidents(selectedCondominium.id)
    }
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
            <p className="text-gray-500 mt-2">Selecione um condomínio no menu lateral para gerenciar moradores.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Moradores</h1>
            <p className="text-muted-foreground">
              Carregando moradores de {selectedCondominium.name}...
            </p>
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Carregando moradores...</div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 text-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Moradores</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie os moradores de {selectedCondominium.name}
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-6 bg-gradient-to-r from-green-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Novo Morador
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-red-600">{error}</div>
              <Button 
                onClick={() => fetchResidents(selectedCondominium.id)}
                className="mt-2"
                size="sm"
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total
              </CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{residents.length}</div>
              <p className="text-xs text-muted-foreground">
                Moradores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Ativos
              </CardTitle>
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {residents.filter(r => r.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Status ativo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Com Face
              </CardTitle>
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {residents.filter(r => r.user.faceRecognitionEnabled).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Cadastrada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Unidades
              </CardTitle>
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {new Set(residents.map(r => `${r.unit.block}/${r.unit.number}`)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Ocupadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('residents')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'residents'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Moradores
            </div>
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'vehicles'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 11h8M8 15h8" />
              </svg>
              Veículos ({vehiclesList.length})
            </div>
          </button>
        </div>

        {/* Busca e filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              {activeTab === 'residents' ? 'Pesquisar Moradores' : 'Pesquisar Veículos'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {activeTab === 'residents' 
                ? 'Busque por nome, email, documento, unidade ou placa de veículo'
                : 'Busque por placa, nome do morador ou unidade'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder={activeTab === 'residents' 
                  ? "Digite nome, email, CPF, unidade ou placa..."
                  : "Digite placa, nome ou unidade..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de moradores */}
        {activeTab === 'residents' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Lista de Moradores</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {filteredResidents.length} morador(es) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredResidents.length === 0 ? (
              <div className="text-center py-12">
                <UserX className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-sm sm:text-base text-gray-500">
                  {searchTerm 
                    ? "Nenhum morador encontrado com os filtros aplicados" 
                    : "Nenhum morador cadastrado"}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop/Tablet: Tabela */}
                <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Relacionamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reconhecimento Facial</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResidents.map((resident) => (
                    <TableRow key={resident.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{resident.user.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {resident.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          {resident.unit.block}/{resident.unit.number}
                        </div>
                      </TableCell>
                      <TableCell>
                        {resident.user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {formatPhone(resident.user.phone)}
                          </div>
                        )}
                        {resident.emergencyContact && (
                          <div className="text-sm text-muted-foreground">
                            Emergência: {formatPhone(resident.emergencyContact)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatCPF(resident.user.document) || 'Não informado'}</TableCell>
                      <TableCell>{getRelationshipLabel(resident.relationshipType)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          resident.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {resident.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          resident.user.faceRecognitionEnabled 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {resident.user.faceRecognitionEnabled ? 'Habilitado' : 'Desabilitado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(resident.id)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(resident.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir
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
              {filteredResidents.map((resident) => {
                const borderColor = resident.isActive 
                  ? 'border-l-green-500' 
                  : 'border-l-red-500'
                
                return (
                  <Card key={resident.id} className={`border-l-4 ${borderColor}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Cabeçalho com nome e status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-base">{resident.user.name}</div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{resident.user.email}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          resident.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {resident.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {/* Informações em grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{resident.unit.block}/{resident.unit.number}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{getRelationshipLabel(resident.relationshipType)}</span>
                        </div>

                        {resident.user.phone && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span>{formatPhone(resident.user.phone)}</span>
                          </div>
                        )}

                        {resident.user.document && (
                          <div className="col-span-2 text-xs text-gray-500">
                            CPF: {formatCPF(resident.user.document)}
                          </div>
                        )}

                        <div className="col-span-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            resident.user.faceRecognitionEnabled 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            Face: {resident.user.faceRecognitionEnabled ? 'Habilitado' : 'Desabilitado'}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          onClick={() => handleEdit(resident.id)}
                          className="flex-1 min-h-[44px]"
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(resident.id)}
                          className="flex-1 text-red-600 hover:text-red-700 min-h-[44px]"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Pagination */}
            {filteredResidents.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setItemsPerPage(newItemsPerPage)
                    setCurrentPage(1) // Reset to first page when changing items per page
                  }}
                />
              </div>
            )}
          </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de veículos */}
        {activeTab === 'vehicles' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Lista de Veículos</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {filteredVehicles.length} veículo(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm sm:text-base text-gray-500">
                    {searchTerm 
                      ? "Nenhum veículo encontrado com os filtros aplicados" 
                      : "Nenhum veículo cadastrado"}
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop/Tablet: Tabela */}
                  <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Placa</TableHead>
                          <TableHead>Morador</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVehicles.map((vehicle, index) => (
                          <TableRow key={`${vehicle.residentId}-${vehicle.plate}-${index}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-lg font-bold">{vehicle.plate}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {vehicle.residentName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                {vehicle.unit}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                vehicle.isActive 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {vehicle.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(vehicle.residentId)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Editar Morador
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: Cards */}
                  <div className="md:hidden space-y-4">
                    {filteredVehicles.map((vehicle, index) => {
                      const borderColor = vehicle.isActive 
                        ? 'border-l-green-500' 
                        : 'border-l-red-500'
                      
                      return (
                        <Card key={`${vehicle.residentId}-${vehicle.plate}-${index}`} className={`border-l-4 ${borderColor}`}>
                          <CardContent className="p-4 space-y-3">
                            {/* Cabeçalho com placa e status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <svg className="h-5 w-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xl font-bold">{vehicle.plate}</span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                vehicle.isActive 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {vehicle.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>

                            {/* Informações do morador e unidade */}
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium">{vehicle.residentName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span>{vehicle.unit}</span>
                              </div>
                            </div>

                            {/* Ação */}
                            <div className="pt-2 border-t">
                              <Button
                                variant="outline"
                                onClick={() => handleEdit(vehicle.residentId)}
                                className="w-full min-h-[44px]"
                              >
                                <Edit className="h-4 w-4 mr-1.5" />
                                Editar Morador
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <CreateResidentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />

        <EditResidentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedResident(null)
          }}
          onSuccess={handleCreateSuccess}
          resident={selectedResident}
          condominiumId={selectedCondominium?.id || ''}
        />
      </div>
    </MainLayout>
  )
}
