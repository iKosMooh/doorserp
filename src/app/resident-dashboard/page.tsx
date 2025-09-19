'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/main-layout';
import CreateGuestModal from '@/components/CreateGuestModal';
import { 
  UserIcon, 
  HomeIcon, 
  ClockIcon, 
  PlusIcon,
  EyeIcon,
  KeyIcon,
  CalendarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

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
  document?: string;
  phone?: string;
  validFrom: string;
  validUntil: string;
  accessCode: string;
  currentEntries: number;
  maxEntries: number;
  isActive: boolean;
  observations?: string;
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

interface AccessLog {
  id: string;
  accessType: string;
  accessMethod: string;
  success: boolean;
  createdAt: string;
  user?: User;
  guest?: Guest;
}

export default function ResidentDashboard() {
  const [resident, setResident] = useState<Resident | null>(null);
  const [recentAccess, setRecentAccess] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateGuestModalOpen, setIsCreateGuestModalOpen] = useState(false);

  useEffect(() => {
    fetchResidentData();
    fetchRecentAccess();
  }, []);

  const fetchResidentData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/residents-management');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do morador');
      }

      const data = await response.json();
      
      if (data.success && data.residents.length > 0) {
        setResident(data.residents[0]); // Assume que o morador logado é o primeiro
      } else {
        setError(data.message || 'Nenhum dados de morador encontrado');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAccess = async () => {
    try {
      const response = await fetch('/api/access-logs?limit=10');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentAccess(data.logs);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar logs de acesso:', error);
    }
  };

  const handleCloseModal = () => {
    setIsCreateGuestModalOpen(false);
    fetchResidentData(); // Recarregar dados após criar convidado
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isGuestActive = (guest: Guest) => {
    const now = new Date();
    const validFrom = new Date(guest.validFrom);
    const validUntil = new Date(guest.validUntil);
    
    return now >= validFrom && now <= validUntil && guest.currentEntries < guest.maxEntries && guest.isActive;
  };

  const getActiveGuests = () => {
    return resident?.guests.filter(guest => isGuestActive(guest)) || [];
  };

  const getExpiredGuests = () => {
    return resident?.guests.filter(guest => !isGuestActive(guest)) || [];
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

  if (error || !resident) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6">
            <div className="text-center">
              <div className="text-red-600 text-lg font-medium mb-4">
                Erro ao carregar dados
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchResidentData}>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Painel do Morador
              </h1>
              <p className="text-gray-600 mt-2">
                Bem-vindo, {resident.user.name}
              </p>
            </div>
            
            <Button
              onClick={() => setIsCreateGuestModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Novo Convidado
            </Button>
          </div>
        </div>

        {/* Informações do Morador */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-blue-600" />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {resident.user.name}
                </h2>
                <div className="text-sm text-gray-600 space-y-1 mt-2">
                  <div className="flex items-center">
                    <HomeIcon className="h-4 w-4 mr-2" />
                    Unidade: {resident.unit.block}{resident.unit.number}
                    {resident.unit.floor && ` - ${resident.unit.floor}º andar`}
                  </div>
                  <div className="flex items-center">
                    <KeyIcon className="h-4 w-4 mr-2" />
                    Tipo: {resident.relationshipType}
                  </div>
                  <p>{resident.user.email}</p>
                  {resident.user.phone && <p>Tel: {resident.user.phone}</p>}
                  {resident.user.document && <p>CPF: {resident.user.document}</p>}
                </div>
              </div>
              
              <div className="text-right">
                {resident.user.faceRecognitionEnabled && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Reconhecimento Facial Ativo
                  </span>
                )}
                {resident.user.lastLogin && (
                  <p className="text-xs text-gray-500 mt-2">
                    Último acesso: {formatDate(resident.user.lastLogin)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {resident.condominium.name}
              </div>
              <p className="text-gray-600">Seu Condomínio</p>
            </div>
          </Card>
        </div>

        {/* Estatísticas dos Convidados */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Convidados</p>
                <p className="text-2xl font-bold text-gray-900">{resident.guests.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Convidados Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{getActiveGuests().length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Expirados</p>
                <p className="text-2xl font-bold text-gray-900">{getExpiredGuests().length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Acessos Hoje</p>
                <p className="text-2xl font-bold text-gray-900">
                  {recentAccess.filter(log => {
                    const today = new Date().toDateString();
                    return new Date(log.createdAt).toDateString() === today;
                  }).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Convidados Ativos */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Convidados Ativos ({getActiveGuests().length})
              </h3>
              <Button
                onClick={() => setIsCreateGuestModalOpen(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getActiveGuests().length === 0 ? (
                <div className="text-center py-8">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum convidado ativo</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Crie um novo convidado para dar acesso temporário.
                  </p>
                </div>
              ) : (
                getActiveGuests().map((guest) => (
                  <div
                    key={guest.id}
                    className="p-4 bg-green-50 border border-green-200 rounded-md"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{guest.name}</h4>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>Código: <span className="font-mono font-bold">{guest.accessCode}</span></div>
                          <div>
                            Válido: {formatDateShort(guest.validFrom)} até {formatDateShort(guest.validUntil)}
                          </div>
                          <div>
                            Entradas: {guest.currentEntries}/{guest.maxEntries}
                          </div>
                          {guest.phone && <div>Tel: {guest.phone}</div>}
                          {guest.observations && (
                            <div className="text-xs bg-white p-2 rounded border">
                              {guest.observations}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Acessos Recentes */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Acessos Recentes
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentAccess.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum acesso recente</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Os acessos aparecerão aqui quando ocorrerem.
                  </p>
                </div>
              ) : (
                recentAccess.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-md border ${
                      log.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {log.user ? log.user.name : log.guest?.name || 'Usuário desconhecido'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          <div>{log.accessType} via {log.accessMethod}</div>
                          <div>{formatDate(log.createdAt)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'Sucesso' : 'Falhou'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Convidados Expirados/Inativos */}
        {getExpiredGuests().length > 0 && (
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Convidados Expirados/Inativos ({getExpiredGuests().length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getExpiredGuests().map((guest) => (
                <div
                  key={guest.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-md"
                >
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{guest.name}</div>
                    <div className="text-gray-600 mt-1">
                      <div>Código: {guest.accessCode}</div>
                      <div>Expirou: {formatDateShort(guest.validUntil)}</div>
                      <div>Usou: {guest.currentEntries}/{guest.maxEntries}</div>
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {!guest.isActive ? 'Inativo' : 'Expirado'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Modal de Novo Convidado */}
      {isCreateGuestModalOpen && resident && (
        <CreateGuestModal
          isOpen={isCreateGuestModalOpen}
          onClose={handleCloseModal}
          resident={resident}
        />
      )}
    </MainLayout>
  );
}
