"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { formatCPFInput, formatPhoneInput } from "@/lib/utils"

interface Employee {
  id: string
  name: string
  email: string
  phone: string
  documentNumber: string
  position: string
  department: string
  shift: "MORNING" | "AFTERNOON" | "NIGHT" | "FULL_TIME"
  salary: number
  hireDate: string
}

interface EditEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  employee: Employee
}

export function EditEmployeeModal({ isOpen, onClose, onSuccess, employee }: EditEmployeeModalProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    documentNumber: employee.documentNumber,
    position: employee.position,
    department: employee.department,
    shift: employee.shift,
    salary: employee.salary.toString(),
    hireDate: new Date(employee.hireDate).toISOString().split('T')[0]
  })

  useEffect(() => {
    if (employee) {
      console.log('[EditEmployeeModal] Carregando dados do funcionário:', employee)
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: formatPhoneInput(employee.phone || ''),
        documentNumber: formatCPFInput(employee.documentNumber || ''),
        position: employee.position,
        department: employee.department,
        shift: employee.shift,
        salary: employee.salary.toString(),
        hireDate: new Date(employee.hireDate).toISOString().split('T')[0]
      })
    }
  }, [employee])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast('Nome é obrigatório', 'error')
      return false
    }
    if (!formData.email.trim()) {
      showToast('Email é obrigatório', 'error')
      return false
    }
    if (!formData.phone.trim()) {
      showToast('Telefone é obrigatório', 'error')
      return false
    }
    if (!formData.documentNumber.trim()) {
      showToast('CPF é obrigatório', 'error')
      return false
    }
    if (!formData.position.trim()) {
      showToast('Cargo é obrigatório', 'error')
      return false
    }
    if (!formData.department.trim()) {
      showToast('Departamento é obrigatório', 'error')
      return false
    }
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      showToast('Salário deve ser maior que zero', 'error')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      console.log('[EditEmployeeModal] Enviando dados:', formData)
      console.log('[EditEmployeeModal] URL:', `/api/employees/${employee.id}`)
      
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          salary: parseFloat(formData.salary)
        }),
      })

      console.log('[EditEmployeeModal] Response status:', response.status)
      const data = await response.json()
      console.log('[EditEmployeeModal] Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar funcionário')
      }

      showToast('Funcionário atualizado com sucesso!', 'success')
      onSuccess()
      onClose()
      
    } catch (error) {
      console.error('[EditEmployeeModal] Erro:', error)
      showToast(error instanceof Error ? error.message : 'Erro ao atualizar funcionário', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Funcionário">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Nome do funcionário"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="email@exemplo.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Telefone *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', formatPhoneInput(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="(00) 00000-0000"
              maxLength={15}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              CPF *
            </label>
            <input
              type="text"
              value={formData.documentNumber}
              onChange={(e) => handleInputChange('documentNumber', formatCPFInput(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="000.000.000-00"
              maxLength={14}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Cargo *
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Ex: Porteiro, Zelador, Síndico"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Departamento *
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Ex: Segurança, Limpeza, Administração"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Turno *
            </label>
            <select
              value={formData.shift}
              onChange={(e) => handleInputChange('shift', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              disabled={loading}
            >
              <option value="MORNING">Manhã</option>
              <option value="AFTERNOON">Tarde</option>
              <option value="NIGHT">Noite</option>
              <option value="FULL_TIME">Integral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Salário (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.salary}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Data de Admissão *
            </label>
            <input
              type="date"
              value={formData.hireDate}
              onChange={(e) => handleInputChange('hireDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
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
