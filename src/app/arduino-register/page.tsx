'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCondominium } from '@/contexts/CondominiumContext'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Microchip, 
  Wifi, 
  MapPin, 
  Settings,
  CheckCircle,
  XCircle,
  Search,
  Save,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface ArduinoDetectionResult {
  port: string
  manufacturer?: string
  vendorId?: string
  productId?: string
  serialNumber?: string
  connected: boolean
  boardInfo?: {
    name: string
    fqbn: string
    version: string
  }
}

interface ArduinoFormData {
  deviceName: string
  deviceCode: string
  connectionPort: string
  baudRate: number
  deviceLocation: string
  deviceType: string
  notes: string
}

export default function ArduinoRegisterPage() {
  const { user } = useAuth()
  const { selectedCondominium } = useCondominium()
  
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [detectedArduinos, setDetectedArduinos] = useState<ArduinoDetectionResult[]>([])
  const [availablePorts, setAvailablePorts] = useState<{ path: string; manufacturer?: string }[]>([])
  const [selectedArduino, setSelectedArduino] = useState<ArduinoDetectionResult | null>(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')

  const [formData, setFormData] = useState<ArduinoFormData>({
    deviceName: '',
    deviceCode: '',
    connectionPort: 'COM4',
    baudRate: 9600,
    deviceLocation: '',
    deviceType: 'MAIN_GATE',
    notes: ''
  })

  // Função para carregar portas
  const loadAvailablePorts = React.useCallback(async () => {
    try {
      const response = await fetch('/api/arduino?action=ports')
      const data = await response.json()
      if (data.ports) {
        setAvailablePorts(data.ports)
      }
    } catch (error) {
      console.error('Erro ao carregar portas:', error)
      showMessage('Erro ao carregar portas disponíveis', 'error')
    }
  }, [])

  useEffect(() => {
    loadAvailablePorts()
  }, [loadAvailablePorts])

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const scanForArduinos = async () => {
    if (!selectedCondominium) {
      showMessage('Selecione um condomínio primeiro', 'error')
      return
    }

    setIsScanning(true)
    setDetectedArduinos([])
    showMessage('Escaneando portas para detectar Arduinos...', 'info')

    try {
      const detectedDevices: ArduinoDetectionResult[] = []

      // Para cada porta disponível, tenta conectar e identificar
      for (const port of availablePorts) {
        try {
          showMessage(`Testando porta ${port.path}...`, 'info')
          
          // Tenta conectar na porta
          const connectResponse = await fetch('/api/arduino', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'connect', port: port.path })
          })

          if (connectResponse.ok) {
            const connectData = await connectResponse.json()
            
            if (connectData.success && connectData.connected) {
              // Envia comando para obter informações do dispositivo
              await new Promise(resolve => setTimeout(resolve, 2000)) // Aguarda estabilizar
              
              const infoResponse = await fetch('/api/arduino', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'command', command: 'INFO' })
              })

              const deviceInfo = {
                name: 'Arduino Detectado',
                fqbn: 'arduino:avr:uno',
                version: 'Desconhecida'
              }

              if (infoResponse.ok) {
                const infoData = await infoResponse.json()
                // Aqui você pode processar a resposta do Arduino para obter mais informações
                console.log('Resposta do dispositivo:', infoData)
              }

              detectedDevices.push({
                port: port.path,
                manufacturer: port.manufacturer || 'Desconhecido',
                connected: true,
                boardInfo: deviceInfo
              })

              // Desconecta após a detecção
              await fetch('/api/arduino', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect' })
              })
            }
          }
        } catch (error) {
          console.error(`Erro ao testar porta ${port.path}:`, error)
        }
      }

      setDetectedArduinos(detectedDevices)
      
      if (detectedDevices.length === 0) {
        showMessage('Nenhum Arduino detectado nas portas disponíveis', 'info')
      } else {
        showMessage(`${detectedDevices.length} Arduino(s) detectado(s)!`, 'success')
      }
    } catch (error) {
      console.error('Erro durante o scan:', error)
      showMessage('Erro durante a detecção de Arduinos', 'error')
    } finally {
      setIsScanning(false)
    }
  }

  const selectArduino = (arduino: ArduinoDetectionResult) => {
    setSelectedArduino(arduino)
    setFormData(prev => ({
      ...prev,
      connectionPort: arduino.port,
      deviceName: `Arduino ${arduino.port}`,
      deviceCode: `ARD_${arduino.port.replace('COM', '')}_${Date.now().toString().slice(-4)}`
    }))
    showMessage(`Arduino na porta ${arduino.port} selecionado`, 'success')
  }

  const handleInputChange = (field: keyof ArduinoFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveArduinoConfiguration = async () => {
    if (!selectedCondominium) {
      showMessage('Selecione um condomínio primeiro', 'error')
      return
    }

    if (!formData.deviceName || !formData.connectionPort) {
      showMessage('Nome do dispositivo e porta são obrigatórios', 'error')
      return
    }

    setIsSaving(true)

    try {
      const configData = {
        condominiumId: selectedCondominium.id,
        deviceName: formData.deviceName,
        deviceCode: formData.deviceCode || `ARD_${Date.now()}`,
        connectionPort: formData.connectionPort,
        baudRate: formData.baudRate,
        deviceLocation: formData.deviceLocation || null,
        deviceType: formData.deviceType,
        notes: formData.notes || null,
        isActive: true
      }

      const response = await fetch('/api/arduino-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        showMessage('Arduino cadastrado com sucesso!', 'success')
        
        // Reset form
        setFormData({
          deviceName: '',
          deviceCode: '',
          connectionPort: 'COM4',
          baudRate: 9600,
          deviceLocation: '',
          deviceType: 'MAIN_GATE',
          notes: ''
        })
        setSelectedArduino(null)
      } else {
        showMessage(result.error || 'Erro ao cadastrar Arduino', 'error')
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      showMessage('Erro de conexão ao salvar configuração', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Acesso Negado</h2>
            <p className="text-gray-500 mt-2">Você precisa estar logado para acessar esta página.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!selectedCondominium) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Microchip className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Condomínio Necessário</h2>
            <p className="text-gray-500 mt-2">Selecione um condomínio para cadastrar Arduinos.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Arduino</h1>
          <p className="text-muted-foreground">
            Detecte e cadastre Arduinos para o condomínio {selectedCondominium.name}
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center space-x-2 ${
            messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            messageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {messageType === 'success' && <CheckCircle className="w-5 h-5" />}
            {messageType === 'error' && <XCircle className="w-5 h-5" />}
            {messageType === 'info' && <AlertCircle className="w-5 h-5" />}
            <span>{message}</span>
          </div>
        )}

        {/* Arduino Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Detecção de Arduinos
            </CardTitle>
            <CardDescription>
              Escaneie as portas USB para detectar Arduinos conectados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Portas disponíveis: {availablePorts.length}
                  </p>
                  <p className="text-xs text-gray-500">
                    Arduinos detectados: {detectedArduinos.length}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={loadAvailablePorts}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar Portas
                  </Button>
                  <Button
                    onClick={scanForArduinos}
                    disabled={isScanning || availablePorts.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {isScanning ? 'Escaneando...' : 'Detectar Arduinos'}
                  </Button>
                </div>
              </div>

              {/* Detected Arduinos */}
              {detectedArduinos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Arduinos Detectados:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detectedArduinos.map((arduino, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedArduino?.port === arduino.port
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => selectArduino(arduino)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{arduino.port}</div>
                            <div className="text-sm text-gray-500">
                              {arduino.manufacturer}
                            </div>
                            {arduino.boardInfo && (
                              <div className="text-xs text-blue-600">
                                {arduino.boardInfo.name}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {arduino.connected && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            <Microchip className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Ports */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Portas Disponíveis:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availablePorts.map((port, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-50 rounded text-sm text-center"
                    >
                      <div className="font-medium">{port.path}</div>
                      <div className="text-xs text-gray-500">
                        {port.manufacturer || 'Desconhecido'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração do Arduino
            </CardTitle>
            <CardDescription>
              Configure os dados do Arduino {selectedArduino ? `detectado na porta ${selectedArduino.port}` : 'manualmente'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Microchip className="w-4 h-4" />
                  Informações Básicas
                </h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Dispositivo *
                  </label>
                  <input
                    type="text"
                    value={formData.deviceName}
                    onChange={(e) => handleInputChange('deviceName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Arduino Portaria Principal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código do Dispositivo
                  </label>
                  <input
                    type="text"
                    value={formData.deviceCode}
                    onChange={(e) => handleInputChange('deviceCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: ARD_001"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para gerar automaticamente
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo do Dispositivo
                  </label>
                  <select
                    value={formData.deviceType}
                    onChange={(e) => handleInputChange('deviceType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MAIN_GATE">Portão Principal</option>
                    <option value="GARAGE">Garagem</option>
                    <option value="PEDESTRIAN">Pedestre</option>
                    <option value="EMERGENCY">Emergência</option>
                  </select>
                </div>
              </div>

              {/* Configurações de Conexão */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Configurações de Conexão
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porta de Conexão *
                  </label>
                  <select
                    value={formData.connectionPort}
                    onChange={(e) => handleInputChange('connectionPort', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availablePorts.map((port) => (
                      <option key={port.path} value={port.path}>
                        {port.path} - {port.manufacturer || 'Desconhecido'}
                      </option>
                    ))}
                    <option value="COM3">COM3</option>
                    <option value="COM4">COM4</option>
                    <option value="COM5">COM5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Baud Rate
                  </label>
                  <select
                    value={formData.baudRate}
                    onChange={(e) => handleInputChange('baudRate', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={9600}>9600</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                    <option value={57600}>57600</option>
                    <option value={115200}>115200</option>
                  </select>
                </div>


              </div>

              {/* Localização e Observações */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localização e Observações
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localização do Dispositivo
                  </label>
                  <input
                    type="text"
                    value={formData.deviceLocation}
                    onChange={(e) => handleInputChange('deviceLocation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Portaria Principal, Bloco A - Térreo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Observações adicionais sobre o dispositivo..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setFormData({
                    deviceName: '',
                    deviceCode: '',
                    connectionPort: 'COM4',
                    baudRate: 9600,
                    deviceLocation: '',
                    deviceType: 'MAIN_GATE',
                    notes: ''
                  })
                  setSelectedArduino(null)
                }}
                variant="outline"
              >
                Limpar Formulário
              </Button>
              <Button
                onClick={saveArduinoConfiguration}
                disabled={isSaving || !formData.deviceName || !formData.connectionPort}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Cadastrar Arduino'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
