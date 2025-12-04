/*
 * Controle de Cancela com Reconhecimento Facial e Sensor Ultrassônico
 * 
 * Este código controla uma cancela automatizada que:
 * - Abre quando recebe comando de reconhecimento facial via serial
 * - Mantém aberta enquanto detecta veículo no sensor ultrassônico
 * - Fecha automaticamente 10 segundos após veículo sair da área
 * - Controla LEDs para indicar estados: Aberto, Fechando, Fechado
 * 
 * Estados da Cancela:
 * - FECHADO: LED Vermelho aceso, cancela em 0°
 * - ABRINDO: LED Verde piscando, cancela movendo para 90°
 * - ABERTO: LED Verde aceso por 10s, cancela em 90°
 * - FECHANDO: LED Azul por 10s (ou loop infinito se veículo presente com bips a cada 3s)
 * 
 * Comandos Serial:
 * - FACE_RECOGNIZED: Abre a cancela
 * - FACE_REJECTED: Toca som de rejeição (não abre)
 * - OPEN_GATE: Abre manualmente
 * - CLOSE_GATE: Fecha manualmente
 * - STATUS: Retorna estado atual
 * - PING: Teste de conexão
 */

#include <Servo.h>

// Definição dos pinos
Servo gateServo;                    // Servo motor da cancela
const int SERVO_PIN = 9;           // Pino do servo motor
const int TRIG_PIN = 3;            // Pino TRIG do sensor ultrassônico
const int ECHO_PIN = 4;            // Pino ECHO do sensor ultrassônico
const int LED_VERMELHO = 5;        // Pino R do LED RGB - Vermelho
const int LED_VERDE = 6;           // Pino G do LED RGB - Verde
const int LED_AZUL = 7;            // Pino B do LED RGB - Azul
const int BUZZER_PIN = 8;          // Pino do Buzzer

// Estados da cancela
enum GateState {
  FECHADO,      // Cancela fechada
  ABRINDO,      // Cancela abrindo
  ABERTO,       // Cancela aberta
  FECHANDO      // Cancela fechando
};

// Variáveis de controle
GateState currentState = FECHADO;
unsigned long lastVehicleTime = 0;     // Último tempo que detectou veículo
unsigned long stateChangeTime = 0;     // Tempo da última mudança de estado
unsigned long lastSensorRead = 0;      // Último tempo de leitura do sensor
unsigned long lastWarningBeep = 0;     // Último bip de aviso (amarelo)
String receivedCommand = "";           // Buffer para comandos seriais

// Fila de comandos
const int MAX_QUEUE_SIZE = 10;
String commandQueue[MAX_QUEUE_SIZE];
int queueStart = 0;
int queueEnd = 0;
int queueSize = 0;
bool processingCommand = false;        // Flag para indicar se está processando comando

// Configurações
const int DETECTION_DISTANCE = 60;   // Distância de detecção em cm (60 cm)
const int OPEN_TIME = 10000;          // 10 segundos no verde (aberto)
const int WARNING_TIME = 10000;       // 10 segundos no azul (aviso)
const int WARNING_BEEP_INTERVAL = 3000; // Bip a cada 3s no azul com veículo
const int SENSOR_INTERVAL = 100;      // Intervalo de leitura do sensor (100ms)
const int SERVO_OPEN_ANGLE = 90;      // Ângulo para cancela aberta
const int SERVO_CLOSE_ANGLE = 0;      // Ângulo para cancela fechada

void setup() {
  // Inicializa comunicação serial
  Serial.begin(9600);
  
  // Configura pinos
  gateServo.attach(SERVO_PIN);
  pinMode(LED_VERMELHO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AZUL, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Estado inicial - cancela fechada
  gateServo.write(SERVO_CLOSE_ANGLE);
  setLEDState(FECHADO);
  currentState = FECHADO;
  stateChangeTime = millis();
  
  // Aguarda estabilização
  delay(1000);
  
  // Mensagem de inicialização
  Serial.println("Sistema de Cancela Inicializado!");
  Serial.println("Comandos disponíveis:");
  Serial.println("- FACE_RECOGNIZED: Abre cancela (reconhecimento facial)");
  Serial.println("- OPEN_GATE: Abre cancela manualmente");
  Serial.println("- CLOSE_GATE: Fecha cancela manualmente");
  Serial.println("- STATUS: Retorna estado atual");
  Serial.println("- PING: Teste de conexão");
  sendStatus();
}

void loop() {
  // Processa comandos seriais (adiciona à fila)
  processSerialCommands();
  
  // Processa próximo comando da fila
  processCommandQueue();
  
  // Lê sensor ultrassônico periodicamente
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    readUltrasonicSensor();
    lastSensorRead = millis();
  }
  
  // Máquina de estados da cancela
  processGateStateMachine();
  
  // Atualiza LEDs continuamente (especialmente importante para FECHANDO e ABRINDO)
  setLEDState(currentState);
  
  // Pequeno delay para estabilidade
  delay(10);
}

void processSerialCommands() {
  if (Serial.available() > 0) {
    char character = Serial.read();
    
    if (character == '\n' || character == '\r') {
      if (receivedCommand.length() > 0) {
        receivedCommand.trim();
        addCommandToQueue(receivedCommand);
        receivedCommand = "";
      }
    } else {
      receivedCommand += character;
    }
  }
}

// Adiciona comando à fila
void addCommandToQueue(String command) {
  command.toUpperCase();
  command.trim(); // Remove espaços em branco
  
  // VERIFICAÇÃO CRÍTICA: Ignora comandos vazios
  if (command.length() == 0) {
    Serial.println("AVISO: Comando vazio ignorado");
    return;
  }
  
  // FACE_REJECTED não entra na fila - executa imediatamente apenas o som
  if (command == "FACE_REJECTED") {
    Serial.println("INFO: Acesso negado - Tocando som de rejeição (não entra na fila)");
    playRejectedSound();
    return;
  }
  
  // Verifica se a fila está cheia
  if (queueSize >= MAX_QUEUE_SIZE) {
    Serial.println("ERRO: Fila de comandos cheia! Comando ignorado: " + command);
    return;
  }
  
  // Adiciona comando à fila
  commandQueue[queueEnd] = command;
  queueEnd = (queueEnd + 1) % MAX_QUEUE_SIZE;
  queueSize++;
  
  Serial.print("FILA: Comando adicionado - '");
  Serial.print(command);
  Serial.print("' (");
  Serial.print(queueSize);
  Serial.println(" na fila)");
}

// Processa próximo comando da fila
void processCommandQueue() {
  // Se não há comandos na fila ou já está processando, retorna
  if (queueSize == 0 || processingCommand) {
    return;
  }
  
  // Se a cancela está em movimento (ABRINDO ou FECHANDO), aguarda
  if (currentState == ABRINDO) {
    return; // Aguarda terminar de abrir
  }
  
  // Pega próximo comando da fila
  String command = commandQueue[queueStart];
  queueStart = (queueStart + 1) % MAX_QUEUE_SIZE;
  queueSize--;
  
  Serial.print("FILA: Processando comando - '");
  Serial.print(command);
  Serial.print("' (");
  Serial.print(queueSize);
  Serial.println(" restantes)");
  
  // Marca que está processando
  processingCommand = true;
  
  // Executa o comando
  executeCommand(command);
  
  // Marca que terminou de processar
  processingCommand = false;
}

void executeCommand(String command) {
  Serial.print("DEBUG: Executando comando: '");
  Serial.print(command);
  Serial.print("' (tamanho: ");
  Serial.print(command.length());
  Serial.println(" bytes)");
  
  // Comandos principais
  if (command == "FACE_RECOGNIZED" || command == "OPEN_GATE") {
    playApprovedSound(); // 2 bips curtos
    if (currentState == FECHADO) {
      Serial.println("OK: Abrindo cancela - Reconhecimento facial confirmado");
      changeState(ABRINDO);
    } else {
      Serial.println("INFO: Cancela já está aberta ou em movimento");
    }
  }
  else if (command == "CLOSE_GATE") {
    if (currentState == ABERTO) {
      Serial.println("OK: Fechando cancela manualmente");
      changeState(FECHANDO);
    } else {
      Serial.println("INFO: Cancela não está aberta");
    }
  }
  else if (command == "STATUS") {
    sendStatus();
  }
  else if (command == "PING") {
    Serial.println("PONG");
  }
  // COMANDOS DE TESTE - Para diagnóstico de componentes
  else if (command == "TEST_SERVO") {
    // Testa servo movendo 0° → 90° → 0°
    Serial.println("TEST: Testando servo motor...");
    gateServo.write(0);
    Serial.println("TEST: Servo em 0°");
    delay(1000);
    gateServo.write(90);
    Serial.println("TEST: Servo em 90°");
    delay(1000);
    gateServo.write(0);
    Serial.println("TEST: Servo retornou a 0° - Teste completo!");
  }
  else if (command == "TEST_LED_RED") {
    // Testa LED vermelho
    Serial.println("TEST: LED Vermelho ON por 2s");
    digitalWrite(LED_VERMELHO, HIGH);
    digitalWrite(LED_VERDE, LOW);
    digitalWrite(LED_AZUL, LOW);
    delay(2000);
    setLEDState(currentState); // Restaura estado atual
    Serial.println("TEST: LED Vermelho OFF - Teste completo!");
  }
  else if (command == "TEST_LED_GREEN") {
    // Testa LED verde
    Serial.println("TEST: LED Verde ON por 2s");
    digitalWrite(LED_VERMELHO, LOW);
    digitalWrite(LED_VERDE, HIGH);
    digitalWrite(LED_AZUL, LOW);
    delay(2000);
    setLEDState(currentState);
    Serial.println("TEST: LED Verde OFF - Teste completo!");
  }
  else if (command == "TEST_LED_BLUE") {
    // Testa LED azul
    Serial.println("TEST: LED Azul ON por 2s");
    digitalWrite(LED_VERMELHO, LOW);
    digitalWrite(LED_VERDE, LOW);
    digitalWrite(LED_AZUL, HIGH);
    delay(2000);
    setLEDState(currentState);
    Serial.println("TEST: LED Azul OFF - Teste completo!");
  }
  else if (command == "TEST_LED_ALL") {
    // Testa todos os LEDs em sequência
    Serial.println("TEST: Testando todos os LEDs (R→G→B)");
    digitalWrite(LED_VERMELHO, HIGH); digitalWrite(LED_VERDE, LOW); digitalWrite(LED_AZUL, LOW);
    delay(800);
    digitalWrite(LED_VERMELHO, LOW); digitalWrite(LED_VERDE, HIGH); digitalWrite(LED_AZUL, LOW);
    delay(800);
    digitalWrite(LED_VERMELHO, LOW); digitalWrite(LED_VERDE, LOW); digitalWrite(LED_AZUL, HIGH);
    delay(800);
    setLEDState(currentState);
    Serial.println("TEST: Todos os LEDs testados - Teste completo!");
  }
  else if (command == "TEST_BUZZER") {
    // Testa buzzer com 3 tons diferentes
    Serial.println("TEST: Testando buzzer (3 tons)");
    tone(BUZZER_PIN, 1000, 300); // Tom baixo
    delay(400);
    tone(BUZZER_PIN, 1500, 300); // Tom médio
    delay(400);
    tone(BUZZER_PIN, 2000, 300); // Tom alto
    delay(400);
    Serial.println("TEST: Buzzer testado - Teste completo!");
  }
  else if (command == "TEST_SENSOR") {
    // Testa sensor ultrassônico com 5 leituras
    Serial.println("TEST: Testando sensor HC-SR04 (5 leituras)");
    for (int i = 0; i < 5; i++) {
      digitalWrite(TRIG_PIN, LOW);
      delayMicroseconds(2);
      digitalWrite(TRIG_PIN, HIGH);
      delayMicroseconds(10);
      digitalWrite(TRIG_PIN, LOW);
      long duration = pulseIn(ECHO_PIN, HIGH, 30000);
      int distance = (duration * 0.034) / 2;
      Serial.print("TEST: Leitura ");
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(distance);
      Serial.println(" cm");
      delay(500);
    }
    Serial.println("TEST: Sensor testado - Teste completo!");
  }
  else if (command == "TEST_ALL") {
    // Testa todos os componentes em sequência
    Serial.println("TEST: INICIANDO TESTE COMPLETO DE TODOS OS COMPONENTES");
    Serial.println("============================================");
    
    // 1. Servo
    Serial.println("[1/5] Testando Servo Motor...");
    gateServo.write(0); delay(500);
    gateServo.write(90); delay(500);
    gateServo.write(0); delay(500);
    Serial.println("✓ Servo OK");
    
    // 2. LED Vermelho
    Serial.println("[2/5] Testando LED RGB - Vermelho...");
    digitalWrite(LED_VERMELHO, HIGH); digitalWrite(LED_VERDE, LOW); digitalWrite(LED_AZUL, LOW);
    delay(700);
    Serial.println("✓ LED Vermelho OK");
    
    // 3. LED Verde
    Serial.println("[3/5] Testando LED RGB - Verde...");
    digitalWrite(LED_VERMELHO, LOW); digitalWrite(LED_VERDE, HIGH); digitalWrite(LED_AZUL, LOW);
    delay(700);
    Serial.println("✓ LED Verde OK");
    
    // 4. LED Azul
    Serial.println("[4/5] Testando LED RGB - Azul...");
    digitalWrite(LED_VERMELHO, LOW); digitalWrite(LED_VERDE, LOW); digitalWrite(LED_AZUL, HIGH);
    delay(700);
    Serial.println("✓ LED Azul OK");
    
    // 5. Buzzer
    Serial.println("[5/5] Testando Buzzer...");
    tone(BUZZER_PIN, 1500, 200); delay(300);
    tone(BUZZER_PIN, 2000, 200); delay(300);
    Serial.println("✓ Buzzer OK");
    
    // 6. Sensor
    Serial.println("[6/6] Testando Sensor HC-SR04...");
    digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    long duration = pulseIn(ECHO_PIN, HIGH, 30000);
    int distance = (duration * 0.034) / 2;
    Serial.print("✓ Sensor OK - Distância atual: ");
    Serial.print(distance);
    Serial.println(" cm");
    
    Serial.println("============================================");
    Serial.println("✅ TESTE COMPLETO FINALIZADO - TODOS OS COMPONENTES OK!");
    
    // Restaura estado
    setLEDState(currentState);
  }
  else {
    Serial.print("ERRO: Comando desconhecido: '");
    Serial.print(command);
    Serial.println("'");
    Serial.println("Comandos disponíveis:");
    Serial.println("  - FACE_RECOGNIZED / OPEN_GATE");
    Serial.println("  - CLOSE_GATE");
    Serial.println("  - STATUS");
    Serial.println("  - PING");
    Serial.println("  - TEST_SERVO (testa servo motor)");
    Serial.println("  - TEST_LED_RED (testa LED vermelho)");
    Serial.println("  - TEST_LED_GREEN (testa LED verde)");
    Serial.println("  - TEST_LED_BLUE (testa LED azul)");
    Serial.println("  - TEST_LED_ALL (testa todos os LEDs)");
    Serial.println("  - TEST_BUZZER (testa buzzer)");
    Serial.println("  - TEST_SENSOR (testa sensor HC-SR04)");
    Serial.println("  - TEST_ALL (testa TODOS os componentes)");
  }
}

void readUltrasonicSensor() {
  // Envia pulso ultrassônico
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Calcula distância com timeout
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout de 30ms
  int distance = (duration * 0.034) / 2;
  
  // Debug de leitura do sensor
  static unsigned long lastSensorDebug = 0;
  if (millis() - lastSensorDebug >= 2000) { // A cada 2 segundos
    if (distance > 0 && distance <= DETECTION_DISTANCE) {
      Serial.print("HC-SR04: Detectando objeto a ");
      Serial.print(distance);
      Serial.println(" cm");
    } else if (distance > DETECTION_DISTANCE) {
      Serial.print("HC-SR04: Área livre (distância: ");
      Serial.print(distance);
      Serial.println(" cm)");
    } else {
      Serial.println("HC-SR04: Sem leitura (verificar conexões)");
    }
    lastSensorDebug = millis();
  }
  
  // Verifica se detectou veículo/obstáculo
  if (distance > 0 && distance <= DETECTION_DISTANCE) {
    lastVehicleTime = millis();
    
    // Debug - mostra detecção crítica
    static unsigned long lastDebugTime = 0;
    if (millis() - lastDebugTime >= 1000) { // Debug a cada 1 segundo
      Serial.print("⚠️ OBSTÁCULO DETECTADO: ");
      Serial.print(distance);
      Serial.print(" cm");
      
      // Mostra se está bloqueando fechamento
      if (currentState == FECHANDO) {
        unsigned long timeSinceStateChange = millis() - stateChangeTime;
        Serial.print(" - LED AZUL ATIVO - Fechamento BLOQUEADO (tempo: ");
        Serial.print(timeSinceStateChange / 1000);
        Serial.print("s)");
      }
      Serial.println();
      lastDebugTime = millis();
    }
  }
}

void processGateStateMachine() {
  unsigned long currentTime = millis();
  unsigned long timeSinceStateChange = currentTime - stateChangeTime;
  unsigned long timeSinceLastVehicle = currentTime - lastVehicleTime;
  bool vehiclePresent = (timeSinceLastVehicle < 1000); // Veículo detectado no último segundo
  
  switch (currentState) {
    case FECHADO:
      // Cancela fechada - aguarda comando para abrir
      break;
      
    case ABRINDO:
      // Cancela abrindo - aguarda completar movimento
      if (timeSinceStateChange >= 2000) { // 2 segundos para abrir
        gateServo.write(SERVO_OPEN_ANGLE);
        changeState(ABERTO);
        Serial.println("STATUS: Cancela totalmente aberta - LED VERDE por 10s");
      }
      break;
      
    case ABERTO:
      // Cancela aberta com LED VERDE por 10 segundos
      if (timeSinceStateChange >= OPEN_TIME) {
        Serial.println("STATUS: 10s de verde completos - Mudando para AZUL (aviso de fechamento)");
        changeState(FECHANDO);
        lastWarningBeep = 0; // Reset do timer de bip
      }
      break;
      
    case FECHANDO:
      // LED AZUL - aviso de fechamento
      
      if (vehiclePresent) {
        // VEÍCULO PRESENTE: Reinicia contagem + bip a cada 3s (LOOP INFINITO até veículo sair)
        if (timeSinceLastVehicle < 100) { // Recém detectado (< 100ms)
          Serial.println("STATUS: Veículo DETECTADO pelo HC-SR04 - REINICIANDO contagem de 10s no AZUL");
          stateChangeTime = currentTime; // Reinicia o timer (LOOP INFINITO)
          // NÃO reseta lastWarningBeep aqui - deixa seguir o intervalo de 3s
        }
        
        // Bip de aviso a cada 3 segundos enquanto veículo presente (WARNING_BEEP_INTERVAL = 3000ms)
        if (currentTime - lastWarningBeep >= WARNING_BEEP_INTERVAL) {
          Serial.println("AVISO: HC-SR04 detectando obstáculo - BIP! (cancela NÃO fechará)");
          tone(BUZZER_PIN, 1500, 200); // Bip de 200ms a 1500Hz (mais audível)
          lastWarningBeep = currentTime; // Atualiza tempo do último bip - próximo em 3s
        }
        
        // PROTEÇÃO: NÃO permite fechar enquanto sensor detectar algo
        // Permanece em loop no estado FECHANDO com LED AZUL
        
      } else {
        // SEM VEÍCULO: Após 10s no azul SEM detecção, pode fechar
        if (timeSinceStateChange >= WARNING_TIME) {
          Serial.println("STATUS: 10s de azul completos SEM veículo - Verificação final do sensor...");
          
          // VERIFICAÇÃO FINAL: Garante que não tem nada antes de fechar
          if (!vehiclePresent) {
            Serial.println("STATUS: Sensor limpo - FECHANDO cancela");
            gateServo.write(SERVO_CLOSE_ANGLE);
            changeState(FECHADO);
          } else {
            Serial.println("PROTEÇÃO: Veículo detectado na verificação final - CANCELANDO fechamento");
            stateChangeTime = currentTime; // Reinicia timer
          }
        }
      }
      break;
  }
}

void changeState(GateState newState) {
  currentState = newState;
  stateChangeTime = millis();
  setLEDState(newState);
  
  // Inicia movimento do servo se necessário
  if (newState == ABRINDO) {
    gateServo.write(SERVO_OPEN_ANGLE);
  }
  
  sendStatus();
}

void setLEDState(GateState state) {
  // Liga LED apropriado para o estado
  switch (state) {
    case FECHADO:
      // LED Vermelho
      digitalWrite(LED_VERMELHO, HIGH);
      digitalWrite(LED_VERDE, LOW);
      digitalWrite(LED_AZUL, LOW);
      break;
      
    case ABRINDO:
      // LED verde piscando durante abertura
      {
        static unsigned long lastBlink = 0;
        static bool blinkState = false;
        if (millis() - lastBlink >= 200) {
          blinkState = !blinkState;
          lastBlink = millis();
        }
        digitalWrite(LED_VERMELHO, LOW);
        digitalWrite(LED_VERDE, blinkState ? HIGH : LOW);
        digitalWrite(LED_AZUL, LOW);
      }
      break;
      
    case ABERTO:
      // LED Verde
      digitalWrite(LED_VERMELHO, LOW);
      digitalWrite(LED_VERDE, HIGH);
      digitalWrite(LED_AZUL, LOW);
      break;
      
    case FECHANDO:
      // LED AZUL (somente azul ligado)
      digitalWrite(LED_VERMELHO, LOW);
      digitalWrite(LED_VERDE, LOW);
      digitalWrite(LED_AZUL, HIGH);
      break;
  }
}

void sendStatus() {
  Serial.print("{\"gate_status\":{");
  Serial.print("\"state\":\"");
  
  switch (currentState) {
    case FECHADO:
      Serial.print("FECHADO");
      break;
    case ABRINDO:
      Serial.print("ABRINDO");
      break;
    case ABERTO:
      Serial.print("ABERTO");
      break;
    case FECHANDO:
      Serial.print("FECHANDO");
      break;
  }
  
  Serial.print("\",\"servo_angle\":");
  Serial.print(currentState == ABERTO || currentState == ABRINDO ? SERVO_OPEN_ANGLE : SERVO_CLOSE_ANGLE);
  Serial.print(",\"time_in_state\":");
  Serial.print((millis() - stateChangeTime) / 1000);
  Serial.print(",\"vehicle_detected\":");
  Serial.print((millis() - lastVehicleTime) < 2000 ? "true" : "false");
  Serial.println("}}");
}

void playApprovedSound() {
  // 2 bips curtos para acesso aprovado
  tone(BUZZER_PIN, 2000, 150);  // Primeiro bip
  delay(250);
  tone(BUZZER_PIN, 2000, 150);  // Segundo bip
  delay(150);
}

void playRejectedSound() {
  // 2 bips curtos + 1 longo para acesso negado
  tone(BUZZER_PIN, 2000, 150);  // Primeiro bip curto
  delay(250);
  tone(BUZZER_PIN, 2000, 150);  // Segundo bip curto
  delay(250);
  tone(BUZZER_PIN, 2000, 500);  // Um bip longo
  delay(500);
}

/*
 * INSTRUÇÕES DE MONTAGEM:
 * 
 * 1. Conecte o servo motor no pino 9
 * 2. Conecte o sensor ultrassônico:
 *    - TRIG no pino 3
 *    - ECHO no pino 4
 *    - VCC no 5V
 *    - GND no GND
 * 3. Conecte o LED RGB (cátodo comum) com resistores de 220Ω:
 *    - Pino R (Vermelho) no pino 5
 *    - Pino G (Verde) no pino 6
 *    - Pino B (Azul) no pino 7
 *    - Cátodo comum no GND
 * 4. Conecte o Buzzer Piezo:
 *    - Pino positivo no pino 8
 *    - Pino negativo no GND
 * 
 * INTEGRAÇÃO COM SISTEMA:
 * 
 * 1. O sistema Next.js envia "FACE_RECOGNIZED" quando detecta face autorizada
 * 2. Arduino abre a cancela → LED verde por 10s
 * 3. Após 10s verde → LED azul por 10s (aviso de fechamento)
 * 4. Se HC-SR04 detectar obstáculo no azul: LOOP INFINITO + bip a cada 3s (NÃO fecha)
 * 5. Se sem obstáculo por 10s no azul: fecha cancela e LED vermelho
 * 
 * PROTEÇÃO HC-SR04:
 * - Sensor monitora continuamente a área da cancela
 * - Se detectar algo ≤ 200cm durante LED azul: BLOQUEIA fechamento
 * - Cancela só fecha quando área estiver completamente livre
 * 
 * COMANDOS DE INTEGRAÇÃO:
 * 
 * - Envie "FACE_RECOGNIZED" do sistema de reconhecimento facial (2 bips curtos + abre cancela)
 * - Envie "FACE_REJECTED" para acesso negado (2 bips curtos + 1 longo)
 * - Use "STATUS" para monitorar estado atual
 * - "PING" para verificar conexão com Arduino
 * 
 * CORES DO LED RGB:
 * - Vermelho: Cancela Fechada
 * - Verde: Cancela Aberta (10s)
 * - Azul: Aviso de Fechamento (10s ou loop se HC-SR04 detectar algo)
 * - Verde Piscando: Cancela Abrindo
 */
