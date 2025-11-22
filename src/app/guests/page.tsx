"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { useCondominium } from "@/contexts/CondominiumContext"
import CreateGuestModal from "@/components/CreateGuestModal"
import { EditGuestModal } from "@/components/EditGuestModal"
import GuestQRCodeModal from "@/components/GuestQRCodeModal"
import { formatPhone, formatDocument } from "@/lib/utils"
import { 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  User,
  Phone,
  Car,
  Building,
  Search,
  Filter,
  Plus,
  QrCode,
  UserCheck
} from "lucide-react"

interface Guest {
  id: string
  name: string
  document: string | null
  phone: string | null
  visitPurpose: string | null
  vehiclePlate: string | null
  accessCode: string
  validFrom: string
  validUntil: string | null
  currentEntries: number
  maxEntries: number
  isActive: boolean
  invitedByResident: {
    user: {
      name: string
    }
    unit: {
      block: string
      number: string
    }
  }
}

export default function GuestsPage() {
  const { selectedCondominium, loading: condominiumLoading } = useCondominium()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    residents?: Array<{
      id: string;
      user: { id: string; name: string };
      unit: { block: string; number: string };
    }>;
  } | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchGuests = async (condominiumId: string, page = 1, limit = 25) => {
    try {
      setLoading(true)
      setError(null)
      
      const limitParam = limit === 0 ? 'all' : limit.toString()
      const response = await fetch(`/api/guests?condominiumId=${condominiumId}&page=${page}&limit=${limitParam}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar convidados')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setGuests(result.guests || [])
        if (result.pagination) {
          setTotalItems(result.pagination.total)
          setTotalPages(result.pagination.totalPages)
        }
      } else {
        throw new Error(result.message || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao buscar convidados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      // Buscar dados completos do morador via API residents-management
      const response = await fetch('/api/residents-management')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.residents.length > 0) {
          // Pegar o primeiro morador (morador logado)
          const residentData = data.residents[0]
          setCurrentUser({
            id: residentData.user.id,
            name: residentData.user.name,
            residents: [{
              id: residentData.id,
              user: {
                id: residentData.user.id,
                name: residentData.user.name
              },
              unit: {
                block: residentData.unit.block,
                number: residentData.unit.number
              }
            }]
          })
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error)
    }
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    if (selectedCondominium?.id) {
      fetchGuests(selectedCondominium.id) // Recarregar lista após criar
    }
  }

  const handleShowQRCode = (guest: Guest) => {
    setSelectedGuest(guest)
    setIsQRCodeModalOpen(true)
  }

  const handleCloseQRCodeModal = () => {
    setIsQRCodeModalOpen(false)
    setSelectedGuest(null)
  }

  const handleEdit = (guest: Guest) => {
    setSelectedGuest(guest)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedGuest(null)
    if (selectedCondominium?.id) {
      fetchGuests(selectedCondominium.id, currentPage, itemsPerPage)
    }
  }

  useEffect(() => {
    if (selectedCondominium?.id) {
      fetchGuests(selectedCondominium.id, currentPage, itemsPerPage)
    }
    fetchCurrentUser()
  }, [selectedCondominium, currentPage, itemsPerPage])

  const isGuestActive = (guest: Guest) => {
    if (!guest.isActive) return false
    if (!guest.validUntil) return true
    return new Date(guest.validUntil) > new Date()
  }

  const filteredGuests = guests?.filter(guest => {
    // Filtro por busca
    const matchesSearch = searchTerm === "" || 
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.invitedByResident.user.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro por status
    const matchesFilter = filter === "all" || 
      (filter === "active" && isGuestActive(guest)) ||
      (filter === "expired" && !isGuestActive(guest))

    return matchesSearch && matchesFilter
  }) || []

  const getStatusBadge = (guest: Guest) => {
    if (!guest.isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="w-3 h-3 mr-1" />
          Inativo
        </span>
      )
    }

    if (!guest.validUntil) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ativo (Sem limite)
        </span>
      )
    }

    const isExpired = new Date(guest.validUntil) <= new Date()
    
    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Expirado
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ativo
      </span>
    )
  }

  if (condominiumLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-black">Carregando condomínios...</div>
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
            <p className="text-gray-500 mt-2">Selecione um condomínio no menu lateral para gerenciar convidados.</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">Convidados</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 text-black">
              Gerencie visitantes e convidados de {selectedCondominium.name}
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-6"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Novo Convidado
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-black">Total</CardTitle>
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-black">{guests?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-black">Ativos</CardTitle>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {guests?.filter(isGuestActive).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-black">Expirados</CardTitle>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {guests?.filter(guest => !isGuestActive(guest)).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-black">Com Veículo</CardTitle>
              <Car className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {guests?.filter(guest => guest.vehiclePlate).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e busca */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-black">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <input
                    placeholder="Buscar por nome, documento, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 sm:pl-11 text-black w-full min-h-[44px] px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  Todos
                </Button>
                <Button
                  variant={filter === "active" ? "default" : "outline"}
                  onClick={() => setFilter("active")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Ativos
                </Button>
                <Button
                  variant={filter === "expired" ? "default" : "outline"}
                  onClick={() => setFilter("expired")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4"
                >
                  <Clock className="w-4 h-4 mr-1.5" />
                  Expirados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de convidados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-black">Lista de Convidados</CardTitle>
            <CardDescription className="text-sm sm:text-base text-black">
              {filteredGuests.length} convidado(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-base sm:text-lg">Carregando convidados...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4 text-sm sm:text-base">{error}</div>
                <Button 
                  onClick={() => fetchGuests(selectedCondominium.id)}
                  className="min-h-[44px] px-6"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-sm sm:text-base text-gray-500">
                  {searchTerm || filter !== "all" 
                    ? "Nenhum convidado encontrado com os filtros aplicados" 
                    : "Nenhum convidado cadastrado"}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop/Tablet: Tabela */}
                <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Nome</TableHead>
                    <TableHead className="text-black">Contato</TableHead>
                    <TableHead className="text-black">Convidado por</TableHead>
                    <TableHead className="text-black">Unidade</TableHead>
                    <TableHead className="text-black">Validade</TableHead>
                    <TableHead className="text-black">Acessos</TableHead>
                    <TableHead className="text-black">Status</TableHead>
                    <TableHead className="text-black">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-black">{guest.name}</div>
                            {guest.document && (
                              <div className="text-sm text-gray-500">{formatDocument(guest.document)}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-black">
                        <div className="space-y-1">
                          {guest.phone && (
                            <div className="flex items-center text-sm text-black">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {formatPhone(guest.phone)}
                            </div>
                          )}
                          {guest.vehiclePlate && (
                            <div className="flex items-center text-sm text-black">
                              <Car className="h-3 w-3 mr-1 text-gray-400" />
                              {guest.vehiclePlate}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-black">
                        {guest.invitedByResident.user.name}
                      </TableCell>
                      <TableCell className="text-black">
                        <div className="flex items-center text-sm text-black">
                          <Building className="h-3 w-3 mr-1 text-gray-400" />
                          {guest.invitedByResident.unit.block}/{guest.invitedByResident.unit.number}
                        </div>
                      </TableCell>
                      <TableCell className="text-black">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-black">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {new Date(guest.validFrom).toLocaleDateString('pt-BR')}
                          </div>
                          {guest.validUntil && (
                            <div className="text-sm text-black">
                              até {new Date(guest.validUntil).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-black">
                        <div className="text-sm">
                          {guest.currentEntries}/{guest.maxEntries}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(guest)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleShowQRCode(guest)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                          >
                            <QrCode className="w-4 h-4 mr-1" />
                            QR Code
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(guest)}
                          >
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
              {filteredGuests.map((guest) => {
                const isActive = isGuestActive(guest)
                const borderColor = isActive 
                  ? 'border-l-green-500' 
                  : 'border-l-red-500'
                
                return (
                  <Card key={guest.id} className={`border-l-4 ${borderColor}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Cabeçalho com nome e status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-base text-black truncate">{guest.name}</div>
                            {guest.document && (
                              <div className="text-sm text-black">{formatDocument(guest.document)}</div>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(guest)}
                      </div>

                      {/* Informações em grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm text-black">
                        {guest.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{formatPhone(guest.phone)}</span>
                          </div>
                        )}
                        
                        {guest.vehiclePlate && (
                          <div className="flex items-center gap-1.5">
                            <Car className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{guest.vehiclePlate}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 col-span-2">
                          <UserPlus className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{guest.invitedByResident.user.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{guest.invitedByResident.unit.block}/{guest.invitedByResident.unit.number}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {guest.currentEntries}/{guest.maxEntries} acessos
                          </span>
                        </div>

                        <div className="col-span-2 text-xs text-gray-500">
                          <div>Válido de {new Date(guest.validFrom).toLocaleDateString('pt-BR')}</div>
                          {guest.validUntil && (
                            <div>até {new Date(guest.validUntil).toLocaleDateString('pt-BR')}</div>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => handleShowQRCode(guest)}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 min-h-[44px]"
                        >
                          <QrCode className="w-4 h-4 mr-1.5" />
                          QR Code
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleEdit(guest)}
                          className="flex-1 min-h-[44px]"
                        >
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
            )}

          {/* Pagination */}
          {filteredGuests.length > 0 && (
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
          </CardContent>
        </Card>
      </div>

      {/* Modal de Criação de Convidado */}
      {isCreateModalOpen && currentUser?.residents?.[0] && (
        <CreateGuestModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseModal}
          resident={currentUser.residents[0]}
        />
      )}

      {/* Modal de Edição de Convidado */}
      {isEditModalOpen && selectedGuest && selectedGuest.validUntil && (
        <EditGuestModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSuccess={handleCloseEditModal}
          guest={{
            id: selectedGuest.id,
            name: selectedGuest.name,
            document: selectedGuest.document || undefined,
            phone: selectedGuest.phone || undefined,
            validFrom: selectedGuest.validFrom,
            validUntil: selectedGuest.validUntil,
            accessCode: selectedGuest.accessCode,
            currentEntries: selectedGuest.currentEntries,
            maxEntries: selectedGuest.maxEntries,
            isActive: selectedGuest.isActive
          }}
        />
      )}

      {/* Modal de QR Code */}
      {isQRCodeModalOpen && selectedGuest && (
        <GuestQRCodeModal
          isOpen={isQRCodeModalOpen}
          onClose={handleCloseQRCodeModal}
          guest={{
            id: selectedGuest.id,
            name: selectedGuest.name,
            accessCode: selectedGuest.accessCode || '',
            validFrom: selectedGuest.validFrom,
            validUntil: selectedGuest.validUntil
          }}
        />
      )}
    </MainLayout>
  )
}
