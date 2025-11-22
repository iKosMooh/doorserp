"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { DollarSign } from "lucide-react"

interface UpdateUnitFeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  unit: {
    id: string
    block: string
    number: string
    monthlyFee: number
  }
}

export function UpdateUnitFeeModal({ isOpen, onClose, onSuccess, unit }: UpdateUnitFeeModalProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [newFee, setNewFee] = useState(unit.monthlyFee.toString())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const feeValue = parseFloat(newFee)
    
    if (!newFee || feeValue <= 0) {
      showToast('Digite um valor válido', 'warning')
      return
    }

    setLoading(true)

    try {
      console.log('[UpdateUnitFeeModal] Atualizando taxa da unidade:', unit.id)
      console.log('[UpdateUnitFeeModal] Novo valor:', feeValue)

      const response = await fetch(`/api/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyFee: feeValue })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar taxa')
      }

      showToast('Taxa atualizada com sucesso!', 'success')
      onSuccess()
      onClose()
      
    } catch (error) {
      console.error('[UpdateUnitFeeModal] Erro:', error)
      showToast(error instanceof Error ? error.message : 'Erro ao atualizar taxa da unidade', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Taxa Mensal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Unidade: {unit.block}/{unit.number}
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
          <p className="text-xs text-gray-500 mt-1">
            Taxa atual: R$ {unit.monthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
