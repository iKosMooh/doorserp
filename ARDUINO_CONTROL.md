# Arduino Control - Integração Next.js

Este sistema permite controlar um Arduino diretamente através de uma aplicação Next.js, sem necessidade de servidor separado.

## 🔧 Como Funciona

### Versão Atual (Simulação)
- **Desenvolvimento**: Simulação completa dos comandos Arduino
- **Interface**: Página web responsiva para controle
- **API**: Rotas Next.js que simulam comunicação serial
- **Estados**: Gerenciamento local dos estados dos LEDs

### Implementação Real (Comunicação Serial)
Para implementar comunicação real com Arduino:

1. **Instalar dependências de comunicação serial**:
```bash
npm install serialport @serialport/parser-readline
```

2. **Atualizar a API `/api/arduino/route.ts`**:
```typescript
// Adicionar no topo do arquivo
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

// Substituir a simulação por comunicação real
let arduinoPort: SerialPort | null = null

async function conectarArduino(porta: string) {
  try {
    if (arduinoPort?.isOpen) {
      await arduinoPort.close()
    }
    
    arduinoPort = new SerialPort({
      path: porta,
      baudRate: 9600,
      autoOpen: false
    })
    
    const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }))
    
    arduinoPort.on('open', () => {
      console.log(`Conectado ao Arduino em ${porta}`)
    })
    
    parser.on('data', (data) => {
      console.log('Arduino resposta:', data)
    })
    
    await arduinoPort.open()
    return true
  } catch (error) {
    console.error('Erro:', error)
    return false
  }
}

async function enviarComando(comando: string) {
  if (!arduinoPort?.isOpen) {
    throw new Error('Arduino não conectado')
  }
  
  return new Promise((resolve, reject) => {
    arduinoPort!.write(`${comando}\n`, (err) => {
      if (err) reject(err)
      else resolve({ success: true, comando })
    })
  })
}
```

## 📁 Estrutura de Arquivos

```
src/
├── app/
│   ├── api/
│   │   └── arduino/
│   │       └── route.ts          # API para comunicação Arduino
│   └── arduino-control/
│       └── page.tsx              # Interface de controle
├── components/
│   └── ...
└── ...
arduino_control.ino               # Código para carregar no Arduino
```

## 🔌 Hardware - Arduino

### Código Arduino (`arduino_control.ino`)
O arquivo já está criado e contém:
- Controle de 4 LEDs (pinos 10, 11, 12, 13)
- Comunicação serial a 9600 baud
- Comandos: L1_ON, L1_OFF, L2_ON, L2_OFF, etc.
- Resposta em JSON para status

### Conexões Físicas
```
Arduino Uno:
├── Pino 13: LED interno (sempre presente)
├── Pino 12: LED externo + resistor 220Ω
├── Pino 11: LED externo + resistor 220Ω
└── Pino 10: LED externo + resistor 220Ω

Esquema de Conexão:
Arduino Pino → Resistor 220Ω → LED Ânodo
LED Cátodo → GND
```

## 🖥️ Interface Web

### Funcionalidades
- ✅ Status de conexão em tempo real
- ✅ Seleção de porta serial
- ✅ Controle individual de LEDs
- ✅ Controle geral (todos os LEDs)
- ✅ Comandos especiais (STATUS, PING)
- ✅ Indicadores visuais dos estados
- ✅ Mensagens de feedback

### Comandos Disponíveis
| Comando | Descrição |
|---------|-----------|
| `L1_ON` | Liga LED do pino 13 |
| `L1_OFF` | Desliga LED do pino 13 |
| `L2_ON` | Liga LED do pino 12 |
| `L2_OFF` | Desliga LED do pino 12 |
| `L3_ON` | Liga LED do pino 11 |
| `L3_OFF` | Desliga LED do pino 11 |
| `L4_ON` | Liga LED do pino 10 |
| `L4_OFF` | Desliga LED do pino 10 |
| `ALL_ON` | Liga todos os LEDs |
| `ALL_OFF` | Desliga todos os LEDs |
| `STATUS` | Retorna estado atual |
| `PING` | Teste de comunicação |

## 🚀 Como Usar

### 1. Desenvolvimento (Simulação)
```bash
npm run dev
```
- Acesse: http://localhost:3000/arduino-control
- Teste todos os comandos sem Arduino físico

### 2. Produção (Arduino Real)
1. Carregue `arduino_control.ino` no Arduino
2. Conecte Arduino via USB
3. Identifique a porta (COM3, COM4, etc.)
4. Implemente comunicação serial na API
5. Execute o projeto Next.js

### 3. Testando Comandos
- Via Interface: Use os botões na página web
- Via API direta: 
```bash
# Status
curl http://localhost:3000/api/arduino

# Ligar LED 1
curl -X POST http://localhost:3000/api/arduino \
  -H "Content-Type: application/json" \
  -d '{"numero": 1, "acao": "on"}'

# Comando genérico
curl -X POST http://localhost:3000/api/arduino \
  -H "Content-Type: application/json" \
  -d '{"comando": "ALL_ON"}'
```

## 🔧 Configuração Avançada

### Portas Seriais Comuns
- **Windows**: COM3, COM4, COM5, COM6
- **Mac**: /dev/tty.usbmodem*, /dev/tty.usbserial*
- **Linux**: /dev/ttyUSB0, /dev/ttyACM0

### Solução de Problemas
1. **Arduino não detectado**:
   - Verifique drivers USB
   - Teste com Arduino IDE
   - Confirme porta correta

2. **Comunicação falha**:
   - Baud rate deve ser 9600
   - Verificar cabos USB
   - Reiniciar Arduino

3. **Permissões (Linux/Mac)**:
```bash
sudo chmod 666 /dev/ttyUSB0
# ou adicionar usuário ao grupo dialout
sudo usermod -a -G dialout $USER
```

## 📈 Expansões Possíveis

### Hardware
- Controle de relés para cargas maiores
- Sensores (temperatura, umidade, movimento)
- Servomotores e motores de passo
- Display LCD para feedback local
- Buzzer para alertas sonoros

### Software
- WebSocket para atualizações em tempo real
- Histórico de comandos e estados
- Agendamento de tarefas
- Interface mobile responsiva
- Integração com banco de dados

### Segurança
- Autenticação de usuários
- Log de ações
- Controle de acesso por perfil
- Criptografia de comandos

## 📝 Notas de Desenvolvimento

- A versão atual é uma simulação para demonstração
- Para produção, substitua por comunicação serial real
- O código Arduino é compatível com Uno, Nano, ESP32
- Interface responsiva funciona em desktop e mobile
- API RESTful facilita integração com outros sistemas

## 🤝 Contribuição

Para contribuir:
1. Fork o projeto
2. Crie branch para feature
3. Implemente melhorias
4. Teste com Arduino real
5. Envie pull request

---

**Desenvolvido com ❤️ usando Next.js + Arduino**
