'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCondominium } from '@/contexts/CondominiumContext';

interface ArduinoConfig {
  id: string;
  deviceName: string;
  deviceCode: string;
  code: string | null;
  connectionPort: string;
  baudRate: number;
  deviceLocation: string | null;
  deviceType: string;
  isOnline: boolean;
  lastPing: Date | null;
}

interface DeployResult {
  success: boolean;
  message?: string;
  details?: string;
  error?: string;
  errors?: string;
  output?: string;
}

export default function ArduinoDeployPage() {
  const { user } = useAuth();
  const { selectedCondominium } = useCondominium();
  const [arduinoConfigs, setArduinoConfigs] = useState<ArduinoConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ArduinoConfig | null>(null);
  const [code, setCode] = useState('');
  const [port, setPort] = useState('COM4');
  const [baudRate, setBaudRate] = useState(9600);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [compileResult, setCompileResult] = useState<DeployResult | null>(null);

  // Carregar configurações Arduino
  const loadArduinoConfigurations = useCallback(async () => {
    if (!selectedCondominium?.id) {
      setArduinoConfigs([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/arduino?condominiumId=${selectedCondominium.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setArduinoConfigs(data.configs || []);
        } else {
          console.error('Erro ao carregar configurações:', data.error);
          setArduinoConfigs([]);
        }
      } else {
        console.error('Erro na resposta da API');
        setArduinoConfigs([]);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações Arduino:', error);
      setArduinoConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCondominium?.id]);

  useEffect(() => {
    if (selectedCondominium) {
      loadArduinoConfigurations();
      loadAvailablePorts();
    }
  }, [selectedCondominium, loadArduinoConfigurations]);

  const loadAvailablePorts = async () => {
    try {
      const response = await fetch('/api/arduino/deploy?action=ports');
      if (response.ok) {
        const data = await response.json();
        setAvailablePorts(data.ports || []);
      }
    } catch (error) {
      console.error('Erro ao carregar portas disponíveis:', error);
    }
  };

  const handleConfigSelect = (config: ArduinoConfig) => {
    setSelectedConfig(config);
    setCode(config.code || '');
    setPort(config.connectionPort);
    setBaudRate(config.baudRate);
  };

  const handleCompile = async () => {
    if (!selectedConfig || !selectedCondominium) return;

    try {
      setIsCompiling(true);
      setCompileResult(null);

      const response = await fetch('/api/arduino/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compile',
          condominiumId: selectedCondominium.id,
          deviceCode: selectedConfig.deviceCode,
        }),
      });

      const result = await response.json();
      setCompileResult(result);
    } catch (error) {
      setCompileResult({
        success: false,
        error: 'Erro ao validar código',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedConfig || !selectedCondominium || !code.trim()) return;

    try {
      setIsDeploying(true);
      setDeployResult(null);

      const response = await fetch('/api/arduino/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          condominiumId: selectedCondominium.id,
          deviceCode: selectedConfig.deviceCode,
          arduinoCode: code,
          port,
          baudRate,
        }),
      });

      const result = await response.json();
      setDeployResult(result);

      if (result.success) {
        // Recarregar configurações para atualizar status
        loadArduinoConfigurations();
      }
    } catch (error) {
      setDeployResult({
        success: false,
        error: 'Erro ao fazer deploy do código',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const getDefaultArduinoCode = () => {
    return `// Código base para controle de portaria
// Gerado automaticamente pelo DoorSerp

#include <WiFi.h>
#include <WebServer.h>

// Configurações WiFi
const char* ssid = "SUA_REDE_WIFI";
const char* password = "SUA_SENHA_WIFI";

// Configurações do servidor
WebServer server(80);

// Pinos do Arduino
const int RELAY_PIN = 2;  // Pino do relé para abrir portão
const int LED_PIN = 13;   // LED indicador
const int BUTTON_PIN = 4; // Botão manual

void setup() {
  Serial.begin(9600);
  
  // Configurar pinos
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Estado inicial
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  // Conectar ao WiFi
  WiFi.begin(ssid, password);
  
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Configurar rotas do servidor
  server.on("/", handleRoot);
  server.on("/open", handleOpen);
  server.on("/status", handleStatus);
  
  server.begin();
  Serial.println("Servidor iniciado");
}

void loop() {
  server.handleClient();
  
  // Verificar botão manual
  if (digitalRead(BUTTON_PIN) == LOW) {
    openGate();
    delay(1000); // Debounce
  }
}

void handleRoot() {
  String html = "<h1>DoorSerp - Controle de Portaria</h1>";
  html += "<p>Status: Conectado</p>";
  html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
  html += "<button onclick='location.href=\"/open\"'>Abrir Portão</button>";
  
  server.send(200, "text/html", html);
}

void handleOpen() {
  openGate();
  server.send(200, "text/plain", "Portão aberto!");
}

void handleStatus() {
  String status = "{\\"status\\": \\"online\\", \\"ip\\": \\"" + WiFi.localIP().toString() + "\\"}";
  server.send(200, "application/json", status);
}

void openGate() {
  Serial.println("Abrindo portão...");
  
  // Acender LED indicador
  digitalWrite(LED_PIN, HIGH);
  
  // Ativar relé
  digitalWrite(RELAY_PIN, HIGH);
  delay(2000); // Manter ativo por 2 segundos
  digitalWrite(RELAY_PIN, LOW);
  
  // Apagar LED
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("Portão fechado.");
}`;
  };

  if (!user) {
    return <div className="p-6">Acesso não autorizado</div>;
  }

  if (!selectedCondominium) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Deploy Arduino</h1>
        <p>Por favor, selecione um condomínio para continuar.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Deploy de Código Arduino</h1>
      
      {/* Seleção de dispositivo Arduino */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Dispositivos Arduino</h2>
        
        {isLoading ? (
          <p>Carregando dispositivos...</p>
        ) : arduinoConfigs.length === 0 ? (
          <p>Nenhum dispositivo Arduino configurado para este condomínio.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {arduinoConfigs.map((config) => (
              <div
                key={config.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedConfig?.id === config.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handleConfigSelect(config)}
              >
                <h3 className="font-semibold">{config.deviceName}</h3>
                <p className="text-sm text-gray-600">Código: {config.deviceCode}</p>
                <p className="text-sm text-gray-600">Local: {config.deviceLocation || 'Não especificado'}</p>
                <p className="text-sm text-gray-600">Porta: {config.connectionPort}</p>
                <div className="flex items-center mt-2">
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${
                      config.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm">
                    {config.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor de código */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Código Arduino</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCode(getDefaultArduinoCode())}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  disabled={isDeploying || isCompiling}
                >
                  Código Padrão
                </button>
                <button
                  onClick={handleCompile}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={!code.trim() || isCompiling || isDeploying}
                >
                  {isCompiling ? 'Validando...' : 'Validar Código'}
                </button>
              </div>
            </div>
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-96 font-mono text-sm border border-gray-300 rounded p-4 resize-none"
              placeholder="Cole ou digite seu código Arduino aqui..."
              disabled={isDeploying}
            />

            {/* Resultado da compilação */}
            {compileResult && (
              <div className={`mt-4 p-4 rounded ${
                compileResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className={`font-semibold ${compileResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {compileResult.success ? 'Validação bem-sucedida!' : 'Erro na validação'}
                </h3>
                {compileResult.details && (
                  <pre className="mt-2 text-sm whitespace-pre-wrap">{compileResult.details}</pre>
                )}
                {compileResult.errors && (
                  <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">{compileResult.errors}</pre>
                )}
              </div>
            )}
          </div>

          {/* Configurações de deploy */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Configurações de Deploy</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispositivo Selecionado
                </label>
                <input
                  type="text"
                  value={selectedConfig.deviceName}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porta Serial
                </label>
                <select
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={isDeploying}
                >
                  {availablePorts.map((portName) => (
                    <option key={portName} value={portName}>
                      {portName}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={isDeploying}
                >
                  <option value={9600}>9600</option>
                  <option value={19200}>19200</option>
                  <option value={38400}>38400</option>
                  <option value={57600}>57600</option>
                  <option value={115200}>115200</option>
                </select>
              </div>

              <button
                onClick={handleDeploy}
                className="w-full px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 font-semibold"
                disabled={!code.trim() || isDeploying || isCompiling}
              >
                {isDeploying ? 'Enviando código...' : 'Enviar para Arduino'}
              </button>

              {/* Resultado do deploy */}
              {deployResult && (
                <div className={`p-4 rounded ${
                  deployResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <h3 className={`font-semibold ${deployResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {deployResult.success ? 'Deploy realizado com sucesso!' : 'Erro no deploy'}
                  </h3>
                  {deployResult.message && (
                    <p className="mt-1 text-sm">{deployResult.message}</p>
                  )}
                  {deployResult.details && (
                    <pre className="mt-2 text-xs whitespace-pre-wrap bg-white p-2 rounded border">
                      {deployResult.details}
                    </pre>
                  )}
                  {deployResult.error && (
                    <p className="mt-1 text-sm text-red-600">{deployResult.error}</p>
                  )}
                </div>
              )}

              {/* Informações adicionais */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">Informações do Dispositivo</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Código:</strong> {selectedConfig.deviceCode}</p>
                  <p><strong>Tipo:</strong> {selectedConfig.deviceType}</p>
                  <p><strong>Local:</strong> {selectedConfig.deviceLocation || 'Não especificado'}</p>
                  <p><strong>Status:</strong> {selectedConfig.isOnline ? 'Online' : 'Offline'}</p>
                  {selectedConfig.lastPing && (
                    <p><strong>Último ping:</strong> {new Date(selectedConfig.lastPing).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-3">Instruções de Uso</h2>
        <div className="text-sm text-blue-700 space-y-2">
          <p>1. <strong>Selecione um dispositivo Arduino</strong> na lista acima.</p>
          <p>2. <strong>Cole ou digite o código</strong> no editor. Use &quot;Código Padrão&quot; para começar com um template.</p>
          <p>3. <strong>Valide o código</strong> antes do deploy para verificar se há erros de sintaxe.</p>
          <p>4. <strong>Configure a porta serial</strong> correta do seu Arduino.</p>
          <p>5. <strong>Clique em &quot;Enviar para Arduino&quot;</strong> para fazer o deploy do código.</p>
          <p className="mt-3 text-blue-600">
            <strong>Nota:</strong> O código é salvo automaticamente no banco de dados e pode ser reutilizado posteriormente.
          </p>
        </div>
      </div>
    </div>
  );
}
