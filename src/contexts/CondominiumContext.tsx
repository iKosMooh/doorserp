"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

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

interface CondominiumContextType {
  selectedCondominium: Condominium | null;
  condominiums: Condominium[];
  setSelectedCondominium: (condominium: Condominium | null) => void;
  loadCondominiums: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined);

export function CondominiumProvider({ children }: { children: ReactNode }) {
  const [selectedCondominium, setSelectedCondominium] = useState<Condominium | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCondominiums = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/condominiums');
      if (!response.ok) {
        throw new Error('Erro ao carregar condomínios');
      }
      
      const data = await response.json();
      setCondominiums(data.condominiums || []);
      
      // Se não há condomínio selecionado e existe pelo menos um, seleciona o primeiro
      if (!selectedCondominium && data.condominiums?.length > 0) {
        const stored = localStorage.getItem('selectedCondominiumId');
        const storedCondominium = stored 
          ? data.condominiums.find((c: Condominium) => c.id === stored)
          : data.condominiums[0];
        
        setSelectedCondominium(storedCondominium || data.condominiums[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao carregar condomínios:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCondominium]);

  // Salvar condomínio selecionado no localStorage
  useEffect(() => {
    if (selectedCondominium) {
      localStorage.setItem('selectedCondominiumId', selectedCondominium.id);
    }
  }, [selectedCondominium]);

  // Carregar condomínios na inicialização
  useEffect(() => {
    loadCondominiums();
  }, [loadCondominiums]);

  const value: CondominiumContextType = {
    selectedCondominium,
    condominiums,
    setSelectedCondominium,
    loadCondominiums,
    loading,
    error
  };

  return (
    <CondominiumContext.Provider value={value}>
      {children}
    </CondominiumContext.Provider>
  );
}

export function useCondominium() {
  const context = useContext(CondominiumContext);
  if (context === undefined) {
    throw new Error('useCondominium deve ser usado dentro de um CondominiumProvider');
  }
  return context;
}
