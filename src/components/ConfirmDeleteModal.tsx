"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  itemName?: string
  loading?: boolean
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false
}: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>
        </div>

        {itemName && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-red-900">
              Item a ser excluído:
            </p>
            <p className="text-sm text-red-700 font-semibold mt-1">
              {itemName}
            </p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados relacionados serão permanentemente removidos.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
