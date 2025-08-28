/*
 * Controle de Portas Arduino via Comunicação Serial
 * Este código permite controlar as portas digitais do Arduino
 * através de comandos recebidos via porta serial
 * 
 * Comandos suportados:
 * L1_ON  - Liga LED no pino 13
 * L1_OFF - Desliga LED no pino 13
 * L2_ON  - Liga LED no pino 12
 * L2_OFF - Desliga LED no pino 12
 * L3_ON  - Liga LED no pino 11
 * L3_OFF - Desliga LED no pino 11
 * L4_ON  - Liga LED no pino 10
 * L4_OFF - Desliga LED no pino 10
 * ALL_ON - Liga todos os LEDs
 * ALL_OFF - Desliga todos os LEDs
 * STATUS - Retorna estado atual
 * PING   - Teste de conexão
 */

// Definição dos pinos que serão controlados
const int LED_PIN_1 = 2;  // LED interno do Arduino (pino 2)
const int LED_PIN_2 = 3;  // Pino digital 3
const int LED_PIN_3 = 4;  // Pino digital 4
const int LED_PIN_4 = 5;  // Pino digital 5

// Variáveis para armazenar o estado atual de cada pino
bool estadoPino1 = false;
bool estadoPino2 = false;
bool estadoPino3 = false;
bool estadoPino4 = false;

// Buffer para armazenar os dados recebidos
String comandoRecebido = "";

void setup() {
  // Inicializa a comunicação serial com velocidade de 9600 baud
  Serial.begin(9600);
  
  // Configura os pinos como saída
  pinMode(LED_PIN_1, OUTPUT);
  pinMode(LED_PIN_2, OUTPUT);
  pinMode(LED_PIN_3, OUTPUT);
  pinMode(LED_PIN_4, OUTPUT);
  
  // Garante que todos os pinos iniciem desligados
  digitalWrite(LED_PIN_1, LOW);
  digitalWrite(LED_PIN_2, LOW);
  digitalWrite(LED_PIN_3, LOW);
  digitalWrite(LED_PIN_4, LOW);
  
  // Aguarda um momento para estabilizar
  delay(1000);
  
  // Envia mensagem de inicialização
  Serial.println("Arduino pronto para receber comandos!");
  Serial.println("Comandos disponíveis:");
  Serial.println("- L1_ON/L1_OFF: Controla pino 13");
  Serial.println("- L2_ON/L2_OFF: Controla pino 12");
  Serial.println("- L3_ON/L3_OFF: Controla pino 11");
  Serial.println("- L4_ON/L4_OFF: Controla pino 10");
  Serial.println("- STATUS: Retorna estado de todos os pinos");
  Serial.println("- ALL_ON/ALL_OFF: Liga/desliga todos os pinos");
  Serial.println("- PING: Teste de conexão");
  
  // Envia status inicial
  enviarStatus();
}

void loop() {
  // Verifica se há dados disponíveis na porta serial
  if (Serial.available() > 0) {
    // Lê o caractere recebido
    char caractere = Serial.read();
    
    // Se receber nova linha ou retorno de carro, processa o comando
    if (caractere == '\n' || caractere == '\r') {
      if (comandoRecebido.length() > 0) {
        // Remove espaços em branco do início e fim
        comandoRecebido.trim();
        
        // Processa o comando recebido
        processarComando(comandoRecebido);
        
        // Limpa o buffer para o próximo comando
        comandoRecebido = "";
      }
    } else {
      // Adiciona o caractere ao buffer
      comandoRecebido += caractere;
    }
  }
  
  // Pequeno delay para estabilidade
  delay(10);
}

void processarComando(String comando) {
  // Converte o comando para maiúsculas para facilitar comparação
  comando.toUpperCase();
  
  // Processa comandos para o Pino 1 (LED interno - pino 13)
  if (comando == "L1_ON") {
    digitalWrite(LED_PIN_1, HIGH);
    estadoPino1 = true;
    Serial.println("OK: Pino 13 ligado");
    enviarStatus();
  }
  else if (comando == "L1_OFF") {
    digitalWrite(LED_PIN_1, LOW);
    estadoPino1 = false;
    Serial.println("OK: Pino 13 desligado");
    enviarStatus();
  }
  
  // Processa comandos para o Pino 2
  else if (comando == "L2_ON") {
    digitalWrite(LED_PIN_2, HIGH);
    estadoPino2 = true;
    Serial.println("OK: Pino 12 ligado");
    enviarStatus();
  }
  else if (comando == "L2_OFF") {
    digitalWrite(LED_PIN_2, LOW);
    estadoPino2 = false;
    Serial.println("OK: Pino 12 desligado");
    enviarStatus();
  }
  
  // Processa comandos para o Pino 3
  else if (comando == "L3_ON") {
    digitalWrite(LED_PIN_3, HIGH);
    estadoPino3 = true;
    Serial.println("OK: Pino 11 ligado");
    enviarStatus();
  }
  else if (comando == "L3_OFF") {
    digitalWrite(LED_PIN_3, LOW);
    estadoPino3 = false;
    Serial.println("OK: Pino 11 desligado");
    enviarStatus();
  }
  
  // Processa comandos para o Pino 4
  else if (comando == "L4_ON") {
    digitalWrite(LED_PIN_4, HIGH);
    estadoPino4 = true;
    Serial.println("OK: Pino 10 ligado");
    enviarStatus();
  }
  else if (comando == "L4_OFF") {
    digitalWrite(LED_PIN_4, LOW);
    estadoPino4 = false;
    Serial.println("OK: Pino 10 desligado");
    enviarStatus();
  }
  
  // Comando para ligar todos os pinos
  else if (comando == "ALL_ON") {
    digitalWrite(LED_PIN_1, HIGH);
    digitalWrite(LED_PIN_2, HIGH);
    digitalWrite(LED_PIN_3, HIGH);
    digitalWrite(LED_PIN_4, HIGH);
    estadoPino1 = true;
    estadoPino2 = true;
    estadoPino3 = true;
    estadoPino4 = true;
    Serial.println("OK: Todos os pinos ligados");
    enviarStatus();
  }
  
  // Comando para desligar todos os pinos
  else if (comando == "ALL_OFF") {
    digitalWrite(LED_PIN_1, LOW);
    digitalWrite(LED_PIN_2, LOW);
    digitalWrite(LED_PIN_3, LOW);
    digitalWrite(LED_PIN_4, LOW);
    estadoPino1 = false;
    estadoPino2 = false;
    estadoPino3 = false;
    estadoPino4 = false;
    Serial.println("OK: Todos os pinos desligados");
    enviarStatus();
  }
  
  // Comando para obter status
  else if (comando == "STATUS") {
    enviarStatus();
  }
  
  // Comando de teste/ping
  else if (comando == "PING") {
    Serial.println("PONG");
  }
  
  // Comando não reconhecido
  else {
    Serial.print("ERRO: Comando desconhecido: ");
    Serial.println(comando);
  }
}

// Função para enviar o status atual de todos os pinos
void enviarStatus() {
  // Envia o status em formato JSON para facilitar parsing
  Serial.print("{\"status\":{");
  Serial.print("\"pino13\":");
  Serial.print(estadoPino1 ? "true" : "false");
  Serial.print(",\"pino12\":");
  Serial.print(estadoPino2 ? "true" : "false");
  Serial.print(",\"pino11\":");
  Serial.print(estadoPino3 ? "true" : "false");
  Serial.print(",\"pino10\":");
  Serial.print(estadoPino4 ? "true" : "false");
  Serial.println("}}");
}

/*
 * INSTRUÇÕES DE USO:
 * 
 * 1. Carregue este código no seu Arduino
 * 2. Conecte LEDs nos pinos 10, 11, 12 e 13 (opcional, pino 13 já tem LED interno)
 * 3. Execute o servidor Node.js (server.js)
 * 4. Use a interface web Next.js para controlar os LEDs
 * 
 * EXPANSÕES POSSÍVEIS:
 * 
 * 1. Controle PWM para LEDs com intensidade variável
 * 2. Leitura de sensores e envio de dados
 * 3. Controle de servomotores
 * 4. Implementação de temporizadores
 * 5. Modo de sequência programável
 * 6. Controle de relés para cargas maiores
 */
