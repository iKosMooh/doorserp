/*
 * SISTEMA UNIFICADO DE CONTROLE DE CANCELA AUTOMATIZADA
 * DoorsERP - Sistema de Portaria Inteligente
 * 
 * Este código controla uma cancela automatizada que integra:
 * - Reconhecimento facial via comunicação serial
 * - Sensor ultrassônico para detecção de veículos
 * - Controle de servo motor para abertura/fechamento
 * - Sistema de LEDs para indicação de estados
 * - LEDs auxiliares para controles adicionais
 * - Lógica inteligente de temporização
 * 
 * COMANDOS SUPORTADOS:
 * - FACE_RECOGNIZED: Abre cancela após reconhecimento facial
 * - OPEN_GATE: Abre cancela manualmente
 * - CLOSE_GATE: Fecha cancela manualmente
 * - L1_ON/L1_OFF: Controla LED auxiliar 1
 * - L2_ON/L2_OFF: Controla LED auxiliar 2
 * - STATUS: Retorna estado completo do sistema
 * - PING: Teste de conexão
 * 
 * LÓGICA DE FUNCIONAMENTO:
 * 1. Sistema aguarda comando de reconhecimento facial
 * 2. Cancela abre e LED verde acende
 * 3. Sensor monitora presença de veículo continuamente
 * 4. Cancela permanece aberta enquanto detecta movimento
 * 5. Após 10s sem detecção, LED amarelo acende (aviso)
 * 6. Após mais 10s, cancela fecha e LED vermelho acende
 * 7. Se veículo retornar durante aviso, cancela permanece aberta
 */

#include <Servo.h>

// ===============================================
// DEFINIÇÃO DOS PINOS E COMPONENTES
// ===============================================

// Servo motor da cancela
Servo gateServo;                    
const int SERVO_PIN = 9;           // Pino do servo motor da cancela

// Sensor ultrassônico HC-SR04
const int TRIG_PIN = 10;           // Pino TRIG do sensor ultrassônico
const int ECHO_PIN = 11;           // Pino ECHO do sensor ultrassônico

// LEDs de estado da cancela
const int LED_VERDE = 12;          // LED Verde - Cancela Aberta
const int LED_AMARELO = 13;        // LED Amarelo - Cancela Fechando (Aviso)
const int LED_VERMELHO = 2;        // LED Vermelho - Cancela Fechada

// LEDs auxiliares para controles adicionais
const int LED_AUX_1 = 3;           // LED auxiliar 1 (controlável via serial)
const int LED_AUX_2 = 4;           // LED auxiliar 2 (controlável via serial)

// ===============================================
// ESTADOS E VARIÁVEIS DE CONTROLE
// ===============================================

// Estados possíveis da cancela
enum GateState {
  FECHADO,      // Cancela fechada (LED vermelho)
  ABRINDO,      // Cancela abrindo (LED verde piscando)
  ABERTO,       // Cancela aberta (LED verde fixo)
  FECHANDO      // Cancela fechando (LED amarelo por 10s, depois vermelho)
};

// Variáveis de controle do sistema
GateState currentState = FECHADO;              // Estado atual da cancela
unsigned long lastVehicleTime = 0;             // Último tempo que detectou veículo
unsigned long stateChangeTime = 0;             // Tempo da última mudança de estado
unsigned long lastSensorRead = 0;              // Último tempo de leitura do sensor
unsigned long lastBlinkTime = 0;               // Para controle do LED piscante
bool blinkState = false;                       // Estado atual do pisca-pisca
bool ledAux1State = false;                     // Estado do LED auxiliar 1
bool ledAux2State = false;                     // Estado do LED auxiliar 2

// Buffer para comandos recebidos via serial
String comandoRecebido = "";

// ===============================================
// CONFIGURAÇÕES DO SISTEMA
// ===============================================

const int DETECTION_DISTANCE = 200;           // Distância máxima de detecção (2 metros)
const int CLOSE_DELAY = 10000;                // Tempo antes de iniciar fechamento (10s)
const int CLOSING_LED_TIME = 10000;           // Tempo com LED amarelo de aviso (10s)
const int SENSOR_INTERVAL = 100;              // Intervalo entre leituras do sensor (100ms)
const int BLINK_INTERVAL = 300;               // Intervalo para LED piscante (300ms)
const int SERVO_OPEN_ANGLE = 90;              // Ângulo do servo para cancela aberta
const int SERVO_CLOSE_ANGLE = 0;              // Ângulo do servo para cancela fechada
const int SERVO_MOVE_TIME = 2000;             // Tempo para movimento completo do servo (2s)

// ===============================================
// CONFIGURAÇÃO INICIAL DO SISTEMA
// ===============================================

void setup() {
  // Inicializa comunicação serial
  Serial.begin(9600);
  
  // Configura pinos da cancela
  gateServo.attach(SERVO_PIN);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARELO, OUTPUT);
  pinMode(LED_VERMELHO, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Configura pinos auxiliares
  pinMode(LED_AUX_1, OUTPUT);
  pinMode(LED_AUX_2, OUTPUT);
  
  // Estado inicial seguro - cancela fechada
  gateServo.write(SERVO_CLOSE_ANGLE);
  currentState = FECHADO;
  stateChangeTime = millis();
  lastVehicleTime = 0;
  lastSensorRead = 0;
  lastBlinkTime = 0;
  
  // Configura LEDs iniciais
  setGateLEDs(FECHADO);
  
  // Garante que LEDs auxiliares iniciem desligados
  digitalWrite(LED_AUX_1, LOW);
  digitalWrite(LED_AUX_2, LOW);
  ledAux1State = false;
  ledAux2State = false;
  
  // Aguarda estabilização do sistema
  delay(1000);
  
  // Mensagens de inicialização
  Serial.println("===========================================");
  Serial.println("   SISTEMA DE CANCELA AUTOMATIZADA");
  Serial.println("        DoorsERP - Portaria Inteligente");
  Serial.println("===========================================");
  Serial.println();
  Serial.println("COMANDOS DISPONÍVEIS:");
  Serial.println("  CANCELA:");
  Serial.println("  - FACE_RECOGNIZED  : Abre cancela (reconhecimento facial)");
  Serial.println("  - OPEN_GATE        : Abre cancela manualmente");
  Serial.println("  - CLOSE_GATE       : Fecha cancela manualmente");
  Serial.println();
  Serial.println("  AUXILIARES:");
  Serial.println("  - L1_ON / L1_OFF   : Controla LED auxiliar 1");
  Serial.println("  - L2_ON / L2_OFF   : Controla LED auxiliar 2");
  Serial.println();
  Serial.println("  SISTEMA:");
  Serial.println("  - STATUS           : Retorna estado completo");
  Serial.println("  - PING             : Teste de conexão");
  Serial.println();
  Serial.println("Sistema inicializado com sucesso!");
  Serial.println("===========================================");
  
  // Envia status inicial
  enviarStatus();
}

// ===============================================
// LOOP PRINCIPAL DO SISTEMA
// ===============================================

void loop() {
  // Processa comandos recebidos via serial
  processarComandosSerial();
  
  // Lê sensor ultrassônico em intervalos regulares
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    lerSensorUltrassonico();
    lastSensorRead = millis();
  }
  
  // Executa máquina de estados da cancela
  processarMaquinaEstados();
  
  // Atualiza LEDs (incluindo pisca-pisca)
  atualizarLEDs();
  
  // Pequeno delay para estabilidade do sistema
  delay(10);
}

// ===============================================
// PROCESSAMENTO DE COMANDOS SERIAIS
// ===============================================

void processarComandosSerial() {
  if (Serial.available() > 0) {
    char caractere = Serial.read();
    
    if (caractere == '\n' || caractere == '\r') {
      if (comandoRecebido.length() > 0) {
        comandoRecebido.trim();
        processarComando(comandoRecebido);
        comandoRecebido = "";
      }
    } else {
      comandoRecebido += caractere;
    }
  }
}

void processarComando(String comando) {
  comando.toUpperCase();
  
  // ===============================================
  // COMANDOS DE CONTROLE DA CANCELA
  // ===============================================
  
  if (comando == "FACE_RECOGNIZED" || comando == "OPEN_GATE") {
    if (currentState == FECHADO) {
      Serial.println("✓ OK: Abrindo cancela - Acesso autorizado");
      Serial.println("INFO: Reconhecimento facial confirmado");
      mudarEstadoCancela(ABRINDO);
    } else {
      Serial.print("⚠ INFO: Cancela já está ");
      Serial.println(obterNomeEstado(currentState));
    }
  }
  else if (comando == "CLOSE_GATE") {
    if (currentState == ABERTO) {
      Serial.println("✓ OK: Fechando cancela manualmente");
      mudarEstadoCancela(FECHANDO);
    } else {
      Serial.print("⚠ INFO: Cancela não está aberta - Estado atual: ");
      Serial.println(obterNomeEstado(currentState));
    }
  }
  
  // ===============================================
  // COMANDOS DOS LEDS AUXILIARES
  // ===============================================
  
  else if (comando == "L1_ON") {
    digitalWrite(LED_AUX_1, HIGH);
    ledAux1State = true;
    Serial.println("✓ OK: LED auxiliar 1 LIGADO");
    enviarStatus();
  }
  else if (comando == "L1_OFF") {
    digitalWrite(LED_AUX_1, LOW);
    ledAux1State = false;
    Serial.println("✓ OK: LED auxiliar 1 DESLIGADO");
    enviarStatus();
  }
  else if (comando == "L2_ON") {
    digitalWrite(LED_AUX_2, HIGH);
    ledAux2State = true;
    Serial.println("✓ OK: LED auxiliar 2 LIGADO");
    enviarStatus();
  }
  else if (comando == "L2_OFF") {
    digitalWrite(LED_AUX_2, LOW);
    ledAux2State = false;
    Serial.println("✓ OK: LED auxiliar 2 DESLIGADO");
    enviarStatus();
  }
  
  // ===============================================
  // COMANDOS DE SISTEMA
  // ===============================================
  
  else if (comando == "STATUS") {
    Serial.println("📊 STATUS SOLICITADO:");
    enviarStatus();
  }
  else if (comando == "PING") {
    Serial.println("PONG - Sistema ativo e respondendo!");
  }
  
  // ===============================================
  // COMANDO NÃO RECONHECIDO
  // ===============================================
  
  else {
    Serial.print("❌ ERRO: Comando desconhecido: '");
    Serial.print(comando);
    Serial.println("'");
    Serial.println("Digite 'STATUS' para ver comandos disponíveis");
  }
}

// ===============================================
// LEITURA DO SENSOR ULTRASSÔNICO
// ===============================================

void lerSensorUltrassonico() {
  // Limpa o pino TRIG
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Envia pulso ultrassônico de 10 microssegundos
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Lê o tempo de retorno do pulso
  long duracao = pulseIn(ECHO_PIN, HIGH);
  
  // Calcula a distância em centímetros
  // Velocidade do som = 343 m/s = 0.0343 cm/μs
  // Distância = (tempo * velocidade) / 2 (ida e volta)
  int distancia = (duracao * 0.0343) / 2;
  
  // Verifica se a leitura é válida e se detectou veículo
  if (distancia > 0 && distancia <= DETECTION_DISTANCE) {
    lastVehicleTime = millis();
    
    // Debug: mostra detecção a cada 2 segundos para não sobrecarregar
    static unsigned long ultimoDebug = 0;
    if (millis() - ultimoDebug >= 2000) {
      Serial.print("🚗 SENSOR: Veículo detectado a ");
      Serial.print(distancia);
      Serial.println(" cm");
      ultimoDebug = millis();
    }
  }
  
  // Debug para leituras inválidas (ocasionalmente)
  if (distancia <= 0 && millis() % 10000 < 100) { // A cada ~10s por ~100ms
    Serial.println("⚠ SENSOR: Leitura inválida ou fora de alcance");
  }
}

void processarMaquinaEstados() {
  unsigned long tempoAtual = millis();
  unsigned long tempoNoEstado = tempoAtual - stateChangeTime;
  unsigned long tempoSemVeiculo = tempoAtual - lastVehicleTime;
  
  switch (currentState) {
    
    // ===============================================
    // ESTADO: CANCELA FECHADA
    // ===============================================
    case FECHADO:
      // Aguarda comando para abrir
      // LED vermelho permanece aceso
      break;
      
    // ===============================================
    // ESTADO: CANCELA ABRINDO
    // ===============================================
    case ABRINDO:
      // Aguarda completar movimento do servo (2 segundos)
      if (tempoNoEstado >= SERVO_MOVE_TIME) {
        Serial.println("✅ CANCELA: Totalmente aberta - Monitorando sensor");
        mudarEstadoCancela(ABERTO);
      }
      break;
      
    // ===============================================
    // ESTADO: CANCELA ABERTA
    // ===============================================
    case ABERTO:
      // Monitora sensor - inicia fechamento se não detectar veículo por 10s
      if (tempoSemVeiculo >= CLOSE_DELAY) {
        Serial.println("⏰ TIMEOUT: Sem veículo há 10s - Iniciando fechamento");
        Serial.println("🟡 AVISO: LED amarelo - Cancela fechará em 10s");
        mudarEstadoCancela(FECHANDO);
      }
      break;
      
    // ===============================================  
    // ESTADO: CANCELA FECHANDO
    // ===============================================
    case FECHANDO:
      if (tempoNoEstado < CLOSING_LED_TIME) {
        // Primeiros 10 segundos: LED amarelo (período de aviso)
        // Verifica se veículo retornou
        if (tempoSemVeiculo < 1000) { // Detectou veículo recentemente
          Serial.println("🚗 RETORNO: Veículo detectado - Cancelando fechamento");
          Serial.println("✅ REABRINDO: Voltando ao estado aberto");
          mudarEstadoCancela(ABERTO);
          return;
        }
        
        // Aviso periódico durante fechamento
        static unsigned long ultimoAviso = 0;
        if (tempoAtual - ultimoAviso >= 3000) { // A cada 3 segundos
          unsigned long restante = (CLOSING_LED_TIME - tempoNoEstado) / 1000;
          Serial.print("⚠ FECHANDO: Cancela fechará em ");
          Serial.print(restante);
          Serial.println(" segundos");
          ultimoAviso = tempoAtual;
        }
        
      } else {
        // Após 10 segundos: executa fechamento
        Serial.println("🔴 FECHANDO: Movendo servo para posição fechada");
        gateServo.write(SERVO_CLOSE_ANGLE);
        mudarEstadoCancela(FECHADO);
        Serial.println("✅ FECHADO: Cancela totalmente fechada e segura");
      }
      break;
  }
}

void mudarEstadoCancela(GateState novoEstado) {
  GateState estadoAnterior = currentState;
  currentState = novoEstado;
  stateChangeTime = millis();
  
  // Inicia movimento do servo se necessário
  if (novoEstado == ABRINDO) {
    Serial.println("🔧 SERVO: Movendo para posição aberta (90°)");
    gateServo.write(SERVO_OPEN_ANGLE);
  }
  
  // Log da mudança de estado
  Serial.print("🔄 MUDANÇA: ");
  Serial.print(obterNomeEstado(estadoAnterior));
  Serial.print(" → ");
  Serial.println(obterNomeEstado(novoEstado));
  
  // Envia status atualizado
  enviarStatus();
}

void atualizarLEDs() {
  // Desliga todos os LEDs da cancela primeiro
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARELO, LOW);
  digitalWrite(LED_VERMELHO, LOW);
  
  unsigned long tempoAtual = millis();
  unsigned long tempoNoEstado = tempoAtual - stateChangeTime;
  
  switch (currentState) {
    
    // ===============================================
    // LED VERMELHO: CANCELA FECHADA
    // ===============================================
    case FECHADO:
      digitalWrite(LED_VERMELHO, HIGH);
      break;
      
    // ===============================================
    // LED VERDE PISCANTE: CANCELA ABRINDO  
    // ===============================================
    case ABRINDO:
      // LED verde piscando durante abertura
      if (tempoAtual - lastBlinkTime >= BLINK_INTERVAL) {
        blinkState = !blinkState;
        digitalWrite(LED_VERDE, blinkState ? HIGH : LOW);
        lastBlinkTime = tempoAtual;
      }
      break;
      
    // ===============================================
    // LED VERDE FIXO: CANCELA ABERTA
    // ===============================================
    case ABERTO:
      digitalWrite(LED_VERDE, HIGH);
      break;
      
    // ===============================================
    // LED AMARELO → VERMELHO: CANCELA FECHANDO
    // ===============================================
    case FECHANDO:
      if (tempoNoEstado < CLOSING_LED_TIME) {
        // Primeiros 10s: LED amarelo (período de aviso)
        digitalWrite(LED_AMARELO, HIGH);
      } else {
        // Últimos momentos: LED vermelho (fechando realmente)
        digitalWrite(LED_VERMELHO, HIGH);
      }
      break;
  }
}

// Função auxiliar para obter nome do estado
String obterNomeEstado(GateState estado) {
  switch (estado) {
    case FECHADO:  return "FECHADO";
    case ABRINDO:  return "ABRINDO";
    case ABERTO:   return "ABERTO";
    case FECHANDO: return "FECHANDO";
    default:       return "DESCONHECIDO";
  }
}

// Função para enviar o status completo do sistema
void enviarStatus() {
  unsigned long tempoAtual = millis();
  unsigned long tempoNoEstado = (tempoAtual - stateChangeTime) / 1000;
  unsigned long tempoSemVeiculo = (tempoAtual - lastVehicleTime) / 1000;
  bool veiculoDetectado = (tempoAtual - lastVehicleTime) < 2000;
  
  // Status em formato JSON para integração com sistema
  Serial.print("{\"gate_system\":{");
  Serial.print("\"state\":\"");
  Serial.print(obterNomeEstado(currentState));
  Serial.print("\",\"servo_angle\":");
  Serial.print(currentState == ABERTO || currentState == ABRINDO ? SERVO_OPEN_ANGLE : SERVO_CLOSE_ANGLE);
  Serial.print(",\"time_in_state\":");
  Serial.print(tempoNoEstado);
  Serial.print(",\"vehicle_detected\":");
  Serial.print(veiculoDetectado ? "true" : "false");
  Serial.print(",\"time_since_vehicle\":");
  Serial.print(tempoSemVeiculo);
  Serial.print(",\"aux_led1\":");
  Serial.print(ledAux1State ? "true" : "false");
  Serial.print(",\"aux_led2\":");
  Serial.print(ledAux2State ? "true" : "false");
  Serial.print(",\"uptime\":");
  Serial.print(tempoAtual / 1000);
  Serial.println("}}");
  
  // Status legível para humanos
  Serial.println();
  Serial.println("📊 ===== STATUS DO SISTEMA =====");
  Serial.print("🏠 Estado da Cancela: ");
  Serial.println(obterNomeEstado(currentState));
  
  switch (currentState) {
    case FECHADO:
      Serial.println("🔴 LED Vermelho: LIGADO");
      Serial.println("🔧 Servo Motor: 0° (Fechado)");
      break;
      
    case ABRINDO:
      Serial.println("🟢 LED Verde: PISCANDO");
      Serial.println("🔧 Servo Motor: Movendo para 90°");
      Serial.print("⏱ Tempo abrindo: ");
      Serial.print(tempoNoEstado);
      Serial.println("s");
      break;
      
    case ABERTO:
      Serial.println("🟢 LED Verde: LIGADO");
      Serial.println("🔧 Servo Motor: 90° (Aberto)");
      Serial.print("⏱ Aberto há: ");
      Serial.print(tempoNoEstado);
      Serial.println("s");
      break;
      
    case FECHANDO:
      if (tempoNoEstado < (CLOSING_LED_TIME / 1000)) {
        Serial.println("🟡 LED Amarelo: LIGADO (Aviso)");
        Serial.print("⚠ Fechará em: ");
        Serial.print((CLOSING_LED_TIME / 1000) - tempoNoEstado);
        Serial.println("s");
      } else {
        Serial.println("🔴 LED Vermelho: LIGADO");
        Serial.println("🔧 Servo Motor: Movendo para 0°");
      }
      break;
  }
  
  Serial.print("🚗 Veículo: ");
  if (veiculoDetectado) {
    Serial.println("DETECTADO");
  } else {
    Serial.print("Não detectado há ");
    Serial.print(tempoSemVeiculo);
    Serial.println("s");
  }
  
  Serial.print("💡 LED Aux 1: ");
  Serial.println(ledAux1State ? "LIGADO" : "DESLIGADO");
  Serial.print("💡 LED Aux 2: ");
  Serial.println(ledAux2State ? "LIGADO" : "DESLIGADO");
  
  Serial.print("⏰ Sistema ativo há: ");
  Serial.print(tempoAtual / 1000);
  Serial.println("s");
  Serial.println("==============================");
  Serial.println();
}

/*
 * INSTRUÇÕES DE MONTAGEM:
 * 
 * CANCELA:
 * 1. Servo motor no pino 9
 * 2. Sensor ultrassônico HC-SR04:
 *    - TRIG no pino 10
 *    - ECHO no pino 11
 *    - VCC no 5V, GND no GND
 * 3. LEDs da cancela (com resistores 220Ω):
 *    - LED Verde no pino 12 (Cancela Aberta)
 *    - LED Amarelo no pino 13 (Fechando - Aviso)
 *    - LED Vermelho no pino 2 (Cancela Fechada)
 * 
 * CONTROLES AUXILIARES:
 * 4. LEDs auxiliares (com resistores 220Ω):
 *    - LED Auxiliar 1 no pino 3
 *    - LED Auxiliar 2 no pino 4
 * 
 * INTEGRAÇÃO COM SISTEMA:
 * 
 * 1. Sistema Next.js envia "FACE_RECOGNIZED" quando detecta face autorizada
 * 2. Arduino abre a cancela automaticamente
 * 3. Sensor ultrassônico monitora presença de veículo
 * 4. Cancela permanece aberta enquanto detecta movimento
 * 5. Após 10s sem detecção, inicia aviso de fechamento (LED amarelo)
 * 6. Após mais 10s, fecha definitivamente a cancela
 * 
 * ESTADOS E INDICADORES:
 * 
 * - LED Vermelho: Cancela fechada
 * - LED Verde: Cancela aberta/abrindo
 * - LED Amarelo: Aviso de fechamento (10s)
 * - LEDs Auxiliares: Controle manual adicional
 * 
 * COMANDOS DE INTEGRAÇÃO:
 * 
 * - "FACE_RECOGNIZED": Abre cancela (enviado pelo sistema de reconhecimento)
 * - "OPEN_GATE"/"CLOSE_GATE": Controle manual
 * - "L1_ON"/"L1_OFF": Controla LED auxiliar 1
 * - "L2_ON"/"L2_OFF": Controla LED auxiliar 2
 * - "STATUS": Retorna estado completo do sistema
 * - "PING": Teste de conexão
 */
