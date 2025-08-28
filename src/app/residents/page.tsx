"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Phone, Mail, Home } from "lucide-react"

interface Resident {
  id: string
  name: string
  email: string
  phone: string
  documentNumber: string
  unitNumber: string
  building: string
  status: "ACTIVE" | "INACTIVE"
  createdAt: string
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const response = await fetch('/api/residents')
        if (response.ok) {
          const data = await response.json()
          setResidents(data)
        } else {
          console.error('Erro ao buscar moradores:', response.statusText)
          setResidents([])
        }
      } catch (error) {
        console.error('Erro ao buscar moradores:', error)
        setResidents([])
      }
      setLoading(false)
    }

    fetchResidents()
  }, [])

  const filteredResidents = residents.filter(resident =>
    resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.unitNumber.includes(searchTerm) ||
    resident.documentNumber.includes(searchTerm)
  )

  const handleEdit = (id: string) => {
    console.log("Editar morador:", id)
    // TODO: Implementar modal de edição
  }

  const handleDelete = (id: string) => {
    console.log("Excluir morador:", id)
    // TODO: Implementar confirmação e exclusão
  }

  const handleAddNew = () => {
    console.log("Adicionar novo morador")
    // TODO: Implementar modal de adição
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando moradores...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Moradores</h1>
            <p className="text-muted-foreground">
              Gerencie os moradores do condomínio
            </p>
          </div>
          <Button onClick={handleAddNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Morador
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Moradores
              </CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
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
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {residents.filter(r => r.status === "ACTIVE").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Status ativo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Moradores Inativos
              </CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {residents.filter(r => r.status === "INACTIVE").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Status inativo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prédios Ocupados
              </CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(residents.map(r => r.building)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Diferentes prédios
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResidents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{resident.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {resident.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        {resident.building}-{resident.unitNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {resident.phone}
                      </div>
                    </TableCell>
                    <TableCell>{resident.documentNumber}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        resident.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {resident.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(resident.createdAt).toLocaleDateString('pt-BR')}
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
