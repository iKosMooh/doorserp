"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Monitor, 
  Zap, 
  Send, 
  Trash2, 
  Download, 
  Settings,
  Wifi,
  WifiOff,
  Terminal,
  Cpu,
  Activity
} from 'lucide-react';



interface SerialPort {
  path: string;
  manufacturer: string;
  serialNumber: string;
  vendorId: string;
  productId: string;
}

export default function SerialMonitorPage() {
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Comandos predefinidos para o Arduino
  const predefinedCommands = [
    { label: 'Status', command: 'STATUS', icon: Activity, color: 'bg-blue-500' },
    { label: 'Ping', command: 'PING', icon: Wifi, color: 'bg-green-500' },
    { label: 'Abrir Cancela', command: 'OPEN_GATE', icon: Zap, color: 'bg-yellow-500' },
    { label: 'Fechar Cancela', command: 'CLOSE_GATE', icon: Zap, color: 'bg-red-500' },
    { label: 'LED 1 ON', command: 'L1_ON', icon: Cpu, color: 'bg-purple-500' },
    { label: 'LED 1 OFF', command: 'L1_OFF', icon: Cpu, color: 'bg-gray-500' },
    { label: 'LED 2 ON', command: 'L2_ON', icon: Cpu, color: 'bg-purple-500' },
    { label: 'LED 2 OFF', command: 'L2_OFF', icon: Cpu, color: 'bg-gray-500' },
  ];

  const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

  // Carrega portas disponíveis
  const loadPorts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/serial-monitor?action=ports');
      const data = await response.json();
      
      if (data.success) {
        setPorts(data.ports);
        if (data.ports.length > 0 && !selectedPort) {
          setSelectedPort(data.ports[0].path);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar portas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPort]);



  // Conecta à porta serial
  const connect = async () => {
    if (!selectedPort) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/serial-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          port: selectedPort,
          baudRate: baudRate
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setIsConnected(true);
        addLog('SYSTEM', data.message);
      } else {
        addLog('SYSTEM', `Erro: ${data.error}`);
      }
    } catch (error) {
      addLog('SYSTEM', `Erro ao conectar: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Desconecta da porta serial
  const disconnect = async () => {
    if (!selectedPort) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/serial-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          port: selectedPort
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setIsConnected(false);
        addLog('SYSTEM', data.message);
      } else {
        addLog('SYSTEM', `Erro: ${data.error}`);
      }
    } catch (error) {
      addLog('SYSTEM', `Erro ao desconectar: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Envia comando
  const sendCommand = async (cmd?: string) => {
    const commandToSend = cmd || command;
    if (!commandToSend.trim() || !selectedPort) return;
    
    try {
      const response = await fetch('/api/serial-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          port: selectedPort,
          command: commandToSend
        })
      });
      
      const data = await response.json();
      if (data.success) {
        if (!cmd) setCommand(''); // Limpa apenas se foi digitado manualmente
      } else {
        addLog('SYSTEM', `Erro: ${data.error}`);
      }
    } catch (error) {
      addLog('SYSTEM', `Erro ao enviar comando: ${error}`);
    }
  };

  // Adiciona log local
  const addLog = (type: string, message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${type === 'SYSTEM' ? '⚙️' : type === 'TX' ? '📤' : '📨'} ${type}: ${message}`]);
  };

  // Limpa logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Exporta logs
  const exportLogs = () => {
    const content = logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_monitor_${selectedPort.replace(/[/\\]/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto scroll para o final
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Polling para logs quando conectado
  useEffect(() => {
    if (!isConnected || !selectedPort) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/serial-monitor?action=logs&port=${selectedPort}`);
        const data = await response.json();
        
        if (data.success && data.logs) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, selectedPort]);

  // Carrega portas na inicialização
  useEffect(() => {
    loadPorts();
  }, [loadPorts]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendCommand();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Serial Monitor</h1>
              <p className="text-gray-600">Monitor de comunicação serial com Arduino</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controles */}
          <div className="lg:col-span-1 space-y-4">
            {/* Configuração da Conexão */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuração
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porta Serial
                  </label>
                  <select
                    value={selectedPort}
                    onChange={(e) => setSelectedPort(e.target.value)}
                    disabled={isConnected}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    {ports.map((port) => (
                      <option key={port.path} value={port.path}>
                        {port.path} ({port.manufacturer})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Baud Rate
                  </label>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    disabled={isConnected}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    {baudRates.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={loadPorts}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Atualizar
                  </Button>
                  
                  {isConnected ? (
                    <Button
                      onClick={disconnect}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      onClick={connect}
                      disabled={isLoading || !selectedPort}
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Conectar
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Comandos Predefinidos */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Comandos Rápidos
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {predefinedCommands.map((cmd) => (
                  <Button
                    key={cmd.command}
                    onClick={() => sendCommand(cmd.command)}
                    disabled={!isConnected}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    <cmd.icon className="w-4 h-4 mr-2" />
                    {cmd.label}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          {/* Monitor */}
          <div className="lg:col-span-3 space-y-4">
            {/* Console */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Console ({logs.length} linhas)
                </h3>
                
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded"
                    />
                    <span>Auto-scroll</span>
                  </label>
                  
                  <Button
                    onClick={exportLogs}
                    disabled={logs.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Exportar
                  </Button>
                  
                  <Button
                    onClick={clearLogs}
                    disabled={logs.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                </div>
              </div>

              <div
                ref={logsContainerRef}
                className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-96 overflow-y-auto border"
              >
                {logs.length === 0 ? (
                  <div className="text-gray-500 italic">
                    Nenhum log disponível. Conecte-se a uma porta serial para ver os dados.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="whitespace-pre-wrap break-words">
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </Card>

            {/* Enviar Comando */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Enviar Comando
              </h3>
              
              <div className="flex space-x-2">
                <input
                  ref={commandInputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite um comando (ex: STATUS, PING, OPEN_GATE)"
                  disabled={!isConnected}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 font-mono"
                />
                <Button
                  onClick={() => sendCommand()}
                  disabled={!isConnected || !command.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Enviar
                </Button>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Pressione Enter para enviar rapidamente o comando
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
