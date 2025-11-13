"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, LogIn, Building, UserCheck, UserPlus, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { useCondominium } from "@/contexts/CondominiumContext"
import { useRequireAuth } from "@/hooks/useRequireAuth"

interface DashboardStats {
  totalResidents: number
  totalEmployees: number
  totalUnits: number
  totalGuests: number
  todayAccess: number
  weeklyAccess: number
  monthlyIncome: number
  monthlyExpenses: number
  netBalance: number
}

interface RecentAccess {
  id: string
  timestamp: string
  personName: string
  accessType: string
  status: string
}

interface DashboardData {
  condominium: {
    id: string
    name: string
    address: string
    city: string
    state: string
  }
  stats: DashboardStats
  recentAccess: RecentAccess[]
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useRequireAuth()
  const { selectedCondominium, loading: condominiumLoading } = useCondominium()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async (condominiumId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/dashboard?condominiumId=${condominiumId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do dashboard')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user && selectedCondominium?.id) {
      fetchDashboardData(selectedCondominium.id)
    }
  }, [authLoading, user, selectedCondominium])

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-black">Verificando autenticação...</div>
      </div>
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
            <p className="text-gray-500 mt-2">Selecione um condomínio no menu lateral para ver o dashboard.</p>
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
            <h1 className="text-3xl font-bold tracking-tight text-black">Dashboard</h1>
            <p className="text-muted-foreground">
              Carregando dados de {selectedCondominium.name}...
            </p>
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="text-lg text-black">Carregando dashboard...</div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Dashboard</h1>
            <p className="text-muted-foreground text-black">
              {selectedCondominium.name}
            </p>
          </div>
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button 
              onClick={() => fetchDashboardData(selectedCondominium.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-black">Nenhum dado encontrado</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 text-black">
            {data.condominium.name} - {data.condominium.city}, {data.condominium.state}
          </p>
        </div>

        {/* Cards de estatísticas principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-black">
              <CardTitle className="text-xs sm:text-sm font-medium text-black">
                Moradores
              </CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-black">{data.stats.totalResidents}</div>
              <p className="text-xs text-muted-foreground text-black">
                Ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Funcionários
              </CardTitle>
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground text-black" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-black">{data.stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground text-black">
                Ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Unidades
              </CardTitle>
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground text-black" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-black">{data.stats.totalUnits}</div>
              <p className="text-xs text-muted-foreground text-black">
                Total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Convidados
              </CardTitle>
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground text-black" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-black">{data.stats.totalGuests}</div>
              <p className="text-xs text-muted-foreground text-black">
                Válidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas de acesso */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Acessos Hoje
              </CardTitle>
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{data.stats.todayAccess}</div>
              <p className="text-xs text-muted-foreground text-black">
                Últimas 24 horas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Acessos da Semana
              </CardTitle>
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">{data.stats.weeklyAccess}</div>
              <p className="text-xs text-muted-foreground text-black">
                Últimos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Saldo Mensal
              </CardTitle>
              {data.stats.netBalance >= 0 ? (
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-xl sm:text-2xl font-bold ${
                data.stats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {data.stats.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground text-black">
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resumo financeiro */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Receitas do Mês</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                R$ {data.stats.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Despesas do Mês</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                R$ {data.stats.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acessos recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
              Acessos Recentes
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Últimos acessos registrados (24h)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentAccess.length > 0 ? (
              <>
                {/* Desktop/Tablet: Tabela */}
                <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentAccess.map((access) => (
                    <TableRow key={access.id}>
                      <TableCell className="font-medium">
                        {new Date(access.timestamp).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{access.personName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          access.accessType === 'USER' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {access.accessType === 'USER' ? 'Usuário' : 'Convidado'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          access.status === 'APPROVED' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {access.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {data.recentAccess.map((access) => {
                const isApproved = access.status === 'APPROVED'
                const borderColor = isApproved ? 'border-l-green-500' : 'border-l-red-500'
                
                return (
                  <Card key={access.id} className={`border-l-4 ${borderColor}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-base truncate flex-1">
                          {access.personName}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          isApproved 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isApproved ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(access.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            access.accessType === 'USER' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {access.accessType === 'USER' ? 'Usuário' : 'Convidado'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {new Date(access.timestamp).toLocaleDateString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-sm sm:text-base text-gray-500">
                  Nenhum acesso registrado nas últimas 24 horas
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
