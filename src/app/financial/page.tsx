"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Download } from "lucide-react"

interface FinancialEntry {
  id: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
  category: string
  unitId?: string
  unitNumber?: string
  building?: string
  dueDate: string
  paymentDate?: string
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED"
  createdAt: string
}

export default function FinancialPage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED">("ALL")

  useEffect(() => {
    const fetchFinancialEntries = async () => {
      try {
        const response = await fetch('/api/financial')
        if (response.ok) {
          const data = await response.json()
          setEntries(data)
        } else {
          console.error('Erro ao buscar entradas financeiras:', response.statusText)
          setEntries([])
        }
      } catch (error) {
        console.error('Erro ao buscar entradas financeiras:', error)
        setEntries([])
      }
      setLoading(false)
    }

    fetchFinancialEntries()
  }, [])

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.unitNumber && entry.unitNumber.includes(searchTerm))
    
    const matchesType = filterType === "ALL" || entry.type === filterType
    const matchesStatus = filterStatus === "ALL" || entry.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return "Pendente"
      case "PAID": return "Pago"
      case "OVERDUE": return "Vencido"
      case "CANCELLED": return "Cancelado"
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800"
      case "PAID": return "bg-green-100 text-green-800"
      case "OVERDUE": return "bg-red-100 text-red-800"
      case "CANCELLED": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Cálculos financeiros
  const totalIncome = entries.filter(e => e.type === "INCOME" && e.status === "PAID").reduce((sum, e) => sum + e.amount, 0)
  const totalExpenses = entries.filter(e => e.type === "EXPENSE" && e.status === "PAID").reduce((sum, e) => sum + e.amount, 0)
  const pendingIncome = entries.filter(e => e.type === "INCOME" && e.status === "PENDING").reduce((sum, e) => sum + e.amount, 0)
  const overdueAmount = entries.filter(e => e.status === "OVERDUE").reduce((sum, e) => sum + e.amount, 0)

  const handleEdit = (id: string) => {
    console.log("Editar entrada:", id)
    // TODO: Implementar modal de edição
  }

  const handleDelete = (id: string) => {
    console.log("Excluir entrada:", id)
    // TODO: Implementar confirmação e exclusão
  }

  const handleAddNew = () => {
    console.log("Adicionar nova entrada financeira")
    // TODO: Implementar modal de adição
  }

  const handleExport = () => {
    console.log("Exportar relatório financeiro")
    // TODO: Implementar exportação para Excel/PDF
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando dados financeiros...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">
              Gerencie as finanças do condomínio
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={handleAddNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Resumo financeiro */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receitas Recebidas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Valores já recebidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Despesas Pagas
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Valores já pagos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Saldo Atual
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(totalIncome - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                A Receber
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                R$ {pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Receitas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Atraso
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Valores vencidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros e Pesquisa</CardTitle>
            <CardDescription>
              Filtre e pesquise as entradas financeiras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "ALL" | "INCOME" | "EXPENSE")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os tipos</option>
                  <option value="INCOME">Receitas</option>
                  <option value="EXPENSE">Despesas</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "ALL" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                  <option value="OVERDUE">Vencido</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div className="text-sm text-muted-foreground flex items-center">
                {filteredEntries.length} entrada(s) encontrada(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de entradas financeiras */}
        <Card>
          <CardHeader>
            <CardTitle>Entradas Financeiras</CardTitle>
            <CardDescription>
              Histórico de receitas e despesas do condomínio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        entry.type === 'INCOME' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </span>
                    </TableCell>
                    <TableCell>{entry.category}</TableCell>
                    <TableCell>
                      {entry.unitNumber ? `${entry.building}-${entry.unitNumber}` : '-'}
                    </TableCell>
                    <TableCell className={`font-semibold ${
                      entry.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {entry.type === 'INCOME' ? '+' : '-'}R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.dueDate).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {entry.paymentDate 
                        ? new Date(entry.paymentDate).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(entry.id)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
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
