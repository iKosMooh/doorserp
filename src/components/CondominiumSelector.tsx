'use client';

import React, { useState } from 'react';
import { useCondominium } from '@/contexts/CondominiumContext';
import { useAuth } from '@/contexts/AuthContext';
import { CreateCondominiumModal } from './CreateCondominiumModal';
import { ChevronDown, Building, Plus } from 'lucide-react';

interface Condominium {
  id: string;
  name: string;
  cnpj: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  email: string | null;
  adminContact: string | null;
  totalUnits: number;
  isActive: boolean;
  subscriptionPlan: string;
  subscriptionExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CondominiumSelectorProps {
  collapsed?: boolean;
}

export function CondominiumSelector({ collapsed = false }: CondominiumSelectorProps) {
  const { user } = useAuth();
  const { 
    selectedCondominium, 
    setSelectedCondominium, 
    condominiums, 
    refreshCondominiums,
    loading: contextLoading 
  } = useCondominium();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Remover o useEffect que estava causando o loop
  // O contexto já carrega automaticamente os condomínios

  const handleCreateCondominiumSuccess = async () => {
    await refreshCondominiums();
    setShowCreateModal(false);
  };

  const handleCondominiumSelect = (condominium: Condominium) => {
    setSelectedCondominium(condominium);
    setIsOpen(false);
    setSearchFilter('');
  };

  // Filtrar condomínios baseado na busca
  const filteredCondominiums = condominiums.filter(condominium =>
    condominium.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    condominium.city.toLowerCase().includes(searchFilter.toLowerCase()) ||
    condominium.state.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (!user) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
          title={selectedCondominium ? selectedCondominium.name : 'Selecionar Condomínio'}
        >
          <Building className="w-5 h-5 text-gray-600" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-12 top-0 z-20 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-2">Selecionar Condomínio</p>
                {condominiums.length > 3 && (
                  <input
                    type="text"
                    placeholder="Buscar condomínio..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
              
              {contextLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Carregando...
                </div>
              ) : condominiums.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Nenhum condomínio disponível
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {user?.isAdmin && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowCreateModal(true);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors text-green-700 border-b border-gray-100"
                    >
                      <div className="flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Criar Novo Condomínio</span>
                      </div>
                    </button>
                  )}
                  {filteredCondominiums.map((condominium: Condominium) => (
                    <button
                      key={condominium.id}
                      onClick={() => handleCondominiumSelect(condominium)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedCondominium?.id === condominium.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="text-sm font-medium">{condominium.name}</div>
                      <div className="text-xs text-gray-500">{condominium.city}, {condominium.state}</div>
                    </button>
                  ))}
                  {filteredCondominiums.length === 0 && searchFilter && (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Nenhum condomínio encontrado para &ldquo;{searchFilter}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
        disabled={contextLoading}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Building className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            {contextLoading ? (
              <div className="text-sm text-gray-500">Carregando...</div>
            ) : selectedCondominium ? (
              <>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {selectedCondominium.name}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedCondominium.city}, {selectedCondominium.state}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Selecionar Condomínio</div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-2">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Condomínios Disponíveis</p>
              {condominiums.length > 3 && (
                <input
                  type="text"
                  placeholder="Buscar condomínio..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            
            {contextLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                Carregando condomínios...
              </div>
            ) : condominiums.length === 0 ? (
              <div className="px-4 py-3">
                <div className="text-sm text-gray-500 mb-2">
                  Nenhum condomínio disponível
                </div>
                {user?.isAdmin && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Condomínio</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {user?.isAdmin && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors text-green-700 border-b border-gray-100"
                  >
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Criar Novo Condomínio</span>
                    </div>
                  </button>
                )}
                {filteredCondominiums.map((condominium: Condominium) => (
                  <button
                    key={condominium.id}
                    onClick={() => handleCondominiumSelect(condominium)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedCondominium?.id === condominium.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{condominium.name}</div>
                        <div className="text-xs text-gray-500">{condominium.city}, {condominium.state}</div>
                      </div>
                      {selectedCondominium?.id === condominium.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
                {filteredCondominiums.length === 0 && searchFilter && (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Nenhum condomínio encontrado para &ldquo;{searchFilter}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Modal de Criação de Condomínio */}
      <CreateCondominiumModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateCondominiumSuccess}
      />
    </div>
  );
}
