"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { DollarSign, AlertTriangle } from "lucide-react"

interface UpdateAllFeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  condominiumId: string
  userId: string
}

export function UpdateAllFeeModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  condominiumId,
  userId 
}: UpdateAllFeeModalProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [newFee, setNewFee] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const feeValue = parseFloat(newFee)
    
    if (!newFee || feeValue <= 0) {
      showToast('Digite um valor válido', 'warning')
      return
    }

    if (!confirmed) {
      showToast('Confirme que deseja atualizar todas as unidades', 'warning')
      return
    }

    setLoading(true)

    try {
      console.log('[UpdateAllFeeModal] Atualizando taxas em massa')
      console.log('[UpdateAllFeeModal] Condomínio:', condominiumId)
      console.log('[UpdateAllFeeModal] Novo valor:', feeValue)

      const response = await fetch('/api/financial/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condominiumId,
          newAmount: feeValue,
          updateType: 'units',
          userId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao atualizar taxas')
      }

      showToast(result.message || 'Taxas atualizadas com sucesso!', 'success', 5000)
      onSuccess()
      onClose()
      
    } catch (error) {
      console.error('[UpdateAllFeeModal] Erro:', error)
      showToast(error instanceof Error ? error.message : 'Erro ao atualizar taxas em massa', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setNewFee('')
      setConfirmed(false)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Atualizar Taxa em Massa">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Atenção: Atualização em Massa
              </p>
              <p className="text-sm text-yellow-800">
                Esta ação atualizará a taxa mensal de <strong>todas as unidades ativas</strong> deste condomínio.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Nova Taxa Mensal (R$) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="0,00"
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div className="text-sm">
              <span className="font-medium text-gray-900">
                Confirmo que desejo atualizar todas as unidades ativas
              </span>
              <p className="text-gray-600 mt-1">
                {newFee && parseFloat(newFee) > 0
                  ? `Todas as unidades receberão a nova taxa de R$ ${parseFloat(newFee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'Digite um valor acima para confirmar'}
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !confirmed || !newFee || parseFloat(newFee) <= 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Atualizando...' : 'Atualizar Todas'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
