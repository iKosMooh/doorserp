import React from 'react'
import { X, CheckCircle, User, Clock, Home } from 'lucide-react'
import { Button } from './button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>
        <div className={title ? "p-6" : ""}>
          {children}
        </div>
      </div>
    </div>
  )
}

interface RecognizedPersonModalProps {
  isOpen: boolean
  onClose: () => void
  person: {
    name: string
    type: "RESIDENT" | "EMPLOYEE" | "GUEST"
    unitNumber?: string
    building?: string
    position?: string
    confidence: number
  } | null
  countdown: number
}

export function RecognizedPersonModal({ isOpen, onClose, person, countdown }: RecognizedPersonModalProps) {
  if (!person) return null

  const getPersonTypeLabel = (type: string) => {
    switch (type) {
      case 'RESIDENT': return 'Morador'
      case 'EMPLOYEE': return 'Funcionário'
      case 'GUEST': return 'Convidado'
      default: return type
    }
  }

  const getPersonTypeColor = (type: string) => {
    switch (type) {
      case 'RESIDENT': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EMPLOYEE': return 'bg-green-100 text-green-800 border-green-200'
      case 'GUEST': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        {/* Header com ícone de sucesso */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-600" />
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-75"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            Acesso Autorizado
          </h2>
          <h3 className="text-xl font-semibold text-green-800">
            Bem-vindo(a), {person.name}!
          </h3>
        </div>

        {/* Informações da pessoa */}
        <div className="space-y-4 mb-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tipo:</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getPersonTypeColor(person.type)}`}>
                {getPersonTypeLabel(person.type)}
              </span>
            </div>

            {person.unitNumber && person.building && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Unidade:</span>
                </div>
                <span className="text-lg font-semibold text-blue-600">
                  {person.building}-{person.unitNumber}
                </span>
              </div>
            )}

            {person.position && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Cargo:</span>
                </div>
                <span className="text-lg font-semibold">
                  {person.position}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Horário:</span>
              </div>
              <span className="text-lg font-semibold">
                {new Date().toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600">Confiança:</div>
                <div className="text-lg font-semibold text-green-700">
                  {(person.confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-600">Status:</div>
                <div className="text-lg font-semibold text-green-700">APROVADO</div>
              </div>
            </div>
          </div>

          {/* Informações do Arduino */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 font-medium mb-1">
              🔌 Sistema de Controle de Acesso
            </div>
            <div className="text-xs text-blue-600">
              • LED de acesso ativado por 5 segundos<br/>
              • Comunicação com Arduino via porta serial<br/>
              • Acesso liberado automaticamente
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-center">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">
              Retornando ao reconhecimento em:
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {countdown}s
            </div>
          </div>
          
          <Button 
            onClick={onClose}
            className="mt-4 w-full"
            variant="outline"
          >
            Continuar Reconhecimento
          </Button>
        </div>
      </div>
    </Modal>
  )
}
