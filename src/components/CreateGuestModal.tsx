'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Resident {
  id: string;
  user: {
    name: string;
  };
  unit: {
    block: string;
    number: string;
  };
}

interface CreateGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident;
}

export default function CreateGuestModal({ isOpen, onClose, resident }: CreateGuestModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    phone: '',
    photo: '',
    validFrom: '',
    validUntil: '',
    maxEntries: 10,
    observations: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Configurar datas padrão quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const maxDate = new Date(now);
      maxDate.setDate(now.getDate() + 2); // Máximo 2 dias

      setFormData(prev => ({
        ...prev,
        validFrom: formatDateTimeLocal(now),
        validUntil: formatDateTimeLocal(maxDate)
      }));
    }
  }, [isOpen]);

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'maxEntries') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    if (!formData.validFrom || !formData.validUntil) {
      setError('Período de validade é obrigatório');
      return false;
    }

    const validFrom = new Date(formData.validFrom);
    const validUntil = new Date(formData.validUntil);
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + 2);

    if (validFrom < now) {
      setError('Data de início não pode ser no passado');
      return false;
    }

    if (validUntil <= validFrom) {
      setError('Data de fim deve ser posterior à data de início');
      return false;
    }

    if (validUntil > maxDate) {
      setError('Período máximo de acesso é de 2 dias');
      return false;
    }

    if (formData.maxEntries < 1 || formData.maxEntries > 50) {
      setError('Número de entradas deve estar entre 1 e 50');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          residentId: resident.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar convidado');
      }

      if (data.success) {
        alert(`Convidado criado com sucesso!\nCódigo de acesso: ${data.guest.accessCode}`);
        onClose();
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      document: '',
      phone: '',
      photo: '',
      validFrom: '',
      validUntil: '',
      maxEntries: 10,
      observations: ''
    });
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Convidado">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações do Morador */}
        <Card className="p-4 bg-blue-50">
          <div className="text-sm text-blue-800">
            <div className="font-medium">Convidado para:</div>
            <div>{resident.user.name}</div>
            <div>Unidade: {resident.unit.block}{resident.unit.number}</div>
          </div>
        </Card>

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
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome completo do convidado"
            />
          </div>

          {/* Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF/RG
            </label>
            <input
              type="text"
              name="document"
              value={formData.document}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000.000.000-00"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* URL da Foto */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL da Foto (opcional)
            </label>
            <input
              type="url"
              name="photo"
              value={formData.photo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>

          {/* Data de Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Válido a partir de *
            </label>
            <input
              type="datetime-local"
              name="validFrom"
              value={formData.validFrom}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Data de Fim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Válido até *
            </label>
            <input
              type="datetime-local"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Máximo de Entradas */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número máximo de entradas
            </label>
            <select
              name="maxEntries"
              value={formData.maxEntries}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 50].map(num => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'entrada' : 'entradas'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Limite de entradas durante o período de validade
            </p>
          </div>

          {/* Observações */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Informações adicionais sobre o convidado..."
            />
          </div>
        </div>

        {/* Aviso sobre o período */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="text-yellow-800 text-sm">
            <div className="font-medium mb-1">⚠️ Importante:</div>
            <ul className="text-xs space-y-1">
              <li>• Período máximo de acesso: 2 dias</li>
              <li>• O código de acesso será gerado automaticamente</li>
              <li>• O convidado deve apresentar documento de identificação</li>
              <li>• Todas as entradas serão registradas no sistema</li>
            </ul>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            onClick={handleClose}
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
            {loading ? 'Criando...' : 'Criar Convidado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
