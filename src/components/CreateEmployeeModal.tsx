"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useCondominium } from "@/contexts/CondominiumContext"

interface CreateEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateEmployeeModal({ isOpen, onClose, onSuccess }: CreateEmployeeModalProps) {
  const { selectedCondominium } = useCondominium()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    documentNumber: '',
    position: '',
    department: '',
    shift: 'FULL_TIME',
    salary: '',
    hireDate: new Date().toISOString().split('T')[0]
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email é obrigatório')
      return false
    }
    if (!formData.phone.trim()) {
      setError('Telefone é obrigatório')
      return false
    }
    if (!formData.documentNumber.trim()) {
      setError('CPF é obrigatório')
      return false
    }
    if (!formData.position.trim()) {
      setError('Cargo é obrigatório')
      return false
    }
    if (!formData.department.trim()) {
      setError('Departamento é obrigatório')
      return false
    }
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      setError('Salário deve ser maior que zero')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!selectedCondominium?.id) {
      setError('Nenhum condomínio selecionado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          condominiumId: selectedCondominium.id,
          salary: parseFloat(formData.salary)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar funcionário')
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        documentNumber: '',
        position: '',
        department: '',
        shift: 'FULL_TIME',
        salary: '',
        hireDate: new Date().toISOString().split('T')[0]
      })
      
      onSuccess()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      documentNumber: '',
      position: '',
      department: '',
      shift: 'FULL_TIME',
      salary: '',
      hireDate: new Date().toISOString().split('T')[0]
    })
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Funcionário">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="Nome completo do funcionário"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone *
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
                }
                handleInputChange('phone', formatted)
              }}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF *
            </label>
            <input
              type="text"
              value={formData.documentNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                let formatted = value
                if (value.length === 11) {
                  formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                }
                handleInputChange('documentNumber', formatted)
              }}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cargo *
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="Ex: Porteiro, Zelador, Síndico"
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departamento *
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="Ex: Portaria, Manutenção, Administração"
            />
          </div>

          {/* Turno */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Turno *
            </label>
            <select
              value={formData.shift}
              onChange={(e) => handleInputChange('shift', e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
            >
              <option value="MORNING">Manhã</option>
              <option value="AFTERNOON">Tarde</option>
              <option value="NIGHT">Noite</option>
              <option value="FULL_TIME">Integral</option>
            </select>
          </div>

          {/* Salário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salário (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.salary}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="0.00"
            />
          </div>

          {/* Data de Admissão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Admissão *
            </label>
            <input
              type="date"
              value={formData.hireDate}
              onChange={(e) => handleInputChange('hireDate', e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            disabled={loading}
            className="min-h-[44px] w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto order-1 sm:order-2"
          >
            {loading ? 'Criando...' : 'Criar Funcionário'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
