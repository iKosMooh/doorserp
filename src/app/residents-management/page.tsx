'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/main-layout';
import { CreateResidentModal } from '@/components/CreateResidentModal';
import CreateGuestModal from '@/components/CreateGuestModal';
// import { EditResidentModal } from '@/components/EditResidentModal';
import { PlusIcon, UsersIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  photo?: string;
  faceRecognitionEnabled: boolean;
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
}

interface Resident {
  id: string;
  relationshipType: string;
  isActive: boolean;
  user: User;
  unit: Unit;
  condominium: Condominium;
  guests: Guest[];
}



export default function ResidentManagementPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateResidentModalOpen, setIsCreateResidentModalOpen] = useState(false);
  const [isCreateGuestModalOpen, setIsCreateGuestModalOpen] = useState(false);
  // const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  // const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedResidentForGuest, setSelectedResidentForGuest] = useState<Resident | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  useEffect(() => {
    fetchUserInfo();
    fetchResidents();
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

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/residents-management');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar moradores');
      }

      const data = await response.json();
      
      if (data.success) {
        setResidents(data.residents);
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
    // setSelectedResident(resident);
    // setIsEditResidentModalOpen(true);
    console.log('Editar morador:', resident);
  };

  const handleCreateGuest = (resident: Resident) => {
    setSelectedResidentForGuest(resident);
    setIsCreateGuestModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateResidentModalOpen(false);
    setIsCreateGuestModalOpen(false);
    // setIsEditResidentModalOpen(false);
    // setSelectedResident(null);
    setSelectedResidentForGuest(null);
    fetchResidents(); // Recarregar dados após alterações
  };

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = resident.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resident.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${resident.unit.block}${resident.unit.number}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUnit = filterUnit === '' || 
                       `${resident.unit.block}${resident.unit.number}`.toLowerCase().includes(filterUnit.toLowerCase());

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
    const now = new Date();
    const validFrom = new Date(guest.validFrom);
    const validUntil = new Date(guest.validUntil);
    
    return now >= validFrom && now <= validUntil && guest.currentEntries < guest.maxEntries;
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
              <Button onClick={fetchResidents}>
                Tentar Novamente
              </Button>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gerenciamento de Moradores
              </h1>
              <p className="text-gray-600 mt-2">
                {isAdmin ? 'Gerencie moradores e seus convidados' : 'Visualize moradores da sua unidade e gerencie convidados'}
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
                Buscar por nome, email ou unidade
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
                Filtrar por unidade
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center">
                <UsersIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Moradores</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredResidents.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Convidados Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredResidents.reduce((total, resident) => 
                      total + resident.guests.filter(guest => isGuestActive(guest)).length, 0
                    )}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center">
                <EyeIcon className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Reconhecimento Facial</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredResidents.filter(resident => resident.user.faceRecognitionEnabled).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Lista de Moradores */}
        <div className="space-y-4">
          {filteredResidents.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum morador encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filterUnit ? 'Tente ajustar os filtros de busca.' : 'Comece adicionando um novo morador.'}
                </p>
              </div>
            </Card>
          ) : (
            filteredResidents.map((resident) => (
              <Card key={resident.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  {/* Informações do Morador */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                        <UsersIcon className="h-8 w-8 text-gray-600" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {resident.user.name}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>{resident.user.email}</p>
                          {resident.user.phone && <p>Tel: {resident.user.phone}</p>}
                          {resident.user.document && <p>CPF: {resident.user.document}</p>}
                          <p>
                            Unidade: {resident.unit.block}{resident.unit.number}
                            {resident.unit.floor && ` - ${resident.unit.floor}º andar`}
                          </p>
                          <p>Tipo: {resident.relationshipType}</p>
                          {resident.user.lastLogin && (
                            <p>Último acesso: {formatDate(resident.user.lastLogin)}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {resident.user.faceRecognitionEnabled && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <EyeIcon className="h-3 w-3 mr-1" />
                              Reconhecimento Facial
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            resident.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {resident.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Convidados */}
                    {resident.guests.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Convidados ({resident.guests.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {resident.guests.map((guest) => (
                            <div
                              key={guest.id}
                              className={`p-3 rounded-md border text-sm ${
                                isGuestActive(guest)
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="font-medium">{guest.name}</div>
                              <div className="text-xs text-gray-600 mt-1 space-y-1">
                                <div>Código: {guest.accessCode}</div>
                                <div>
                                  Válido: {formatDate(guest.validFrom)} até {formatDate(guest.validUntil)}
                                </div>
                                <div>
                                  Entradas: {guest.currentEntries}/{guest.maxEntries}
                                </div>
                                <div className={`font-medium ${
                                  isGuestActive(guest) ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {isGuestActive(guest) ? 'Ativo' : 'Expirado/Esgotado'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col space-y-2 mt-4 lg:mt-0 lg:ml-6">
                    <Button
                      onClick={() => handleCreateGuest(resident)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      Novo Convidado
                    </Button>
                    
                    {isAdmin && (
                      <Button
                        onClick={() => handleEditResident(resident)}
                        variant="outline"
                        size="sm"
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modais */}
      {isCreateResidentModalOpen && (
        <CreateResidentModal
          isOpen={isCreateResidentModalOpen}
          onClose={handleCloseModals}
          onSuccess={fetchResidents}
        />
      )}

      {isCreateGuestModalOpen && selectedResidentForGuest && (
        <CreateGuestModal
          isOpen={isCreateGuestModalOpen}
          onClose={handleCloseModals}
          resident={selectedResidentForGuest}
        />
      )}

      {/* Modal de edição temporariamente desabilitado */}
      {/* {isEditResidentModalOpen && selectedResident && (
        <EditResidentModal
          isOpen={isEditResidentModalOpen}
          onClose={handleCloseModals}
          resident={selectedResident}
        />
      )} */}
    </MainLayout>
  );
}
