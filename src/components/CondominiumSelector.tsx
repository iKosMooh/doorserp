"use client";

import { useState, useRef, useEffect } from "react";
import { useCondominium } from "@/contexts/CondominiumContext";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  Check,
  Plus,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCondominiumModal } from "@/components/CreateCondominiumModal";

interface CondominiumSelectorProps {
  collapsed?: boolean;
}

export function CondominiumSelector({ collapsed }: CondominiumSelectorProps) {
  const { 
    selectedCondominium, 
    condominiums, 
    setSelectedCondominium, 
    loading, 
    error,
    loadCondominiums 
  } = useCondominium();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSuccess = () => {
    loadCondominiums(); // Recarregar a lista de condomínios
  };

  const handleCreateClick = () => {
    setIsOpen(false);
    setShowCreateModal(true);
  };

  if (collapsed) {
    return (
      <>
        <div className="flex justify-center mb-4">
          <div 
            className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center cursor-pointer"
            title={selectedCondominium?.name || "Selecionar Condomínio"}
            onClick={() => setShowCreateModal(true)}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
        </div>
        <CreateCondominiumModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando condomínios...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Erro ao carregar condomínios</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadCondominiums}
          className="w-full text-xs"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!condominiums.length) {
    return (
      <>
        <div className="mb-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="flex items-center space-x-2 text-yellow-700 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Nenhum condomínio encontrado</span>
          </div>
          <p className="text-xs text-yellow-600 mb-2">
            Cadastre o primeiro condomínio para começar.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Cadastrar Condomínio
          </Button>
        </div>
        <CreateCondominiumModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4" ref={dropdownRef}>
        <div className="text-xs font-medium text-gray-500 mb-2 px-1">
          CONDOMÍNIO SELECIONADO
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl",
              "flex items-center justify-between transition-all duration-200",
              "hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200/50",
              isOpen && "ring-2 ring-blue-300"
            )}
          >
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 flex-shrink-0" />
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {selectedCondominium?.name || "Selecionar Condomínio"}
                </div>
                {selectedCondominium && (
                  <div className="text-xs text-blue-100 truncate">
                    {selectedCondominium.city}, {selectedCondominium.state}
                  </div>
                )}
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            )}
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
              <div className="p-2">
                {condominiums.map((condominium) => {
                  const isSelected = selectedCondominium?.id === condominium.id;
                  return (
                    <button
                      key={condominium.id}
                      onClick={() => {
                        setSelectedCondominium(condominium);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all duration-200",
                        "flex items-center justify-between group",
                        isSelected
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Building2 className={cn(
                          "w-4 h-4 flex-shrink-0",
                          isSelected ? "text-blue-600" : "text-gray-400"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {condominium.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {condominium.city}, {condominium.state}
                          </div>
                          <div className="text-xs text-gray-400">
                            {condominium.totalUnits} unidades
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="border-t border-gray-200 p-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-gray-600 hover:text-gray-900"
                  onClick={handleCreateClick}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Novo Condomínio
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <CreateCondominiumModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
