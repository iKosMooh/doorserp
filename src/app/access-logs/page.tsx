"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, LogIn, LogOut, Shield, Users, Clock, Calendar } from "lucide-react"

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

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "RESIDENT" | "EMPLOYEE" | "GUEST">("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "APPROVED" | "DENIED" | "FORCED">("ALL")
  const [filterAccess, setFilterAccess] = useState<"ALL" | "ENTRY" | "EXIT">("ALL")
  const [dateFilter, setDateFilter] = useState<string>("")

  useEffect(() => {
    const fetchAccessLogs = async () => {
      try {
        const response = await fetch('/api/access-logs')
        if (response.ok) {
          const data = await response.json()
          setLogs(data)
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
  }, [])

  const filteredLogs = logs.filter(log => {
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

  // Estatísticas
  const totalAccess = logs.length
  const approvedAccess = logs.filter(l => l.status === "APPROVED").length
  const deniedAccess = logs.filter(l => l.status === "DENIED").length
  const todayAccess = logs.filter(l => l.timestamp.startsWith(new Date().toISOString().split('T')[0])).length

  const handleExport = () => {
    console.log("Exportar logs de acesso")
    // TODO: Implementar exportação para Excel/PDF
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Logs de Acesso</h1>
            <p className="text-muted-foreground">
              Monitore todos os acessos ao condomínio
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
            <CardTitle>Filtros e Pesquisa</CardTitle>
            <CardDescription>
              Filtre os logs por diferentes critérios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
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
                <Users className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "ALL" | "RESIDENT" | "EMPLOYEE" | "GUEST")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os tipos</option>
                  <option value="RESIDENT">Moradores</option>
                  <option value="EMPLOYEE">Funcionários</option>
                  <option value="GUEST">Visitantes</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <LogIn className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterAccess}
                  onChange={(e) => setFilterAccess(e.target.value as "ALL" | "ENTRY" | "EXIT")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Entrada/Saída</option>
                  <option value="ENTRY">Entrada</option>
                  <option value="EXIT">Saída</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "ALL" | "APPROVED" | "DENIED" | "FORCED")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os status</option>
                  <option value="APPROVED">Aprovado</option>
                  <option value="DENIED">Negado</option>
                  <option value="FORCED">Forçado</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-sm text-muted-foreground flex items-center">
                {filteredLogs.length} log(s) encontrado(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de logs */}
        <Card>
          <CardHeader>
            <CardTitle>Registros de Acesso</CardTitle>
            <CardDescription>
              Histórico completo de entradas e saídas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
