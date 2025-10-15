"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { DollarSign, Calendar, RefreshCw, TrendingUp } from "lucide-react"

interface RecurringRevenueModalProps {
  isOpen: boolean
  onClose: () => void
  condominiumId: string
  userId: string
  onSuccess: () => void
}

export function RecurringRevenueModal({ 
  isOpen, 
  onClose, 
  condominiumId, 
  userId,
  onSuccess 
}: RecurringRevenueModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'generate' | 'update'>('generate')
  
  // Generate tab
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Update tab
  const [updateMonth, setUpdateMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [newAmount, setNewAmount] = useState('')
  const [updateType, setUpdateType] = useState<'month' | 'units'>('month')

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/financial/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condominiumId,
          referenceMonth,
          userId
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`✅ ${result.message}. Total: R$ ${result.data.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        setError(result.error || 'Erro ao gerar receitas')
      }
    } catch (err) {
      console.error('Erro:', err)
      setError('Erro ao gerar receitas recorrentes')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      if (!newAmount || parseFloat(newAmount) <= 0) {
        setError('Digite um valor válido')
        setLoading(false)
        return
      }

      const response = await fetch('/api/financial/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condominiumId,
          referenceMonth: updateType === 'month' ? updateMonth : undefined,
          newAmount: parseFloat(newAmount),
          updateType,
          userId
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`✅ ${result.message}`)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        setError(result.error || 'Erro ao atualizar valores')
      }
    } catch (err) {
      console.error('Erro:', err)
      setError('Erro ao atualizar valores')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Receitas Recorrentes">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'generate'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="inline h-4 w-4 mr-2" />
            Gerar Mensalidades
          </button>
          <button
            onClick={() => setActiveTab('update')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'update'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <RefreshCw className="inline h-4 w-4 mr-2" />
            Atualizar Valores
          </button>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Como Funciona
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Gera receitas para todas as unidades <strong>ativas e ocupadas</strong></li>
                <li>Usa o valor da <code className="bg-blue-100 px-1 rounded">taxa mensal (monthlyFee)</code> de cada unidade</li>
                <li>Vencimento padrão: dia 10 do mês</li>
                <li>Status inicial: PENDENTE</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mês de Referência
              </label>
              <input
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecione o mês para qual as receitas serão geradas
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Gerar Receitas
                  </>
                )}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Update Tab */}
        {activeTab === 'update' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Atualização em Massa
              </h4>
              <p className="text-sm text-yellow-800">
                Escolha se deseja atualizar as receitas de um mês específico ou o valor base de todas as unidades.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Atualização
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="month"
                    checked={updateType === 'month'}
                    onChange={(e) => setUpdateType(e.target.value as 'month' | 'units')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Atualizar receitas de um mês específico</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="units"
                    checked={updateType === 'units'}
                    onChange={(e) => setUpdateType(e.target.value as 'month' | 'units')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Atualizar valor base de todas as unidades (próximas receitas)</span>
                </label>
              </div>
            </div>

            {updateType === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mês de Referência
                </label>
                <input
                  type="month"
                  value={updateMonth}
                  onChange={(e) => setUpdateMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novo Valor (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {updateType === 'month' 
                  ? 'Todas as receitas do mês selecionado serão atualizadas'
                  : 'O valor base (monthlyFee) de todas as unidades ativas será atualizado'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar Valores
                  </>
                )}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
