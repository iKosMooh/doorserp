/*
  Buzzer - Apito a cada 7 segundos
  Arduino Uno
  
  Emite um apito curto a cada 7 segundos usando um buzzer piezoelétrico
*/

// Definição do pino do buzzer
const int BUZZER_PIN = 8;  // Altere para o pino que você está usando

// Configurações do apito
const int BEEP_FREQUENCY = 2000;  // Frequência do som em Hz (2kHz)
const int BEEP_DURATION = 200;     // Duração do apito em milissegundos
const unsigned long BEEP_INTERVAL = 7000;  // Intervalo entre apitos (7 segundos)

// Variável para controlar o timing
unsigned long previousMillis = 0;

void setup() {
  // Configura o pino do buzzer como saída
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Inicializa comunicação serial (opcional, para debug)
  Serial.begin(9600);
  Serial.println("Sistema de Buzzer iniciado!");
  Serial.println("Apito a cada 7 segundos...");
}

void loop() {
  // Obtém o tempo atual
  unsigned long currentMillis = millis();
  
  // Verifica se já passou o intervalo de 7 segundos
  if (currentMillis - previousMillis >= BEEP_INTERVAL) {
    // Salva o último momento que o apito tocou
    previousMillis = currentMillis;
    
    // Emite o apito
    playBeep();
    
    // Log no serial (opcional)
    Serial.print("Apito emitido em: ");
    Serial.print(currentMillis / 1000);
    Serial.println(" segundos");
  }
}

// Função para emitir o apito
void playBeep() {
  tone(BUZZER_PIN, BEEP_FREQUENCY, BEEP_DURATION);
  // A função tone() é não-bloqueante, então o código continua executando
  // O som irá parar automaticamente após BEEP_DURATION ms
}
