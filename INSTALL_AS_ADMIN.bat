@echo off
REM ============================================================================
REM Launcher com Auto-Elevacao de Privilegios
REM ============================================================================
REM Este script verifica se esta rodando como administrador
REM Se nao estiver, reinicia automaticamente com privilegios elevados
REM ============================================================================

REM Verifica se esta rodando como administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    REM Ja esta como admin, executa o instalador
    call "%~dp0install.bat"
) else (
    REM Nao esta como admin, solicita elevacao
    echo Solicitando privilegios de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d %~dp0 && install.bat' -Verb RunAs"
)
