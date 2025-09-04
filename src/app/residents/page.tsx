"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateResidentModal } from "@/components/CreateResidentModal"
import { EditResidentModal } from "@/components/EditResidentModal"
import { useCondominium } from "@/contexts/CondominiumContext"
import { Plus, Search, Edit, Trash2, Phone, Mail, Home, Building, User, Users } from "lucide-react"

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

  const fetchResidents = async (condominiumId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/residents?condominiumId=${condominiumId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar moradores')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setResidents(result.data)
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
      fetchResidents(selectedCondominium.id)
    }
  }, [selectedCondominium])

  const filteredResidents = residents.filter(resident =>
    resident.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${resident.unit.block}/${resident.unit.number}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.user.document?.includes(searchTerm)
  )

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
      <div className="space-y-6 text-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Moradores</h1>
            <p className="text-muted-foreground">
              Gerencie os moradores de {selectedCondominium.name}
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Moradores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{residents.length}</div>
              <p className="text-xs text-muted-foreground">
                Todos os moradores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Moradores Ativos
              </CardTitle>
              <User className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {residents.filter(r => r.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Status ativo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Com Reconhecimento Facial
              </CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {residents.filter(r => r.user.faceRecognitionEnabled).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Face cadastrada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unidades Ocupadas
              </CardTitle>
              <Building className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(residents.map(r => `${r.unit.block}/${r.unit.number}`)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Diferentes unidades
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Busca e filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Pesquisar Moradores</CardTitle>
            <CardDescription>
              Busque por nome, email, documento ou unidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Digite para pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de moradores */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Moradores</CardTitle>
            <CardDescription>
              {filteredResidents.length} morador(es) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredResidents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm 
                  ? "Nenhum morador encontrado com os filtros aplicados" 
                  : "Nenhum morador cadastrado"}
              </div>
            ) : (
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
                            {resident.user.phone}
                          </div>
                        )}
                        {resident.emergencyContact && (
                          <div className="text-sm text-muted-foreground">
                            Emergência: {resident.emergencyContact}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{resident.user.document || 'Não informado'}</TableCell>
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
            )}
          </CardContent>
        </Card>

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
