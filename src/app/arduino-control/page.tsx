'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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

export default function ArduinoControlPage() {
  const [status, setStatus] = useState<ArduinoStatus>({ connected: false })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPort, setSelectedPort] = useState('COM4')
  const [availablePorts, setAvailablePorts] = useState<{ path: string; manufacturer?: string }[]>([])
  const [ledStates, setLedStates] = useState({
    led1: false, // Pino 13
    led2: false, // Pino 12
    led3: false, // Pino 11
    led4: false  // Pino 10
  })

  // Verifica status da conexão ao carregar
  useEffect(() => {
    checkStatus()
    loadPorts()
  }, [])

  const loadPorts = async () => {
    try {
      const response = await fetch('/api/arduino?action=ports')
      const data = await response.json()
      if (data.ports) {
        setAvailablePorts(data.ports)
      }
    } catch (error) {
      console.error('Erro ao carregar portas:', error)
    }
  }

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/arduino?action=status')
      const data = await response.json()
      setStatus(data)
      setMessage(data.message || '')
      if (data.ledStates) {
        setLedStates(data.ledStates)
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      setStatus({ connected: false })
      setMessage('Erro ao verificar conexão')
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Controle Arduino</h1>
            <p className="text-gray-600">
              Controle de LEDs via comunicação serial
            </p>
          </div>
          <Button onClick={checkStatus} variant="outline">
            Atualizar Status
          </Button>
        </div>

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
                <>
                  <option value="COM3">COM3</option>
                  <option value="COM4">COM4</option>
                  <option value="COM5">COM5</option>
                  <option value="COM6">COM6</option>
                  <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
                  <option value="/dev/ttyACM0">/dev/ttyACM0</option>
                </>
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

        {/* Controle de Todos os LEDs */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Controle Geral</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { num: 1, pin: 13, name: 'LED 1', state: ledStates.led1 },
              { num: 2, pin: 12, name: 'LED 2', state: ledStates.led2 },
              { num: 3, pin: 11, name: 'LED 3', state: ledStates.led3 },
              { num: 4, pin: 10, name: 'LED 4', state: ledStates.led4 }
            ].map(led => (
              <div key={led.num} className="p-4 border rounded-lg text-center">
                <h3 className="font-semibold">{led.name}</h3>
                <p className="text-sm text-gray-600">Pino {led.pin}</p>
                <div className={`w-6 h-6 rounded-full mx-auto mt-2 ${led.state ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className="text-xs mt-1 font-medium">
                  {led.state ? 'LIGADO' : 'DESLIGADO'}
                </p>
                
                <div className="flex gap-1 mt-3">
                  <Button
                    size="sm"
                    onClick={() => sendCommand(led.num, 'on')}
                    disabled={loading || !status.connected}
                    className="text-xs"
                  >
                    ON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendCommand(led.num, 'off')}
                    disabled={loading || !status.connected}
                    className="text-xs"
                  >
                    OFF
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-4">
            <Button
              onClick={() => sendGenericCommand('ALL_ON')}
              disabled={loading || !status.connected}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Enviando...' : '🌟 Ligar Todos'}
            </Button>
            
            <Button
              onClick={() => sendGenericCommand('ALL_OFF')}
              disabled={loading || !status.connected}
              variant="outline"
            >
              {loading ? 'Enviando...' : '🚫 Desligar Todos'}
            </Button>
            
            <Button
              onClick={() => sendGenericCommand('STATUS')}
              disabled={loading || !status.connected}
              variant="outline"
            >
              {loading ? 'Enviando...' : '📊 Status'}
            </Button>
            
            <Button
              onClick={() => sendGenericCommand('PING')}
              disabled={loading || !status.connected}
              variant="outline"
            >
              {loading ? 'Enviando...' : '📡 Ping'}
            </Button>
          </div>
        </Card>

        {/* Mensagens */}
        {message && (
          <Card className="p-4">
            <p className="font-medium">{message}</p>
          </Card>
        )}

        {/* Instruções */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Instruções</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p><strong>1. Como Funciona:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Esta é uma simulação do controle Arduino integrada ao Next.js</li>
              <li>Para usar com Arduino real, conecte via USB e carregue o código arduino_control.ino</li>
              <li>O sistema simula o comportamento dos LEDs para demonstração</li>
            </ul>
            
            <p><strong>2. Uso:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Clique em &quot;Conectar&quot; para simular conexão com Arduino</li>
              <li>O LED do pino 13 é o LED interno do Arduino (sempre presente)</li>
              <li>Para os outros pinos (10, 11, 12), conecte LEDs externos se desejar</li>
              <li>Use os botões para controlar individualmente ou todos juntos</li>
            </ul>
            
            <p><strong>3. Implementação Real:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Para implementação real, substitua a simulação por comunicação serial</li>
              <li>Use a biblioteca &apos;serialport&apos; do Node.js para comunicação</li>
              <li>Carregue o código arduino_control.ino no seu Arduino</li>
              <li>Configure a porta serial correta no código</li>
            </ul>
            
            <p><strong>4. Comandos Disponíveis:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">L1_ON/L1_OFF</code> - Controla LED do pino 13</li>
              <li><code className="bg-gray-100 px-1 rounded">L2_ON/L2_OFF</code> - Controla LED do pino 12</li>
              <li><code className="bg-gray-100 px-1 rounded">ALL_ON/ALL_OFF</code> - Controla todos os LEDs</li>
              <li><code className="bg-gray-100 px-1 rounded">STATUS</code> - Verifica estado atual</li>
              <li><code className="bg-gray-100 px-1 rounded">PING</code> - Teste de conexão</li>
            </ul>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}
