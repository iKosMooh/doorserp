"use client"

import React, { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useCondominium } from '@/contexts/CondominiumContext'
import { Plus, Building } from 'lucide-react'

interface CreateUnitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateUnitModal({ isOpen, onClose, onSuccess }: CreateUnitModalProps) {
  const { selectedCondominium } = useCondominium()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    block: '',
    number: '',
    floor: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    parkingSpaces: '0',
    unitType: 'APARTMENT',
    monthlyFee: '0'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCondominium) {
      setError('Nenhum condomínio selecionado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const submitData = {
        condominiumId: selectedCondominium.id,
        block: formData.block,
        number: formData.number,
        floor: formData.floor ? parseInt(formData.floor) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        parkingSpaces: parseInt(formData.parkingSpaces),
        unitType: formData.unitType,
        monthlyFee: parseFloat(formData.monthlyFee)
      }

      const response = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (result.success) {
        setFormData({
          block: '',
          number: '',
          floor: '',
          area: '',
          bedrooms: '',
          bathrooms: '',
          parkingSpaces: '0',
          unitType: 'APARTMENT',
          monthlyFee: '0'
        })
        onSuccess()
        onClose()
      } else {
        setError(result.error || 'Erro ao cadastrar unidade')
      }
    } catch (err) {
      console.error('Erro ao cadastrar unidade:', err)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        block: '',
        number: '',
        floor: '',
        area: '',
        bedrooms: '',
        bathrooms: '',
        parkingSpaces: '0',
        unitType: 'APARTMENT',
        monthlyFee: '0'
      })
      setError(null)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Unidade">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Condomínio: {selectedCondominium?.name}</span>
          </div>
        </div>

        {/* Informações básicas da unidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="block" className="block text-sm font-medium text-gray-700 mb-1">
              Bloco *
            </label>
            <input
              type="text"
              id="block"
              name="block"
              value={formData.block}
              onChange={handleInputChange}
              required
              placeholder="Ex: A, B, Torre 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
              Número *
            </label>
            <input
              type="text"
              id="number"
              name="number"
              value={formData.number}
              onChange={handleInputChange}
              required
              placeholder="Ex: 101, 201, 1A"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="unitType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Unidade *
            </label>
            <select
              id="unitType"
              name="unitType"
              value={formData.unitType}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="APARTMENT">Apartamento</option>
              <option value="HOUSE">Casa</option>
              <option value="COMMERCIAL">Comercial</option>
              <option value="STORAGE">Depósito</option>
            </select>
          </div>

          <div>
            <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-1">
              Andar
            </label>
            <input
              type="number"
              id="floor"
              name="floor"
              value={formData.floor}
              onChange={handleInputChange}
              placeholder="Ex: 1, 2, 10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Detalhes da unidade */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
              Área (m²)
            </label>
            <input
              type="number"
              step="0.01"
              id="area"
              name="area"
              value={formData.area}
              onChange={handleInputChange}
              placeholder="Ex: 65.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Quartos
            </label>
            <input
              type="number"
              id="bedrooms"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleInputChange}
              placeholder="Ex: 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Banheiros
            </label>
            <input
              type="number"
              id="bathrooms"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleInputChange}
              placeholder="Ex: 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Informações financeiras e vagas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="parkingSpaces" className="block text-sm font-medium text-gray-700 mb-1">
              Vagas de Garagem
            </label>
            <input
              type="number"
              id="parkingSpaces"
              name="parkingSpaces"
              value={formData.parkingSpaces}
              onChange={handleInputChange}
              min="0"
              placeholder="Ex: 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="monthlyFee" className="block text-sm font-medium text-gray-700 mb-1">
              Taxa Mensal (R$)
            </label>
            <input
              type="number"
              step="0.01"
              id="monthlyFee"
              name="monthlyFee"
              value={formData.monthlyFee}
              onChange={handleInputChange}
              min="0"
              placeholder="Ex: 450.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-4">
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
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cadastrando...
              </div>
            ) : (
              <div className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Unidade
              </div>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
