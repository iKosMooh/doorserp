"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Phone, Mail, UserCheck, Clock, Shield } from "lucide-react"

interface Employee {
  id: string
  name: string
  email: string
  phone: string
  documentNumber: string
  position: string
  department: string
  shift: "MORNING" | "AFTERNOON" | "NIGHT" | "FULL_TIME"
  salary: number
  status: "ACTIVE" | "INACTIVE" | "VACATION" | "SICK_LEAVE"
  hireDate: string
  createdAt: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees')
        if (response.ok) {
          const data = await response.json()
          setEmployees(data)
        } else {
          console.error('Erro ao buscar funcionários:', response.statusText)
          setEmployees([])
        }
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error)
        setEmployees([])
      }
      setLoading(false)
    }

    fetchEmployees()
  }, [])

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.documentNumber.includes(searchTerm)
  )

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case "MORNING": return "Manhã"
      case "AFTERNOON": return "Tarde"
      case "NIGHT": return "Noite"
      case "FULL_TIME": return "Integral"
      default: return shift
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE": return "Ativo"
      case "INACTIVE": return "Inativo"
      case "VACATION": return "Férias"
      case "SICK_LEAVE": return "Licença Médica"
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "INACTIVE": return "bg-red-100 text-red-800"
      case "VACATION": return "bg-blue-100 text-blue-800"
      case "SICK_LEAVE": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const handleEdit = (id: string) => {
    console.log("Editar funcionário:", id)
    // TODO: Implementar modal de edição
  }

  const handleDelete = (id: string) => {
    console.log("Excluir funcionário:", id)
    // TODO: Implementar confirmação e exclusão
  }

  const handleAddNew = () => {
    console.log("Adicionar novo funcionário")
    // TODO: Implementar modal de adição
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando funcionários...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-muted-foreground">
              Gerencie os funcionários do condomínio
            </p>
          </div>
          <Button onClick={handleAddNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Funcionários
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-muted-foreground">
                Todos os funcionários
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Funcionários Ativos
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employees.filter(e => e.status === "ACTIVE").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Status ativo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Departamentos
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(employees.map(e => e.department)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Diferentes departamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Folha de Pagamento
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {employees
                  .filter(e => e.status === "ACTIVE")
                  .reduce((total, e) => total + e.salary, 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Salários mensais
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Busca e filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Pesquisar Funcionários</CardTitle>
            <CardDescription>
              Busque por nome, email, cargo, departamento ou documento
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

        {/* Lista de funcionários */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Funcionários</CardTitle>
            <CardDescription>
              {filteredEmployees.length} funcionário(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{employee.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{employee.position}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.documentNumber}
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {getShiftLabel(employee.shift)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {employee.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      R$ {employee.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(employee.status)}`}>
                        {getStatusLabel(employee.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(employee.hireDate).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(employee.id)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(employee.id)}
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
