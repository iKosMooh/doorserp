'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/main-layout';
import CreateGuestModal from '@/components/CreateGuestModal';
import ResidentQRCodeModal from '@/components/ResidentQRCodeModal';
import { formatCPF, formatPhone } from '@/lib/utils';
import { 
  UserIcon, 
  HomeIcon, 
  ClockIcon, 
  PlusIcon,
  EyeIcon,
  KeyIcon,
  CalendarIcon,
  UsersIcon,
  QrCodeIcon
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
  timestamp: string;
  personName: string;
  personType: 'RESIDENT' | 'EMPLOYEE' | 'GUEST';
  accessType: 'ENTRY' | 'EXIT';
  method: string;
  location: string;
  status: 'APPROVED' | 'DENIED' | 'FORCED';
  unitNumber?: string;
  building?: string;
  notes?: string;
}

export default function ResidentDashboard() {
  const [resident, setResident] = useState<Resident | null>(null);
  const [recentAccess, setRecentAccess] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateGuestModalOpen, setIsCreateGuestModalOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);

  useEffect(() => {
    fetchResidentData();
  }, []);

  useEffect(() => {
    if (resident) {
      fetchRecentAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resident]);

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
      // Buscar apenas logs de acesso do morador logado e seus convidados
      const response = await fetch('/api/access-logs?limit=100');
      
      if (response.ok) {
        const logs = await response.json();
        console.log('📊 Total de logs recebidos:', logs.length);
        
        if (resident && Array.isArray(logs)) {
          console.log('👤 Morador:', resident.user.name);
          console.log('🏠 Unidade:', resident.unit.number);
          console.log('🏢 Bloco:', resident.unit.block);
          console.log('👥 Convidados:', resident.guests.map(g => g.name));
          
          // Filtrar logs apenas da unidade do morador
          const filteredLogs = logs.filter((log: {
            personName: string;
            unitNumber?: string;
            building?: string;
          }) => {
            // Ignorar logs sem identificação válida
            if (!log.personName || 
                log.personName === 'Usuário Desconhecido' || 
                log.personName === 'QR Code Inválido' ||
                log.personName.includes('Desconhecido') ||
                log.personName.includes('não identificada')) {
              return false;
            }

            // Deve ter unitNumber
            if (!log.unitNumber) {
              console.log('❌ Log sem unitNumber:', log.personName);
              return false;
            }
            
            // Verificar se é da mesma unidade
            const isSameUnit = log.unitNumber === resident.unit.number &&
                              (!log.building || !resident.unit.block || log.building === resident.unit.block);
            
            // Verificar se é o morador ou seus convidados
            const isResidentOrGuest = log.personName === resident.user.name ||
                                     resident.guests.some(guest => guest.name === log.personName);
            
            if (!isSameUnit) {
              console.log('❌ Unidade diferente:', log.personName, '- Unidade:', log.unitNumber, 'Bloco:', log.building);
            }
            
            if (!isResidentOrGuest) {
              console.log('❌ Pessoa não é morador nem convidado:', log.personName);
            }
            
            return isSameUnit && isResidentOrGuest;
          });
          
          console.log('✅ Logs filtrados:', filteredLogs.length);
          console.log('📋 Logs:', filteredLogs.map(l => ({ 
            nome: l.personName, 
            unidade: l.unitNumber, 
            timestamp: l.timestamp 
          })));
          
          setRecentAccess(filteredLogs.slice(0, 10)); // Limitar a 10
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
    if (!guest.isActive) return false;
    
    const now = new Date();
    const validFrom = new Date(guest.validFrom);
    const validUntil = guest.validUntil ? new Date(guest.validUntil) : null;
    
    // Se ainda não começou a validade, considera como ativo (Aguardando Início)
    if (validFrom > now) return true;
    
    // Se expirou, não é ativo
    if (validUntil && validUntil < now) return false;
    
    // Se esgotou as entradas, não é ativo
    if (guest.currentEntries >= guest.maxEntries) return false;
    
    return true;
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
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Painel do Morador
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                Bem-vindo, {resident.user.name}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setIsQRCodeModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 min-h-[44px] w-full sm:w-auto justify-center"
              >
                <QrCodeIcon className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Meu QR Code</span>
                <span className="sm:hidden">QR Code</span>
              </Button>
              
              <Button
                onClick={() => setIsCreateGuestModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto justify-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Convidado
              </Button>
            </div>
          </div>
        </div>

        {/* Informações do Morador */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="lg:col-span-2 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto sm:mx-0">
                <UserIcon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {resident.user.name}
                </h2>
                <div className="text-sm text-gray-600 space-y-1 mt-2">
                  <div className="flex items-center justify-center sm:justify-start">
                    <HomeIcon className="h-4 w-4 mr-2" />
                    Unidade: {resident.unit.block}{resident.unit.number}
                    {resident.unit.floor && ` - ${resident.unit.floor}º andar`}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start">
                    <KeyIcon className="h-4 w-4 mr-2" />
                    Tipo: {resident.relationshipType}
                  </div>
                  <p className="text-xs sm:text-sm">{resident.user.email}</p>
                  {resident.user.phone && <p>Tel: {formatPhone(resident.user.phone)}</p>}
                  {resident.user.document && <p>CPF: {formatCPF(resident.user.document)}</p>}
                </div>
              </div>
              
              <div className="text-center sm:text-right">
                {resident.user.faceRecognitionEnabled && (
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Reconhecimento Facial Ativo</span>
                    <span className="sm:hidden">Facial Ativo</span>
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

          <Card className="p-4 sm:p-6">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mb-2">
                {resident.condominium.name}
              </div>
              <p className="text-sm sm:text-base text-gray-600">Seu Condomínio</p>
            </div>
          </Card>
        </div>

        {/* Estatísticas dos Convidados */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center">
              <UsersIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{resident.guests.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{getActiveGuests().length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Expirados</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{getExpiredGuests().length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center">
              <EyeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mr-2 sm:mr-3" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {(() => {
                    const today = new Date();
                    const todayLogs = recentAccess.filter(log => {
                      const logDate = new Date(log.timestamp);
                      return logDate.getDate() === today.getDate() &&
                             logDate.getMonth() === today.getMonth() &&
                             logDate.getFullYear() === today.getFullYear();
                    });
                    return todayLogs.length;
                  })()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Convidados Ativos */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Convidados Ativos ({getActiveGuests().length})
              </h3>
              <Button
                onClick={() => setIsCreateGuestModalOpen(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 min-h-[44px] w-full sm:w-auto"
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
                          {guest.phone && <div>Tel: {formatPhone(guest.phone)}</div>}
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
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
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
                      log.status === 'APPROVED' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {log.personName}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          <div>
                            {log.accessType === 'ENTRY' ? 'Entrada' : 'Saída'} via {log.method}
                          </div>
                          <div>{formatDate(log.timestamp)}</div>
                          {log.location && <div>{log.location}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status === 'APPROVED' ? 'Aprovado' : 'Negado'}
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
          <Card className="p-4 sm:p-6 mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
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

      {/* Modal do QR Code do Morador */}
      {isQRCodeModalOpen && resident && (
        <ResidentQRCodeModal
          isOpen={isQRCodeModalOpen}
          onClose={() => setIsQRCodeModalOpen(false)}
          resident={resident}
        />
      )}
    </MainLayout>
  );
}
