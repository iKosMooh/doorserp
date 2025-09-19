"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

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
  refreshCondominiums: () => Promise<void>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined);

export function CondominiumProvider({ children }: { children: ReactNode }) {
  const [selectedCondominium, setSelectedCondominium] = useState<Condominium | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const loadCondominiums = useCallback(async () => {
    // Evita múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/condominiums');
      if (!response.ok) {
        throw new Error('Erro ao carregar condomínios');
      }
      
      const data = await response.json();
      setCondominiums(data.condominiums || []);
      
      // Se não há condomínio selecionado e existe pelo menos um, seleciona o primeiro
      setSelectedCondominium(prev => {
        if (!prev && data.condominiums?.length > 0) {
          const stored = localStorage.getItem('selectedCondominiumId');
          const storedCondominium = stored 
            ? data.condominiums.find((c: Condominium) => c.id === stored)
            : data.condominiums[0];
          
          return storedCondominium || data.condominiums[0];
        }
        return prev;
      });
      
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao carregar condomínios:', err);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Salvar condomínio selecionado no localStorage
  useEffect(() => {
    if (selectedCondominium) {
      localStorage.setItem('selectedCondominiumId', selectedCondominium.id);
    }
  }, [selectedCondominium]);

  // Carregar condomínios na inicialização apenas uma vez - com proteção dupla
  useEffect(() => {
    if (!hasInitializedRef.current && !isLoadingRef.current) {
      hasInitializedRef.current = true;
      
      const initializeCondominiums = async () => {
        if (isLoadingRef.current) return;
        
        try {
          isLoadingRef.current = true;
          setLoading(true);
          setError(null);
          
          const response = await fetch('/api/condominiums');
          if (!response.ok) {
            throw new Error('Erro ao carregar condomínios');
          }
          
          const data = await response.json();
          setCondominiums(data.condominiums || []);
          
          // Se não há condomínio selecionado e existe pelo menos um, seleciona o primeiro
          if (data.condominiums?.length > 0) {
            const stored = localStorage.getItem('selectedCondominiumId');
            const storedCondominium = stored 
              ? data.condominiums.find((c: Condominium) => c.id === stored)
              : data.condominiums[0];
            
            setSelectedCondominium(storedCondominium || data.condominiums[0]);
          }
          
          setInitialized(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
          console.error('Erro ao carregar condomínios:', err);
          hasInitializedRef.current = false; // Reset em caso de erro
        } finally {
          isLoadingRef.current = false;
          setLoading(false);
        }
      };

      initializeCondominiums();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: CondominiumContextType = {
    selectedCondominium,
    condominiums,
    setSelectedCondominium,
    refreshCondominiums: loadCondominiums,
    loading,
    error,
    initialized
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
