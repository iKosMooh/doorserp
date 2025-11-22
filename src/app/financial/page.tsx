"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RecurringRevenueModal } from "@/components/RecurringRevenueModal"
import { useCondominium } from "@/contexts/CondominiumContext"
import { useAuth } from "@/contexts/AuthContext"
import { Plus, Search, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Download, BarChart3, Activity, X, Check, RefreshCw } from "lucide-react"
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'

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
  const { selectedCondominium } = useCondominium()
  const { user } = useAuth()
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED">("ALL")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null)
  const [showCharts, setShowCharts] = useState(false)
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    category: '',
    unitNumber: '',
    building: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'PENDING' as 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  })

  useEffect(() => {
    let isMounted = true

    const fetchFinancialEntries = async () => {
      try {
        const response = await fetch('/api/financial')
        if (response.ok) {
          const data = await response.json()
          if (isMounted) {
            setEntries(data)
          }
        } else {
          console.error('Erro ao buscar entradas financeiras:', response.statusText)
          if (isMounted) {
            setEntries([])
          }
        }
      } catch (error) {
        console.error('Erro ao buscar entradas financeiras:', error)
        if (isMounted) {
          setEntries([])
        }
      }
      if (isMounted) {
        setLoading(false)
      }
    }

    fetchFinancialEntries()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleEdit = (entry: FinancialEntry) => {
    setSelectedEntry(entry)
    setFormData({
      description: entry.description,
      amount: entry.amount.toString(),
      type: entry.type,
      category: entry.category,
      unitNumber: entry.unitNumber || '',
      building: entry.building || '',
      dueDate: entry.dueDate.split('T')[0],
      status: entry.status
    })
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada financeira?')) return
    
    try {
      const response = await fetch(`/api/financial/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setEntries(entries.filter(e => e.id !== id))
        alert('✅ Entrada excluída com sucesso!')
      } else {
        alert('❌ Erro ao excluir entrada')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('❌ Erro ao excluir entrada')
    }
  }

  const handleAddNew = () => {
    setFormData({
      description: '',
      amount: '',
      type: 'INCOME',
      category: '',
      unitNumber: '',
      building: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'PENDING'
    })
    setSelectedEntry(null)
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      category: formData.category,
      unitNumber: formData.unitNumber || null,
      building: formData.building || null,
      dueDate: formData.dueDate,
      status: formData.status
    }
    
    try {
      const url = selectedEntry 
        ? `/api/financial/${selectedEntry.id}` 
        : '/api/financial'
      const method = selectedEntry ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        // Recarregar todos os dados para garantir consistência
        const refreshResponse = await fetch('/api/financial')
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json()
          setEntries(refreshedData)
        }
        
        setShowAddModal(false)
        setShowEditModal(false)
        alert(`✅ Entrada ${selectedEntry ? 'atualizada' : 'criada'} com sucesso!`)
      } else {
        const errorData = await response.json()
        alert(`❌ Erro ao salvar entrada: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('❌ Erro ao salvar entrada')
    }
  }

  const handleExport = () => {
    const exportData = filteredEntries.map(entry => ({
      'Descrição': entry.description,
      'Tipo': entry.type === 'INCOME' ? 'Receita' : 'Despesa',
      'Categoria': entry.category,
      'Unidade': entry.unitNumber ? `${entry.building}-${entry.unitNumber}` : '-',
      'Valor': entry.amount,
      'Vencimento': new Date(entry.dueDate).toLocaleDateString('pt-BR'),
      'Pagamento': entry.paymentDate ? new Date(entry.paymentDate).toLocaleDateString('pt-BR') : '-',
      'Status': getStatusLabel(entry.status)
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Financeiro')
    
    // Add summary sheet
    const summary = [{
      'Descrição': 'Receitas Recebidas',
      'Valor': totalIncome
    }, {
      'Descrição': 'Despesas Pagas',
      'Valor': totalExpenses
    }, {
      'Descrição': 'Saldo Atual',
      'Valor': totalIncome - totalExpenses
    }, {
      'Descrição': 'A Receber',
      'Valor': pendingIncome
    }, {
      'Descrição': 'Em Atraso',
      'Valor': overdueAmount
    }]
    
    const wsSummary = XLSX.utils.json_to_sheet(summary)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo')
    
    XLSX.writeFile(wb, `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Prepare data for charts
  const categoryData = Object.entries(
    filteredEntries.reduce((acc, entry) => {
      const category = entry.category || 'Sem categoria'
      if (!acc[category]) acc[category] = 0
      acc[category] += entry.type === 'INCOME' ? entry.amount : -entry.amount
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: Math.abs(value) }))

  const monthlyData = Object.entries(
    filteredEntries.reduce((acc, entry) => {
      const month = new Date(entry.dueDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      if (!acc[month]) acc[month] = { month, income: 0, expense: 0 }
      if (entry.type === 'INCOME') {
        acc[month].income += entry.amount
      } else {
        acc[month].expense += entry.amount
      }
      return acc
    }, {} as Record<string, { month: string, income: number, expense: number }>)
  ).map(([, data]) => data).slice(0, 6).reverse()

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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
      <div className="space-y-4 sm:space-y-6 text-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie as finanças do condomínio
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setShowCharts(!showCharts)} 
              variant="outline" 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-6"
            >
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Gráficos</span>
            </Button>
            <Button 
              onClick={handleExport} 
              variant="outline" 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-6"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button 
              onClick={() => setShowRecurringModal(true)} 
              variant="outline" 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-6 border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Mensalidades</span>
            </Button>
            <Button onClick={handleAddNew} className="flex-1 sm:flex-none min-h-[44px] px-4 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Gráficos */}
        {showCharts && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Receitas vs Despesas (Mensal)</CardTitle>
                <CardDescription className="text-sm">Últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Bar dataKey="income" name="Receitas" fill="#10b981" />
                    <Bar dataKey="expense" name="Despesas" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Distribuição por Categoria</CardTitle>
                <CardDescription className="text-sm">Total por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resumo financeiro */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Receitas
              </CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Recebidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Despesas
              </CardTitle>
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Pagas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Saldo
              </CardTitle>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(totalIncome - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Atual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                A Receber
              </CardTitle>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                R$ {pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Atraso
              </CardTitle>
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                R$ {overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Vencidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Filtros e Pesquisa</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Filtre e pesquise as entradas financeiras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Pesquisar descrição, categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as "ALL" | "INCOME" | "EXPENSE")}
                    className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="ALL">Todos os tipos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as "ALL" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED")}
                    className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="ALL">Todos os status</option>
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="OVERDUE">Vencido</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 text-sm sm:text-base text-muted-foreground pt-2 sm:pt-0 border-t sm:border-t-0">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="font-medium">{filteredEntries.length}</span>
                  <span>entrada(s)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de entradas financeiras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Entradas Financeiras</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {filteredEntries.length} entrada(s) - Histórico de receitas e despesas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-sm sm:text-base text-gray-500">
                  Nenhuma entrada financeira encontrada
                </div>
              </div>
            ) : (
              <>
                {/* Desktop/Tablet: Tabela */}
                <div className="hidden md:block overflow-x-auto -mx-6 px-6">
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
                    <TableCell>{entry.category || 'Sem categoria'}</TableCell>
                    <TableCell>
                      {entry.unitNumber ? `${entry.building || ''}-${entry.unitNumber}` : '-'}
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
                          onClick={() => handleEdit(entry)}
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
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-4">
            {filteredEntries.map((entry) => {
              const borderColor = entry.type === 'INCOME' ? 'border-l-green-500' : 'border-l-red-500'
              
              return (
                <Card key={entry.id} className={`border-l-4 ${borderColor}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Cabeçalho */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-base">{entry.description || 'Sem descrição'}</div>
                        <div className="text-sm text-gray-500 mt-1">{entry.category || 'Sem categoria'}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                    </div>

                    {/* Valor e tipo */}
                    <div className="flex items-center justify-between">
                      <div className={`text-2xl font-bold ${entry.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'INCOME' ? '+' : '-'}R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        entry.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>

                    {/* Detalhes */}
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 pt-2 border-t">
                      <div>
                        <div className="text-xs text-gray-500">Vencimento</div>
                        <div className="font-medium">{new Date(entry.dueDate).toLocaleDateString('pt-BR')}</div>
                      </div>
                      {entry.paymentDate && (
                        <div>
                          <div className="text-xs text-gray-500">Pagamento</div>
                          <div className="font-medium">{new Date(entry.paymentDate).toLocaleDateString('pt-BR')}</div>
                        </div>
                      )}
                      {entry.unitNumber && (
                        <div className="col-span-2">
                          <div className="text-xs text-gray-500">Unidade</div>
                          <div className="font-medium">{entry.building || ''}-{entry.unitNumber}</div>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(entry)}
                        className="flex-1 min-h-[44px]"
                      >
                        <Edit className="h-4 w-4 mr-1.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(entry.id)}
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
        </>
            )}
          </CardContent>
        </Card>

        {/* Modal Add/Edit */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold">
                  {selectedEntry ? 'Editar Entrada' : 'Nova Entrada Financeira'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setShowEditModal(false)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2">Descrição *</label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                      placeholder="Ex: Taxas condominiais - Janeiro"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as 'INCOME' | 'EXPENSE'})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                    >
                      <option value="INCOME">Receita</option>
                      <option value="EXPENSE">Despesa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Categoria *</label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                      placeholder="Ex: Condomínio, Manutenção, Limpeza"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Data de Vencimento *</label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Bloco</label>
                    <input
                      type="text"
                      value={formData.building}
                      onChange={(e) => setFormData({...formData, building: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                      placeholder="Ex: A, B, C"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Número da Unidade</label>
                    <input
                      type="text"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData({...formData, unitNumber: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                      placeholder="Ex: 101, 202"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Status *</label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[44px] text-base"
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="PAID">Pago</option>
                      <option value="OVERDUE">Vencido</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false)
                      setShowEditModal(false)
                    }}
                    className="w-full sm:w-auto min-h-[44px] px-6"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 min-h-[44px] px-6"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {selectedEntry ? 'Atualizar' : 'Criar'} Entrada
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Receitas Recorrentes */}
        {showRecurringModal && selectedCondominium && user && (
          <RecurringRevenueModal
            isOpen={showRecurringModal}
            onClose={() => setShowRecurringModal(false)}
            condominiumId={selectedCondominium.id}
            userId={user.id}
            onSuccess={() => {
              // Recarregar dados
              const fetchFinancialEntries = async () => {
                try {
                  const response = await fetch('/api/financial')
                  if (response.ok) {
                    const data = await response.json()
                    setEntries(data)
                  }
                } catch (error) {
                  console.error('Erro ao recarregar entradas:', error)
                }
              }
              fetchFinancialEntries()
            }}
          />
        )}
      </div>
    </MainLayout>
  )
}
