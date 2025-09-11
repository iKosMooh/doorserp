"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { 
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Home,
  ArrowRight,
  ArrowLeft,
  Check,
  Square,
  Plus,
  Trash2
} from "lucide-react";

interface CreateCondominiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  adminContact: string;
  totalUnits: string;
}

interface UnitData {
  block: string;
  number: string;
  floor: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  unitType: string;
  monthlyFee: string;
}

interface Tower {
  id: string;
  name: string;
  floors: number;
  unitsPerFloor: number;
  startingFloor: number;
  unitType: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpacesPerUnit: string;
  monthlyFee: string;
}

interface BulkUnitCreation {
  enabled: boolean;
  towers: Tower[];
}

interface BulkUnitCreationProps {
  bulkCreation: BulkUnitCreation;
  setBulkCreation: React.Dispatch<React.SetStateAction<BulkUnitCreation>>;
}

// Componente para criação em lote
const BulkUnitCreationComponent: React.FC<BulkUnitCreationProps> = ({ 
  bulkCreation, 
  setBulkCreation 
}) => {
  const addTower = () => {
    const newTower: Tower = {
      id: Date.now().toString(),
      name: '',
      floors: 1,
      unitsPerFloor: 1,
      startingFloor: 1,
      unitType: 'APARTMENT',
      area: '',
      bedrooms: '',
      bathrooms: '',
      parkingSpacesPerUnit: '1',
      monthlyFee: ''
    };

    setBulkCreation(prev => ({
      ...prev,
      towers: [...prev.towers, newTower]
    }));
  };

  const removeTower = (towerId: string) => {
    setBulkCreation(prev => ({
      ...prev,
      towers: prev.towers.filter(tower => tower.id !== towerId)
    }));
  };

  const updateTower = (towerId: string, field: keyof Tower, value: string | number) => {
    setBulkCreation(prev => ({
      ...prev,
      towers: prev.towers.map(tower => 
        tower.id === towerId 
          ? { ...tower, [field]: value }
          : tower
      )
    }));
  };

  const calculateTotalUnits = () => {
    return bulkCreation.towers.reduce((total, tower) => {
      return total + (tower.floors * tower.unitsPerFloor);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Criação em Lote</h4>
        <p className="text-sm text-blue-700">
          Configure torres/blocos com múltiplos andares e unidades. 
          As unidades serão numeradas automaticamente (ex: 101, 102, 201, 202...).
        </p>
        {bulkCreation.towers.length > 0 && (
          <p className="text-sm font-medium text-blue-800 mt-2">
            Total de unidades que serão criadas: <span className="text-lg">{calculateTotalUnits()}</span>
          </p>
        )}
      </div>

      {/* Lista de Torres */}
      <div className="space-y-4">
        {bulkCreation.towers.map((tower, index) => (
          <div key={tower.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium text-gray-900 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                Torre/Bloco #{index + 1}
              </h5>
              {bulkCreation.towers.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTower(tower.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Torre *
                </label>
                <input
                  type="text"
                  value={tower.name}
                  onChange={(e) => updateTower(tower.id, 'name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: A, Torre 1, Bloco Norte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade de Andares *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={tower.floors}
                  onChange={(e) => updateTower(tower.id, 'floors', parseInt(e.target.value) || 1)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidades por Andar *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tower.unitsPerFloor}
                  onChange={(e) => updateTower(tower.id, 'unitsPerFloor', parseInt(e.target.value) || 1)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Andar Inicial
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={tower.startingFloor}
                  onChange={(e) => updateTower(tower.id, 'startingFloor', parseInt(e.target.value) || 1)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Detalhes das Unidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Unidade
                </label>
                <select
                  value={tower.unitType}
                  onChange={(e) => updateTower(tower.id, 'unitType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="APARTMENT">Apartamento</option>
                  <option value="HOUSE">Casa</option>
                  <option value="COMMERCIAL">Comercial</option>
                  <option value="STORAGE">Depósito</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área (m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tower.area}
                  onChange={(e) => updateTower(tower.id, 'area', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 65.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quartos
                </label>
                <input
                  type="number"
                  min="0"
                  value={tower.bedrooms}
                  onChange={(e) => updateTower(tower.id, 'bedrooms', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banheiros
                </label>
                <input
                  type="number"
                  min="0"
                  value={tower.bathrooms}
                  onChange={(e) => updateTower(tower.id, 'bathrooms', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vagas por Unidade *
                </label>
                <input
                  type="number"
                  min="0"
                  value={tower.parkingSpacesPerUnit}
                  onChange={(e) => updateTower(tower.id, 'parkingSpacesPerUnit', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa Mensal (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tower.monthlyFee}
                  onChange={(e) => updateTower(tower.id, 'monthlyFee', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 450.00"
                />
              </div>
            </div>

            {/* Preview das unidades que serão criadas */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Exemplo de unidades que serão criadas:</strong>
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: Math.min(6, tower.floors * tower.unitsPerFloor) }, (_, i) => {
                  const floor = Math.floor(i / tower.unitsPerFloor) + tower.startingFloor;
                  const unitNum = (i % tower.unitsPerFloor) + 1;
                  const unitNumber = `${floor}${unitNum.toString().padStart(2, '0')}`;
                  return (
                    <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {tower.name}-{unitNumber}
                    </span>
                  );
                })}
                {tower.floors * tower.unitsPerFloor > 6 && (
                  <span className="text-xs text-gray-500">
                    ...e mais {tower.floors * tower.unitsPerFloor - 6} unidades
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão para adicionar torre */}
      <Button
        type="button"
        variant="outline"
        onClick={addTower}
        className="w-full border-dashed border-2 border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Torre/Bloco
      </Button>
    </div>
  );
};

export function CreateCondominiumModal({ isOpen, onClose, onSuccess }: CreateCondominiumModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [createdCondominiumId, setCreatedCondominiumId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    adminContact: '',
    totalUnits: ''
  });

  const [unitData, setUnitData] = useState<UnitData>({
    block: '',
    number: '',
    floor: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    parkingSpaces: '0',
    unitType: 'APARTMENT',
    monthlyFee: '0'
  });

  const [bulkCreation, setBulkCreation] = useState<BulkUnitCreation>({
    enabled: false,
    towers: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.zipCode) {
      setError('Nome, endereço, cidade, estado e CEP são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/condominiums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          totalUnits: formData.totalUnits ? parseInt(formData.totalUnits) : 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar condomínio');
      }

      const result = await response.json();
      
      if (result.success && result.condominium?.id) {
        setCreatedCondominiumId(result.condominium.id);
        setCurrentStep(2); // Ir para a segunda etapa
      } else {
        throw new Error(result.error || 'Erro ao obter ID do condomínio criado');
      }
    } catch (err) {
      console.error('Erro ao criar condomínio:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createdCondominiumId) {
      setError('Erro: Condomínio não foi criado corretamente');
      return;
    }

    // Validar criação em lote ou individual
    if (bulkCreation.enabled) {
      // Validar dados da criação em lote
      if (bulkCreation.towers.length === 0) {
        setError('Adicione pelo menos uma torre/bloco');
        return;
      }

      for (const tower of bulkCreation.towers) {
        if (!tower.name || tower.floors <= 0 || tower.unitsPerFloor <= 0) {
          setError('Preencha todos os campos obrigatórios das torres');
          return;
        }
      }
    } else {
      // Validar dados da criação individual
      if (!unitData.block || !unitData.number) {
        setError('Bloco e número são obrigatórios');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      if (bulkCreation.enabled) {
        // Criar múltiplas unidades
        await createBulkUnits();
      } else {
        // Criar unidade individual
        await createSingleUnit();
      }

      // Sucesso total - condomínio e unidade(s) criados
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Erro ao criar unidades:', err);
      setError(err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const createSingleUnit = async () => {
    const submitData = {
      condominiumId: createdCondominiumId,
      block: unitData.block,
      number: unitData.number,
      floor: unitData.floor ? parseInt(unitData.floor) : null,
      area: unitData.area ? parseFloat(unitData.area) : null,
      bedrooms: unitData.bedrooms ? parseInt(unitData.bedrooms) : null,
      bathrooms: unitData.bathrooms ? parseInt(unitData.bathrooms) : null,
      parkingSpaces: parseInt(unitData.parkingSpaces),
      unitType: unitData.unitType,
      monthlyFee: parseFloat(unitData.monthlyFee)
    };

    const response = await fetch('/api/units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar unidade');
    }
  };

  const createBulkUnits = async () => {
    const units = [];

    // Gerar todas as unidades baseadas nas torres
    for (const tower of bulkCreation.towers) {
      for (let floor = tower.startingFloor; floor < tower.startingFloor + tower.floors; floor++) {
        for (let unitNum = 1; unitNum <= tower.unitsPerFloor; unitNum++) {
          const unitNumber = `${floor}${unitNum.toString().padStart(2, '0')}`;
          
          units.push({
            condominiumId: createdCondominiumId,
            block: tower.name,
            number: unitNumber,
            floor: floor,
            area: tower.area ? parseFloat(tower.area) : null,
            bedrooms: tower.bedrooms ? parseInt(tower.bedrooms) : null,
            bathrooms: tower.bathrooms ? parseInt(tower.bathrooms) : null,
            parkingSpaces: parseInt(tower.parkingSpacesPerUnit),
            unitType: tower.unitType,
            monthlyFee: parseFloat(tower.monthlyFee)
          });
        }
      }
    }

    // Criar unidades em lotes para evitar sobrecarregar a API
    const batchSize = 10;
    for (let i = 0; i < units.length; i += batchSize) {
      const batch = units.slice(i, i + batchSize);
      
      const response = await fetch('/api/units/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ units: batch }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Erro ao criar lote ${Math.floor(i / batchSize) + 1} de unidades`);
      }
    }
  };

  const handleSkipUnit = () => {
    // Pular criação de unidade e finalizar
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    if (!loading) {
      setCurrentStep(1);
      setCreatedCondominiumId(null);
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
        totalUnits: ''
      });
      setUnitData({
        block: '',
        number: '',
        floor: '',
        area: '',
        bedrooms: '',
        bathrooms: '',
        parkingSpaces: '0',
        unitType: 'APARTMENT',
        monthlyFee: '0'
      });
      setError(null);
      onClose();
    }
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleUnitChange = (field: keyof UnitData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setUnitData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const formatCNPJ = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatZipCode = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    // Aplica a máscara XXXXX-XXX
    return digits
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    // Aplica a máscara (XX) XXXXX-XXXX
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={currentStep === 1 ? "Cadastrar Novo Condomínio" : "Criar Primeira Unidade"}
    >
      {/* Indicador de etapas */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`h-1 w-16 mx-2 ${
            currentStep > 1 ? 'bg-blue-600' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
        </div>
      </div>

      <div className="text-center mb-6">
        <p className="text-sm text-gray-600">
          {currentStep === 1 
            ? "Etapa 1: Informações do Condomínio" 
            : `Etapa 2: Criar unidade para ${formData.name}`
          }
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Etapa 1: Cadastro do Condomínio */}
      {currentStep === 1 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Condomínio *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleChange('name')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Residencial Vista Bela"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="XX.XXX.XXX/XXXX-XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total de Unidades
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.totalUnits}
                    onChange={handleChange('totalUnits')}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 120"
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-green-600" />
              Endereço
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço Completo *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={handleChange('address')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rua, Avenida, número, complemento"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={handleChange('city')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: São Paulo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado *
                  </label>
                  <select
                    value={formData.state}
                    onChange={handleChange('state')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: formatZipCode(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="XXXXX-XXX"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-purple-600" />
              Informações de Contato
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(XX) XXXXX-XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contato@condominio.com.br"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contato do Administrador
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.adminContact}
                    onChange={handleChange('adminContact')}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome do administrador ou empresa responsável"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões Etapa 1 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
              {loading ? (
                "Cadastrando..."
              ) : (
                <div className="flex items-center">
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Etapa 2: Cadastro da Unidade */}
      {currentStep === 2 && (
        <form onSubmit={handleUnitSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-blue-900 flex items-center mb-2">
              <Check className="w-5 h-5 mr-2 text-green-600" />
              Condomínio criado com sucesso!
            </h3>
            <p className="text-sm text-blue-700">
              Agora você pode criar a primeira unidade para o condomínio <strong>{formData.name}</strong>.
              Esta etapa é opcional - você pode pular e criar unidades depois.
            </p>
          </div>

          {/* Informações da Unidade */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Square className="w-5 h-5 mr-2 text-orange-600" />
              Informações da Unidade
            </h3>

            {/* Alternar entre criação individual e em lote */}
            <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="creationType"
                  checked={!bulkCreation.enabled}
                  onChange={() => setBulkCreation(prev => ({ ...prev, enabled: false }))}
                  className="form-radio text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Criar unidade individual</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="creationType"
                  checked={bulkCreation.enabled}
                  onChange={() => {
                    setBulkCreation(prev => {
                      if (!prev.enabled) {
                        // Adicionar uma torre padrão quando ativado
                        return {
                          enabled: true,
                          towers: [{
                            id: Date.now().toString(),
                            name: 'A',
                            floors: 10,
                            unitsPerFloor: 5,
                            startingFloor: 1,
                            unitType: 'APARTMENT',
                            area: '65',
                            bedrooms: '2',
                            bathrooms: '2',
                            parkingSpacesPerUnit: '1',
                            monthlyFee: '450'
                          }]
                        };
                      }
                      return { ...prev, enabled: true };
                    });
                  }}
                  className="form-radio text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Criar múltiplas unidades</span>
              </label>
            </div>

            {/* Criação Individual */}
            {!bulkCreation.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bloco *
                    </label>
                    <input
                      type="text"
                      value={unitData.block}
                      onChange={handleUnitChange('block')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: A, B, Torre 1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número *
                    </label>
                    <input
                      type="text"
                      value={unitData.number}
                      onChange={handleUnitChange('number')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 101, 201, 1A"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Unidade
                    </label>
                    <select
                      value={unitData.unitType}
                      onChange={handleUnitChange('unitType')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="APARTMENT">Apartamento</option>
                      <option value="HOUSE">Casa</option>
                      <option value="COMMERCIAL">Comercial</option>
                      <option value="STORAGE">Depósito</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Andar
                    </label>
                    <input
                      type="number"
                      value={unitData.floor}
                      onChange={handleUnitChange('floor')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 1, 2, 10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área (m²)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitData.area}
                      onChange={handleUnitChange('area')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 65.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quartos
                    </label>
                    <input
                      type="number"
                      value={unitData.bedrooms}
                      onChange={handleUnitChange('bedrooms')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banheiros
                    </label>
                    <input
                      type="number"
                      value={unitData.bathrooms}
                      onChange={handleUnitChange('bathrooms')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vagas de Garagem
                    </label>
                    <input
                      type="number"
                      value={unitData.parkingSpaces}
                      onChange={handleUnitChange('parkingSpaces')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="Ex: 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taxa Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitData.monthlyFee}
                      onChange={handleUnitChange('monthlyFee')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="Ex: 450.00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Criação em Lote */}
            {bulkCreation.enabled && (
              <BulkUnitCreationComponent
                bulkCreation={bulkCreation}
                setBulkCreation={setBulkCreation}
              />
            )}
          </div>

          {/* Botões Etapa 2 */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipUnit}
                disabled={loading}
              >
                Pular
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  "Criando Unidade..."
                ) : (
                  "Criar Unidade"
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
