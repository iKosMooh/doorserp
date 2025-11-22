"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { formatCPF, formatPhone } from "@/lib/utils"
import { Plus, Search, Edit, Trash2, Phone, Mail, UserCheck, Clock, Users, Briefcase, DollarSign } from "lucide-react"
import { CreateEmployeeModal } from "@/components/CreateEmployeeModal"
import { EditEmployeeModal } from "@/components/EditEmployeeModal"
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal"
import { useToast } from "@/components/ui/toast"

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
  const { showToast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const limitParam = itemsPerPage === 0 ? 'all' : itemsPerPage.toString()
        const response = await fetch(`/api/employees?page=${currentPage}&limit=${limitParam}`)
        if (response.ok) {
          const result = await response.json()
          setEmployees(result.data || [])
          if (result.pagination) {
            setTotalItems(result.pagination.total)
            setTotalPages(result.pagination.totalPages)
          }
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
  }, [currentPage, itemsPerPage])

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

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEditModal(true)
  }

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedEmployee) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir funcionário')
      }

      showToast('Funcionário excluído com sucesso!', 'success')
      setShowDeleteModal(false)
      setSelectedEmployee(null)
      handleCreateSuccess() // Recarregar lista
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir funcionário', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleAddNew = () => {
    setShowCreateModal(true)
  }

  const handleCreateSuccess = () => {
    const fetchEmployees = async () => {
      try {
        const limitParam = itemsPerPage === 0 ? 'all' : itemsPerPage.toString()
        const response = await fetch(`/api/employees?page=${currentPage}&limit=${limitParam}`)
        if (response.ok) {
          const result = await response.json()
          setEmployees(result.data || [])
          if (result.pagination) {
            setTotalItems(result.pagination.total)
            setTotalPages(result.pagination.totalPages)
          }
        }
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error)
      }
    }
    fetchEmployees()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 text-black">
          <div className="text-lg">Carregando funcionários...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 text-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie os funcionários do condomínio
            </p>
          </div>
          <Button onClick={handleAddNew} className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-6">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Novo Funcionário
          </Button>
        </div>

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
              <div className="text-xl sm:text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-muted-foreground">
                Funcionários
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Ativos
              </CardTitle>
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {employees.filter(e => e.status === "ACTIVE").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Trabalhando
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Departamentos
              </CardTitle>
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {new Set(employees.map(e => e.department)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Setores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Folha
              </CardTitle>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                R$ {employees
                  .filter(e => e.status === "ACTIVE")
                  .reduce((total, e) => total + e.salary, 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Mensal
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Busca e filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Pesquisar Funcionários</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Busque por nome, email, cargo, departamento ou documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Digite para pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de funcionários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Lista de Funcionários</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {filteredEmployees.length} funcionário(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-sm sm:text-base text-gray-500">
                  {searchTerm 
                    ? "Nenhum funcionário encontrado" 
                    : "Nenhum funcionário cadastrado"}
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
                        {formatCPF(employee.documentNumber)}
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
                        {formatPhone(employee.phone)}
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
                          onClick={() => handleEdit(employee)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(employee)}
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
            {filteredEmployees.map((employee) => {
              const statusColor = employee.status === 'ACTIVE' 
                ? 'border-l-green-500' 
                : employee.status === 'VACATION'
                ? 'border-l-blue-500'
                : employee.status === 'SICK_LEAVE'
                ? 'border-l-yellow-500'
                : 'border-l-red-500'
              
              return (
                <Card key={employee.id} className={`border-l-4 ${statusColor}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Cabeçalho com nome e status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-base">{employee.name}</div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(employee.status)}`}>
                        {getStatusLabel(employee.status)}
                      </span>
                    </div>

                    {/* Informações em grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2">
                        <div className="font-medium text-gray-900">{employee.position}</div>
                        <div className="text-xs text-gray-500">{employee.department}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{getShiftLabel(employee.shift)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{formatPhone(employee.phone)}</span>
                      </div>

                      <div className="col-span-2 text-xs text-gray-500">
                        CPF: {formatCPF(employee.documentNumber)}
                      </div>

                      <div className="col-span-2 text-sm font-medium text-green-600">
                        R$ {employee.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>

                      <div className="col-span-2 text-xs text-gray-500">
                        Admissão: {new Date(employee.hireDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(employee)}
                        className="flex-1 min-h-[44px]"
                      >
                        <Edit className="h-4 w-4 mr-1.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(employee)}
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
          {filteredEmployees.length > 0 && (
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
      </div>

      <CreateEmployeeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedEmployee && (
        <EditEmployeeModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedEmployee(null)
          }}
          onSuccess={handleCreateSuccess}
          employee={selectedEmployee}
        />
      )}

      {selectedEmployee && (
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedEmployee(null)
          }}
          onConfirm={confirmDelete}
          title="Excluir Funcionário"
          message="Tem certeza que deseja excluir este funcionário?"
          itemName={selectedEmployee.name}
          loading={deleteLoading}
        />
      )}
    </MainLayout>
  )
}
