'use client'

import { useState, useEffect, useRef } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ArduinoDevice {
  id: string
  name: string
  location: string
  port: string
  connected: boolean
  lastSeen?: string
  firmwareVersion?: string
  ipAddress?: string
  type: 'gate' | 'access' | 'led' | 'sensor'
}

interface ArduinoStatus {
  connected: boolean
  port?: string
  error?: string
  message?: string
  ledStates?: {
    led1: boolean
    led2: boolean
    led3: boolean
    led4: boolean
  }
}

interface SerialMessage {
  timestamp: string
  message: string
  type: 'sent' | 'received' | 'system'
}

export default function ArduinoControlPage() {
  const [status, setStatus] = useState<ArduinoStatus>({ connected: false })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPort, setSelectedPort] = useState('')
  const [availablePorts, setAvailablePorts] = useState<{ path: string; manufacturer?: string }[]>([])
  const [ledStates, setLedStates] = useState({
    led1: false, // Pino 13
    led2: false, // Pino 12
    led3: false, // Pino 11
    led4: false  // Pino 10
  })
  
  // Novos estados para gerenciamento de Arduinos
  const [arduinoDevices, setArduinoDevices] = useState<ArduinoDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [showSerialMonitor, setShowSerialMonitor] = useState(false)
  const [serialMessages, setSerialMessages] = useState<SerialMessage[]>([])
  const [serialPollingInterval, setSerialPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [serialCommand, setSerialCommand] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCode, setUploadCode] = useState('')
  const [uploadMethod, setUploadMethod] = useState<'file' | 'code'>('file')
  const serialEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'control' | 'devices' | 'monitor'>('devices')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDevice, setEditingDevice] = useState<ArduinoDevice | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null)
  const [baudRate, setBaudRate] = useState(9600) // Baud rate padrão 9600 para Arduino

  // Verifica status da conexão ao carregar
  useEffect(() => {
    const init = async () => {
      await checkStatus()
      await loadPorts()
      await loadArduinoDevices()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Auto-scroll do serial monitor
  useEffect(() => {
    if (serialEndRef.current) {
      serialEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [serialMessages])

  const loadArduinoDevices = async () => {
    try {
      // Buscar condomínio selecionado do contexto
      const condominiumId = localStorage.getItem('selectedCondominiumId')
      
      if (!condominiumId) {
        console.warn('⚠️ Nenhum condomínio selecionado')
        setMessage('⚠️ Selecione um condomínio primeiro')
        return
      }
      
      const response = await fetch(`/api/arduino-config?condominiumId=${condominiumId}`)
      if (response.ok) {
        const data = await response.json()
        setArduinoDevices(data.devices || [])
        console.log(`✅ ${data.devices?.length || 0} dispositivos Arduino carregados do banco de dados`)
      } else {
        console.error('❌ Erro ao carregar dispositivos:', response.statusText)
        setMessage('❌ Erro ao carregar dispositivos Arduino')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dispositivos:', error)
      setMessage('❌ Erro ao conectar com servidor')
    }
  }

  const loadPorts = async () => {
    try {
      const response = await fetch('/api/arduino?action=ports')
      const data = await response.json()
      if (data.ports && data.ports.length > 0) {
        setAvailablePorts(data.ports)
        // Se houver portas, seleciona a primeira automaticamente
        if (!selectedPort && data.ports[0]) {
          setSelectedPort(data.ports[0].path)
        }
      } else {
        // Se não houver portas detectadas, mantém as opções padrão
        setMessage('⚠️ Nenhuma porta serial detectada. Conecte o Arduino via USB.')
      }
    } catch (error) {
      console.error('Erro ao carregar portas:', error)
      setMessage('❌ Erro ao detectar portas seriais')
    }
  }

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/arduino?action=status')
      const data = await response.json()
      
      // Atualiza status real da conexão
      setStatus({
        connected: data.connected || false,
        port: data.port,
        message: data.message
      })
      
      if (data.ledStates) {
        setLedStates(data.ledStates)
      }
      
      if (!data.connected) {
        setMessage('Arduino desconectado. Clique em "Conectar" para estabelecer conexão.')
      } else {
        setMessage(`✅ Conectado na porta ${data.port}`)
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      setStatus({ connected: false })
      setMessage('❌ Erro ao verificar conexão com Arduino')
    }
  }

  const connectToArduino = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/arduino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', port: selectedPort })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStatus({ connected: true })
        setMessage('Arduino conectado com sucesso!')
        await checkStatus()
      } else {
        setMessage(data.error || 'Erro ao conectar')
      }
    } catch (error) {
      console.error('Erro ao conectar:', error)
      setMessage('Erro ao conectar com Arduino')
    } finally {
      setLoading(false)
    }
  }

  const disconnectFromArduino = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/arduino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      })
      
      if (response.ok) {
        setStatus({ connected: false })
        setMessage('Arduino desconectado')
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendCommand = async (numero: number, acao: string) => {
    setLoading(true)
    setMessage('')
    
    try {
      const command = `L${numero}_${acao.toUpperCase()}`
      const response = await fetch('/api/arduino', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'command', command })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(`✅ LED ${numero} ${acao === 'on' ? 'ligado' : 'desligado'} com sucesso!`)
        
        // Atualiza estado local
        const ledKey = `led${numero}` as keyof typeof ledStates
        setLedStates(prev => ({
          ...prev,
          [ledKey]: acao === 'on'
        }))
        
        // Verifica status atualizado
        setTimeout(checkStatus, 500)
      } else {
        setMessage(`❌ Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao enviar comando:', error)
      setMessage('❌ Erro de comunicação')
    } finally {
      setLoading(false)
    }
  }

  // Função auxiliar para enviar comandos genéricos (reservada para uso futuro)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendGenericCommand = async (comando: string) => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/arduino', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'command', command: comando })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(`✅ Comando "${comando}" enviado com sucesso!`)
        setTimeout(checkStatus, 500)
      } else {
        setMessage(`❌ Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao enviar comando:', error)
      setMessage('❌ Erro de comunicação')
    } finally {
      setLoading(false)
    }
  }
  
  // Funções para Serial Monitor
  const openSerialMonitor = async (deviceId: string) => {
    setSelectedDevice(deviceId)
    setShowSerialMonitor(true)
    setSerialMessages([])
    addSerialMessage('Sistema', 'Serial Monitor aberto', 'system')
    addSerialMessage('Sistema', `⚙️ Baud Rate: ${baudRate} (Arduino usa Serial.begin(9600))`, 'system')
    
    // Verifica conexão
    const statusCheck = await fetch('/api/arduino')
    const statusData = await statusCheck.json()
    
    if (!statusData.connected) {
      addSerialMessage('Sistema', '⚠️ Arduino NÃO CONECTADO - Comandos tentarão conectar automaticamente', 'system')
    } else {
      addSerialMessage('Sistema', `✅ Arduino CONECTADO na porta ${statusData.port}`, 'system')
    }
    
    // Simula conexão com o dispositivo
    const device = arduinoDevices.find(d => d.id === deviceId)
    if (device) {
      addSerialMessage('Sistema', `Dispositivo selecionado: ${device.name} (${device.port})`, 'system')
      
      // Inicia polling de mensagens
      startSerialPolling(deviceId)
    }
  }
  
  const startSerialPolling = (_deviceId: string) => {
    console.log('🔄 Iniciando polling do Serial Monitor...')
    
    // Limpa qualquer polling anterior
    if (serialPollingInterval) {
      console.log('⏹️ Limpando polling anterior')
      clearInterval(serialPollingInterval)
    }
    
    // Polling real para buscar mensagens do Arduino
    const interval = setInterval(async () => {
      // A cada 500ms, busca mensagens do buffer do Arduino
      try {
        const response = await fetch('/api/arduino?action=serial-messages')
        if (response.ok) {
          const data = await response.json()
          
          console.log(`📨 Polling: ${data.count || 0} mensagens recebidas`, data.messages)
          
          // Se tiver mensagens novas, adiciona ao monitor
          if (data.messages && data.messages.length > 0) {
            data.messages.forEach((msg: string) => {
              if (msg.trim()) {
                console.log(`➕ Adicionando mensagem ao monitor: ${msg}`)
                addSerialMessage('Arduino', msg, 'received')
              }
            })
          }
        } else {
          console.warn('⚠️ Erro na resposta do polling:', response.status)
        }
      } catch (error) {
        console.error('❌ Erro ao buscar mensagens:', error)
        // Não exibe erro no monitor para não poluir
      }
    }, 500) // Verifica a cada 500ms
    
    setSerialPollingInterval(interval)
    console.log('✅ Polling iniciado com sucesso')
  }
  
  const addSerialMessage = (source: string, msg: string, type: 'sent' | 'received' | 'system') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    const newMessage = {
      timestamp,
      message: `[${source}] ${msg}`,
      type
    }
    console.log(`✅ addSerialMessage chamado:`, newMessage)
    setSerialMessages(prev => {
      const updated = [...prev, newMessage]
      console.log(`📊 Total de mensagens agora: ${updated.length}`)
      return updated
    })
  }
  
  const sendSerialCommand = async () => {
    if (!serialCommand.trim()) return
    
    addSerialMessage('Você', serialCommand, 'sent')
    
    // Verifica se está conectado primeiro
    const statusCheck = await fetch('/api/arduino')
    const statusData = await statusCheck.json()
    
    if (!statusData.connected) {
      addSerialMessage('Sistema', '⚠️ Arduino não conectado! Conectando automaticamente...', 'system')
      
      // Tenta conectar automaticamente
      const device = arduinoDevices.find(d => d.id === selectedDevice)
      if (device && device.port) {
        const connectResponse = await fetch('/api/arduino', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'connect', 
            port: device.port 
          })
        })
        
        const connectData = await connectResponse.json()
        
        if (connectData.success) {
          addSerialMessage('Sistema', `✅ Conectado a ${device.port}`, 'system')
        } else {
          addSerialMessage('Sistema', `❌ Falha ao conectar: ${connectData.error}`, 'system')
          setSerialCommand('')
          return
        }
      } else {
        addSerialMessage('Sistema', '❌ Porta não configurada. Configure o dispositivo primeiro.', 'system')
        setSerialCommand('')
        return
      }
    }
    
    // Envia comando real para o Arduino
    try {
      const response = await fetch('/api/arduino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'command', 
          command: serialCommand,
          deviceId: selectedDevice,
          baudRate: baudRate // Envia o baud rate configurado
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.response) {
        addSerialMessage('Arduino', data.response, 'received')
      } else if (data.error) {
        addSerialMessage('Sistema', `❌ Erro: ${data.error}`, 'system')
      }
    } catch (error) {
      addSerialMessage('Sistema', `❌ Erro ao enviar comando: ${error}`, 'system')
    }
    
    setSerialCommand('')
  }
  
  const closeSerialMonitor = async () => {
    // Desconecta do Arduino antes de fechar
    try {
      addSerialMessage('Sistema', 'Fechando Serial Monitor e desconectando Arduino...', 'system')
      
      // Para o polling
      if (serialPollingInterval) {
        console.log('⏹️ Parando polling ao fechar Serial Monitor')
        clearInterval(serialPollingInterval)
        setSerialPollingInterval(null)
      }
      
      const response = await fetch('/api/arduino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      })
      
      if (response.ok) {
        console.log('✅ Arduino desconectado ao fechar Serial Monitor')
      }
    } catch (error) {
      console.error('❌ Erro ao desconectar:', error)
    }
    
    // Fecha o modal
    setShowSerialMonitor(false)
    setSelectedDevice(null)
    setSerialMessages([])
    setMessage('Serial Monitor fechado e Arduino desconectado')
  }
  
  // Funções para Upload de Código
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.ino')) {
      setUploadFile(file)
    } else {
      setMessage('❌ Por favor, selecione um arquivo .ino válido')
    }
  }
  
  const uploadFirmware = async (deviceId: string) => {
    // Valida se tem arquivo ou código
    if (uploadMethod === 'file' && !uploadFile) {
      setMessage('❌ Selecione um arquivo primeiro')
      return
    }
    
    if (uploadMethod === 'code' && !uploadCode.trim()) {
      setMessage('❌ Digite o código Arduino primeiro')
      return
    }
    
    setLoading(true)
    setMessage('⚙️ Compilando e enviando código para o Arduino...')
    
    try {
      const formData = new FormData()
      
      if (uploadMethod === 'file' && uploadFile) {
        // Upload via arquivo
        formData.append('file', uploadFile)
      } else if (uploadMethod === 'code') {
        // Upload via código direto - cria um Blob como arquivo
        const codeBlob = new Blob([uploadCode], { type: 'text/plain' })
        const codeFile = new File([codeBlob], 'uploaded_code.ino', { type: 'text/plain' })
        formData.append('file', codeFile)
      }
      
      formData.append('deviceId', deviceId)
      
      // Usa a rota de deploy que compila e envia
      const response = await fetch('/api/arduino-deploy', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('✅ Código compilado e enviado com sucesso! Arduino reiniciando...')
        setShowUploadModal(false)
        setUploadFile(null)
        setUploadCode('')
        
        // Aguarda 3 segundos e recarrega dispositivos
        setTimeout(() => {
          loadArduinoDevices()
        }, 3000)
      } else {
        setMessage(`❌ Erro: ${data.error}\n\nDetalhes: ${data.details || 'Falha ao compilar/enviar'}`)
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      setMessage('❌ Erro ao compilar e enviar código')
    } finally {
      setLoading(false)
    }
  }
  
  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'gate': return '🚪'
      case 'access': return '🔐'
      case 'led': return '💡'
      case 'sensor': return '📡'
      default: return '🔧'
    }
  }
  
  const getDeviceTypeName = (type: string) => {
    switch (type) {
      case 'gate': return 'Controle de Cancela'
      case 'access': return 'Controle de Acesso'
      case 'led': return 'Controle de LEDs'
      case 'sensor': return 'Sensor'
      default: return 'Dispositivo'
    }
  }
  
  // Funções para Edição e Exclusão de Dispositivos
  const openEditModal = (device: ArduinoDevice) => {
    setEditingDevice(device)
    setShowEditModal(true)
  }
  
  const closeEditModal = () => {
    setEditingDevice(null)
    setShowEditModal(false)
  }
  
  const saveDeviceChanges = async () => {
    if (!editingDevice) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/arduino-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDevice.id,
          deviceName: editingDevice.name,
          connectionPort: editingDevice.port,
          deviceLocation: editingDevice.location,
          deviceType: editingDevice.type.toUpperCase()
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('✅ Dispositivo atualizado com sucesso!')
        await loadArduinoDevices()
        closeEditModal()
      } else {
        setMessage(`❌ Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao atualizar dispositivo:', error)
      setMessage('❌ Erro ao atualizar dispositivo')
    } finally {
      setLoading(false)
    }
  }
  
  const confirmDelete = (deviceId: string) => {
    setDeviceToDelete(deviceId)
    setShowDeleteConfirm(true)
  }
  
  const cancelDelete = () => {
    setDeviceToDelete(null)
    setShowDeleteConfirm(false)
  }
  
  const deleteDevice = async () => {
    if (!deviceToDelete) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/arduino-config?id=${deviceToDelete}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('✅ Dispositivo removido com sucesso!')
        await loadArduinoDevices()
        cancelDelete()
      } else {
        setMessage(`❌ Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao remover dispositivo:', error)
      setMessage('❌ Erro ao remover dispositivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6 text-black">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento Arduino</h1>
            <p className="text-gray-600">
              Gerencie todos os dispositivos Arduino do condomínio
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadArduinoDevices} variant="outline">
              🔄 Atualizar
            </Button>
            <Button onClick={() => setActiveTab('devices')} variant={activeTab === 'devices' ? 'default' : 'outline'}>
              📱 Dispositivos
            </Button>
            <Button onClick={() => setActiveTab('control')} variant={activeTab === 'control' ? 'default' : 'outline'}>
              🎮 Controle
            </Button>
          </div>
        </div>

        {/* Tab: Lista de Dispositivos */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Dispositivos Arduino Cadastrados</h2>
                <span className="text-sm text-gray-600">
                  {arduinoDevices.length} dispositivo(s)
                </span>
              </div>
              
              {arduinoDevices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">Nenhum dispositivo cadastrado</p>
                  <p className="text-sm">Os dispositivos Arduino serão registrados automaticamente ao conectar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {arduinoDevices.map((device) => (
                    <Card key={device.id} className="p-4 border-2 hover:border-blue-500 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{getDeviceTypeIcon(device.type)}</span>
                          <div>
                            <h3 className="font-semibold">{device.name}</h3>
                            <p className="text-xs text-gray-600">{device.location}</p>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${device.connected ? 'bg-green-500' : 'bg-gray-400'}`} 
                             title={device.connected ? 'Online' : 'Offline'}></div>
                      </div>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tipo:</span>
                          <span className="font-medium">{getDeviceTypeName(device.type)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Porta:</span>
                          <span className="font-mono text-xs">{device.port}</span>
                        </div>
                        {device.ipAddress && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">IP:</span>
                            <span className="font-mono text-xs">{device.ipAddress}</span>
                          </div>
                        )}
                        {device.firmwareVersion && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Firmware:</span>
                            <span className="font-mono text-xs">v{device.firmwareVersion}</span>
                          </div>
                        )}
                        {device.lastSeen && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Última vez:</span>
                            <span className="text-xs">{new Date(device.lastSeen).toLocaleString('pt-BR')}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => openSerialMonitor(device.id)}
                          className="flex-1"
                          variant="outline"
                        >
                          📺 Monitor
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDevice(device.id)
                            setShowUploadModal(true)
                          }}
                          className="flex-1"
                          variant="outline"
                        >
                          📤 Upload
                        </Button>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => openEditModal(device)}
                          className="flex-1"
                          variant="outline"
                        >
                          ✏️ Editar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => confirmDelete(device.id)}
                          className="flex-1"
                          variant="destructive"
                        >
                          🗑️ Excluir
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab: Controle Manual */}
        {activeTab === 'control' && (
          <div className="space-y-4">
        {/* Status da Conexão */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Status da Conexão</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-4 h-4 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {status.connected ? 'Conectado' : 'Desconectado'}
            </span>
            {status.port && (
              <span className="text-gray-600">
                Porta: {status.port}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="px-3 py-2 border rounded-lg"
              disabled={loading}
            >
              {availablePorts.length > 0 ? (
                availablePorts.map(port => (
                  <option key={port.path} value={port.path}>
                    {port.path} {port.manufacturer ? `(${port.manufacturer})` : ''}
                  </option>
                ))
              ) : (
                <option value="" disabled>Nenhuma porta detectada - Conecte o Arduino via USB</option>
              )}
            </select>
            
            <Button
              onClick={() => status.connected ? disconnectFromArduino() : connectToArduino()}
              disabled={loading}
              variant={status.connected ? "destructive" : "default"}
            >
              {loading ? 'Processando...' : (status.connected ? 'Desconectar' : 'Conectar')}
            </Button>
            
            <Button
              onClick={loadPorts}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              🔄 Portas
            </Button>
          </div>
          
          {status.error && (
            <p className="text-red-600 mt-2">Erro: {status.error}</p>
          )}
          {status.message && (
            <p className="text-blue-600 mt-2">{status.message}</p>
          )}
        </Card>

        {/* Controle do LED Principal (Pino 13) */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">LED Principal (Pino 13)</h2>
          <p className="text-gray-600 mb-6">
            Controle do LED interno do Arduino no pino 13
          </p>
          
          <div className="flex gap-4">
            <Button
              onClick={() => sendCommand(1, 'on')}
              disabled={loading || !status.connected}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Enviando...' : '🔛 Ligar LED'}
            </Button>
            
            <Button
              onClick={() => sendCommand(1, 'off')}
              disabled={loading || !status.connected}
              variant="destructive"
            >
              {loading ? 'Enviando...' : '⭕ Desligar LED'}
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <span className="font-medium">Estado atual: </span>
            <span className={`font-bold ${ledStates.led1 ? 'text-green-600' : 'text-red-600'}`}>
              {ledStates.led1 ? '🟢 LIGADO' : '🔴 DESLIGADO'}
            </span>
          </div>
        </Card>
          </div>
        )}

        {/* Serial Monitor Modal */}
        {showSerialMonitor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Serial Monitor</h2>
                  <p className="text-sm text-gray-600">
                    {selectedDevice && arduinoDevices.find(d => d.id === selectedDevice)?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Baud Rate:</label>
                    <select
                      value={baudRate}
                      onChange={(e) => setBaudRate(Number(e.target.value))}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value={300}>300</option>
                      <option value={1200}>1200</option>
                      <option value={2400}>2400</option>
                      <option value={4800}>4800</option>
                      <option value={9600}>9600 (Arduino padrão)</option>
                      <option value={14400}>14400</option>
                      <option value={19200}>19200</option>
                      <option value={28800}>28800</option>
                      <option value={38400}>38400</option>
                      <option value={57600}>57600</option>
                      <option value={115200}>115200</option>
                    </select>
                  </div>
                  <Button onClick={closeSerialMonitor} variant="outline" size="sm">
                    ✕ Fechar
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-gray-900 text-green-400 font-mono text-sm space-y-1">
                {serialMessages.length === 0 ? (
                  <p className="text-gray-500">Aguardando mensagens...</p>
                ) : (
                  serialMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`${
                        msg.type === 'sent' ? 'text-blue-400' :
                        msg.type === 'system' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}
                    >
                      <span className="text-gray-500">{msg.timestamp}</span> {msg.message}
                    </div>
                  ))
                )}
                <div ref={serialEndRef} />
              </div>
              
              <div className="p-4 border-t flex gap-2">
                <input
                  type="text"
                  value={serialCommand}
                  onChange={(e) => setSerialCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendSerialCommand()}
                  placeholder="Digite um comando (ex: FACE_RECOGNIZED, STATUS, PING)"
                  className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm"
                />
                <Button onClick={sendSerialCommand} disabled={!serialCommand.trim()}>
                  Enviar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Upload de Firmware */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">📤 Upload de Código para Arduino</h2>
              <p className="text-sm text-gray-600 mb-4">
                Dispositivo: <strong>{selectedDevice && arduinoDevices.find(d => d.id === selectedDevice)?.name}</strong>
              </p>
              
              {/* Abas de método de upload */}
              <div className="flex gap-2 mb-4 border-b">
                <button
                  onClick={() => setUploadMethod('file')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    uploadMethod === 'file'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📁 Upload de Arquivo
                </button>
                <button
                  onClick={() => setUploadMethod('code')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    uploadMethod === 'code'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📝 Colar Código
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Upload via arquivo */}
                {uploadMethod === 'file' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Selecione o arquivo .ino
                    </label>
                    <input
                      type="file"
                      accept=".ino"
                      onChange={handleFileUpload}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    {uploadFile && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {uploadFile.name}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Upload via código direto */}
                {uploadMethod === 'code' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        Cole o código Arduino (.ino) abaixo:
                      </label>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch('/arduino_gate_control_default.ino')
                            const defaultCode = await response.text()
                            setUploadCode(defaultCode)
                            setMessage('✅ Código padrão de controle de cancela carregado!')
                          } catch (error) {
                            console.error('Erro ao carregar código padrão:', error)
                            setMessage('❌ Erro ao carregar código padrão')
                          }
                        }}
                        variant="outline"
                        size="sm"
                        type="button"
                      >
                        📄 Carregar Código Padrão
                      </Button>
                    </div>
                    <textarea
                      value={uploadCode}
                      onChange={(e) => setUploadCode(e.target.value)}
                      placeholder="// Cole seu código Arduino aqui ou clique em 'Carregar Código Padrão'...
#include <Servo.h>

void setup() {
  Serial.begin(9600);
  // seu código...
}

void loop() {
  // seu código...
}"
                      className="w-full h-96 px-3 py-2 border rounded-lg text-sm font-mono resize-none"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {uploadCode.length} caracteres | {uploadCode.split('\n').length} linhas
                      </p>
                      {uploadCode.length > 0 && (
                        <Button
                          onClick={() => setUploadCode('')}
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          🗑️ Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>⚙️ Processo de Upload:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1 ml-4 list-disc">
                    <li>O código será compilado usando arduino-cli</li>
                    <li>Após compilação bem-sucedida, será enviado para o Arduino</li>
                    <li>O Arduino reiniciará automaticamente</li>
                    <li>Aguarde ~10 segundos para conclusão</li>
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => selectedDevice && uploadFirmware(selectedDevice)}
                    disabled={(uploadMethod === 'file' && !uploadFile) || (uploadMethod === 'code' && !uploadCode.trim()) || loading}
                    className="flex-1"
                  >
                    {loading ? '⚙️ Compilando e Enviando...' : '� Compilar e Enviar'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowUploadModal(false)
                      setUploadFile(null)
                      setUploadCode('')
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Edição de Dispositivo */}
        {showEditModal && editingDevice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">Editar Dispositivo</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nome do Dispositivo
                  </label>
                  <input
                    type="text"
                    value={editingDevice.name}
                    onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Arduino Cancela Principal"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Localização
                  </label>
                  <input
                    type="text"
                    value={editingDevice.location}
                    onChange={(e) => setEditingDevice({...editingDevice, location: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Portaria A"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Porta Serial
                  </label>
                  <select
                    value={editingDevice.port}
                    onChange={(e) => setEditingDevice({...editingDevice, port: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {availablePorts.length > 0 ? (
                      availablePorts.map(port => (
                        <option key={port.path} value={port.path}>
                          {port.path} {port.manufacturer ? `(${port.manufacturer})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Nenhuma porta detectada</option>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo de Dispositivo
                  </label>
                  <select
                    value={editingDevice.type}
                    onChange={(e) => setEditingDevice({...editingDevice, type: e.target.value as 'gate' | 'access' | 'led' | 'sensor'})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="gate">Controle de Cancela</option>
                    <option value="access">Controle de Acesso</option>
                    <option value="led">Controle de LEDs</option>
                    <option value="sensor">Sensor</option>
                  </select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={saveDeviceChanges}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? '💾 Salvando...' : '💾 Salvar Alterações'}
                  </Button>
                  <Button
                    onClick={closeEditModal}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4 text-red-600">⚠️ Confirmar Exclusão</h2>
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja excluir este dispositivo?
                {deviceToDelete && (
                  <span className="block font-semibold mt-2">
                    {arduinoDevices.find(d => d.id === deviceToDelete)?.name}
                  </span>
                )}
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. 
                  O dispositivo será removido permanentemente do sistema.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={deleteDevice}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  {loading ? '🗑️ Excluindo...' : '🗑️ Confirmar Exclusão'}
                </Button>
                <Button
                  onClick={cancelDelete}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Mensagens */}
        {message && (
          <Card className="p-4">
            <p className="font-medium">{message}</p>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
