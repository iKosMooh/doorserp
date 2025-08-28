// server.js - Servidor Node.js para comunicação com Arduino via Serial
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // URL do seu Next.js
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Configuração da porta serial
let arduinoPort = null;
let isConnected = false;

// Lista portas seriais disponíveis
async function listarPortas() {
  try {
    const ports = await SerialPort.list();
    console.log('Portas disponíveis:');
    ports.forEach(port => {
      console.log(`- ${port.path} (${port.manufacturer || 'Desconhecido'})`);
    });
    return ports;
  } catch (error) {
    console.error('Erro ao listar portas:', error);
    return [];
  }
}

// Conecta ao Arduino
async function conectarArduino(portaPath) {
  try {
    // Se já estiver conectado, desconecta primeiro
    if (arduinoPort && arduinoPort.isOpen) {
      await arduinoPort.close();
    }

    // Cria nova conexão
    arduinoPort = new SerialPort({
      path: portaPath || 'COM3', // Ajuste conforme seu sistema (Windows: 'COM3', Mac: '/dev/tty.usbmodem*')
      baudRate: 9600,
      autoOpen: false
    });

    // Parser para ler linha por linha
    const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Eventos da porta serial
    arduinoPort.on('open', () => {
      console.log(`✅ Conectado ao Arduino na porta ${portaPath}`);
      isConnected = true;
      io.emit('arduino-status', { connected: true, port: portaPath });
    });

    arduinoPort.on('error', (err) => {
      console.error('❌ Erro na porta serial:', err);
      isConnected = false;
      io.emit('arduino-status', { connected: false, error: err.message });
    });

    arduinoPort.on('close', () => {
      console.log('🔌 Conexão com Arduino fechada');
      isConnected = false;
      io.emit('arduino-status', { connected: false });
    });

    // Recebe dados do Arduino
    parser.on('data', (data) => {
      console.log('📥 Arduino:', data);
      
      // Tenta fazer parse se for JSON
      try {
        const jsonData = JSON.parse(data);
        io.emit('arduino-data', jsonData);
      } catch {
        // Se não for JSON, envia como string
        io.emit('arduino-message', data);
      }
    });

    // Abre a conexão
    await arduinoPort.open();
    
    // Aguarda um momento para estabilizar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    console.error('Erro ao conectar:', error);
    isConnected = false;
    return false;
  }
}

// Envia comando para o Arduino
function enviarComando(comando) {
  return new Promise((resolve, reject) => {
    if (!arduinoPort || !isConnected) {
      reject(new Error('Arduino não conectado'));
      return;
    }

    console.log(`📤 Enviando comando: ${comando}`);
    
    arduinoPort.write(`${comando}\n`, (err) => {
      if (err) {
        console.error('Erro ao enviar comando:', err);
        reject(err);
      } else {
        resolve({ success: true, comando });
      }
    });
  });
}

// Rotas da API REST

// Listar portas disponíveis
app.get('/api/portas', async (req, res) => {
  const portas = await listarPortas();
  res.json(portas);
});

// Conectar a uma porta específica
app.post('/api/conectar', async (req, res) => {
  const { porta } = req.body;
  const sucesso = await conectarArduino(porta);
  
  if (sucesso) {
    res.json({ success: true, message: 'Conectado com sucesso' });
  } else {
    res.status(500).json({ success: false, message: 'Erro ao conectar' });
  }
});

// Status da conexão
app.get('/api/status', (req, res) => {
  res.json({ 
    connected: isConnected,
    port: arduinoPort ? arduinoPort.path : null
  });
});

// Enviar comando
app.post('/api/comando', async (req, res) => {
  const { comando } = req.body;
  
  try {
    const resultado = await enviarComando(comando);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Controle de LEDs específicos
app.post('/api/led/:numero/:acao', async (req, res) => {
  const { numero, acao } = req.params;
  const comando = `L${numero}_${acao.toUpperCase()}`;
  
  try {
    const resultado = await enviarComando(comando);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// WebSocket para comunicação em tempo real
io.on('connection', (socket) => {
  console.log('👤 Cliente conectado via WebSocket');
  
  // Envia status atual
  socket.emit('arduino-status', { 
    connected: isConnected,
    port: arduinoPort ? arduinoPort.path : null
  });
  
  // Recebe comandos via WebSocket
  socket.on('comando', async (data) => {
    try {
      await enviarComando(data.comando);
    } catch (error) {
      socket.emit('erro', { message: error.message });
    }
  });
  
  // Lista portas
  socket.on('listar-portas', async () => {
    const portas = await listarPortas();
    socket.emit('portas-lista', portas);
  });
  
  // Conectar
  socket.on('conectar', async (porta) => {
    const sucesso = await conectarArduino(porta);
    socket.emit('conectar-resultado', { success: sucesso });
  });
  
  socket.on('disconnect', () => {
    console.log('👤 Cliente desconectado');
  });
});

// Tenta conectar automaticamente ao iniciar
async function inicializar() {
  const portas = await listarPortas();
  
  // Tenta encontrar porta do Arduino automaticamente
  const portaArduino = portas.find(p => 
    p.manufacturer && (p.manufacturer.includes('Arduino') || p.manufacturer.includes('CH340'))
  );
  
  if (portaArduino) {
    console.log(`🔍 Arduino encontrado em ${portaArduino.path}`);
    await conectarArduino(portaArduino.path);
  } else if (portas.length > 0) {
    console.log('⚠️  Arduino não detectado automaticamente.');
    console.log('Use a interface web para selecionar a porta correta.');
    console.log('Portas disponíveis:', portas.map(p => p.path).join(', '));
  }
}

// Inicia o servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 WebSocket disponível`);
  console.log(`🌐 API REST disponível em http://localhost:${PORT}`);
  inicializar();
});

// Tratamento de encerramento gracioso
process.on('SIGINT', async () => {
  console.log('\n⏹️  Encerrando servidor...');
  
  if (arduinoPort && arduinoPort.isOpen) {
    await arduinoPort.close();
  }
  
  server.close();
  process.exit();
});

// Log de inicialização
console.log('🔌 Servidor Arduino Serial iniciando...');
console.log('📋 APIs disponíveis:');
console.log('   GET  /api/status    - Status da conexão');
console.log('   GET  /api/portas    - Lista portas disponíveis');
console.log('   POST /api/conectar  - Conecta a uma porta');
console.log('   POST /api/comando   - Envia comando');
console.log('   POST /api/led/1/on  - Liga LED 1 (pino 13)');
console.log('   POST /api/led/1/off - Desliga LED 1 (pino 13)');
