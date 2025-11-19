"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { Search, Download, LogIn, LogOut, Shield, Users, Clock, Calendar, Activity } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface AccessLog {
  id: string
  timestamp: string
  personName: string
  personType: "RESIDENT" | "EMPLOYEE" | "GUEST"
  accessType: "ENTRY" | "EXIT"
  method: "FACIAL_RECOGNITION" | "KEY_CARD" | "MANUAL"
  location: string
  status: "APPROVED" | "DENIED" | "FORCED"
  unitNumber?: string
  building?: string
  notes?: string
  authorizedBy?: string
}

interface Resident {
  id: string
  user: {
    id: string
    name: string
  }
  unit: {
    id: string
    number: string
    building?: string
  }
  guests: {
    id: string
    name: string
  }[]
}

export default function AccessLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "RESIDENT" | "EMPLOYEE" | "GUEST">("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "APPROVED" | "DENIED" | "FORCED">("ALL")
  const [filterAccess, setFilterAccess] = useState<"ALL" | "ENTRY" | "EXIT">("ALL")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [resident, setResident] = useState<Resident | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Buscar dados do morador se não for admin
  useEffect(() => {
    const fetchResidentData = async () => {
      if (user && !user.isAdmin) {
        try {
          const response = await fetch(`/api/residents?userId=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.length > 0) {
              setResident(data[0])
            }
          }
        } catch (error) {
          console.log('Erro ao buscar dados do morador:', error)
        }
      }
    }
    
    if (user) {
      fetchResidentData()
    }
  }, [user])

  useEffect(() => {
    const fetchAccessLogs = async () => {
      try {
        const limitParam = itemsPerPage === 0 ? 'all' : itemsPerPage.toString()
        const dateParam = dateFilter ? `&date=${dateFilter}` : ''
        const response = await fetch(`/api/access-logs?page=${currentPage}&limit=${limitParam}${dateParam}`)
        if (response.ok) {
          const result = await response.json()
          setLogs(result.data || [])
          if (result.pagination) {
            setTotalItems(result.pagination.total)
            setTotalPages(result.pagination.totalPages)
          }
        } else {
          console.error('Erro ao buscar logs:', response.statusText)
          // Fallback para dados simulados em caso de erro
          setLogs([])
        }
      } catch (error) {
        console.error('Erro ao buscar logs:', error)
        // Fallback para dados simulados em caso de erro
        setLogs([])
      }
      setLoading(false)
    }

    fetchAccessLogs()
  }, [currentPage, itemsPerPage, dateFilter])

  // Filtrar logs por unidade do morador se não for admin
  const logsToFilter = user && !user.isAdmin && resident 
    ? logs.filter(log => {
        // Ignorar logs sem identificação válida
        if (!log.personName || 
            log.personName === 'Usuário Desconhecido' || 
            log.personName === 'QR Code Inválido' ||
            log.personName.includes('Desconhecido') ||
            log.personName.includes('não identificada')) {
          return false
        }

        // Deve ter unitNumber para ser considerado
        if (!log.unitNumber) {
          return false
        }
        
        // Verificar se o log é da mesma unidade do morador
        const isSameUnit = log.unitNumber === resident.unit.number &&
                          (!log.building || !resident.unit.building || log.building === resident.unit.building)
        
        // Verificar se o personName corresponde ao nome do morador ou de seus convidados
        const isResidentOrGuest = log.personName === resident.user.name ||
                                 resident.guests.some(guest => guest.name === log.personName)
        
        // Deve ser da mesma unidade E (ser o morador OU ser um convidado)
        return isSameUnit && isResidentOrGuest
      })
    : logs

  const filteredLogs = logsToFilter.filter(log => {
    const matchesSearch = log.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.unitNumber && log.unitNumber.includes(searchTerm)) ||
                         (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === "ALL" || log.personType === filterType
    const matchesStatus = filterStatus === "ALL" || log.status === filterStatus
    const matchesAccess = filterAccess === "ALL" || log.accessType === filterAccess
    
    const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter)
    
    return matchesSearch && matchesType && matchesStatus && matchesAccess && matchesDate
  })

  const getPersonTypeLabel = (type: string) => {
    switch (type) {
      case "RESIDENT": return "Morador"
      case "EMPLOYEE": return "Funcionário"
      case "GUEST": return "Visitante"
      default: return type
    }
  }

  const getAccessTypeLabel = (type: string) => {
    switch (type) {
      case "ENTRY": return "Entrada"
      case "EXIT": return "Saída"
      default: return type
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "FACIAL_RECOGNITION": return "Reconhecimento Facial"
      case "KEY_CARD": return "Cartão de Acesso"
      case "MANUAL": return "Manual"
      default: return method
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "APPROVED": return "Aprovado"
      case "DENIED": return "Negado"
      case "FORCED": return "Forçado"
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-green-100 text-green-800"
      case "DENIED": return "bg-red-100 text-red-800"
      case "FORCED": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPersonTypeColor = (type: string) => {
    switch (type) {
      case "RESIDENT": return "bg-blue-100 text-blue-800"
      case "EMPLOYEE": return "bg-green-100 text-green-800"
      case "GUEST": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Estatísticas - usar logsToFilter em vez de logs para refletir o filtro por unidade
  const totalAccess = logsToFilter.length
  const approvedAccess = logsToFilter.filter(l => l.status === "APPROVED").length
  const deniedAccess = logsToFilter.filter(l => l.status === "DENIED").length
  const todayAccess = logsToFilter.filter(l => l.timestamp.startsWith(new Date().toISOString().split('T')[0])).length

  const handleExport = () => {
    try {
      // Criar CSV com os logs filtrados
      const headers = ['Data/Hora', 'Pessoa', 'Tipo', 'Acesso', 'Método', 'Local', 'Unidade', 'Status', 'Observações']
      const csvRows = [
        headers.join(','),
        ...filteredLogs.map(log => [
          new Date(log.timestamp).toLocaleString('pt-BR'),
          `\"${log.personName}\"`,
          getPersonTypeLabel(log.personType),
          getAccessTypeLabel(log.accessType),
          getMethodLabel(log.method),
          `\"${log.location}\"`,
          log.unitNumber ? `${log.building}-${log.unitNumber}` : '-',
          getStatusLabel(log.status),
          `\"${log.notes || '-'}\"`,
        ].join(','))
      ]
      
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `logs_acesso_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      alert(`✅ ${filteredLogs.length} log(s) exportado(s) com sucesso!`)
    } catch (error) {
      console.error('Erro ao exportar logs:', error)
      alert('❌ Erro ao exportar logs')
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando logs de acesso...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 text-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {user?.isAdmin ? 'Logs de Acesso' : 'Histórico de Acesso'}
            </h1>
            <p className="text-muted-foreground">
              {user?.isAdmin 
                ? 'Monitore todos os acessos ao condomínio' 
                : resident 
                  ? `Acessos da unidade ${resident.unit.number}${resident.unit.building ? ` - Prédio ${resident.unit.building}` : ''}`
                  : 'Monitore os acessos da sua unidade'
              }
            </p>
          </div>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Logs
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Acessos
              </CardTitle>
              <LogIn className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAccess}</div>
              <p className="text-xs text-muted-foreground">
                Todos os registros
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Acessos Hoje
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAccess}</div>
              <p className="text-xs text-muted-foreground">
                Registros de hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Acessos Aprovados
              </CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedAccess}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((approvedAccess / totalAccess) * 100)}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Acessos Negados
              </CardTitle>
              <Shield className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{deniedAccess}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((deniedAccess / totalAccess) * 100)}% do total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Filtros e Pesquisa</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Filtre os logs por diferentes critérios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {/* Busca - sempre full width */}
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, local..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>

              {/* Filtros em grid responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as "ALL" | "RESIDENT" | "EMPLOYEE" | "GUEST")}
                    className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="ALL">Todos os tipos</option>
                    <option value="RESIDENT">Moradores</option>
                    <option value="EMPLOYEE">Funcionários</option>
                    <option value="GUEST">Visitantes</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={filterAccess}
                    onChange={(e) => setFilterAccess(e.target.value as "ALL" | "ENTRY" | "EXIT")}
                    className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="ALL">Entrada/Saída</option>
                    <option value="ENTRY">Entrada</option>
                    <option value="EXIT">Saída</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as "ALL" | "APPROVED" | "DENIED" | "FORCED")}
                    className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <option value="ALL">Todos os status</option>
                    <option value="APPROVED">Aprovado</option>
                    <option value="DENIED">Negado</option>
                    <option value="FORCED">Forçado</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="flex-1 px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Contador de resultados */}
              <div className="flex items-center space-x-2 text-sm sm:text-base text-muted-foreground pt-2 border-t">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="font-medium">{filteredLogs.length}</span>
                <span>log(s) encontrado(s)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Registros de Acesso</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Histórico completo de entradas e saídas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop/Tablet: Tabela com scroll horizontal */}
            <div className="hidden md:block overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Data/Hora</TableHead>
                    <TableHead className="min-w-[150px]">Pessoa</TableHead>
                    <TableHead className="min-w-[100px]">Tipo</TableHead>
                    <TableHead className="min-w-[100px]">Acesso</TableHead>
                    <TableHead className="min-w-[120px]">Método</TableHead>
                    <TableHead className="min-w-[150px]">Local</TableHead>
                    <TableHead className="min-w-[100px]">Unidade</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[200px]">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{new Date(log.timestamp).toLocaleDateString('pt-BR')}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.personName}</div>
                          {log.authorizedBy && (
                            <div className="text-sm text-muted-foreground">
                              Autorizado por: {log.authorizedBy}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPersonTypeColor(log.personType)}`}>
                            {getPersonTypeLabel(log.personType)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {log.accessType === "ENTRY" ? (
                              <LogIn className="h-3 w-3 text-green-600" />
                            ) : (
                              <LogOut className="h-3 w-3 text-blue-600" />
                            )}
                            {getAccessTypeLabel(log.accessType)}
                          </div>
                        </TableCell>
                        <TableCell>{getMethodLabel(log.method)}</TableCell>
                        <TableCell>{log.location}</TableCell>
                        <TableCell>
                          {log.unitNumber ? `${log.building}-${log.unitNumber}` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(log.status)}`}>
                            {getStatusLabel(log.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={log.notes}>
                            {log.notes || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum log encontrado</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <Card key={log.id} className="p-4 border-l-4" style={{
                    borderLeftColor: log.status === 'APPROVED' ? '#10b981' : log.status === 'DENIED' ? '#ef4444' : '#f59e0b'
                  }}>
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{log.personName}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(log.timestamp).toLocaleDateString('pt-BR')} às {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(log.status)}`}>
                          {getStatusLabel(log.status)}
                        </span>
                      </div>

                      {/* Detalhes */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 block">Tipo:</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getPersonTypeColor(log.personType)}`}>
                            {getPersonTypeLabel(log.personType)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Acesso:</span>
                          <div className="flex items-center gap-1 font-medium">
                            {log.accessType === "ENTRY" ? (
                              <LogIn className="h-3 w-3 text-green-600" />
                            ) : (
                              <LogOut className="h-3 w-3 text-blue-600" />
                            )}
                            {getAccessTypeLabel(log.accessType)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Método:</span>
                          <span className="font-medium">{getMethodLabel(log.method)}</span>
                        </div>
                        {log.unitNumber && (
                          <div>
                            <span className="text-gray-500 block">Unidade:</span>
                            <span className="font-medium">{log.building}-{log.unitNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Local */}
                      <div className="text-sm">
                        <span className="text-gray-500">Local: </span>
                        <span className="font-medium">{log.location}</span>
                      </div>

                      {/* Observações */}
                      {log.notes && (
                        <div className="text-sm pt-2 border-t border-gray-100">
                          <span className="text-gray-500 block mb-1">Observações:</span>
                          <p className="text-gray-700 break-words">{log.notes}</p>
                        </div>
                      )}

                      {/* Autorizado por */}
                      {log.authorizedBy && (
                        <div className="text-xs text-gray-500 pt-1">
                          Autorizado por: {log.authorizedBy}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination */}
            {filteredLogs.length > 0 && (
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
    </MainLayout>
  )
}
