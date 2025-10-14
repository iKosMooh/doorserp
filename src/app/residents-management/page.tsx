'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/main-layout';
import { CreateResidentModal } from '@/components/CreateResidentModal';
import CreateGuestModal from '@/components/CreateGuestModal';
import { EditResidentModal } from '@/components/EditResidentModal';
import { EditGuestModal } from '@/components/EditGuestModal';
import { formatCPF, formatPhone } from '@/lib/utils';
import { 
  PlusIcon, 
  UsersIcon, 
  ClockIcon, 
  EyeIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  HomeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
  documentType: string;
  birthDate: string | null;
  photo?: string;
  faceRecognitionEnabled: boolean;
  faceRecognitionFolder: string | null;
  lastLogin?: string;
}

interface Unit {
  id: string;
  block: string;
  number: string;
  floor?: string;
}

interface Condominium {
  id: string;
  name: string;
}

interface Guest {
  id: string;
  name: string;
  validFrom: string;
  validUntil: string;
  accessCode: string;
  currentEntries: number;
  maxEntries: number;
  isActive: boolean;
  faceRecognitionEnabled?: boolean;
  faceRecognitionFolder?: string;
}

interface Resident {
  id: string;
  relationshipType: string;
  isActive: boolean;
  emergencyContact: string | null;
  vehiclePlates: string[];
  user: User;
  unit: Unit;
  condominium: Condominium;
  guests: Guest[];
}

interface UnitData {
  unit: Unit;
  residents: Resident[];
  guests: Guest[];
}

export default function ResidentManagementPage() {
  const [unitData, setUnitData] = useState<UnitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateResidentModalOpen, setIsCreateResidentModalOpen] = useState(false);
  const [isCreateGuestModalOpen, setIsCreateGuestModalOpen] = useState(false);
  const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  const [isEditGuestModalOpen, setIsEditGuestModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedUnitForGuest, setSelectedUnitForGuest] = useState<UnitData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUserInfo();
    fetchUnitsData();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.user.isAdmin || data.user.isSuperAdmin);
      }
    } catch (error) {
      console.error('Erro ao obter informações do usuário:', error);
    }
  };

  const fetchUnitsData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/residents-management/units');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados das unidades');
      }

      const data = await response.json();
      
      if (data.success) {
        // Organizar dados por unidade
        const unitsMap = new Map<string, UnitData>();
        
        data.residents.forEach((resident: Resident) => {
          const unitKey = `${resident.unit.block}${resident.unit.number}`;
          
          if (!unitsMap.has(unitKey)) {
            unitsMap.set(unitKey, {
              unit: resident.unit,
              residents: [],
              guests: []
            });
          }
          
          const unitData = unitsMap.get(unitKey)!;
          unitData.residents.push(resident);
          
          // Adicionar convidados do morador
          resident.guests.forEach(guest => {
            unitData.guests.push(guest);
          });
        });
        
        const unitsArray = Array.from(unitsMap.values()).sort((a, b) => {
          const aKey = `${a.unit.block}${a.unit.number}`;
          const bKey = `${b.unit.block}${b.unit.number}`;
          return aKey.localeCompare(bKey);
        });
        
        setUnitData(unitsArray);
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleEditResident = (resident: Resident) => {
    setSelectedResident(resident);
    setIsEditResidentModalOpen(true);
  };

  const handleEditGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsEditGuestModalOpen(true);
  };

  const handleCreateGuestForUnit = (unitData: UnitData) => {
    setSelectedUnitForGuest(unitData);
    setIsCreateGuestModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateResidentModalOpen(false);
    setIsCreateGuestModalOpen(false);
    setIsEditResidentModalOpen(false);
    setIsEditGuestModalOpen(false);
    setSelectedResident(null);
    setSelectedGuest(null);
    setSelectedUnitForGuest(null);
    fetchUnitsData(); // Recarregar dados após alterações
  };

  const handleGuestUpdated = () => {
    fetchUnitsData(); // Recarregar todos os dados
    setIsEditGuestModalOpen(false);
    setSelectedGuest(null);
  };

  const toggleUnitExpansion = (unitKey: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitKey)) {
      newExpanded.delete(unitKey);
    } else {
      newExpanded.add(unitKey);
    }
    setExpandedUnits(newExpanded);
  };

  const filteredUnits = unitData.filter(unit => {
    const unitIdentifier = `${unit.unit.block}${unit.unit.number}`;
    const matchesSearch = 
      unitIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.residents.some(resident => 
        resident.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      unit.guests.some(guest => 
        guest.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesUnit = filterUnit === '' || 
                       unitIdentifier.toLowerCase().includes(filterUnit.toLowerCase());

    return matchesSearch && matchesUnit;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isGuestActive = (guest: Guest) => {
    if (!guest.isActive) return false; // Verifica se o convidado está ativo
    
    const now = new Date();
    const validFrom = new Date(guest.validFrom);
    const validUntil = new Date(guest.validUntil);
    
    return now >= validFrom && now <= validUntil && guest.currentEntries < guest.maxEntries;
  };

  const getRelationshipTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'OWNER': 'Proprietário',
      'TENANT': 'Inquilino', 
      'FAMILY_MEMBER': 'Familiar',
      'AUTHORIZED': 'Autorizado'
    };
    return labels[type] || type;
  };

  const getTotalStats = () => {
    const totalResidents = filteredUnits.reduce((sum, unit) => sum + unit.residents.length, 0);
    const totalActiveGuests = filteredUnits.reduce((sum, unit) => 
      sum + unit.guests.filter(guest => isGuestActive(guest)).length, 0
    );
    const totalWithFaceRecognition = filteredUnits.reduce((sum, unit) => 
      sum + unit.residents.filter(resident => resident.user.faceRecognitionEnabled).length, 0
    );
    
    return { totalResidents, totalActiveGuests, totalWithFaceRecognition };
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6">
            <div className="text-center">
              <div className="text-red-600 text-lg font-medium mb-4">
                Erro ao carregar dados
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchUnitsData}>
                Tentar Novamente
              </Button>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const stats = getTotalStats();

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gerenciamento por Unidades
              </h1>
              <p className="text-gray-600 mt-2">
                {isAdmin ? 'Gerencie moradores e convidados organizados por apartamento' : 'Visualize moradores e gerencie convidados da sua unidade'}
              </p>
            </div>
            
            {isAdmin && (
              <Button
                onClick={() => setIsCreateResidentModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Morador
              </Button>
            )}
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por unidade, morador ou convidado
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite para buscar..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por unidade específica
              </label>
              <input
                type="text"
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                placeholder="Ex: A101, B205..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center">
                <HomeIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Unidades</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredUnits.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <UsersIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Moradores</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalResidents}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Convidados Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalActiveGuests}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <EyeIcon className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Reconhecimento Facial</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalWithFaceRecognition}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Lista de Unidades */}
        <div className="space-y-4">
          {filteredUnits.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <HomeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma unidade encontrada</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filterUnit ? 'Tente ajustar os filtros de busca.' : 'Nenhuma unidade com moradores cadastrados.'}
                </p>
              </div>
            </Card>
          ) : (
            filteredUnits.map((unitData) => {
              const unitKey = `${unitData.unit.block}${unitData.unit.number}`;
              const isExpanded = expandedUnits.has(unitKey);
              const activeGuests = unitData.guests.filter(guest => isGuestActive(guest));
              
              return (
                <Card key={unitKey} className="overflow-hidden">
                  {/* Cabeçalho da Unidade */}
                  <div className="p-6 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <HomeIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            Unidade {unitData.unit.block}{unitData.unit.number}
                            {unitData.unit.floor && (
                              <span className="text-sm text-gray-500 ml-2">
                                • {unitData.unit.floor}º andar
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <UsersIcon className="h-4 w-4 mr-1" />
                              {unitData.residents.length} morador(es)
                            </span>
                            <span className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {activeGuests.length} convidado(s) ativo(s)
                            </span>
                            <span className="flex items-center">
                              <EyeIcon className="h-4 w-4 mr-1" />
                              {unitData.residents.filter(r => r.user.faceRecognitionEnabled).length} com reconhecimento facial
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isAdmin && (
                          <Button
                            onClick={() => handleCreateGuestForUnit(unitData)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Convidado
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => toggleUnitExpansion(unitKey)}
                          variant="outline"
                          size="sm"
                          className="flex items-center"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUpIcon className="h-4 w-4 mr-1" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <ChevronDownIcon className="h-4 w-4 mr-1" />
                              Expandir
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="p-6 space-y-6">
                      {/* Moradores */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <UserGroupIcon className="h-5 w-5 mr-2" />
                          Moradores ({unitData.residents.length})
                        </h4>
                        
                        {unitData.residents.length === 0 ? (
                          <p className="text-gray-500 italic">Nenhum morador cadastrado</p>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {unitData.residents.map((resident) => (
                              <Card key={resident.id} className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                        <UsersIcon className="h-5 w-5 text-gray-600" />
                                      </div>
                                      <div>
                                        <h5 className="font-semibold text-gray-900">{resident.user.name}</h5>
                                        <p className="text-sm text-gray-600">{getRelationshipTypeLabel(resident.relationshipType)}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                                      <p>{resident.user.email}</p>
                                      {resident.user.phone && <p>Tel: {formatPhone(resident.user.phone)}</p>}
                                      {resident.user.document && <p>CPF: {formatCPF(resident.user.document)}</p>}
                                      {resident.user.lastLogin && (
                                        <p>Último acesso: {formatDate(resident.user.lastLogin)}</p>
                                      )}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2">
                                      {resident.user.faceRecognitionEnabled && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <EyeIcon className="h-3 w-3 mr-1" />
                                          Reconhecimento Facial
                                        </span>
                                      )}
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        resident.isActive 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {resident.isActive ? 'Ativo' : 'Inativo'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {isAdmin && (
                                    <Button
                                      onClick={() => handleEditResident(resident)}
                                      variant="outline"
                                      size="sm"
                                      className="ml-4"
                                    >
                                      Editar
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Convidados */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <ClockIcon className="h-5 w-5 mr-2" />
                          Convidados ({unitData.guests.length})
                        </h4>
                        
                        {unitData.guests.length === 0 ? (
                          <p className="text-gray-500 italic">Nenhum convidado cadastrado</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {unitData.guests.map((guest) => (
                              <div
                                key={guest.id}
                                className={`p-4 rounded-lg border text-sm ${
                                  isGuestActive(guest)
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-medium text-gray-900">{guest.name}</div>
                                  {isAdmin && (
                                    <Button
                                      onClick={() => handleEditGuest(guest)}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs px-2 py-1 h-6"
                                    >
                                      Editar
                                    </Button>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div className="font-mono">Código: {guest.accessCode}</div>
                                  <div>
                                    Válido: {formatDate(guest.validFrom)} até {formatDate(guest.validUntil)}
                                  </div>
                                  <div>
                                    Entradas: {guest.currentEntries}/{guest.maxEntries}
                                  </div>
                                  {guest.faceRecognitionEnabled && (
                                    <div className="flex items-center text-blue-600">
                                      <EyeIcon className="h-3 w-3 mr-1" />
                                      Reconhecimento Facial
                                    </div>
                                  )}
                                  <div className={`font-medium ${
                                    isGuestActive(guest) ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {isGuestActive(guest) ? 'Ativo' : 'Expirado/Esgotado'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Modais */}
      {isCreateResidentModalOpen && (
        <CreateResidentModal
          isOpen={isCreateResidentModalOpen}
          onClose={handleCloseModals}
          onSuccess={fetchUnitsData}
        />
      )}

      {isCreateGuestModalOpen && selectedUnitForGuest && (
        <CreateGuestModal
          isOpen={isCreateGuestModalOpen}
          onClose={handleCloseModals}
          unit={selectedUnitForGuest.unit}
          residents={selectedUnitForGuest.residents}
        />
      )}

      {isEditResidentModalOpen && selectedResident && (
        <EditResidentModal
          isOpen={isEditResidentModalOpen}
          onClose={handleCloseModals}
          onSuccess={fetchUnitsData}
          resident={selectedResident}
          condominiumId={selectedResident.condominium.id}
        />
      )}

      {isEditGuestModalOpen && selectedGuest && (
        <EditGuestModal
          isOpen={isEditGuestModalOpen}
          onClose={() => {
            setIsEditGuestModalOpen(false);
            setSelectedGuest(null);
          }}
          onSuccess={handleGuestUpdated}
          guest={selectedGuest}
        />
      )}
    </MainLayout>
  );
}
