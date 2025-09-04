"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useCondominium } from "@/contexts/CondominiumContext"
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
  Plus
} from "lucide-react"

interface Guest {
  id: string
  name: string
  document: string | null
  phone: string | null
  visitPurpose: string | null
  vehiclePlate: string | null
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

  const fetchGuests = async (condominiumId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/guests?condominiumId=${condominiumId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar convidados')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setGuests(result.data)
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao buscar convidados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCondominium?.id) {
      fetchGuests(selectedCondominium.id)
    }
  }, [selectedCondominium])

  const isGuestActive = (guest: Guest) => {
    if (!guest.isActive) return false
    if (!guest.validUntil) return true
    return new Date(guest.validUntil) > new Date()
  }

  const filteredGuests = guests.filter(guest => {
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
  })

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
            <p className="text-gray-500 mt-2">Selecione um condomínio no menu lateral para gerenciar convidados.</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Convidados</h1>
            <p className="text-muted-foreground">
              Gerencie visitantes e convidados de {selectedCondominium.name}
            </p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Convidado
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Convidados</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{guests.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {guests.filter(isGuestActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expirados</CardTitle>
              <Clock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {guests.filter(guest => !isGuestActive(guest)).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Veículo</CardTitle>
              <Car className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {guests.filter(guest => guest.vehiclePlate).length}
              </div>
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
                    placeholder="Buscar por nome, documento, telefone ou convidante..."
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
                  Todos
                </Button>
                <Button
                  variant={filter === "active" ? "default" : "outline"}
                  onClick={() => setFilter("active")}
                  size="sm"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Ativos
                </Button>
                <Button
                  variant={filter === "expired" ? "default" : "outline"}
                  onClick={() => setFilter("expired")}
                  size="sm"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Expirados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de convidados */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Convidados</CardTitle>
            <CardDescription>
              {filteredGuests.length} convidado(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-lg">Carregando convidados...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={() => fetchGuests(selectedCondominium.id)}>
                  Tentar novamente
                </Button>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || filter !== "all" 
                  ? "Nenhum convidado encontrado com os filtros aplicados" 
                  : "Nenhum convidado cadastrado"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Convidado por</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Acessos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{guest.name}</div>
                            {guest.document && (
                              <div className="text-sm text-gray-500">{guest.document}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {guest.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {guest.phone}
                            </div>
                          )}
                          {guest.vehiclePlate && (
                            <div className="flex items-center text-sm">
                              <Car className="h-3 w-3 mr-1 text-gray-400" />
                              {guest.vehiclePlate}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {guest.invitedByResident.user.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Building className="h-3 w-3 mr-1 text-gray-400" />
                          {guest.invitedByResident.unit.block}/{guest.invitedByResident.unit.number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {new Date(guest.validFrom).toLocaleDateString('pt-BR')}
                          </div>
                          {guest.validUntil && (
                            <div className="text-sm text-gray-500">
                              até {new Date(guest.validUntil).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {guest.currentEntries}/{guest.maxEntries}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(guest)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          <Button variant="outline" size="sm">
                            Histórico
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
      </div>
    </MainLayout>
  )
}
