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
 * - ABERTO: LED Verde aceso, cancela em 90°
 * - FECHANDO: LED Amarelo aceso por 10s, depois LED Vermelho, cancela movendo para 0°
 * 
 * Comandos Serial:
 * - FACE_RECOGNIZED: Abre a cancela
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
const int LED_VERDE = 5;           // LED Verde - Cancela Aberta
const int LED_AMARELO = 6;         // LED Amarelo - Cancela Fechando
const int LED_VERMELHO = 7;        // LED Vermelho - Cancela Fechada

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
String receivedCommand = "";           // Buffer para comandos seriais

// Configurações
const int DETECTION_DISTANCE = 200;   // Distância de detecção em cm (2 metros)
const int CLOSE_DELAY = 10000;        // 10 segundos antes de fechar
const int CLOSING_LED_TIME = 10000;   // 10 segundos com LED amarelo
const int SENSOR_INTERVAL = 100;      // Intervalo de leitura do sensor (100ms)
const int SERVO_OPEN_ANGLE = 90;      // Ângulo para cancela aberta
const int SERVO_CLOSE_ANGLE = 0;      // Ângulo para cancela fechada

void setup() {
  // Inicializa comunicação serial
  Serial.begin(9600);
  
  // Configura pinos
  gateServo.attach(SERVO_PIN);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARELO, OUTPUT);
  pinMode(LED_VERMELHO, OUTPUT);
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
  // Processa comandos seriais
  processSerialCommands();
  
  // Lê sensor ultrassônico periodicamente
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    readUltrasonicSensor();
    lastSensorRead = millis();
  }
  
  // Máquina de estados da cancela
  processGateStateMachine();
  
  // Pequeno delay para estabilidade
  delay(10);
}

void processSerialCommands() {
  if (Serial.available() > 0) {
    char character = Serial.read();
    
    if (character == '\n' || character == '\r') {
      if (receivedCommand.length() > 0) {
        receivedCommand.trim();
        executeCommand(receivedCommand);
        receivedCommand = "";
      }
    } else {
      receivedCommand += character;
    }
  }
}

void executeCommand(String command) {
  command.toUpperCase();
  
  if (command == "FACE_RECOGNIZED" || command == "OPEN_GATE") {
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
  else {
    Serial.print("ERRO: Comando desconhecido: ");
    Serial.println(command);
  }
}

void readUltrasonicSensor() {
  // Envia pulso ultrassônico
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Calcula distância
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = (duration * 0.034) / 2;
  
  // Verifica se detectou veículo
  if (distance > 0 && distance <= DETECTION_DISTANCE) {
    lastVehicleTime = millis();
    
    // Debug - mostra detecção apenas quando necessário
    static unsigned long lastDebugTime = 0;
    if (millis() - lastDebugTime >= 1000) { // Debug a cada 1 segundo
      Serial.print("SENSOR: Veículo detectado a ");
      Serial.print(distance);
      Serial.println(" cm");
      lastDebugTime = millis();
    }
  }
}

void processGateStateMachine() {
  unsigned long currentTime = millis();
  unsigned long timeSinceStateChange = currentTime - stateChangeTime;
  unsigned long timeSinceLastVehicle = currentTime - lastVehicleTime;
  
  switch (currentState) {
    case FECHADO:
      // Cancela fechada - aguarda comando para abrir
      break;
      
    case ABRINDO:
      // Cancela abrindo - aguarda completar movimento
      if (timeSinceStateChange >= 2000) { // 2 segundos para abrir
        gateServo.write(SERVO_OPEN_ANGLE);
        changeState(ABERTO);
        Serial.println("STATUS: Cancela totalmente aberta");
      }
      break;
      
    case ABERTO:
      // Cancela aberta - verifica se deve iniciar fechamento
      if (timeSinceLastVehicle >= CLOSE_DELAY) {
        Serial.println("STATUS: Nenhum veículo detectado há 10s - Iniciando fechamento");
        changeState(FECHANDO);
      }
      break;
      
    case FECHANDO:
      if (timeSinceStateChange < CLOSING_LED_TIME) {
        // Primeiros 10 segundos - LED amarelo (aviso de fechamento)
        // Verifica se veículo retornou
        if (timeSinceLastVehicle < 1000) { // Veículo detectado recentemente
          Serial.println("STATUS: Veículo detectado - Cancelando fechamento");
          changeState(ABERTO);
          return;
        }
      } else {
        // Após 10 segundos - realmente fecha a cancela
        gateServo.write(SERVO_CLOSE_ANGLE);
        changeState(FECHADO);
        Serial.println("STATUS: Cancela totalmente fechada");
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
  // Desliga todos os LEDs primeiro
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARELO, LOW);
  digitalWrite(LED_VERMELHO, LOW);
  
  // Liga LED apropriado para o estado
  switch (state) {
    case FECHADO:
      digitalWrite(LED_VERMELHO, HIGH);
      break;
      
    case ABRINDO:
      // LED verde piscando durante abertura
      static unsigned long lastBlink = 0;
      static bool blinkState = false;
      if (millis() - lastBlink >= 200) {
        blinkState = !blinkState;
        digitalWrite(LED_VERDE, blinkState ? HIGH : LOW);
        lastBlink = millis();
      }
      break;
      
    case ABERTO:
      digitalWrite(LED_VERDE, HIGH);
      break;
      
    case FECHANDO:
      unsigned long timeSinceStateChange = millis() - stateChangeTime;
      if (timeSinceStateChange < CLOSING_LED_TIME) {
        digitalWrite(LED_AMARELO, HIGH); // Primeiro 10s - LED amarelo
      } else {
        digitalWrite(LED_VERMELHO, HIGH); // Próximos 10s - LED vermelho
      }
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

/*
 * INSTRUÇÕES DE MONTAGEM:
 * 
 * 1. Conecte o servo motor no pino 9
 * 2. Conecte o sensor ultrassônico:
 *    - TRIG no pino 3
 *    - ECHO no pino 4
 *    - VCC no 5V
 *    - GND no GND
 * 3. Conecte os LEDs com resistores de 220Ω:
 *    - LED Verde no pino 5 (Cancela Aberta)
 *    - LED Amarelo no pino 6 (Fechando - Aviso)
 *    - LED Vermelho no pino 7 (Cancela Fechada)
 * 
 * INTEGRAÇÃO COM SISTEMA:
 * 
 * 1. O sistema Next.js envia "FACE_RECOGNIZED" quando detecta face autorizada
 * 2. Arduino abre a cancela e monitora sensor ultrassônico
 * 3. Cancela permanece aberta enquanto detecta veículo
 * 4. Após 10s sem detecção, inicia processo de fechamento
 * 5. LED amarelo acende por 10s (aviso), depois fecha definitivamente
 * 
 * COMANDOS DE INTEGRAÇÃO:
 * 
 * - Envie "FACE_RECOGNIZED" do sistema de reconhecimento facial
 * - Use "STATUS" para monitorar estado atual
 * - "PING" para verificar conexão com Arduino
 */
