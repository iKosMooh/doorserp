# 🚀 Instalação Automática - Sistema de Portaria DoorsERP

## 📋 Descrição

Este script automatiza completamente a instalação e configuração do ambiente de desenvolvimento, incluindo:

- ✅ Instalação de todas as dependências Node.js (`npm install`)
- ✅ Download e instalação do Arduino CLI
- ✅ Configuração do Arduino CLI
- ✅ Instalação do core Arduino AVR (suporte para Uno, Mega, Nano)
- ✅ Criação de pastas necessárias (`temp_arduino`)
- ✅ Verificação completa do ambiente

## 🎯 Como Usar

### Opção 1: Execução Automática com Administrador (RECOMENDADO)

**Basta dar duplo clique no arquivo:**

```
INSTALL_AS_ADMIN.bat
```

Este arquivo irá:
1. Verificar se tem privilégios de administrador
2. Se não tiver, solicitar automaticamente (janela UAC do Windows)
3. Executar a instalação completa

### Opção 2: Execução Manual

1. **Clique com botão direito** em `install.bat`
2. Selecione **"Executar como administrador"**
3. Aguarde a instalação completar

## 📦 O que será instalado?

### Node.js Dependencies
```json
- next
- react
- prisma
- serialport
- avrgirl-arduino
- arduino-cli
- ... (todas do package.json)
```

### Arduino CLI
- **Versão:** Mais recente estável
- **Local:** `C:\Program Files\Arduino CLI\`
- **Executável:** `arduino-cli.exe`
- **Config:** `%LOCALAPPDATA%\Arduino15\arduino-cli.yaml`

### Arduino AVR Core
- **Core:** `arduino:avr` (última versão)
- **Suporte:** Arduino Uno, Mega, Nano, Leonardo, etc.

## ⚙️ Etapas da Instalação

O script executa 4 etapas principais:

```
┌─────────────────────────────────────────────┐
│ ETAPA 1: npm install                        │
│ Instala dependências do Node.js             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ ETAPA 2: Download Arduino CLI               │
│ Baixa e extrai arduino-cli.exe              │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ ETAPA 3: Configuração                       │
│ Inicializa config e atualiza índice         │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ ETAPA 4: Instalação do Core AVR             │
│ Instala suporte para placas Arduino         │
└─────────────────────────────────────────────┘
```

## 🔧 Requisitos

- ✅ Windows 7/8/10/11 (64-bit)
- ✅ Node.js 18+ instalado
- ✅ npm instalado
- ✅ Conexão com internet (para downloads)
- ✅ Privilégios de administrador

## 📝 Logs e Mensagens

Durante a instalação você verá mensagens coloridas:

- `[INFO]` - Informação sobre o processo
- `[OK]` - Etapa concluída com sucesso
- `[AVISO]` - Aviso (não crítico)
- `[ERRO]` - Erro crítico (instalação falhou)

## ✅ Verificação Pós-Instalação

Após a instalação, o script exibe:

```bash
# Versão do Arduino CLI
arduino-cli Version: 1.3.1

# Versão do Node.js
v20.x.x

# Versão do npm
10.x.x

# Cores instalados
arduino:avr@1.8.6
```

## 🚦 Próximos Passos

Após instalação bem-sucedida:

1. **Conecte seu Arduino Uno** na porta USB
2. **Inicie o servidor:**
   ```bash
   npm run dev
   ```
3. **Acesse:** http://localhost:3000
4. **Navegue para:** "Arduino Control"
5. **Faça upload** do código `arduino_gate_control.ino`

## 🔍 Comandos Úteis

### Arduino CLI

```bash
# Verificar versão
arduino-cli version

# Listar portas COM disponíveis
arduino-cli board list

# Compilar sketch
arduino-cli compile --fqbn arduino:avr:uno arquivo.ino

# Fazer upload
arduino-cli upload -p COM4 --fqbn arduino:avr:uno arquivo.ino

# Listar cores instalados
arduino-cli core list

# Instalar biblioteca
arduino-cli lib install "Nome da Biblioteca"
```

## ❓ Solução de Problemas

### Erro: "Este script precisa de privilégios de administrador"
**Solução:** Use `INSTALL_AS_ADMIN.bat` ou clique direito > "Executar como administrador"

### Erro: "package.json não encontrado"
**Solução:** Execute o script na pasta raiz do projeto (onde está o `package.json`)

### Erro: "Falha no download do Arduino CLI"
**Solução:** 
- Verifique sua conexão com internet
- Desabilite temporariamente firewall/antivírus
- Execute novamente

### Erro: "npm not found"
**Solução:** Instale Node.js primeiro: https://nodejs.org/

### Arduino CLI já instalado
**Comportamento:** Script detecta instalação existente e pula para configuração

## 📂 Estrutura Criada

Após instalação:

```
doorserp/
├── node_modules/           # Dependências Node.js
├── temp_arduino/           # Sketches temporários para upload
├── install.bat             # Script principal
├── INSTALL_AS_ADMIN.bat    # Launcher com auto-elevação
└── INSTALACAO.md           # Esta documentação
```

Fora do projeto:
```
C:\Program Files\Arduino CLI\
├── arduino-cli.exe         # Executável principal
└── LICENSE.txt

%LOCALAPPDATA%\Arduino15\
├── arduino-cli.yaml        # Configuração
└── packages/               # Cores e bibliotecas
    └── arduino/
        └── hardware/
            └── avr/
                └── 1.8.6/  # Core AVR
```

## 🔐 Segurança

O script solicita privilégios de administrador para:
- Criar pasta em `C:\Program Files\`
- Modificar PATH do sistema (opcional)
- Instalar componentes do Arduino CLI

**Todas as operações são seguras e reversíveis.**

## 🆘 Suporte

Em caso de problemas:
1. Verifique os requisitos acima
2. Execute como administrador
3. Verifique conexão com internet
4. Consulte os logs no console

## 📜 Licença

Este script faz parte do sistema DoorsERP e segue a mesma licença do projeto principal.

---

**Desenvolvido para:** Sistema de Portaria com Reconhecimento Facial  
**Compatibilidade:** Windows 64-bit  
**Última atualização:** Novembro 2025
