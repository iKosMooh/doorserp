"use client"

import React, { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { AlertCircle, Calendar, User, FileText } from "lucide-react"

interface Guest {
  id: string
  name: string
  document?: string
  phone?: string
  validFrom: string
  validUntil: string
  accessCode: string
  currentEntries: number
  maxEntries: number
  isActive: boolean
  observations?: string
  faceRecognitionEnabled?: boolean
}

interface EditGuestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  guest: Guest | null
}

interface FormData {
  name: string
  document: string
  phone: string
  validFrom: string
  validUntil: string
  maxEntries: number
  observations: string
  isActive: boolean
  faceRecognitionEnabled: boolean
}

export function EditGuestModal({ isOpen, onClose, onSuccess, guest }: EditGuestModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    document: '',
    phone: '',
    validFrom: '',
    validUntil: '',
    maxEntries: 10,
    observations: '',
    isActive: true,
    faceRecognitionEnabled: false
  })

  // Load guest data when modal opens
  useEffect(() => {
    if (guest && isOpen) {
      setFormData({
        name: guest.name,
        document: guest.document || '',
        phone: guest.phone || '',
        validFrom: new Date(guest.validFrom).toISOString().slice(0, 16),
        validUntil: new Date(guest.validUntil).toISOString().slice(0, 16),
        maxEntries: guest.maxEntries,
        observations: guest.observations || '',
        isActive: guest.isActive,
        faceRecognitionEnabled: guest.faceRecognitionEnabled || false
      })
      setError(null)
    }
  }, [guest, isOpen])

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório')
      return false
    }

    if (!formData.validFrom || !formData.validUntil) {
      setError('Datas de validade são obrigatórias')
      return false
    }

    const validFrom = new Date(formData.validFrom)
    const validUntil = new Date(formData.validUntil)

    if (validFrom >= validUntil) {
      setError('Data de início deve ser anterior à data de fim')
      return false
    }

    if (formData.maxEntries < 1) {
      setError('Número máximo de entradas deve ser pelo menos 1')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!guest) return
    
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/guests/${guest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          document: formData.document,
          phone: formData.phone,
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil).toISOString(),
          maxEntries: formData.maxEntries,
          observations: formData.observations,
          isActive: formData.isActive,
          faceRecognitionEnabled: formData.faceRecognitionEnabled
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar convidado')
      }

      if (data.success) {
        // Limpar cache do localStorage para forçar refresh
        localStorage.removeItem('authorizedPersons')
        onSuccess()
        onClose()
      } else {
        throw new Error(data.message || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao atualizar convidado:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  if (!isOpen || !guest) return null

  const isExpired = new Date(guest.validUntil) < new Date()
  const isExhausted = guest.currentEntries >= guest.maxEntries

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Editar Convidado: ${guest.name}`}>
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Status do Convidado */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Status Atual</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Código:</span>
              <div className="font-mono font-medium">{guest.accessCode}</div>
            </div>
            <div>
              <span className="text-gray-600">Entradas:</span>
              <div className="font-medium">{guest.currentEntries}/{guest.maxEntries}</div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className={`font-medium ${
                formData.isActive && !isExpired && !isExhausted 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formData.isActive && !isExpired && !isExhausted ? 'Ativo' : 'Inativo/Expirado'}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Reconhecimento:</span>
              <div className={`font-medium ${formData.faceRecognitionEnabled ? 'text-blue-600' : 'text-gray-600'}`}>
                {formData.faceRecognitionEnabled ? 'Ativo' : 'Inativo'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Dados Pessoais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados Pessoais
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome do convidado"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Documento
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  let formatted = value
                  if (value.length === 11) {
                    formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                  }
                  handleInputChange('document', formatted)
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  let formatted = value
                  if (value.length === 11) {
                    formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                  } else if (value.length === 10) {
                    formatted = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
                  } else if (value.length <= 2) {
                    formatted = value
                  } else if (value.length <= 7) {
                    formatted = value.replace(/(\d{2})(\d+)/, '($1) $2')
                  } else if (value.length <= 10) {
                    formatted = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
                  }
                  handleInputChange('phone', formatted)
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Máximo de Entradas *
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={formData.maxEntries}
                onChange={(e) => handleInputChange('maxEntries', parseInt(e.target.value) || 1)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Período de Validade */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período de Validade
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Data/Hora de Início *
              </label>
              <input
                type="datetime-local"
                value={formData.validFrom}
                onChange={(e) => handleInputChange('validFrom', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Data/Hora de Fim *
              </label>
              <input
                type="datetime-local"
                value={formData.validUntil}
                onChange={(e) => handleInputChange('validUntil', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Configurações
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Convidado ativo
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="faceRecognition"
                checked={formData.faceRecognitionEnabled}
                onChange={(e) => handleInputChange('faceRecognitionEnabled', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="faceRecognition" className="text-sm font-medium">
                Habilitar reconhecimento facial
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Observações
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Observações adicionais sobre o convidado..."
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-between pt-6 border-t">
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
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}