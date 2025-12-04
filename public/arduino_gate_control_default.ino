/*
 * Controle de Cancela com Reconhecimento Facial e Sensor Ultrassônico
 * DoorsERP - Código Padrão de Fábrica
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

const int SERVO_PIN = 9;
const int TRIG_PIN = 3;
const int ECHO_PIN = 4;
const int LED_VERMELHO = 5;
const int LED_VERDE = 6;
const int LED_AZUL = 7;
const int BUZZER_PIN = 8;

// Biblioteca do Servo
#include <Servo.h>

Servo servoMotor;

// Estados da cancela
enum EstadoCancela {
  FECHADO,
  ABRINDO,
  ABERTO,
  FECHANDO
};

EstadoCancela estadoAtual = FECHADO;

// Variáveis de controle
unsigned long tempoUltimaAbertura = 0;
unsigned long tempoUltimoBeep = 0;
unsigned long tempoInicioAbrindo = 0;
unsigned long tempoInicioFechando = 0;
unsigned long ultimoPiscar = 0;
const unsigned long TEMPO_ABERTO = 10000; // 10 segundos
const unsigned long INTERVALO_BEEP = 3000; // 3 segundos
const unsigned long TEMPO_MOVIMENTO_SERVO = 1000; // 1 segundo para servo se mover
const unsigned long TEMPO_FECHANDO = 10000; // 10 segundos fechando
const int DISTANCIA_DETECCAO = 50; // cm - ajuste conforme necessário
bool veiculoPresente = false;
bool ledEstado = false;
int anguloAtual = 0;

void setup() {
  Serial.begin(9600);
  
  // Configurar pinos
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_VERMELHO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AZUL, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Inicializar servo
  servoMotor.attach(SERVO_PIN);
  servoMotor.write(0); // Posição fechada
  
  // Estado inicial: Fechado
  digitalWrite(LED_VERMELHO, HIGH);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AZUL, LOW);
  
  Serial.println("Sistema iniciado - DoorsERP v1.0");
}

void loop() {
  // Verificar comandos serial
  if (Serial.available() > 0) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();
    processarComando(comando);
  }
  
  // Verificar presença de veículo
  veiculoPresente = detectarVeiculo();
  
  // Máquina de estados
  switch (estadoAtual) {
    case FECHADO:
      estadoFechado();
      break;
      
    case ABRINDO:
      estadoAbrindo();
      break;
      
    case ABERTO:
      estadoAberto();
      break;
      
    case FECHANDO:
      estadoFechando();
      break;
  }
  
  delay(100); // Pequeno delay para estabilidade
}

void processarComando(String comando) {
  if (comando == "FACE_RECOGNIZED") {
    Serial.println("OK:FACE_RECOGNIZED");
    abrirCancela();
  }
  else if (comando == "FACE_REJECTED") {
    Serial.println("OK:FACE_REJECTED");
    somRejeicao();
  }
  else if (comando == "OPEN_GATE") {
    Serial.println("OK:OPEN_GATE");
    abrirCancela();
  }
  else if (comando == "CLOSE_GATE") {
    Serial.println("OK:CLOSE_GATE");
    fecharCancela();
  }
  else if (comando == "STATUS") {
    enviarStatus();
  }
  else if (comando == "PING") {
    Serial.println("PONG");
  }
  else {
    Serial.println("ERROR:UNKNOWN_COMMAND");
  }
}


void bipAprovado() {
  // Dois bips rápidos
  for (int i = 0; i < 2; i++) {
    tone(BUZZER_PIN, 1000, 100); // 1kHz por 100ms
    delay(150);
  }
}

void abrirCancela() {
  if (estadoAtual == FECHADO || estadoAtual == FECHANDO) {
    // Servo sempre começa em 0° e abre até 90° em passos
    for (int ang = 0; ang <= 90; ang += 3) {
      servoMotor.write(ang);
      delay(15); // Suaviza o movimento
    }
    anguloAtual = 90;
    estadoAtual = ABRINDO;
    tempoInicioAbrindo = millis();
    Serial.println("STATUS:OPENING");
    digitalWrite(LED_VERMELHO, LOW);
    digitalWrite(LED_VERDE, HIGH);
    digitalWrite(LED_AZUL, LOW);
    bipAprovado();
  }
}

void fecharCancela() {
  if (estadoAtual == ABERTO) {
    estadoAtual = FECHANDO;
    tempoInicioFechando = millis();
    Serial.println("STATUS:CLOSING");
  }
}

bool detectarVeiculo() {
  // Limpar o trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Enviar pulso de 10us
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Ler o echo
  long duracao = pulseIn(ECHO_PIN, HIGH);
  
  // Calcular distância em cm
  int distancia = duracao * 0.034 / 2;
  
  return (distancia > 0 && distancia < DISTANCIA_DETECCAO);
}

void estadoFechado() {
  // LED Vermelho aceso
  digitalWrite(LED_VERMELHO, HIGH);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AZUL, LOW);
  
  // Cancela em 0°
  if (anguloAtual != 0) {
    servoMotor.write(0);
    anguloAtual = 0;
  }
}

void estadoAbrindo() {
  // LED Verde piscando
  if (millis() - ultimoPiscar > 250) {
    ledEstado = !ledEstado;
    digitalWrite(LED_VERDE, ledEstado ? HIGH : LOW);
    ultimoPiscar = millis();
  }
  
  digitalWrite(LED_VERMELHO, LOW);
  digitalWrite(LED_AZUL, LOW);
  
  // Mover servo para 90° (aberto)
  if (anguloAtual != 90) {
    servoMotor.write(90);
    anguloAtual = 90;
  }
  
  // Transição para ABERTO após movimento completo (sem delay bloqueante)
  if (millis() - tempoInicioAbrindo >= TEMPO_MOVIMENTO_SERVO) {
    estadoAtual = ABERTO;
    tempoUltimaAbertura = millis();
    Serial.println("STATUS:OPEN");
  }
}

void estadoAberto() {
  // LED Verde aceso
  digitalWrite(LED_VERMELHO, LOW);
  digitalWrite(LED_VERDE, HIGH);
  digitalWrite(LED_AZUL, LOW);
  
  // Cancela em 90°
  if (anguloAtual != 90) {
    servoMotor.write(90);
    anguloAtual = 90;
  }
  
  // Verificar se deve fechar (10s sem veículo)
  if (millis() - tempoUltimaAbertura >= TEMPO_ABERTO) {
    estadoAtual = FECHANDO;
    tempoInicioFechando = millis();
    Serial.println("STATUS:CLOSING");
  }
}

void estadoFechando() {
  // LED Azul aceso
  digitalWrite(LED_VERMELHO, LOW);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AZUL, HIGH);
  
  // Se veículo presente, não fecha e faz beeps
  if (veiculoPresente) {
    // Beep a cada 3 segundos
    if (millis() - tempoUltimoBeep >= INTERVALO_BEEP) {
      tone(BUZZER_PIN, 1000, 200); // 1kHz por 200ms
      tempoUltimoBeep = millis();
      Serial.println("WARNING:VEHICLE_DETECTED");
    }
    
    // Manter cancela aberta
    if (anguloAtual != 90) {
      servoMotor.write(90);
      anguloAtual = 90;
    }
    
    // Resetar timer de fechamento
    tempoInicioFechando = millis();
    return; // Não fecha enquanto houver veículo
  }
  
  // Fechar cancela
  if (anguloAtual != 0) {
    servoMotor.write(0);
    anguloAtual = 0;
  }
  
  // Transição para FECHADO após 10s (sem delay bloqueante)
  if (millis() - tempoInicioFechando >= TEMPO_FECHANDO) {
    estadoAtual = FECHADO;
    Serial.println("STATUS:CLOSED");
  }
}


void bipRejeitado() {
  // Dois bips rápidos
  for (int i = 0; i < 2; i++) {
    tone(BUZZER_PIN, 500, 100); // 500Hz por 100ms
    delay(150);
  }
  // Um bip longo
  tone(BUZZER_PIN, 300, 400); // 300Hz por 400ms
  delay(450);
}

void somRejeicao() {
  bipRejeitado();
}

void enviarStatus() {
  String status;
  switch (estadoAtual) {
    case FECHADO:
      status = "CLOSED";
      break;
    case ABRINDO:
      status = "OPENING";
      break;
    case ABERTO:
      status = "OPEN";
      digitalWrite(LED_VERMELHO, LOW);
      digitalWrite(LED_VERDE, HIGH);
      digitalWrite(LED_AZUL, LOW);
      break;
    case FECHANDO:
      status = "CLOSING";
      break;
  }
  
  Serial.print("STATUS:");
  Serial.println(status);
  Serial.print("VEHICLE:");
  Serial.println(veiculoPresente ? "PRESENT" : "ABSENT");
}