'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

export default function LogoutPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(true);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const performLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setLogoutSuccess(true);
        setIsLoggingOut(false);
        
        // Limpar qualquer dados locais
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        throw new Error('Erro ao fazer logout');
      }
    } catch (error) {
      console.error('Erro durante logout:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setIsLoggingOut(false);
    }
  }, [router]);

  useEffect(() => {
    performLogout();
  }, [performLogout]);

  const handleManualRedirect = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-full">
            <ArrowRightOnRectangleIcon className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Fazendo Logout
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Encerrando sua sessão com segurança
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isLoggingOut && (
            <div className="text-center">
              <div className="animate-spin mx-auto h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Fazendo logout...
              </h3>
              <p className="text-sm text-gray-600">
                Aguarde enquanto encerramos sua sessão
              </p>
            </div>
          )}

          {logoutSuccess && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Logout realizado com sucesso!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Você será redirecionado para a página de login em instantes...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <Button
                onClick={handleManualRedirect}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Ir para Login Agora
              </Button>
            </div>
          )}

          {error && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Erro no Logout
              </h3>
              <p className="text-sm text-red-600 mb-4">
                {error}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={performLogout}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Tentar Novamente
                </Button>
                <Button
                  onClick={handleManualRedirect}
                  variant="outline"
                  className="w-full"
                >
                  Ir para Login
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Problemas com o logout?{' '}
            <button
              onClick={handleManualRedirect}
              className="text-blue-600 hover:text-blue-500 underline"
            >
              Clique aqui para ir ao login
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          © 2025 DoorsERP - Sistema de Portaria Digital
        </p>
      </div>
    </div>
  );
}