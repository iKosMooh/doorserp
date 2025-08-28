"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, DollarSign, LogIn, Building } from "lucide-react"

interface DashboardStats {
  totalResidents: number
  totalEmployees: number
  totalUnits: number
  monthlyIncome: number
  monthlyExpenses: number
  recentAccess: Array<{
    id: string
    timestamp: string
    personName: string
    accessType: string
    status: string
  }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalResidents: 0,
    totalEmployees: 0,
    totalUnits: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    recentAccess: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento de dados do banco
    setTimeout(() => {
      setStats({
        totalResidents: 127,
        totalEmployees: 8,
        totalUnits: 156,
        monthlyIncome: 52300.00,
        monthlyExpenses: 18450.00,
        recentAccess: [
          {
            id: "1",
            timestamp: "2025-01-15 08:30:15",
            personName: "João Silva",
            accessType: "RESIDENT",
            status: "APPROVED"
          },
          {
            id: "2", 
            timestamp: "2025-01-15 08:25:42",
            personName: "Maria Santos",
            accessType: "RESIDENT",
            status: "APPROVED"
          },
          {
            id: "3",
            timestamp: "2025-01-15 08:20:11",
            personName: "José Porteiro",
            accessType: "EMPLOYEE",
            status: "APPROVED"
          },
          {
            id: "4",
            timestamp: "2025-01-15 07:45:33",
            personName: "Ana Costa",
            accessType: "GUEST",
            status: "APPROVED"
          },
          {
            id: "5",
            timestamp: "2025-01-15 07:30:18",
            personName: "Carlos Visitante",
            accessType: "GUEST",
            status: "REJECTED"
          }
        ]
      })
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando dashboard...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gestão do condomínio
          </p>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Moradores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResidents}</div>
              <p className="text-xs text-muted-foreground">
                Moradores ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Funcionários
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Funcionários ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unidades
              </CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUnits}</div>
              <p className="text-xs text-muted-foreground">
                Total de unidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Saldo Mensal
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(stats.monthlyIncome - stats.monthlyExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita - Despesas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resumo financeiro */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Receitas do Mês</CardTitle>
              <CardDescription>
                Total de receitas de Janeiro 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Despesas do Mês</CardTitle>
              <CardDescription>
                Total de despesas de Janeiro 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {stats.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acessos recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Acessos Recentes
            </CardTitle>
            <CardDescription>
              Últimos acessos registrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                {stats.recentAccess.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell className="font-medium">
                      {new Date(access.timestamp).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>{access.personName}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        access.accessType === 'RESIDENT' 
                          ? 'bg-blue-100 text-blue-800'
                          : access.accessType === 'EMPLOYEE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {access.accessType === 'RESIDENT' ? 'Morador' : 
                         access.accessType === 'EMPLOYEE' ? 'Funcionário' : 'Convidado'}
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
