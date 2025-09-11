"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CreateCondominiumModal } from "@/components/CreateCondominiumModal"
import { useCondominium } from "@/contexts/CondominiumContext"
import { useAuth } from "@/contexts/AuthContext"
import { 
  Settings, 
  Building2, 
  Users, 
  Phone,
  Mail,
  MapPin,
  Edit,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Crown,
  Key,
  User
} from "lucide-react"

interface CondominiumData {
  id: string
  name: string
  cnpj: string | null
  address: string
  city: string
  state: string
  zipCode: string
  phone: string | null
  email: string | null
  adminContact: string | null
  totalUnits: number
  isActive: boolean
  subscriptionPlan: string
  subscriptionExpiresAt: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    units: number
    residents: number
    employees: number
    guests: number
    accessLogs: number
  }
}

export default function SettingsPage() {
  const { selectedCondominium, condominiums, loading: condominiumLoading, loadCondominiums } = useCondominium()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingCondominium, setViewingCondominium] = useState<CondominiumData | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Estados para mudança de senha
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    adminContact: '',
    totalUnits: 0,
    subscriptionPlan: 'BASIC'
  })

  useEffect(() => {
    if (editingId) {
      const condo = condominiums.find(c => c.id === editingId)
      if (condo) {
        setFormData({
          name: condo.name,
          cnpj: condo.cnpj || '',
          address: condo.address,
          city: condo.city,
          state: condo.state,
          zipCode: condo.zipCode,
          phone: condo.phone || '',
          email: condo.email || '',
          adminContact: condo.adminContact || '',
          totalUnits: condo.totalUnits,
          subscriptionPlan: condo.subscriptionPlan
        })
      }
    } else {
      setFormData({
        name: '',
        cnpj: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        adminContact: '',
        totalUnits: 0,
        subscriptionPlan: 'BASIC'
      })
    }
  }, [editingId, condominiums])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/condominiums/${editingId}` : '/api/condominiums'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar condomínio')
      }

      await loadCondominiums()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: '',
        cnpj: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        adminContact: '',
        totalUnits: 0,
        subscriptionPlan: 'BASIC'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (condominium: typeof condominiums[0]) => {
    setEditingId(condominium.id)
    setShowForm(true)
  }

  const handleView = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/condominiums/${id}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do condomínio')
      }
      
      const data = await response.json()
      setViewingCondominium(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const condominium = condominiums.find(c => c.id === id)
    if (!condominium) return

    if (!confirm(`Tem certeza que deseja excluir o condomínio "${condominium.name}"?\n\n⚠️ ATENÇÃO: Esta ação irá excluir PERMANENTEMENTE:\n• Todas as unidades\n• Todos os moradores\n• Todos os funcionários\n• Todos os hóspedes\n• Todos os logs de acesso\n• Todas as configurações\n• Todas as labels de reconhecimento facial\n\nEsta ação NÃO PODE ser desfeita!`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/condominiums/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir condomínio')
      }

      await loadCondominiums()
      alert(`✅ ${result.message}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      alert(`❌ Erro: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const getSubscriptionLabel = (plan: string) => {
    const plans: Record<string, { label: string; color: string }> = {
      'BASIC': { label: 'Básico', color: 'bg-gray-100 text-gray-800' },
      'PREMIUM': { label: 'Premium', color: 'bg-blue-100 text-blue-800' },
      'ENTERPRISE': { label: 'Enterprise', color: 'bg-purple-100 text-purple-800' }
    }
    return plans[plan] || { label: plan, color: 'bg-gray-100 text-gray-800' }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage({ type: '', text: '' })

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'As senhas não coincidem' })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' })
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setShowPasswordForm(false)
      } else {
        setPasswordMessage({ type: 'error', text: data.message || 'Erro ao alterar senha' })
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCondominiumSuccess = async () => {
    await loadCondominiums();
    setShowCreateModal(false);
  };

  if (condominiumLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando configurações...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie condomínios e configurações do sistema
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Condomínio
          </Button>
        </div>

        {/* Informações do condomínio atual */}
        {selectedCondominium && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Condomínio Selecionado
              </CardTitle>
              <CardDescription>
                Informações do condomínio atualmente em uso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="font-semibold">{selectedCondominium.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Localização</label>
                  <p>{selectedCondominium.city}, {selectedCondominium.state}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Total de Unidades</label>
                  <p>{selectedCondominium.totalUnits}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Plano</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getSubscriptionLabel(selectedCondominium.subscriptionPlan).color
                  }`}>
                    <Crown className="w-3 h-3 mr-1" />
                    {getSubscriptionLabel(selectedCondominium.subscriptionPlan).label}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de visualização */}
        {viewingCondominium && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Detalhes do Condomínio
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setViewingCondominium(null)}
                >
                  ✕ Fechar
                </Button>
              </div>
              <CardDescription>
                Informações completas do condomínio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="font-semibold">{viewingCondominium.name}</p>
                </div>
                {viewingCondominium.cnpj && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">CNPJ</label>
                    <p>{viewingCondominium.cnpj}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Endereço</label>
                  <p>{viewingCondominium.address}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Cidade</label>
                  <p>{viewingCondominium.city}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Estado</label>
                  <p>{viewingCondominium.state}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">CEP</label>
                  <p>{viewingCondominium.zipCode}</p>
                </div>
                {viewingCondominium.phone && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Telefone</label>
                    <p>{viewingCondominium.phone}</p>
                  </div>
                )}
                {viewingCondominium.email && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p>{viewingCondominium.email}</p>
                  </div>
                )}
                {viewingCondominium.adminContact && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Contato Admin</label>
                    <p>{viewingCondominium.adminContact}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Total de Unidades</label>
                  <p>{viewingCondominium.totalUnits}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Plano</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getSubscriptionLabel(viewingCondominium.subscriptionPlan).color
                  }`}>
                    <Crown className="w-3 h-3 mr-1" />
                    {getSubscriptionLabel(viewingCondominium.subscriptionPlan).label}
                  </span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    viewingCondominium.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingCondominium.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Estatísticas do condomínio */}
              {viewingCondominium._count && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-4">Estatísticas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{viewingCondominium._count.units}</div>
                      <div className="text-sm text-blue-600">Unidades</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{viewingCondominium._count.residents}</div>
                      <div className="text-sm text-green-600">Moradores</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{viewingCondominium._count.employees}</div>
                      <div className="text-sm text-purple-600">Funcionários</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{viewingCondominium._count.guests}</div>
                      <div className="text-sm text-orange-600">Hóspedes</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{viewingCondominium._count.accessLogs}</div>
                      <div className="text-sm text-gray-600">Logs de Acesso</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const condoForEdit = condominiums.find(c => c.id === viewingCondominium.id)
                    if (condoForEdit) {
                      setViewingCondominium(null)
                      handleEdit(condoForEdit)
                    }
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setViewingCondominium(null)}
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de criação/edição */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Condomínio' : 'Novo Condomínio'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Altere as informações do condomínio' : 'Cadastre um novo condomínio no sistema'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do condomínio"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Endereço *</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cidade *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome da cidade"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estado *</label>
                    <select
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione o estado</option>
                      <option value="AC">Acre</option>
                      <option value="AL">Alagoas</option>
                      <option value="AP">Amapá</option>
                      <option value="AM">Amazonas</option>
                      <option value="BA">Bahia</option>
                      <option value="CE">Ceará</option>
                      <option value="DF">Distrito Federal</option>
                      <option value="ES">Espírito Santo</option>
                      <option value="GO">Goiás</option>
                      <option value="MA">Maranhão</option>
                      <option value="MT">Mato Grosso</option>
                      <option value="MS">Mato Grosso do Sul</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="PA">Pará</option>
                      <option value="PB">Paraíba</option>
                      <option value="PR">Paraná</option>
                      <option value="PE">Pernambuco</option>
                      <option value="PI">Piauí</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="RN">Rio Grande do Norte</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="RO">Rondônia</option>
                      <option value="RR">Roraima</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="SP">São Paulo</option>
                      <option value="SE">Sergipe</option>
                      <option value="TO">Tocantins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CEP *</label>
                    <input
                      type="text"
                      required
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contato@condominio.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contato Admin</label>
                    <input
                      type="text"
                      value={formData.adminContact}
                      onChange={(e) => setFormData({ ...formData, adminContact: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do administrador"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Total de Unidades</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.totalUnits}
                      onChange={(e) => setFormData({ ...formData, totalUnits: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Plano de Assinatura</label>
                    <select
                      value={formData.subscriptionPlan}
                      onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="BASIC">Básico</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                      setError(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Informações do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
            <CardDescription>
              Dados do usuário logado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Nome</label>
                <p className="font-semibold">{user?.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p>{user?.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Tipo de Usuário</label>
                <p>{user?.isAdmin ? 'Administrador Global' : 'Usuário de Condomínio'}</p>
              </div>
              {!user?.isAdmin && (
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium text-gray-500">Condomínios com Acesso</label>
                  <div className="flex flex-wrap gap-2">
                    {user?.condominiums.map(condo => (
                      <span key={condo.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        {condo.name} ({condo.accessLevel})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Alterar Senha</h3>
                  <p className="text-sm text-gray-600">Mantenha sua conta segura alterando sua senha regularmente</p>
                </div>
                <Button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  variant="outline"
                >
                  <Key className="w-4 h-4 mr-2" />
                  {showPasswordForm ? 'Cancelar' : 'Alterar Senha'}
                </Button>
              </div>

              {showPasswordForm && (
                <form onSubmit={handleChangePassword} className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  {passwordMessage.text && (
                    <div className={`p-4 rounded-md ${
                      passwordMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-300 text-green-700'
                        : 'bg-red-50 border border-red-300 text-red-700'
                    }`}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Senha Atual
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        Nova Senha
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Alterando...' : 'Confirmar Alteração'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de condomínios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Condomínios Cadastrados
            </CardTitle>
            <CardDescription>
              Gerencie todos os condomínios do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {condominiums.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum condomínio cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {condominiums.map((condominium) => (
                    <TableRow key={condominium.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{condominium.name}</div>
                            {condominium.cnpj && (
                              <div className="text-sm text-gray-500">{condominium.cnpj}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          {condominium.city}, {condominium.state}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {condominium.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {condominium.phone}
                            </div>
                          )}
                          {condominium.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              {condominium.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Users className="h-3 w-3 mr-1 text-gray-400" />
                          {condominium.totalUnits}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getSubscriptionLabel(condominium.subscriptionPlan).color
                        }`}>
                          <Crown className="w-3 h-3 mr-1" />
                          {getSubscriptionLabel(condominium.subscriptionPlan).label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          condominium.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {condominium.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inativo
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleView(condominium.id)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(condominium)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(condominium.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
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
        
        {/* Modal de Criação de Condomínio */}
        <CreateCondominiumModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateCondominiumSuccess}
        />
      </div>
    </MainLayout>
  )
}
