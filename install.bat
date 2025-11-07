@echo off
REM ============================================================================
REM Script de Instalacao Automatica - Sistema de Portaria DoorsERP
REM ============================================================================
REM Este script instala e configura automaticamente:
REM - Dependencias do Node.js (npm install)
REM - Arduino CLI
REM - Core Arduino AVR (suporte para Uno, Mega, Nano)
REM - Configuracao completa do ambiente
REM ============================================================================

REM Verifica se esta rodando como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ========================================
    echo ERRO: Este script precisa de privilegios de administrador!
    echo ========================================
    echo.
    echo Clique com botao direito no arquivo e selecione "Executar como administrador"
    echo.
    pause
    exit /b 1
)

REM Define cores no console
color 0A

echo.
echo ============================================================================
echo        SISTEMA DE PORTARIA - INSTALACAO AUTOMATICA
echo ============================================================================
echo.
echo [INFO] Iniciando instalacao e configuracao do ambiente...
echo.

REM ============================================================================
REM ETAPA 1: Instalacao de dependencias Node.js
REM ============================================================================
echo ============================================================================
echo ETAPA 1/5: Instalando dependencias do Node.js
echo ============================================================================
echo.

if not exist "package.json" (
    echo [ERRO] Arquivo package.json nao encontrado!
    echo [ERRO] Execute este script na pasta raiz do projeto.
    pause
    exit /b 1
)

echo [INFO] Executando: npm install
echo.
call npm install
if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Falha na instalacao das dependencias do Node.js
    pause
    exit /b 1
)

echo.
echo [OK] Dependencias do Node.js instaladas com sucesso!
echo.

REM ============================================================================
REM ETAPA 2: Download e instalacao do Arduino CLI
REM ============================================================================
echo ============================================================================
echo ETAPA 2/5: Instalando Arduino CLI
echo ============================================================================
echo.

set "ARDUINO_CLI_PATH=C:\Program Files\Arduino CLI"
set "ARDUINO_CLI_EXE=%ARDUINO_CLI_PATH%\arduino-cli.exe"

REM Verifica se ja esta instalado
if exist "%ARDUINO_CLI_EXE%" (
    echo [INFO] Arduino CLI ja esta instalado em: %ARDUINO_CLI_PATH%
    echo [INFO] Versao atual:
    "%ARDUINO_CLI_EXE%" version
    echo.
    goto :skip_arduino_install
)

echo [INFO] Arduino CLI nao encontrado. Instalando...
echo.

REM Cria diretorio de instalacao
if not exist "%ARDUINO_CLI_PATH%" (
    echo [INFO] Criando diretorio: %ARDUINO_CLI_PATH%
    mkdir "%ARDUINO_CLI_PATH%"
)

REM Define URL de download (versao mais recente estavel)
set "ARDUINO_CLI_URL=https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip"
set "TEMP_ZIP=%TEMP%\arduino-cli.zip"

echo [INFO] Baixando Arduino CLI...
echo [INFO] URL: %ARDUINO_CLI_URL%
echo.

REM Download usando PowerShell
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%ARDUINO_CLI_URL%' -OutFile '%TEMP_ZIP%' -UseBasicParsing}"

if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Falha no download do Arduino CLI
    pause
    exit /b 1
)

echo [INFO] Download concluido!
echo [INFO] Extraindo arquivos...
echo.

REM Extrai o arquivo ZIP
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%ARDUINO_CLI_PATH%' -Force"

if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Falha na extracao do Arduino CLI
    pause
    exit /b 1
)

REM Remove arquivo temporario
del "%TEMP_ZIP%"

echo [OK] Arduino CLI instalado com sucesso!
echo.

:skip_arduino_install

REM ============================================================================
REM ETAPA 3: Configuracao do Arduino CLI
REM ============================================================================
echo ============================================================================
echo ETAPA 3/5: Configurando Arduino CLI
echo ============================================================================
echo.

echo [INFO] Inicializando configuracao do Arduino CLI...
echo.
"%ARDUINO_CLI_EXE%" config init

if %errorLevel% neq 0 (
    echo.
    echo [AVISO] Config ja existe ou erro na inicializacao (normal se ja configurado)
    echo.
)

echo [INFO] Atualizando indice de pacotes...
echo.
"%ARDUINO_CLI_EXE%" core update-index

if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Falha ao atualizar indice de pacotes
    pause
    exit /b 1
)

echo.
echo [OK] Indice de pacotes atualizado!
echo.

REM ============================================================================
REM ETAPA 4: Instalacao do core Arduino AVR
REM ============================================================================
echo ============================================================================
echo ETAPA 4/5: Instalando suporte para Arduino Uno/Mega/Nano
echo ============================================================================
echo.

echo [INFO] Verificando cores instalados...
echo.
"%ARDUINO_CLI_EXE%" core list

echo.
echo [INFO] Instalando arduino:avr (suporte para Uno, Mega, Nano)...
echo [INFO] Isso pode levar alguns minutos...
echo.

"%ARDUINO_CLI_EXE%" core install arduino:avr

if %errorLevel% neq 0 (
    echo.
    echo [AVISO] Core ja pode estar instalado (normal)
    echo.
)

echo.
echo [INFO] Cores instalados:
echo.
"%ARDUINO_CLI_EXE%" core list

echo.
echo [OK] Core Arduino AVR instalado com sucesso!
echo.

REM ============================================================================
REM ETAPA 5: Instalacao de bibliotecas Arduino necessarias
REM ============================================================================
echo ============================================================================
echo ETAPA 5/5: Instalando bibliotecas Arduino
echo ============================================================================
echo.

echo [INFO] Instalando biblioteca Servo...
echo.
"%ARDUINO_CLI_EXE%" lib install Servo

if %errorLevel% neq 0 (
    echo.
    echo [AVISO] Biblioteca Servo ja pode estar instalada (normal)
    echo.
)

echo.
echo [INFO] Bibliotecas instaladas:
echo.
"%ARDUINO_CLI_EXE%" lib list

echo.
echo [OK] Bibliotecas instaladas com sucesso!
echo.

REM ============================================================================
REM VERIFICACAO FINAL
REM ============================================================================
echo ============================================================================
echo VERIFICACAO FINAL
echo ============================================================================
echo.

echo [INFO] Testando Arduino CLI...
echo.
"%ARDUINO_CLI_EXE%" version
echo.

echo [INFO] Verificando instalacao do Node.js...
echo.
call node --version
call npm --version
echo.

REM ============================================================================
REM CRIACAO DA PASTA TEMP_ARDUINO
REM ============================================================================
echo [INFO] Criando pasta temp_arduino para uploads...
echo.

if not exist "temp_arduino" (
    mkdir temp_arduino
    echo [OK] Pasta temp_arduino criada!
) else (
    echo [INFO] Pasta temp_arduino ja existe
)
echo.

REM ============================================================================
REM ADICIONAR ARDUINO CLI AO PATH (opcional)
REM ============================================================================
echo ============================================================================
echo CONFIGURACAO DO PATH (Opcional)
echo ============================================================================
echo.
echo Deseja adicionar o Arduino CLI ao PATH do sistema?
echo Isso permite executar "arduino-cli" de qualquer lugar no terminal.
echo.
set /p ADD_PATH="Adicionar ao PATH? (S/N): "

if /i "%ADD_PATH%"=="S" (
    echo.
    echo [INFO] Adicionando ao PATH do sistema...
    setx PATH "%PATH%;%ARDUINO_CLI_PATH%" /M
    echo [OK] Arduino CLI adicionado ao PATH!
    echo [INFO] Reinicie o terminal para aplicar as mudancas
    echo.
) else (
    echo.
    echo [INFO] PATH nao modificado
    echo.
)

REM ============================================================================
REM CONCLUSAO
REM ============================================================================
echo ============================================================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo ============================================================================
echo.
echo Proximos passos:
echo.
echo 1. Conecte seu Arduino Uno na porta USB
echo 2. Execute: npm run dev
echo 3. Acesse: http://localhost:3000
echo 4. Va em "Arduino Control" para gerenciar o dispositivo
echo.
echo Arquivos de configuracao:
echo - Arduino CLI: %ARDUINO_CLI_EXE%
echo - Config: %LOCALAPPDATA%\Arduino15\arduino-cli.yaml
echo - Temp uploads: .\temp_arduino\
echo.
echo Comandos uteis:
echo - Compilar: arduino-cli compile --fqbn arduino:avr:uno arquivo.ino
echo - Upload: arduino-cli upload -p COM4 --fqbn arduino:avr:uno arquivo.ino
echo - Listar portas: arduino-cli board list
echo.
echo ============================================================================
echo.

pause
